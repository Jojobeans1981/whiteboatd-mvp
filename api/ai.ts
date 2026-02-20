import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// --- ID generation (matches client-side pattern) ---
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- Operation types returned to client for execution ---
interface CreateOperation {
  action: 'create';
  id: string;
  data: Record<string, any>;
}

interface UpdateOperation {
  action: 'update';
  objectId: string;
  data: Record<string, any>;
}

type Operation = CreateOperation | UpdateOperation;

// --- Gemini tool (function) declarations ---
const TOOL_DECLARATIONS = [
  {
    name: 'createStickyNote',
    description: 'Create a sticky note on the whiteboard with text content.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        x: { type: SchemaType.NUMBER, description: 'X coordinate on the board' },
        y: { type: SchemaType.NUMBER, description: 'Y coordinate on the board' },
        text: { type: SchemaType.STRING, description: 'Text content for the sticky note' },
        color: {
          type: SchemaType.STRING,
          description: 'Background color hex. Must be one of: #FFE066, #FF6B6B, #4ECDC4, #45B7D1, #95E1D3, #F38181, #AA96DA, #FCBAD3',
        },
        width: { type: SchemaType.NUMBER, description: 'Width in pixels, default 200' },
        height: { type: SchemaType.NUMBER, description: 'Height in pixels, default 200' },
      },
      required: ['x', 'y', 'text', 'color'],
    },
  },
  {
    name: 'createShape',
    description: 'Create a geometric shape (rectangle or circle) on the whiteboard.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        x: { type: SchemaType.NUMBER, description: 'X coordinate' },
        y: { type: SchemaType.NUMBER, description: 'Y coordinate' },
        shapeType: { type: SchemaType.STRING, description: 'Type of shape: "rectangle" or "circle"' },
        color: { type: SchemaType.STRING, description: 'Fill color hex' },
        width: { type: SchemaType.NUMBER, description: 'Width for rectangle, default 150' },
        height: { type: SchemaType.NUMBER, description: 'Height for rectangle, default 100' },
        radius: { type: SchemaType.NUMBER, description: 'Radius for circle, default 60' },
      },
      required: ['x', 'y', 'shapeType', 'color'],
    },
  },
  {
    name: 'createFrame',
    description: 'Create a frame (labeled container/section) on the whiteboard. Use frames to group related items, like quadrants in a SWOT analysis or columns in a retro board.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        x: { type: SchemaType.NUMBER, description: 'X coordinate of top-left corner' },
        y: { type: SchemaType.NUMBER, description: 'Y coordinate of top-left corner' },
        width: { type: SchemaType.NUMBER, description: 'Width in pixels' },
        height: { type: SchemaType.NUMBER, description: 'Height in pixels' },
        label: { type: SchemaType.STRING, description: 'Label text displayed above the frame' },
        color: { type: SchemaType.STRING, description: 'Border/label color hex' },
      },
      required: ['x', 'y', 'width', 'height', 'label', 'color'],
    },
  },
  {
    name: 'createConnector',
    description: 'Create a line/arrow connecting two objects on the whiteboard.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        fromId: { type: SchemaType.STRING, description: 'ID of the source object' },
        toId: { type: SchemaType.STRING, description: 'ID of the target object' },
        color: { type: SchemaType.STRING, description: 'Line color hex, default #333333' },
      },
      required: ['fromId', 'toId'],
    },
  },
  {
    name: 'moveObject',
    description: 'Move an existing object to a new position.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        objectId: { type: SchemaType.STRING, description: 'ID of the object to move' },
        x: { type: SchemaType.NUMBER, description: 'New X coordinate' },
        y: { type: SchemaType.NUMBER, description: 'New Y coordinate' },
      },
      required: ['objectId', 'x', 'y'],
    },
  },
  {
    name: 'resizeObject',
    description: 'Resize an existing object.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        objectId: { type: SchemaType.STRING, description: 'ID of the object to resize' },
        width: { type: SchemaType.NUMBER, description: 'New width' },
        height: { type: SchemaType.NUMBER, description: 'New height' },
        radius: { type: SchemaType.NUMBER, description: 'New radius (circles only)' },
      },
      required: ['objectId'],
    },
  },
  {
    name: 'updateText',
    description: 'Update the text content of a sticky note or the label of a frame.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        objectId: { type: SchemaType.STRING, description: 'ID of the sticky note or frame' },
        text: { type: SchemaType.STRING, description: 'New text content or label' },
      },
      required: ['objectId', 'text'],
    },
  },
  {
    name: 'changeColor',
    description: 'Change the color of an existing object.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        objectId: { type: SchemaType.STRING, description: 'ID of the object' },
        color: { type: SchemaType.STRING, description: 'New color hex' },
      },
      required: ['objectId', 'color'],
    },
  },
  {
    name: 'createText',
    description: 'Create a standalone text label on the whiteboard (no background, just text).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        x: { type: SchemaType.NUMBER, description: 'X coordinate' },
        y: { type: SchemaType.NUMBER, description: 'Y coordinate' },
        text: { type: SchemaType.STRING, description: 'Text content' },
        color: { type: SchemaType.STRING, description: 'Text color hex' },
        fontSize: { type: SchemaType.NUMBER, description: 'Font size in pixels, default 24' },
      },
      required: ['x', 'y', 'text', 'color'],
    },
  },
  {
    name: 'getBoardState',
    description: 'Get the current state of all objects on the board. Use this to understand what exists before making changes.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

// --- System prompt ---
const SYSTEM_PROMPT = `You are an AI assistant for a collaborative whiteboard application. Users give you natural language commands and you execute them by calling the provided tools.

Rules:
- Use the provided tools to create and manipulate board objects.
- Place objects in visible areas (x: 100-1500, y: 100-1000).
- When creating multiple objects, space them so they don't overlap.
- Sticky notes default to 200x200. Rectangles default to 150x100. Circles default to radius 60.
- Available colors: #FFE066 (yellow), #FF6B6B (red), #4ECDC4 (teal), #45B7D1 (blue), #95E1D3 (mint), #F38181 (coral), #AA96DA (purple), #FCBAD3 (pink).
- For frames, use large dimensions like 400x350 or bigger.
- For SWOT analysis: create 4 frames in a 2x2 grid labeled Strengths, Weaknesses, Opportunities, Threats with matching colors, then place a starter sticky in each.
- For retrospective boards: create 3 columns (What Went Well, What To Improve, Action Items).
- For user journey maps: create horizontal frames for each stage (Awareness, Consideration, Decision, Onboarding, Retention).
- When arranging in a grid, use consistent spacing (e.g., 220px between sticky notes).
- The board state is provided so you can reference existing object IDs for move/resize/update operations.
- After completing all tool calls, respond with a brief summary of what you did.`;

// --- Board object interface (for board state context) ---
interface BoardObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  label?: string;
  fromId?: string;
  toId?: string;
  color: string;
}

// --- Process a tool call into an operation (no Firestore writes) ---
function processToolCall(
  toolName: string,
  input: any,
  userId: string,
  boardState: BoardObject[]
): { message: string; operations: Operation[] } {
  const now = Date.now();

  switch (toolName) {
    case 'createStickyNote': {
      const id = generateId();
      return {
        message: `Created sticky note "${input.text}" (id: ${id})`,
        operations: [{
          action: 'create',
          id,
          data: {
            type: 'sticky',
            x: input.x,
            y: input.y,
            text: input.text,
            color: input.color,
            width: input.width || 200,
            height: input.height || 200,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          },
        }],
      };
    }

    case 'createShape': {
      const id = generateId();
      const data: Record<string, any> = {
        type: input.shapeType,
        x: input.x,
        y: input.y,
        color: input.color,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };
      if (input.shapeType === 'rectangle') {
        data.width = input.width || 150;
        data.height = input.height || 100;
      } else {
        data.radius = input.radius || 60;
      }
      return {
        message: `Created ${input.shapeType} (id: ${id})`,
        operations: [{ action: 'create', id, data }],
      };
    }

    case 'createFrame': {
      const id = generateId();
      return {
        message: `Created frame "${input.label}" (id: ${id})`,
        operations: [{
          action: 'create',
          id,
          data: {
            type: 'frame',
            x: input.x,
            y: input.y,
            width: input.width,
            height: input.height,
            label: input.label,
            color: input.color,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          },
        }],
      };
    }

    case 'createText': {
      const id = generateId();
      return {
        message: `Created text "${input.text}" (id: ${id})`,
        operations: [{
          action: 'create',
          id,
          data: {
            type: 'text',
            x: input.x,
            y: input.y,
            text: input.text,
            color: input.color,
            fontSize: input.fontSize || 24,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          },
        }],
      };
    }

    case 'createConnector': {
      const id = generateId();
      return {
        message: `Created connector from ${input.fromId} to ${input.toId} (id: ${id})`,
        operations: [{
          action: 'create',
          id,
          data: {
            type: 'connector',
            x: 0,
            y: 0,
            fromId: input.fromId,
            toId: input.toId,
            color: input.color || '#333333',
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          },
        }],
      };
    }

    case 'moveObject': {
      return {
        message: `Moved object ${input.objectId} to (${input.x}, ${input.y})`,
        operations: [{
          action: 'update',
          objectId: input.objectId,
          data: { x: input.x, y: input.y, updatedAt: now },
        }],
      };
    }

    case 'resizeObject': {
      const data: Record<string, any> = { updatedAt: now };
      if (input.width !== undefined) data.width = input.width;
      if (input.height !== undefined) data.height = input.height;
      if (input.radius !== undefined) data.radius = input.radius;
      return {
        message: `Resized object ${input.objectId}`,
        operations: [{ action: 'update', objectId: input.objectId, data }],
      };
    }

    case 'updateText': {
      const existing = boardState.find((o) => o.id === input.objectId);
      const field = existing?.type === 'frame' ? 'label' : 'text';
      return {
        message: `Updated text on object ${input.objectId}`,
        operations: [{
          action: 'update',
          objectId: input.objectId,
          data: { [field]: input.text, updatedAt: now },
        }],
      };
    }

    case 'changeColor': {
      return {
        message: `Changed color of ${input.objectId} to ${input.color}`,
        operations: [{
          action: 'update',
          objectId: input.objectId,
          data: { color: input.color, updatedAt: now },
        }],
      };
    }

    case 'getBoardState': {
      if (boardState.length === 0) {
        return { message: 'The board is empty.', operations: [] };
      }
      const desc = boardState
        .map(
          (obj) =>
            `- ${obj.type} (id: ${obj.id}) at (${Math.round(obj.x)}, ${Math.round(obj.y)})${obj.text ? ` text: "${obj.text}"` : ''}${obj.label ? ` label: "${obj.label}"` : ''} color: ${obj.color}`
        )
        .join('\n');
      return { message: `Board has ${boardState.length} objects:\n${desc}`, operations: [] };
    }

    default:
      return { message: `Unknown tool: ${toolName}`, operations: [] };
  }
}

// --- Build user message with board context ---
function buildUserMessage(command: string, boardState: BoardObject[]): string {
  let msg = `User command: ${command}\n\n`;
  if (boardState.length > 0) {
    msg += `Current board state (${boardState.length} objects):\n`;
    for (const obj of boardState) {
      msg += `- ${obj.type} (id: ${obj.id}) at (${Math.round(obj.x)}, ${Math.round(obj.y)})`;
      if (obj.text) msg += ` text: "${obj.text}"`;
      if (obj.label) msg += ` label: "${obj.label}"`;
      msg += ` color: ${obj.color}\n`;
    }
  } else {
    msg += 'The board is currently empty.\n';
  }
  return msg;
}

// --- Main handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { command, boardId, boardState, userId } = req.body || {};

  if (!command || !boardId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing required fields: command, boardId, userId' });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'AI service not configured.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS as any }],
    });

    const chat = model.startChat();
    const allOperations: Operation[] = [];
    let finalMessage = '';

    const userMessage = buildUserMessage(command, boardState || []);
    let result = await chat.sendMessage(userMessage);

    const MAX_ITERATIONS = 10;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = result.response;

      // Check for text response
      const text = response.text?.();
      if (text) {
        finalMessage = text;
      }

      // Check for function calls
      const functionCalls = response.functionCalls?.();
      if (!functionCalls || functionCalls.length === 0) {
        break;
      }

      // Process each function call into operations
      const functionResponses = [];
      for (const call of functionCalls) {
        const toolResult = processToolCall(call.name, call.args, userId, boardState || []);
        allOperations.push(...toolResult.operations);
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: { result: toolResult.message },
          },
        });
      }

      // Send function responses back to continue the conversation
      result = await chat.sendMessage(functionResponses);
    }

    // Try to get final text if we haven't captured one yet
    if (!finalMessage) {
      try {
        const text = result.response.text?.();
        if (text) finalMessage = text;
      } catch (_) {
        // Ignore - text() throws if response only has function calls
      }
    }

    const created = allOperations.filter((o) => o.action === 'create').length;
    const modified = allOperations.filter((o) => o.action === 'update').length;

    return res.status(200).json({
      success: true,
      message: finalMessage || `Completed: ${created} objects created, ${modified} modified.`,
      operations: allOperations,
      objectsCreated: created,
      objectsModified: modified,
    });
  } catch (error: any) {
    console.error('AI agent error:', error);

    if (error?.status === 429 || error?.message?.includes('429')) {
      return res.status(429).json({ success: false, error: 'AI rate limited. Please try again in a moment.' });
    }

    return res.status(500).json({
      success: false,
      error: error?.message || 'An unexpected error occurred. Please try again.',
    });
  }
}
