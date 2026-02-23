import React from 'react';
import { Group, RegularPolygon, Star, Line } from 'react-konva';
import { BoardObject } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface PolygonShapeProps {
  shape: BoardObject;
  onUpdate: (id: string, updates: Partial<BoardObject>) => void;
  isSelected: boolean;
  onSelect: (e: any) => void;
  isConnectorSource?: boolean;
  isConnectorMode?: boolean;
  nodeRef?: (node: any) => void;
  onTransformEnd?: () => void;
}

function computeDiamondPoints(w: number, h: number): number[] {
  return [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2];
}

export const PolygonShape: React.FC<PolygonShapeProps> = ({
  shape,
  onUpdate,
  isSelected,
  onSelect,
  isConnectorSource,
  isConnectorMode,
  nodeRef,
  onTransformEnd,
}) => {
  const { theme } = useTheme();

  const stroke = isConnectorSource ? '#ff9800' : isSelected ? theme.accent : undefined;
  const strokeWidth = isConnectorSource || isSelected ? 3 : 0;
  const shadowProps = {
    shadowColor: 'black',
    shadowBlur: isSelected ? 10 : 5,
    shadowOpacity: isSelected ? 0.3 : 0.2,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
  };

  const renderShape = () => {
    if (shape.type === 'triangle') {
      return (
        <RegularPolygon
          sides={3}
          radius={shape.radius || 60}
          fill={shape.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          {...shadowProps}
        />
      );
    }
    if (shape.type === 'hexagon') {
      return (
        <RegularPolygon
          sides={6}
          radius={shape.radius || 60}
          fill={shape.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          {...shadowProps}
        />
      );
    }
    if (shape.type === 'star') {
      return (
        <Star
          numPoints={5}
          innerRadius={(shape.radius || 60) * 0.4}
          outerRadius={shape.radius || 60}
          fill={shape.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          {...shadowProps}
        />
      );
    }
    if (shape.type === 'diamond') {
      const w = shape.width || 100;
      const h = shape.height || 140;
      return (
        <Line
          points={computeDiamondPoints(w, h)}
          closed
          fill={shape.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          {...shadowProps}
        />
      );
    }
    if (shape.type === 'line') {
      const pts = shape.points || [0, 0, 150, 0];
      return (
        <Line
          points={pts}
          stroke={isSelected ? theme.accent : shape.color}
          strokeWidth={3}
          lineCap="round"
          hitStrokeWidth={12}
        />
      );
    }
    return null;
  };

  return (
    <Group
      ref={nodeRef}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation || 0}
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
      onTransformEnd={onTransformEnd}
    >
      {renderShape()}
    </Group>
  );
};
