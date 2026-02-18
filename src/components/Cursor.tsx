import React from 'react';
import { Group, Path, Rect, Text } from 'react-konva';
import { CursorPosition } from '../types';

interface CursorProps {
  cursor: CursorPosition;
}

export const Cursor: React.FC<CursorProps> = ({ cursor }) => {
  const labelWidth = cursor.userName.length * 7 + 12;
  
  return (
    <Group x={cursor.x} y={cursor.y}>
      <Path
        data="M 0 0 L 0 20 L 5 15 L 9 22 L 12 20 L 8 13 L 15 13 Z"
        fill={cursor.color}
        stroke="white"
        strokeWidth={1}
      />
      <Group x={20} y={0}>
        <Rect
          width={labelWidth}
          height={20}
          fill={cursor.color}
          cornerRadius={3}
        />
        <Text
          text={cursor.userName}
          x={6}
          y={4}
          fontSize={11}
          fill="white"
          fontStyle="bold"
        />
      </Group>
    </Group>
  );
};
