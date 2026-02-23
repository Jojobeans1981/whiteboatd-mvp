import React from 'react';
import { Group, Line } from 'react-konva';
import { BoardObject } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface FreehandPathProps {
  shape: BoardObject;
  onUpdate: (id: string, updates: Partial<BoardObject>) => void;
  isSelected: boolean;
  onSelect: (e: any) => void;
  isConnectorMode?: boolean;
  nodeRef?: (node: any) => void;
}

export const FreehandPath: React.FC<FreehandPathProps> = ({
  shape,
  onUpdate,
  isSelected,
  onSelect,
  isConnectorMode,
  nodeRef,
}) => {
  const { theme } = useTheme();

  return (
    <Group
      ref={nodeRef}
      x={shape.x}
      y={shape.y}
      draggable={!isConnectorMode}
      onDragEnd={(e) => {
        onUpdate(shape.id, {
          x: e.target.x(),
          y: e.target.y(),
          updatedAt: Date.now(),
        });
      }}
      onClick={onSelect}
      onTap={onSelect}
    >
      <Line
        points={shape.points || []}
        stroke={isSelected ? theme.accent : shape.color}
        strokeWidth={shape.strokeWidth || 3}
        tension={0.4}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={12}
      />
    </Group>
  );
};
