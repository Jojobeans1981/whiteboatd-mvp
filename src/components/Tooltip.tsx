import React, { useState, useRef, useId } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface TooltipProps {
  content: string;
  shortcut?: string;
  position?: 'top' | 'bottom';
  children: React.ReactElement;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, shortcut, position = 'top', children }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const tooltipId = useId();
  const { theme } = useTheme();

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), 200);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  return (
    <div
      style={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {React.cloneElement(children, { 'aria-describedby': visible ? tooltipId : undefined })}
      {visible && (
        <div
          id={tooltipId}
          role="tooltip"
          className="animate-fadeIn"
          style={{
            ...styles.tooltip,
            background: theme.toastBg,
            color: theme.toastText,
            ...(position === 'bottom' ? { top: '100%', bottom: 'auto', marginTop: 6 } : {}),
          }}
        >
          {content}
          {shortcut && (
            <kbd style={{ ...styles.kbd, background: 'rgba(255,255,255,0.15)' }}>{shortcut}</kbd>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    display: 'inline-flex',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 6,
    padding: '5px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  kbd: {
    padding: '1px 5px',
    borderRadius: 3,
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 600,
  },
};
