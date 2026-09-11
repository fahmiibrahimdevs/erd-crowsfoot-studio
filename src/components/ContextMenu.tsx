import React, { useEffect, useRef } from 'react';
import {
  Layers,
  Ungroup,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Plus,
  Code2,
  Sparkles,
  FileCode,
  Edit2,
} from 'lucide-react';
import { TableData, ErdGroup } from '../types/schema';

export interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  targetType: 'canvas' | 'table' | 'group' | 'multi';
  targetId: string | null;
  selectedTableIds: string[];
  selectedGroupId: string | null;
  tables: TableData[];
  groups: ErdGroup[];
  lockedNodeIds: string[];
  onGroupSelection: () => void;
  onUngroup: (groupId: string) => void;
  onToggleLock: (nodeIds: string[]) => void;
  onDuplicateTables: (tableIds: string[]) => void;
  onDeleteSelected: () => void;
  onAddColumn: (tableId: string) => void;
  onCopySql: (tableId: string) => void;
  onRenameGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddTable: () => void;
  onAutoLayout: () => void;
  onOpenImportModal: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose,
  targetType,
  targetId,
  selectedTableIds,
  selectedGroupId,
  tables,
  groups,
  lockedNodeIds,
  onGroupSelection,
  onUngroup,
  onToggleLock,
  onDuplicateTables,
  onDeleteSelected,
  onAddColumn,
  onCopySql,
  onRenameGroup,
  onDeleteGroup,
  onAddTable,
  onAutoLayout,
  onOpenImportModal,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalPointerDown = (e: PointerEvent | MouseEvent) => {
      // Tutup context menu jika pengguna mengklik di luar menu
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // Gunakan capture phase (true) agar event tertangkap meskipun child/canvas memanggil stopPropagation
      window.addEventListener('pointerdown', handleGlobalPointerDown, true);
      window.addEventListener('mousedown', handleGlobalPointerDown, true);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('pointerdown', handleGlobalPointerDown, true);
      window.removeEventListener('mousedown', handleGlobalPointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Viewport clamping to prevent context menu overflowing window
  const menuWidth = 260;
  const menuHeight = 280;
  const clampedX = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 16));
  const clampedY = Math.max(12, Math.min(y, window.innerHeight - menuHeight - 16));

  // Relevant IDs for action
  const activeTableIds =
    targetType === 'multi'
      ? selectedTableIds
      : targetType === 'table' && targetId
      ? [targetId]
      : selectedTableIds.length > 0
      ? selectedTableIds
      : [];

  const activeGroupId =
    targetType === 'group'
      ? targetId || selectedGroupId
      : selectedGroupId;

  const isAllTargetLocked =
    targetType === 'group'
      ? activeGroupId ? lockedNodeIds.includes(activeGroupId) : false
      : activeTableIds.length > 0
      ? activeTableIds.every((id) => lockedNodeIds.includes(id))
      : false;

  return (
    <div
      ref={menuRef}
      style={{ top: clampedY, left: clampedX }}
      className="fixed z-50 min-w-[240px] max-w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 space-y-0.5 transition-all text-slate-800 dark:text-slate-200 text-xs font-medium animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      {/* MULTI SELECTION CONTEXT */}
      {targetType === 'multi' && (
        <>
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
            {selectedTableIds.length} Tabel Terpilih
          </div>

          <button
            type="button"
            onClick={() => {
              onGroupSelection();
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Layers className="w-4 h-4 shrink-0 text-sky-500" />
              <span className="whitespace-nowrap font-medium text-xs">Gabungkan Jadi Grup</span>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              Ctrl+G
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleLock(activeTableIds);
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isAllTargetLocked ? (
                <>
                  <Unlock className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="whitespace-nowrap font-medium text-xs">Buka Kunci (Unlock)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="whitespace-nowrap font-medium text-xs">Kunci Posisi (Lock)</span>
                </>
              )}
            </div>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              Ctrl+Shift+L
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDuplicateTables(activeTableIds);
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Copy className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="whitespace-nowrap font-medium text-xs">Duplikat Tabel</span>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              Ctrl+D
            </span>
          </button>

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-1" />

          <button
            type="button"
            onClick={() => {
              onDeleteSelected();
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap font-medium text-xs">Hapus {selectedTableIds.length} Tabel</span>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-rose-500/80 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              Del
            </span>
          </button>
        </>
      )}

      {/* SINGLE TABLE CONTEXT */}
      {targetType === 'table' && targetId && (
        <>
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate whitespace-nowrap">
            {tables.find((t) => t.id === targetId)?.name || 'Tabel'}
          </div>

          <button
            type="button"
            onClick={() => {
              onAddColumn(targetId);
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Plus className="w-4 h-4 shrink-0 text-sky-500" />
              <span className="whitespace-nowrap font-medium text-xs">Tambah Kolom</span>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              +
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleLock([targetId]);
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {lockedNodeIds.includes(targetId) ? (
                <>
                  <Unlock className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="whitespace-nowrap font-medium text-xs">Buka Kunci (Unlock)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="whitespace-nowrap font-medium text-xs">Kunci Posisi (Lock)</span>
                </>
              )}
            </div>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              Ctrl+Shift+L
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDuplicateTables([targetId]);
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Copy className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="whitespace-nowrap font-medium text-xs">Duplikat Tabel</span>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              Ctrl+D
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCopySql(targetId);
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Code2 className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="whitespace-nowrap font-medium text-xs">Salin SQL CREATE</span>
            </div>
          </button>

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-1" />

          <button
            type="button"
            onClick={() => {
              onDeleteSelected();
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap font-medium text-xs">Hapus Tabel</span>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-rose-500/80 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              Del
            </span>
          </button>
        </>
      )}

      {/* GROUP CONTEXT */}
      {targetType === 'group' && activeGroupId && (
        <>
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate whitespace-nowrap">
            {groups.find((g) => g.id === activeGroupId)?.name || 'Grup Modul'}
          </div>

          <button
            type="button"
            onClick={() => {
              onUngroup(activeGroupId);
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Ungroup className="w-4 h-4 shrink-0 text-sky-500" />
              <span className="whitespace-nowrap font-medium text-xs">Bubarkan Grup (Ungroup)</span>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              Ctrl+Shift+G
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRenameGroup(activeGroupId);
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Edit2 className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="whitespace-nowrap font-medium text-xs">Ganti Nama Grup</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleLock([activeGroupId]);
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {lockedNodeIds.includes(activeGroupId) ? (
                <>
                  <Unlock className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="whitespace-nowrap font-medium text-xs">Buka Kunci (Unlock)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="whitespace-nowrap font-medium text-xs">Kunci Grup (Lock)</span>
                </>
              )}
            </div>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              Ctrl+Shift+L
            </span>
          </button>

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-1" />

          <button
            type="button"
            onClick={() => {
              onDeleteGroup(activeGroupId);
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap font-medium text-xs">Hapus Grup & Isinya</span>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-rose-500/80 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              Del
            </span>
          </button>
        </>
      )}

      {/* BLANK CANVAS CONTEXT */}
      {targetType === 'canvas' && (
        <>
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Canvas Diagram
          </div>

          <button
            type="button"
            onClick={() => {
              onAddTable();
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Plus className="w-4 h-4 shrink-0 text-sky-500" />
              <span className="whitespace-nowrap font-medium text-xs">Tambah Tabel Baru</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onAutoLayout();
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 shrink-0 text-sky-500" />
              <span className="whitespace-nowrap font-medium text-xs">Rapikan Otomatis (Auto-Layout)</span>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              Ctrl+L
            </span>
          </button>

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-1" />

          <button
            type="button"
            onClick={() => {
              onOpenImportModal();
              onClose();
            }}
            className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FileCode className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="whitespace-nowrap font-medium text-xs">Import SQL DDL</span>
            </div>
          </button>
        </>
      )}
    </div>
  );
};
