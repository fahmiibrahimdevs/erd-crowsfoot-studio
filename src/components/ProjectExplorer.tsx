import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Folder,
  FolderOpen,
  FileCode2,
  Plus,
  FolderPlus,
  FilePlus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Download,
  ChevronRight,
  ChevronDown,
  UploadCloud,
  Layers,
  ExternalLink,
  FolderTree,
  ChevronsDown,
  ChevronsRight,
} from 'lucide-react';
import { ErdTreeItem, ErdFileItem, ErdFolderItem, SqlDialect } from '../types/schema';
import { confirmDialog, showToast } from '../utils/alert';

interface ProjectExplorerProps {
  items: ErdTreeItem[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name: string, parentId?: string | null, dialect?: SqlDialect) => void;
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onRenameItem: (itemId: string, newName: string) => void;
  onDeleteItem: (itemId: string) => void;
  onDuplicateFile: (fileId: string) => void;
  onExportFile: (fileId: string) => void;
  onImportFile: (file: File, parentId?: string | null) => void;
  onMoveItem?: (itemId: string, targetParentId: string | null) => void;
  onToggleFolder?: (folderId: string) => void;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetType: 'file' | 'folder' | 'root';
  targetItem: ErdTreeItem | null;
}

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  items,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem,
  onDuplicateFile,
  onExportFile,
  onImportFile,
  onMoveItem,
  onToggleFolder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    new Set(items.filter((i) => i.type === 'folder' && (i as ErdFolderItem).isOpen !== false).map((i) => i.id))
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState<{ type: 'file' | 'folder'; parentId: string | null } | null>(null);
  const [newItemName, setNewItemName] = useState('');

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetType: 'root',
    targetItem: null,
  });

  // Drag & drop state for moving files and folders
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);

  const editInputRef = useRef<HTMLInputElement | null>(null);
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editingItemId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItemId]);

  useEffect(() => {
    if (isCreatingNew && createInputRef.current) {
      createInputRef.current.focus();
      createInputRef.current.select();
    }
  }, [isCreatingNew]);

  // Close context menu on click outside or Escape
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (contextMenu.isOpen && (!contextMenuRef.current || !contextMenuRef.current.contains(target))) {
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('contextmenu', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('contextmenu', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.isOpen]);

  const toggleFolder = (folderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
    onToggleFolder?.(folderId);
  };

  const handleExpandAll = () => {
    const allFolderIds = items.filter((i) => i.type === 'folder').map((i) => i.id);
    setExpandedFolderIds(new Set(allFolderIds));
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCollapseAll = () => {
    setExpandedFolderIds(new Set());
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  const startRename = (item: ErdTreeItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
    setEditingItemId(item.id);
    setEditingName(item.name);
  };

  const handleSaveRename = (itemId: string) => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed.length > 0) {
      onRenameItem(itemId, trimmed);
      showToast('Nama berhasil diubah', 'info');
    }
    setEditingItemId(null);
  };

  const handleStartCreate = (type: 'file' | 'folder', parentId: string | null = null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
    if (parentId) {
      setExpandedFolderIds((prev) => new Set([...prev, parentId]));
    }
    setIsCreatingNew({ type, parentId });
    setNewItemName(type === 'file' ? 'new_diagram.erd' : 'New Folder');
  };

  const handleSaveCreate = () => {
    if (!isCreatingNew) return;
    const trimmed = newItemName.trim();
    if (trimmed) {
      if (isCreatingNew.type === 'file') {
        const finalName = trimmed.endsWith('.erd') ? trimmed : `${trimmed}.erd`;
        onCreateFile(finalName, isCreatingNew.parentId);
      } else {
        onCreateFolder(trimmed, isCreatingNew.parentId);
      }
    }
    setIsCreatingNew(null);
    setNewItemName('');
  };

  const handleDelete = async (item: ErdTreeItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
    const isFolder = item.type === 'folder';
    const confirmed = await confirmDialog({
      title: isFolder ? 'Hapus Folder?' : 'Hapus File ERD?',
      text: isFolder
        ? `Folder "${item.name}" beserta seluruh diagram di dalamnya akan dihapus.`
        : `File diagram "${item.name}" akan dihapus dari workspace.`,
      confirmText: 'Ya, Hapus',
      isDangerous: true,
    });

    if (confirmed) {
      onDeleteItem(item.id);
      showToast(`${isFolder ? 'Folder' : 'File'} "${item.name}" telah dihapus`, 'info');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file, isCreatingNew?.parentId || null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open context menu from 3-dots action button
  const openItemMenuFromButton = (e: React.MouseEvent, type: 'file' | 'folder', item: ErdTreeItem) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle off if clicking same item button
    if (contextMenu.isOpen && contextMenu.targetItem?.id === item.id) {
      setContextMenu((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 210;
    const menuHeight = type === 'file' ? 240 : 220;

    let x = rect.left;
    let y = rect.bottom + 4;

    if (x + menuWidth > window.innerWidth - 8) {
      x = Math.max(8, rect.right - menuWidth);
    }
    if (y + menuHeight > window.innerHeight - 8) {
      y = Math.max(8, rect.top - menuHeight - 4);
    }

    setContextMenu({
      isOpen: true,
      x,
      y,
      targetType: type,
      targetItem: item,
    });
  };

  // Open context menu on right click for item (file/folder)
  const handleItemContextMenu = (e: React.MouseEvent, type: 'file' | 'folder', item: ErdTreeItem) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 210;
    const menuHeight = type === 'file' ? 240 : 220;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth - 8) {
      x = Math.max(8, e.clientX - menuWidth);
    }
    if (y + menuHeight > window.innerHeight - 8) {
      y = Math.max(8, e.clientY - menuHeight);
    }

    setContextMenu({
      isOpen: true,
      x,
      y,
      targetType: type,
      targetItem: item,
    });
  };

  // Open context menu for blank/root area
  const handleRootContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 220;
    const menuHeight = 220;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth - 8) {
      x = Math.max(8, e.clientX - menuWidth);
    }
    if (y + menuHeight > window.innerHeight - 8) {
      y = Math.max(8, e.clientY - menuHeight);
    }

    setContextMenu({
      isOpen: true,
      x,
      y,
      targetType: 'root',
      targetItem: null,
    });
  };

  // Group and sort items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const rootItems = useMemo(() => {
    return filteredItems.filter((i) => !i.parentId);
  }, [filteredItems]);

  const getChildItems = (folderId: string) => {
    return filteredItems.filter((i) => i.parentId === folderId);
  };

  // Render a tree item (file or folder)
  const renderItem = (item: ErdTreeItem, depth: number = 0) => {
    const isEditing = editingItemId === item.id;
    const isDragging = draggingItemId === item.id;
    const isItemContextActive = contextMenu.isOpen && contextMenu.targetItem?.id === item.id;

    if (item.type === 'folder') {
      const isExpanded = expandedFolderIds.has(item.id);
      const children = getChildItems(item.id);
      const isDragOver = dragOverFolderId === item.id;

      return (
        <div key={item.id} className="flex flex-col select-none">
          {/* Folder Row */}
          <div
            draggable={!isEditing}
            onContextMenu={(e) => handleItemContextMenu(e, 'folder', item)}
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/plain', item.id);
              e.dataTransfer.effectAllowed = 'move';
              setDraggingItemId(item.id);
            }}
            onDragEnd={() => {
              setDraggingItemId(null);
              setDragOverFolderId(null);
              setIsDragOverRoot(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              if (draggingItemId && draggingItemId !== item.id) {
                setDragOverFolderId(item.id);
              }
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              if (dragOverFolderId === item.id) {
                setDragOverFolderId(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const droppedId = e.dataTransfer.getData('text/plain') || draggingItemId;
              if (droppedId && droppedId !== item.id) {
                onMoveItem?.(droppedId, item.id);
                setExpandedFolderIds((prev) => new Set(prev).add(item.id));
              }
              setDraggingItemId(null);
              setDragOverFolderId(null);
              setIsDragOverRoot(false);
            }}
            onClick={() => toggleFolder(item.id)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className={`group relative flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs cursor-pointer transition-all ${
              isDragging
                ? 'opacity-40 cursor-grabbing bg-slate-200/50 dark:bg-slate-800/50'
                : isDragOver
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500 ring-2 ring-sky-500/40 shadow-sm scale-[1.01]'
                : isItemContextActive
                ? 'bg-slate-200/70 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 ring-1 ring-sky-500/40'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
              <button
                type="button"
                onClick={(e) => toggleFolder(item.id, e)}
                className="p-0.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              )}

              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveRename(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(item.id);
                    if (e.key === 'Escape') setEditingItemId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="px-1 py-0.5 bg-white dark:bg-slate-950 border border-sky-500 rounded text-xs text-slate-900 dark:text-slate-100 outline-none w-full"
                />
              ) : (
                <span className="truncate font-semibold text-[12px]">{item.name}</span>
              )}

              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 opacity-60 group-hover:opacity-100">
                ({children.length})
              </span>
            </div>

            {/* Folder Actions */}
            {!isEditing && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  title="Tambah File di Folder Ini"
                  onClick={(e) => handleStartCreate('file', item.id, e)}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                >
                  <FilePlus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Menu Opsi Folder"
                  onClick={(e) => openItemMenuFromButton(e, 'folder', item)}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    isItemContextActive
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Children List */}
          {isExpanded && (
            <div className="flex flex-col border-l border-slate-200/80 dark:border-slate-800/80 ml-3.5 my-0.5">
              {children.map((child) => renderItem(child, depth + 1))}

              {/* Inline Input for New Child in this Folder */}
              {isCreatingNew && isCreatingNew.parentId === item.id && (
                <div
                  style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
                  className="py-1 pr-2 flex items-center gap-1.5"
                >
                  {isCreatingNew.type === 'folder' ? (
                    <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <FileCode2 className="w-4 h-4 text-sky-500 shrink-0" />
                  )}
                  <input
                    ref={createInputRef}
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onBlur={handleSaveCreate}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCreate();
                      if (e.key === 'Escape') setIsCreatingNew(null);
                    }}
                    placeholder={isCreatingNew.type === 'folder' ? 'Nama folder...' : 'nama_file.erd'}
                    className="px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-sky-500 rounded text-xs text-slate-900 dark:text-slate-100 outline-none w-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // File Item Row
    const file = item as ErdFileItem;
    const isActive = activeFileId === file.id;

    return (
      <div
        key={file.id}
        draggable={!isEditing}
        onContextMenu={(e) => handleItemContextMenu(e, 'file', file)}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('text/plain', file.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggingItemId(file.id);
        }}
        onDragEnd={() => {
          setDraggingItemId(null);
          setDragOverFolderId(null);
          setIsDragOverRoot(false);
        }}
        onClick={() => onSelectFile(file.id)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`group relative flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs cursor-pointer transition-all ${
          isDragging
            ? 'opacity-40 cursor-grabbing bg-slate-200/50 dark:bg-slate-800/50'
            : isActive
            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold shadow-xs'
            : isItemContextActive
            ? 'bg-slate-200/70 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 ring-1 ring-sky-500/40'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
          <FileCode2
            className={`w-4 h-4 shrink-0 ${
              isActive ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'
            }`}
          />

          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => handleSaveRename(file.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename(file.id);
                if (e.key === 'Escape') setEditingItemId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="px-1 py-0.5 bg-white dark:bg-slate-950 border border-sky-500 rounded text-xs text-slate-900 dark:text-slate-100 outline-none w-full"
            />
          ) : (
            <div className="flex items-center gap-1.5 truncate">
              <span className="truncate text-[12px]">{file.name}</span>
            </div>
          )}
        </div>

        {/* File Metadata & Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1">
            <span
              className={`text-[9px] font-mono px-1 py-0.2 rounded uppercase shrink-0 transition-opacity ${
                isActive
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30'
                  : 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 opacity-60 group-hover:opacity-100'
              }`}
            >
              {file.tables?.length || 0} tbl
            </span>

            <button
              type="button"
              title="Menu Opsi File"
              onClick={(e) => openItemMenuFromButton(e, 'file', file)}
              className={`p-1 rounded transition-all cursor-pointer ${
                isItemContextActive
                  ? 'opacity-100 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                  : 'opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full select-none relative">
      {/* Explorer Top Toolbar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Layers className="w-3.5 h-3.5 text-sky-500" />
          <span>Explorer Project</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Tambah File ERD Baru"
            onClick={(e) => handleStartCreate('file', null, e)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Tambah Folder Baru"
            onClick={(e) => handleStartCreate('folder', null, e)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Upload File .erd"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.erd"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Quick Search */}
      <div className="px-3 py-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari file atau folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div
        onContextMenu={handleRootContextMenu}
        onDragOver={(e) => {
          if (draggingItemId) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={(e) => {
          if (draggingItemId) {
            e.preventDefault();
            const droppedId = e.dataTransfer.getData('text/plain') || draggingItemId;
            if (droppedId) {
              onMoveItem?.(droppedId, null);
            }
            setDraggingItemId(null);
            setDragOverFolderId(null);
            setIsDragOverRoot(false);
          }
        }}
        className="flex-1 overflow-y-auto p-2 space-y-0.5"
      >
        {rootItems.length === 0 && !isCreatingNew ? (
          <div className="py-8 text-center text-slate-600 dark:text-slate-400 text-xs flex flex-col items-center gap-2">
            <FileCode2 className="w-8 h-8 opacity-40 text-slate-500" />
            <span>Belum ada file diagram</span>
            <button
              onClick={() => handleStartCreate('file', null)}
              className="mt-1 px-3 py-1 bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Buat File ERD</span>
            </button>
          </div>
        ) : (
          <>
            {rootItems.map((item) => renderItem(item, 0))}

            {/* Inline Input for New Root Item */}
            {isCreatingNew && !isCreatingNew.parentId && (
              <div className="py-1 px-2 flex items-center gap-1.5">
                {isCreatingNew.type === 'folder' ? (
                  <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <FileCode2 className="w-4 h-4 text-sky-500 shrink-0" />
                )}
                <input
                  ref={createInputRef}
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onBlur={handleSaveCreate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCreate();
                    if (e.key === 'Escape') setIsCreatingNew(null);
                  }}
                  placeholder={isCreatingNew.type === 'folder' ? 'Nama folder...' : 'nama_file.erd'}
                  className="px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-sky-500 rounded text-xs text-slate-900 dark:text-slate-100 outline-none w-full"
                />
              </div>
            )}

            {/* Root Drop Zone when Dragging */}
            {draggingItemId && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOverRoot(true);
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  setIsDragOverRoot(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedId = e.dataTransfer.getData('text/plain') || draggingItemId;
                  if (droppedId) {
                    onMoveItem?.(droppedId, null);
                  }
                  setDraggingItemId(null);
                  setDragOverFolderId(null);
                  setIsDragOverRoot(false);
                }}
                className={`mt-2 p-3 rounded-xl border-2 border-dashed text-center text-[11px] font-medium transition-all ${
                  isDragOverRoot
                    ? 'border-sky-500 bg-sky-500/20 text-sky-600 dark:text-sky-400 ring-2 ring-sky-500/30 shadow-md scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/40 text-slate-500 hover:border-sky-500/40'
                }`}
              >
                <span>Lepaskan di sini untuk memindahkan ke Root (Luar Folder)</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
        <span className="font-mono text-[10px]">
          {items.filter((i) => i.type === 'file').length} files • {items.filter((i) => i.type === 'folder').length} folders
        </span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Auto-saved
        </span>
      </div>

      {/* =========================================================================
         Floating Right-Click / Button Context Menu (Matte Slate Studio Design System)
         Rendered via createPortal to bypass container backdrop-filter & layout clipping
         ========================================================================= */}
      {contextMenu.isOpen &&
        createPortal(
          <div
            ref={contextMenuRef}
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            className="fixed z-[9999] w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 select-none font-sans"
          >
            {/* Target Title Header */}
            {contextMenu.targetItem ? (
              <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center gap-2">
                {contextMenu.targetType === 'folder' ? (
                  <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : (
                  <FileCode2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                )}
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                  {contextMenu.targetItem.name}
                </span>
              </div>
            ) : (
              <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                  Explorer Workspace
                </span>
              </div>
            )}

            {/* Context Menu for FILE */}
            {contextMenu.targetType === 'file' && contextMenu.targetItem && (
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.targetItem) {
                      onSelectFile(contextMenu.targetItem.id);
                    }
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                  <span>Buka Diagram</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    if (contextMenu.targetItem) {
                      startRename(contextMenu.targetItem, e);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ganti Nama (Rename)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.targetItem) {
                      onDuplicateFile(contextMenu.targetItem.id);
                    }
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Duplikat File</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.targetItem) {
                      onExportFile(contextMenu.targetItem.id);
                    }
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download .erd File</span>
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                <button
                  type="button"
                  onClick={(e) => {
                    if (contextMenu.targetItem) {
                      handleDelete(contextMenu.targetItem, e);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus File</span>
                </button>
              </div>
            )}

            {/* Context Menu for FOLDER */}
            {contextMenu.targetType === 'folder' && contextMenu.targetItem && (
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    if (contextMenu.targetItem) {
                      handleStartCreate('file', contextMenu.targetItem.id, e);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FilePlus className="w-3.5 h-3.5 text-sky-500" />
                  <span>File Baru di Folder Ini</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    if (contextMenu.targetItem) {
                      handleStartCreate('folder', contextMenu.targetItem.id, e);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Subfolder Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.targetItem) {
                      toggleFolder(contextMenu.targetItem.id);
                    }
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  {expandedFolderIds.has(contextMenu.targetItem.id) ? (
                    <>
                      <Folder className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tutup Folder</span>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Buka Folder</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    if (contextMenu.targetItem) {
                      startRename(contextMenu.targetItem, e);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ganti Nama (Rename)</span>
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                <button
                  type="button"
                  onClick={(e) => {
                    if (contextMenu.targetItem) {
                      handleDelete(contextMenu.targetItem, e);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Folder</span>
                </button>
              </div>
            )}

            {/* Context Menu for ROOT / BLANK AREA */}
            {contextMenu.targetType === 'root' && (
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={(e) => handleStartCreate('file', null, e)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FilePlus className="w-3.5 h-3.5 text-sky-500" />
                  <span>Buat File ERD Baru</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleStartCreate('folder', null, e)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Buat Folder Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Upload / Import .erd File</span>
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ChevronsDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Buka Semua Folder</span>
                </button>

                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ChevronsRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tutup Semua Folder</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
