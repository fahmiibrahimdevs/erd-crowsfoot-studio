import { useEffect } from 'react';
import { TableData, ErdGroup } from '../types/schema';
import { showToast, confirmDialog } from '../utils/alert';

interface UseKeyboardShortcutsProps {
  tables: TableData[];
  groups: ErdGroup[];
  selectedTableId: string | null;
  selectedTableIds: string[];
  selectedGroupId: string | null;
  selectedRelationId: string | null;
  isImportOpen: boolean;
  isExportOpen: boolean;
  isTemplatesOpen: boolean;
  isCommandPaletteOpen: boolean;
  isPresentationMode: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedRelationId: React.Dispatch<React.SetStateAction<string | null>>;
  handleUndo: () => void;
  handleRedo: () => void;
  handleToggleLock: (nodeIds: string[]) => void;
  handleCreateGroup: (tableIds: string[]) => void;
  handleUngroup: (groupId: string) => void;
  handleDeleteGroup: (groupId: string) => void;
  handleDeleteTable: (tableId: string) => void;
  handleBatchDeleteTables: (tableIds: string[]) => void;
  handleStartPresentation: () => void;
  handleExitPresentation: () => void;
  updateSchema: (
    newTables: any,
    newRelations?: any,
    newPositions?: Record<string, { x: number; y: number }>
  ) => void;
}

export function useKeyboardShortcuts({
  tables,
  groups,
  selectedTableId,
  selectedTableIds,
  selectedGroupId,
  selectedRelationId,
  isImportOpen,
  isExportOpen,
  isTemplatesOpen,
  isCommandPaletteOpen,
  isPresentationMode,
  setIsCommandPaletteOpen,
  setSelectedRelationId,
  handleUndo,
  handleRedo,
  handleToggleLock,
  handleCreateGroup,
  handleUngroup,
  handleDeleteGroup,
  handleDeleteTable,
  handleBatchDeleteTables,
  handleStartPresentation,
  handleExitPresentation,
  updateSchema,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Spotlight Command Palette Shortcut (Ctrl+K / Cmd+K)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          Boolean(target.closest('input')) ||
          Boolean(target.closest('textarea')) ||
          Boolean(target.closest('[contenteditable="true"]')))
      ) {
        return;
      }

      // If a modal dialog or command palette is open, don't execute canvas shortcuts
      if (isImportOpen || isExportOpen || isTemplatesOpen || isCommandPaletteOpen) {
        return;
      }

      // Lock / Unlock Shortcut (Ctrl+Shift+L)
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (selectedGroupId) {
          handleToggleLock([selectedGroupId]);
        } else if (selectedTableIds.length > 0) {
          handleToggleLock(selectedTableIds);
        } else if (selectedTableId) {
          handleToggleLock([selectedTableId]);
        }
        return;
      }

      // Grouping Shortcuts (Ctrl+G to Group, Ctrl+Shift+G to Ungroup)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          // Ungroup
          if (selectedGroupId) {
            handleUngroup(selectedGroupId);
          } else if (selectedTableId || selectedTableIds.length > 0) {
            const activeId = selectedTableId || selectedTableIds[0];
            const foundGroup = groups.find((g) => g.tableIds.includes(activeId));
            if (foundGroup) {
              handleUngroup(foundGroup.id);
            }
          }
        } else {
          // Create Group
          if (selectedTableIds.length > 1) {
            handleCreateGroup(selectedTableIds);
          }
        }
        return;
      }

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isImportOpen || isExportOpen || isTemplatesOpen) {
          return;
        }

        // 1. If a relation is currently selected: delete instantly
        if (selectedRelationId) {
          e.preventDefault();
          const relId = selectedRelationId;
          updateSchema(
            (prev: TableData[]) => prev,
            (prev: any[]) => prev.filter((r) => r.id !== relId)
          );
          setSelectedRelationId(null);
          showToast('Relasi foreign key berhasil dihapus', 'info');
          return;
        }

        // 2. If a group is currently selected: delete group & tables confirmation
        if (selectedGroupId) {
          e.preventDefault();
          const groupToDelete = groups.find((g) => g.id === selectedGroupId);
          if (groupToDelete) {
            confirmDialog({
              title: `Hapus Grup "${groupToDelete.name}"?`,
              text: `Apakah Anda yakin ingin menghapus grup beserta seluruh ${groupToDelete.tableIds.length} tabel di dalamnya?`,
              confirmText: 'Ya, Hapus Grup & Tabel',
              isDangerous: true,
            }).then((confirmed) => {
              if (confirmed) {
                handleDeleteGroup(groupToDelete.id);
              }
            });
          }
          return;
        }

        // 3. If multiple tables are selected: batch confirmation dialog
        if (selectedTableIds.length > 1) {
          e.preventDefault();
          confirmDialog({
            title: `Hapus ${selectedTableIds.length} Tabel?`,
            text: `Apakah Anda yakin ingin menghapus ${selectedTableIds.length} tabel yang dipilih beserta seluruh relasinya?`,
            confirmText: 'Ya, Hapus Semua',
            isDangerous: true,
          }).then((confirmed) => {
            if (confirmed) {
              handleBatchDeleteTables(selectedTableIds);
            }
          });
          return;
        }

        // 4. If a single table is currently selected: quick confirmation dialog
        if (selectedTableId || selectedTableIds.length === 1) {
          e.preventDefault();
          const tableId = selectedTableId || selectedTableIds[0];
          const targetTable = tables.find((t) => t.id === tableId);
          if (targetTable) {
            confirmDialog({
              title: 'Hapus Tabel?',
              text: `Apakah Anda yakin ingin menghapus tabel "${targetTable.name}" beserta seluruh relasinya?`,
              confirmText: 'Ya, Hapus Tabel',
              isDangerous: true,
            }).then((confirmed) => {
              if (confirmed) {
                handleDeleteTable(tableId);
                showToast(`Tabel "${targetTable.name}" telah dihapus`, 'info');
              }
            });
          }
          return;
        }
      }

      // Alt+P: Toggle Presentation Mode
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (isPresentationMode) {
          handleExitPresentation();
        } else {
          handleStartPresentation();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    groups,
    handleBatchDeleteTables,
    handleCreateGroup,
    handleDeleteGroup,
    handleDeleteTable,
    handleExitPresentation,
    handleRedo,
    handleStartPresentation,
    handleToggleLock,
    handleUndo,
    handleUngroup,
    isCommandPaletteOpen,
    isExportOpen,
    isImportOpen,
    isPresentationMode,
    isTemplatesOpen,
    selectedGroupId,
    selectedRelationId,
    selectedTableId,
    selectedTableIds,
    setIsCommandPaletteOpen,
    setSelectedRelationId,
    tables,
    updateSchema,
  ]);
}
