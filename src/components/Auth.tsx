// src/components/Auth.tsx

import React, { useState } from 'react';
import {
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { User } from '../types';
import { useTheme } from '../contexts/ThemeContext';

// --- LoginScreen: Full-page login/signup ---

export const LoginScreen: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'auth/operation-not-allowed':
        return 'Email/password sign-in is not enabled. Please use Google sign-in.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (authMode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, {
          displayName: email.split('@')[0],
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(getErrorMessage(err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(getErrorMessage(err.code || ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    ...loginStyles.input,
    ...(focusedField === field
      ? { borderColor: '#667eea', boxShadow: '0 0 0 3px rgba(102,126,234,0.15)' }
      : {}),
  });

  return (
    <div style={loginStyles.container}>
      <div style={loginStyles.card}>
        <h1 style={loginStyles.title}>GAUNTLET AI G4</h1>
        <p style={loginStyles.tagline}>Collab Board</p>
        <p style={loginStyles.subtitle}>Where ideas meet the wall.</p>
        <p style={loginStyles.subtitle}>
          Real-time collaboration for teams that think visually
        </p>

        {error && <div style={loginStyles.errorBanner}>{error}</div>}

        <form onSubmit={handleEmailSubmit} style={loginStyles.form}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            style={inputStyle('email')}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            style={inputStyle('password')}
            disabled={loading}
          />
          {authMode === 'signup' && (
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle('confirm')}
              disabled={loading}
            />
          )}
          <button type="submit" style={loginStyles.submitButton} disabled={loading}>
            {loading
              ? '...'
              : authMode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <button
          style={loginStyles.toggleLink}
          onClick={() => {
            setAuthMode(authMode === 'login' ? 'signup' : 'login');
            setError('');
          }}
        >
          {authMode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>

        <div style={loginStyles.dividerRow}>
          <div style={loginStyles.dividerLine} />
          <span style={loginStyles.dividerText}>or</span>
          <div style={loginStyles.dividerLine} />
        </div>

        <button onClick={handleGoogleSignIn} style={loginStyles.googleButton} disabled={loading}>
          <span style={loginStyles.googleIcon}>G</span>
          Continue with Google
        </button>
      </div>
    </div>
  );
};

const loginStyles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    maxWidth: '420px',
    width: '90%',
  },
  title: {
    fontSize: '36px',
    fontWeight: 800,
    marginBottom: '4px',
    color: '#1f2937',
    textAlign: 'center' as const,
    letterSpacing: '-0.5px',
  },
  tagline: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#667eea',
    textAlign: 'center' as const,
    fontStyle: 'italic',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  errorBanner: {
    color: '#991b1b',
    fontSize: '13px',
    textAlign: 'center' as const,
    background: '#fef2f2',
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  submitButton: {
    width: '100%',
    padding: '13px',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    cursor: 'pointer',
    marginTop: '4px',
  },
  toggleLink: {
    display: 'block',
    width: '100%',
    textAlign: 'center' as const,
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '12px 0 4px',
    fontWeight: 500,
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '16px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e5e7eb',
  },
  dividerText: {
    color: '#9ca3af',
    fontSize: '13px',
  },
  googleButton: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 500,
    border: '1px solid #dadce0',
    borderRadius: '8px',
    background: 'white',
    color: '#3c4043',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  googleIcon: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#4285f4',
  },
};

// --- UserBadge: Compact bar for board view ---

interface UserBadgeProps {
  user: User;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ user }) => {
  const [hovered, setHovered] = useState(false);
  const { theme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const initial = ((user.displayName || user.email || 'U')[0] || 'U').toUpperCase();

  return (
    <div style={{ ...badgeStyles.container, background: theme.surface, boxShadow: theme.shadow }}>
      {user.photoURL ? (
        <img src={user.photoURL} alt={user.displayName || 'User'} style={badgeStyles.avatar} />
      ) : (
        <div style={badgeStyles.avatarFallback}>{initial}</div>
      )}
      <span style={{ ...badgeStyles.name, color: theme.text }}>{user.displayName || user.email}</span>
      <button
        onClick={handleSignOut}
        style={{
          ...badgeStyles.signOut,
          ...(hovered ? { background: '#d32f2f' } : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        Sign Out
      </button>
    </div>
  );
};

const badgeStyles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'white',
    padding: '6px 10px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
  },
  avatarFallback: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '13px',
  },
  name: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1f2937',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  signOut: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    fontSize: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background 0.15s',
  },
};
