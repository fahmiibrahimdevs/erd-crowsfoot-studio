import { useState, useCallback, useRef } from 'react';
import { TableData, RelationshipData, ErdGroup } from '../types/schema';

export interface HistoryState {
  tables: TableData[];
  relations: RelationshipData[];
  groups?: ErdGroup[];
  positions?: Record<string, { x: number; y: number }>;
}

const MAX_HISTORY = 50;

export function useHistory(initialState: HistoryState) {
  const [past, setPast] = useState<HistoryState[]>([]);
  const [present, setPresent] = useState<HistoryState>(initialState);
  const [future, setFuture] = useState<HistoryState[]>([]);

  const presentRef = useRef(present);
  presentRef.current = present;

  const pastRef = useRef(past);
  pastRef.current = past;

  const futureRef = useRef(future);
  futureRef.current = future;

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Record a new state snapshot
  const commit = useCallback(
    (
      newStateOrUpdater: HistoryState | ((prev: HistoryState) => HistoryState),
      skipHistory = false
    ) => {
      const current = presentRef.current;
      const newState =
        typeof newStateOrUpdater === 'function'
          ? newStateOrUpdater(current)
          : newStateOrUpdater;

      // Skip if identical to prevent redundant history stack growth
      if (
        JSON.stringify({
          tables: current.tables,
          relations: current.relations,
          groups: current.groups || [],
          positions: current.positions,
        }) ===
        JSON.stringify({
          tables: newState.tables,
          relations: newState.relations,
          groups: newState.groups || [],
          positions: newState.positions,
        })
      ) {
        return;
      }

      if (!skipHistory) {
        setPast((prev) => {
          const next = [...prev, current];
          if (next.length > MAX_HISTORY) {
            return next.slice(next.length - MAX_HISTORY);
          }
          return next;
        });
        setFuture([]);
      }

      setPresent(newState);
    },
    []
  );

  // Step back to previous state
  const undo = useCallback((): HistoryState | null => {
    if (pastRef.current.length === 0) return null;

    const previous = pastRef.current[pastRef.current.length - 1];
    const newPast = pastRef.current.slice(0, -1);

    setPast(newPast);
    setFuture((prev) => [presentRef.current, ...prev]);
    setPresent(previous);

    return previous;
  }, []);

  // Step forward to next state
  const redo = useCallback((): HistoryState | null => {
    if (futureRef.current.length === 0) return null;

    const next = futureRef.current[0];
    const newFuture = futureRef.current.slice(1);

    setPast((prev) => [...prev, presentRef.current]);
    setFuture(newFuture);
    setPresent(next);

    return next;
  }, []);

  // Reset entire history (e.g. on new project load)
  const resetHistory = useCallback((state: HistoryState) => {
    setPast([]);
    setFuture([]);
    setPresent(state);
  }, []);

  return {
    state: present,
    commit,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
    pastCount: past.length,
    futureCount: future.length,
  };
}
