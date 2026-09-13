import { Node } from '@xyflow/react';

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributeMode = 'horizontal' | 'vertical';

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 180;
const MIN_DISTRIBUTION_GAP = 40;

const getNodeWidth = (node: Node): number => {
  return (
    node.measured?.width ||
    (typeof node.width === 'number' ? node.width : null) ||
    (node.initialWidth as number) ||
    DEFAULT_NODE_WIDTH
  );
};

const getNodeHeight = (node: Node): number => {
  return (
    node.measured?.height ||
    (typeof node.height === 'number' ? node.height : null) ||
    (node.initialHeight as number) ||
    DEFAULT_NODE_HEIGHT
  );
};

/**
 * Calculates new positions to align selected nodes along a specified axis.
 */
export const calculateAlignment = (
  selectedIds: string[],
  nodes: Node[],
  lockedNodeIds: string[] = [],
  mode: AlignMode
): Record<string, { x: number; y: number }> | null => {
  if (selectedIds.length < 2) return null;

  // Filter valid candidate nodes that exist in nodes list
  const selectedNodes = nodes.filter((n) => selectedIds.includes(n.id));
  if (selectedNodes.length < 2) return null;

  // Filter out locked nodes from being repositioned
  const movableNodes = selectedNodes.filter((n) => !lockedNodeIds.includes(n.id));
  if (movableNodes.length === 0) return null;

  // Calculate bounding box of all selected nodes (including locked ones as alignment reference)
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  selectedNodes.forEach((node) => {
    const w = getNodeWidth(node);
    const h = getNodeHeight(node);
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x + w);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y + h);
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const newPositions: Record<string, { x: number; y: number }> = {};

  // Build full position map for all current nodes
  nodes.forEach((n) => {
    newPositions[n.id] = { ...n.position };
  });

  // Calculate new position for movable nodes
  movableNodes.forEach((node) => {
    const w = getNodeWidth(node);
    const h = getNodeHeight(node);
    let targetX = node.position.x;
    let targetY = node.position.y;

    switch (mode) {
      case 'left':
        targetX = Math.round(minX);
        break;
      case 'center':
        targetX = Math.round(centerX - w / 2);
        break;
      case 'right':
        targetX = Math.round(maxX - w);
        break;
      case 'top':
        targetY = Math.round(minY);
        break;
      case 'middle':
        targetY = Math.round(centerY - h / 2);
        break;
      case 'bottom':
        targetY = Math.round(maxY - h);
        break;
    }

    newPositions[node.id] = { x: targetX, y: targetY };
  });

  return newPositions;
};

/**
 * Calculates new positions to distribute selected nodes evenly in space.
 */
export const calculateDistribution = (
  selectedIds: string[],
  nodes: Node[],
  lockedNodeIds: string[] = [],
  mode: DistributeMode
): Record<string, { x: number; y: number }> | null => {
  if (selectedIds.length < 2) return null;

  const selectedNodes = nodes.filter((n) => selectedIds.includes(n.id));
  if (selectedNodes.length < 2) return null;

  const movableNodes = selectedNodes.filter((n) => !lockedNodeIds.includes(n.id));
  if (movableNodes.length === 0) return null;

  const newPositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n) => {
    newPositions[n.id] = { ...n.position };
  });

  if (mode === 'horizontal') {
    // Sort nodes left-to-right
    const sorted = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const totalWidthOfAll = sorted.reduce((sum, n) => sum + getNodeWidth(n), 0);
    const totalSpan = last.position.x + getNodeWidth(last) - first.position.x;
    const availableSpace = totalSpan - totalWidthOfAll;
    const gap = sorted.length > 1 ? Math.max(MIN_DISTRIBUTION_GAP, availableSpace / (sorted.length - 1)) : MIN_DISTRIBUTION_GAP;

    let currentX = first.position.x;
    sorted.forEach((node, idx) => {
      if (idx > 0) {
        currentX += getNodeWidth(sorted[idx - 1]) + gap;
      }
      if (!lockedNodeIds.includes(node.id)) {
        newPositions[node.id] = {
          x: Math.round(currentX),
          y: Math.round(node.position.y),
        };
      }
    });
  } else {
    // Sort nodes top-to-bottom
    const sorted = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const totalHeightOfAll = sorted.reduce((sum, n) => sum + getNodeHeight(n), 0);
    const totalSpan = last.position.y + getNodeHeight(last) - first.position.y;
    const availableSpace = totalSpan - totalHeightOfAll;
    const gap = sorted.length > 1 ? Math.max(MIN_DISTRIBUTION_GAP, availableSpace / (sorted.length - 1)) : MIN_DISTRIBUTION_GAP;

    let currentY = first.position.y;
    sorted.forEach((node, idx) => {
      if (idx > 0) {
        currentY += getNodeHeight(sorted[idx - 1]) + gap;
      }
      if (!lockedNodeIds.includes(node.id)) {
        newPositions[node.id] = {
          x: Math.round(node.position.x),
          y: Math.round(currentY),
        };
      }
    });
  }

  return newPositions;
};
