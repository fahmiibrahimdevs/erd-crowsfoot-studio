import { useState, useCallback, useEffect } from 'react';
import {
  ErdTreeItem,
  ErdFileItem,
  ErdFolderItem,
  TableData,
  RelationshipData,
  ErdGroup,
  SqlDialect,
} from '../types/schema';
import { PRESET_SCHEMAS } from '../utils/presets';
import { showToast } from '../utils/alert';

export const STORAGE_KEY = 'er_studio_project_data';
export const WORKSPACE_KEY = 'er_studio_workspace_tree';
export const ACTIVE_FILE_KEY = 'er_studio_active_file_id';

export const getInitialWorkspaceState = (): {
  items: ErdTreeItem[];
  activeFileId: string;
  activeFile: ErdFileItem;
} => {
  try {
    const savedWorkspace = localStorage.getItem(WORKSPACE_KEY);
    const savedActiveId = localStorage.getItem(ACTIVE_FILE_KEY);
    if (savedWorkspace) {
      const items: ErdTreeItem[] = JSON.parse(savedWorkspace);
      if (Array.isArray(items) && items.length > 0) {
        // Automatically inject Portfolio CMS template if not already present
        const hasPortfolio = items.some((i) => i.name.toLowerCase().includes('portfolio'));
        if (!hasPortfolio && PRESET_SCHEMAS[2]) {
          const pFolder: ErdFolderItem = {
            id: 'folder-portfolio',
            name: 'Portfolio CMS',
            type: 'folder',
            parentId: null,
            isOpen: true,
            createdAt: new Date().toISOString(),
          };
          const pFile: ErdFileItem = {
            id: 'file-portfolio-full',
            name: 'portfolio_full_schema.erd',
            type: 'file',
            parentId: 'folder-portfolio',
            dialect: 'mysql',
            tables: PRESET_SCHEMAS[2].tables,
            relations: PRESET_SCHEMAS[2].relations,
            positions: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          items.unshift(pFolder, pFile);
          try {
            localStorage.setItem(WORKSPACE_KEY, JSON.stringify(items));
          } catch {}
        }

        const activeFile = (items.find((i) => i.id === savedActiveId && i.type === 'file') ||
          items.find((i) => i.type === 'file')) as ErdFileItem | undefined;

        if (activeFile) {
          return {
            items,
            activeFileId: activeFile.id,
            activeFile,
          };
        }
      }
    }
  } catch (e) {
    console.error('Failed to load workspace items from localStorage', e);
  }

  // Check single project legacy data
  let initialFileContent = {
    name: 'ecommerce_store.erd',
    dialect: 'postgres' as SqlDialect,
    tables: PRESET_SCHEMAS[0].tables,
    relations: PRESET_SCHEMAS[0].relations,
    positions: {} as Record<string, { x: number; y: number }>,
  };

  try {
    const legacyData = localStorage.getItem(STORAGE_KEY);
    if (legacyData) {
      const parsed = JSON.parse(legacyData);
      if (Array.isArray(parsed.tables) && parsed.tables.length > 0) {
        const baseName = (parsed.name || 'main_schema').replace(/\.erd$/, '');
        initialFileContent = {
          name: `${baseName}.erd`,
          dialect: (parsed.dialect || 'postgres') as SqlDialect,
          tables: parsed.tables,
          relations: parsed.relations || [],
          positions: parsed.positions || {},
        };
      }
    }
  } catch {}

  const portfolioFolderId = 'folder-portfolio';
  const portfolioFileId = 'file-portfolio-full';
  const defaultFolderId = 'folder-starter';
  const defaultFileId = 'file-ecommerce';
  const authFileId = 'file-auth';

  const starterItems: ErdTreeItem[] = [
    {
      id: portfolioFolderId,
      name: 'Portfolio CMS',
      type: 'folder',
      parentId: null,
      isOpen: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: portfolioFileId,
      name: 'portfolio_full_schema.erd',
      type: 'file',
      parentId: portfolioFolderId,
      dialect: 'mysql',
      tables: PRESET_SCHEMAS[2]?.tables || [],
      relations: PRESET_SCHEMAS[2]?.relations || [],
      positions: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: defaultFolderId,
      name: 'E-Commerce App',
      type: 'folder',
      parentId: null,
      isOpen: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: defaultFileId,
      name: initialFileContent.name,
      type: 'file',
      parentId: defaultFolderId,
      dialect: initialFileContent.dialect,
      tables: initialFileContent.tables,
      relations: initialFileContent.relations,
      positions: initialFileContent.positions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: authFileId,
      name: 'auth_service.erd',
      type: 'file',
      parentId: defaultFolderId,
      dialect: 'postgres',
      tables: PRESET_SCHEMAS[1]?.tables || [],
      relations: PRESET_SCHEMAS[1]?.relations || [],
      positions: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    items: starterItems,
    activeFileId: portfolioFileId,
    activeFile: starterItems[1] as ErdFileItem,
  };
};

interface UseWorkspaceManagerProps {
  initialWorkspace: {
    items: ErdTreeItem[];
    activeFileId: string;
    activeFile: ErdFileItem;
  };
  projectName: string;
  setProjectName: (name: string) => void;
  dialect: SqlDialect;
  setDialect: (dialect: SqlDialect) => void;
  tables: TableData[];
  relations: RelationshipData[];
  groups: ErdGroup[];
  getNodePositions: () => Record<string, { x: number; y: number }>;
  resetHistory: (state: any) => void;
  setSelectedTableId: (id: string | null) => void;
  setSelectedTableIds: (ids: string[]) => void;
  setSelectedGroupId: (id: string | null) => void;
  setSelectedRelationId: (id: string | null) => void;
  fitView: () => void;
}

export function useWorkspaceManager({
  initialWorkspace,
  projectName,
  setProjectName,
  dialect,
  setDialect,
  tables,
  relations,
  groups,
  getNodePositions,
  resetHistory,
  setSelectedTableId,
  setSelectedTableIds,
  setSelectedGroupId,
  setSelectedRelationId,
  fitView,
}: UseWorkspaceManagerProps) {
  const [workspaceItems, setWorkspaceItems] = useState<ErdTreeItem[]>(initialWorkspace.items);
  const [activeFileId, setActiveFileId] = useState<string | null>(initialWorkspace.activeFileId);

  // Auto-sync active file contents with current working state
  useEffect(() => {
    if (!activeFileId) return;
    setWorkspaceItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.id === activeFileId);
      if (existingIndex === -1) return prevItems;

      const currentItem = prevItems[existingIndex] as ErdFileItem;
      const fileName = projectName.endsWith('.erd') ? projectName : `${projectName}.erd`;
      const currentPositions = getNodePositions();

      const updatedFile: ErdFileItem = {
        ...currentItem,
        name: fileName,
        dialect,
        tables,
        relations,
        groups,
        positions: currentPositions,
        updatedAt: new Date().toISOString(),
      };

      if (
        currentItem.name === updatedFile.name &&
        currentItem.dialect === updatedFile.dialect &&
        currentItem.tables === updatedFile.tables &&
        currentItem.relations === updatedFile.relations &&
        JSON.stringify(currentItem.groups || []) === JSON.stringify(updatedFile.groups || []) &&
        JSON.stringify(currentItem.positions) === JSON.stringify(updatedFile.positions)
      ) {
        return prevItems;
      }

      const nextItems = [...prevItems];
      nextItems[existingIndex] = updatedFile;
      return nextItems;
    });
  }, [projectName, dialect, tables, relations, groups, activeFileId, getNodePositions]);

  // Persist workspace and active file to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspaceItems));
      if (activeFileId) {
        localStorage.setItem(ACTIVE_FILE_KEY, activeFileId);
      }
      if (tables.length > 0) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            name: projectName,
            dialect,
            tables,
            relations,
            positions: getNodePositions(),
            updatedAt: new Date().toISOString(),
          })
        );
      }
    } catch (e) {
      console.error('Failed to save workspace to localStorage', e);
    }
  }, [workspaceItems, activeFileId, projectName, dialect, tables, relations, getNodePositions]);

  const handleSelectFile = useCallback(
    (fileId: string) => {
      if (fileId === activeFileId) return;

      setWorkspaceItems((currentItems) => {
        const targetFile = currentItems.find((i) => i.id === fileId && i.type === 'file') as
          | ErdFileItem
          | undefined;
        if (!targetFile) return currentItems;

        const updatedItems = currentItems.map((item) => {
          if (item.id === activeFileId && item.type === 'file') {
            const fileName = projectName.endsWith('.erd') ? projectName : `${projectName}.erd`;
            return {
              ...item,
              name: fileName,
              dialect,
              tables,
              relations,
              groups,
              positions: getNodePositions(),
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });

        setActiveFileId(targetFile.id);
        setProjectName(targetFile.name.replace(/\.erd$/, ''));
        setDialect(targetFile.dialect || 'postgres');
        resetHistory({
          tables: targetFile.tables || [],
          relations: targetFile.relations || [],
          groups: targetFile.groups || [],
          positions: targetFile.positions || {},
        });
        setSelectedTableId(null);
        setSelectedTableIds([]);
        setSelectedGroupId(null);
        setSelectedRelationId(null);

        showToast(`Membuka diagram: ${targetFile.name}`, 'info');
        setTimeout(() => {
          fitView();
        }, 100);

        return updatedItems;
      });
    },
    [activeFileId, dialect, fitView, getNodePositions, groups, projectName, relations, resetHistory, setDialect, setProjectName, setSelectedGroupId, setSelectedRelationId, setSelectedTableId, setSelectedTableIds, tables]
  );

  const handleCreateFile = useCallback(
    (name: string, parentId?: string | null, dialectParam?: SqlDialect) => {
      let cleanName = name.trim();
      if (!cleanName) cleanName = 'new_diagram';
      const fileName = cleanName.endsWith('.erd') ? cleanName : `${cleanName}.erd`;
      const newFileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const newFile: ErdFileItem = {
        id: newFileId,
        name: fileName,
        type: 'file',
        parentId: parentId || null,
        dialect: dialectParam || 'postgres',
        tables: [],
        relations: [],
        groups: [],
        positions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setWorkspaceItems((prev) => {
        const next = prev.map((item) => {
          if (item.id === activeFileId && item.type === 'file') {
            const currentFileName = projectName.endsWith('.erd') ? projectName : `${projectName}.erd`;
            return {
              ...item,
              name: currentFileName,
              dialect,
              tables,
              relations,
              groups,
              positions: getNodePositions(),
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });
        return [...next, newFile];
      });

      setActiveFileId(newFileId);
      setProjectName(fileName.replace(/\.erd$/, ''));
      setDialect(newFile.dialect);
      resetHistory({
        tables: [],
        relations: [],
        groups: [],
        positions: {},
      });
      setSelectedTableId(null);
      setSelectedTableIds([]);
      setSelectedGroupId(null);
      setSelectedRelationId(null);

      showToast(`File diagram "${fileName}" berhasil dibuat`, 'success');
    },
    [activeFileId, dialect, getNodePositions, groups, projectName, relations, resetHistory, setDialect, setProjectName, setSelectedGroupId, setSelectedRelationId, setSelectedTableId, setSelectedTableIds, tables]
  );

  const handleCreateFolder = useCallback((name: string, parentId?: string | null) => {
    let cleanName = name.trim();
    if (!cleanName) cleanName = 'New Folder';
    const newFolderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newFolder: ErdFolderItem = {
      id: newFolderId,
      name: cleanName,
      type: 'folder',
      parentId: parentId || null,
      isOpen: true,
      createdAt: new Date().toISOString(),
    };

    setWorkspaceItems((prev) => [...prev, newFolder]);
    showToast(`Folder "${cleanName}" dibuat`, 'success');
  }, []);

  const handleRenameWorkspaceItem = useCallback(
    (itemId: string, newName: string) => {
      const cleanName = newName.trim();
      if (!cleanName) return;

      setWorkspaceItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            if (item.type === 'file') {
              const finalName = cleanName.endsWith('.erd') ? cleanName : `${cleanName}.erd`;
              if (itemId === activeFileId) {
                setProjectName(finalName.replace(/\.erd$/, ''));
              }
              return { ...item, name: finalName, updatedAt: new Date().toISOString() };
            } else {
              return { ...item, name: cleanName };
            }
          }
          return item;
        })
      );
      showToast('Nama berhasil diubah', 'success');
    },
    [activeFileId, setProjectName]
  );

  const handleDeleteWorkspaceItem = useCallback(
    (itemId: string) => {
      setWorkspaceItems((prev) => {
        const target = prev.find((i) => i.id === itemId);
        if (!target) return prev;

        const getAllDescendantIds = (items: ErdTreeItem[], rootId: string): Set<string> => {
          const result = new Set<string>([rootId]);
          let added = true;
          while (added) {
            added = false;
            for (const item of items) {
              if (item.parentId && result.has(item.parentId) && !result.has(item.id)) {
                result.add(item.id);
                added = true;
              }
            }
          }
          return result;
        };

        const toDeleteIds = getAllDescendantIds(prev, itemId);
        const nextItems = prev.filter((i) => !toDeleteIds.has(i.id));

        if (activeFileId && toDeleteIds.has(activeFileId)) {
          const remainingFiles = nextItems.filter((i): i is ErdFileItem => i.type === 'file');
          if (remainingFiles.length > 0) {
            const nextFile = remainingFiles[0];
            setActiveFileId(nextFile.id);
            setProjectName(nextFile.name.replace(/\.erd$/, ''));
            setDialect(nextFile.dialect || 'postgres');
            resetHistory({
              tables: nextFile.tables || [],
              relations: nextFile.relations || [],
              groups: nextFile.groups || [],
              positions: nextFile.positions || {},
            });
          } else {
            const fallbackFile: ErdFileItem = {
              id: `file-${Date.now()}`,
              name: 'untitled_diagram.erd',
              type: 'file',
              parentId: null,
              dialect: 'postgres',
              tables: [],
              relations: [],
              groups: [],
              positions: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            nextItems.push(fallbackFile);
            setActiveFileId(fallbackFile.id);
            setProjectName('untitled_diagram');
            setDialect('postgres');
            resetHistory({
              tables: [],
              relations: [],
              groups: [],
              positions: {},
            });
          }
          setSelectedTableId(null);
          setSelectedTableIds([]);
          setSelectedGroupId(null);
          setSelectedRelationId(null);
        }

        showToast(`"${target.name}" berhasil dihapus`, 'info');
        return nextItems;
      });
    },
    [activeFileId, resetHistory, setDialect, setProjectName, setSelectedGroupId, setSelectedRelationId, setSelectedTableId, setSelectedTableIds]
  );

  const handleDuplicateFile = useCallback(
    (fileId: string) => {
      setWorkspaceItems((prevItems) => {
        const target = prevItems.find((i) => i.id === fileId && i.type === 'file') as
          | ErdFileItem
          | undefined;
        if (!target) return prevItems;

        const isLive = fileId === activeFileId;
        const baseName = target.name.replace(/\.erd$/, '');
        const duplicateName = `${baseName} (Copy).erd`;
        const newFileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        const duplicateFile: ErdFileItem = {
          id: newFileId,
          name: duplicateName,
          type: 'file',
          parentId: target.parentId,
          dialect: isLive ? dialect : target.dialect,
          tables: isLive ? JSON.parse(JSON.stringify(tables)) : JSON.parse(JSON.stringify(target.tables)),
          relations: isLive
            ? JSON.parse(JSON.stringify(relations))
            : JSON.parse(JSON.stringify(target.relations)),
          groups: isLive
            ? JSON.parse(JSON.stringify(groups))
            : JSON.parse(JSON.stringify(target.groups || [])),
          positions: isLive ? getNodePositions() : { ...target.positions },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setActiveFileId(newFileId);
        setProjectName(duplicateName.replace(/\.erd$/, ''));
        setDialect(duplicateFile.dialect);
        resetHistory({
          tables: duplicateFile.tables,
          relations: duplicateFile.relations,
          groups: duplicateFile.groups,
          positions: duplicateFile.positions,
        });
        setSelectedTableId(null);
        setSelectedTableIds([]);
        setSelectedGroupId(null);
        setSelectedRelationId(null);
        showToast(`File duplikat "${duplicateName}" dibuat!`, 'success');

        return [...prevItems, duplicateFile];
      });
    },
    [activeFileId, dialect, getNodePositions, groups, projectName, relations, resetHistory, setDialect, setProjectName, setSelectedGroupId, setSelectedRelationId, setSelectedTableId, setSelectedTableIds, tables]
  );

  const handleExportWorkspaceFile = useCallback(
    (fileId: string) => {
      const targetFile = workspaceItems.find((i) => i.id === fileId && i.type === 'file') as
        | ErdFileItem
        | undefined;
      if (!targetFile) {
        showToast('File tidak ditemukan', 'error');
        return;
      }

      const isLive = fileId === activeFileId;
      const fileDataToExport = isLive
        ? {
            ...targetFile,
            name: projectName.endsWith('.erd') ? projectName : `${projectName}.erd`,
            dialect,
            tables,
            relations,
            groups,
            positions: getNodePositions(),
            updatedAt: new Date().toISOString(),
          }
        : targetFile;

      const dataStr = JSON.stringify(fileDataToExport, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileDataToExport.name.endsWith('.erd')
        ? fileDataToExport.name
        : `${fileDataToExport.name}.erd`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`File "${link.download}" berhasil diunduh!`, 'success');
    },
    [workspaceItems, activeFileId, projectName, dialect, tables, relations, groups, getNodePositions]
  );

  const handleImportWorkspaceFile = useCallback(
    (file: File, parentId?: string | null) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);

          let importTables: TableData[] = [];
          let importRelations: RelationshipData[] = [];
          let importGroups: ErdGroup[] = [];
          let importPositions: Record<string, { x: number; y: number }> = {};
          let importDialect: SqlDialect = 'postgres';
          let fileName = file.name;
          if (!fileName.endsWith('.erd')) {
            fileName = `${fileName.replace(/\.json$/, '')}.erd`;
          }

          if (Array.isArray(parsed.tables)) {
            importTables = parsed.tables;
            importRelations = Array.isArray(parsed.relations) ? parsed.relations : [];
            importGroups = Array.isArray(parsed.groups) ? parsed.groups : [];
            importPositions = parsed.positions || {};
            importDialect = parsed.dialect || 'postgres';
            if (parsed.name) {
              fileName = parsed.name.endsWith('.erd') ? parsed.name : `${parsed.name}.erd`;
            }
          }

          const newFileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const newFile: ErdFileItem = {
            id: newFileId,
            name: fileName,
            type: 'file',
            parentId: parentId || null,
            dialect: importDialect,
            tables: importTables,
            relations: importRelations,
            groups: importGroups,
            positions: importPositions,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setWorkspaceItems((prev) => [...prev, newFile]);
          setActiveFileId(newFileId);
          setProjectName(fileName.replace(/\.erd$/, ''));
          setDialect(importDialect);
          resetHistory({
            tables: importTables,
            relations: importRelations,
            groups: importGroups,
            positions: importPositions,
          });
          setSelectedTableId(null);
          setSelectedTableIds([]);
          setSelectedGroupId(null);
          setSelectedRelationId(null);
          showToast(`File diagram "${fileName}" berhasil diimpor!`, 'success');
          setTimeout(() => {
            fitView();
          }, 100);
        } catch {
          showToast('Gagal membaca file diagram: format JSON tidak valid', 'error');
        }
      };
      reader.readAsText(file);
    },
    [fitView, resetHistory, setDialect, setProjectName, setSelectedGroupId, setSelectedRelationId, setSelectedTableId, setSelectedTableIds]
  );

  const handleMoveWorkspaceItem = useCallback(
    (itemId: string, targetParentId: string | null) => {
      setWorkspaceItems((prev) => {
        const item = prev.find((i) => i.id === itemId);
        if (!item) return prev;
        if (item.parentId === targetParentId) return prev;

        if (item.type === 'folder' && targetParentId) {
          const getAllDescendantIds = (items: ErdTreeItem[], rootId: string): Set<string> => {
            const result = new Set<string>([rootId]);
            let added = true;
            while (added) {
              added = false;
              for (const it of items) {
                if (it.parentId && result.has(it.parentId) && !result.has(it.id)) {
                  result.add(it.id);
                  added = true;
                }
              }
            }
            return result;
          };
          const descendantIds = getAllDescendantIds(prev, itemId);
          if (descendantIds.has(targetParentId)) {
            showToast(
              'Tidak dapat memindahkan folder ke dalam dirinya sendiri atau subfolder di dalamnya',
              'error'
            );
            return prev;
          }
        }

        const targetFolder = targetParentId ? prev.find((i) => i.id === targetParentId) : null;
        const targetName = targetFolder ? `folder "${targetFolder.name}"` : 'Root';

        showToast(`"${item.name}" dipindahkan ke ${targetName}`, 'success');

        return prev.map((i) => (i.id === itemId ? { ...i, parentId: targetParentId } : i));
      });
    },
    []
  );

  return {
    workspaceItems,
    activeFileId,
    handleSelectFile,
    handleCreateFile,
    handleCreateFolder,
    handleRenameWorkspaceItem,
    handleDeleteWorkspaceItem,
    handleDuplicateFile,
    handleExportWorkspaceFile,
    handleImportWorkspaceFile,
    handleMoveWorkspaceItem,
  };
}
