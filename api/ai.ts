import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { traceable } from 'langsmith/traceable';

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

interface DeleteOperation {
  action: 'delete';
  objectId: string;
}

type Operation = CreateOperation | UpdateOperation | DeleteOperation;

// --- Gemini tool (function) declarations ---
const TOOL_DECLARATIONS = [
    {
      name: 'moveObjects',
      description: 'Move multiple objects to new positions in a single operation.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          moves: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                objectId: { type: SchemaType.STRING, description: 'ID of the object to move' },
                x: { type: SchemaType.NUMBER, description: 'New X coordinate' },
                y: { type: SchemaType.NUMBER, description: 'New Y coordinate' },
              },
              required: ['objectId', 'x', 'y'],
            },
          },
        },
        required: ['moves'],
      },
    },
    {
      name: 'resizeObjects',
      description: 'Resize multiple objects in a single operation.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          resizes: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                objectId: { type: SchemaType.STRING, description: 'ID of the object to resize' },
                width: { type: SchemaType.NUMBER, description: 'New width' },
                height: { type: SchemaType.NUMBER, description: 'New height' },
                radius: { type: SchemaType.NUMBER, description: 'New radius (for circles)' },
              },
              required: ['objectId'],
            },
          },
        },
        required: ['resizes'],
      },
    },
    {
      name: 'changeColors',
      description: 'Change colors of multiple objects in a single operation.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          colorChanges: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                objectId: { type: SchemaType.STRING, description: 'ID of the object to recolor' },
                color: { type: SchemaType.STRING, description: 'New color hex' },
              },
              required: ['objectId', 'color'],
            },
          },
        },
        required: ['colorChanges'],
      },
    },
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
    description: 'Create a geometric shape on the whiteboard.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        x: { type: SchemaType.NUMBER, description: 'X coordinate' },
        y: { type: SchemaType.NUMBER, description: 'Y coordinate' },
        shapeType: { type: SchemaType.STRING, description: 'Type of shape: "rectangle", "circle", "triangle", "diamond", "star", "hexagon", or "line"' },
        color: { type: SchemaType.STRING, description: 'Fill color hex' },
        width: { type: SchemaType.NUMBER, description: 'Width for rectangle/diamond, default 150' },
        height: { type: SchemaType.NUMBER, description: 'Height for rectangle/diamond, default 100' },
        radius: { type: SchemaType.NUMBER, description: 'Radius for circle/triangle/star/hexagon, default 60' },
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
    name: 'deleteObject',
    description: 'Delete an existing object from the board by its ID.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        objectId: { type: SchemaType.STRING, description: 'ID of the object to delete' },
      },
      required: ['objectId'],
    },
  },
  {
    name: 'clearBoard',
    description: 'Delete all objects from the board. Use when the user asks to clear, reset, or start fresh.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'changeFontSize',
    description: 'Change the font size of a sticky note, text object, or frame.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        objectId: { type: SchemaType.STRING, description: 'ID of the object' },
        fontSize: { type: SchemaType.NUMBER, description: 'New font size in pixels (8-72)' },
      },
      required: ['objectId', 'fontSize'],
    },
  },
  {
    name: 'organizeBoard',
    description: 'Automatically arrange all objects on the board. Supports two modes: "grid" arranges all objects in a neat grid sorted by creation time; "groupByColor" groups objects by their color into columns.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        mode: {
          type: SchemaType.STRING,
          description: 'Layout mode: "grid" or "groupByColor"',
        },
      },
      required: ['mode'],
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


You should always batch operations whenever possible. If a user command affects multiple objects (e.g., "move all stickies to the right", "resize all frames", "change color of all circles"), use the batch tools (moveObjects, resizeObjects, changeColors) to perform these actions in a single function call. This reduces API calls and improves performance at scale.

You can generate workflow templates (e.g., onboarding, Kanban, project planning, retrospectives) by creating frames, sticky notes, and connectors in structured layouts. For Kanban, create columns labeled "To Do", "In Progress", "Done" and place starter sticky notes in each. For onboarding, create a step-by-step flow with labeled frames and sticky notes for each stage. When a user requests a template, generate a board layout that matches the requested workflow.

Rules:
- Use the provided tools to create, manipulate, and delete board objects.
- You CAN delete objects using deleteObject (by ID) and clear the entire board using clearBoard. Always use these tools when the user asks to delete, remove, or clear.
- Place objects in visible areas (x: 100-1500, y: 100-1000).
- When creating multiple objects, space them so they don't overlap.
- Sticky notes default to 200x200. Rectangles default to 150x100. Circles default to radius 60.
- Available colors: #FFE066 (yellow), #FF6B6B (red), #4ECDC4 (teal), #45B7D1 (blue), #95E1D3 (mint), #F38181 (coral), #AA96DA (purple), #FCBAD3 (pink).
- For frames, use large dimensions like 400x350 or bigger.
- For SWOT analysis: create 4 frames in a 2x2 grid labeled Strengths, Weaknesses, Opportunities, Threats with matching colors, then place a starter sticky in each.
- For retrospective boards: create 3 columns (What Went Well, What To Improve, Action Items).
- For user journey maps: create horizontal frames for each stage (Awareness, Consideration, Decision, Onboarding, Retention).
- For Eisenhower Matrix: create 4 quadrant frames in a 2x2 grid: "Urgent & Important (Do)" top-left, "Not Urgent & Important (Schedule)" top-right, "Urgent & Not Important (Delegate)" bottom-left, "Not Urgent & Not Important (Eliminate)" bottom-right. Use colors: red, blue, yellow, mint.
- For Pros & Cons: create 2 side-by-side frames labeled "Pros" (green/teal) and "Cons" (red/coral) with 3 sample stickies in each.
- For Business Model Canvas: create 9 frames in the standard BMC layout. Top row: Key Partners, Key Activities, Value Propositions, Customer Relationships, Customer Segments. Bottom row: Key Resources, Channels, Cost Structure, Revenue Streams.
- For Sprint Planning: create a "Sprint Goal" frame at top, then 3 equal columns: Backlog, In Progress, Done with task stickies.
- For Brainstorming: place a central "Main Topic" sticky, surround with 6 idea stickies in a circle (radius ~300px), connect each to center.
- For Flowchart: arrange nodes top-to-bottom with ~150px vertical spacing. Use rectangles for processes, stickies for start/end, connect with connectors.
- When arranging in a grid, use consistent spacing (e.g., 220px between sticky notes).
- The board state is provided so you can reference existing object IDs for move/resize/update operations.
- Use organizeBoard with mode "grid" when the user asks to organize, arrange, tidy, or clean up the board.
- Use organizeBoard with mode "groupByColor" when the user asks to group, cluster, or categorize by color.
- Use changeFontSize to modify text size on stickies, text objects, or frames (range 8-72).
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
  fontSize?: number;
  createdAt?: number;
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
      } else if (input.shapeType === 'diamond') {
        data.width = input.width || 100;
        data.height = input.height || 140;
      } else if (input.shapeType === 'line') {
        data.points = [0, 0, 150, 0];
      } else {
        // circle, triangle, star, hexagon — all radius-based
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

    case 'moveObjects': {
      const ops: Operation[] = (input.moves || []).map((m: any) => ({
        action: 'update' as const,
        objectId: m.objectId,
        data: { x: m.x, y: m.y, updatedAt: now },
      }));
      return {
        message: `Moved ${ops.length} objects`,
        operations: ops,
      };
    }

    case 'resizeObjects': {
      const ops: Operation[] = (input.resizes || []).map((r: any) => {
        const data: Record<string, any> = { updatedAt: now };
        if (r.width !== undefined) data.width = r.width;
        if (r.height !== undefined) data.height = r.height;
        if (r.radius !== undefined) data.radius = r.radius;
        return { action: 'update' as const, objectId: r.objectId, data };
      });
      return {
        message: `Resized ${ops.length} objects`,
        operations: ops,
      };
    }

    case 'changeColors': {
      const ops: Operation[] = (input.colorChanges || []).map((c: any) => ({
        action: 'update' as const,
        objectId: c.objectId,
        data: { color: c.color, updatedAt: now },
      }));
      return {
        message: `Changed color of ${ops.length} objects`,
        operations: ops,
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

    case 'changeFontSize': {
      const size = Math.max(8, Math.min(72, input.fontSize));
      return {
        message: `Changed font size of ${input.objectId} to ${size}px`,
        operations: [{
          action: 'update',
          objectId: input.objectId,
          data: { fontSize: size, updatedAt: now },
        }],
      };
    }

    case 'organizeBoard': {
      const placeable = boardState.filter((o) => o.type !== 'connector');
      if (placeable.length === 0) {
        return { message: 'No objects to organize.', operations: [] };
      }

      const centeredTypes = new Set(['circle', 'triangle', 'hexagon', 'star']);
      function getObjSize(obj: BoardObject) {
        if (centeredTypes.has(obj.type)) {
          const d = (obj.radius || 60) * 2;
          return { w: d, h: d };
        }
        return { w: obj.width || 150, h: obj.height || 100 };
      }

      let positions: Array<{ id: string; x: number; y: number }>;

      if (input.mode === 'groupByColor') {
        const groups = new Map<string, typeof placeable>();
        for (const obj of placeable) {
          const list = groups.get(obj.color) || [];
          list.push(obj);
          groups.set(obj.color, list);
        }
        positions = [];
        let columnX = 100;
        for (const [, group] of Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length)) {
          let rowY = 100;
          let maxW = 0;
          for (const obj of group) {
            const { w, h } = getObjSize(obj);
            const offX = centeredTypes.has(obj.type) ? w / 2 : 0;
            const offY = centeredTypes.has(obj.type) ? h / 2 : 0;
            positions.push({ id: obj.id, x: columnX + offX, y: rowY + offY });
            rowY += h + 50;
            maxW = Math.max(maxW, w);
          }
          columnX += maxW + 80;
        }
      } else {
        const sorted = [...placeable].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const cols = Math.min(6, Math.ceil(Math.sqrt(sorted.length)));
        positions = [];
        let cx = 100, cy = 100, col = 0, rowH = 0;
        for (const obj of sorted) {
          const { w, h } = getObjSize(obj);
          if (col >= cols) { col = 0; cx = 100; cy += rowH + 50; rowH = 0; }
          const offX = centeredTypes.has(obj.type) ? w / 2 : 0;
          const offY = centeredTypes.has(obj.type) ? h / 2 : 0;
          positions.push({ id: obj.id, x: cx + offX, y: cy + offY });
          cx += w + 50;
          rowH = Math.max(rowH, h);
          col++;
        }
      }

      const ops: Operation[] = positions.map((p) => ({
        action: 'update' as const,
        objectId: p.id,
        data: { x: p.x, y: p.y, updatedAt: now },
      }));

      return {
        message: `Organized ${positions.length} objects in ${input.mode === 'groupByColor' ? 'color groups' : 'a grid'}.`,
        operations: ops,
      };
    }

    case 'deleteObject': {
      return {
        message: `Deleted object ${input.objectId}`,
        operations: [{ action: 'delete' as const, objectId: input.objectId }],
      };
    }

    case 'clearBoard': {
      const ops: Operation[] = boardState.map((obj) => ({
        action: 'delete' as const,
        objectId: obj.id,
      }));
      return {
        message: `Cleared board (${boardState.length} objects deleted)`,
        operations: ops,
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

  // Gemini models to try in order — each has separate rate limits
  const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

  // Core agent logic extracted so it can be retried with different models
  async function runWithModel(
    modelName: string,
    params: { command: string; boardState: BoardObject[]; userId: string }
  ) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS as any }],
    });

    const chat = model.startChat();
    const allOperations: Operation[] = [];
    let finalMessage = '';

    const userMessage = buildUserMessage(params.command, params.boardState);

    let result = await chat.sendMessage(userMessage);

    // --- Gemini Pro token usage logging ---
    if (result && result.response && result.response.usage) {
      const usage = result.response.usage;
      console.log('Gemini Pro usage:', {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        model: modelName,
        userId: params.userId,
        boardId: boardId,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('Gemini Pro usage: usage data not available in response', {
        model: modelName,
        userId: params.userId,
        boardId: boardId,
        timestamp: new Date().toISOString(),
      });
    }

    const MAX_ITERATIONS = 10;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = result.response;

      // Check for text response (text() throws when response has only function calls)
      try {
        const text = response.text?.();
        if (text) {
          finalMessage = text;
        }
      } catch (_) {
        // Expected when response contains only function calls
      }

      // Check for function calls
      const functionCalls = response.functionCalls?.();
      if (!functionCalls || functionCalls.length === 0) {
        break;
      }

      // Process each function call into operations
      const functionResponses = [];
      for (const call of functionCalls) {
        const toolResult = processToolCall(call.name, call.args, params.userId, params.boardState);
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

    return {
      success: true,
      message: finalMessage || `Completed: ${created} objects created, ${modified} modified.`,
      operations: allOperations,
      objectsCreated: created,
      objectsModified: modified,
      model: modelName,
    };
  }

  // --- Groq fallback (free LLM with function calling, OpenAI-compatible) ---
  function convertSchemaType(val: any): any {
    if (val === SchemaType.OBJECT) return 'object';
    if (val === SchemaType.STRING) return 'string';
    if (val === SchemaType.NUMBER) return 'number';
    if (val === SchemaType.ARRAY) return 'array';
    if (val === SchemaType.BOOLEAN) return 'boolean';
    if (typeof val === 'object' && val !== null) {
      const out: any = {};
      for (const [k, v] of Object.entries(val)) {
        out[k] = convertSchemaType(v);
      }
      return out;
    }
    return val;
  }

  function geminiToolsToOpenAI() {
    return TOOL_DECLARATIONS.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: convertSchemaType(t.parameters),
      },
    }));
  }

  async function runWithGroq(
    params: { command: string; boardState: BoardObject[]; userId: string }
  ) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error('Groq API key not configured');

    const tools = geminiToolsToOpenAI();
    const userMessage = buildUserMessage(params.command, params.boardState);

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    const allOperations: Operation[] = [];
    let finalMessage = '';
    const MAX_ITERATIONS = 10;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          tools,
          tool_choice: 'auto',
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Groq API error ${resp.status}: ${errBody}`);
      }

      const data: any = await resp.json();
      const choice = data.choices?.[0];
      if (!choice) throw new Error('No response from Groq');

      const msg = choice.message;
      messages.push(msg); // Add assistant response to history

      if (msg.content) {
        finalMessage = msg.content;
      }

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        break;
      }

      // Process each tool call
      for (const tc of msg.tool_calls) {
        const args = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
        const toolResult = processToolCall(tc.function.name, args, params.userId, params.boardState);
        allOperations.push(...toolResult.operations);

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: toolResult.message,
        });
      }
    }

    const created = allOperations.filter((o) => o.action === 'create').length;
    const modified = allOperations.filter((o) => o.action === 'update').length;

    return {
      success: true,
      message: finalMessage || `Completed: ${created} objects created, ${modified} modified.`,
      operations: allOperations,
      objectsCreated: created,
      objectsModified: modified,
      model: 'groq/llama-3.3-70b',
    };
  }

  // Wrap with LangSmith tracing
  const runAgent = traceable(
    async (params: { command: string; boardState: BoardObject[]; userId: string }) => {
      let lastError: any;

      // Try each Gemini model — on 429/404, fall back immediately
      for (let i = 0; i < MODELS.length; i++) {
        const modelName = MODELS[i];
        try {
          return await runWithModel(modelName, params);
        } catch (error: any) {
          lastError = error;
          const is429 = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Resource has been exhausted');
          const is404 = error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('is not found');

          if (is429 || is404) {
            console.log(`Model ${modelName} ${is404 ? 'not found' : 'rate limited'}, trying next...`);
            continue;
          }

          throw error;
        }
      }

      // All Gemini models exhausted — try Groq as free LLM fallback
      if (process.env.GROQ_API_KEY) {
        try {
          console.log('All Gemini models exhausted, falling back to Groq...');
          return await runWithGroq(params);
        } catch (groqError: any) {
          console.error('Groq fallback failed:', groqError?.message);
          // Fall through to throw the original Gemini error
        }
      }

      throw lastError;
    },
    { name: 'whiteboard-ai-agent', run_type: 'chain' }
  );

  try {
    const result = await runAgent({ command, boardState: boardState || [], userId });
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('AI agent error:', error);

    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Resource has been exhausted')) {
      return res.status(429).json({ success: false, error: 'All AI models rate limited. Please wait a minute and try again.' });
    }

    return res.status(500).json({
      success: false,
      error: error?.message || 'An unexpected error occurred. Please try again.',
    });
  }
}
