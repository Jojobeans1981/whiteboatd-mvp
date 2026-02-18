// src/components/PresenceIndicator.tsx

import React from 'react';
import { UserPresence } from '../types';

interface PresenceIndicatorProps {
  onlineUsers: UserPresence[];
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ onlineUsers }) => {
  if (onlineUsers.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.onlineText}>● {onlineUsers.length} online</span>
      </div>
      <div style={styles.userList}>
        {onlineUsers.map((user) => (
          <div key={user.userId} style={styles.userItem}>
            <div
              style={{
                ...styles.userDot,
                backgroundColor: user.color,
              }}
            />
            <span style={styles.userName}>{user.userName}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    top: '80px',
    right: '10px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '10px',
    minWidth: '150px',
    zIndex: 1000,
  },
  header: {
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e0e0e0',
  },
  onlineText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4caf50',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  userName: {
    fontSize: '12px',
    color: '#333',
  },
};
