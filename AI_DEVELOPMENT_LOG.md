# AI Development Log - Collaborative Whiteboard AI Agent

## Project Overview

**Feature**: AI Board Agent for collaborative whiteboard
**Development Period**: February 19-20, 2026
**Developer**: Joe Panetta
**AI Model**: Google Gemini 2.5 Flash (free tier)
**Architecture**: Vercel Serverless Function + Gemini API with Function Calling

---

## 1. Planning & Architecture Decisions

### Initial Approach: Claude API + Firebase Admin SDK

The first design used Anthropic's Claude API (claude-sonnet-4) with Firebase Admin SDK for server-side Firestore writes. The server would receive a user command, send it to Claude with tool definitions, and write AI-generated objects directly to Firestore.

**Architecture v1:**
```
User Command -> POST /api/ai -> Claude API (tool use) -> Firebase Admin -> Firestore -> Client onSnapshot
```

**Why this was abandoned:**
- Firebase Admin SDK requires a service account key
- Organization policy blocked service account key creation ("Key creation is not allowed on this service account")
- Anthropic API requires paid credits separate from the Claude.ai subscription

### Final Approach: Gemini API + Client-Side Firestore Writes

**Architecture v2 (current):**
```
User Command -> POST /api/ai -> Gemini API (function calling) -> Return operations -> Client writes to Firestore -> onSnapshot syncs to all users
```

**Key insight**: The server doesn't need to write to Firestore at all. It returns a list of operations (create/update instructions) to the client, which executes them using the existing Firebase client SDK. This:
- Eliminated the need for Firebase Admin SDK entirely
- Kept the same real-time sync behavior (existing `useBoardObjects` hook auto-renders new objects)
- Reduced environment variables from 5 to 1 (just `GOOGLE_AI_API_KEY`)

### Why Google Gemini 2.5 Flash

| Factor | Claude API | Gemini 2.5 Flash |
|--------|-----------|------------------|
| Cost | Requires paid API credits | Free tier (no credit card) |
| Function calling | Yes (tool_use blocks) | Yes (functionCalls) |
| Rate limits | Pay-per-use | 10 RPM, 250 RPD free |
| Multi-turn tool use | Yes | Yes |
| Quality | Excellent | Good (sufficient for our use case) |

Gemini was chosen purely for cost reasons. The function calling capabilities are equivalent for our 9-tool agent.

---

## 2. AI Agent Design

### System Prompt Engineering

The system prompt instructs the AI on:
- **Object placement rules**: Place objects in visible areas (x: 100-1500, y: 100-1000)
- **Default dimensions**: Sticky notes 200x200, rectangles 150x100, circles radius 60
- **Color palette**: 8 predefined hex colors matching the UI toolbar
- **Template layouts**: Specific instructions for SWOT analysis (2x2 grid), retrospectives (3 columns), and user journey maps (horizontal stages)
- **Spacing conventions**: 220px between objects in grids
- **Board state awareness**: Reference existing object IDs for manipulation commands

The prompt was iterated to include specific layout templates after initial testing showed the AI placing objects randomly without spatial consistency.

### Tool Definitions (9 tools)

| Tool | Category | Purpose |
|------|----------|---------|
| `createStickyNote` | Creation | Sticky note with text, position, color, optional dimensions |
| `createShape` | Creation | Rectangle or circle with position, color |
| `createFrame` | Creation | Labeled container/section for grouping |
| `createConnector` | Creation | Arrow/line between two existing objects |
| `moveObject` | Manipulation | Reposition existing object by ID |
| `resizeObject` | Manipulation | Change width/height/radius by ID |
| `updateText` | Manipulation | Update sticky text or frame label by ID |
| `changeColor` | Manipulation | Recolor existing object by ID |
| `getBoardState` | Query | Return current board objects for context |

**Design decisions:**
- Tools return operations (not direct writes) so the client can execute them
- Each tool generates a unique ID using `Date.now().toString(36) + Math.random().toString(36).substr(2)` matching the client-side ID pattern
- `getBoardState` is a read-only tool that lets the AI understand what exists before making changes
- Board state is also passed in the initial user message, so `getBoardState` serves as a refresh mechanism during multi-turn conversations

### Multi-Turn Tool Use Loop

The agent runs a loop (max 10 iterations) to handle complex commands:

```
1. Send user command + board state to Gemini
2. Check response for function calls
3. If function calls found:
   a. Execute each via processToolCall() -> collect operations
   b. Send function responses back to Gemini
   c. Go to step 2
4. If no function calls: extract final text message, return all operations
```

This allows commands like "Create a SWOT analysis" to work, which requires:
- 4 `createFrame` calls (Strengths, Weaknesses, Opportunities, Threats)
- 4 `createStickyNote` calls (one starter note in each quadrant)
- Total: 8 tool calls across potentially multiple turns

---

## 3. Implementation Details

### Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `api/ai.ts` | Vercel serverless function with Gemini integration | ~420 |
| `src/components/AICommandInput.tsx` | Floating command input UI | ~220 |
| `src/components/Frame.tsx` | Konva frame renderer (labeled container) | ~53 |
| `src/components/Connector.tsx` | Konva arrow/connector renderer | ~43 |
| `api/tsconfig.json` | TypeScript config for API directory | ~13 |
| `vercel.json` | Vercel deployment config (30s function timeout) | ~7 |

### Files Modified

| File | Changes |
|------|---------|
| `src/types/index.ts` | Added `frame` and `connector` to BoardObject type, added `label?`, `fromId?`, `toId?` fields |
| `src/components/Board.tsx` | Added Frame/Connector/AICommandInput imports, render-order sorting (frames behind shapes), delete functionality |
| `package.json` | Added `@google/generative-ai`, removed `@anthropic-ai/sdk` and `langsmith` |

### Client-Side Operation Execution

The `AICommandInput` component receives operations from the API and writes them to Firestore:

```typescript
const executeOperations = async (operations: Operation[]) => {
  for (const op of operations) {
    if (op.action === 'create') {
      const objectRef = doc(db, 'boards', boardId, 'objects', op.id);
      await setDoc(objectRef, op.data);
    } else if (op.action === 'update') {
      const objectRef = doc(db, 'boards', boardId, 'objects', op.objectId);
      await updateDoc(objectRef, op.data);
    }
  }
};
```

This leverages the existing Firebase client SDK and authentication — no additional auth setup needed.

---

## 4. Testing & Iteration

### Test Cases

| Command | Expected Result | Status |
|---------|----------------|--------|
| "Create a yellow sticky note" | Single sticky note appears | Pass |
| "Create a SWOT analysis" | 4 frames + 4 stickies in 2x2 grid | Pass |
| "Create a green sticky note that says Hello" | Green sticky with "Hello" text | Pass |
| "Create 3 sticky notes in a row" | 3 spaced sticky notes | Pass |
| Multi-user: AI command in tab A | Objects appear in tab B via sync | Pass |

### Issues Encountered & Resolved

1. **Firebase Admin SDK blocked** (org policy) -> Refactored to client-side writes
2. **Anthropic API requires paid credits** -> Switched to Google Gemini free tier
3. **TypeScript build errors** with Anthropic SDK type assertions -> Simplified to plain loops
4. **Model name `gemini-2.5-flash-preview-04-17` not found** -> Updated to `gemini-2.5-flash`
5. **Unused import `FunctionDeclarationSchemaType`** -> Removed
6. **Preview deployment URLs not authorized** -> Added production domain to Firebase authorized domains

---

## 5. Cost Analysis

### AI API Costs

| Service | Tier | Cost |
|---------|------|------|
| Google Gemini API | Free tier | $0 |
| Firebase Firestore | Free tier (50K reads/day, 20K writes/day) | $0 |
| Firebase Auth | Free tier (unlimited) | $0 |
| Vercel Hosting | Free tier (100GB bandwidth) | $0 |

**Total AI Agent Cost: $0**

### Gemini Free Tier Limits

- 10 requests/minute
- 250 requests/day
- 250,000 tokens/minute
- 1M token context window

For a demo/MVP with moderate usage, these limits are sufficient. A production deployment would require upgrading to Gemini's paid tier ($0.15/1M input tokens for Flash).

### Estimated Production Costs (if scaled)

| Usage Level | Monthly Gemini Cost | Monthly Firebase Cost | Total |
|------------|--------------------|-----------------------|-------|
| 100 users, 10 AI commands/day | ~$1-2 | $0 (free tier) | ~$2/mo |
| 1,000 users, 50 commands/day | ~$15-25 | ~$5 | ~$30/mo |
| 10,000 users, 200 commands/day | ~$150-250 | ~$25 | ~$275/mo |

---

## 6. Supported AI Commands

### Simple Commands
- "Create a sticky note"
- "Create a blue circle"
- "Create a red rectangle"
- "Create a green sticky that says Team Goals"

### Layout Commands
- "Create a SWOT analysis" (4 frames + starter stickies)
- "Create a retrospective board" (3 columns: What Went Well, Improve, Action Items)
- "Create a user journey map" (5 horizontal stages)
- "Create a 3x3 grid of sticky notes"

### Manipulation Commands
- "Move [object] to the right"
- "Change the color of [object] to blue"
- "Update the text on [object]"
- "Resize [object]"

### Context-Aware Commands
- The AI receives the full board state with every request
- Can reference existing objects by their content or position
- Supports multi-step operations across multiple tool calls

---

## 7. Architecture Diagram

```
                    Collaborative Whiteboard AI Agent Architecture

  +------------------+          +-------------------+         +------------------+
  |   Browser (A)    |          |  Vercel Serverless |         |   Browser (B)    |
  |                  |          |   Function         |         |                  |
  | AICommandInput   |  POST    |  api/ai.ts         |         | AICommandInput   |
  | "Create SWOT"    |--------->|                    |         |                  |
  |                  |          | 1. Parse command    |         |                  |
  |                  |          | 2. Send to Gemini   |         |                  |
  |                  |          |    with 9 tools     |         |                  |
  |                  |          | 3. Process tool     |         |                  |
  |                  |          |    calls in loop    |         |                  |
  |                  |  JSON    | 4. Return operations|         |                  |
  |                  |<---------|                    |         |                  |
  |                  |          +-------------------+         |                  |
  | executeOps()     |                                         |                  |
  | setDoc(frame1)   |          +-------------------+         |                  |
  | setDoc(frame2)   |--------->|                    |         |                  |
  | setDoc(sticky1)  |          |     Firestore      |         |                  |
  | setDoc(sticky2)  |          |                    |-------->| onSnapshot()     |
  | ...              |          | boards/{id}/objects |         | Auto-renders     |
  |                  |          |                    |         | new objects       |
  +------------------+          +-------------------+         +------------------+
```

---

## 8. Lessons Learned

1. **Start with the simplest architecture**: Client-side Firestore writes turned out simpler and more reliable than server-side writes via Firebase Admin SDK.

2. **API provider flexibility matters**: By keeping `processToolCall()` provider-agnostic (it just takes a tool name and input), switching from Claude to Gemini only required rewriting the API call layer, not the business logic.

3. **Free tiers are viable for MVPs**: Google Gemini's free tier provides enough capacity for demo and development use without any cost.

4. **Tool definitions are mostly portable**: Anthropic's `input_schema` and Gemini's `parameters` are nearly identical JSON Schema formats. The conversion was mechanical.

5. **Multi-turn tool use is essential**: Complex commands like SWOT analysis require 8+ tool calls. Without the multi-turn loop, the agent would be limited to single-action commands.
