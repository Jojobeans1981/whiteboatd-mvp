// src/App.tsx

import React from 'react';
import { useAuth } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { Board } from './components/Board';

const BOARD_ID = 'demo-board-1'; // Default board for MVP

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loading}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    return <Auth user={user} />;
  }

  return (
    <>
      <Auth user={user} />
      <Board boardId={BOARD_ID} user={user} />
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666',
  },
};

export default App;
