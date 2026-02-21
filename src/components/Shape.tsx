// src/components/Shape.tsx

import React from 'react';
import { Rect, Circle, Group } from 'react-konva';
import { Shape as ShapeType } from '../types';

interface ShapeProps {
  shape: ShapeType;
  onUpdate: (id: string, updates: Partial<ShapeType>) => void;
  isSelected: boolean;
  onSelect: (e: any) => void;
  isConnectorSource?: boolean;
  nodeRef?: (node: any) => void;
  onTransformEnd?: () => void;
}

export const Shape: React.FC<ShapeProps> = ({
  shape,
  onUpdate,
  isSelected,
  onSelect,
  isConnectorSource,
  nodeRef,
  onTransformEnd,
}) => {
  return (
    <Group
      ref={nodeRef}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation || 0}
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
      onTransformEnd={onTransformEnd}
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
          stroke={isConnectorSource ? '#ff9800' : isSelected ? '#2196f3' : undefined}
          strokeWidth={isConnectorSource || isSelected ? 3 : 0}
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
          stroke={isConnectorSource ? '#ff9800' : isSelected ? '#2196f3' : undefined}
          strokeWidth={isConnectorSource || isSelected ? 3 : 0}
        />
      )}
    </Group>
  );
};
