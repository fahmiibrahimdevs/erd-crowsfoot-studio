import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Key,
  Database,
  Code2,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Info,
  GitFork,
  ArrowRight,
  RotateCcw,
  MoveHorizontal,
  Boxes,
  Lock,
  Unlock,
  Edit3,
} from 'lucide-react';
import {
  TableData,
  ColumnData,
  RelationshipData,
  ErdGroup,
  SqlDialect,
  COMMON_DATA_TYPES,
  TABLE_COLOR_PRESETS,
  Cardinality,
  CrowsFootMarker,
  EndpointMarkerType,
  ReferentialAction,
} from '../types/schema';
import { generateSql } from '../utils/sqlGenerator';
import { SearchableSelect } from './SearchableSelect';
import { EnumPillEditor } from './EnumPillEditor';
import { confirmDialog, showToast } from '../utils/alert';

interface InspectorProps {
  selectedTable: TableData | null;
  selectedRelation: RelationshipData | null;
  selectedTables?: TableData[];
  selectedGroup?: ErdGroup | null;
  tables: TableData[];
  relations: RelationshipData[];
  dialect: SqlDialect;
  lockedNodeIds?: string[];
  onToggleLock?: (nodeIds: string[]) => void;
  onClose: () => void;
  onDeselectTable?: (tableId: string) => void;
  onUpdateTable: (updatedTable: TableData) => void;
  onDeleteTable: (tableId: string) => void;
  onBatchDeleteTables?: (tableIds: string[]) => void;
  onBatchUpdateColor?: (tableIds: string[], colorTag: string) => void;
  onCreateGroup?: (tableIds: string[]) => void;
  onUngroup?: (groupId: string) => void;
  onRenameGroup?: (groupId: string, newName: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onUpdateGroupColor?: (groupId: string, colorTag: string) => void;
  onUpdateRelation: (updatedRelation: RelationshipData) => void;
  onDeleteRelation: (relationId: string) => void;
  onGenerateJunctionTable?: (sourceTableId: string, targetTableId: string, relationId: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedTable,
  selectedRelation,
  selectedTables = [],
  selectedGroup = null,
  tables,
  relations,
  dialect,
  lockedNodeIds = [],
  onToggleLock,
  onClose,
  onDeselectTable,
  onUpdateTable,
  onDeleteTable,
  onBatchDeleteTables,
  onBatchUpdateColor,
  onCreateGroup,
  onUngroup,
  onRenameGroup,
  onDeleteGroup,
  onUpdateGroupColor,
  onUpdateRelation,
  onDeleteRelation,
  onGenerateJunctionTable,
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'sql'>('properties');
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'top' | 'bottom' | null>(null);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');

  // Group Inspector Panel (When a group bounding box is selected)
  if (selectedGroup && !selectedTable && !selectedRelation && selectedTables.length <= 1) {
    const groupTables = tables.filter((t) => selectedGroup.tableIds.includes(t.id));

    const handleSaveGroupName = (e?: React.FormEvent) => {
      e?.preventDefault();
      const clean = (groupNameInput || selectedGroup.name).trim();
      if (clean && clean !== selectedGroup.name) {
        onRenameGroup?.(selectedGroup.id, clean);
      }
      setIsEditingGroupName(false);
    };

    const handleUngroupClick = () => {
      onUngroup?.(selectedGroup.id);
    };

    const handleDeleteGroupClick = async () => {
      const confirmed = await confirmDialog({
        title: `Hapus Grup "${selectedGroup.name}"?`,
        text: `Apakah Anda yakin ingin menghapus grup ini beserta seluruh ${groupTables.length} tabel di dalamnya?`,
        confirmText: 'Ya, Hapus Grup & Tabel',
        isDangerous: true,
      });
      if (confirmed) {
        onDeleteGroup?.(selectedGroup.id);
      }
    };

    return (
      <aside className="w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] shrink-0 z-20 transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                Grup Modul
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {groupTables.length} tabel di dalam grup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Group Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nama Grup
            </label>
            {isEditingGroupName ? (
              <form onSubmit={handleSaveGroupName} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  autoFocus
                  onBlur={() => handleSaveGroupName()}
                  className="flex-1 bg-slate-50 dark:bg-slate-950/70 border border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div
                onClick={() => {
                  setGroupNameInput(selectedGroup.name);
                  setIsEditingGroupName(true);
                }}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer group/name"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                  {selectedGroup.name}
                </span>
                <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover/name:text-sky-500 transition-colors" />
              </div>
            )}
          </div>

          {/* Color Tag */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tag Warna Grup
            </label>
            <div className="flex items-center gap-2 flex-wrap p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              {TABLE_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onUpdateGroupColor?.(selectedGroup.id, preset.value)}
                  style={{ backgroundColor: preset.value }}
                  className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                    (selectedGroup.colorTag || '#38bdf8') === preset.value
                      ? 'scale-115 ring-2 ring-sky-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-sm'
                      : 'opacity-70 hover:opacity-100 hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tables inside group */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tabel Anggota ({groupTables.length})
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              {groupTables.map((t) => (
                <span
                  key={t.id}
                  className="px-2.5 py-1 text-xs font-mono rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.colorTag || '#38bdf8' }}
                  />
                  <span className="truncate max-w-[140px]">{t.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            {onToggleLock && (
              <button
                type="button"
                onClick={() => onToggleLock([selectedGroup.id])}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs border ${
                  lockedNodeIds.includes(selectedGroup.id)
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 hover:bg-amber-500/25'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/40 hover:text-amber-500'
                }`}
              >
                {lockedNodeIds.includes(selectedGroup.id) ? (
                  <>
                    <Unlock className="w-4 h-4 text-amber-500" />
                    <span>Buka Kunci Posisi Grup (Unlock)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>Kunci Posisi Seluruh Grup (Lock)</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleUngroupClick}
              className="w-full py-2.5 px-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Unlock className="w-4 h-4 text-sky-500" />
              <span>Bubarkan Grup (Ungroup)</span>
            </button>

            <button
              onClick={handleDeleteGroupClick}
              className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Grup & Seluruh Tabel</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Multi-Selection Panel (When multiple tables are selected via box selection)
  if (selectedTables.length > 1 && !selectedRelation) {
    const handleBatchDelete = async () => {
      const confirmed = await confirmDialog({
        title: `Hapus ${selectedTables.length} Tabel?`,
        text: `Apakah Anda yakin ingin menghapus ${selectedTables.length} tabel yang dipilih beserta seluruh relasinya?`,
        confirmText: `Ya, Hapus Semua`,
        isDangerous: true,
      });

      if (confirmed) {
        onBatchDeleteTables?.(selectedTables.map((t) => t.id));
      }
    };

    const handleCreateGroupFromSelection = () => {
      onCreateGroup?.(selectedTables.map((t) => t.id));
    };

    return (
      <aside className="w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] shrink-0 z-20 transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                Multi-Selection
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {selectedTables.length} tabel terpilih
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-Selection Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Grouping Action Button (Top Primary Action) */}
          <div className="p-3 bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" />
                <span>Fitur Grouping</span>
              </span>
              <span className="text-[10px] font-mono text-sky-600/80 dark:text-sky-400/80 bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                Ctrl + G
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Kunci tabel-tabel ini ke dalam satu grup agar garis relasi internal terkunci rapi saat dipindahkan bersamaan.
            </p>
            <button
              type="button"
              onClick={handleCreateGroupFromSelection}
              className="w-full py-2.5 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-sky-500/20 active:scale-98"
            >
              <Boxes className="w-4 h-4" />
              <span>Gabungkan Jadi Grup (Group)</span>
            </button>
          </div>

          {/* Selected Tables Chips */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daftar Tabel Terpilih
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              {selectedTables.map((t) => (
                <span
                  key={t.id}
                  className="px-2.5 py-1 text-xs font-mono rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs group/chip hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.colorTag || '#38bdf8' }}
                  />
                  <span className="truncate max-w-[130px]">{t.name}</span>
                  <button
                    type="button"
                    title={`Keluarkan ${t.name} dari seleksi`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeselectTable?.(t.id);
                    }}
                    className="p-0.5 -mr-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Batch Color Preset Palette */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ubah Warna Header Bersama
            </label>
            <div className="flex items-center gap-2 flex-wrap p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              {TABLE_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onBatchUpdateColor?.(selectedTables.map((t) => t.id), preset.value)}
                  style={{ backgroundColor: preset.value }}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-115 hover:ring-2 hover:ring-white dark:hover:ring-slate-900 shadow-xs cursor-pointer"
                />
              ))}
            </div>
          </div>

          {/* Batch Actions */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            {onToggleLock && (
              <button
                type="button"
                onClick={() => onToggleLock(selectedTables.map((t) => t.id))}
                className="w-full py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Kunci / Buka Kunci {selectedTables.length} Tabel Terpilih</span>
              </button>
            )}

            <button
              onClick={handleBatchDelete}
              className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus {selectedTables.length} Tabel Terpilih</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (!selectedTable && !selectedRelation && !selectedGroup) {
    return (
      <aside className="w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center text-slate-500 text-xs h-[calc(100vh-3.5rem)] shrink-0 z-20 transition-colors">
        <Sliders className="w-8 h-8 text-slate-400 dark:text-slate-700 mb-3" />
        <p className="font-semibold text-slate-800 dark:text-slate-300 mb-1">Inspector Studio</p>
        <p className="text-slate-500 max-w-[210px] leading-relaxed">
          Pilih tabel atau klik garis relasi di canvas untuk mengubah kolom, tipe data, kardinalitas, dan foreign key.
        </p>
      </aside>
    );
  }

  // Handle Column Reordering
  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    if (!selectedTable) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedTable.columns.length) return;
    const newCols = [...selectedTable.columns];
    const [movedCol] = newCols.splice(index, 1);
    newCols.splice(targetIndex, 0, movedCol);
    onUpdateTable({ ...selectedTable, columns: newCols });
  };

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', colId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedColId(colId);
  };

  const handleDragOver = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (draggedColId && draggedColId !== targetColId) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const pos = relY < rect.height / 2 ? 'top' : 'bottom';
      setDragOverColId(targetColId);
      setDragOverPos(pos);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const srcId = e.dataTransfer.getData('text/plain') || draggedColId;
    if (!srcId || srcId === targetColId || !selectedTable) {
      setDraggedColId(null);
      setDragOverColId(null);
      setDragOverPos(null);
      return;
    }

    const currentCols = [...selectedTable.columns];
    const srcIndex = currentCols.findIndex((c) => c.id === srcId);
    if (srcIndex === -1) return;

    const [movedCol] = currentCols.splice(srcIndex, 1);
    const tgtIndex = currentCols.findIndex((c) => c.id === targetColId);
    if (tgtIndex === -1) return;

    const insertIndex = dragOverPos === 'top' ? tgtIndex : tgtIndex + 1;
    currentCols.splice(insertIndex, 0, movedCol);

    onUpdateTable({ ...selectedTable, columns: currentCols });
    setDraggedColId(null);
    setDragOverColId(null);
    setDragOverPos(null);
  };

  const handleDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
    setDragOverPos(null);
  };

  // Handle Table Editing
  const handleTableNameChange = (name: string) => {
    if (!selectedTable) return;
    onUpdateTable({ ...selectedTable, name });
  };

  const handleTableColorChange = (colorTag: string) => {
    if (!selectedTable) return;
    onUpdateTable({ ...selectedTable, colorTag });
  };

  const handleTableCommentChange = (comment: string) => {
    if (!selectedTable) return;
    onUpdateTable({ ...selectedTable, comment });
  };

  const handleAddColumn = () => {
    if (!selectedTable) return;
    const newCol: ColumnData = {
      id: `col-${Math.random().toString(36).substring(2, 7)}`,
      name: `column_${selectedTable.columns.length + 1}`,
      type: 'VARCHAR(255)',
      isPrimary: false,
      isNullable: true,
      isUnique: false,
      isAutoIncrement: false,
    };
    onUpdateTable({
      ...selectedTable,
      columns: [...selectedTable.columns, newCol],
    });
    setEditingColId(newCol.id);
    showToast(`Kolom "${newCol.name}" ditambahkan`);
  };

  const handleUpdateColumn = (colId: string, updates: Partial<ColumnData>) => {
    if (!selectedTable) return;
    const updatedColumns = selectedTable.columns.map((c) =>
      c.id === colId ? { ...c, ...updates } : c
    );
    onUpdateTable({ ...selectedTable, columns: updatedColumns });
  };

  const handleDeleteColumn = async (colId: string, colName: string) => {
    if (!selectedTable) return;
    const confirmed = await confirmDialog({
      title: 'Hapus Kolom?',
      text: `Apakah Anda yakin ingin menghapus kolom "${colName}"?`,
      confirmText: 'Hapus Kolom',
      isDangerous: true,
    });

    if (confirmed) {
      const updatedColumns = selectedTable.columns.filter((c) => c.id !== colId);
      onUpdateTable({ ...selectedTable, columns: updatedColumns });
      showToast(`Kolom "${colName}" dihapus`, 'info');
    }
  };

  const handleDeleteTableClick = async () => {
    if (!selectedTable) return;
    const confirmed = await confirmDialog({
      title: 'Hapus Tabel?',
      text: `Tabel "${selectedTable.name}" beserta semua kolom dan relasinya akan dihapus permanen.`,
      confirmText: 'Ya, Hapus Tabel',
      isDangerous: true,
    });

    if (confirmed) {
      onDeleteTable(selectedTable.id);
      showToast(`Tabel "${selectedTable.name}" dihapus`, 'info');
    }
  };

  const handleDeleteRelationClick = async () => {
    if (!selectedRelation) return;
    const confirmed = await confirmDialog({
      title: 'Hapus Relasi Foreign Key?',
      text: 'Garis hubungan antar tabel ini akan dilepas dari skema.',
      confirmText: 'Ya, Hapus Relasi',
      isDangerous: true,
    });

    if (confirmed) {
      onDeleteRelation(selectedRelation.id);
      showToast('Relasi foreign key berhasil dihapus', 'info');
    }
  };

  // Find info for selected relation
  const sourceTable = selectedRelation
    ? tables.find((t) => t.id === selectedRelation.sourceTableId)
    : null;
  const targetTable = selectedRelation
    ? tables.find((t) => t.id === selectedRelation.targetTableId)
    : null;
  const sourceCol = sourceTable?.columns.find((c) => c.id === selectedRelation?.sourceColumnId);
  const targetCol = targetTable?.columns.find((c) => c.id === selectedRelation?.targetColumnId);

  return (
    <aside className="w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] shrink-0 z-20 transition-colors">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedTable ? (
            <>
              <Database className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[170px]">
                {selectedTable.name}
              </span>
            </>
          ) : (
            <>
              <GitFork className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                Relasi Foreign Key
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {selectedTable && (
            <>
              {onToggleLock && (
                <button
                  type="button"
                  onClick={() => onToggleLock([selectedTable.id])}
                  title={
                    lockedNodeIds.includes(selectedTable.id)
                      ? 'Buka Kunci Posisi (Unlock)'
                      : 'Kunci Posisi Tabel (Lock)'
                  }
                  className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all cursor-pointer mr-1 ${
                    lockedNodeIds.includes(selectedTable.id)
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 hover:bg-amber-500/25'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {lockedNodeIds.includes(selectedTable.id) ? (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[11px] hidden sm:inline">
                    {lockedNodeIds.includes(selectedTable.id) ? 'Terkunci' : 'Kunci'}
                  </span>
                </button>
              )}

              <div className="flex bg-slate-100 dark:bg-slate-950 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800 mr-1">
                <button
                  onClick={() => setActiveTab('properties')}
                  className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                    activeTab === 'properties'
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-medium shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Properti
                </button>
                <button
                  onClick={() => setActiveTab('sql')}
                  className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                    activeTab === 'sql'
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-medium shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  SQL
                </button>
              </div>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RELATION INSPECTOR */}
      {selectedRelation && (
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Visual Relation Path Overview */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Alur Relasi (Foreign Key)
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold">
                {selectedRelation.cardinality}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono bg-white dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="space-y-0.5">
                <div className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                  <span>Source (FK)</span>
                  <span className="text-[9px] px-1 bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded font-bold">
                    {selectedRelation.cardinality === '1:1' ? '1' : 'N'}
                  </span>
                </div>
                <div className="text-sky-600 dark:text-sky-300 font-semibold truncate max-w-[100px]" title={`${sourceTable?.name}.${sourceCol?.name}`}>
                  {sourceTable?.name || 'Table'}.{sourceCol?.name || 'col'}
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0 mx-2" />

              <div className="space-y-0.5 text-right">
                <div className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center justify-end gap-1">
                  <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded font-bold">
                    {selectedRelation.cardinality === 'N:M' ? 'M' : '1'}
                  </span>
                  <span>Target (PK)</span>
                </div>
                <div className="text-emerald-600 dark:text-emerald-300 font-semibold truncate max-w-[100px]" title={`${targetTable?.name}.${targetCol?.name}`}>
                  {targetTable?.name || 'Table'}.{targetCol?.name || 'col'}
                </div>
              </div>
            </div>
          </div>

          {/* PER-TABLE CROW'S FOOT NOTATION SELECTOR (ONE & MANY GROUPS) */}
          <div className="space-y-3 pt-1">
            {/* Table 1 (Source) */}
            <div className="p-3 bg-slate-50/80 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                    Tabel 1: {sourceTable?.name || 'Tabel 1'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 truncate max-w-[90px]">
                  {sourceCol?.name}
                </span>
              </div>

              {/* Group: One */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                  One
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'one-simple' as CrowsFootMarker, label: 'One', symbol: '|' },
                    { key: 'one-mandatory' as CrowsFootMarker, label: 'One Mandatory', symbol: '||' },
                  ].map((item) => {
                    const isSelected = (selectedRelation.sourceMarker || 'one-mandatory') === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() =>
                          onUpdateRelation({
                            ...selectedRelation,
                            sourceMarker: item.key,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-500/80 text-sky-600 dark:text-sky-300 ring-1 ring-sky-500/30'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px]">{item.label}</span>
                        <span className="font-mono text-xs font-bold text-sky-500 dark:text-sky-400">{item.symbol}</span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  {(() => {
                    const isSelected = (selectedRelation.sourceMarker || 'one-mandatory') === 'one-optional';
                    return (
                      <button
                        onClick={() =>
                          onUpdateRelation({
                            ...selectedRelation,
                            sourceMarker: 'one-optional',
                          })
                        }
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-500/80 text-sky-600 dark:text-sky-300 ring-1 ring-sky-500/30'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px]">One Opsional</span>
                        <span className="font-mono text-xs font-bold text-sky-500 dark:text-sky-400">|o</span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Group: Many */}
              <div className="space-y-1 pt-1.5 border-t border-slate-200 dark:border-slate-800/60">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                  Many
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'many-simple' as CrowsFootMarker, label: 'Many', symbol: '<' },
                    { key: 'many-mandatory' as CrowsFootMarker, label: 'Many Mandatory', symbol: '|<' },
                  ].map((item) => {
                    const isSelected = (selectedRelation.sourceMarker || 'one-mandatory') === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() =>
                          onUpdateRelation({
                            ...selectedRelation,
                            sourceMarker: item.key,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-500/80 text-sky-600 dark:text-sky-300 ring-1 ring-sky-500/30'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px]">{item.label}</span>
                        <span className="font-mono text-xs font-bold text-sky-500 dark:text-sky-400">{item.symbol}</span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  {(() => {
                    const isSelected = (selectedRelation.sourceMarker || 'one-mandatory') === 'many-optional';
                    return (
                      <button
                        onClick={() =>
                          onUpdateRelation({
                            ...selectedRelation,
                            sourceMarker: 'many-optional',
                          })
                        }
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-500/80 text-sky-600 dark:text-sky-300 ring-1 ring-sky-500/30'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px]">Many Opsional</span>
                        <span className="font-mono text-xs font-bold text-sky-500 dark:text-sky-400">O&lt;</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Table 2 (Target) */}
            <div className="p-3 bg-slate-50/80 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                    Tabel 2: {targetTable?.name || 'Tabel 2'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 truncate max-w-[90px]">
                  {targetCol?.name}
                </span>
              </div>

              {/* Group: One */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                  One
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'one-simple' as CrowsFootMarker, label: 'One', symbol: '|' },
                    { key: 'one-mandatory' as CrowsFootMarker, label: 'One Mandatory', symbol: '||' },
                  ].map((item) => {
                    const isSelected = (selectedRelation.targetMarker || 'one-mandatory') === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() =>
                          onUpdateRelation({
                            ...selectedRelation,
                            targetMarker: item.key,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px]">{item.label}</span>
                        <span className="font-mono text-xs font-bold text-emerald-500 dark:text-emerald-400">{item.symbol}</span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  {(() => {
                    const isSelected = (selectedRelation.targetMarker || 'one-mandatory') === 'one-optional';
                    return (
                      <button
                        onClick={() =>
                          onUpdateRelation({
                            ...selectedRelation,
                            targetMarker: 'one-optional',
                          })
                        }
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px]">One Opsional</span>
                        <span className="font-mono text-xs font-bold text-emerald-500 dark:text-emerald-400">|o</span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Group: Many */}
              <div className="space-y-1 pt-1.5 border-t border-slate-200 dark:border-slate-800/60">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                  Many
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'many-simple' as CrowsFootMarker, label: 'Many', symbol: '<' },
                    { key: 'many-mandatory' as CrowsFootMarker, label: 'Many Mandatory', symbol: '|<' },
                  ].map((item) => {
                    const isSelected = (selectedRelation.targetMarker || 'one-mandatory') === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() =>
                          onUpdateRelation({
                            ...selectedRelation,
                            targetMarker: item.key,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px]">{item.label}</span>
                        <span className="font-mono text-xs font-bold text-emerald-500 dark:text-emerald-400">{item.symbol}</span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  {(() => {
                    const isSelected = (selectedRelation.targetMarker || 'one-mandatory') === 'many-optional';
                    return (
                      <button
                        onClick={() =>
                          onUpdateRelation({
                            ...selectedRelation,
                            targetMarker: 'many-optional',
                          })
                        }
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px]">Many Opsional</span>
                        <span className="font-mono text-xs font-bold text-emerald-500 dark:text-emerald-400">O&lt;</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
            {/* Junction Table Generator Action for N:M */}
            {selectedRelation.cardinality === 'N:M' && onGenerateJunctionTable && (
              <button
                onClick={() =>
                  onGenerateJunctionTable(
                    selectedRelation.sourceTableId,
                    selectedRelation.targetTableId,
                    selectedRelation.id
                  )
                }
                className="w-full mt-2 py-1.5 px-2.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-300 border border-sky-500/40 rounded-lg flex items-center justify-center gap-1.5 transition-colors font-medium text-[11px] cursor-pointer"
              >
                <span>⚡ Buat Pivot/Junction Table Otomatis</span>
              </button>
            )}

          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
              Constraint Name
            </label>
            <input
              type="text"
              value={selectedRelation.name || ''}
              placeholder={`fk_${sourceTable?.name || 'table'}_${sourceCol?.name || 'col'}`}
              onChange={(e) =>
                onUpdateRelation({ ...selectedRelation, name: e.target.value })
              }
              className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono focus:border-sky-500/60 focus:bg-white dark:focus:bg-slate-950 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                ON DELETE
              </label>
              <select
                value={selectedRelation.onDelete}
                onChange={(e) =>
                  onUpdateRelation({
                    ...selectedRelation,
                    onDelete: e.target.value as ReferentialAction,
                  })
                }
                className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-sky-500/60 focus:bg-white dark:focus:bg-slate-950 focus:outline-none"
              >
                <option value="CASCADE">CASCADE</option>
                <option value="RESTRICT">RESTRICT</option>
                <option value="SET NULL">SET NULL</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                ON UPDATE
              </label>
              <select
                value={selectedRelation.onUpdate}
                onChange={(e) =>
                  onUpdateRelation({
                    ...selectedRelation,
                    onUpdate: e.target.value as ReferentialAction,
                  })
                }
                className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-sky-500/60 focus:bg-white dark:focus:bg-slate-950 focus:outline-none"
              >
                <option value="CASCADE">CASCADE</option>
                <option value="RESTRICT">RESTRICT</option>
                <option value="SET NULL">SET NULL</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>
          </div>

          {/* PCB Custom Manual Path Position Status & Reset */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MoveHorizontal className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>Routing Jalur Garis</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                {selectedRelation.customPath?.bendX !== undefined ||
                selectedRelation.customPath?.bendY !== undefined ||
                selectedRelation.customOffset !== undefined
                  ? 'Kustom (PCB)'
                  : 'Otomatis'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {selectedRelation.customPath?.bendX !== undefined ||
              selectedRelation.customPath?.bendY !== undefined ||
              selectedRelation.customOffset !== undefined
                ? `Jalur disesuaikan manual (${[
                    selectedRelation.customPath?.bendX !== undefined
                      ? `X: ${selectedRelation.customPath.bendX}`
                      : null,
                    selectedRelation.customPath?.bendY !== undefined
                      ? `Y: ${selectedRelation.customPath.bendY}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}). Anda bisa klik & seret garis langsung di canvas.`
                : 'Jalur diatur otomatis. Klik & seret segmen garis vertikal (↔) atau horizontal (↕) langsung di canvas untuk merouting.'}
            </p>

            {(selectedRelation.customPath?.bendX !== undefined ||
              selectedRelation.customPath?.bendY !== undefined ||
              selectedRelation.customOffset !== undefined) && (
              <button
                type="button"
                onClick={() =>
                  onUpdateRelation({
                    ...selectedRelation,
                    customPath: undefined,
                    customOffset: undefined,
                  })
                }
                className="w-full py-1.5 px-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Kembalikan ke Posisi Otomatis</span>
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleDeleteRelationClick}
              className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium text-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Relasi Foreign Key</span>
            </button>
          </div>
        </div>
      )}

      {/* TABLE INSPECTOR */}
      {selectedTable && activeTab === 'properties' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Table Name */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
              Nama Tabel
            </label>
            <input
              type="text"
              value={selectedTable.name}
              onChange={(e) => handleTableNameChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:border-sky-500/60 focus:bg-white dark:focus:bg-slate-950 focus:outline-none"
            />
          </div>

          {/* Color Tag */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">
              Tag Warna Tabel
            </label>
            <div className="flex items-center gap-1.5">
              {TABLE_COLOR_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleTableColorChange(p.value)}
                  style={{ backgroundColor: p.value }}
                  className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center cursor-pointer ${
                    selectedTable.colorTag === p.value
                      ? 'scale-110 ring-2 ring-sky-500/60'
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  {selectedTable.colorTag === p.value && (
                    <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Comment / Note */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
              Deskripsi / Komentar
            </label>
            <textarea
              rows={2}
              value={selectedTable.comment || ''}
              placeholder="Tambahkan catatan untuk tabel ini..."
              onChange={(e) => handleTableCommentChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-sky-500/60 focus:bg-white dark:focus:bg-slate-950 focus:outline-none resize-none"
            />
          </div>

          {/* Columns Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Daftar Kolom ({selectedTable.columns.length})
              </span>
              <button
                onClick={handleAddColumn}
                className="flex items-center gap-1 px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah Kolom</span>
              </button>
            </div>

            <div className="space-y-2">
              {selectedTable.columns.map((col, colIdx) => {
                const fkRel = relations.find(
                  (r) => r.sourceTableId === selectedTable.id && r.sourceColumnId === col.id
                );
                const tgtTable = fkRel ? tables.find((t) => t.id === fkRel.targetTableId) : null;
                const tgtCol = tgtTable?.columns.find((c) => c.id === fkRel?.targetColumnId);
                const isFirst = colIdx === 0;
                const isLast = colIdx === selectedTable.columns.length - 1;
                const isBeingDragged = draggedColId === col.id;
                const isOver = dragOverColId === col.id;

                const dropBorderClass =
                  isOver && dragOverPos === 'top'
                    ? 'border-t-2 !border-t-sky-400 bg-sky-500/10'
                    : isOver && dragOverPos === 'bottom'
                    ? 'border-b-2 !border-b-sky-400 bg-sky-500/10'
                    : '';

                return (
                  <div
                    key={col.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, col.id)}
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 transition-all duration-150 group/colcard ${dropBorderClass} ${
                      isBeingDragged ? 'opacity-30 scale-[0.98]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {/* Drag Reorder Handle */}
                        <span
                          title="Tarik untuk memindahkan urutan kolom"
                          className="opacity-40 group-hover/colcard:opacity-90 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 p-0.5 shrink-0"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>

                        <button
                          onClick={() =>
                            handleUpdateColumn(col.id, { isPrimary: !col.isPrimary })
                          }
                          title={col.isPrimary ? 'Primary Key (Aktif)' : 'Set sebagai Primary Key'}
                          className={`p-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                            col.isPrimary
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                              : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                          }`}
                        >
                          <Key className="w-3.5 h-3.5" />
                          {col.isPrimary && (
                            <span className="text-[9px] font-mono font-bold">PK</span>
                          )}
                        </button>

                        {fkRel && (
                          <span
                            title={`Foreign Key terhubung ke ${tgtTable?.name || 'tabel'}.${tgtCol?.name || 'id'}`}
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/40 shrink-0 shadow-xs"
                          >
                            FK → {tgtTable?.name || 'relasi'}
                          </span>
                        )}

                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) =>
                            handleUpdateColumn(col.id, { name: e.target.value })
                          }
                          className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 px-1 py-0.5 rounded border border-transparent focus:border-sky-500/50 outline-none w-full text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Move Up Button */}
                        <button
                          disabled={isFirst}
                          onClick={() => handleMoveColumn(colIdx, 'up')}
                          title="Pindahkan kolom ke atas"
                          className={`p-1 rounded transition-colors ${
                            isFirst
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              : 'text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer'
                          }`}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down Button */}
                        <button
                          disabled={isLast}
                          onClick={() => handleMoveColumn(colIdx, 'down')}
                          title="Pindahkan kolom ke bawah"
                          className={`p-1 rounded transition-colors ${
                            isLast
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              : 'text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer'
                          }`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Column Button */}
                        <button
                          onClick={() => handleDeleteColumn(col.id, col.name)}
                          className="p-1 rounded text-slate-400 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ml-0.5"
                          title="Hapus Kolom"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Type Selector (Select2 Searchable Dropdown for > 5 choices) */}
                    <div className="grid grid-cols-2 gap-1.5 items-center">
                      <div>
                        <SearchableSelect
                          value={col.type}
                          onChange={(val) => handleUpdateColumn(col.id, { type: val })}
                          options={COMMON_DATA_TYPES}
                          threshold={5}
                          placeholder="Pilih tipe..."
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Default val..."
                          value={col.defaultValue || ''}
                          onChange={(e) =>
                            handleUpdateColumn(col.id, { defaultValue: e.target.value })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 text-[11px] font-mono text-slate-800 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:border-sky-500/60 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Interactive ENUM Value Manager */}
                    {col.type.toUpperCase().startsWith('ENUM') && (
                      <EnumPillEditor
                        currentType={col.type}
                        onUpdateType={(newType) => handleUpdateColumn(col.id, { type: newType })}
                      />
                    )}

                    {/* Constraints Checkboxes */}
                    <div className="flex items-center gap-3 text-[10px] text-slate-600 dark:text-slate-400 pt-0.5">
                      <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                        <input
                          type="checkbox"
                          checked={!col.isNullable}
                          onChange={(e) =>
                            handleUpdateColumn(col.id, { isNullable: !e.target.checked })
                          }
                          className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sky-500 focus:ring-0 cursor-pointer"
                        />
                        <span>Not Null</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                        <input
                          type="checkbox"
                          checked={col.isUnique}
                          onChange={(e) =>
                            handleUpdateColumn(col.id, { isUnique: e.target.checked })
                          }
                          className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sky-500 focus:ring-0 cursor-pointer"
                        />
                        <span>Unique</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                        <input
                          type="checkbox"
                          checked={col.isAutoIncrement}
                          onChange={(e) =>
                            handleUpdateColumn(col.id, { isAutoIncrement: e.target.checked })
                          }
                          className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sky-500 focus:ring-0 cursor-pointer"
                        />
                        <span>Auto Inc</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delete Table Action */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleDeleteTableClick}
              className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium text-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Tabel Ini</span>
            </button>
          </div>
        </div>
      )}

      {/* SQL PREVIEW TAB */}
      {selectedTable && activeTab === 'sql' && (
        <div className="flex-1 overflow-hidden flex flex-col p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span>Live DDL Preview ({dialect.toUpperCase()})</span>
          </div>
          <div className="flex-1 bg-slate-900 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-sky-400 dark:text-sky-300 overflow-auto whitespace-pre select-text">
            {generateSql([selectedTable], relations.filter(r => r.sourceTableId === selectedTable.id || r.targetTableId === selectedTable.id), dialect)}
          </div>
        </div>
      )}
    </aside>
  );
};
