import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Connection,
  ReactFlowInstance,
  Position,
  OnSelectionChangeParams,
} from '@xyflow/react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { SqlImportModal } from './components/Modals/SqlImportModal';
import { ExportModal } from './components/Modals/ExportModal';
import { TemplatesModal } from './components/Modals/TemplatesModal';
import {
  TableData,
  RelationshipData,
  ErdGroup,
  SqlDialect,
  TABLE_COLOR_PRESETS,
  EdgeRoutingStyle,
  CustomPathData,
  Cardinality,
  ErdTreeItem,
  ErdFileItem,
  ErdFolderItem,
} from './types/schema';
import { PRESET_SCHEMAS, PresetSchema } from './utils/presets';
import { getAutoLayoutedElements } from './utils/layout';
import { showToast, confirmDialog } from './utils/alert';
import { useHistory } from './hooks/useHistory';
import {
  Point,
  HorizontalSegment,
  liveEdgeRegistry,
  extractHorizontalSegments,
  computeSmartOrthogonalPath,
  cleanAndSimplifyWaypoints,
} from './utils/orthogonalRouter';

const STORAGE_KEY = 'er_studio_project_data';
const WORKSPACE_KEY = 'er_studio_workspace_tree';
const ACTIVE_FILE_KEY = 'er_studio_active_file_id';
const ROUTING_STYLE_KEY = 'er_studio_routing_style';
const THEME_KEY = 'er_studio_theme';

const getInitialWorkspaceState = (): {
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
        const hasPortfolio = items.some(
          (i) => i.name.toLowerCase().includes('portfolio')
        );
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

export const App: React.FC = () => {
  const [initialWorkspace] = useState(() => getInitialWorkspaceState());
  const [workspaceItems, setWorkspaceItems] = useState<ErdTreeItem[]>(initialWorkspace.items);
  const [activeFileId, setActiveFileId] = useState<string | null>(initialWorkspace.activeFileId);

  const [projectName, setProjectName] = useState(
    initialWorkspace.activeFile.name.replace(/\.erd$/, '')
  );
  const [dialect, setDialect] = useState<SqlDialect>(
    initialWorkspace.activeFile.dialect || 'postgres'
  );

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast(`Mode tampilan diubah ke ${next === 'dark' ? 'Dark Mode' : 'Light Mode'}`, 'info');
      return next;
    });
  }, []);

  const {
    state: historyState,
    commit: commitHistory,
    undo: historyUndo,
    redo: historyRedo,
    resetHistory,
    canUndo,
    canRedo,
  } = useHistory({
    tables: initialWorkspace.activeFile.tables || [],
    relations: initialWorkspace.activeFile.relations || [],
    groups: initialWorkspace.activeFile.groups || [],
    positions: initialWorkspace.activeFile.positions || {},
  });

  const tables = historyState.tables;
  const relations = historyState.relations;
  const groups = historyState.groups || [];

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [hoveredRelationId, setHoveredRelationId] = useState<string | null>(null);

  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const selectedTableIdRef = useRef(selectedTableId);
  selectedTableIdRef.current = selectedTableId;

  const selectedTableIdsRef = useRef(selectedTableIds);
  selectedTableIdsRef.current = selectedTableIds;

  const selectedGroupIdRef = useRef(selectedGroupId);
  selectedGroupIdRef.current = selectedGroupId;

  const dragGroupStartRef = useRef<{
    groupId: string;
    startGroupPos: { x: number; y: number };
    startTablePositions: Record<string, { x: number; y: number }>;
  } | null>(null);

  const [routingStyle, setRoutingStyle] = useState<EdgeRoutingStyle>(() => {
    try {
      return (localStorage.getItem(ROUTING_STYLE_KEY) as EdgeRoutingStyle) || 'smoothstep';
    } catch {
      return 'smoothstep';
    }
  });

  const handleRoutingStyleChange = (style: EdgeRoutingStyle) => {
    setRoutingStyle(style);
    try {
      localStorage.setItem(ROUTING_STYLE_KEY, style);
    } catch {}
    showToast(
      `Gaya garis diubah ke ${
        style === 'smoothstep' ? 'Siku 90°' : style === 'bezier' ? 'Kurva Bezier' : 'Garis Lurus'
      }`,
      'info'
    );
  };

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const nodesRef = useRef<Node[]>([]);
  nodesRef.current = nodes;

  // Stable helper to retrieve current node positions map without re-triggering dependency chains
  const getNodePositions = useCallback(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    nodesRef.current.forEach((n) => {
      posMap[n.id] = { ...n.position };
    });
    return posMap;
  }, []);

  // Centralized schema updater that records history snapshots with stable reference
  const updateSchema = useCallback(
    (
      newTables: TableData[] | ((prev: TableData[]) => TableData[]),
      newRelations?: RelationshipData[] | ((prev: RelationshipData[]) => RelationshipData[]),
      newPositions?: Record<string, { x: number; y: number }>,
      newGroups?: ErdGroup[] | ((prev: ErdGroup[]) => ErdGroup[]),
      skipHistory = false
    ) => {
      commitHistory((current) => {
        const nextTables =
          typeof newTables === 'function' ? newTables(current.tables) : newTables;
        const nextRelations = newRelations
          ? typeof newRelations === 'function'
            ? newRelations(current.relations)
            : newRelations
          : current.relations;
        const nextGroups = newGroups
          ? typeof newGroups === 'function'
            ? newGroups(current.groups || [])
            : newGroups
          : current.groups || [];

        const nextPositions = newPositions || getNodePositions();

        return {
          tables: nextTables,
          relations: nextRelations,
          groups: nextGroups,
          positions: nextPositions,
        };
      }, skipHistory);
    },
    [commitHistory, getNodePositions]
  );

  // Undo and Redo handlers
  const handleUndo = useCallback(() => {
    const prevState = historyUndo();
    if (prevState) {
      if (prevState.positions) {
        setNodes((prevNodes) =>
          prevNodes.map((n) => ({
            ...n,
            position: prevState.positions![n.id] || n.position,
          }))
        );
      }
      showToast('Undo berhasil', 'info');
    }
  }, [historyUndo, setNodes]);

  const handleRedo = useCallback(() => {
    const nextState = historyRedo();
    if (nextState) {
      if (nextState.positions) {
        setNodes((prevNodes) =>
          prevNodes.map((n) => ({
            ...n,
            position: nextState.positions![n.id] || n.position,
          }))
        );
      }
      showToast('Redo berhasil', 'info');
    }
  }, [historyRedo, setNodes]);

  // Handler for table actions triggered inside TableNode
  const handleSelectTable = useCallback((tableId: string) => {
    setSelectedTableId((prev) => (prev === tableId ? prev : tableId));
    setSelectedTableIds((prev) => (prev.length === 1 && prev[0] === tableId ? prev : [tableId]));
    setSelectedGroupId((prev) => (prev === null ? prev : null));
    setSelectedRelationId((prev) => (prev === null ? prev : null));
  }, []);

  const handleSelectGroup = useCallback((groupId: string) => {
    setSelectedGroupId((prev) => (prev === groupId ? prev : groupId));
    setSelectedTableId((prev) => (prev === null ? prev : null));
    setSelectedTableIds((prev) => (prev.length === 0 ? prev : []));
    setSelectedRelationId((prev) => (prev === null ? prev : null));
  }, []);

  const handleCreateGroup = useCallback(
    (tableIds: string[]) => {
      const currentTables = tablesRef.current;
      const currentGroups = groupsRef.current;
      const validIds = tableIds.filter((id) => currentTables.some((t) => t.id === id));
      if (validIds.length <= 1) {
        showToast('Pilih minimal 2 tabel untuk membuat grup', 'warning');
        return;
      }

      const newGroupId = `grp-${Date.now().toString(36)}`;
      const newGroup: ErdGroup = {
        id: newGroupId,
        name: `Group ${currentGroups.length + 1}`,
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
        (prev) => prev,
        (prev) => prev,
        undefined,
        () => [...cleanedGroups, newGroup]
      );

      setSelectedGroupId(newGroupId);
      setSelectedTableId(null);
      setSelectedTableIds([]);
      showToast(`Grup "${newGroup.name}" berhasil dibuat (${validIds.length} tabel)`, 'success');
    },
    [updateSchema]
  );

  const handleUngroup = useCallback(
    (groupId: string) => {
      updateSchema(
        (prev) => prev,
        (prev) => prev,
        undefined,
        (prevGroups) => (prevGroups || []).filter((g) => g.id !== groupId)
      );
      setSelectedGroupId((curr) => (curr === groupId ? null : curr));
      showToast('Grup berhasil dibubarkan (Ungroup)', 'info');
    },
    [updateSchema]
  );

  const handleRenameGroup = useCallback(
    (groupId: string, newName: string) => {
      updateSchema(
        (prev) => prev,
        (prev) => prev,
        undefined,
        (prevGroups) =>
          (prevGroups || []).map((g) => (g.id === groupId ? { ...g, name: newName } : g))
      );
      showToast(`Nama grup diubah menjadi "${newName}"`, 'success');
    },
    [updateSchema]
  );

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      const currentGroups = groupsRef.current;
      const target = currentGroups.find((g) => g.id === groupId);
      if (!target) return;
      const deletedSet = new Set(target.tableIds);

      updateSchema(
        (prev) => prev.filter((t) => !deletedSet.has(t.id)),
        (prev) =>
          prev.filter((r) => !deletedSet.has(r.sourceTableId) && !deletedSet.has(r.targetTableId)),
        undefined,
        (prevGroups) => (prevGroups || []).filter((g) => g.id !== groupId)
      );

      setSelectedGroupId((curr) => (curr === groupId ? null : curr));
      setSelectedTableId(null);
      setSelectedTableIds([]);
      showToast(`Grup "${target.name}" beserta ${target.tableIds.length} tabel telah dihapus`, 'info');
    },
    [updateSchema]
  );

  const handleUpdateGroupColor = useCallback(
    (groupId: string, colorTag: string) => {
      updateSchema(
        (prev) => prev,
        (prev) => prev,
        undefined,
        (prevGroups) =>
          (prevGroups || []).map((g) => (g.id === groupId ? { ...g, colorTag } : g))
      );
      showToast('Warna grup diperbarui', 'success');
    },
    [updateSchema]
  );

  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const currentTables = tablesRef.current;
    const currentGroups = groupsRef.current;
    const ids = params.nodes.map((n) => n.id);
    const tableNodeIds = ids.filter((id) => currentTables.some((t) => t.id === id));
    const groupNodeIds = ids.filter((id) => currentGroups.some((g) => g.id === id));

    if (groupNodeIds.length === 1 && tableNodeIds.length === 0) {
      const targetGrpId = groupNodeIds[0];
      setSelectedGroupId((prev) => (prev === targetGrpId ? prev : targetGrpId));
      setSelectedTableId((prev) => (prev === null ? prev : null));
      setSelectedTableIds((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    setSelectedTableIds((prev) => {
      if (
        prev.length === tableNodeIds.length &&
        prev.every((val, index) => val === tableNodeIds[index])
      ) {
        return prev;
      }
      return tableNodeIds;
    });

    if (tableNodeIds.length === 1) {
      const targetTblId = tableNodeIds[0];
      setSelectedTableId((prev) => (prev === targetTblId ? prev : targetTblId));
      setSelectedGroupId((prev) => (prev === null ? prev : null));
    } else {
      setSelectedTableId((prev) => (prev === null ? prev : null));
      if (tableNodeIds.length > 1) {
        setSelectedGroupId((prev) => (prev === null ? prev : null));
      }
    }
  }, []);

  const handleDeselectTable = useCallback(
    (tableId: string) => {
      setSelectedTableIds((prev) => {
        const next = prev.filter((id) => id !== tableId);
        if (next.length === 1) {
          setSelectedTableId(next[0]);
        } else if (next.length === 0) {
          setSelectedTableId(null);
        }
        return next;
      });
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === tableId
            ? {
                ...n,
                selected: false,
                data: {
                  ...n.data,
                  isSelected: false,
                },
              }
            : n
        )
      );
    },
    [setNodes]
  );

  const handleBatchDeleteTables = useCallback(
    (tableIds: string[]) => {
      if (!tableIds.length) return;
      const idSet = new Set(tableIds);
      updateSchema(
        (prev) => prev.filter((t) => !idSet.has(t.id)),
        (prev) =>
          prev.filter(
            (r) => !idSet.has(r.sourceTableId) && !idSet.has(r.targetTableId)
          )
      );
      setSelectedTableId(null);
      setSelectedTableIds([]);
      showToast(`${tableIds.length} tabel berhasil dihapus`, 'info');
    },
    [updateSchema]
  );

  const handleBatchUpdateColor = useCallback(
    (tableIds: string[], colorTag: string) => {
      if (!tableIds.length) return;
      const idSet = new Set(tableIds);
      updateSchema((prev) =>
        prev.map((t) => (idSet.has(t.id) ? { ...t, colorTag } : t))
      );
      showToast(`Warna ${tableIds.length} tabel berhasil diperbarui`, 'success');
    },
    [updateSchema]
  );

  const handleDeleteTable = useCallback(
    (tableId: string) => {
      updateSchema(
        (prev) => prev.filter((t) => t.id !== tableId),
        (prev) => prev.filter((r) => r.sourceTableId !== tableId && r.targetTableId !== tableId)
      );
      setSelectedTableId((current) => (current === tableId ? null : current));
      setSelectedTableIds((prev) => prev.filter((id) => id !== tableId));
    },
    [updateSchema]
  );

  const handleAddColumnToTable = useCallback(
    (tableId: string) => {
      const targetTable = tables.find((t) => t.id === tableId);
      const colCount = (targetTable?.columns.length || 0) + 1;
      const newCol = {
        id: `col-${Math.random().toString(36).substring(2, 7)}`,
        name: `field_${colCount}`,
        type: 'VARCHAR(255)',
        isPrimary: false,
        isNullable: true,
        isUnique: false,
        isAutoIncrement: false,
      };

      updateSchema((prev) =>
        prev.map((t) => {
          if (t.id !== tableId) return t;
          return { ...t, columns: [...t.columns, newCol] };
        })
      );
      setSelectedTableId(tableId);
      setSelectedTableIds([tableId]);
      showToast('Kolom baru ditambahkan');
    },
    [tables, updateSchema]
  );

  const handleReorderColumns = useCallback(
    (tableId: string, newColumns: ColumnData[]) => {
      updateSchema((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, columns: newColumns } : t))
      );
    },
    [updateSchema]
  );

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Ctrl+G, Ctrl+Shift+G, Delete, Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input') ||
        target.closest('textarea')
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

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
            (prev) => prev,
            (prev) => prev.filter((r) => r.id !== relId)
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    handleCreateGroup,
    handleUngroup,
    handleDeleteGroup,
    selectedGroupId,
    selectedRelationId,
    selectedTableId,
    selectedTableIds,
    handleBatchDeleteTables,
    tables,
    groups,
    isImportOpen,
    isExportOpen,
    isTemplatesOpen,
    updateSchema,
    handleDeleteTable,
  ]);

  // Auto-sync active file contents with current working state
  useEffect(() => {
    if (!activeFileId) return;
    setWorkspaceItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.id === activeFileId);
      if (existingIndex === -1) return prevItems;
      const currentItem = prevItems[existingIndex];
      if (currentItem.type !== 'file') return prevItems;

      const fileName = projectName.endsWith('.erd') ? projectName : `${projectName}.erd`;
      const currentPositions = historyState.positions || getNodePositions();

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
  }, [projectName, dialect, tables, relations, groups, historyState.positions, activeFileId, getNodePositions]);

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

  // Helper to resolve handle sides (left or right) for both source and target nodes
  const resolveRelationSides = useCallback(
    (
      rel: RelationshipData,
      sPos: { x: number; y: number },
      tPos: { x: number; y: number }
    ): { sourceSide: 'left' | 'right'; targetSide: 'left' | 'right' } => {
      // 1. Self-referencing relationship (table to itself)
      if (rel.sourceTableId === rel.targetTableId) {
        return { sourceSide: 'right', targetSide: 'right' };
      }

      let sourceSide: 'left' | 'right';
      let targetSide: 'left' | 'right';

      const diffX = tPos.x - sPos.x;
      const diffY = Math.abs(tPos.y - sPos.y);

      // Vertically stacked in the EXACT same column (within 20px) and separated vertically (diffY > 60px)
      const isVerticallyStacked = Math.abs(diffX) <= 20 && diffY > 60;

      if (rel.sourceHandle) {
        sourceSide = rel.sourceHandle.endsWith('-left') ? 'left' : 'right';
      } else if (isVerticallyStacked) {
        // Stacked in the same column: use right bracket
        sourceSide = 'right';
      } else {
        // Target is to the right -> exit from right; Target is to the left -> exit from left
        sourceSide = diffX >= 0 ? 'right' : 'left';
      }

      if (rel.targetHandle) {
        targetSide = rel.targetHandle.endsWith('-left') ? 'left' : 'right';
      } else if (isVerticallyStacked) {
        // Stacked in the same column: enter into right bracket
        targetSide = 'right';
      } else {
        // Target is to the right -> enter into left; Target is to the left -> enter into right
        targetSide = diffX >= 0 ? 'left' : 'right';
      }

      return { sourceSide, targetSide };
    },
    []
  );

  // Synchronize React Flow nodes with state (TableNodes & GroupNodes)
  useEffect(() => {
    setNodes((existingNodes) => {
      const existingMap = new Map(existingNodes.map((n) => [n.id, n]));
      const savedPositions = historyState.positions || {};

      // 1. Calculate positions and build table nodes
      const tablePositions: Record<string, { x: number; y: number }> = {};
      const tableNodes: Node[] = tables.map((table, index) => {
        const existingNode = existingMap.get(table.id);
        const position =
          existingNode?.position ||
          savedPositions[table.id] || {
            x: (index % 3) * 340 + 60,
            y: Math.floor(index / 3) * 360 + 60,
          };

        tablePositions[table.id] = position;

        // Compute foreign keys map for this table (colId -> "targetTable.targetCol")
        const foreignKeys: Record<string, string> = {};
        relations.forEach((r) => {
          if (r.sourceTableId === table.id) {
            const tgtTable = tables.find((t) => t.id === r.targetTableId);
            const tgtCol = tgtTable?.columns.find((c) => c.id === r.targetColumnId);
            foreignKeys[r.sourceColumnId] = tgtTable
              ? `${tgtTable.name}.${tgtCol?.name || 'id'}`
              : 'relasi';
          }
        });

        const isSelected =
          (existingNode?.selected ?? false) ||
          selectedTableIdsRef.current.includes(table.id) ||
          selectedTableIdRef.current === table.id;

        return {
          id: table.id,
          type: 'tableNode',
          position,
          selected: isSelected,
          zIndex: 10,
          data: {
            table,
            foreignKeys,
            isSelected,
            onSelectTable: handleSelectTable,
            onDeleteTable: handleDeleteTable,
            onAddColumn: handleAddColumnToTable,
            onReorderColumns: handleReorderColumns,
          },
        };
      });

      // 2. Build group nodes wrapping member tables AND all their internal edges/waypoints
      const groupNodes: Node[] = [];
      groups.forEach((group) => {
        const memberTables = tables.filter((t) => group.tableIds.includes(t.id));
        if (memberTables.length === 0) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        // Bounding box from member tables
        memberTables.forEach((t) => {
          const pos = tablePositions[t.id] || { x: 60, y: 60 };
          const height = Math.max(120, 50 + t.columns.length * 36);
          minX = Math.min(minX, pos.x);
          minY = Math.min(minY, pos.y);
          maxX = Math.max(maxX, pos.x + 280);
          maxY = Math.max(maxY, pos.y + height);
        });

        // Expand bounding box to encompass all internal relationship routing paths
        const internalRelations = relations.filter(
          (r) => group.tableIds.includes(r.sourceTableId) && group.tableIds.includes(r.targetTableId)
        );

        internalRelations.forEach((rel) => {
          const sTable = tables.find((t) => t.id === rel.sourceTableId);
          const tTable = tables.find((t) => t.id === rel.targetTableId);
          const sPos = tablePositions[rel.sourceTableId] || { x: 0, y: 0 };
          const tPos = tablePositions[rel.targetTableId] || { x: 0, y: 0 };
          const sColIdx = sTable?.columns.findIndex((c) => c.id === rel.sourceColumnId) ?? 0;
          const tColIdx = tTable?.columns.findIndex((c) => c.id === rel.targetColumnId) ?? 0;

          const { sourceSide, targetSide } = resolveRelationSides(rel, sPos, tPos);
          const sIsLeft = sourceSide === 'left';
          const tIsLeft = targetSide === 'left';

          const sourcePoint: Point = {
            x: sIsLeft ? sPos.x : sPos.x + 280,
            y: sPos.y + 68 + Math.max(0, sColIdx) * 32,
          };
          const targetPoint: Point = {
            x: tIsLeft ? tPos.x : tPos.x + 280,
            y: tPos.y + 68 + Math.max(0, tColIdx) * 32,
          };

          const sourcePosition = sIsLeft ? Position.Left : Position.Right;
          const targetPosition = tIsLeft ? Position.Left : Position.Right;

          const siblingRels = internalRelations.filter((r) => r.sourceTableId === rel.sourceTableId);
          const laneIndex = Math.max(0, siblingRels.findIndex((r) => r.id === rel.id));
          const totalLanes = Math.max(1, siblingRels.length);

          let waypoints: Point[] = [];
          if (rel.customPath?.waypoints && rel.customPath.waypoints.length >= 4) {
            waypoints = rel.customPath.waypoints;
          } else {
            const laneOffset = (laneIndex - (totalLanes - 1) / 2) * 14;
            if (
              (sourcePosition === Position.Right && targetPosition === Position.Left) ||
              (sourcePosition === Position.Left && targetPosition === Position.Right)
            ) {
              const midX = (sourcePoint.x + targetPoint.x) / 2 + laneOffset;
              waypoints = [
                sourcePoint,
                { x: midX, y: sourcePoint.y },
                { x: midX, y: targetPoint.y },
                targetPoint,
              ];
            } else if (sourcePosition === Position.Right && targetPosition === Position.Right) {
              const commonX = Math.max(sourcePoint.x, targetPoint.x) + 32 + laneIndex * 16;
              waypoints = [
                sourcePoint,
                { x: commonX, y: sourcePoint.y },
                { x: commonX, y: targetPoint.y },
                targetPoint,
              ];
            } else if (sourcePosition === Position.Left && targetPosition === Position.Left) {
              const commonX = Math.min(sourcePoint.x, targetPoint.x) - 32 - laneIndex * 16;
              waypoints = [
                sourcePoint,
                { x: commonX, y: sourcePoint.y },
                { x: commonX, y: targetPoint.y },
                targetPoint,
              ];
            } else {
              waypoints = computeSmartOrthogonalPath({
                source: sourcePoint,
                target: targetPoint,
                sourcePosition,
                targetPosition,
                obstacles: [],
                sourceTableId: rel.sourceTableId,
                targetTableId: rel.targetTableId,
                laneIndex,
                totalLanes,
              });
            }
          }

          waypoints.forEach((pt) => {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
          });
        });

        const padX = 28;
        const padTop = 52;
        const padBottom = 28;

        const groupX = minX - padX;
        const groupY = minY - padTop;
        const groupWidth = Math.max(340, maxX - minX + padX * 2);
        const groupHeight = Math.max(180, maxY - minY + padTop + padBottom);

        const existingGroupNode = existingMap.get(group.id);
        const isGroupSelected =
          (existingGroupNode?.selected ?? false) || selectedGroupIdRef.current === group.id;

        groupNodes.push({
          id: group.id,
          type: 'groupNode',
          position: { x: groupX, y: groupY },
          selected: isGroupSelected,
          zIndex: -1,
          draggable: true,
          selectable: true,
          data: {
            group,
            width: groupWidth,
            height: groupHeight,
            tableCount: memberTables.length,
            isSelected: isGroupSelected,
            onSelectGroup: handleSelectGroup,
            onUngroup: handleUngroup,
            onRenameGroup: handleRenameGroup,
            onDeleteGroup: handleDeleteGroup,
          },
        });
      });

      return [...groupNodes, ...tableNodes];
    });
  }, [
    tables,
    relations,
    groups,
    historyState.positions,
    handleSelectTable,
    handleSelectGroup,
    handleDeleteTable,
    handleAddColumnToTable,
    handleReorderColumns,
    handleUngroup,
    handleRenameGroup,
    handleDeleteGroup,
    resolveRelationSides,
    setNodes,
  ]);

  // Callback to update cardinality directly from edge pill
  const handleUpdateCardinality = useCallback(
    (relationId: string, nextCard: Cardinality) => {
      updateSchema(
        (prev) => prev,
        (prev) => prev.map((r) => (r.id === relationId ? { ...r, cardinality: nextCard } : r))
      );
    },
    [updateSchema]
  );

  const handleHoverRelation = useCallback((relId: string | null) => {
    setHoveredRelationId(relId);
  }, []);

  const handleSelectRelationFromEdge = useCallback((relId: string) => {
    setSelectedRelationId(relId);
    setSelectedTableId(null);
    setSelectedTableIds([]);
  }, []);

  const handleDeleteRelationFromEdge = useCallback(
    (relId: string) => {
      updateSchema(
        (prev) => prev,
        (prev) => prev.filter((r) => r.id !== relId)
      );
      setSelectedRelationId(null);
    },
    [updateSchema]
  );

  const handleUpdateRelationPathFromEdge = useCallback(
    (relId: string, customPath?: CustomPathData) => {
      updateSchema(
        (prev) => prev,
        (prev) => prev.map((r) => (r.id === relId ? { ...r, customPath } : r))
      );
    },
    [updateSchema]
  );

  // Synchronize React Flow edges with state
  useEffect(() => {
    const isAnyActive = Boolean(hoveredRelationId || selectedRelationId || selectedTableId);

    // Sync liveEdgeRegistry with active relationship IDs to prevent ghost hop segments
    const activeRelIds = new Set(relations.map((r) => r.id));
    liveEdgeRegistry.sync(activeRelIds);

    // 1. Compute table obstacle boxes
    const obstacles = tables.map((t, index) => {
      const node = nodes.find((n) => n.id === t.id);
      const pos =
        node?.position ||
        historyState.positions?.[t.id] || {
          x: (index % 3) * 340 + 60,
          y: Math.floor(index / 3) * 360 + 60,
        };
      return {
        id: t.id,
        x: pos.x,
        y: pos.y,
        width: 280,
        height: Math.max(120, 50 + t.columns.length * 36),
      };
    });

    // 2. Group relations by sourceTableId and sort by column order to assign distinct parallel channel lanes
    const outgoingByTable = new Map<string, RelationshipData[]>();
    relations.forEach((rel) => {
      const list = outgoingByTable.get(rel.sourceTableId) || [];
      list.push(rel);
      outgoingByTable.set(rel.sourceTableId, list);
    });

    outgoingByTable.forEach((list, tableId) => {
      const tbl = tables.find((t) => t.id === tableId);
      list.sort((a, b) => {
        const colA = tbl?.columns.findIndex((c) => c.id === a.sourceColumnId) ?? 0;
        const colB = tbl?.columns.findIndex((c) => c.id === b.sourceColumnId) ?? 0;
        return colA - colB;
      });
    });

    // 3. Pre-extract all horizontal segments for Electrical Line Jumps (Arc Hop Crossovers)
    const allHorizontalSegments: HorizontalSegment[] = [];
    relations.forEach((rel) => {
      const sTable = tables.find((t) => t.id === rel.sourceTableId);
      const tTable = tables.find((t) => t.id === rel.targetTableId);
      const sNode = nodes.find((n) => n.id === rel.sourceTableId);
      const tNode = nodes.find((n) => n.id === rel.targetTableId);
      const sPos = sNode?.position || historyState.positions?.[rel.sourceTableId] || { x: 0, y: 0 };
      const tPos = tNode?.position || historyState.positions?.[rel.targetTableId] || { x: 0, y: 0 };

      const sColIdx = sTable?.columns.findIndex((c) => c.id === rel.sourceColumnId) ?? 0;
      const tColIdx = tTable?.columns.findIndex((c) => c.id === rel.targetColumnId) ?? 0;

      const siblingRels = outgoingByTable.get(rel.sourceTableId) || [rel];
      const laneIndex = Math.max(0, siblingRels.findIndex((r) => r.id === rel.id));
      const totalLanes = Math.max(1, siblingRels.length);

      const isInSameGroup = groups.some(
        (g) => g.tableIds.includes(rel.sourceTableId) && g.tableIds.includes(rel.targetTableId)
      );

      const isInternalEdge =
        (selectedTableIds.length > 1 &&
          selectedTableIds.includes(rel.sourceTableId) &&
          selectedTableIds.includes(rel.targetTableId)) ||
        isInSameGroup;

      const { sourceSide, targetSide } = resolveRelationSides(rel, sPos, tPos);
      const sIsLeft = sourceSide === 'left';
      const tIsLeft = targetSide === 'left';

      // Physical handle position in DOM: exactly 68px + colIndex * 32px for dead-center arc hop alignment
      const sourcePoint: Point = {
        x: sIsLeft ? sPos.x : sPos.x + 280,
        y: sPos.y + 68 + Math.max(0, sColIdx) * 32,
      };
      const targetPoint: Point = {
        x: tIsLeft ? tPos.x : tPos.x + 280,
        y: tPos.y + 68 + Math.max(0, tColIdx) * 32,
      };

      const sourcePosition = sIsLeft ? Position.Left : Position.Right;
      const targetPosition = tIsLeft ? Position.Left : Position.Right;

      const relObstacles = isInternalEdge
        ? obstacles.filter((o) => selectedTableIds.includes(o.id))
        : obstacles;

      let waypoints: Point[];
      if (rel.customPath?.waypoints && rel.customPath.waypoints.length >= 4) {
        const pts = rel.customPath.waypoints.map((p) => ({ ...p }));
        pts[0] = { ...sourcePoint };
        pts[1] = { x: pts[1].x, y: sourcePoint.y };
        pts[pts.length - 1] = { ...targetPoint };
        pts[pts.length - 2] = { x: pts[pts.length - 2].x, y: targetPoint.y };
        waypoints = cleanAndSimplifyWaypoints(pts);
      } else if (isInternalEdge) {
        const laneOffset = (laneIndex - (totalLanes - 1) / 2) * 14;
        if (
          (sourcePosition === Position.Right && targetPosition === Position.Left) ||
          (sourcePosition === Position.Left && targetPosition === Position.Right)
        ) {
          const midX = (sourcePoint.x + targetPoint.x) / 2 + laneOffset;
          waypoints = [
            sourcePoint,
            { x: midX, y: sourcePoint.y },
            { x: midX, y: targetPoint.y },
            targetPoint,
          ];
        } else if (sourcePosition === Position.Right && targetPosition === Position.Right) {
          const commonX = Math.max(sourcePoint.x, targetPoint.x) + 24 + laneIndex * 14;
          waypoints = [
            sourcePoint,
            { x: commonX, y: sourcePoint.y },
            { x: commonX, y: targetPoint.y },
            targetPoint,
          ];
        } else if (sourcePosition === Position.Left && targetPosition === Position.Left) {
          const commonX = Math.min(sourcePoint.x, targetPoint.x) - 24 - laneIndex * 14;
          waypoints = [
            sourcePoint,
            { x: commonX, y: sourcePoint.y },
            { x: commonX, y: targetPoint.y },
            targetPoint,
          ];
        } else {
          waypoints = computeSmartOrthogonalPath({
            source: sourcePoint,
            target: targetPoint,
            sourcePosition,
            targetPosition,
            obstacles: [],
            sourceTableId: rel.sourceTableId,
            targetTableId: rel.targetTableId,
            laneIndex,
            totalLanes,
          });
        }
      } else {
        waypoints = computeSmartOrthogonalPath({
          source: sourcePoint,
          target: targetPoint,
          sourcePosition,
          targetPosition,
          obstacles: relObstacles,
          sourceTableId: rel.sourceTableId,
          targetTableId: rel.targetTableId,
          laneIndex,
          totalLanes,
        });
      }

      const segments = extractHorizontalSegments(rel.id, waypoints);
      allHorizontalSegments.push(...segments);
    });

    const newEdges: Edge[] = relations.map((rel) => {
      const sourceTable = tables.find((t) => t.id === rel.sourceTableId);
      const targetTable = tables.find((t) => t.id === rel.targetTableId);
      const sourceCol = sourceTable?.columns.find((c) => c.id === rel.sourceColumnId);
      const targetCol = targetTable?.columns.find((c) => c.id === rel.targetColumnId);

      const sNode = nodes.find((n) => n.id === rel.sourceTableId);
      const tNode = nodes.find((n) => n.id === rel.targetTableId);
      const sPos = sNode?.position || historyState.positions?.[rel.sourceTableId] || { x: 0, y: 0 };
      const tPos = tNode?.position || historyState.positions?.[rel.targetTableId] || { x: 0, y: 0 };

      const siblingRels = outgoingByTable.get(rel.sourceTableId) || [rel];
      const laneIndex = Math.max(0, siblingRels.findIndex((r) => r.id === rel.id));
      const totalLanes = Math.max(1, siblingRels.length);

      const isInSameGroup = groups.some(
        (g) => g.tableIds.includes(rel.sourceTableId) && g.tableIds.includes(rel.targetTableId)
      );

      const isInternalEdge =
        (selectedTableIds.length > 1 &&
          selectedTableIds.includes(rel.sourceTableId) &&
          selectedTableIds.includes(rel.targetTableId)) ||
        isInSameGroup;

      const { sourceSide, targetSide } = resolveRelationSides(rel, sPos, tPos);

      const isSelected = selectedRelationId === rel.id;
      const isHovered = hoveredRelationId === rel.id;
      const isRelatedToSelectedTable =
        selectedTableId &&
        (rel.sourceTableId === selectedTableId || rel.targetTableId === selectedTableId);

      const isFocused = isSelected || isHovered || Boolean(isRelatedToSelectedTable);
      const isDimmed = isAnyActive && !isFocused;

      return {
        id: rel.id,
        source: rel.sourceTableId,
        target: rel.targetTableId,
        sourceHandle: `${rel.sourceColumnId}-${sourceSide}`,
        targetHandle: `${rel.targetColumnId}-${targetSide}`,
        type: 'customEdge',
        selected: isSelected,
        zIndex: isFocused ? 30 : 10,
        data: {
          relation: rel,
          isSourceNullable: sourceCol ? sourceCol.isNullable : false,
          isTargetNullable: targetCol ? targetCol.isNullable : false,
          laneIndex,
          totalLanes,
          routingStyle,
          isDimmed,
          isFocused,
          isInternalEdge,
          obstacles: isInternalEdge
            ? obstacles.filter((o) => selectedTableIds.includes(o.id))
            : obstacles,
          allHorizontalSegments,
          onHoverRelation: handleHoverRelation,
          onSelectRelation: handleSelectRelationFromEdge,
          onDeleteRelation: handleDeleteRelationFromEdge,
          onUpdateRelationPath: handleUpdateRelationPathFromEdge,
        },
      };
    });

    setEdges(newEdges);
  }, [
    relations,
    tables,
    groups,
    nodes,
    historyState.positions,
    selectedRelationId,
    selectedTableId,
    selectedTableIds,
    hoveredRelationId,
    routingStyle,
    resolveRelationSides,
    handleHoverRelation,
    handleSelectRelationFromEdge,
    handleDeleteRelationFromEdge,
    handleUpdateRelationPathFromEdge,
    setEdges,
  ]);

  // Helper to map Primary Key types to appropriate Foreign Key column types
  const mapPkTypeToFkType = (pkType: string): string => {
    const upper = pkType.trim().toUpperCase();
    if (upper.startsWith('SERIAL') || upper === 'SERIAL') return 'INT';
    if (upper.startsWith('BIGSERIAL') || upper === 'BIGSERIAL') return 'BIGINT';
    if (upper.startsWith('SMALLSERIAL') || upper === 'SMALLSERIAL') return 'SMALLINT';
    return pkType;
  };

  // Connect handle between tables (creating a foreign key relation with smart role detection & auto-FK generation)
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        return;
      }

      const sourceColId = connection.sourceHandle.replace('-right', '').replace('-left', '');
      const targetColId = connection.targetHandle.replace('-right', '').replace('-left', '');

      // Prevent connecting a column to itself on the same table
      if (connection.source === connection.target && sourceColId === targetColId) {
        showToast('Tidak dapat menghubungkan kolom ke dirinya sendiri', 'warning');
        return;
      }

      const sourceTable = tables.find((t) => t.id === connection.source);
      const targetTable = tables.find((t) => t.id === connection.target);
      if (!sourceTable || !targetTable) return;

      const sourceCol = sourceTable.columns.find((c) => c.id === sourceColId);
      const targetCol = targetTable.columns.find((c) => c.id === targetColId);
      if (!sourceCol || !targetCol) return;

      // Prevent duplicate relationships between the exact same columns
      const existingRel = relations.find(
        (r) =>
          (r.sourceTableId === connection.source &&
            r.targetTableId === connection.target &&
            r.sourceColumnId === sourceColId &&
            r.targetColumnId === targetColId) ||
          (r.sourceTableId === connection.target &&
            r.targetTableId === connection.source &&
            r.sourceColumnId === targetColId &&
            r.targetColumnId === sourceColId)
      );

      if (existingRel) {
        setSelectedRelationId(existingRel.id);
        setSelectedTableId(null);
        showToast('Relasi antara kedua kolom ini sudah ada!', 'warning');
        return;
      }

      const sourceSide = connection.sourceHandle.endsWith('-left') ? 'left' : 'right';
      const targetSide = connection.targetHandle.endsWith('-left') ? 'left' : 'right';

      // CASE A: Both columns are Primary Keys (e.g. users.id [PK] -> orders.id [PK])
      // -> Auto-create a clean Foreign Key column in the target table (e.g. `user_id` or `new_table_1_id`)
      if (sourceCol.isPrimary && targetCol.isPrimary && connection.source !== connection.target) {
        // Generate clean FK column name
        let baseColName = `${sourceTable.name.toLowerCase().replace(/s$/, '')}_id`;
        if (sourceTable.name.toLowerCase().startsWith('new_table_')) {
          baseColName = `${sourceTable.name.toLowerCase()}_id`;
        }

        let newColName = baseColName;
        let counter = 1;
        while (targetTable.columns.some((c) => c.name.toLowerCase() === newColName.toLowerCase())) {
          newColName = `${baseColName}_${counter++}`;
        }

        const newFkCol: ColumnData = {
          id: `col-fk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          name: newColName,
          type: mapPkTypeToFkType(sourceCol.type),
          isPrimary: false,
          isNullable: false,
          isUnique: false,
          isAutoIncrement: false,
        };

        const newRelation: RelationshipData = {
          id: `rel-${Math.random().toString(36).substring(2, 8)}`,
          sourceTableId: targetTable.id, // Child table (holds FK)
          sourceColumnId: newFkCol.id,
          targetTableId: sourceTable.id, // Parent table (holds PK)
          targetColumnId: sourceCol.id,
          sourceHandle: `${newFkCol.id}-${targetSide}`,
          targetHandle: `${sourceCol.id}-${sourceSide}`,
          cardinality: '1:N',
          sourceMarker: 'many-mandatory',
          targetMarker: 'one-mandatory',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        };

        updateSchema(
          (prev) =>
            prev.map((tbl) =>
              tbl.id === targetTable.id
                ? { ...tbl, columns: [...tbl.columns, newFkCol] }
                : tbl
            ),
          (prev) => [...prev, newRelation]
        );

        setSelectedRelationId(newRelation.id);
        setSelectedTableId(null);
        showToast(
          `Kolom Foreign Key "${newColName}" otomatis ditambahkan ke "${targetTable.name}"!`,
          'success'
        );
        return;
      }

      // CASE B: One column is PK and the other is Non-PK (Smart Role & Direction Inversion)
      if (sourceCol.isPrimary && !targetCol.isPrimary) {
        // Source is Parent (PK), Target is Child (FK)
        const isOneToOne = targetCol.isUnique;
        const newRelation: RelationshipData = {
          id: `rel-${Math.random().toString(36).substring(2, 8)}`,
          sourceTableId: targetTable.id, // Child table (holds FK)
          sourceColumnId: targetCol.id,
          targetTableId: sourceTable.id, // Parent table (holds PK)
          targetColumnId: sourceCol.id,
          sourceHandle: connection.targetHandle,
          targetHandle: connection.sourceHandle,
          cardinality: isOneToOne ? '1:1' : '1:N',
          sourceMarker: isOneToOne ? 'one-mandatory' : targetCol.isNullable ? 'many-optional' : 'many-mandatory',
          targetMarker: 'one-mandatory',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        };

        updateSchema(
          (prev) => prev,
          (prev) => [...prev, newRelation]
        );
        setSelectedRelationId(newRelation.id);
        setSelectedTableId(null);
        showToast(
          `Relasi ${isOneToOne ? 'One-to-One' : 'One-to-Many'} (${sourceTable.name}.${sourceCol.name} → ${targetTable.name}.${targetCol.name}) berhasil terhubung!`,
          'success'
        );
        return;
      }

      if (!sourceCol.isPrimary && targetCol.isPrimary) {
        // Source is Child (FK), Target is Parent (PK)
        const isOneToOne = sourceCol.isUnique;
        const newRelation: RelationshipData = {
          id: `rel-${Math.random().toString(36).substring(2, 8)}`,
          sourceTableId: sourceTable.id, // Child table (holds FK)
          sourceColumnId: sourceCol.id,
          targetTableId: targetTable.id, // Parent table (holds PK)
          targetColumnId: targetCol.id,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          cardinality: isOneToOne ? '1:1' : '1:N',
          sourceMarker: isOneToOne ? 'one-mandatory' : sourceCol.isNullable ? 'many-optional' : 'many-mandatory',
          targetMarker: 'one-mandatory',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        };

        updateSchema(
          (prev) => prev,
          (prev) => [...prev, newRelation]
        );
        setSelectedRelationId(newRelation.id);
        setSelectedTableId(null);
        showToast(
          `Relasi ${isOneToOne ? 'One-to-One' : 'One-to-Many'} (${targetTable.name}.${targetCol.name} → ${sourceTable.name}.${sourceCol.name}) berhasil terhubung!`,
          'success'
        );
        return;
      }

      // CASE C: Both columns are Non-PK (e.g. tableA.created_at -> tableB.created_at)
      // -> Auto-promote target column to Primary Key (PK) and source column as Foreign Key (FK)
      const isOneToOne = sourceCol.isUnique;
      const newRelation: RelationshipData = {
        id: `rel-${Math.random().toString(36).substring(2, 8)}`,
        sourceTableId: sourceTable.id, // Child table (holds FK)
        sourceColumnId: sourceCol.id,
        targetTableId: targetTable.id, // Parent table (promoted to PK)
        targetColumnId: targetCol.id,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        cardinality: isOneToOne ? '1:1' : '1:N',
        sourceMarker: isOneToOne ? 'one-mandatory' : sourceCol.isNullable ? 'many-optional' : 'many-mandatory',
        targetMarker: 'one-mandatory',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      };

      updateSchema(
        (prev) =>
          prev.map((tbl) =>
            tbl.id === targetTable.id
              ? {
                  ...tbl,
                  columns: tbl.columns.map((c) =>
                    c.id === targetCol.id ? { ...c, isPrimary: true } : c
                  ),
                }
              : tbl
          ),
        (prev) => [...prev, newRelation]
      );

      setSelectedRelationId(newRelation.id);
      setSelectedTableId(null);
      showToast(
        `Kolom "${targetTable.name}.${targetCol.name}" otomatis dijadikan Primary Key (PK) & relasi terhubung!`,
        'success'
      );
    },
    [tables, relations, updateSchema]
  );

  // Handle adding a brand new table
  const handleAddTable = useCallback(() => {
    const tableCount = tables.length + 1;
    const color = TABLE_COLOR_PRESETS[(tableCount - 1) % TABLE_COLOR_PRESETS.length].value;
    const newTable: TableData = {
      id: `tbl-${Date.now().toString(36)}`,
      name: `new_table_${tableCount}`,
      colorTag: color,
      columns: [
        {
          id: `col-id-${Date.now().toString(36)}`,
          name: 'id',
          type: 'SERIAL',
          isPrimary: true,
          isNullable: false,
          isUnique: true,
          isAutoIncrement: true,
        },
        {
          id: `col-created-${Date.now().toString(36)}`,
          name: 'created_at',
          type: 'TIMESTAMPTZ',
          isPrimary: false,
          isNullable: false,
          isUnique: false,
          isAutoIncrement: false,
          defaultValue: 'NOW()',
        },
      ],
    };

    updateSchema((prev) => [...prev, newTable]);
    setSelectedTableId(newTable.id);
    setSelectedTableIds([newTable.id]);
    setSelectedRelationId(null);
    showToast(`Tabel "${newTable.name}" dibuat!`);
  }, [tables.length, updateSchema]);

  // Handle quick table primitive
  const handleAddQuickTable = useCallback(
    (templateName: string) => {
      const id = `tbl-${templateName}-${Math.random().toString(36).substring(2, 6)}`;
      let columns = [
        { id: `col-1`, name: 'id', type: 'SERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
      ];

      if (templateName === 'users') {
        columns = [
          { id: `col-1`, name: 'id', type: 'UUID', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: false, defaultValue: 'gen_random_uuid()' },
          { id: `col-2`, name: 'email', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: `col-3`, name: 'password_hash', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: `col-4`, name: 'full_name', type: 'VARCHAR(100)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: `col-5`, name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ];
      } else if (templateName === 'profiles') {
        columns = [
          { id: `col-1`, name: 'id', type: 'SERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: `col-2`, name: 'user_id', type: 'UUID', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: `col-3`, name: 'bio', type: 'TEXT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: `col-4`, name: 'avatar_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: `col-5`, name: 'phone_number', type: 'VARCHAR(30)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ];
      } else if (templateName === 'products') {
        columns = [
          { id: `col-1`, name: 'id', type: 'SERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: `col-2`, name: 'title', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: `col-3`, name: 'sku', type: 'VARCHAR(50)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: `col-4`, name: 'price', type: 'DECIMAL(10,2)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: `col-5`, name: 'stock', type: 'INT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: '0' },
        ];
      } else if (templateName === 'orders') {
        columns = [
          { id: `col-1`, name: 'id', type: 'UUID', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: false, defaultValue: 'gen_random_uuid()' },
          { id: `col-2`, name: 'user_id', type: 'UUID', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: `col-3`, name: 'status', type: 'VARCHAR(50)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: "'pending'" },
          { id: `col-4`, name: 'total_amount', type: 'DECIMAL(10,2)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: `col-5`, name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ];
      } else if (templateName === 'audit_logs') {
        columns = [
          { id: `col-1`, name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: `col-2`, name: 'user_id', type: 'UUID', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: `col-3`, name: 'action', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: `col-4`, name: 'ip_address', type: 'VARCHAR(45)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: `col-5`, name: 'timestamp', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ];
      }

      const color = TABLE_COLOR_PRESETS[tables.length % TABLE_COLOR_PRESETS.length].value;
      const newTable: TableData = {
        id,
        name: templateName,
        colorTag: color,
        columns,
      };

      updateSchema((prev) => [...prev, newTable]);
      setSelectedTableId(newTable.id);
      setSelectedTableIds([newTable.id]);
    },
    [tables.length, updateSchema]
  );

  // Auto Layout
  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes } = getAutoLayoutedElements(nodes, edges, 'LR');
    setNodes([...layoutedNodes]);
    const newPosMap: Record<string, { x: number; y: number }> = {};
    layoutedNodes.forEach((n) => {
      newPosMap[n.id] = { ...n.position };
    });

    updateSchema(
      (prev) => prev,
      (prev) => prev,
      newPosMap
    );

    setTimeout(() => {
      rfInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [nodes, edges, setNodes, updateSchema]);

  // Focus specific table
  const handleFocusTable = useCallback(
    (tableId: string) => {
      setSelectedTableId(tableId);
      setSelectedTableIds([tableId]);
      const node = nodes.find((n) => n.id === tableId);
      if (node && rfInstanceRef.current) {
        rfInstanceRef.current.setCenter(
          node.position.x + 140,
          node.position.y + 100,
          { zoom: 1.1, duration: 400 }
        );
      }
    },
    [nodes]
  );

  // Import SQL DDL
  // Import SQL DDL
  const handleImportSql = (newTables: TableData[], newRelations: RelationshipData[]) => {
    updateSchema(newTables, newRelations, undefined, () => []);
    setSelectedTableId(null);
    setSelectedTableIds([]);
    setSelectedGroupId(null);
    setSelectedRelationId(null);
    setTimeout(() => {
      handleAutoLayout();
    }, 100);
  };

  // Load Preset
  const handleSelectPreset = (preset: PresetSchema) => {
    setProjectName(preset.name);
    resetHistory({
      tables: preset.tables,
      relations: preset.relations,
      groups: [],
      positions: {},
    });
    setSelectedTableId(null);
    setSelectedTableIds([]);
    setSelectedGroupId(null);
    setSelectedRelationId(null);
    setTimeout(() => {
      handleAutoLayout();
    }, 100);
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    updateSchema([], [], {}, () => []);
    setSelectedTableId(null);
    setSelectedTableIds([]);
    setSelectedGroupId(null);
    setSelectedRelationId(null);
  };

  // Group & Node drag events for Realtime Synchronized Movement (Rigid Body)
  const handleNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const group = groupsRef.current.find((g) => g.id === node.id);
      if (group) {
        const currentPosMap = getNodePositions();
        const startTablePositions: Record<string, { x: number; y: number }> = {};
        group.tableIds.forEach((tId) => {
          startTablePositions[tId] = {
            ...(currentPosMap[tId] || historyState.positions?.[tId] || { x: 0, y: 0 }),
          };
        });

        dragGroupStartRef.current = {
          groupId: group.id,
          startGroupPos: { x: node.position.x, y: node.position.y },
          startTablePositions,
        };
      } else {
        dragGroupStartRef.current = null;
      }
    },
    [getNodePositions, historyState.positions]
  );

  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (dragGroupStartRef.current && dragGroupStartRef.current.groupId === node.id) {
        const { startGroupPos, startTablePositions } = dragGroupStartRef.current;
        const deltaX = node.position.x - startGroupPos.x;
        const deltaY = node.position.y - startGroupPos.y;

        // Move all member tables smoothly in real-time
        setNodes((prevNodes) =>
          prevNodes.map((n) => {
            if (startTablePositions[n.id]) {
              const init = startTablePositions[n.id];
              return {
                ...n,
                position: {
                  x: Math.round(init.x + deltaX),
                  y: Math.round(init.y + deltaY),
                },
              };
            }
            return n;
          })
        );
      }
    },
    [setNodes]
  );

  // Node drag stop event - persist updated positions and shift waypoints
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (dragGroupStartRef.current && dragGroupStartRef.current.groupId === node.id) {
        const { startGroupPos, startTablePositions } = dragGroupStartRef.current;
        const deltaX = node.position.x - startGroupPos.x;
        const deltaY = node.position.y - startGroupPos.y;
        dragGroupStartRef.current = null;

        const group = groupsRef.current.find((g) => g.id === node.id);
        if (!group) return;

        if (deltaX !== 0 || deltaY !== 0) {
          const currentPosMap = getNodePositions();
          const nextPosMap = { ...currentPosMap };
          group.tableIds.forEach((tId) => {
            const init = startTablePositions[tId] || currentPosMap[tId] || { x: 0, y: 0 };
            nextPosMap[tId] = {
              x: Math.round(init.x + deltaX),
              y: Math.round(init.y + deltaY),
            };
          });

          // Shift waypoints of internal relations
          const updatedRelations = relations.map((rel) => {
            const isInternal =
              group.tableIds.includes(rel.sourceTableId) &&
              group.tableIds.includes(rel.targetTableId);
            if (isInternal && rel.customPath?.waypoints && rel.customPath.waypoints.length > 0) {
              return {
                ...rel,
                customPath: {
                  ...rel.customPath,
                  waypoints: rel.customPath.waypoints.map((pt) => ({
                    x: Math.round(pt.x + deltaX),
                    y: Math.round(pt.y + deltaY),
                  })),
                },
              };
            }
            return rel;
          });

          // Update local table nodes position immediately
          setNodes((prevNodes) =>
            prevNodes.map((n) => {
              if (nextPosMap[n.id]) {
                return { ...n, position: nextPosMap[n.id] };
              }
              return n;
            })
          );

          updateSchema(
            (prev) => prev,
            () => updatedRelations,
            nextPosMap
          );
        }
        return;
      }

      dragGroupStartRef.current = null;

      // Normal single TableNode drag stop
      const posMap = getNodePositions();
      posMap[node.id] = { ...node.position };
      updateSchema((prev) => prev, (prev) => prev, posMap);
    },
    [getNodePositions, relations, setNodes, updateSchema]
  );

  // Generate Junction / Pivot table for Many-to-Many relationships
  const handleGenerateJunctionTable = useCallback(
    (sourceTableId: string, targetTableId: string, relationId: string) => {
      const source = tables.find((t) => t.id === sourceTableId);
      const target = tables.find((t) => t.id === targetTableId);
      if (!source || !target) return;

      const junctionName = `${source.name}_${target.name}`;
      const junctionTableId = `tbl-junc-${Date.now().toString(36)}`;
      const sourceFkColId = `col-fk-${source.name}-${Date.now().toString(36)}`;
      const targetFkColId = `col-fk-${target.name}-${Date.now().toString(36)}`;
      const pkColId = `col-id-${Date.now().toString(36)}`;

      const sourcePk = source.columns.find((c) => c.isPrimary) || source.columns[0];
      const targetPk = target.columns.find((c) => c.isPrimary) || target.columns[0];

      const junctionTable: TableData = {
        id: junctionTableId,
        name: junctionName,
        colorTag: '#38bdf8',
        columns: [
          {
            id: pkColId,
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
            isNullable: false,
            isUnique: true,
            isAutoIncrement: true,
          },
          {
            id: sourceFkColId,
            name: `${source.name.replace(/s$/, '')}_id`,
            type: sourcePk?.type.toUpperCase().includes('UUID') ? 'UUID' : 'INT',
            isPrimary: false,
            isNullable: false,
            isUnique: false,
            isAutoIncrement: false,
          },
          {
            id: targetFkColId,
            name: `${target.name.replace(/s$/, '')}_id`,
            type: targetPk?.type.toUpperCase().includes('UUID') ? 'UUID' : 'INT',
            isPrimary: false,
            isNullable: false,
            isUnique: false,
            isAutoIncrement: false,
          },
          {
            id: `col-created-${Date.now().toString(36)}`,
            name: 'created_at',
            type: 'TIMESTAMPTZ',
            isPrimary: false,
            isNullable: false,
            isUnique: false,
            isAutoIncrement: false,
            defaultValue: 'NOW()',
          },
        ],
      };

      const rel1: RelationshipData = {
        id: `rel-${Math.random().toString(36).substring(2, 8)}`,
        sourceTableId: junctionTableId,
        sourceColumnId: sourceFkColId,
        targetTableId: source.id,
        targetColumnId: sourcePk?.id || '',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      };

      const rel2: RelationshipData = {
        id: `rel-${Math.random().toString(36).substring(2, 8)}`,
        sourceTableId: junctionTableId,
        sourceColumnId: targetFkColId,
        targetTableId: target.id,
        targetColumnId: targetPk?.id || '',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      };

      updateSchema(
        (prev) => [...prev, junctionTable],
        (prev) => [...prev.filter((r) => r.id !== relationId), rel1, rel2]
      );
      setSelectedTableId(junctionTableId);
      setSelectedTableIds([junctionTableId]);
      setSelectedRelationId(null);

      showToast(`Junction table "${junctionName}" dan 2 relasi 1:N berhasil dibuat!`, 'success');
      setTimeout(() => {
        handleAutoLayout();
      }, 100);
    },
    [tables, updateSchema, handleAutoLayout]
  );

  // Workspace Handlers (File & Folder Explorer)
  const handleSelectFile = useCallback(
    (fileId: string) => {
      if (fileId === activeFileId) return;

      setWorkspaceItems((currentItems) => {
        const targetFile = currentItems.find((i) => i.id === fileId && i.type === 'file') as
          | ErdFileItem
          | undefined;
        if (!targetFile) return currentItems;

        // 1. Snapshot current active file data first
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

        // 2. Switch to target file
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
          rfInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
        }, 100);

        return updatedItems;
      });
    },
    [activeFileId, projectName, dialect, tables, relations, groups, getNodePositions, resetHistory]
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
    [activeFileId, projectName, dialect, tables, relations, groups, getNodePositions, resetHistory]
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
    [activeFileId]
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
    [activeFileId, resetHistory]
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
    [activeFileId, dialect, tables, relations, groups, getNodePositions, resetHistory]
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
            rfInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
          }, 100);
        } catch (err) {
          showToast('Gagal membaca file diagram: format JSON tidak valid', 'error');
        }
      };
      reader.readAsText(file);
    },
    [resetHistory]
  );

  const handleMoveWorkspaceItem = useCallback(
    (itemId: string, targetParentId: string | null) => {
      setWorkspaceItems((prev) => {
        const item = prev.find((i) => i.id === itemId);
        if (!item) return prev;
        if (item.parentId === targetParentId) return prev;

        // Prevent moving a folder into itself or into its own descendants
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

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;
  const selectedRelation = relations.find((r) => r.id === selectedRelationId) || null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8fafc] dark:bg-[#020617] text-slate-800 dark:text-slate-100 select-none transition-colors">
      {/* Top Navigation Bar */}
      <Navbar
        projectName={projectName}
        setProjectName={setProjectName}
        dialect={dialect}
        setDialect={setDialect}
        onAddTable={handleAddTable}
        onAutoLayout={handleAutoLayout}
        onOpenImportModal={() => setIsImportOpen(true)}
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenTemplatesModal={() => setIsTemplatesOpen(true)}
        onClearCanvas={handleClearCanvas}
        totalTables={tables.length}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Studio Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Explorer) */}
        <Sidebar
          tables={tables}
          relations={relations}
          selectedTableId={selectedTableId}
          selectedRelationId={selectedRelationId}
          onSelectTable={handleSelectTable}
          onSelectRelation={(relId) => {
            setSelectedRelationId(relId);
            setSelectedTableId(null);
            setSelectedGroupId(null);
          }}
          onDeleteRelation={(relId) => {
            updateSchema(
              (prev) => prev,
              (prev) => prev.filter((r) => r.id !== relId)
            );
            setSelectedRelationId(null);
          }}
          onFocusTable={handleFocusTable}
          onAddQuickTable={handleAddQuickTable}
          workspaceItems={workspaceItems}
          activeFileId={activeFileId}
          onSelectFile={handleSelectFile}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onRenameWorkspaceItem={handleRenameWorkspaceItem}
          onDeleteWorkspaceItem={handleDeleteWorkspaceItem}
          onDuplicateFile={handleDuplicateFile}
          onExportFile={handleExportWorkspaceFile}
          onImportFile={handleImportWorkspaceFile}
          onMoveWorkspaceItem={handleMoveWorkspaceItem}
        />

        {/* Center Canvas */}
        <main className="flex-1 h-full relative">
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            routingStyle={routingStyle}
            onChangeRoutingStyle={handleRoutingStyleChange}
            theme={theme}
            onNodeClick={(_, node) => {
              if (node.type === 'groupNode') {
                setSelectedGroupId(node.id);
                setSelectedTableId(null);
                setSelectedTableIds([]);
                setSelectedRelationId(null);
              } else {
                setSelectedTableId(node.id);
                setSelectedTableIds([node.id]);
                setSelectedGroupId(null);
                setSelectedRelationId(null);
              }
            }}
            onEdgeClick={(_, edge) => {
              setSelectedRelationId(edge.id);
              setSelectedTableId(null);
              setSelectedTableIds([]);
              setSelectedGroupId(null);
            }}
            onPaneClick={() => {
              setSelectedTableId(null);
              setSelectedTableIds([]);
              setSelectedGroupId(null);
              setSelectedRelationId(null);
            }}
            onSelectionChange={handleSelectionChange}
            onInitReactFlow={(instance) => {
              rfInstanceRef.current = instance;
            }}
            onNodeDragStart={handleNodeDragStart}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={handleNodeDragStop}
          />
        </main>

        {/* Right Inspector */}
        <Inspector
          selectedTable={selectedTable}
          selectedRelation={selectedRelation}
          selectedTables={tables.filter((t) => selectedTableIds.includes(t.id))}
          selectedGroup={selectedGroup}
          tables={tables}
          relations={relations}
          dialect={dialect}
          onClose={() => {
            setSelectedTableId(null);
            setSelectedTableIds([]);
            setSelectedGroupId(null);
            setSelectedRelationId(null);
          }}
          onDeselectTable={handleDeselectTable}
          onUpdateTable={(updated) => {
            updateSchema((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }}
          onDeleteTable={handleDeleteTable}
          onBatchDeleteTables={handleBatchDeleteTables}
          onBatchUpdateColor={handleBatchUpdateColor}
          onCreateGroup={handleCreateGroup}
          onUngroup={handleUngroup}
          onRenameGroup={handleRenameGroup}
          onDeleteGroup={handleDeleteGroup}
          onUpdateGroupColor={handleUpdateGroupColor}
          onUpdateRelation={(updated) => {
            updateSchema(
              (prev) => prev,
              (prev) => prev.map((r) => (r.id === updated.id ? updated : r))
            );
          }}
          onDeleteRelation={(relId) => {
            updateSchema(
              (prev) => prev,
              (prev) => prev.filter((r) => r.id !== relId)
            );
            setSelectedRelationId(null);
          }}
          onGenerateJunctionTable={handleGenerateJunctionTable}
        />
      </div>

      {/* Modals */}
      <SqlImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportSql}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        tables={tables}
        relations={relations}
        currentDialect={dialect}
        projectName={projectName}
      />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectPreset={handleSelectPreset}
      />
    </div>
  );
};

export default App;
