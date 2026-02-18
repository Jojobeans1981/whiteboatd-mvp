// src/components/Board.tsx

import React, { useState, useRef, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useBoardObjects } from '../hooks/useBoardObjects';
import { useCursors } from '../hooks/useCursors';
import { usePresence } from '../hooks/usePresence';
import { StickyNote } from './StickyNote';
import { Shape } from './Shape';
import { Cursor } from './Cursor';
import { Toolbar, Tool } from './Toolbar';
import { PresenceIndicator } from './PresenceIndicator';
import { BoardObject, User } from '../types';
import { generateId, getUserColor, getUserDisplayName } from '../lib/utils';

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
  
  const stageRef = useRef<any>(null);
  const { objects } = useBoardObjects(boardId);
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
    }

    await setDoc(objectRef, objectData);
  };

  const updateObject = async (id: string, updates: Partial<BoardObject>) => {
    const objectRef = doc(db, 'boards', boardId, 'objects', id);
    await updateDoc(objectRef, updates);
  };

  return (
    <div style={styles.container}>
      <Toolbar
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
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
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
      >
        <Layer>
          {/* Render objects */}
          {objects.map((obj) => {
            if (obj.type === 'sticky') {
              return (
                <StickyNote
                  key={obj.id}
                  sticky={obj as any}
                  onUpdate={updateObject}
                  isSelected={obj.id === selectedId}
                  onSelect={() => setSelectedId(obj.id)}
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
                />
              );
            }
          })}

          {/* Render cursors */}
          {cursors.map((cursor) => (
            <Cursor key={cursor.userId} cursor={cursor} />
          ))}
        </Layer>
      </Stage>

      <div style={styles.instructions}>
        <p><strong>Controls:</strong></p>
        <p>• Click tools to select</p>
        <p>• Click canvas to create</p>
        <p>• Drag to move (Select tool)</p>
        <p>• Scroll to zoom</p>
        <p>• Double-click sticky to edit</p>
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
