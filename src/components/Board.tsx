// src/components/Board.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Transformer } from 'react-konva';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useBoardObjects } from '../hooks/useBoardObjects';
import { useCursors } from '../hooks/useCursors';
import { usePresence } from '../hooks/usePresence';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { StickyNote } from './StickyNote';
import { Shape } from './Shape';
import { Frame } from './Frame';
import { Connector } from './Connector';
import { TextObject } from './TextObject';
import { Cursor } from './Cursor';
import { InlineTextEditor } from './InlineTextEditor';
import { ContextMenu } from './ContextMenu';
import { Toolbar, Tool } from './Toolbar';
import { PresenceIndicator } from './PresenceIndicator';
import { AICommandInput } from './AICommandInput';
import { BoardObject, User } from '../types';
import { generateId, getUserColor, getUserDisplayName } from '../lib/utils';

interface EditingState {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  backgroundColor: string;
}

interface BoardProps {
  boardId: string;
  user: User;
}

export const Board: React.FC<BoardProps> = ({ boardId, user }) => {
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedColor, setSelectedColor] = useState('#FFE066');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  
  const [editingObject, setEditingObject] = useState<EditingState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string } | null>(null);

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const nodeRefs = useRef<Map<string, any>>(new Map());
  const clipboardRef = useRef<BoardObject | null>(null);
  const { objects } = useBoardObjects(boardId);
  const { pushAction, undo, redo } = useUndoRedo();
  const cursors = useCursors(boardId, user.uid);
  const onlineUsers = usePresence(boardId);

  // Update presence
  React.useEffect(() => {
    const presenceRef = doc(db, 'boards', boardId, 'presence', user.uid);
    
    const updatePresence = () => {
      setDoc(presenceRef, {
        userName: getUserDisplayName(user.email, user.displayName),
        email: user.email,
        online: true,
        color: getUserColor(user.uid),
        lastSeen: Date.now(),
      });
    };

    updatePresence();
    const interval = setInterval(updatePresence, 10000);

    return () => {
      clearInterval(interval);
      setDoc(presenceRef, {
        userName: getUserDisplayName(user.email, user.displayName),
        email: user.email,
        online: false,
        color: getUserColor(user.uid),
        lastSeen: Date.now(),
      });
    };
  }, [boardId, user]);

  // Update cursor position
  const updateCursor = useCallback(
    (x: number, y: number) => {
      const cursorRef = doc(db, 'boards', boardId, 'cursors', user.uid);
      setDoc(cursorRef, {
        userName: getUserDisplayName(user.email, user.displayName),
        x,
        y,
        color: getUserColor(user.uid),
        updatedAt: Date.now(),
      });
    },
    [boardId, user]
  );

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (point) {
      updateCursor(point.x - stagePos.x, point.y - stagePos.y);
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    // Limit zoom
    const clampedScale = Math.max(0.1, Math.min(10, newScale));

    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  const handleStageClick = (e: any) => {
    // Close context menu on any click
    setContextMenu(null);

    // Click on empty area
    if (e.target === e.target.getStage()) {
      setSelectedId(null);

      // Create object if a tool is selected
      if (selectedTool !== 'select') {
        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        const x = (point.x - stagePos.x) / stageScale;
        const y = (point.y - stagePos.y) / stageScale;

        createObject(selectedTool, x, y);
      }
    }
  };

  // Right-click context menu
  const handleContextMenu = (e: any) => {
    e.evt.preventDefault();
    // Only show for objects, not empty canvas
    if (e.target === e.target.getStage()) return;

    // Walk up parents to find the object group
    let node = e.target;
    while (node && !node.id()) {
      node = node.parent;
    }

    // Find the object this node belongs to
    const clickedId = Array.from(nodeRefs.current.entries()).find(
      ([, ref]) => ref === node || ref.findOne?.((n: any) => n === e.target)
    )?.[0];

    if (!clickedId) {
      // Fallback: check if any object contains this target
      const target = e.target;
      const found = Array.from(nodeRefs.current.entries()).find(([, ref]) => {
        return ref === target || ref === target.parent || ref === target.parent?.parent;
      });
      if (!found) return;
      setSelectedId(found[0]);
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, objectId: found[0] });
      return;
    }

    setSelectedId(clickedId);
    setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, objectId: clickedId });
  };

  const createObject = async (type: Tool, x: number, y: number) => {
    if (type === 'select') return;

    const objectId = generateId();
    const objectRef = doc(db, 'boards', boardId, 'objects', objectId);

    let objectData: any = {
      x,
      y,
      color: selectedColor,
      createdBy: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (type === 'sticky') {
      objectData = {
        ...objectData,
        type: 'sticky',
        text: 'Double-click to edit',
        width: 200,
        height: 200,
      };
    } else if (type === 'rectangle') {
      objectData = {
        ...objectData,
        type: 'rectangle',
        width: 150,
        height: 100,
      };
    } else if (type === 'circle') {
      objectData = {
        ...objectData,
        type: 'circle',
        radius: 60,
      };
    } else if (type === 'text') {
      objectData = {
        ...objectData,
        type: 'text',
        text: 'Double-click to edit',
        fontSize: 24,
      };
    }

    await setDoc(objectRef, objectData);
    pushAction({
      type: 'create',
      objectId,
      before: null,
      after: objectData,
      fullObject: { id: objectId, ...objectData },
    });
  };

  const updateObject = async (id: string, updates: Partial<BoardObject>) => {
    const current = objects.find((o) => o.id === id);
    if (current) {
      pushAction({
        type: 'update',
        objectId: id,
        before: { ...current },
        after: updates,
      });
    }
    const objectRef = doc(db, 'boards', boardId, 'objects', id);
    await updateDoc(objectRef, updates);
  };

  const deleteObject = async (id: string) => {
    const current = objects.find((o) => o.id === id);
    if (current) {
      pushAction({
        type: 'delete',
        objectId: id,
        before: { ...current },
        after: null,
        fullObject: { ...current },
      });
    }
    const objectRef = doc(db, 'boards', boardId, 'objects', id);
    await deleteDoc(objectRef);
    setSelectedId(null);
  };

  // Attach Transformer to selected node
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const node = nodeRefs.current.get(selectedId);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedId, objects]);

  // Handle transform end — sync new dimensions to Firestore
  const handleTransformEnd = (obj: BoardObject) => {
    const node = nodeRefs.current.get(obj.id);
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale to 1 and apply it to dimensions
    node.scaleX(1);
    node.scaleY(1);

    const updates: any = {
      x: node.x(),
      y: node.y(),
      updatedAt: Date.now(),
    };

    if (obj.type === 'circle') {
      updates.radius = Math.max(10, (obj.radius || 60) * Math.max(scaleX, scaleY));
    } else if (obj.type === 'sticky' || obj.type === 'rectangle' || obj.type === 'frame') {
      updates.width = Math.max(20, (obj.width || 150) * scaleX);
      updates.height = Math.max(20, (obj.height || 100) * scaleY);
    }

    updateObject(obj.id, updates);
  };

  // Inline text editing
  const handleStartEditing = useCallback((obj: BoardObject) => {
    const stage = stageRef.current;
    if (!stage) return;

    const node = nodeRefs.current.get(obj.id);
    const container = stage.container().getBoundingClientRect();

    let screenX: number, screenY: number, width: number, height: number;
    let fontSize = 14;
    let textColor = '#333';
    let bgColor = 'transparent';

    if (node) {
      const absPos = node.getAbsolutePosition();
      screenX = absPos.x + container.left;
      screenY = absPos.y + container.top;
      const scaleX = node.getAbsoluteScale().x;
      const scaleY = node.getAbsoluteScale().y;

      if (obj.type === 'sticky') {
        width = (obj.width || 200) * scaleX;
        height = (obj.height || 200) * scaleY;
        // Offset for padding inside sticky
        screenX += 10 * scaleX;
        screenY += 10 * scaleY;
        width -= 20 * scaleX;
        height -= 20 * scaleY;
        bgColor = obj.color;
        fontSize = 14 * scaleX;
      } else {
        // Text object
        fontSize = ((obj as any).fontSize || 24) * scaleX;
        width = Math.max(200, fontSize * 10) * scaleX;
        height = fontSize * 2;
        textColor = obj.color;
      }
    } else {
      // Fallback if node not found
      screenX = obj.x * stageScale + stagePos.x + container.left;
      screenY = obj.y * stageScale + stagePos.y + container.top;
      width = (obj.width || 200) * stageScale;
      height = (obj.height || 100) * stageScale;
    }

    setEditingObject({
      id: obj.id,
      text: obj.text || obj.label || '',
      x: screenX,
      y: screenY,
      width,
      height,
      fontSize,
      color: textColor,
      backgroundColor: bgColor,
    });
  }, [stageScale, stagePos]);

  const handleFinishEditing = useCallback((newText: string) => {
    if (editingObject) {
      const obj = objects.find((o) => o.id === editingObject.id);
      if (obj) {
        const field = obj.type === 'frame' ? 'label' : 'text';
        updateObject(editingObject.id, { [field]: newText, updatedAt: Date.now() });
      }
    }
    setEditingObject(null);
  }, [editingObject, objects, boardId]);

  // Export handlers
  const handleExportPNG = useCallback(() => {
    if (!stageRef.current) return;
    setSelectedId(null);
    setTimeout(() => {
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `whiteboard-${Date.now()}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 100);
  }, []);

  const handleExportPDF = useCallback(() => {
    if (!stageRef.current) return;
    setSelectedId(null);
    setTimeout(async () => {
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [window.innerWidth, window.innerHeight],
      });
      pdf.addImage(dataURL, 'PNG', 0, 0, window.innerWidth, window.innerHeight);
      pdf.save(`whiteboard-${Date.now()}.pdf`);
    }, 100);
  }, []);

  // Keyboard shortcuts: Delete, Copy, Paste, Undo, Redo
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Delete/Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteObject(selectedId);
        return;
      }

      // Ctrl+C - Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId) {
        e.preventDefault();
        const obj = objects.find((o) => o.id === selectedId);
        if (obj) clipboardRef.current = { ...obj };
        return;
      }

      // Ctrl+V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current) {
        e.preventDefault();
        const source = clipboardRef.current;
        const newId = generateId();
        const objectRef = doc(db, 'boards', boardId, 'objects', newId);
        const { id, ...rest } = source;
        const newObject = {
          ...rest,
          x: source.x + 20,
          y: source.y + 20,
          createdBy: user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setDoc(objectRef, newObject);
        pushAction({
          type: 'create',
          objectId: newId,
          before: null,
          after: newObject,
          fullObject: { id: newId, ...newObject },
        });
        clipboardRef.current = { ...source, x: source.x + 20, y: source.y + 20 };
        setSelectedId(newId);
        return;
      }

      // Ctrl+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const action = undo();
        if (!action) return;
        const objectRef = doc(db, 'boards', boardId, 'objects', action.objectId);
        if (action.type === 'create') {
          deleteDoc(objectRef);
          if (selectedId === action.objectId) setSelectedId(null);
        } else if (action.type === 'update' && action.before) {
          updateDoc(objectRef, { ...action.before, updatedAt: Date.now() });
        } else if (action.type === 'delete' && action.fullObject) {
          const { id, ...data } = action.fullObject;
          setDoc(objectRef, data);
        }
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z - Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        const action = redo();
        if (!action) return;
        const objectRef = doc(db, 'boards', boardId, 'objects', action.objectId);
        if (action.type === 'create' && action.fullObject) {
          const { id, ...data } = action.fullObject;
          setDoc(objectRef, data);
        } else if (action.type === 'update' && action.after) {
          updateDoc(objectRef, { ...action.after, updatedAt: Date.now() });
        } else if (action.type === 'delete') {
          deleteDoc(objectRef);
          if (selectedId === action.objectId) setSelectedId(null);
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, boardId, objects, undo, redo, pushAction, user.uid]);

  return (
    <div style={styles.container}>
      <Toolbar
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
      />
      
      <PresenceIndicator onlineUsers={onlineUsers} />

      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        draggable={selectedTool === 'select'}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onContextMenu={handleContextMenu}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
      >
        <Layer>
          {/* Render objects sorted by type: frames first (behind), then connectors, then shapes/stickies */}
          {[...objects]
            .sort((a, b) => {
              const order: Record<string, number> = { frame: 0, connector: 1, rectangle: 2, circle: 2, sticky: 3, text: 3 };
              return (order[a.type] ?? 2) - (order[b.type] ?? 2);
            })
            .map((obj) => {
              if (obj.type === 'frame') {
                return (
                  <Frame
                    key={obj.id}
                    frame={obj}
                    onUpdate={updateObject}
                    isSelected={obj.id === selectedId}
                    onSelect={() => setSelectedId(obj.id)}
                    nodeRef={(node) => { if (node) nodeRefs.current.set(obj.id, node); }}
                    onTransformEnd={() => handleTransformEnd(obj)}
                  />
                );
              } else if (obj.type === 'connector') {
                return (
                  <Connector
                    key={obj.id}
                    connector={obj}
                    objects={objects}
                  />
                );
              } else if (obj.type === 'sticky') {
                return (
                  <StickyNote
                    key={obj.id}
                    sticky={obj as any}
                    onUpdate={updateObject}
                    isSelected={obj.id === selectedId}
                    onSelect={() => setSelectedId(obj.id)}
                    nodeRef={(node) => { if (node) nodeRefs.current.set(obj.id, node); }}
                    onTransformEnd={() => handleTransformEnd(obj)}
                    onStartEditing={handleStartEditing}
                  />
                );
              } else if (obj.type === 'text') {
                return (
                  <TextObject
                    key={obj.id}
                    textObj={obj}
                    onUpdate={updateObject}
                    isSelected={obj.id === selectedId}
                    onSelect={() => setSelectedId(obj.id)}
                    nodeRef={(node) => { if (node) nodeRefs.current.set(obj.id, node); }}
                    onTransformEnd={() => handleTransformEnd(obj)}
                    onStartEditing={handleStartEditing}
                  />
                );
              } else {
                return (
                  <Shape
                    key={obj.id}
                    shape={obj as any}
                    onUpdate={updateObject}
                    isSelected={obj.id === selectedId}
                    onSelect={() => setSelectedId(obj.id)}
                    nodeRef={(node) => { if (node) nodeRefs.current.set(obj.id, node); }}
                    onTransformEnd={() => handleTransformEnd(obj)}
                  />
                );
              }
            })}

          {/* Resize/transform handles for selected object */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            borderStroke="#2196f3"
            anchorStroke="#2196f3"
            anchorFill="white"
            anchorSize={8}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit minimum size
              if (newBox.width < 20 || newBox.height < 20) return oldBox;
              return newBox;
            }}
          />

          {/* Render cursors */}
          {cursors.map((cursor) => (
            <Cursor key={cursor.userId} cursor={cursor} />
          ))}
        </Layer>
      </Stage>

      {editingObject && (
        <InlineTextEditor
          x={editingObject.x}
          y={editingObject.y}
          width={editingObject.width}
          height={editingObject.height}
          initialText={editingObject.text}
          fontSize={editingObject.fontSize}
          color={editingObject.color}
          backgroundColor={editingObject.backgroundColor}
          onSave={handleFinishEditing}
          onCancel={() => setEditingObject(null)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={() => {
            const obj = objects.find((o) => o.id === contextMenu.objectId);
            if (obj && (obj.type === 'sticky' || obj.type === 'text' || obj.type === 'frame')) {
              handleStartEditing(obj);
            }
            setContextMenu(null);
          }}
          onDuplicate={() => {
            const obj = objects.find((o) => o.id === contextMenu.objectId);
            if (obj) {
              const newId = generateId();
              const objectRef = doc(db, 'boards', boardId, 'objects', newId);
              const { id, ...rest } = obj;
              const newObject = {
                ...rest,
                x: obj.x + 20,
                y: obj.y + 20,
                createdBy: user.uid,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              setDoc(objectRef, newObject);
              pushAction({
                type: 'create',
                objectId: newId,
                before: null,
                after: newObject,
                fullObject: { id: newId, ...newObject },
              });
              setSelectedId(newId);
            }
            setContextMenu(null);
          }}
          onDelete={() => {
            deleteObject(contextMenu.objectId);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      <AICommandInput boardId={boardId} user={user} objects={objects} />

      <div style={styles.instructions}>
        <p><strong>Controls:</strong></p>
        <p>• Click tools to select</p>
        <p>• Click canvas to create</p>
        <p>• Drag to move (Select tool)</p>
        <p>• Scroll to zoom</p>
        <p>• Double-click to edit text</p>
        <p>• Right-click for menu</p>
        <p>• Ctrl+C/V copy/paste</p>
        <p>• Ctrl+Z/Y undo/redo</p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#f5f5f5',
  },
  instructions: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    background: 'white',
    padding: '10px 15px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    fontSize: '12px',
    lineHeight: '1.4',
  },
};
