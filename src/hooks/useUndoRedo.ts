import { useRef, useState, useCallback } from 'react';
import { BoardObject } from '../types';

export type ActionType = 'create' | 'update' | 'delete';

export interface UndoAction {
  type: ActionType;
  objectId: string;
  before: Partial<BoardObject> | null;
  after: Partial<BoardObject> | null;
  fullObject?: any; // full snapshot for create/delete reversal
}

const MAX_HISTORY = 50;

export function useUndoRedo() {
  const undoStack = useRef<UndoAction[]>([]);
  const redoStack = useRef<UndoAction[]>([]);
  const [, forceUpdate] = useState(0);

  const pushAction = useCallback((action: UndoAction) => {
    undoStack.current.push(action);
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }
    redoStack.current = [];
    forceUpdate((n) => n + 1);
  }, []);

  const undo = useCallback((): UndoAction | null => {
    const action = undoStack.current.pop();
    if (!action) return null;
    redoStack.current.push(action);
    forceUpdate((n) => n + 1);
    return action;
  }, []);

  const redo = useCallback((): UndoAction | null => {
    const action = redoStack.current.pop();
    if (!action) return null;
    undoStack.current.push(action);
    forceUpdate((n) => n + 1);
    return action;
  }, []);

  return {
    pushAction,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}
