import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BoardMetadata, BoardRole, BoardMember } from '../types';

export function useBoardMetadata(boardId: string, userId: string, userName: string, userEmail: string) {
  const [metadata, setMetadata] = useState<BoardMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, 'boards', boardId);
    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        setMetadata({ id: snap.id, ...snap.data() } as BoardMetadata);
      } else {
        // Auto-create board metadata with current user as owner
        const newMeta: Omit<BoardMetadata, 'id'> = {
          name: `Board ${boardId.slice(0, 6)}`,
          ownerId: userId,
          ownerName: userName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          members: {
            [userId]: {
              role: 'owner',
              name: userName,
              email: userEmail,
              addedAt: Date.now(),
            },
          },
        };
        await setDoc(ref, newMeta);
        setMetadata({ id: boardId, ...newMeta });
      }
      setLoading(false);
    });
    return unsub;
  }, [boardId, userId, userName, userEmail]);

  const role: BoardRole = metadata?.members?.[userId]?.role || (metadata?.ownerId === userId ? 'owner' : 'editor');

  const addMember = useCallback(async (email: string, memberName: string, memberRole: BoardRole) => {
    // Use email as a simple key (replace dots/special chars for Firestore key)
    const memberKey = email.replace(/[.@]/g, '_');
    const ref = doc(db, 'boards', boardId);
    await updateDoc(ref, {
      [`members.${memberKey}`]: {
        role: memberRole,
        name: memberName,
        email,
        addedAt: Date.now(),
      } as BoardMember,
      updatedAt: Date.now(),
    });
  }, [boardId]);

  const removeMember = useCallback(async (memberKey: string) => {
    const ref = doc(db, 'boards', boardId);
    await updateDoc(ref, {
      [`members.${memberKey}`]: deleteField(),
      updatedAt: Date.now(),
    });
  }, [boardId]);

  const changeMemberRole = useCallback(async (memberKey: string, newRole: BoardRole) => {
    const ref = doc(db, 'boards', boardId);
    await updateDoc(ref, {
      [`members.${memberKey}.role`]: newRole,
      updatedAt: Date.now(),
    });
  }, [boardId]);

  return { metadata, loading, role, addMember, removeMember, changeMemberRole };
}
