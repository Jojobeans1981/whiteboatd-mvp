import React, { useState } from 'react';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BoardObject, User } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';

type AIStatus = 'idle' | 'loading' | 'success' | 'error';

interface CreateOperation {
  action: 'create';
  id: string;
  data: Record<string, any>;
}

interface UpdateOperation {
  action: 'update';
  objectId: string;
  data: Record<string, any>;
}

interface DeleteOperation {
  action: 'delete';
  objectId: string;
}

type Operation = CreateOperation | UpdateOperation | DeleteOperation;

interface AICommandInputProps {
  boardId: string;
  user: User;
  objects: BoardObject[];
  disabled?: boolean;
}

export const AICommandInput: React.FC<AICommandInputProps> = ({ boardId, user, objects, disabled }) => {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<AIStatus>('idle');
  const [message, setMessage] = useState('');
  const { theme, isDark } = useTheme();
  const { addNotification } = useNotification();

  // Execute operations returned by the AI endpoint against Firestore (in parallel)
  const executeOperations = async (operations: Operation[]) => {
    await Promise.all(operations.map((op) => {
      if (op.action === 'create') {
        return setDoc(doc(db, 'boards', boardId, 'objects', op.id), op.data);
      } else if (op.action === 'update') {
        return updateDoc(doc(db, 'boards', boardId, 'objects', op.objectId), op.data);
      } else {
        return deleteDoc(doc(db, 'boards', boardId, 'objects', op.objectId));
      }
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || status === 'loading') return;

    setStatus('loading');
    setMessage('');

    const MAX_CLIENT_RETRIES = 2;
    let lastError = '';

    for (let retry = 0; retry <= MAX_CLIENT_RETRIES; retry++) {
      try {
        if (retry > 0) {
          setMessage(`Rate limited — retrying in ${retry * 5}s... (attempt ${retry + 1})`);
          await new Promise((r) => setTimeout(r, retry * 5000));
        }

        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: inputValue.trim(),
            boardId,
            boardState: objects,
            userId: user.uid,
            userName: user.displayName || user.email || 'Anonymous',
          }),
        });

        const data = await response.json();

        if (data.success && data.operations) {
          await executeOperations(data.operations);
          setStatus('success');
          setMessage(data.message || `Created ${data.objectsCreated} objects.`);
          lastError = '';
          break;
        } else if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Done.');
          lastError = '';
          break;
        } else if (response.status === 429 && retry < MAX_CLIENT_RETRIES) {
          lastError = data.error || 'Rate limited';
          continue; // retry
        } else {
          setStatus('error');
          const errMsg = data.error || 'Something went wrong';
          setMessage(errMsg);
          addNotification(errMsg, 'error');
          lastError = '';
          break;
        }
      } catch (err) {
        lastError = 'Failed to reach AI service';
        if (retry >= MAX_CLIENT_RETRIES) {
          setStatus('error');
          setMessage(lastError);
          addNotification(lastError, 'error');
        }
      }
    }

    if (lastError) {
      setStatus('error');
      setMessage(lastError + ' — please wait a minute and try again.');
    }

    setInputValue('');
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 4000);
  };

  if (disabled) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.inputRow, background: theme.surface, boxShadow: theme.shadowHeavy, opacity: 0.6 }}>
          <span style={styles.icon}>AI</span>
          <span style={{ ...styles.input, color: theme.textMuted, padding: '8px 4px' }}>View-only mode</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={{ ...styles.inputRow, background: theme.surface, boxShadow: theme.shadowHeavy }}>
          <span style={styles.icon}>AI</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='Ask AI... (e.g. "SWOT analysis")'
            aria-label="AI command input"
            disabled={status === 'loading'}
            style={{
              ...styles.input,
              color: theme.text,
              ...(status === 'loading' ? styles.inputDisabled : {}),
            }}
          />
          <button
            type="submit"
            aria-label="Send AI command"
            disabled={status === 'loading' || !inputValue.trim()}
            style={{
              ...styles.button,
              ...(status === 'loading' || !inputValue.trim() ? styles.buttonDisabled : {}),
            }}
          >
            {status === 'loading' ? '...' : 'Send'}
          </button>
        </div>
      </form>

      {status === 'loading' && (
        <div role="status" style={{ ...styles.statusBar, background: isDark ? '#1e3a5f' : '#eff6ff', color: isDark ? '#93c5fd' : '#1d4ed8' }}>
          AI is working on your request...
        </div>
      )}

      {status === 'success' && message && (
        <div role="status" style={{ ...styles.statusBar, background: isDark ? '#14532d' : '#f0fdf4', color: isDark ? '#86efac' : '#166534' }}>
          {message}
        </div>
      )}

      {status === 'error' && message && (
        <div role="alert" style={{ ...styles.statusBar, background: isDark ? '#3b1c1c' : '#fef2f2', color: isDark ? '#fca5a5' : '#991b1b' }}>
          {message}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    width: '550px',
    maxWidth: 'calc(100vw - 40px)',
  },
  form: {
    margin: 0,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'white',
    padding: '8px 12px',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  },
  icon: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'white',
    background: '#7c3aed',
    padding: '4px 8px',
    borderRadius: '6px',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    padding: '8px 4px',
    background: 'transparent',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  button: {
    background: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  buttonDisabled: {
    background: '#c4b5fd',
    cursor: 'not-allowed',
  },
  statusBar: {
    marginTop: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  statusLoading: {},
  statusSuccess: {},
  statusError: {},
};
