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
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const { theme, isDark } = useTheme();

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
    background: theme.inputBg,
    color: theme.text,
    borderColor: focusedField === field ? theme.accent : theme.border,
    boxShadow: focusedField === field ? `0 0 0 3px ${isDark ? 'rgba(129,140,248,0.2)' : 'rgba(102,126,234,0.15)'}` : 'none',
  });

  return (
    <div style={{ ...loginStyles.container, background: isDark ? theme.bg : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ ...loginStyles.card, background: theme.surface, boxShadow: theme.shadowHeavy }}>
        <h1 style={{ ...loginStyles.title, color: theme.text }}>GAUNTLET AI G4</h1>
        <p style={{ ...loginStyles.tagline, color: theme.accent }}>Collab Board</p>
        <p style={{ ...loginStyles.subtitle, color: theme.textSecondary }}>Where ideas meet the wall.</p>
        <p style={{ ...loginStyles.subtitle, color: theme.textSecondary }}>
          Real-time collaboration for teams that think visually
        </p>

        {error && (
          <div role="alert" style={{
            ...loginStyles.errorBanner,
            background: isDark ? '#3b1c1c' : '#fef2f2',
            color: isDark ? '#fca5a5' : '#991b1b',
            borderColor: isDark ? '#7f1d1d' : '#fecaca',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSubmit} style={loginStyles.form}>
          <input
            type="email"
            placeholder="Email address"
            aria-label="Email address"
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
            aria-label="Password"
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
              aria-label="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle('confirm')}
              disabled={loading}
            />
          )}
          <button
            type="submit"
            style={{
              ...loginStyles.submitButton,
              ...(hoveredBtn === 'submit' ? { opacity: 0.9 } : {}),
            }}
            onMouseEnter={() => setHoveredBtn('submit')}
            onMouseLeave={() => setHoveredBtn(null)}
            disabled={loading}
          >
            {loading
              ? '...'
              : authMode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <button
          style={{ ...loginStyles.toggleLink, color: theme.accent }}
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
          <div style={{ ...loginStyles.dividerLine, background: theme.border }} />
          <span style={{ ...loginStyles.dividerText, color: theme.textMuted }}>or</span>
          <div style={{ ...loginStyles.dividerLine, background: theme.border }} />
        </div>

        <button
          onClick={handleGoogleSignIn}
          style={{
            ...loginStyles.googleButton,
            background: theme.surface,
            color: theme.text,
            borderColor: theme.border,
            ...(hoveredBtn === 'google' ? { background: theme.surfaceHover } : {}),
          }}
          onMouseEnter={() => setHoveredBtn('google')}
          onMouseLeave={() => setHoveredBtn(null)}
          disabled={loading}
        >
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
  },
  card: {
    padding: '40px',
    borderRadius: '12px',
    maxWidth: '420px',
    width: '90%',
  },
  title: {
    fontSize: '36px',
    fontWeight: 800,
    marginBottom: '4px',
    textAlign: 'center' as const,
    letterSpacing: '-0.5px',
  },
  tagline: {
    fontSize: '16px',
    fontWeight: 500,
    textAlign: 'center' as const,
    fontStyle: 'italic',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  errorBanner: {
    fontSize: '13px',
    textAlign: 'center' as const,
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid',
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
    border: '2px solid',
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
    transition: 'opacity 0.15s',
  },
  toggleLink: {
    display: 'block',
    width: '100%',
    textAlign: 'center' as const,
    background: 'none',
    border: 'none',
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
  },
  dividerText: {
    fontSize: '13px',
  },
  googleButton: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 500,
    border: '1px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'background 0.15s',
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
        <div style={{ ...badgeStyles.avatarFallback, background: theme.accent }}>{initial}</div>
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
    padding: '6px 10px',
    borderRadius: '8px',
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
