// src/components/Auth.tsx

import React from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { User } from '../types';

interface AuthProps {
  user: User | null;
}

export const Auth: React.FC<AuthProps> = ({ user }) => {
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Failed to sign in. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={styles.title}>Collaborative Whiteboard</h1>
          <p style={styles.subtitle}>Real-time collaboration made simple</p>
          <button onClick={handleSignIn} style={styles.signInButton}>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.userInfo}>
      <div style={styles.userDetails}>
        {user.photoURL && (
          <img src={user.photoURL} alt={user.displayName || 'User'} style={styles.avatar} />
        )}
        <span style={styles.userName}>
          {user.displayName || user.email}
        </span>
      </div>
      <button onClick={handleSignOut} style={styles.signOutButton}>
        Sign Out
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  loginBox: {
    background: 'white',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    textAlign: 'center',
    maxWidth: '400px',
  },
  title: {
    fontSize: '32px',
    marginBottom: '10px',
    color: '#333',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px',
  },
  signInButton: {
    background: '#4285f4',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    fontSize: '16px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background 0.3s',
  },
  userInfo: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: 1000,
  },
  userDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  signOutButton: {
    background: '#f44336',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    fontSize: '14px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
  },
};
