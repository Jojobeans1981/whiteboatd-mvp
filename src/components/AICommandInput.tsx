import React, { useState } from 'react';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BoardObject, User } from '../types';

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
}

export const AICommandInput: React.FC<AICommandInputProps> = ({ boardId, user, objects }) => {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<AIStatus>('idle');
  const [message, setMessage] = useState('');

  // Execute operations returned by the AI endpoint against Firestore
  const executeOperations = async (operations: Operation[]) => {
    for (const op of operations) {
      if (op.action === 'create') {
        const objectRef = doc(db, 'boards', boardId, 'objects', op.id);
        await setDoc(objectRef, op.data);
      } else if (op.action === 'update') {
        const objectRef = doc(db, 'boards', boardId, 'objects', op.objectId);
        await updateDoc(objectRef, op.data);
      } else if (op.action === 'delete') {
        const objectRef = doc(db, 'boards', boardId, 'objects', op.objectId);
        await deleteDoc(objectRef);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || status === 'loading') return;

    setStatus('loading');
    setMessage('');

    try {
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
        // Write AI-generated objects to Firestore via client SDK
        await executeOperations(data.operations);
        setStatus('success');
        setMessage(data.message || `Created ${data.objectsCreated} objects.`);
      } else if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Done.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to reach AI service');
    }

    setInputValue('');
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 4000);
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputRow}>
          <span style={styles.icon}>AI</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='Ask AI to help... (e.g., "Create a SWOT analysis")'
            disabled={status === 'loading'}
            style={{
              ...styles.input,
              ...(status === 'loading' ? styles.inputDisabled : {}),
            }}
          />
          <button
            type="submit"
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
        <div style={{ ...styles.statusBar, ...styles.statusLoading }}>
          AI is working on your request...
        </div>
      )}

      {status === 'success' && message && (
        <div style={{ ...styles.statusBar, ...styles.statusSuccess }}>
          {message}
        </div>
      )}

      {status === 'error' && message && (
        <div style={{ ...styles.statusBar, ...styles.statusError }}>
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
  statusLoading: {
    background: '#eff6ff',
    color: '#1d4ed8',
  },
  statusSuccess: {
    background: '#f0fdf4',
    color: '#166534',
  },
  statusError: {
    background: '#fef2f2',
    color: '#991b1b',
  },
};
