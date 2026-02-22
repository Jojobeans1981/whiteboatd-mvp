import React from 'react';
import { useNotification, NotificationVariant } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';

const variantConfig: Record<NotificationVariant, { icon: string; bg: string }> = {
  success: { icon: '\u2713', bg: '#22c55e' },
  error: { icon: '\u2717', bg: '#ef4444' },
  warning: { icon: '\u26a0', bg: '#f59e0b' },
  info: { icon: '\u2139', bg: '#3b82f6' },
};

export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();
  const { theme } = useTheme();

  if (notifications.length === 0) return null;

  return (
    <div style={styles.container}>
      {notifications.map(n => {
        const config = variantConfig[n.variant];
        return (
          <div
            key={n.id}
            className="animate-slideInUp"
            role="alert"
            aria-live="polite"
            style={{
              ...styles.toast,
              background: theme.toastBg,
              color: theme.toastText,
              boxShadow: theme.shadowHeavy,
            }}
          >
            <span style={{ ...styles.icon, background: config.bg }}>{config.icon}</span>
            <span style={styles.message}>{n.message}</span>
            <button
              onClick={() => removeNotification(n.id)}
              style={{ ...styles.dismiss, color: theme.toastText }}
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 80,
    right: 20,
    zIndex: 3000,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    pointerEvents: 'auto',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 10,
    minWidth: 260,
    maxWidth: 400,
    fontSize: 14,
  },
  icon: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  message: {
    flex: 1,
  },
  dismiss: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
    opacity: 0.6,
    padding: '0 2px',
    flexShrink: 0,
  },
};
