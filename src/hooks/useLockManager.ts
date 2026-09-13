import { useState, useCallback, useRef } from 'react';
import { ErdGroup } from '../types/schema';
import { showToast } from '../utils/alert';

const LOCKED_NODES_KEY = 'er_studio_locked_nodes';

export function useLockManager(groupsRef: React.MutableRefObject<ErdGroup[]>) {
  const [lockedNodeIds, setLockedNodeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCKED_NODES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const lockedNodeIdsRef = useRef(lockedNodeIds);
  lockedNodeIdsRef.current = lockedNodeIds;

  // Toggle Lock/Unlock position for tables or groups (Cascading group locking to member tables)
  const handleToggleLock = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      setLockedNodeIds((prev) => {
        // Expand any group IDs in nodeIds to also include their member tableIds
        const allTargetIds = new Set<string>();
        nodeIds.forEach((id) => {
          allTargetIds.add(id);
          const group = groupsRef.current.find((g) => g.id === id);
          if (group) {
            group.tableIds.forEach((tId) => allTargetIds.add(tId));
          }
        });
        const targetArray = Array.from(allTargetIds);

        const allLocked = targetArray.every((id) => prev.includes(id));
        let next: string[];
        if (allLocked) {
          next = prev.filter((id) => !targetArray.includes(id));
          const isSingleGroup =
            nodeIds.length === 1 && groupsRef.current.some((g) => g.id === nodeIds[0]);
          showToast(
            isSingleGroup
              ? 'Group and its member tables unlocked'
              : `Unlocked ${nodeIds.length} elements`,
            'info'
          );
        } else {
          const set = new Set([...prev, ...targetArray]);
          next = Array.from(set);
          const isSingleGroup =
            nodeIds.length === 1 && groupsRef.current.some((g) => g.id === nodeIds[0]);
          showToast(
            isSingleGroup
              ? 'Group and its member tables locked'
              : `Locked ${nodeIds.length} elements`,
            'info'
          );
        }
        try {
          localStorage.setItem(LOCKED_NODES_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [groupsRef]
  );

  const isTableLocked = useCallback(
    (tableId: string): boolean => {
      if (lockedNodeIdsRef.current.includes(tableId)) return true;
      const parentGroup = groupsRef.current.find((g) => g.tableIds.includes(tableId));
      if (parentGroup && lockedNodeIdsRef.current.includes(parentGroup.id)) return true;
      return false;
    },
    [groupsRef]
  );

  const isGroupLocked = useCallback(
    (groupId: string, memberTableIds: string[] = []): boolean => {
      if (lockedNodeIdsRef.current.includes(groupId)) return true;
      if (
        memberTableIds.length > 0 &&
        memberTableIds.every((tId) => lockedNodeIdsRef.current.includes(tId))
      ) {
        return true;
      }
      return false;
    },
    []
  );

  return {
    lockedNodeIds,
    setLockedNodeIds,
    lockedNodeIdsRef,
    handleToggleLock,
    isTableLocked,
    isGroupLocked,
  };
}
