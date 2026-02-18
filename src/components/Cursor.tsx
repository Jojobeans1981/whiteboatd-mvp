// src/components/Cursor.tsx

import React from 'react';
import { Group, Circle, Text, Path } from 'react-konva';
import { CursorPosition } from '../types';

interface CursorProps {
  cursor: CursorPosition;
}

export const Cursor: React.FC<CursorProps> = ({ cursor }) => {
  return (
    <Group x={cursor.x} y={cursor.y}>
      {/* Cursor pointer */}
      <Path
        data="M 0 0 L 0 20 L 5 15 L 9 22 L 12 20 L 8 13 L 15 13 Z"
        fill={cursor.color}
        stroke="white"
        strokeWidth={1}
      />
      
      {/* Name label */}
      <Group x={20} y={5}>
        <Text
          text={cursor.userName}
          fontSize={12}
          fill="white"
          padding={4}
          background={cursor.color}
        />
        <Circle
          x={-5}
          y={6}
          radius={15}
          fill={cursor.color}
          opacity={0.8}
        />
        <Text
          text={cursor.userName}
          x={-5}
          y={2}
          fontSize={11}
          fill="white"
          align="center"
          width={cursor.userName.length * 8}
        />
      </Group>
    </Group>
  );
};
