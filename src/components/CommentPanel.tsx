import React, { useState, useRef, useEffect } from 'react';
import { useComments } from '../hooks/useComments';
import { useTheme } from '../contexts/ThemeContext';
import { User } from '../types';

interface CommentPanelProps {
  boardId: string;
  objectId: string;
  user: User;
  x: number;
  y: number;
  onClose: () => void;
}

export const CommentPanel: React.FC<CommentPanelProps> = ({ boardId, objectId, user, x, y, onClose }) => {
  const { comments, loading, addComment, deleteComment } = useComments(boardId, objectId);
  const [text, setText] = useState('');
  const { theme } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await addComment(text, user.uid, user.displayName || user.email || 'Anonymous', user.photoURL || undefined);
    setText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  // Clamp position
  const left = Math.min(x, window.innerWidth - 320);
  const top = Math.min(y, window.innerHeight - 400);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Comments"
      className="animate-popIn"
      style={{ ...styles.panel, left, top, background: theme.surface, boxShadow: theme.shadowHeavy }}
    >
      <div style={styles.header}>
        <strong style={{ color: theme.text, fontSize: 14 }}>Comments</strong>
        <button onClick={onClose} style={{ ...styles.closeBtn, color: theme.textMuted }} aria-label="Close comments">&times;</button>
      </div>
      <div ref={scrollRef} style={styles.list}>
        {loading && <p style={{ ...styles.empty, color: theme.textMuted }}>Loading...</p>}
        {!loading && comments.length === 0 && <p style={{ ...styles.empty, color: theme.textMuted }}>No comments yet</p>}
        {comments.map((c) => (
          <div key={c.id} style={{ ...styles.comment, borderBottomColor: theme.border }}>
            <div style={styles.commentHeader}>
              {c.userPhotoURL ? (
                <img src={c.userPhotoURL} alt="" style={styles.avatar} />
              ) : (
                <div style={styles.avatarFallback}>{(c.userName[0] || 'U').toUpperCase()}</div>
              )}
              <div style={{ flex: 1 }}>
                <span style={{ ...styles.userName, color: theme.text }}>{c.userName}</span>
                <span style={{ ...styles.time, color: theme.textMuted }}>{formatTime(c.createdAt)}</span>
              </div>
              {c.userId === user.uid && (
                <button onClick={() => deleteComment(c.id)} style={{ ...styles.deleteBtn, color: theme.textMuted }} aria-label="Delete comment">&times;</button>
              )}
            </div>
            <p style={{ ...styles.commentText, color: theme.textSecondary }}>{c.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ ...styles.inputRow, borderTopColor: theme.border }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          aria-label="Add a comment"
          style={{ ...styles.input, color: theme.text }}
        />
        <button type="submit" disabled={!text.trim()} style={{ ...styles.postBtn, background: theme.accent, opacity: text.trim() ? 1 : 0.5 }}>Post</button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    zIndex: 2000,
    width: 300,
    maxHeight: 380,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px 8px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 14px',
    maxHeight: 240,
  },
  empty: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '16px 0',
  },
  comment: {
    padding: '8px 0',
    borderBottom: '1px solid',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: '50%',
  },
  avatarFallback: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
  },
  userName: {
    fontSize: 12,
    fontWeight: 600,
  },
  time: {
    fontSize: 10,
    marginLeft: 6,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    fontSize: 14,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 2px',
  },
  commentText: {
    fontSize: 13,
    lineHeight: 1.4,
    margin: '0 0 0 30px',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '10px 14px',
    borderTop: '1px solid',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 13,
    background: 'transparent',
    padding: '4px 0',
  },
  postBtn: {
    border: 'none',
    borderRadius: 6,
    color: 'white',
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
};
