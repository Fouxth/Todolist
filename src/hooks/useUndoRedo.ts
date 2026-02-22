import { useState, useCallback, useRef } from 'react';
import type { UndoAction } from '@/types';

const MAX_HISTORY = 50;

export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const isUndoingRef = useRef(false);

  const pushAction = useCallback((action: UndoAction) => {
    if (isUndoingRef.current) return;
    setUndoStack(prev => [...prev.slice(-MAX_HISTORY + 1), action]);
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  const undo = useCallback(async () => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;

    isUndoingRef.current = true;
    try {
      await action.undo();
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, action]);
    } catch (error) {
      console.error('Undo failed:', error);
    } finally {
      isUndoingRef.current = false;
    }
  }, [undoStack]);

  const redo = useCallback(async () => {
    const action = redoStack[redoStack.length - 1];
    if (!action) return;

    isUndoingRef.current = true;
    try {
      await action.redo();
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => [...prev, action]);
    } catch (error) {
      console.error('Redo failed:', error);
    } finally {
      isUndoingRef.current = false;
    }
  }, [redoStack]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const lastAction = undoStack[undoStack.length - 1] || null;

  return { pushAction, undo, redo, canUndo, canRedo, lastAction, undoStack, redoStack };
}
