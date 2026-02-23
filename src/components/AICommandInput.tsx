import React, { useState } from 'react';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BoardObject, User } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { autoGridLayout, groupByColorLayout } from '../lib/layoutUtils';

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

  // Handle simple commands locally without calling the AI API.
  // Returns a success message string, or null if not a local command.
  const tryLocalCommand = async (cmd: string, currentObjects: BoardObject[]): Promise<string | null> => {
    const lower = cmd.toLowerCase().trim();

    // Clear / reset board
    if (/^(clear|reset|delete all|remove all|clear the board|clear board|start fresh|wipe)/.test(lower)) {
      if (currentObjects.length === 0) return 'Board is already empty.';
      const count = currentObjects.length;
      await Promise.all(currentObjects.map((obj) => deleteDoc(doc(db, 'boards', boardId, 'objects', obj.id))));
      return `Cleared board (${count} objects removed).`;
    }

    // Tidy / auto-grid
    if (/^(tidy|organize|arrange|auto.?grid|clean up|neat)/.test(lower)) {
      const positions = autoGridLayout(currentObjects);
      if (positions.length === 0) return 'Nothing to organize.';
      await Promise.all(positions.map((p) => updateDoc(doc(db, 'boards', boardId, 'objects', p.id), { x: p.x, y: p.y, updatedAt: Date.now() })));
      return `Organized ${positions.length} objects in a grid.`;
    }

    // Sort / group by color
    if (/^(sort|group).*(color|colour)/.test(lower) || /^(color|colour).*(sort|group)/.test(lower)) {
      const positions = groupByColorLayout(currentObjects);
      if (positions.length === 0) return 'Nothing to sort.';
      await Promise.all(positions.map((p) => updateDoc(doc(db, 'boards', boardId, 'objects', p.id), { x: p.x, y: p.y, updatedAt: Date.now() })));
      return `Sorted ${positions.length} objects by color.`;
    }

    return null;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const command = inputValue.trim();
    if (!command || status === 'loading') return;

    const objectsSnapshot = [...objects];
    setInputValue('');

    // Try local commands first — no loading spinner, instant result
    try {
      const localResult = await tryLocalCommand(command, objectsSnapshot);
      if (localResult !== null) {
        setStatus('success');
        setMessage(localResult);
        setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
        return;
      }
    } catch {
      setStatus('error');
      setMessage('Command failed — please try again.');
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
      return;
    }

    // Not a local command — call the AI API
    setStatus('loading');
    setMessage('');

    // Safety net: force-reset after 20s even if fetch hangs
    const safetyReset = setTimeout(() => {
      setStatus('error');
      setMessage('Request timed out — please try again.');
    }, 20000);

    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          command,
          boardId,
          boardState: objectsSnapshot,
          userId: user.uid,
          userName: user.displayName || user.email || 'Anonymous',
        }),
      });

      clearTimeout(fetchTimeout);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(response.status === 504 ? 'Request timed out' : `Server error (${response.status})`);
      }

      const data = await response.json();

      if (data.success && data.operations) {
        await executeOperations(data.operations);
        setStatus('success');
        setMessage(data.message || `Created ${data.objectsCreated} objects.`);
      } else if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Done.');
      } else if (response.status === 429) {
        setStatus('error');
        setMessage('AI is busy — please wait a moment and try again.');
        addNotification('AI rate limited, try again shortly', 'error');
      } else {
        setStatus('error');
        const errMsg = data.error || 'Something went wrong';
        setMessage(errMsg);
        addNotification(errMsg, 'error');
      }
    } catch (err: any) {
      setStatus('error');
      const errMsg = err?.name === 'AbortError'
        ? 'Request timed out — please try again.'
        : 'Failed to reach AI service — please try again.';
      setMessage(errMsg);
      addNotification(errMsg, 'error');
    } finally {
      clearTimeout(safetyReset);
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
    }
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
