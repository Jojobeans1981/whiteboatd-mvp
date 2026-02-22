import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BoardObject } from '../types';

export interface UserTemplate {
  id: string;
  name: string;
  description: string;
  objects: Omit<BoardObject, 'id'>[];
  createdAt: number;
}

export function useUserTemplates(userId: string | undefined) {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const q = query(collection(db, 'users', userId, 'templates'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserTemplate)));
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  const saveTemplate = useCallback(async (name: string, description: string, objects: BoardObject[]) => {
    if (!userId || objects.length === 0) return;
    const minX = Math.min(...objects.map(o => o.x));
    const minY = Math.min(...objects.map(o => o.y));
    const normalized = objects.map(({ id, ...rest }) => ({
      ...rest,
      x: rest.x - minX,
      y: rest.y - minY,
    }));
    const templateId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    await setDoc(doc(db, 'users', userId, 'templates', templateId), {
      name,
      description,
      objects: normalized,
      createdAt: Date.now(),
    });
  }, [userId]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'templates', templateId));
  }, [userId]);

  return { templates, loading, saveTemplate, deleteTemplate };
}
