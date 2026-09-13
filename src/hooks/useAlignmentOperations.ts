import { useCallback } from 'react';
import { Node } from '@xyflow/react';
import { calculateAlignment, calculateDistribution, AlignMode, DistributeMode } from '../utils/alignment';
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
        showToast('Pilih minimal 2 tabel untuk meratakan posisi', 'info');
        return;
      }

      const newPositions = calculateAlignment(
        targetIds,
        nodesRef.current,
        lockedNodeIdsRef.current,
        mode
      );

      if (!newPositions) {
        showToast('Tidak ada tabel yang dapat diratakan atau posisi terkunci', 'warning');
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
        left: 'Rata Kiri (Align Left)',
        center: 'Rata Tengah Horizontal (Align Center)',
        right: 'Rata Kanan (Align Right)',
        top: 'Rata Atas (Align Top)',
        middle: 'Rata Tengah Vertikal (Align Middle)',
        bottom: 'Rata Bawah (Align Bottom)',
      };

      showToast(`Posisi ${targetIds.length} tabel diselaraskan: ${labelMap[mode]}`, 'success');
    },
    [lockedNodeIdsRef, nodesRef, setNodes, updateSchema]
  );

  const handleDistributeTables = useCallback(
    (mode: DistributeMode, targetIds: string[]) => {
      if (!targetIds || targetIds.length < 2) {
        showToast('Pilih minimal 2 tabel untuk meratakan jarak', 'info');
        return;
      }

      const newPositions = calculateDistribution(
        targetIds,
        nodesRef.current,
        lockedNodeIdsRef.current,
        mode
      );

      if (!newPositions) {
        showToast('Tidak dapat mendistribusikan posisi tabel', 'warning');
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

      const label = mode === 'horizontal' ? 'Secara Horizontal' : 'Secara Vertikal';
      showToast(`Jarak spasi ${targetIds.length} tabel diratakan ${label}`, 'success');
    },
    [lockedNodeIdsRef, nodesRef, setNodes, updateSchema]
  );

  return {
    handleAlignTables,
    handleDistributeTables,
  };
}
