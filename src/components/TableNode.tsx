import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Key, Link2, Plus, Trash2, ListFilter, ChevronDown, GripVertical, Lock } from 'lucide-react';
import { TableData, ColumnData } from '../types/schema';
import { confirmDialog, showToast } from '../utils/alert';
import { formatColumnTypeDisplay, parseEnumValues } from '../utils/enumHelper';

export interface TableNodeData {
  table: TableData;
  isSelected?: boolean;
  isLocked?: boolean;
  foreignKeys?: Record<string, string>; // colId -> "targetTable.targetCol"
  onSelectTable?: (tableId: string, event?: React.MouseEvent) => void;
  onDeleteTable?: (tableId: string) => void;
  onAddColumn?: (tableId: string) => void;
  onDeleteColumn?: (tableId: string, columnId: string) => void;
  onEditColumn?: (tableId: string, columnId: string) => void;
  onReorderColumns?: (tableId: string, columns: ColumnData[]) => void;
}

export const TableNode: React.FC<NodeProps> = memo(({ id, data, selected }) => {
  const nodeData = data as unknown as TableNodeData;
  const {
    table,
    foreignKeys = {},
    onSelectTable,
    onDeleteTable,
    onAddColumn,
    onReorderColumns,
  } = nodeData;

  const [expandedEnumColIds, setExpandedEnumColIds] = useState<Set<string>>(new Set());
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'top' | 'bottom' | null>(null);

  if (!table) return null;

  const colorTag = table.colorTag || '#38bdf8';

  const toggleEnumExpand = (colId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEnumColIds((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) {
        next.delete(colId);
      } else {
        next.add(colId);
      }
      return next;
    });
  };

  const handleDeleteTable = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirmDialog({
      title: 'Hapus Tabel?',
      text: `Apakah Anda yakin ingin menghapus tabel "${table.name}"?`,
      confirmText: 'Hapus Tabel',
      isDangerous: true,
    });

    if (confirmed) {
      onDeleteTable?.(table.id);
      showToast(`Tabel "${table.name}" telah dihapus`, 'info');
    }
  };

  // Drag and drop column reordering handlers
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
    if (!srcId || srcId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      setDragOverPos(null);
      return;
    }

    const currentCols = [...table.columns];
    const srcIndex = currentCols.findIndex((c) => c.id === srcId);
    if (srcIndex === -1) return;

    const [movedCol] = currentCols.splice(srcIndex, 1);
    const tgtIndex = currentCols.findIndex((c) => c.id === targetColId);
    if (tgtIndex === -1) return;

    const insertIndex = dragOverPos === 'top' ? tgtIndex : tgtIndex + 1;
    currentCols.splice(insertIndex, 0, movedCol);

    onReorderColumns?.(table.id, currentCols);
    setDraggedColId(null);
    setDragOverColId(null);
    setDragOverPos(null);
  };

  const handleDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
    setDragOverPos(null);
  };

  return (
    <div
      onClick={(e) => onSelectTable?.(table.id, e)}
      className={`group relative w-[280px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border transition-all duration-200 shadow-xl dark:shadow-2xl shadow-slate-200/80 dark:shadow-black/50 ${
        selected
          ? 'border-sky-500/80 ring-2 ring-sky-500/30 shadow-sky-500/10'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Color Accent Line */}
      <div
        className="h-1.5 w-full rounded-t-xl overflow-hidden"
        style={{ backgroundColor: colorTag }}
      />

      {/* Table Header */}
      <div className="px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: colorTag }}
          />
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate tracking-tight">
            {table.name}
          </span>
          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-300/60 dark:border-slate-700/50 shrink-0 whitespace-nowrap">
            {table.columns.length} kolom
          </span>
          {nodeData.isLocked && (
            <span
              title="Posisi tabel terkunci (Lock)"
              className="flex items-center text-amber-500 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1 py-0.5 rounded text-[10px] shrink-0"
            >
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            title="Tambah Kolom"
            onClick={(e) => {
              e.stopPropagation();
              onAddColumn?.(table.id);
            }}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer nodrag"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            title="Hapus Tabel"
            onClick={handleDeleteTable}
            className="p-1 rounded hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer nodrag"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Columns List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {table.columns.map((col: ColumnData) => {
          const typeMeta = formatColumnTypeDisplay(col.type);
          const isEnumExpanded = expandedEnumColIds.has(col.id);
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
              className={`flex flex-col transition-all duration-150 nodrag ${dropBorderClass} ${
                isBeingDragged ? 'opacity-30 scale-[0.98]' : ''
              }`}
            >
              {/* Column Header Row */}
              <div className="relative px-2.5 h-8 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group/row">
                {/* Left Port Handle */}
                <Handle
                  type="source"
                  position={Position.Left}
                  id={`${col.id}-left`}
                  isConnectable={true}
                  isConnectableStart={true}
                  isConnectableEnd={true}
                  title={`Port Kiri: Hubungkan relasi ke/dari ${table.name}.${col.name}`}
                  className={`table-handle nodrag nopan !left-[-4.5px] ${
                    col.isPrimary ? 'table-handle-pk' : 'table-handle-fk'
                  }`}
                />

                {/* Left Grip Handle & Column Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Grip Drag Handle */}
                  <span
                    title="Tarik untuk memindahkan urutan kolom"
                    className="opacity-0 group-hover/row:opacity-70 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-500 hover:text-sky-400 nodrag p-0.5 shrink-0"
                  >
                    <GripVertical className="w-3 h-3" />
                  </span>

                  {col.isPrimary ? (
                    <Key className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  ) : foreignKeys[col.id] ? (
                    <Link2 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0 mx-0.5" />
                  )}

                  {/* Primary Key (PK) Badge */}
                  {col.isPrimary && (
                    <span
                      title="Primary Key"
                      className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded shrink-0 shadow-xs"
                    >
                      PK
                    </span>
                  )}

                  {/* Foreign Key (FK) Badge */}
                  {foreignKeys[col.id] && (
                    <span
                      title={`Foreign Key -> ${foreignKeys[col.id]}`}
                      className="text-[9px] font-mono font-bold bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/40 px-1 py-0.2 rounded shrink-0 shadow-xs"
                    >
                      FK
                    </span>
                  )}

                  <span
                    className={`truncate font-medium ${
                      col.isPrimary
                        ? 'text-amber-600 dark:text-amber-300 font-semibold'
                        : foreignKeys[col.id]
                        ? 'text-sky-700 dark:text-sky-200'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {col.name}
                  </span>

                  {col.isUnique && !col.isPrimary && (
                    <span className="text-[9px] font-mono bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1 rounded border border-indigo-500/30 shrink-0">
                      UQ
                    </span>
                  )}

                  {col.isNullable && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono shrink-0" title="Nullable">
                      ?
                    </span>
                  )}
                </div>

                {/* Column Data Type */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {typeMeta.isEnum ? (
                    <button
                      type="button"
                      onClick={(e) => toggleEnumExpand(col.id, e)}
                      title={`Klik untuk melihat/tutup nilai opsi ${typeMeta.fullTooltip}`}
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer nodrag ${
                        isEnumExpanded
                          ? 'bg-sky-500/25 text-sky-600 dark:text-sky-300 border border-sky-400/50 shadow-sm ring-1 ring-sky-500/30'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/20'
                      }`}
                    >
                      <ListFilter className="w-2.5 h-2.5 text-sky-500 dark:text-sky-400" />
                      <span>{typeMeta.display}</span>
                      <ChevronDown
                        className={`w-2.5 h-2.5 text-sky-500 dark:text-sky-400/80 transition-transform duration-200 ${
                          isEnumExpanded ? 'rotate-180 text-sky-600 dark:text-sky-300' : ''
                        }`}
                      />
                    </button>
                  ) : (
                    <span
                      title={typeMeta.fullTooltip}
                      className="font-mono text-[11px] text-slate-500 dark:text-slate-400 pointer-events-none"
                    >
                      {typeMeta.display}
                    </span>
                  )}
                </div>

                {/* Right Port Handle */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${col.id}-right`}
                  isConnectable={true}
                  isConnectableStart={true}
                  isConnectableEnd={true}
                  title={`Port Kanan: Hubungkan relasi ke/dari ${table.name}.${col.name}`}
                  className={`table-handle nodrag nopan !right-[-4.5px] ${
                    col.isPrimary ? 'table-handle-pk' : 'table-handle-fk'
                  }`}
                />
              </div>

              {/* Accordion Enum Option Pills Sub-row */}
              {isEnumExpanded && typeMeta.isEnum && (
                <div className="px-3.5 py-1.5 bg-slate-100/90 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap gap-1 items-center animate-in fade-in duration-150">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 mr-0.5">
                    enum:
                  </span>
                  {parseEnumValues(col.type).map((val) => (
                    <span
                      key={val}
                      className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/25 text-[9px] font-mono shadow-xs"
                    >
                      '{val}'
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Add Row Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddColumn?.(table.id);
        }}
        className="w-full py-1.5 px-3 bg-slate-50/80 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded-b-xl nodrag"
      >
        <Plus className="w-3 h-3" />
        <span>Tambah Kolom</span>
      </button>
    </div>
  );
});

TableNode.displayName = 'TableNode';
