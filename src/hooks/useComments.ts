import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, orderBy, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Comment } from '../types';

export function useComments(boardId: string, objectId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!objectId) { setComments([]); return; }
    setLoading(true);
    const q = query(
      collection(db, 'boards', boardId, 'objects', objectId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
      setLoading(false);
    });
    return unsub;
  }, [boardId, objectId]);

  const addComment = useCallback(async (text: string, userId: string, userName: string, userPhotoURL?: string) => {
    if (!objectId || !text.trim()) return;
    const commentId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const now = Date.now();
    await setDoc(doc(db, 'boards', boardId, 'objects', objectId, 'comments', commentId), {
      text: text.trim(),
      userId,
      userName,
      ...(userPhotoURL ? { userPhotoURL } : {}),
      createdAt: now,
      updatedAt: now,
    });
    await updateDoc(doc(db, 'boards', boardId, 'objects', objectId), {
      commentCount: increment(1),
    });
  }, [boardId, objectId]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!objectId) return;
    await deleteDoc(doc(db, 'boards', boardId, 'objects', objectId, 'comments', commentId));
    await updateDoc(doc(db, 'boards', boardId, 'objects', objectId), {
      commentCount: increment(-1),
    });
  }, [boardId, objectId]);

  return { comments, loading, addComment, deleteComment };
}
