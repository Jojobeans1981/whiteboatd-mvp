import React, { useRef, useEffect } from 'react';
import { useReactions } from '../hooks/useReactions';
import { useTheme } from '../contexts/ThemeContext';

const EMOJIS = ['👍', '❤️', '⭐', '🔥', '👀', '🚀'];

interface ReactionPickerProps {
  boardId: string;
  objectId: string;
  userId: string;
  userName: string;
  x: number;
  y: number;
  onClose: () => void;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  boardId, objectId, userId, userName, x, y, onClose,
}) => {
  const { reactions, toggleReaction } = useReactions(boardId, objectId);
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getCounts = () => {
    const counts: Record<string, number> = {};
    reactions.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
    return counts;
  };

  const hasUserReacted = (emoji: string) => reactions.some(r => r.emoji === emoji && r.userId === userId);

  const counts = getCounts();
  const left = Math.min(x, window.innerWidth - 280);
  const top = Math.min(y, window.innerHeight - 60);

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Add reaction"
      className="animate-popIn"
      style={{ ...styles.picker, left, top, background: theme.surface, boxShadow: theme.shadowHeavy }}
    >
      {EMOJIS.map(emoji => {
        const count = counts[emoji] || 0;
        const active = hasUserReacted(emoji);
        return (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji, userId, userName)}
            style={{
              ...styles.emojiBtn,
              background: active ? theme.surfaceActive : 'transparent',
              borderColor: active ? theme.accent : 'transparent',
            }}
            aria-label={`${emoji} ${count}`}
            aria-pressed={active}
          >
            <span>{emoji}</span>
            {count > 0 && <span style={{ ...styles.count, color: theme.textSecondary }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  picker: {
    position: 'absolute',
    zIndex: 2000,
    display: 'flex',
    gap: 4,
    padding: '6px 8px',
    borderRadius: 10,
  },
  emojiBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: '4px 6px',
    border: '2px solid transparent',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 18,
    transition: 'background 0.1s',
  },
  count: {
    fontSize: 11,
    fontWeight: 600,
  },
};
