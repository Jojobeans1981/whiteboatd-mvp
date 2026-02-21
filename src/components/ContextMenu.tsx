import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onEdit,
  onDelete,
  onDuplicate,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div ref={menuRef} style={{ ...styles.menu, left: x, top: y }}>
      <button style={styles.item} onClick={onEdit}>
        Edit
      </button>
      <button style={styles.item} onClick={onDuplicate}>
        Duplicate
      </button>
      <div style={styles.divider} />
      <button style={{ ...styles.item, ...styles.deleteItem }} onClick={onDelete}>
        Delete
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  menu: {
    position: 'absolute',
    zIndex: 2000,
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    padding: '4px 0',
    minWidth: '140px',
  },
  item: {
    display: 'block',
    width: '100%',
    padding: '8px 16px',
    border: 'none',
    background: 'none',
    textAlign: 'left' as const,
    fontSize: '13px',
    cursor: 'pointer',
    color: '#333',
    transition: 'background 0.15s',
  },
  deleteItem: {
    color: '#dc2626',
  },
  divider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '4px 0',
  },
};
