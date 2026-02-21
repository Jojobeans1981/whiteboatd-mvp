
// src/App.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginScreen } from './components/Auth';
import { Board } from './components/Board';
import { LandingPage } from './components/LandingPage';

function getBoardIdFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('board') || null;
}

function App() {
  const { user, loading } = useAuth();
  const [boardId, setBoardId] = useState<string | null>(getBoardIdFromURL);

  useEffect(() => {
    const handlePopState = () => {
      setBoardId(getBoardIdFromURL());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToBoard = useCallback((id: string) => {
    setBoardId(id);
    window.history.pushState({}, '', `?board=${id}`);
  }, []);

  const navigateToLanding = useCallback(() => {
    setBoardId(null);
    window.history.pushState({}, '', window.location.pathname);
  }, []);

  if (loading) {
    return (
      <div style={styles.loading}>
        <h1 style={styles.loadingTitle}>Whiteboard</h1>
        <p style={styles.loadingSubtext}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!boardId) {
    return <LandingPage user={user} onNavigateToBoard={navigateToBoard} />;
  }

  return (
    <ThemeProvider>
      <Board boardId={boardId} user={user} onBackToLanding={navigateToLanding} />
    </ThemeProvider>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gap: '8px',
  },
  loadingTitle: {
    fontSize: '36px',
    fontWeight: 800,
    color: 'white',
    letterSpacing: '-0.5px',
    margin: 0,
  },
  loadingSubtext: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
  },
};

export default App;
