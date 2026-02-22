import React, { useState } from 'react';
import { BoardObject, User } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';

interface AISuggestButtonProps {
  boardId: string;
  user: User;
  objects: BoardObject[];
  onApply: (command: string) => void;
}

export const AISuggestButton: React.FC<AISuggestButtonProps> = ({ boardId, user, objects, onApply }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState('');
  const [hovered, setHovered] = useState(false);
  const { theme } = useTheme();
  const { addNotification } = useNotification();

  const handleSuggest = async () => {
    if (objects.length === 0) {
      addNotification('Add some objects to the board first', 'info');
      return;
    }
    setOpen(true);
    setLoading(true);
    setSuggestions('');

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'Analyze the current board and suggest improvements. Do NOT make changes — just describe suggestions as a numbered list.',
          boardId,
          boardState: objects,
          userId: user.uid,
          userName: user.displayName || user.email || 'Anonymous',
        }),
      });
      const data = await response.json();
      if (data.success && data.message) {
        setSuggestions(data.message);
      } else {
        setSuggestions(data.error || 'Could not generate suggestions.');
      }
    } catch {
      setSuggestions('Failed to reach AI service.');
      addNotification('Failed to get suggestions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestions) {
      onApply(`Apply these improvements to the board: ${suggestions}`);
      setOpen(false);
      setSuggestions('');
    }
  };

  return (
    <div style={styles.wrapper}>
      <button
        onClick={handleSuggest}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Get AI suggestions for the board"
        style={{
          ...styles.button,
          background: theme.surface,
          color: theme.accent,
          boxShadow: theme.shadow,
          ...(hovered ? { background: theme.surfaceHover } : {}),
        }}
      >
        Suggest
      </button>

      {open && (
        <div
          className="animate-popIn"
          role="dialog"
          aria-label="AI Suggestions"
          style={{
            ...styles.panel,
            background: theme.surface,
            boxShadow: theme.shadowHeavy,
            borderColor: theme.border,
          }}
        >
          <div style={styles.panelHeader}>
            <strong style={{ color: theme.text, fontSize: 14 }}>AI Suggestions</strong>
            <button
              onClick={() => { setOpen(false); setSuggestions(''); }}
              style={{ ...styles.closeBtn, color: theme.textMuted }}
              aria-label="Close suggestions"
            >
              &times;
            </button>
          </div>
          <div style={{ ...styles.content, color: theme.textSecondary }}>
            {loading ? (
              <p style={{ fontStyle: 'italic' }}>Analyzing your board...</p>
            ) : (
              <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>{suggestions}</p>
            )}
          </div>
          {!loading && suggestions && (
            <button
              onClick={handleApply}
              style={{ ...styles.applyBtn, background: theme.accent }}
            >
              Apply Suggestions
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  button: {
    padding: '8px 14px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    transition: 'background 0.15s',
  },
  panel: {
    position: 'absolute',
    bottom: 44,
    right: 0,
    width: 340,
    maxHeight: 400,
    borderRadius: 12,
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px 8px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  content: {
    padding: '0 16px 12px',
    overflowY: 'auto',
    flex: 1,
    fontSize: 13,
  },
  applyBtn: {
    margin: '0 16px 12px',
    padding: '8px 16px',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
