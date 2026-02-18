# 📁 Project Structure Explained

## Overview
```
whiteboard-mvp/
├── public/              # Static files
│   └── index.html       # HTML template
├── src/                 # Source code
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Libraries & config
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Main app component
│   ├── index.tsx        # Entry point
│   └── index.css        # Global styles
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── README.md            # Documentation
```

---

## 📂 Detailed Breakdown

### `/src/components/` - UI Components

**Auth.tsx**
- Google Sign-In button
- User info display (top-right)
- Sign out button

**Board.tsx** ⭐ MAIN COMPONENT
- Canvas rendering (Konva Stage/Layer)
- Object creation logic
- Cursor tracking
- Presence updates
- Pan/zoom controls

**StickyNote.tsx**
- Renders sticky notes on canvas
- Handles drag & drop
- Double-click to edit text
- Updates Firestore on changes

**Shape.tsx**
- Renders rectangles and circles
- Handles drag & drop
- Selection highlighting

**Cursor.tsx**
- Renders other users' cursors
- Shows username label
- Color-coded per user

**Toolbar.tsx**
- Tool selection (select, sticky, shapes)
- Color picker
- Keyboard shortcuts hints

**PresenceIndicator.tsx**
- Online user list (top-right)
- Shows who's currently active
- Color-coded indicators

---

### `/src/hooks/` - Custom Hooks

**useAuth.ts**
- Monitors Firebase authentication state
- Returns current user object
- Loading state

**useBoardObjects.ts**
- Real-time listener for board objects
- Automatically updates when objects change
- Returns array of objects

**useCursors.ts**
- Real-time listener for cursor positions
- Filters out current user's cursor
- Returns array of other users' cursors

**usePresence.ts**
- Real-time listener for user presence
- Determines who's online (seen in last 30s)
- Returns array of online users

---

### `/src/lib/` - Configuration

**firebase.ts** ⚠️ YOU MUST EDIT THIS
- Firebase initialization
- Firestore database reference
- Auth configuration
- **ACTION REQUIRED**: Add your Firebase config here

**utils.ts**
- Helper functions
- Generate unique IDs
- Get user colors (consistent per user)
- Format display names

---

### `/src/types/` - TypeScript Interfaces

**index.ts**
- `BoardObject` - Base interface for all objects
- `StickyNote` - Sticky note specific fields
- `Shape` - Rectangle/circle specific fields
- `CursorPosition` - Cursor data structure
- `UserPresence` - Online user data
- `User` - Authenticated user info

---

## 🔄 Data Flow

### Creating an Object

```
User clicks canvas
    ↓
Board.tsx: createObject()
    ↓
Generate unique ID
    ↓
Write to Firestore: /boards/{boardId}/objects/{objectId}
    ↓
Firestore real-time listener triggers
    ↓
useBoardObjects hook updates
    ↓
Board re-renders with new object
    ↓
ALL connected users see the new object
```

### Moving Cursor

```
User moves mouse
    ↓
Board.tsx: handleMouseMove()
    ↓
Debounce (every 16ms for 60 FPS)
    ↓
Write to Firestore: /boards/{boardId}/cursors/{userId}
    ↓
useCursors hook on OTHER users' devices updates
    ↓
Cursor component renders at new position
    ↓
Smooth cursor movement across all devices
```

### Updating Presence

```
User signs in
    ↓
Board.tsx: useEffect on mount
    ↓
Write to Firestore: /boards/{boardId}/presence/{userId}
    ↓
Set interval: update every 10 seconds
    ↓
usePresence hook filters users seen in last 30s
    ↓
PresenceIndicator shows online count
    ↓
On unmount: set online: false
```

---

## 🗄️ Firestore Structure

```
boards/
  └── demo-board-1/               # Board ID
      ├── objects/                # All board objects
      │   ├── obj_abc123          # Sticky note
      │   │   ├── type: "sticky"
      │   │   ├── x: 100
      │   │   ├── y: 200
      │   │   ├── text: "Hello"
      │   │   ├── color: "#FFE066"
      │   │   └── ...
      │   └── obj_def456          # Shape
      │       ├── type: "rectangle"
      │       ├── width: 150
      │       └── ...
      ├── cursors/                # Ephemeral cursor data
      │   ├── user_123
      │   │   ├── x: 500
      │   │   ├── y: 300
      │   │   ├── userName: "Alice"
      │   │   └── color: "#FF6B6B"
      │   └── user_456
      └── presence/               # Who's online
          ├── user_123
          │   ├── online: true
          │   ├── lastSeen: 1234567890
          │   └── userName: "Alice"
          └── user_456
```

---

## 🎨 How Things Work Together

### Example: Creating a Sticky Note

1. **User Action**: Click 📝 tool, then click canvas
2. **Toolbar.tsx**: Updates `selectedTool` state
3. **Board.tsx**: `handleStageClick()` detects click
4. **Board.tsx**: `createObject('sticky', x, y)` called
5. **Generate ID**: `generateId()` creates unique ID
6. **Firestore Write**: Object saved to `/boards/demo-board-1/objects/{id}`
7. **Real-time Sync**: Firestore triggers `onSnapshot` listener
8. **useBoardObjects**: Hook receives new object
9. **Board Re-render**: React re-renders with new sticky
10. **StickyNote.tsx**: Component renders on canvas
11. **All Users**: Everyone connected sees the sticky instantly

### Example: Real-time Cursor Sync

1. **User A moves mouse** on their screen
2. **Board.tsx**: `handleMouseMove()` captures position
3. **Debounce**: Only updates every 16ms (60 FPS)
4. **Firestore Write**: Updates `/boards/demo-board-1/cursors/userA`
5. **User B's Device**: `useCursors` hook listening for changes
6. **Hook Updates**: Receives new cursor position
7. **Cursor.tsx**: Renders User A's cursor at new position
8. **Result**: User B sees User A's cursor move smoothly

---

## 🔧 Key Technologies

**React 18**
- Component-based UI
- Hooks for state management
- Real-time updates via state

**TypeScript**
- Type safety
- Better autocomplete
- Catches errors early

**Konva.js**
- HTML5 Canvas library
- 60 FPS rendering
- Handles transforms, events
- React bindings (react-konva)

**Firebase Firestore**
- Real-time NoSQL database
- Automatic sync
- Offline support
- WebSocket connections

**Firebase Auth**
- Google OAuth
- Session management
- Token refresh

---

## 🚀 Performance Optimizations

1. **Debouncing**: Cursor updates limited to 60 FPS
2. **Optimistic Updates**: UI updates instantly, syncs in background
3. **Konva Layers**: Separates objects from cursors for better rendering
4. **Firestore Indexes**: Default indexes for fast queries
5. **Component Memoization**: Prevents unnecessary re-renders

---

## 📝 What You Can Customize

### Change Colors
`src/components/Toolbar.tsx` - Line 12:
```typescript
const colors = ['#FFE066', '#FF6B6B', ...]; // Add more colors here
```

### Change Sticky Note Size
`src/components/Board.tsx` - Line 125:
```typescript
width: 200,  // Change width
height: 200, // Change height
```

### Change Board ID (for multiple rooms)
`src/App.tsx` - Line 6:
```typescript
const BOARD_ID = 'demo-board-1'; // Change to 'room-abc' etc.
```

### Add More Shapes
1. Add type to `src/types/index.ts`
2. Add button to `src/components/Toolbar.tsx`
3. Add rendering logic to `src/components/Shape.tsx`
4. Add creation logic to `src/components/Board.tsx`

---

## 🐛 Common Issues & Fixes

**Issue**: Objects not syncing
- **Fix**: Check Firestore rules are published
- **Fix**: Verify user is authenticated
- **Fix**: Check browser console for errors

**Issue**: Cursors laggy
- **Fix**: Check internet connection
- **Fix**: Reduce debounce time in Board.tsx (line 72)

**Issue**: Can't edit sticky notes
- **Fix**: Make sure you're double-clicking
- **Fix**: Check if browser blocks prompts

---

## 🎯 Next Steps After MVP

To add AI agent (Phase 2):
1. Create `/functions` folder for Cloud Functions
2. Add Claude API integration
3. Add command parser
4. Add tool functions (createStickyNote, moveObject, etc.)
5. Update Board.tsx to handle AI-generated objects

---

**This is your complete MVP codebase!** 

Everything is set up and ready. Just add your Firebase config and deploy! 🚀
