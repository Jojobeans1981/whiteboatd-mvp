// src/components/Shape.tsx

import React from 'react';
import { Rect, Circle, Group } from 'react-konva';
import { Shape as ShapeType } from '../types';

interface ShapeProps {
  shape: ShapeType;
  onUpdate: (id: string, updates: Partial<ShapeType>) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const Shape: React.FC<ShapeProps> = ({
  shape,
  onUpdate,
  isSelected,
  onSelect,
}) => {
  return (
    <Group
      x={shape.x}
      y={shape.y}
      draggable
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
      {shape.type === 'rectangle' ? (
        <Rect
          width={shape.width || 100}
          height={shape.height || 100}
          fill={shape.color}
          shadowColor="black"
          shadowBlur={isSelected ? 10 : 5}
          shadowOpacity={isSelected ? 0.3 : 0.2}
          shadowOffsetX={2}
          shadowOffsetY={2}
          stroke={isSelected ? '#2196f3' : undefined}
          strokeWidth={isSelected ? 3 : 0}
        />
      ) : (
        <Circle
          radius={shape.radius || 50}
          fill={shape.color}
          shadowColor="black"
          shadowBlur={isSelected ? 10 : 5}
          shadowOpacity={isSelected ? 0.3 : 0.2}
          shadowOffsetX={2}
          shadowOffsetY={2}
          stroke={isSelected ? '#2196f3' : undefined}
          strokeWidth={isSelected ? 3 : 0}
        />
      )}
    </Group>
  );
};
