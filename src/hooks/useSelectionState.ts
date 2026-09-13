import { useState, useCallback, useRef, useMemo } from 'react';
import { OnSelectionChangeParams, Node } from '@xyflow/react';
import { TableData, RelationshipData, ErdGroup } from '../types/schema';

interface UseSelectionStateProps {
  tablesRef: React.MutableRefObject<TableData[]>;
  groupsRef: React.MutableRefObject<ErdGroup[]>;
  relations: RelationshipData[];
  setNodes?: React.Dispatch<React.SetStateAction<Node[]>>;
}

export function useSelectionState({
  tablesRef,
  groupsRef,
  relations,
  setNodes,
}: UseSelectionStateProps) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [hoveredRelationId, setHoveredRelationId] = useState<string | null>(null);
  const [selectedColumnHighlight, setSelectedColumnHighlight] = useState<{
    tableId: string;
    columnId: string;
  } | null>(null);

  const selectedTableIdRef = useRef(selectedTableId);
  selectedTableIdRef.current = selectedTableId;

  const selectedTableIdsRef = useRef(selectedTableIds);
  selectedTableIdsRef.current = selectedTableIds;

  const selectedGroupIdRef = useRef(selectedGroupId);
  selectedGroupIdRef.current = selectedGroupId;

  // Compute all active relation IDs from selected column, relation, or hover state
  const activeRelationIds = useMemo(() => {
    const ids = new Set<string>();

    if (selectedColumnHighlight) {
      relations.forEach((r) => {
        if (
          (r.sourceTableId === selectedColumnHighlight.tableId &&
            r.sourceColumnId === selectedColumnHighlight.columnId) ||
          (r.targetTableId === selectedColumnHighlight.tableId &&
            r.targetColumnId === selectedColumnHighlight.columnId)
        ) {
          ids.add(r.id);
        }
      });
    }

    if (selectedRelationId) {
      ids.add(selectedRelationId);
    }

    if (hoveredRelationId) {
      ids.add(hoveredRelationId);
    }

    return Array.from(ids);
  }, [relations, selectedColumnHighlight, selectedRelationId, hoveredRelationId]);

  const clearSelection = useCallback(() => {
    setSelectedTableId(null);
    setSelectedTableIds([]);
    setSelectedGroupId(null);
    setSelectedRelationId(null);
    setSelectedColumnHighlight(null);
    setHoveredRelationId(null);
  }, []);

  const handleSelectTable = useCallback((tableId: string, event?: React.MouseEvent) => {
    const isMultiKey = Boolean(event?.ctrlKey || event?.metaKey || event?.shiftKey);
    if (isMultiKey) {
      setSelectedTableIds((prev) => {
        const isAlreadySelected = prev.includes(tableId);
        const next = isAlreadySelected
          ? prev.filter((id) => id !== tableId)
          : [...prev, tableId];
        if (next.length === 1) {
          setSelectedTableId(next[0]);
        } else if (next.length === 0) {
          setSelectedTableId(null);
        } else if (!isAlreadySelected) {
          setSelectedTableId(tableId);
        }
        return next;
      });
      setSelectedGroupId(null);
      setSelectedRelationId(null);
      setSelectedColumnHighlight(null);
    } else {
      setSelectedTableId((prev) => (prev === tableId ? prev : tableId));
      setSelectedTableIds((prev) => (prev.length === 1 && prev[0] === tableId ? prev : [tableId]));
      setSelectedGroupId((prev) => (prev === null ? prev : null));
      setSelectedRelationId((prev) => (prev === null ? prev : null));
      setSelectedColumnHighlight(null);
    }
  }, []);

  const handleSelectGroup = useCallback((groupId: string) => {
    setSelectedGroupId((prev) => (prev === groupId ? prev : groupId));
    setSelectedTableId((prev) => (prev === null ? prev : null));
    setSelectedTableIds((prev) => (prev.length === 0 ? prev : []));
    setSelectedRelationId((prev) => (prev === null ? prev : null));
    setSelectedColumnHighlight(null);
  }, []);

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
  }, [groupsRef, tablesRef]);

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
      if (setNodes) {
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
      }
    },
    [setNodes]
  );

  return {
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
    clearSelection,
    handleSelectTable,
    handleSelectGroup,
    handleSelectionChange,
    handleDeselectTable,
  };
}
