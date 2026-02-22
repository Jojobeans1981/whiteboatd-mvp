import React, { useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface InlineTextEditorProps {
  x: number;
  y: number;
  width: number;
  height: number;
  initialText: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  x,
  y,
  width,
  height,
  initialText,
  fontSize,
  color,
  backgroundColor,
  onSave,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Ctrl+Enter or just Enter (for single-line text objects)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave(textareaRef.current?.value || '');
    }
  };

  const handleBlur = () => {
    onSave(textareaRef.current?.value || '');
  };

  return (
    <textarea
      ref={textareaRef}
      defaultValue={initialText}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      aria-label="Edit text"
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${Math.max(width, 60)}px`,
        minHeight: `${Math.max(height, 30)}px`,
        fontSize: `${fontSize}px`,
        color,
        backgroundColor: backgroundColor === 'transparent' ? 'rgba(255,255,255,0.95)' : backgroundColor,
        border: `2px solid ${theme.accent}`,
        borderRadius: '4px',
        padding: '8px',
        outline: 'none',
        resize: 'none',
        overflow: 'auto',
        fontFamily: 'sans-serif',
        lineHeight: '1.4',
        zIndex: 2000,
        boxShadow: theme.shadowHeavy,
        boxSizing: 'border-box',
      }}
    />
  );
};
