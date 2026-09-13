import { useCallback } from 'react';
import { Node } from '@xyflow/react';
import { calculateAlignment, calculateDistribution, AlignMode, DistributeMode } from '../utils/alignment';
import { resolveOverlaps } from '../utils/tidyLayout';
import { showToast } from '../utils/alert';

interface UseAlignmentOperationsProps {
  nodesRef: React.MutableRefObject<Node[]>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  lockedNodeIdsRef: React.MutableRefObject<string[]>;
  updateSchema: (
    newTables: any,
    newRelations?: any,
    newPositions?: Record<string, { x: number; y: number }>
  ) => void;
}

export function useAlignmentOperations({
  nodesRef,
  setNodes,
  lockedNodeIdsRef,
  updateSchema,
}: UseAlignmentOperationsProps) {
  const handleAlignTables = useCallback(
    (mode: AlignMode, targetIds: string[]) => {
      if (!targetIds || targetIds.length < 2) {
        showToast('Select at least 2 tables to align', 'info');
        return;
      }

      const newPositions = calculateAlignment(
        targetIds,
        nodesRef.current,
        lockedNodeIdsRef.current,
        mode
      );

      if (!newPositions) {
        showToast('No tables can be aligned or positions are locked', 'warning');
        return;
      }

      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (newPositions[node.id]) {
            return {
              ...node,
              position: { ...newPositions[node.id] },
            };
          }
          return node;
        })
      );

      updateSchema(
        (prev: any) => prev,
        (prev: any) => prev,
        newPositions
      );

      const labelMap: Record<AlignMode, string> = {
        left: 'Align Left',
        center: 'Align Center',
        right: 'Align Right',
        top: 'Align Top',
        middle: 'Align Middle',
        bottom: 'Align Bottom',
      };

      showToast(`Aligned ${targetIds.length} tables: ${labelMap[mode]}`, 'success');
    },
    [lockedNodeIdsRef, nodesRef, setNodes, updateSchema]
  );

  const handleDistributeTables = useCallback(
    (mode: DistributeMode, targetIds: string[]) => {
      if (!targetIds || targetIds.length < 2) {
        showToast('Select at least 2 tables to distribute', 'info');
        return;
      }

      const newPositions = calculateDistribution(
        targetIds,
        nodesRef.current,
        lockedNodeIdsRef.current,
        mode
      );

      if (!newPositions) {
        showToast('Unable to distribute tables', 'warning');
        return;
      }

      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (newPositions[node.id]) {
            return {
              ...node,
              position: { ...newPositions[node.id] },
            };
          }
          return node;
        })
      );

      updateSchema(
        (prev: any) => prev,
        (prev: any) => prev,
        newPositions
      );

      const label = mode === 'horizontal' ? 'Horizontally' : 'Vertically';
      showToast(`Distributed ${targetIds.length} tables ${label}`, 'success');
    },
    [lockedNodeIdsRef, nodesRef, setNodes, updateSchema]
  );

  const handleTidyOverlaps = useCallback(
    (scopeIds?: string[]) => {
      const { positions: newPositions, movedCount } = resolveOverlaps(
        nodesRef.current,
        lockedNodeIdsRef.current,
        scopeIds
      );

      if (movedCount === 0) {
        showToast('No overlapping tables found on canvas!', 'info');
        return;
      }

      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (newPositions[node.id]) {
            return {
              ...node,
              position: { ...newPositions[node.id] },
            };
          }
          return node;
        })
      );

      updateSchema(
        (prev: any) => prev,
        (prev: any) => prev,
        newPositions
      );

      showToast(`Successfully resolved overlaps for ${movedCount} tables!`, 'success');
    },
    [lockedNodeIdsRef, nodesRef, setNodes, updateSchema]
  );

  return {
    handleAlignTables,
    handleDistributeTables,
    handleTidyOverlaps,
  };
}
