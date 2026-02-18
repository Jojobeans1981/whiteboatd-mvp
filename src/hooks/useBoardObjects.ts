// src/hooks/useBoardObjects.ts

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BoardObject } from '../types';

export const useBoardObjects = (boardId: string) => {
  const [objects, setObjects] = useState<BoardObject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const objectsRef = collection(db, 'boards', boardId, 'objects');
    const q = query(objectsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const objectsData: BoardObject[] = [];
      snapshot.forEach((doc) => {
        objectsData.push({ id: doc.id, ...doc.data() } as BoardObject);
      });
      setObjects(objectsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [boardId]);

  return { objects, loading };
};
