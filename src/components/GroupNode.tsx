import React, { memo, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { Boxes, Unlock, Edit3, Check, Trash2 } from 'lucide-react';
import { ErdGroup } from '../types/schema';
import { confirmDialog } from '../utils/alert';

export interface GroupNodeData {
  group: ErdGroup;
  width: number;
  height: number;
  tableCount: number;
  isSelected?: boolean;
  onSelectGroup?: (groupId: string) => void;
  onUngroup?: (groupId: string) => void;
  onRenameGroup?: (groupId: string, newName: string) => void;
  onDeleteGroup?: (groupId: string) => void;
}

export const GroupNode: React.FC<NodeProps> = memo(({ id, data, selected }) => {
  const nodeData = data as unknown as GroupNodeData;
  const { group, width, height, tableCount, onSelectGroup, onUngroup, onRenameGroup, onDeleteGroup } = nodeData;

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(group?.name || 'Group');

  if (!group) return null;

  const colorTag = group.colorTag || '#38bdf8';

  const handleSaveName = (e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const clean = editedName.trim();
    if (clean && clean !== group.name) {
      onRenameGroup?.(group.id, clean);
    }
    setIsEditing(false);
  };

  const handleUngroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUngroup?.(group.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirmDialog({
      title: `Hapus Grup "${group.name}"?`,
      text: `Apakah Anda ingin menghapus grup beserta seluruh ${tableCount} tabel di dalamnya?`,
      confirmText: 'Hapus Grup & Tabel',
      isDangerous: true,
    });
    if (confirmed) {
      onDeleteGroup?.(group.id);
    }
  };

  return (
    <div
      onClick={() => onSelectGroup?.(group.id)}
      style={{
        width: Math.max(340, width),
        height: Math.max(200, height),
      }}
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 pointer-events-auto ${
        selected
          ? 'border-sky-500/80 bg-sky-500/5 ring-4 ring-sky-500/20 shadow-xl shadow-sky-500/10'
          : 'border-slate-300 dark:border-slate-800/80 bg-slate-100/30 dark:bg-slate-900/20 hover:border-slate-400 dark:hover:border-slate-700'
      }`}
    >
      {/* Group Header Label Bar */}
      <div className="absolute top-2.5 left-3 z-10 flex items-center gap-2 max-w-[calc(100%-24px)]">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-md cursor-grab active:cursor-grabbing group/header"
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: colorTag }}
          />

          <Boxes className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />

          {isEditing ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1 nodrag">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                onBlur={() => handleSaveName()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditedName(group.name);
                    setIsEditing(false);
                  }
                }}
                className="px-1.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-sky-500 focus:outline-none w-36"
              />
              <button
                type="submit"
                className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500 transition-colors cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <div
              onDoubleClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 cursor-pointer nodrag"
              title="Klik 2x untuk ubah nama grup"
            >
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 tracking-tight truncate max-w-[180px]">
                {group.name}
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                {tableCount} tabel
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1 ml-1 border-l border-slate-200 dark:border-slate-800 pl-1.5 nodrag">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                title="Ubah Nama Grup"
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}

            <button
              type="button"
              onClick={handleUngroup}
              title="Bubarkan Grup (Ungroup) - Pisahkan tabel kembali"
              className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <Unlock className="w-3 h-3 text-sky-500" />
              <span>Ungroup</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              title="Hapus Grup dan seluruh tabel di dalamnya"
              className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

GroupNode.displayName = 'GroupNode';
