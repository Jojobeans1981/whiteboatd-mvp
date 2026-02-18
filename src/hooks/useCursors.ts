// src/hooks/useCursors.ts

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CursorPosition } from '../types';

export const useCursors = (boardId: string, currentUserId: string | null) => {
  const [cursors, setCursors] = useState<CursorPosition[]>([]);

  useEffect(() => {
    if (!currentUserId) return;

    const cursorsRef = collection(db, 'boards', boardId, 'cursors');
    const q = query(cursorsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cursorsData: CursorPosition[] = [];
      snapshot.forEach((doc) => {
        // Don't show our own cursor
        if (doc.id !== currentUserId) {
          cursorsData.push({ userId: doc.id, ...doc.data() } as CursorPosition);
        }
      });
      setCursors(cursorsData);
    });

    return () => unsubscribe();
  }, [boardId, currentUserId]);

  return cursors;
};
