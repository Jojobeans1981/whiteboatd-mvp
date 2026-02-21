import React from 'react';
import { Text, Group } from 'react-konva';
import { BoardObject } from '../types';

interface TextObjectProps {
  textObj: BoardObject;
  onUpdate: (id: string, updates: Partial<BoardObject>) => void;
  isSelected: boolean;
  onSelect: () => void;
  onStartEditing?: (obj: BoardObject) => void;
  nodeRef?: (node: any) => void;
  onTransformEnd?: () => void;
}

export const TextObject: React.FC<TextObjectProps> = ({
  textObj,
  onUpdate,
  isSelected,
  onSelect,
  onStartEditing,
  nodeRef,
  onTransformEnd,
}) => {
  const handleDoubleClick = () => {
    if (onStartEditing) {
      onStartEditing(textObj);
    } else {
      const newText = prompt('Edit text:', textObj.text || '');
      if (newText !== null && newText !== textObj.text) {
        onUpdate(textObj.id, { text: newText, updatedAt: Date.now() });
      }
    }
  };

  const fontSize = (textObj as any).fontSize || 24;

  return (
    <Group
      ref={nodeRef}
      x={textObj.x}
      y={textObj.y}
      draggable
      onDragEnd={(e) => {
        onUpdate(textObj.id, {
          x: e.target.x(),
          y: e.target.y(),
          updatedAt: Date.now(),
        });
      }}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      onTransformEnd={onTransformEnd}
    >
      <Text
        text={textObj.text || 'Double-click to edit'}
        fontSize={fontSize}
        fill={textObj.color}
        fontStyle={isSelected ? 'bold' : 'normal'}
        textDecoration={isSelected ? 'underline' : ''}
      />
    </Group>
  );
};
