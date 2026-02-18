// src/hooks/usePresence.ts

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserPresence } from '../types';

export const usePresence = (boardId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    const presenceRef = collection(db, 'boards', boardId, 'presence');
    const q = query(presenceRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: UserPresence[] = [];
      const now = Date.now();
      
      snapshot.forEach((doc) => {
        const data = doc.data() as UserPresence;
        // Consider user online if seen in last 30 seconds
        if (data.online && (now - data.lastSeen) < 30000) {
          users.push({ userId: doc.id, ...data });
        }
      });
      setOnlineUsers(users);
    });

    return () => unsubscribe();
  }, [boardId]);

  return onlineUsers;
};
