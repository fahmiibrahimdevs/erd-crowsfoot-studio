import { useCallback, useRef, useEffect } from 'react';
import { Node, NodeChange } from '@xyflow/react';
import { ErdGroup, RelationshipData } from '../types/schema';

interface UseCanvasDragSyncProps {
  groupsRef: React.MutableRefObject<ErdGroup[]>;
  lockedNodeIdsRef: React.MutableRefObject<string[]>;
  nodesRef: React.MutableRefObject<Node[]>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onNodesChange: (changes: NodeChange[]) => void;
  relations: RelationshipData[];
  historyPositions?: Record<string, { x: number; y: number }>;
  updateSchema: (
    newTables: any,
    newRelations?: any,
    newPositions?: Record<string, { x: number; y: number }>
  ) => void;
}

export function useCanvasDragSync({
  groupsRef,
  lockedNodeIdsRef,
  nodesRef,
  setNodes,
  onNodesChange,
  relations,
  historyPositions,
  updateSchema,
}: UseCanvasDragSyncProps) {
  const dragGroupStartRef = useRef<{
    groupId: string;
    startGroupPos: { x: number; y: number };
    startTablePositions: Record<string, { x: number; y: number }>;
  } | null>(null);

  const isDraggingRef = useRef(false);
  const dragRafIdRef = useRef<number | null>(null);

  // Clean up rAF on unmount
  useEffect(() => {
    return () => {
      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
      }
    };
  }, []);

  // Stable helper to retrieve current node positions map without re-triggering dependency chains
  const getNodePositions = useCallback(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    nodesRef.current.forEach((n) => {
      posMap[n.id] = { ...n.position };
    });
    return posMap;
  }, [nodesRef]);

  // Intercept node position changes to strictly freeze locked tables and groups
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filteredChanges = changes.filter((c) => {
        if (c.type === 'position' && 'id' in c) {
          if (lockedNodeIdsRef.current.includes(c.id)) {
            return false;
          }
          const parentGroup = groupsRef.current.find((g) => g.tableIds.includes(c.id));
          if (parentGroup && lockedNodeIdsRef.current.includes(parentGroup.id)) {
            return false;
          }
        }
        return true;
      });
      onNodesChange(filteredChanges);
    },
    [groupsRef, lockedNodeIdsRef, onNodesChange]
  );

  // Group & Node drag events for Realtime Synchronized Movement (Rigid Body with 60FPS rAF Throttling)
  const handleNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (lockedNodeIdsRef.current.includes(node.id)) {
        isDraggingRef.current = false;
        dragGroupStartRef.current = null;
        return;
      }
      const parentGroup = groupsRef.current.find((g) => g.tableIds.includes(node.id));
      if (parentGroup && lockedNodeIdsRef.current.includes(parentGroup.id)) {
        isDraggingRef.current = false;
        dragGroupStartRef.current = null;
        return;
      }
      isDraggingRef.current = true;
      const group = groupsRef.current.find((g) => g.id === node.id);
      if (group) {
        const currentPosMap = getNodePositions();
        const startTablePositions: Record<string, { x: number; y: number }> = {};
        group.tableIds.forEach((tId) => {
          if (!lockedNodeIdsRef.current.includes(tId)) {
            startTablePositions[tId] = {
              ...(currentPosMap[tId] || historyPositions?.[tId] || { x: 0, y: 0 }),
            };
          }
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
    [getNodePositions, groupsRef, historyPositions, lockedNodeIdsRef]
  );

  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (lockedNodeIdsRef.current.includes(node.id)) return;
      const parentGroup = groupsRef.current.find((g) => g.tableIds.includes(node.id));
      if (parentGroup && lockedNodeIdsRef.current.includes(parentGroup.id)) return;

      if (dragGroupStartRef.current && dragGroupStartRef.current.groupId === node.id) {
        const { startGroupPos, startTablePositions } = dragGroupStartRef.current;
        const deltaX = node.position.x - startGroupPos.x;
        const deltaY = node.position.y - startGroupPos.y;

        // Frame-rate synchronized (60fps/120fps) node translation via requestAnimationFrame
        if (dragRafIdRef.current !== null) {
          cancelAnimationFrame(dragRafIdRef.current);
        }

        dragRafIdRef.current = requestAnimationFrame(() => {
          dragRafIdRef.current = null;
          setNodes((prevNodes) =>
            prevNodes.map((n) => {
              if (startTablePositions[n.id] && !lockedNodeIdsRef.current.includes(n.id)) {
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
        });
      }
    },
    [groupsRef, lockedNodeIdsRef, setNodes]
  );

  // Node drag stop event - persist updated positions, shift waypoints, and restore full precision routing
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
        dragRafIdRef.current = null;
      }
      isDraggingRef.current = false;

      if (lockedNodeIdsRef.current.includes(node.id)) {
        dragGroupStartRef.current = null;
        return;
      }
      const parentGroup = groupsRef.current.find((g) => g.tableIds.includes(node.id));
      if (parentGroup && lockedNodeIdsRef.current.includes(parentGroup.id)) {
        dragGroupStartRef.current = null;
        return;
      }

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
            if (!lockedNodeIdsRef.current.includes(tId)) {
              const init = startTablePositions[tId] || currentPosMap[tId] || { x: 0, y: 0 };
              nextPosMap[tId] = {
                x: Math.round(init.x + deltaX),
                y: Math.round(init.y + deltaY),
              };
            }
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
            (prev: any) => prev,
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
      updateSchema((prev: any) => prev, (prev: any) => prev, posMap);
    },
    [getNodePositions, groupsRef, lockedNodeIdsRef, relations, setNodes, updateSchema]
  );

  return {
    getNodePositions,
    handleNodesChange,
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop,
    isDraggingRef,
  };
}
