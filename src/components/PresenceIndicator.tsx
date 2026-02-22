// src/components/PresenceIndicator.tsx

import React, { useState, useRef, useEffect } from 'react';
import { UserPresence } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface PresenceIndicatorProps {
  onlineUsers: UserPresence[];
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ onlineUsers }) => {
  const [expanded, setExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    if (expanded) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

  const { theme } = useTheme();

  if (onlineUsers.length === 0) return null;

  return (
    <div ref={wrapperRef} style={styles.wrapper}>
      <button
        style={{
          ...styles.trigger,
          background: theme.surface,
          boxShadow: theme.shadow,
          color: theme.text,
        }}
        onClick={() => setExpanded(!expanded)}
        aria-label={`${onlineUsers.length} users online`}
        aria-expanded={expanded}
      >
        <div style={styles.dotStack}>
          {onlineUsers.slice(0, 3).map((user, i) => (
            <div
              key={user.userId}
              style={{
                ...styles.miniDot,
                backgroundColor: user.color,
                borderColor: theme.surface,
                marginLeft: i === 0 ? 0 : -4,
                zIndex: 3 - i,
              }}
            />
          ))}
        </div>
        <span style={styles.countText}>
          {onlineUsers.length} online
        </span>
        <span style={{ ...styles.caret, color: theme.textMuted }}>{expanded ? '\u25B4' : '\u25BE'}</span>
      </button>

      {expanded && (
        <div style={{ ...styles.dropdown, background: theme.surface, boxShadow: theme.shadowHeavy }}>
          {onlineUsers.map((user) => (
            <div key={user.userId} style={styles.userRow}>
              <div style={{ ...styles.dot, backgroundColor: user.color }} />
              <span style={{ ...styles.userName, color: theme.text }}>{user.userName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    position: 'relative',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: '#1f2937',
  },
  dotStack: {
    display: 'flex',
    alignItems: 'center',
  },
  miniDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '2px solid white',
    position: 'relative' as const,
  },
  countText: {
    color: '#4caf50',
    fontWeight: 600,
    fontSize: '12px',
  },
  caret: {
    fontSize: '10px',
    color: '#9ca3af',
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '8px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    padding: '8px 0',
    minWidth: '160px',
    zIndex: 1100,
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  userName: {
    fontSize: '13px',
    color: '#1f2937',
  },
};
