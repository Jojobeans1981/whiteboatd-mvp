// src/components/Toolbar.tsx

import React, { useState, useRef, useEffect } from 'react';
import { BoardObject } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { Tooltip } from './Tooltip';

export type Tool = 'select' | 'sticky' | 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'star' | 'hexagon' | 'line' | 'pen' | 'text' | 'frame' | 'connector';

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
  onTemplateClick?: () => void;
  isReadOnly?: boolean;
}

const COLORS = [
  { hex: '#FFE066', name: 'Yellow' },
  { hex: '#FFB347', name: 'Orange' },
  { hex: '#FF6B6B', name: 'Red' },
  { hex: '#F38181', name: 'Coral' },
  { hex: '#FCBAD3', name: 'Pink' },
  { hex: '#AA96DA', name: 'Purple' },
  { hex: '#45B7D1', name: 'Blue' },
  { hex: '#4ECDC4', name: 'Teal' },
  { hex: '#95E1D3', name: 'Mint' },
  { hex: '#A8E6CF', name: 'Light Green' },
  { hex: '#77DD77', name: 'Green' },
  { hex: '#C9B458', name: 'Gold' },
  { hex: '#D4A574', name: 'Tan' },
  { hex: '#A0522D', name: 'Brown' },
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#B0B0B0', name: 'Gray' },
  { hex: '#4A4A4A', name: 'Dark Gray' },
  { hex: '#1A1A1A', name: 'Black' },
];

const MIN_FONT = 8;
const MAX_FONT = 72;
const FONT_STEP = 2;

const topTools: { id: Tool | 'template'; icon: string; label: string; shortcut: string }[] = [
  { id: 'select', icon: '🖱️', label: 'Select', shortcut: 'V' },
  { id: 'sticky', icon: '📝', label: 'Note', shortcut: 'S' },
];

const shapeTools: { id: Tool; icon: string; label: string; shortcut: string }[] = [
  { id: 'rectangle', icon: '⬜', label: 'Rectangle', shortcut: 'R' },
  { id: 'circle', icon: '⭕', label: 'Circle', shortcut: 'C' },
  { id: 'triangle', icon: '△', label: 'Triangle', shortcut: '3' },
  { id: 'diamond', icon: '◇', label: 'Diamond', shortcut: 'D' },
  { id: 'star', icon: '★', label: 'Star', shortcut: 'A' },
  { id: 'hexagon', icon: '⬡', label: 'Hexagon', shortcut: 'H' },
  { id: 'line', icon: '╱', label: 'Line', shortcut: 'I' },
];

const bottomTools: { id: Tool | 'template'; icon: string; label: string; shortcut: string }[] = [
  { id: 'pen', icon: '✏️', label: 'Pen', shortcut: 'P' },
  { id: 'text', icon: '🔤', label: 'Text', shortcut: 'T' },
  { id: 'frame', icon: '🖼️', label: 'Frame', shortcut: 'F' },
  { id: 'connector', icon: '🔗', label: 'Connect', shortcut: 'L' },
  { id: 'template', icon: '📋', label: 'Templates', shortcut: 'M' },
];

const shapeToolIds = new Set(shapeTools.map((s) => s.id));

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
  onTemplateClick,
  isReadOnly,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const shapesRef = useRef<HTMLDivElement>(null);
  const colorsRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Close dropdowns on outside click
  useEffect(() => {
    if (!shapesOpen && !colorsOpen) return;
    const handler = (e: MouseEvent) => {
      if (shapesOpen && shapesRef.current && !shapesRef.current.contains(e.target as Node)) {
        setShapesOpen(false);
      }
      if (colorsOpen && colorsRef.current && !colorsRef.current.contains(e.target as Node)) {
        setColorsOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [shapesOpen, colorsOpen]);

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

  const getToolBtnStyle = (tool: Tool, readOnlyDisabled?: boolean): React.CSSProperties => ({
    ...styles.toolButton,
    background: theme.bg,
    ...(selectedTool === tool ? { background: theme.surfaceActive, borderColor: theme.accent } : {}),
    ...(hovered === tool && selectedTool !== tool ? { background: theme.surfaceHover } : {}),
    ...(hovered === tool && selectedTool === tool ? { background: theme.surfaceActive } : {}),
    ...(readOnlyDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
  });

  const getSmallBtnStyle = (id: string): React.CSSProperties => ({
    ...styles.smallButton,
    background: theme.bg,
    color: theme.textSecondary,
    ...(hovered === id ? { background: theme.surfaceHover } : {}),
  });

  const isShapeSelected = shapeToolIds.has(selectedTool);
  const activeShape = shapeTools.find((s) => s.id === selectedTool);
  const shapesReadOnlyDisabled = isReadOnly;

  const renderToolButton = (t: { id: Tool | 'template'; icon: string; label: string; shortcut: string }) => {
    const isCreationTool = t.id !== 'select';
    const readOnlyDisabled = isReadOnly && isCreationTool;
    return (
      <Tooltip key={t.id} content={readOnlyDisabled ? `${t.label} (view-only)` : t.label} shortcut={readOnlyDisabled ? undefined : t.shortcut}>
        <button
          style={getToolBtnStyle(t.id as Tool, readOnlyDisabled)}
          onClick={() => {
            if (readOnlyDisabled) return;
            if (t.id === 'template') {
              onTemplateClick?.();
              return;
            }
            onToolChange(t.id as Tool);
          }}
          onMouseEnter={() => setHovered(t.id)}
          onMouseLeave={() => setHovered(null)}
          aria-label={t.label}
          aria-pressed={selectedTool === t.id}
          aria-disabled={readOnlyDisabled}
        >
          <span style={styles.toolIcon} aria-hidden="true">{t.icon}</span>
          <span style={{ ...styles.toolLabel, color: theme.textMuted }}>{t.label}</span>
        </button>
      </Tooltip>
    );
  };

  return (
    <div role="toolbar" aria-label="Drawing tools" style={{ ...styles.toolbar, background: theme.surface, boxShadow: theme.shadowHeavy }}>
      <div style={styles.section}>
        {topTools.map(renderToolButton)}

        {/* Basic Shapes dropdown */}
        <div ref={shapesRef} style={{ position: 'relative' }}>
          <Tooltip content={shapesReadOnlyDisabled ? 'Shapes (view-only)' : 'Basic Shapes'}>
            <button
              style={{
                ...styles.toolButton,
                background: theme.bg,
                ...(isShapeSelected ? { background: theme.surfaceActive, borderColor: theme.accent } : {}),
                ...(hovered === 'shapes-toggle' && !isShapeSelected ? { background: theme.surfaceHover } : {}),
                ...(shapesReadOnlyDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
              }}
              onClick={() => {
                if (shapesReadOnlyDisabled) return;
                setShapesOpen((prev) => !prev);
              }}
              onMouseEnter={() => setHovered('shapes-toggle')}
              onMouseLeave={() => setHovered(null)}
              aria-label="Basic Shapes"
              aria-expanded={shapesOpen}
              aria-haspopup="true"
            >
              <span style={styles.toolIcon} aria-hidden="true">{activeShape?.icon || '⬜'}</span>
              <span style={{ ...styles.toolLabel, color: theme.textMuted }}>Shapes ▾</span>
            </button>
          </Tooltip>
          {shapesOpen && (
            <div style={{ ...styles.dropdown, background: theme.surface, boxShadow: theme.shadowHeavy }}>
              {shapeTools.map((s) => (
                <button
                  key={s.id}
                  style={{
                    ...styles.dropdownItem,
                    color: theme.text,
                    ...(selectedTool === s.id ? { background: theme.surfaceActive } : {}),
                    ...(hovered === `shape-${s.id}` && selectedTool !== s.id ? { background: theme.surfaceHover } : {}),
                  }}
                  onClick={() => {
                    onToolChange(s.id);
                    setShapesOpen(false);
                  }}
                  onMouseEnter={() => setHovered(`shape-${s.id}`)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span aria-hidden="true">{s.icon}</span>
                  <span>{s.label}</span>
                  <span style={{ ...styles.shortcutHint, color: theme.textMuted }}>{s.shortcut}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {bottomTools.map(renderToolButton)}
      </div>

      <div style={{ ...styles.divider, background: theme.border }} />

      {/* Colors dropdown */}
      <div ref={colorsRef} style={{ position: 'relative' }}>
        <Tooltip content="Colors">
          <button
            style={{
              ...styles.toolButton,
              background: theme.bg,
              ...(colorsOpen ? { background: theme.surfaceActive, borderColor: theme.accent } : {}),
              ...(hovered === 'colors-toggle' && !colorsOpen ? { background: theme.surfaceHover } : {}),
            }}
            onClick={() => setColorsOpen((prev) => !prev)}
            onMouseEnter={() => setHovered('colors-toggle')}
            onMouseLeave={() => setHovered(null)}
            aria-label="Colors"
            aria-expanded={colorsOpen}
            aria-haspopup="true"
          >
            <span style={{ ...styles.colorDot, backgroundColor: selectedColor }} aria-hidden="true" />
            <span style={{ ...styles.toolLabel, color: theme.textMuted }}>Colors ▾</span>
          </button>
        </Tooltip>
        {colorsOpen && (
          <div style={{ ...styles.colorDropdown, background: theme.surface, boxShadow: theme.shadowHeavy }}>
            {COLORS.map((c) => (
              <Tooltip key={c.hex} content={c.name}>
                <button
                  style={{
                    ...styles.colorSwatch,
                    backgroundColor: c.hex,
                    ...(c.hex === '#FFFFFF' ? { border: '2px solid #d1d5db' } : {}),
                    ...(selectedColor === c.hex ? { borderColor: theme.text, transform: 'scale(1.2)', boxShadow: '0 0 0 2px ' + theme.accent } : {}),
                    ...(hovered === `c-${c.hex}` && selectedColor !== c.hex ? { transform: 'scale(1.15)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' } : {}),
                  }}
                  onClick={() => {
                    handleColorClick(c.hex);
                    setColorsOpen(false);
                  }}
                  onMouseEnter={() => setHovered(`c-${c.hex}`)}
                  onMouseLeave={() => setHovered(null)}
                  aria-label={c.name}
                />
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {showFontSize && (
        <>
          <div style={{ ...styles.divider, background: theme.border }} />
          <div style={styles.section}>
            <Tooltip content="Decrease font">
              <button
                style={getSmallBtnStyle('font-down')}
                onClick={() => handleFontSizeChange(-FONT_STEP)}
                onMouseEnter={() => setHovered('font-down')}
                onMouseLeave={() => setHovered(null)}
                aria-label="Decrease font size"
                disabled={currentFontSize <= MIN_FONT}
              >
                A-
              </button>
            </Tooltip>
            <span style={{ ...styles.fontSizeLabel, color: theme.textSecondary }}>{currentFontSize}px</span>
            <Tooltip content="Increase font">
              <button
                style={getSmallBtnStyle('font-up')}
                onClick={() => handleFontSizeChange(FONT_STEP)}
                onMouseEnter={() => setHovered('font-up')}
                onMouseLeave={() => setHovered(null)}
                aria-label="Increase font size"
                disabled={currentFontSize >= MAX_FONT}
              >
                A+
              </button>
            </Tooltip>
          </div>
        </>
      )}

      <div style={{ ...styles.divider, background: theme.border }} />

      <div style={styles.section}>
        <Tooltip content="Export as PNG">
          <button
            style={getSmallBtnStyle('png')}
            onClick={onExportPNG}
            onMouseEnter={() => setHovered('png')}
            onMouseLeave={() => setHovered(null)}
            aria-label="Export as PNG image"
          >
            <span aria-hidden="true">⬇</span> PNG
          </button>
        </Tooltip>
        <Tooltip content="Export as PDF">
          <button
            style={getSmallBtnStyle('pdf')}
            onClick={onExportPDF}
            onMouseEnter={() => setHovered('pdf')}
            onMouseLeave={() => setHovered(null)}
            aria-label="Export as PDF document"
          >
            <span aria-hidden="true">⬇</span> PDF
          </button>
        </Tooltip>
      </div>

      <div style={{ ...styles.divider, background: theme.border }} />

      <div style={styles.section}>
        <Tooltip content="Auto-arrange in grid">
          <button
            style={getSmallBtnStyle('grid')}
            onClick={onAutoGrid}
            onMouseEnter={() => setHovered('grid')}
            onMouseLeave={() => setHovered(null)}
            aria-label="Auto-arrange objects in a grid"
          >
            <span aria-hidden="true">⊞</span> Tidy
          </button>
        </Tooltip>
        <Tooltip content="Sort by color">
          <button
            style={getSmallBtnStyle('group')}
            onClick={onGroupByColor}
            onMouseEnter={() => setHovered('group')}
            onMouseLeave={() => setHovered(null)}
            aria-label="Sort objects by color"
          >
            <span aria-hidden="true">🎨</span> Sort
          </button>
        </Tooltip>
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
  colorDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '1.5px solid rgba(0,0,0,0.15)',
  },
  colorDropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '6px',
    borderRadius: '10px',
    padding: '8px',
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '6px',
    zIndex: 2000,
  },
  colorSwatch: {
    width: '28px',
    height: '28px',
    border: '2px solid transparent',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.15s',
    padding: 0,
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
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '6px',
    borderRadius: '10px',
    padding: '4px 0',
    minWidth: '160px',
    zIndex: 2000,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 14px',
    border: 'none',
    background: 'none',
    textAlign: 'left' as const,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  shortcutHint: {
    marginLeft: 'auto',
    fontSize: '11px',
    fontWeight: 500,
  },
};
