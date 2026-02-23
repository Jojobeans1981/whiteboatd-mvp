import React from 'react';
import { Arrow } from 'react-konva';
import { BoardObject } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface ConnectorProps {
  connector: BoardObject;
  objects: BoardObject[];
}

function getObjectCenter(obj: BoardObject): { x: number; y: number } | null {
  // RegularPolygon-based shapes (circle, triangle, hexagon, star) are centered at (x, y)
  if (obj.type === 'circle' || obj.type === 'triangle' || obj.type === 'hexagon' || obj.type === 'star') {
    return { x: obj.x, y: obj.y };
  }
  // Diamond: top-left based like rectangle
  if (obj.type === 'diamond') {
    const w = obj.width || 100;
    const h = obj.height || 140;
    return { x: obj.x + w / 2, y: obj.y + h / 2 };
  }
  // Line: midpoint of endpoints
  if (obj.type === 'line' && obj.points && obj.points.length >= 4) {
    return {
      x: obj.x + (obj.points[0] + obj.points[2]) / 2,
      y: obj.y + (obj.points[1] + obj.points[3]) / 2,
    };
  }
  // Pen: bounding box center
  if (obj.type === 'pen' && obj.points && obj.points.length >= 2) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < obj.points.length; i += 2) {
      minX = Math.min(minX, obj.points[i]);
      maxX = Math.max(maxX, obj.points[i]);
      minY = Math.min(minY, obj.points[i + 1]);
      maxY = Math.max(maxY, obj.points[i + 1]);
    }
    return { x: obj.x + (minX + maxX) / 2, y: obj.y + (minY + maxY) / 2 };
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
