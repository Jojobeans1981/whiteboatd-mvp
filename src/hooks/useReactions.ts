import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Reaction } from '../types';

export function useReactions(boardId: string, objectId: string | null) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    if (!objectId) { setReactions([]); return; }
    const q = query(collection(db, 'boards', boardId, 'objects', objectId, 'reactions'));
    const unsub = onSnapshot(q, (snap) => {
      setReactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reaction)));
    });
    return unsub;
  }, [boardId, objectId]);

  const toggleReaction = useCallback(async (emoji: string, userId: string, userName: string) => {
    if (!objectId) return;
    const reactionsRef = collection(db, 'boards', boardId, 'objects', objectId, 'reactions');
    const snap = await getDocs(reactionsRef);
    const existing = snap.docs.find(d => d.data().emoji === emoji && d.data().userId === userId);

    const objectRef = doc(db, 'boards', boardId, 'objects', objectId);

    if (existing) {
      await deleteDoc(doc(reactionsRef, existing.id));
      // Update denormalized count
      const counts: Record<string, number> = {};
      snap.docs.filter(d => d.id !== existing.id).forEach(d => {
        const e = d.data().emoji;
        counts[e] = (counts[e] || 0) + 1;
      });
      await updateDoc(objectRef, { reactions: counts });
    } else {
      const reactionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      await setDoc(doc(reactionsRef, reactionId), {
        emoji,
        userId,
        userName,
        createdAt: Date.now(),
      });
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const e = d.data().emoji;
        counts[e] = (counts[e] || 0) + 1;
      });
      counts[emoji] = (counts[emoji] || 0) + 1;
      await updateDoc(objectRef, { reactions: counts });
    }
  }, [boardId, objectId]);

  return { reactions, toggleReaction };
}
