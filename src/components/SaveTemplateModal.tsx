import React, { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { theme } = useTheme();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), description.trim());
    setName('');
    setDescription('');
  };

  return (
    <div style={styles.backdrop} className="animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-template-title"
        className="animate-popIn"
        style={{ ...styles.modal, background: theme.surface, boxShadow: theme.shadowHeavy }}
      >
        <h3 id="save-template-title" style={{ ...styles.title, color: theme.text }}>Save as Template</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Template name"
            aria-label="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ ...styles.input, borderColor: theme.border, color: theme.text, background: theme.inputBg || 'transparent' }}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            aria-label="Template description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...styles.textarea, borderColor: theme.border, color: theme.text, background: theme.inputBg || 'transparent' }}
            rows={2}
          />
          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={{ ...styles.cancelBtn, color: theme.textSecondary }}>
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()} style={{ ...styles.saveBtn, background: theme.accent, opacity: name.trim() ? 1 : 0.5 }}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2100,
  },
  modal: {
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '90vw',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: 16,
    fontWeight: 700,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    padding: '10px 14px',
    fontSize: 14,
    border: '2px solid',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    padding: '10px 14px',
    fontSize: 14,
    border: '2px solid',
    borderRadius: 8,
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    padding: '8px 16px',
    background: 'none',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  saveBtn: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
};
