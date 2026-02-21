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
import { UserBadge } from './Auth';
import { BoardObject, User } from '../types';
import { generateId, getUserColor, getUserDisplayName } from '../lib/utils';
import { autoGridLayout, groupByColorLayout } from '../lib/layoutUtils';
import { useTheme } from '../contexts/ThemeContext';

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
  onBackToLanding?: () => void;
}

export const Board: React.FC<BoardProps> = ({ boardId, user, onBackToLanding }) => {
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedColor, setSelectedColor] = useState('#FFE066');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [connectorFrom, setConnectorFrom] = useState<string | null>(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  
  const [editingObject, setEditingObject] = useState<EditingState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string } | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const { theme, isDark, toggleTheme } = useTheme();

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const nodeRefs = useRef<Map<string, any>>(new Map());
  const clipboardRef = useRef<BoardObject[] | BoardObject | null>(null);
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
      setSelectedIds([]);
      setConnectorFrom(null);

      // Create object if a tool is selected (not connector — connector needs object clicks)
      if (selectedTool !== 'select' && selectedTool !== 'connector') {
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
      setSelectedIds([found[0]]);
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, objectId: found[0] });
      return;
    }

    setSelectedIds([clickedId]);
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
    } else if (type === 'frame') {
      objectData = {
        ...objectData,
        type: 'frame',
        label: 'Frame',
        width: 400,
        height: 300,
        fontSize: 16,
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

  const updateObject = useCallback(async (id: string, updates: Partial<BoardObject>) => {
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
  }, [objects, boardId, pushAction]);

  const deleteObject = useCallback(async (id: string) => {
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
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
  }, [objects, boardId, pushAction]);

  // Attach Transformer to selected nodes (multi-select)
  useEffect(() => {
    if (selectedIds.length > 0 && transformerRef.current) {
      const nodes = selectedIds
        .map((id) => nodeRefs.current.get(id))
        .filter(Boolean);
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedIds, objects]);

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
      rotation: node.rotation(),
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
        fontSize = (obj.fontSize || 14) * scaleX;
      } else {
        // Text object
        fontSize = (obj.fontSize || 24) * scaleX;
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
  }, [editingObject, objects, updateObject]);

  // Export handlers
  const handleExportPNG = useCallback(() => {
    if (!stageRef.current) return;
    setSelectedIds([]);
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
    setSelectedIds([]);
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

  // Share board link
  const handleShareLink = useCallback(() => {
    const url = window.location.origin + '?board=' + boardId;
    navigator.clipboard.writeText(url).then(() => {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    });
  }, [boardId]);

  // Update selected object from toolbar
  const handleUpdateSelectedObject = useCallback((updates: Partial<BoardObject>) => {
    if (selectedIds.length > 0) {
      selectedIds.forEach((id) => updateObject(id, updates));
    }
  }, [selectedIds, updateObject]);

  // Organize: auto-grid layout
  const handleAutoGrid = useCallback(async () => {
    const moves = autoGridLayout(objects);
    await Promise.all(
      moves.map((m) => updateObject(m.id, { x: m.x, y: m.y, updatedAt: Date.now() }))
    );
  }, [objects, updateObject]);

  // Organize: group by color
  const handleGroupByColor = useCallback(async () => {
    const moves = groupByColorLayout(objects);
    await Promise.all(
      moves.map((m) => updateObject(m.id, { x: m.x, y: m.y, updatedAt: Date.now() }))
    );
  }, [objects, updateObject]);

  // Create connector between two objects
  const createConnector = useCallback(async (fromId: string, toId: string) => {
    const objectId = generateId();
    const objectRef = doc(db, 'boards', boardId, 'objects', objectId);
    const objectData = {
      type: 'connector' as const,
      fromId,
      toId,
      color: selectedColor,
      createdBy: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(objectRef, objectData);
    pushAction({
      type: 'create',
      objectId,
      before: null,
      after: objectData,
      fullObject: { id: objectId, ...objectData },
    });
  }, [boardId, selectedColor, user.uid, pushAction]);

  // Handle object click — supports shift-click multi-select and connector tool
  const handleObjectSelect = useCallback((objId: string, e: any) => {
    // Connector tool: two-click flow
    if (selectedTool === 'connector') {
      if (!connectorFrom) {
        setConnectorFrom(objId);
      } else if (connectorFrom !== objId) {
        createConnector(connectorFrom, objId);
        setConnectorFrom(null);
      }
      return;
    }

    // Shift-click: toggle in/out of selection
    if (e.evt?.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(objId)
          ? prev.filter((id) => id !== objId)
          : [...prev, objId]
      );
    } else {
      setSelectedIds([objId]);
    }
  }, [selectedTool, connectorFrom, createConnector]);

  // Keyboard shortcuts: Delete, Copy, Paste, Undo, Redo
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Escape - cancel connector or deselect
      if (e.key === 'Escape') {
        if (connectorFrom) {
          setConnectorFrom(null);
        } else {
          setSelectedIds([]);
        }
        return;
      }

      // Delete/Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        const toDelete = [...selectedIds];
        setSelectedIds([]);
        toDelete.forEach((id) => deleteObject(id));
        return;
      }

      // Ctrl+C - Copy (all selected)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedIds.length > 0) {
        e.preventDefault();
        const selected = objects.filter((o) => selectedIds.includes(o.id));
        if (selected.length > 0) clipboardRef.current = selected.map((o) => ({ ...o }));
        return;
      }

      // Ctrl+V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current) {
        e.preventDefault();
        const sources: BoardObject[] = Array.isArray(clipboardRef.current) ? clipboardRef.current : [clipboardRef.current];
        const newIds: string[] = [];
        for (const source of sources) {
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
          newIds.push(newId);
        }
        // Offset clipboard for next paste
        clipboardRef.current = sources.map((s) => ({ ...s, x: s.x + 20, y: s.y + 20 }));
        setSelectedIds(newIds);
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
          setSelectedIds((prev) => prev.filter((id) => id !== action.objectId));
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
          setSelectedIds((prev) => prev.filter((id) => id !== action.objectId));
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, connectorFrom, boardId, objects, undo, redo, pushAction, user.uid, deleteObject]);

  return (
    <div style={{ ...styles.container, background: theme.canvasBg }}>
      <Toolbar
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
        selectedObject={selectedIds.length > 0 ? objects.find((o) => o.id === selectedIds[0]) || null : null}
        onUpdateObject={handleUpdateSelectedObject}
        onAutoGrid={handleAutoGrid}
        onGroupByColor={handleGroupByColor}
      />

      {/* Consolidated top-right bar */}
      <div style={styles.topBar}>
        {onBackToLanding && (
          <button
            style={{
              ...styles.topBtn,
              background: theme.surface,
              color: theme.textSecondary,
              boxShadow: theme.shadow,
              ...(hoveredBtn === 'back' ? { background: theme.surfaceHover } : {}),
            }}
            onClick={onBackToLanding}
            onMouseEnter={() => setHoveredBtn('back')}
            onMouseLeave={() => setHoveredBtn(null)}
            title="Back to boards"
          >
            ← Boards
          </button>
        )}
        <button
          style={{
            ...styles.shareBtn,
            background: theme.accent,
            ...(hoveredBtn === 'share' ? { background: theme.accentHover } : {}),
          }}
          onClick={handleShareLink}
          onMouseEnter={() => setHoveredBtn('share')}
          onMouseLeave={() => setHoveredBtn(null)}
          title="Copy share link"
        >
          Share
        </button>
        <button
          style={{
            ...styles.themeBtn,
            background: theme.surface,
            color: theme.textSecondary,
            boxShadow: theme.shadow,
            ...(hoveredBtn === 'theme' ? { background: theme.surfaceHover } : {}),
          }}
          onClick={toggleTheme}
          onMouseEnter={() => setHoveredBtn('theme')}
          onMouseLeave={() => setHoveredBtn(null)}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '\u2600' : '\u263D'}
        </button>
        <PresenceIndicator onlineUsers={onlineUsers} />
        <UserBadge user={user} />
      </div>

      {showCopiedToast && (
        <div style={{ ...styles.toast, background: theme.toastBg, color: theme.toastText }}>Link copied!</div>
      )}

      {connectorFrom && (
        <div style={{ ...styles.connectorHint, background: theme.accent, color: 'white' }}>
          Click target object to connect (Esc to cancel)
        </div>
      )}

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
                    isSelected={selectedIds.includes(obj.id)}
                    onSelect={(e: any) => handleObjectSelect(obj.id, e)}
                    isConnectorSource={connectorFrom === obj.id}
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
                    isSelected={selectedIds.includes(obj.id)}
                    onSelect={(e: any) => handleObjectSelect(obj.id, e)}
                    isConnectorSource={connectorFrom === obj.id}
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
                    isSelected={selectedIds.includes(obj.id)}
                    onSelect={(e: any) => handleObjectSelect(obj.id, e)}
                    isConnectorSource={connectorFrom === obj.id}
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
                    isSelected={selectedIds.includes(obj.id)}
                    onSelect={(e: any) => handleObjectSelect(obj.id, e)}
                    isConnectorSource={connectorFrom === obj.id}
                    nodeRef={(node) => { if (node) nodeRefs.current.set(obj.id, node); }}
                    onTransformEnd={() => handleTransformEnd(obj)}
                  />
                );
              }
            })}

          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            borderStroke="#667eea"
            anchorStroke="#667eea"
            anchorFill="white"
            anchorSize={8}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 20 || newBox.height < 20) return oldBox;
              return newBox;
            }}
          />

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
              setSelectedIds([newId]);
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

      {/* Collapsible help */}
      <button
        style={{
          ...styles.helpButton,
          background: theme.surface,
          color: theme.accent,
          boxShadow: theme.shadow,
          ...(hoveredBtn === 'help' ? { background: theme.surfaceHover } : {}),
        }}
        onClick={() => setShowHelp(!showHelp)}
        onMouseEnter={() => setHoveredBtn('help')}
        onMouseLeave={() => setHoveredBtn(null)}
        title="Keyboard shortcuts & help"
      >
        ?
      </button>
      {showHelp && (
        <div style={{ ...styles.helpPanel, background: theme.surface, boxShadow: theme.shadowHeavy }}>
          <div style={{ ...styles.helpHeader, borderBottomColor: theme.border }}>
            <strong style={{ color: theme.text }}>Controls</strong>
            <button style={{ ...styles.helpClose, color: theme.textMuted }} onClick={() => setShowHelp(false)}>×</button>
          </div>
          <div style={{ ...styles.helpContent, color: theme.textSecondary }}>
            <p style={styles.helpRow}>Click tools to select, click canvas to create</p>
            <p style={styles.helpRow}>Drag to move objects (Select tool)</p>
            <p style={styles.helpRow}>Scroll to zoom in/out</p>
            <p style={styles.helpRow}>Double-click to edit text</p>
            <p style={styles.helpRow}>Right-click for context menu</p>
            <div style={{ ...styles.helpDivider, background: theme.border }} />
            <p style={styles.helpRow}><span style={{ ...styles.kbd, background: theme.kbd, borderColor: theme.kbdBorder, color: theme.text }}>Ctrl</span>+<span style={{ ...styles.kbd, background: theme.kbd, borderColor: theme.kbdBorder, color: theme.text }}>C</span> / <span style={{ ...styles.kbd, background: theme.kbd, borderColor: theme.kbdBorder, color: theme.text }}>V</span> Copy / Paste</p>
            <p style={styles.helpRow}><span style={{ ...styles.kbd, background: theme.kbd, borderColor: theme.kbdBorder, color: theme.text }}>Ctrl</span>+<span style={{ ...styles.kbd, background: theme.kbd, borderColor: theme.kbdBorder, color: theme.text }}>Z</span> Undo</p>
            <p style={styles.helpRow}><span style={{ ...styles.kbd, background: theme.kbd, borderColor: theme.kbdBorder, color: theme.text }}>Ctrl</span>+<span style={{ ...styles.kbd, background: theme.kbd, borderColor: theme.kbdBorder, color: theme.text }}>Y</span> Redo</p>
            <p style={styles.helpRow}><span style={{ ...styles.kbd, background: theme.kbd, borderColor: theme.kbdBorder, color: theme.text }}>Del</span> Delete selected</p>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#f9fafb',
  },
  topBar: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 1000,
  },
  topBtn: {
    padding: '7px 14px',
    border: 'none',
    borderRadius: '8px',
    background: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    color: '#4b5563',
    transition: 'background 0.15s',
  },
  topBtnHover: {
    background: '#f3f4f6',
  },
  shareBtn: {
    padding: '7px 14px',
    border: 'none',
    borderRadius: '8px',
    background: '#667eea',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'background 0.15s',
  },
  themeBtn: {
    padding: '7px 10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background 0.15s',
  },
  toast: {
    position: 'absolute',
    top: '52px',
    right: '12px',
    background: '#1f2937',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    zIndex: 1100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  connectorHint: {
    position: 'absolute',
    top: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '6px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    zIndex: 1000,
    pointerEvents: 'none' as const,
  },
  helpButton: {
    position: 'absolute',
    bottom: '80px',
    left: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'white',
    border: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 700,
    color: '#667eea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
    zIndex: 1000,
  },
  helpPanel: {
    position: 'absolute',
    bottom: '124px',
    left: '16px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    padding: '16px',
    maxWidth: '260px',
    zIndex: 1000,
  },
  helpHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  helpClose: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: '0 4px',
    lineHeight: 1,
  },
  helpContent: {
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#4b5563',
  },
  helpRow: {
    margin: '4px 0',
  },
  helpDivider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '8px 0',
  },
  kbd: {
    background: '#f3f4f6',
    padding: '1px 5px',
    borderRadius: '3px',
    fontSize: '11px',
    border: '1px solid #d1d5db',
    fontFamily: 'monospace',
    fontWeight: 600,
  },
};
