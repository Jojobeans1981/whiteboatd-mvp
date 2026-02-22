import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ContextMenuProps {
  x: number;
  y: number;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onComment?: () => void;
  onReact?: () => void;
  onClose: () => void;
  isReadOnly?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onEdit,
  onDelete,
  onDuplicate,
  onComment,
  onReact,
  onClose,
  isReadOnly,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
        if (!items || items.length === 0) return;
        const idx = Array.from(items).indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        items[next].focus();
      }
    };
    // Focus first item on mount
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (items && items.length > 0) items[0].focus();
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Bounds checking: reposition if menu overflows viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let adjX = x;
      let adjY = y;
      if (x + rect.width > window.innerWidth) {
        adjX = window.innerWidth - rect.width - 8;
      }
      if (y + rect.height > window.innerHeight) {
        adjY = window.innerHeight - rect.height - 8;
      }
      menuRef.current.style.left = `${adjX}px`;
      menuRef.current.style.top = `${adjY}px`;
    }
  }, [x, y]);

  const getItemStyle = (id: string, isDelete?: boolean): React.CSSProperties => ({
    ...styles.item,
    color: isDelete ? '#dc2626' : theme.text,
    ...(hoveredItem === id
      ? { background: isDelete ? (theme.surface === '#ffffff' ? '#fef2f2' : '#3b1c1c') : theme.surfaceHover }
      : {}),
  });

  return (
    <div ref={menuRef} role="menu" className="animate-popIn" style={{ ...styles.menu, left: x, top: y, background: theme.surface, boxShadow: theme.shadowHeavy }}>
      {!isReadOnly && (
        <button
          role="menuitem"
          style={getItemStyle('edit')}
          onClick={onEdit}
          onMouseEnter={() => setHoveredItem('edit')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          Edit
        </button>
      )}
      {!isReadOnly && (
        <button
          role="menuitem"
          style={getItemStyle('duplicate')}
          onClick={onDuplicate}
          onMouseEnter={() => setHoveredItem('duplicate')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          Duplicate
        </button>
      )}
      {onComment && (
        <button
          role="menuitem"
          style={getItemStyle('comment')}
          onClick={onComment}
          onMouseEnter={() => setHoveredItem('comment')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          Comments
        </button>
      )}
      {onReact && (
        <button
          role="menuitem"
          style={getItemStyle('react')}
          onClick={onReact}
          onMouseEnter={() => setHoveredItem('react')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          React
        </button>
      )}
      {!isReadOnly && (
        <>
          <div style={{ ...styles.divider, background: theme.border }} />
          <button
            role="menuitem"
            style={getItemStyle('delete', true)}
            onClick={onDelete}
            onMouseEnter={() => setHoveredItem('delete')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  menu: {
    position: 'absolute',
    zIndex: 2000,
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.16)',
    padding: '4px 0',
    minWidth: '150px',
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
    color: '#1f2937',
    transition: 'background 0.1s',
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
