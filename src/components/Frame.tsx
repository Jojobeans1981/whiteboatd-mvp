import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { BoardObject } from '../types';

interface FrameProps {
  frame: BoardObject;
  onUpdate: (id: string, updates: Partial<BoardObject>) => void;
  isSelected: boolean;
  onSelect: (e: any) => void;
  isConnectorSource?: boolean;
  nodeRef?: (node: any) => void;
  onTransformEnd?: () => void;
}

export const Frame: React.FC<FrameProps> = ({ frame, onUpdate, isSelected, onSelect, isConnectorSource, nodeRef, onTransformEnd }) => {
  // Parse a semi-transparent version of the color for the fill
  const fillColor = frame.color + '15';

  return (
    <Group
      ref={nodeRef}
      x={frame.x}
      y={frame.y}
      rotation={frame.rotation || 0}
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
      {/* Frame label inside the rectangle */}
      <Text
        text={frame.label || 'Frame'}
        x={8}
        y={8}
        fontSize={frame.fontSize || 16}
        fontStyle="bold"
        fill={frame.color}
      />

      {/* Frame rectangle */}
      <Rect
        width={frame.width || 400}
        height={frame.height || 350}
        fill={fillColor}
        stroke={isConnectorSource ? '#ff9800' : frame.color}
        strokeWidth={isConnectorSource ? 3 : isSelected ? 3 : 2}
        dash={[10, 5]}
        cornerRadius={8}
      />
    </Group>
  );
};
