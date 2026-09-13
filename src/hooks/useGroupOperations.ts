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
        showToast('Pilih minimal 2 tabel untuk membuat grup', 'warning');
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
      showToast(`Grup "${newGroup.name}" berhasil dibuat (${validIds.length} tabel)`, 'success');
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
      showToast('Grup berhasil dibubarkan (Ungroup)', 'info');
    },
    [setSelectedGroupId, updateSchema]
  );

  const handleRenameGroup = useCallback(
    async (groupId: string, newName?: string) => {
      const currentGroups = groupsRef.current;
      const target = currentGroups.find((g) => g.id === groupId);
      if (!target) return;

      let finalName = newName;

      // Jika newName tidak dipassing (misal dari ContextMenu / action klik), minta input via SweetAlert2 prompt dialog
      if (finalName === undefined) {
        const inputName = await promptDialog({
          title: 'Ganti Nama Grup',
          text: 'Masukkan nama baru untuk grup modul ini:',
          inputValue: target.name,
          inputPlaceholder: 'Contoh: Modul Transaksi, Modul User, dll...',
          confirmText: 'Ya, Ubah',
          cancelText: 'Batal',
          validate: (val) => {
            const cleanVal = val.trim();
            if (!cleanVal) return 'Nama grup tidak boleh kosong!';
            const exists = currentGroups.some(
              (g) => g.id !== groupId && g.name.toLowerCase() === cleanVal.toLowerCase()
            );
            if (exists) {
              return `Nama grup "${cleanVal}" sudah digunakan oleh grup lain! Silakan gunakan nama lain.`;
            }
            return null;
          },
        });

        if (!inputName) {
          return; // Pengguna menekan Batal
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
          `Nama grup "${clean}" sudah digunakan oleh grup lain! Silakan gunakan nama lain.`,
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
      showToast(`Nama grup diubah menjadi "${clean}"`, 'success');
    },
    [groupsRef, updateSchema]
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      const currentGroups = groupsRef.current;
      const target = currentGroups.find((g) => g.id === groupId);
      if (!target) return;

      const confirmed = await confirmDialog({
        title: 'Hapus Grup & Seluruh Tabel?',
        text: `Apakah Anda yakin ingin menghapus grup "${target.name}" beserta ${target.tableIds.length} tabel di dalamnya?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
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
        `Grup "${target.name}" beserta ${target.tableIds.length} tabel telah dihapus`,
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
      showToast('Warna grup diperbarui', 'success');
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
