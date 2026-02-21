// src/components/StickyNote.tsx

import React from 'react';
import { Rect, Text, Group } from 'react-konva';
import { StickyNote as StickyNoteType } from '../types';

interface StickyNoteProps {
  sticky: StickyNoteType;
  onUpdate: (id: string, updates: Partial<StickyNoteType>) => void;
  isSelected: boolean;
  onSelect: (e: any) => void;
  isConnectorSource?: boolean;
  isConnectorMode?: boolean;
  nodeRef?: (node: any) => void;
  onTransformEnd?: () => void;
  onStartEditing?: (obj: StickyNoteType) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  sticky,
  onUpdate,
  isSelected,
  onSelect,
  isConnectorSource,
  isConnectorMode,
  nodeRef,
  onTransformEnd,
  onStartEditing,
}) => {
  const handleDoubleClick = () => {
    if (onStartEditing) {
      onStartEditing(sticky);
    } else {
      const newText = prompt('Edit text:', sticky.text);
      if (newText !== null && newText !== sticky.text) {
        onUpdate(sticky.id, { text: newText, updatedAt: Date.now() });
      }
    }
  };

  return (
    <Group
      ref={nodeRef}
      x={sticky.x}
      y={sticky.y}
      rotation={sticky.rotation || 0}
      draggable={!isConnectorMode}
      onDragEnd={(e) => {
        onUpdate(sticky.id, {
          x: e.target.x(),
          y: e.target.y(),
          updatedAt: Date.now(),
        });
      }}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      onTransformEnd={onTransformEnd}
    >
      <Rect
        width={sticky.width}
        height={sticky.height}
        fill={sticky.color}
        shadowColor="black"
        shadowBlur={isSelected ? 10 : 5}
        shadowOpacity={isSelected ? 0.3 : 0.2}
        shadowOffsetX={2}
        shadowOffsetY={2}
        cornerRadius={5}
        stroke={isConnectorSource ? '#ff9800' : isSelected ? '#2196f3' : undefined}
        strokeWidth={isConnectorSource || isSelected ? 3 : 0}
      />
      
      <Text
        text={sticky.text}
        width={sticky.width - 20}
        height={sticky.height - 20}
        x={10}
        y={10}
        fontSize={sticky.fontSize || 14}
        fill="#333"
        wrap="word"
        align="left"
        verticalAlign="top"
      />
    </Group>
  );
};
