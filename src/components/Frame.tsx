import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { BoardObject } from '../types';

interface FrameProps {
  frame: BoardObject;
  onUpdate: (id: string, updates: Partial<BoardObject>) => void;
  isSelected: boolean;
  onSelect: () => void;
  nodeRef?: (node: any) => void;
  onTransformEnd?: () => void;
}

export const Frame: React.FC<FrameProps> = ({ frame, onUpdate, isSelected, onSelect, nodeRef, onTransformEnd }) => {
  // Parse a semi-transparent version of the color for the fill
  const fillColor = frame.color + '15';

  return (
    <Group
      ref={nodeRef}
      x={frame.x}
      y={frame.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onTransformEnd={onTransformEnd}
      onDragEnd={(e) => {
        onUpdate(frame.id, {
          x: e.target.x(),
          y: e.target.y(),
          updatedAt: Date.now(),
        });
      }}
    >
      {/* Frame label above the rectangle */}
      <Text
        text={frame.label || 'Frame'}
        x={4}
        y={-24}
        fontSize={16}
        fontStyle="bold"
        fill={frame.color}
      />

      {/* Frame rectangle */}
      <Rect
        width={frame.width || 400}
        height={frame.height || 350}
        fill={fillColor}
        stroke={frame.color}
        strokeWidth={isSelected ? 3 : 2}
        dash={[10, 5]}
        cornerRadius={8}
      />
    </Group>
  );
};
