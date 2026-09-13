import { useEffect, useCallback } from 'react';
import { Node, Edge, Position } from '@xyflow/react';
import {
  TableData,
  RelationshipData,
  ErdGroup,
  EdgeRoutingStyle,
  CustomPathData,
  ColumnData,
} from '../types/schema';
import {
  Point,
  HorizontalSegment,
  liveEdgeRegistry,
  extractHorizontalSegments,
  computeSmartOrthogonalPath,
  cleanAndSimplifyWaypoints,
} from '../utils/orthogonalRouter';

export function resolveRelationSides(
  rel: RelationshipData,
  sPos: { x: number; y: number },
  tPos: { x: number; y: number }
): { sourceSide: 'left' | 'right'; targetSide: 'left' | 'right' } {
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
    sourceSide = 'right';
  } else {
    sourceSide = diffX >= 0 ? 'right' : 'left';
  }

  if (rel.targetHandle) {
    targetSide = rel.targetHandle.endsWith('-left') ? 'left' : 'right';
  } else if (isVerticallyStacked) {
    targetSide = 'right';
  } else {
    targetSide = diffX >= 0 ? 'left' : 'right';
  }

  return { sourceSide, targetSide };
}

interface UseCanvasElementsProps {
  tables: TableData[];
  relations: RelationshipData[];
  groups: ErdGroup[];
  historyPositions?: Record<string, { x: number; y: number }>;
  lockedNodeIds: string[];
  selectedTableId: string | null;
  selectedTableIds: string[];
  selectedTableIdRef: React.MutableRefObject<string | null>;
  selectedTableIdsRef: React.MutableRefObject<string[]>;
  selectedGroupId: string | null;
  selectedGroupIdRef: React.MutableRefObject<string | null>;
  selectedRelationId: string | null;
  hoveredRelationId: string | null;
  selectedColumnHighlight: { tableId: string; columnId: string } | null;
  activeRelationIds: string[];
  routingStyle: EdgeRoutingStyle;
  isDraggingRef: React.MutableRefObject<boolean>;
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setSelectedTableId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTableIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedGroupId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedRelationId: React.Dispatch<React.SetStateAction<string | null>>;
  setHoveredRelationId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedColumnHighlight: React.Dispatch<
    React.SetStateAction<{ tableId: string; columnId: string } | null>
  >;
  handleSelectTable: (tableId: string, event?: React.MouseEvent) => void;
  handleDeleteTable: (tableId: string) => void;
  handleAddColumnToTable: (tableId: string) => void;
  handleReorderColumns: (tableId: string, columns: ColumnData[]) => void;
  handleSortColumns?: (tableId: string) => void;
  handleToggleLock: (nodeIds: string[]) => void;
  handleSelectGroup: (groupId: string) => void;
  handleUngroup: (groupId: string) => void;
  handleRenameGroup: (groupId: string, newName: string) => void;
  handleDeleteGroup: (groupId: string) => void;
  updateSchema: (
    newTables: any,
    newRelations?: any,
    newPositions?: Record<string, { x: number; y: number }>
  ) => void;
}

export function useCanvasElements({
  tables,
  relations,
  groups,
  historyPositions,
  lockedNodeIds,
  selectedTableIds,
  selectedTableIdRef,
  selectedTableIdsRef,
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
  handleSortColumns,
  handleToggleLock,
  handleSelectGroup,
  handleUngroup,
  handleRenameGroup,
  handleDeleteGroup,
  updateSchema,
}: UseCanvasElementsProps) {
  const handleClickColumn = useCallback(
    (tableId: string, colId: string) => {
      // Toggle highlight state if clicking the same column
      if (
        selectedColumnHighlight?.tableId === tableId &&
        selectedColumnHighlight?.columnId === colId
      ) {
        setSelectedColumnHighlight(null);
        setSelectedRelationId(null);
        setHoveredRelationId(null);
        return;
      }

      setSelectedTableId(tableId);
      setSelectedTableIds([tableId]);
      setSelectedGroupId(null);
      setSelectedColumnHighlight({ tableId, columnId: colId });

      const matchingRels = relations.filter(
        (r) =>
          (r.sourceTableId === tableId && r.sourceColumnId === colId) ||
          (r.targetTableId === tableId && r.targetColumnId === colId)
      );

      if (matchingRels.length > 0) {
        setSelectedRelationId(matchingRels[0].id);
      } else {
        setSelectedRelationId(null);
      }
      setHoveredRelationId(null);
    },
    [
      relations,
      selectedColumnHighlight,
      setHoveredRelationId,
      setSelectedColumnHighlight,
      setSelectedGroupId,
      setSelectedRelationId,
      setSelectedTableId,
      setSelectedTableIds,
    ]
  );

  const handleHoverColumn = useCallback(
    (tableId: string | null, colId: string | null) => {
      if (!tableId || !colId) {
        setHoveredRelationId(null);
        return;
      }
      const matchRel = relations.find(
        (r) =>
          (r.sourceTableId === tableId && r.sourceColumnId === colId) ||
          (r.targetTableId === tableId && r.targetColumnId === colId)
      );
      setHoveredRelationId(matchRel ? matchRel.id : null);
    },
    [relations, setHoveredRelationId]
  );

  const handleHoverRelation = useCallback(
    (relId: string | null) => {
      setHoveredRelationId(relId);
    },
    [setHoveredRelationId]
  );

  const handleSelectRelationFromEdge = useCallback(
    (relId: string) => {
      setSelectedRelationId(relId);
      setSelectedTableId(null);
      setSelectedTableIds([]);
    },
    [setSelectedRelationId, setSelectedTableId, setSelectedTableIds]
  );

  const handleDeleteRelationFromEdge = useCallback(
    (relId: string) => {
      updateSchema(
        (prev: TableData[]) => prev,
        (prev: RelationshipData[]) => prev.filter((r) => r.id !== relId)
      );
      setSelectedRelationId(null);
    },
    [setSelectedRelationId, updateSchema]
  );

  const handleUpdateRelationPathFromEdge = useCallback(
    (relId: string, customPath?: CustomPathData) => {
      updateSchema(
        (prev: TableData[]) => prev,
        (prev: RelationshipData[]) =>
          prev.map((r) => (r.id === relId ? { ...r, customPath } : r))
      );
    },
    [updateSchema]
  );

  // Synchronize React Flow nodes with state (TableNodes & GroupNodes)
  useEffect(() => {
    setNodes((existingNodes) => {
      const existingMap = new Map(existingNodes.map((n) => [n.id, n]));
      const savedPositions = historyPositions || {};

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

        // Collect highlighted column IDs for this table
        const highlightedColIds: string[] = [];

        if (selectedColumnHighlight && selectedColumnHighlight.tableId === table.id) {
          highlightedColIds.push(selectedColumnHighlight.columnId);
        }

        relations.forEach((r) => {
          if (activeRelationIds.includes(r.id)) {
            if (r.sourceTableId === table.id && !highlightedColIds.includes(r.sourceColumnId)) {
              highlightedColIds.push(r.sourceColumnId);
            }
            if (r.targetTableId === table.id && !highlightedColIds.includes(r.targetColumnId)) {
              highlightedColIds.push(r.targetColumnId);
            }
          }
        });

        const isSelected =
          (existingNode?.selected ?? false) ||
          selectedTableIdsRef.current.includes(table.id) ||
          selectedTableIdRef.current === table.id;

        const isTableInLockedGroup = groups.some(
          (g) => lockedNodeIds.includes(g.id) && g.tableIds.includes(table.id)
        );
        const isLocked = lockedNodeIds.includes(table.id) || isTableInLockedGroup;

        return {
          id: table.id,
          type: 'tableNode',
          position,
          selected: isSelected,
          zIndex: 10,
          draggable: !isLocked,
          data: {
            table,
            foreignKeys,
            highlightedColIds,
            isSelected,
            isLocked,
            onSelectTable: handleSelectTable,
            onDeleteTable: handleDeleteTable,
            onAddColumn: handleAddColumnToTable,
            onReorderColumns: handleReorderColumns,
            onSortColumns: handleSortColumns,
            onHoverColumn: handleHoverColumn,
            onClickColumn: handleClickColumn,
            onToggleLock: handleToggleLock,
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
            y: sPos.y + 63 + Math.max(0, sColIdx) * 32,
          };
          const targetPoint: Point = {
            x: tIsLeft ? tPos.x : tPos.x + 280,
            y: tPos.y + 63 + Math.max(0, tColIdx) * 32,
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

        const isGroupLocked =
          lockedNodeIds.includes(group.id) ||
          (memberTables.length > 0 && memberTables.every((t) => lockedNodeIds.includes(t.id)));

        groupNodes.push({
          id: group.id,
          type: 'groupNode',
          position: { x: groupX, y: groupY },
          selected: isGroupSelected,
          zIndex: -1,
          draggable: !isGroupLocked,
          selectable: true,
          data: {
            group,
            width: groupWidth,
            height: groupHeight,
            tableCount: memberTables.length,
            isSelected: isGroupSelected,
            isLocked: isGroupLocked,
            onSelectGroup: handleSelectGroup,
            onUngroup: handleUngroup,
            onRenameGroup: handleRenameGroup,
            onDeleteGroup: handleDeleteGroup,
            onToggleLock: handleToggleLock,
          },
        });
      });

      return [...groupNodes, ...tableNodes];
    });
  }, [
    tables,
    relations,
    groups,
    lockedNodeIds,
    historyPositions,
    selectedColumnHighlight,
    activeRelationIds,
    handleSelectTable,
    handleSelectGroup,
    handleDeleteTable,
    handleAddColumnToTable,
    handleReorderColumns,
    handleSortColumns,
    handleHoverColumn,
    handleClickColumn,
    handleUngroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleToggleLock,
    setNodes,
    selectedGroupIdRef,
    selectedTableIdRef,
    selectedTableIdsRef,
  ]);

  // Synchronize React Flow edges with state
  useEffect(() => {
    const hasActiveHighlight = activeRelationIds.length > 0;

    // Sync liveEdgeRegistry with active relationship IDs to prevent ghost hop segments
    const activeRelIds = new Set(relations.map((r) => r.id));
    liveEdgeRegistry.sync(activeRelIds);

    // 1. Compute table obstacle boxes
    const obstacles = tables.map((t, index) => {
      const node = nodes.find((n) => n.id === t.id);
      const pos =
        node?.position ||
        historyPositions?.[t.id] || {
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

    // 2. Group relations by sourceTableId and sort by column order
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

    // 3. Pre-extract all horizontal segments for Electrical Line Jumps
    const allHorizontalSegments: HorizontalSegment[] = [];
    const waypointsMap = new Map<string, Point[]>();
    relations.forEach((rel) => {
      const sTable = tables.find((t) => t.id === rel.sourceTableId);
      const tTable = tables.find((t) => t.id === rel.targetTableId);
      const sNode = nodes.find((n) => n.id === rel.sourceTableId);
      const tNode = nodes.find((n) => n.id === rel.targetTableId);
      const sPos = sNode?.position || historyPositions?.[rel.sourceTableId] || { x: 0, y: 0 };
      const tPos = tNode?.position || historyPositions?.[rel.targetTableId] || { x: 0, y: 0 };

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

      const sourcePoint: Point = {
        x: sIsLeft ? sPos.x : sPos.x + 280,
        y: sPos.y + 63 + Math.max(0, sColIdx) * 32,
      };
      const targetPoint: Point = {
        x: tIsLeft ? tPos.x : tPos.x + 280,
        y: tPos.y + 63 + Math.max(0, tColIdx) * 32,
      };

      const sourcePosition = sIsLeft ? Position.Left : Position.Right;
      const targetPosition = tIsLeft ? Position.Left : Position.Right;

      const isDragging = isDraggingRef.current;
      const relObstacles = isDragging
        ? []
        : isInternalEdge
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
      } else if (isInternalEdge || isDragging) {
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

      waypointsMap.set(rel.id, waypoints);
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
      const sPos = sNode?.position || historyPositions?.[rel.sourceTableId] || { x: 0, y: 0 };
      const tPos = tNode?.position || historyPositions?.[rel.targetTableId] || { x: 0, y: 0 };

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
      const isColumnActive = activeRelationIds.includes(rel.id);

      const isFocused = isSelected || isHovered || isColumnActive;
      const isDimmed = hasActiveHighlight && !isFocused;

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
          precomputedWaypoints: waypointsMap.get(rel.id),
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
    historyPositions,
    selectedRelationId,
    selectedTableIds,
    hoveredRelationId,
    activeRelationIds,
    routingStyle,
    isDraggingRef,
    handleHoverRelation,
    handleSelectRelationFromEdge,
    handleDeleteRelationFromEdge,
    handleUpdateRelationPathFromEdge,
    setEdges,
  ]);

  return {
    handleClickColumn,
    handleHoverColumn,
    handleHoverRelation,
    handleSelectRelationFromEdge,
    handleDeleteRelationFromEdge,
    handleUpdateRelationPathFromEdge,
  };
}
