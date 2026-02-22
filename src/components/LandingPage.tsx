import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { generateId } from '../lib/utils';
import { User } from '../types';

interface LandingPageProps {
  user: User;
  onNavigateToBoard: (boardId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ user, onNavigateToBoard }) => {
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState('');
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const handleCreateBoard = () => {
    const boardId = generateId();
    onNavigateToBoard(boardId);
  };

  const handleJoinBoard = () => {
    setError('');
    let boardId = joinInput.trim();
    if (!boardId) {
      setError('Please enter a board ID or URL');
      return;
    }

    try {
      const url = new URL(boardId);
      const param = url.searchParams.get('board');
      if (param) {
        boardId = param;
      }
    } catch {
      // Not a URL, treat as raw board ID
    }

    onNavigateToBoard(boardId);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const initial = ((user.displayName || user.email || 'U')[0] || 'U').toUpperCase();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.userRow}>
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || 'User'} style={styles.avatar} />
          ) : (
            <div style={styles.avatarFallback}>{initial}</div>
          )}
          <span style={styles.userName}>{user.displayName || user.email}</span>
          <button
            onClick={handleSignOut}
            style={{
              ...styles.signOutButton,
              ...(hoveredBtn === 'signout' ? { background: '#d32f2f' } : {}),
            }}
            onMouseEnter={() => setHoveredBtn('signout')}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            Sign Out
          </button>
        </div>

        <h1 style={styles.title}>Whiteboard</h1>
        <p style={styles.tagline}>Where ideas meet the wall.</p>
        <p style={styles.subtitle}>Create a new board or join an existing one</p>

        <button
          onClick={handleCreateBoard}
          style={{
            ...styles.createButton,
            ...(hoveredBtn === 'create' ? { opacity: 0.9 } : {}),
          }}
          onMouseEnter={() => setHoveredBtn('create')}
          onMouseLeave={() => setHoveredBtn(null)}
        >
          + Create New Board
        </button>

        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <div style={styles.joinRow}>
          <input
            style={{
              ...styles.joinInput,
              ...(inputFocused
                ? { borderColor: '#667eea', boxShadow: '0 0 0 3px rgba(102,126,234,0.15)' }
                : {}),
            }}
            type="text"
            placeholder="Paste board URL or ID"
            aria-label="Board URL or ID"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinBoard()}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          <button
            onClick={handleJoinBoard}
            style={{
              ...styles.joinButton,
              ...(hoveredBtn === 'join' ? { background: '#3b78e7' } : {}),
            }}
            onMouseEnter={() => setHoveredBtn('join')}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            Join
          </button>
        </div>
        {error && <p role="alert" style={styles.error}>{error}</p>}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    maxWidth: '440px',
    width: '90%',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
  },
  avatarFallback: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
    flex: 1,
  },
  signOutButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background 0.15s',
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    marginBottom: '4px',
    color: '#1f2937',
    textAlign: 'center' as const,
    letterSpacing: '-0.5px',
  },
  tagline: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#667eea',
    textAlign: 'center' as const,
    fontStyle: 'italic',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '28px',
    textAlign: 'center' as const,
  },
  createButton: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    margin: '20px 0',
    gap: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e5e7eb',
  },
  dividerText: {
    color: '#9ca3af',
    fontSize: '13px',
  },
  joinRow: {
    display: 'flex',
    gap: '8px',
  },
  joinInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box' as const,
  },
  joinButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    background: '#667eea',
    color: 'white',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  error: {
    color: '#dc2626',
    fontSize: '13px',
    marginTop: '8px',
  },
};
