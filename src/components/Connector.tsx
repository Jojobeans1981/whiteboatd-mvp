import React from 'react';
import { Arrow } from 'react-konva';
import { BoardObject } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface ConnectorProps {
  connector: BoardObject;
  objects: BoardObject[];
}

function getObjectCenter(obj: BoardObject): { x: number; y: number } | null {
  if (obj.type === 'circle') {
    return { x: obj.x, y: obj.y };
  }
  // For rectangles, stickies, frames — center is offset by half width/height
  const w = obj.width || 150;
  const h = obj.height || 100;
  return { x: obj.x + w / 2, y: obj.y + h / 2 };
}

export const Connector: React.FC<ConnectorProps> = ({ connector, objects }) => {
  const { theme } = useTheme();
  if (!connector.fromId || !connector.toId) return null;

  const fromObj = objects.find((o) => o.id === connector.fromId);
  const toObj = objects.find((o) => o.id === connector.toId);

  if (!fromObj || !toObj) return null;

  const fromCenter = getObjectCenter(fromObj);
  const toCenter = getObjectCenter(toObj);

  if (!fromCenter || !toCenter) return null;

  return (
    <Arrow
      points={[fromCenter.x, fromCenter.y, toCenter.x, toCenter.y]}
      stroke={connector.color || theme.text}
      strokeWidth={2}
      fill={connector.color || theme.text}
      pointerLength={10}
      pointerWidth={8}
    />
  );
};
