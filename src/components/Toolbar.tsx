// src/components/Toolbar.tsx

import React, { useState } from 'react';
import { BoardObject } from '../types';
import { useTheme } from '../contexts/ThemeContext';

export type Tool = 'select' | 'sticky' | 'rectangle' | 'circle' | 'text' | 'frame' | 'connector';

interface ToolbarProps {
  selectedTool: Tool;
  onToolChange: (tool: Tool) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  onExportPNG?: () => void;
  onExportPDF?: () => void;
  selectedObject?: BoardObject | null;
  onUpdateObject?: (updates: Partial<BoardObject>) => void;
  onAutoGrid?: () => void;
  onGroupByColor?: () => void;
}

const colors = ['#FFE066', '#FF6B6B', '#4ECDC4', '#45B7D1', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'];

const MIN_FONT = 8;
const MAX_FONT = 72;
const FONT_STEP = 2;

const tools: { id: Tool; icon: string; label: string; shortcut: string }[] = [
  { id: 'select', icon: '↖️', label: 'Select', shortcut: 'V' },
  { id: 'sticky', icon: '📝', label: 'Note', shortcut: 'S' },
  { id: 'rectangle', icon: '▭', label: 'Rect', shortcut: 'R' },
  { id: 'circle', icon: '○', label: 'Circle', shortcut: 'C' },
  { id: 'text', icon: 'T', label: 'Text', shortcut: 'T' },
  { id: 'frame', icon: '⬜', label: 'Frame', shortcut: 'F' },
  { id: 'connector', icon: '🔗', label: 'Connect', shortcut: 'L' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  onToolChange,
  selectedColor,
  onColorChange,
  onExportPNG,
  onExportPDF,
  selectedObject,
  onUpdateObject,
  onAutoGrid,
  onGroupByColor,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const { theme } = useTheme();

  const showFontSize = selectedObject && (selectedObject.type === 'sticky' || selectedObject.type === 'text' || selectedObject.type === 'frame');
  const currentFontSize = selectedObject?.fontSize || (selectedObject?.type === 'text' ? 24 : selectedObject?.type === 'frame' ? 16 : 14);

  const handleColorClick = (color: string) => {
    onColorChange(color);
    if (selectedObject && onUpdateObject) {
      onUpdateObject({ color, updatedAt: Date.now() });
    }
  };

  const handleFontSizeChange = (delta: number) => {
    if (!selectedObject || !onUpdateObject) return;
    const newSize = Math.max(MIN_FONT, Math.min(MAX_FONT, currentFontSize + delta));
    onUpdateObject({ fontSize: newSize, updatedAt: Date.now() });
  };

  const getToolBtnStyle = (tool: Tool): React.CSSProperties => ({
    ...styles.toolButton,
    background: theme.bg,
    ...(selectedTool === tool ? { background: theme.surfaceActive, borderColor: theme.accent } : {}),
    ...(hovered === tool && selectedTool !== tool ? { background: theme.surfaceHover } : {}),
    ...(hovered === tool && selectedTool === tool ? { background: theme.surfaceActive } : {}),
  });

  const getSmallBtnStyle = (id: string): React.CSSProperties => ({
    ...styles.smallButton,
    background: theme.bg,
    color: theme.textSecondary,
    ...(hovered === id ? { background: theme.surfaceHover } : {}),
  });

  return (
    <div style={{ ...styles.toolbar, background: theme.surface, boxShadow: theme.shadowHeavy }}>
      <div style={styles.section}>
        {tools.map((t) => (
          <button
            key={t.id}
            style={getToolBtnStyle(t.id)}
            onClick={() => onToolChange(t.id)}
            onMouseEnter={() => setHovered(t.id)}
            onMouseLeave={() => setHovered(null)}
            title={`${t.label} (${t.shortcut})`}
          >
            <span style={styles.toolIcon}>{t.icon}</span>
            <span style={{ ...styles.toolLabel, color: theme.textMuted }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ ...styles.divider, background: theme.border }} />

      <div style={styles.section}>
        {colors.map((color) => (
          <button
            key={color}
            style={{
              ...styles.colorButton,
              backgroundColor: color,
              ...(selectedColor === color ? { borderColor: theme.text, transform: 'scale(1.1)' } : {}),
              ...(hovered === `c-${color}` ? { transform: 'scale(1.15)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' } : {}),
            }}
            onClick={() => handleColorClick(color)}
            onMouseEnter={() => setHovered(`c-${color}`)}
            onMouseLeave={() => setHovered(null)}
            title={color}
          />
        ))}
      </div>

      {showFontSize && (
        <>
          <div style={{ ...styles.divider, background: theme.border }} />
          <div style={styles.section}>
            <button
              style={getSmallBtnStyle('font-down')}
              onClick={() => handleFontSizeChange(-FONT_STEP)}
              onMouseEnter={() => setHovered('font-down')}
              onMouseLeave={() => setHovered(null)}
              title="Decrease font size"
              disabled={currentFontSize <= MIN_FONT}
            >
              A-
            </button>
            <span style={{ ...styles.fontSizeLabel, color: theme.textSecondary }}>{currentFontSize}px</span>
            <button
              style={getSmallBtnStyle('font-up')}
              onClick={() => handleFontSizeChange(FONT_STEP)}
              onMouseEnter={() => setHovered('font-up')}
              onMouseLeave={() => setHovered(null)}
              title="Increase font size"
              disabled={currentFontSize >= MAX_FONT}
            >
              A+
            </button>
          </div>
        </>
      )}

      <div style={{ ...styles.divider, background: theme.border }} />

      <div style={styles.section}>
        <button
          style={getSmallBtnStyle('png')}
          onClick={onExportPNG}
          onMouseEnter={() => setHovered('png')}
          onMouseLeave={() => setHovered(null)}
          title="Export as PNG"
        >
          PNG
        </button>
        <button
          style={getSmallBtnStyle('pdf')}
          onClick={onExportPDF}
          onMouseEnter={() => setHovered('pdf')}
          onMouseLeave={() => setHovered(null)}
          title="Export as PDF"
        >
          PDF
        </button>
      </div>

      <div style={{ ...styles.divider, background: theme.border }} />

      <div style={styles.section}>
        <button
          style={getSmallBtnStyle('grid')}
          onClick={onAutoGrid}
          onMouseEnter={() => setHovered('grid')}
          onMouseLeave={() => setHovered(null)}
          title="Auto-arrange objects in a grid"
        >
          Grid
        </button>
        <button
          style={getSmallBtnStyle('group')}
          onClick={onGroupByColor}
          onMouseEnter={() => setHovered('group')}
          onMouseLeave={() => setHovered(null)}
          title="Group objects by color"
        >
          Group
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  toolbar: {
    position: 'absolute',
    top: '56px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'white',
    padding: '8px 14px',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    zIndex: 1000,
  },
  section: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  divider: {
    width: '1px',
    height: '32px',
    background: '#e5e7eb',
  },
  toolButton: {
    width: '44px',
    height: '48px',
    border: '2px solid transparent',
    borderRadius: '8px',
    background: '#f9fafb',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.15s',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
    padding: '2px 0',
  },
  activeButton: {
    background: '#ede9fe',
    borderColor: '#667eea',
  },
  toolIcon: {
    fontSize: '16px',
    lineHeight: 1,
  },
  toolLabel: {
    fontSize: '9px',
    color: '#6b7280',
    fontWeight: 500,
    lineHeight: 1,
  },
  colorButton: {
    width: '26px',
    height: '26px',
    border: '2px solid transparent',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  activeColorButton: {
    borderColor: '#1f2937',
    transform: 'scale(1.1)',
  },
  smallButton: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: '6px',
    background: '#f9fafb',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    color: '#4b5563',
    transition: 'background 0.15s',
  },
  fontSizeLabel: {
    fontSize: '12px',
    fontWeight: 600,
    minWidth: '36px',
    textAlign: 'center' as const,
    color: '#4b5563',
  },
};
