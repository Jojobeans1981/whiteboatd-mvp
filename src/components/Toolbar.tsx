// src/components/Toolbar.tsx

import React from 'react';

export type Tool = 'select' | 'sticky' | 'rectangle' | 'circle';

interface ToolbarProps {
  selectedTool: Tool;
  onToolChange: (tool: Tool) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const colors = ['#FFE066', '#FF6B6B', '#4ECDC4', '#45B7D1', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'];

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  onToolChange,
  selectedColor,
  onColorChange,
}) => {
  return (
    <div style={styles.toolbar}>
      <div style={styles.section}>
        <button
          style={{ ...styles.toolButton, ...(selectedTool === 'select' ? styles.activeButton : {}) }}
          onClick={() => onToolChange('select')}
          title="Select (V)"
        >
          ↖️
        </button>
        <button
          style={{ ...styles.toolButton, ...(selectedTool === 'sticky' ? styles.activeButton : {}) }}
          onClick={() => onToolChange('sticky')}
          title="Sticky Note (S)"
        >
          📝
        </button>
        <button
          style={{ ...styles.toolButton, ...(selectedTool === 'rectangle' ? styles.activeButton : {}) }}
          onClick={() => onToolChange('rectangle')}
          title="Rectangle (R)"
        >
          ▭
        </button>
        <button
          style={{ ...styles.toolButton, ...(selectedTool === 'circle' ? styles.activeButton : {}) }}
          onClick={() => onToolChange('circle')}
          title="Circle (C)"
        >
          ○
        </button>
      </div>
      
      <div style={styles.divider} />
      
      <div style={styles.section}>
        {colors.map((color) => (
          <button
            key={color}
            style={{
              ...styles.colorButton,
              backgroundColor: color,
              ...(selectedColor === color ? styles.activeColorButton : {}),
            }}
            onClick={() => onColorChange(color)}
            title={color}
          />
        ))}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  toolbar: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'white',
    padding: '10px 15px',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
  },
  section: {
    display: 'flex',
    gap: '5px',
  },
  divider: {
    width: '1px',
    height: '30px',
    background: '#e0e0e0',
  },
  toolButton: {
    width: '40px',
    height: '40px',
    border: '2px solid transparent',
    borderRadius: '5px',
    background: '#f5f5f5',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    background: '#e3f2fd',
    borderColor: '#2196f3',
  },
  colorButton: {
    width: '30px',
    height: '30px',
    border: '2px solid transparent',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeColorButton: {
    borderColor: '#333',
    transform: 'scale(1.1)',
  },
};
