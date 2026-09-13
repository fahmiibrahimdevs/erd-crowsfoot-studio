import { useCallback } from 'react';
import { ErdGroup, TableData } from '../types/schema';
import { showToast, confirmDialog, promptDialog } from '../utils/alert';

interface UseGroupOperationsProps {
  groupsRef: React.MutableRefObject<ErdGroup[]>;
  tablesRef: React.MutableRefObject<TableData[]>;
  setSelectedGroupId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTableId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTableIds: React.Dispatch<React.SetStateAction<string[]>>;
  updateSchema: (
    newTables: any,
    newRelations?: any,
    newPositions?: Record<string, { x: number; y: number }>,
    newGroups?: (prevGroups: ErdGroup[]) => ErdGroup[]
  ) => void;
}

export function useGroupOperations({
  groupsRef,
  tablesRef,
  setSelectedGroupId,
  setSelectedTableId,
  setSelectedTableIds,
  updateSchema,
}: UseGroupOperationsProps) {
  const handleCreateGroup = useCallback(
    (tableIds: string[]) => {
      const currentTables = tablesRef.current;
      const currentGroups = groupsRef.current;
      const validIds = tableIds.filter((id) => currentTables.some((t) => t.id === id));
      if (validIds.length <= 1) {
        showToast('Select at least 2 tables to create a group', 'warning');
        return;
      }

      let groupNum = currentGroups.length + 1;
      while (
        currentGroups.some((g) => g.name.toLowerCase() === `group ${groupNum}`.toLowerCase())
      ) {
        groupNum++;
      }

      const newGroupId = `grp-${Date.now().toString(36)}`;
      const newGroup: ErdGroup = {
        id: newGroupId,
        name: `Group ${groupNum}`,
        colorTag: '#38bdf8',
        tableIds: validIds,
      };

      // Remove these tables from any existing group, and clean up empty groups
      const cleanedGroups = currentGroups
        .map((g) => ({
          ...g,
          tableIds: g.tableIds.filter((id) => !validIds.includes(id)),
        }))
        .filter((g) => g.tableIds.length > 1);

      updateSchema(
        (prev: TableData[]) => prev,
        (prev: any) => prev,
        undefined,
        () => [...cleanedGroups, newGroup]
      );

      setSelectedGroupId(newGroupId);
      setSelectedTableId(null);
      setSelectedTableIds([]);
      showToast(`Group "${newGroup.name}" created (${validIds.length} tables)`, 'success');
    },
    [groupsRef, tablesRef, setSelectedGroupId, setSelectedTableId, setSelectedTableIds, updateSchema]
  );

  const handleUngroup = useCallback(
    (groupId: string) => {
      updateSchema(
        (prev: TableData[]) => prev,
        (prev: any) => prev,
        undefined,
        (prevGroups) => (prevGroups || []).filter((g) => g.id !== groupId)
      );
      setSelectedGroupId((curr) => (curr === groupId ? null : curr));
      showToast('Group ungrouped successfully', 'info');
    },
    [setSelectedGroupId, updateSchema]
  );

  const handleRenameGroup = useCallback(
    async (groupId: string, newName?: string) => {
      const currentGroups = groupsRef.current;
      const target = currentGroups.find((g) => g.id === groupId);
      if (!target) return;

      let finalName = newName;

      // If newName is not passed (e.g. from ContextMenu / click action), prompt user via dialog
      if (finalName === undefined) {
        const inputName = await promptDialog({
          title: 'Rename Group',
          text: 'Enter a new name for this module group:',
          inputValue: target.name,
          inputPlaceholder: 'e.g. Transactions, User Management, etc...',
          confirmText: 'Save',
          cancelText: 'Cancel',
          validate: (val) => {
            const cleanVal = val.trim();
            if (!cleanVal) return 'Group name cannot be empty!';
            const exists = currentGroups.some(
              (g) => g.id !== groupId && g.name.toLowerCase() === cleanVal.toLowerCase()
            );
            if (exists) {
              return `Group name "${cleanVal}" is already used by another group! Please choose a different name.`;
            }
            return null;
          },
        });

        if (!inputName) {
          return; // User cancelled
        }
        finalName = inputName;
      }

      const clean = finalName.trim();
      if (!clean) return;
      if (clean === target.name) return;

      const isDuplicate = currentGroups.some(
        (g) => g.id !== groupId && g.name.toLowerCase() === clean.toLowerCase()
      );
      if (isDuplicate) {
        showToast(
          `Group name "${clean}" is already used by another group! Please choose a different name.`,
          'error'
        );
        return;
      }

      updateSchema(
        (prev: TableData[]) => prev,
        (prev: any) => prev,
        undefined,
        (prevGroups) =>
          (prevGroups || []).map((g) => (g.id === groupId ? { ...g, name: clean } : g))
      );
      showToast(`Group renamed to "${clean}"`, 'success');
    },
    [groupsRef, updateSchema]
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      const currentGroups = groupsRef.current;
      const target = currentGroups.find((g) => g.id === groupId);
      if (!target) return;

      const confirmed = await confirmDialog({
        title: 'Delete Group & All Tables?',
        text: `Are you sure you want to delete group "${target.name}" and all ${target.tableIds.length} tables inside it?`,
        confirmText: 'Yes, Delete',
        cancelText: 'Cancel',
        isDangerous: true,
      });

      if (!confirmed) return;

      const deletedSet = new Set(target.tableIds);

      updateSchema(
        (prev: TableData[]) => prev.filter((t) => !deletedSet.has(t.id)),
        (prev: any[]) =>
          prev.filter((r) => !deletedSet.has(r.sourceTableId) && !deletedSet.has(r.targetTableId)),
        undefined,
        (prevGroups) => (prevGroups || []).filter((g) => g.id !== groupId)
      );

      setSelectedGroupId((curr) => (curr === groupId ? null : curr));
      setSelectedTableId(null);
      setSelectedTableIds([]);
      showToast(
        `Group "${target.name}" and ${target.tableIds.length} tables deleted`,
        'info'
      );
    },
    [groupsRef, setSelectedGroupId, setSelectedTableId, setSelectedTableIds, updateSchema]
  );

  const handleUpdateGroupColor = useCallback(
    (groupId: string, colorTag: string) => {
      updateSchema(
        (prev: TableData[]) => prev,
        (prev: any) => prev,
        undefined,
        (prevGroups) =>
          (prevGroups || []).map((g) => (g.id === groupId ? { ...g, colorTag } : g))
      );
      showToast('Group color updated', 'success');
    },
    [updateSchema]
  );

  return {
    handleCreateGroup,
    handleUngroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleUpdateGroupColor,
  };
}
