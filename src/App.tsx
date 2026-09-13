import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
} from '@xyflow/react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { ContextMenu } from './components/ContextMenu';
import { CommandPalette } from './components/CommandPalette';
import { SqlImportModal } from './components/Modals/SqlImportModal';
import { ExportModal } from './components/Modals/ExportModal';
import { TemplatesModal } from './components/Modals/TemplatesModal';
import { StudioToast } from './components/StudioToast';
import { PresentationToolbar } from './components/PresentationToolbar';
import {
  TableData,
  RelationshipData,
  ErdGroup,
  SqlDialect,
  EdgeRoutingStyle,
} from './types/schema';
import { PresetSchema } from './utils/presets';
import { getAutoLayoutedElements } from './utils/layout';
import { showToast } from './utils/alert';
import { useHistory } from './hooks/useHistory';
import { useLockManager } from './hooks/useLockManager';
import { useSelectionState } from './hooks/useSelectionState';
import { useCanvasDragSync } from './hooks/useCanvasDragSync';
import { useCanvasElements } from './hooks/useCanvasElements';
import { useTableOperations } from './hooks/useTableOperations';
import { useGroupOperations } from './hooks/useGroupOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useWorkspaceManager, getInitialWorkspaceState } from './hooks/useWorkspaceManager';

const ROUTING_STYLE_KEY = 'er_studio_routing_style';
const THEME_KEY = 'er_studio_theme';

export const App: React.FC = () => {
  const [initialWorkspace] = useState(() => getInitialWorkspaceState());

  const [projectName, setProjectName] = useState(
    initialWorkspace.activeFile.name.replace(/\.erd$/, '')
  );
  const [dialect, setDialect] = useState<SqlDialect>(
    initialWorkspace.activeFile.dialect || 'postgres'
  );

  // Theme Management (Dark by Default)
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

  // History State
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

  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const nodesRef = useRef<Node[]>([]);
  nodesRef.current = nodes;

  // Modals & Mode States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

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

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetType: 'canvas' | 'table' | 'group' | 'multi';
    targetId: string | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    targetType: 'canvas',
    targetId: null,
  });

  // 1. Lock Manager Hook
  const {
    lockedNodeIds,
    lockedNodeIdsRef,
    handleToggleLock,
  } = useLockManager(groupsRef);

  // 2. Selection State Hook
  const {
    selectedTableId,
    setSelectedTableId,
    selectedTableIdRef,
    selectedTableIds,
    setSelectedTableIds,
    selectedTableIdsRef,
    selectedGroupId,
    setSelectedGroupId,
    selectedGroupIdRef,
    selectedRelationId,
    setSelectedRelationId,
    hoveredRelationId,
    setHoveredRelationId,
    selectedColumnHighlight,
    setSelectedColumnHighlight,
    activeRelationIds,
    handleSelectTable,
    handleSelectGroup,
    handleSelectionChange,
    handleDeselectTable,
  } = useSelectionState({
    tablesRef,
    groupsRef,
    relations,
    setNodes,
  });

  // Centralized schema updater
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

        const currentPosMap: Record<string, { x: number; y: number }> = {};
        nodesRef.current.forEach((n) => {
          currentPosMap[n.id] = { ...n.position };
        });

        const nextPositions = newPositions || currentPosMap;

        return {
          tables: nextTables,
          relations: nextRelations,
          groups: nextGroups,
          positions: nextPositions,
        };
      }, skipHistory);
    },
    [commitHistory]
  );

  // 3. Canvas Drag & Sync Hook
  const {
    getNodePositions,
    handleNodesChange,
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop,
    isDraggingRef,
  } = useCanvasDragSync({
    groupsRef,
    lockedNodeIdsRef,
    nodesRef,
    setNodes,
    onNodesChange,
    relations,
    historyPositions: historyState.positions,
    updateSchema,
  });

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

  // 4. Group Operations Hook
  const {
    handleCreateGroup,
    handleUngroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleUpdateGroupColor,
  } = useGroupOperations({
    groupsRef,
    tablesRef,
    setSelectedGroupId,
    setSelectedTableId,
    setSelectedTableIds,
    updateSchema,
  });

  // 5. Table Operations Hook
  const {
    handleAddTable,
    handleAddQuickTable,
    handleDeleteTable,
    handleBatchDeleteTables,
    handleBatchUpdateColor,
    handleRenameTable,
    handleDuplicateTables,
    handleAddColumnToTable,
    handleReorderColumns,
    handleCopySql,
    handleConnect,
    handleGenerateJunctionTable,
  } = useTableOperations({
    tables,
    tablesRef,
    relations,
    dialect,
    historyPositions: historyState.positions,
    getNodePositions,
    setSelectedTableId,
    setSelectedTableIds,
    setSelectedRelationId,
    updateSchema,
  });

  // 6. Canvas Elements Transformer Hook (Nodes & Edges builder)
  useCanvasElements({
    tables,
    relations,
    groups,
    historyPositions: historyState.positions,
    lockedNodeIds,
    selectedTableId,
    selectedTableIds,
    selectedTableIdRef,
    selectedTableIdsRef,
    selectedGroupId,
    selectedGroupIdRef,
    selectedRelationId,
    hoveredRelationId,
    selectedColumnHighlight,
    activeRelationIds,
    routingStyle,
    isDraggingRef,
    nodes,
    setNodes,
    setEdges,
    setSelectedTableId,
    setSelectedTableIds,
    setSelectedGroupId,
    setSelectedRelationId,
    setHoveredRelationId,
    setSelectedColumnHighlight,
    handleSelectTable,
    handleDeleteTable,
    handleAddColumnToTable,
    handleReorderColumns,
    handleToggleLock,
    handleSelectGroup,
    handleUngroup,
    handleRenameGroup,
    handleDeleteGroup,
    updateSchema,
  });

  // Presentation Mode Handlers
  const handleNavigateToTable = useCallback(
    (tableId: string, columnId?: string) => {
      setSelectedTableId(tableId);
      setSelectedTableIds([tableId]);
      setSelectedGroupId(null);
      setSelectedRelationId(null);

      const node = nodes.find((n) => n.id === tableId);
      const pos =
        node?.position ||
        historyState.positions?.[tableId] || { x: 100, y: 100 };

      if (rfInstanceRef.current) {
        rfInstanceRef.current.setCenter(pos.x + 140, pos.y + 100, {
          zoom: 1.15,
          duration: 600,
        });
      }

      if (columnId) {
        setSelectedColumnHighlight({ tableId, columnId });
      } else {
        setSelectedColumnHighlight(null);
      }
    },
    [historyState.positions, nodes, setSelectedColumnHighlight, setSelectedGroupId, setSelectedRelationId, setSelectedTableId, setSelectedTableIds]
  );

  const handleFitView = useCallback(() => {
    if (rfInstanceRef.current) {
      rfInstanceRef.current.fitView({ padding: 0.2, duration: 600 });
    }
  }, []);

  // Workspace Manager Hook
  const {
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
  } = useWorkspaceManager({
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
    fitView: handleFitView,
  });

  const handleZoomIn = useCallback(() => {
    if (rfInstanceRef.current) {
      rfInstanceRef.current.zoomIn({ duration: 300 });
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (rfInstanceRef.current) {
      rfInstanceRef.current.zoomOut({ duration: 300 });
    }
  }, []);

  const handleStartPresentation = useCallback(() => {
    setIsPresentationMode(true);
    setSelectedGroupId(null);
    setSelectedRelationId(null);
    if (tables.length > 0) {
      const targetId = selectedTableId || tables[0].id;
      handleNavigateToTable(targetId);
    } else {
      handleFitView();
    }
    showToast('Mode Presentasi Aktif (Tekan Esc untuk keluar)', 'info');
  }, [tables, selectedTableId, handleNavigateToTable, handleFitView, setSelectedGroupId, setSelectedRelationId]);

  const handleExitPresentation = useCallback(() => {
    setIsPresentationMode(false);
  }, []);

  const handleNextTablePresentation = useCallback(() => {
    if (tables.length === 0) return;
    const currentIndex = tables.findIndex((t) => t.id === selectedTableId);
    const nextIndex = (currentIndex + 1) % tables.length;
    handleNavigateToTable(tables[nextIndex].id);
  }, [tables, selectedTableId, handleNavigateToTable]);

  const handlePrevTablePresentation = useCallback(() => {
    if (tables.length === 0) return;
    const currentIndex = tables.findIndex((t) => t.id === selectedTableId);
    const prevIndex = (currentIndex - 1 + tables.length) % tables.length;
    handleNavigateToTable(tables[prevIndex].id);
  }, [tables, selectedTableId, handleNavigateToTable]);

  // Auto Layout
  const handleAutoLayout = useCallback(() => {
    const currentPosMap = getNodePositions();
    const { nodes: layoutedNodes } = getAutoLayoutedElements(nodes, edges, 'LR');

    const newPosMap: Record<string, { x: number; y: number }> = {};
    layoutedNodes.forEach((n) => {
      const parentGroup = groupsRef.current.find((g) => g.tableIds.includes(n.id));
      const isLocked =
        lockedNodeIdsRef.current.includes(n.id) ||
        (parentGroup && lockedNodeIdsRef.current.includes(parentGroup.id));
      if (isLocked && currentPosMap[n.id]) {
        newPosMap[n.id] = { ...currentPosMap[n.id] };
        n.position = { ...currentPosMap[n.id] };
      } else {
        newPosMap[n.id] = { ...n.position };
      }
    });

    setNodes([...layoutedNodes]);

    updateSchema(
      (prev) => prev,
      (prev) => prev,
      newPosMap
    );

    setTimeout(() => {
      rfInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [getNodePositions, nodes, edges, groupsRef, lockedNodeIdsRef, setNodes, updateSchema]);

  // 7. Global Keyboard Shortcuts Hook
  useKeyboardShortcuts({
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
  });

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
    [nodes, setSelectedTableId, setSelectedTableIds]
  );

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

  // Context Menu Handlers
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();
    if (node.type === 'groupNode') {
      setSelectedGroupId(node.id);
      setSelectedTableId(null);
      setSelectedTableIds([]);
      setSelectedRelationId(null);
      setContextMenu({
        isOpen: true,
        x: event.clientX,
        y: event.clientY,
        targetType: 'group',
        targetId: node.id,
      });
    } else {
      const isPart =
        selectedTableIdsRef.current.includes(node.id) &&
        selectedTableIdsRef.current.length > 1;
      if (isPart) {
        setContextMenu({
          isOpen: true,
          x: event.clientX,
          y: event.clientY,
          targetType: 'multi',
          targetId: node.id,
        });
      } else {
        setSelectedTableId(node.id);
        setSelectedTableIds([node.id]);
        setSelectedGroupId(null);
        setSelectedRelationId(null);
        setContextMenu({
          isOpen: true,
          x: event.clientX,
          y: event.clientY,
          targetType: 'table',
          targetId: node.id,
        });
      }
    }
  }, [selectedTableIdsRef, setSelectedGroupId, setSelectedRelationId, setSelectedTableId, setSelectedTableIds]);

  const handlePaneContextMenu = useCallback((event: any) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      targetType: 'canvas',
      targetId: null,
    });
  }, []);

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;
  const selectedRelation = relations.find((r) => r.id === selectedRelationId) || null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8fafc] dark:bg-[#020617] text-slate-800 dark:text-slate-100 select-none transition-colors">
      {/* Top Navigation Bar */}
      {!isPresentationMode && (
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
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onClearCanvas={handleClearCanvas}
          totalTables={tables.length}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onStartPresentation={handleStartPresentation}
        />
      )}

      {/* Main Studio Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Explorer) */}
        {!isPresentationMode && (
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
        )}

        {/* Center Canvas */}
        <main className="flex-1 h-full relative">
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            routingStyle={routingStyle}
            onChangeRoutingStyle={handleRoutingStyleChange}
            theme={theme}
            onNodeClick={(event, node) => {
              if (node.type === 'groupNode') {
                setSelectedGroupId(node.id);
                setSelectedTableId(null);
                setSelectedTableIds([]);
                setSelectedRelationId(null);
                setSelectedColumnHighlight(null);
              } else {
                const isMultiKey = event.ctrlKey || event.metaKey || event.shiftKey;
                if (isMultiKey) {
                  setSelectedTableIds((prev) => {
                    const isAlreadySelected = prev.includes(node.id);
                    const next = isAlreadySelected
                      ? prev.filter((id) => id !== node.id)
                      : [...prev, node.id];
                    if (next.length === 1) {
                      setSelectedTableId(next[0]);
                    } else if (next.length === 0) {
                      setSelectedTableId(null);
                    } else if (!isAlreadySelected) {
                      setSelectedTableId(node.id);
                    }
                    return next;
                  });
                  setSelectedGroupId(null);
                  setSelectedRelationId(null);
                  setSelectedColumnHighlight(null);
                } else {
                  setSelectedTableId(node.id);
                  setSelectedTableIds([node.id]);
                  setSelectedGroupId(null);
                  setSelectedRelationId(null);
                  setSelectedColumnHighlight(null);
                }
              }
            }}
            onEdgeClick={(_, edge) => {
              setSelectedRelationId(edge.id);
              setSelectedTableId(null);
              setSelectedTableIds([]);
              setSelectedGroupId(null);
              setSelectedColumnHighlight(null);
            }}
            onPaneClick={() => {
              setSelectedTableId(null);
              setSelectedTableIds([]);
              setSelectedGroupId(null);
              setSelectedRelationId(null);
              setSelectedColumnHighlight(null);
              setHoveredRelationId(null);
            }}
            onSelectionChange={handleSelectionChange}
            onInitReactFlow={(instance) => {
              rfInstanceRef.current = instance;
            }}
            onNodeDragStart={handleNodeDragStart}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={handleNodeDragStop}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneContextMenu={handlePaneContextMenu}
          />
        </main>

        {/* Right Inspector */}
        {!isPresentationMode && (
          <Inspector
            selectedTable={selectedTable}
            selectedRelation={selectedRelation}
            selectedTables={tables.filter((t) => selectedTableIds.includes(t.id))}
            selectedGroup={selectedGroup}
            tables={tables}
            relations={relations}
            dialect={dialect}
            lockedNodeIds={lockedNodeIds}
            onToggleLock={handleToggleLock}
            onClose={() => {
              setSelectedTableId(null);
              setSelectedTableIds([]);
              setSelectedGroupId(null);
              setSelectedRelationId(null);
            }}
            onDeselectTable={handleDeselectTable}
            onUpdateTable={(updated) => {
              const currentTables = tablesRef.current;
              const cleanName = updated.name.trim().toLowerCase().replace(/\s+/g, '_');
              const target = currentTables.find((t) => t.id === updated.id);
              if (target && target.name !== cleanName && cleanName) {
                const isDuplicate = currentTables.some(
                  (t) => t.id !== updated.id && t.name.toLowerCase() === cleanName
                );
                if (isDuplicate) {
                  showToast(`Nama tabel "${cleanName}" sudah digunakan oleh tabel lain! Silakan gunakan nama lain.`, 'error');
                  return;
                }
              }
              updateSchema((prev) => prev.map((t) => (t.id === updated.id ? { ...updated, name: cleanName || updated.name } : t)));
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
            onGenerateJunctionTable={(sId, tId, rId) => {
              handleGenerateJunctionTable(sId, tId, rId);
              setTimeout(() => {
                handleAutoLayout();
              }, 100);
            }}
          />
        )}
      </div>

      {/* Presentation Mode Floating Toolbar & Overlay */}
      <PresentationToolbar
        isOpen={isPresentationMode}
        tables={tables}
        selectedTableId={selectedTableId}
        onSelectTable={handleNavigateToTable}
        onNextTable={handleNextTablePresentation}
        onPrevTable={handlePrevTablePresentation}
        onFitView={handleFitView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onExit={handleExitPresentation}
        projectName={projectName}
        dialect={dialect}
      />

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
        groups={groups}
        nodes={nodes}
        edges={edges}
        currentDialect={dialect}
        projectName={projectName}
      />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      {/* Spotlight Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tables={tables}
        onNavigateToTable={handleNavigateToTable}
        onAddTable={handleAddTable}
        onAutoLayout={handleAutoLayout}
        onOpenTemplatesModal={() => setIsTemplatesOpen(true)}
        onOpenImportModal={() => setIsImportOpen(true)}
        onOpenExportModal={() => setIsExportOpen(true)}
        onFitView={handleFitView}
        onClearCanvas={handleClearCanvas}
        routingStyle={routingStyle}
        onChangeRoutingStyle={handleRoutingStyleChange}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        dialect={dialect}
      />

      {/* Canvas Right-Click Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        targetType={contextMenu.targetType}
        targetId={contextMenu.targetId}
        selectedTableIds={selectedTableIds}
        selectedGroupId={selectedGroupId}
        tables={tables}
        groups={groups}
        lockedNodeIds={lockedNodeIds}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        onGroupSelection={() => {
          if (selectedTableIds.length > 1) {
            handleCreateGroup(selectedTableIds);
          }
        }}
        onUngroup={handleUngroup}
        onToggleLock={handleToggleLock}
        onDuplicateTables={handleDuplicateTables}
        onDeleteSelected={() => {
          if (contextMenu.targetType === 'multi' && selectedTableIds.length > 1) {
            handleBatchDeleteTables(selectedTableIds);
          } else if (contextMenu.targetType === 'table' && contextMenu.targetId) {
            handleDeleteTable(contextMenu.targetId);
          } else if (selectedTableId) {
            handleDeleteTable(selectedTableId);
          }
        }}
        onAddColumn={handleAddColumnToTable}
        onCopySql={handleCopySql}
        onRenameGroup={handleRenameGroup}
        onRenameTable={handleRenameTable}
        onDeleteGroup={handleDeleteGroup}
        onAddTable={() => {
          if (rfInstanceRef.current && contextMenu.x && contextMenu.y) {
            const flowPos = rfInstanceRef.current.screenToFlowPosition({
              x: contextMenu.x,
              y: contextMenu.y,
            });
            handleAddTable(flowPos);
          } else {
            handleAddTable();
          }
        }}
        onAutoLayout={handleAutoLayout}
        onOpenImportModal={() => setIsImportOpen(true)}
      />

      {/* Global Studio Toast Notifications (Native, Clean, Non-blocking) */}
      <StudioToast />
    </div>
  );
};

export default App;
