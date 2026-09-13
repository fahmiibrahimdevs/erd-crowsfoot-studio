import { Node } from '@xyflow/react';

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 180;
const MIN_GAP_X = 60;
const MIN_GAP_Y = 50;
const MAX_ITERATIONS = 40;

interface NodeBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isLocked: boolean;
  isScope: boolean;
}

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
 * Resolves overlapping nodes by gently pushing them apart to nearest available empty space.
 * Preserves the overall topology and respects locked nodes.
 */
export const resolveOverlaps = (
  nodes: Node[],
  lockedNodeIds: string[] = [],
  scopeNodeIds?: string[]
): { positions: Record<string, { x: number; y: number }>; movedCount: number } => {
  // Only process table nodes (ignore group bounding boxes directly)
  const candidateNodes = nodes.filter((n) => n.type !== 'groupNode');
  if (candidateNodes.length < 2) {
    const defaultPos: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      defaultPos[n.id] = { ...n.position };
    });
    return { positions: defaultPos, movedCount: 0 };
  }

  const boxes: NodeBox[] = candidateNodes.map((n) => ({
    id: n.id,
    x: n.position.x,
    y: n.position.y,
    w: getNodeWidth(n),
    h: getNodeHeight(n),
    isLocked: lockedNodeIds.includes(n.id),
    isScope: !scopeNodeIds || scopeNodeIds.length === 0 || scopeNodeIds.includes(n.id),
  }));

  const initialPositions = new Map<string, { x: number; y: number }>();
  boxes.forEach((b) => initialPositions.set(b.id, { x: b.x, y: b.y }));

  let hasOverlap = false;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let movedInThisIteration = false;

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];

        // Skip if neither is in target scope
        if (!a.isScope && !b.isScope) continue;
        // Skip if both are locked
        if (a.isLocked && b.isLocked) continue;

        // Check AABB collision with margin
        const aRight = a.x + a.w + MIN_GAP_X;
        const bRight = b.x + b.w + MIN_GAP_X;
        const aBottom = a.y + a.h + MIN_GAP_Y;
        const bBottom = b.y + b.h + MIN_GAP_Y;

        const isOverlappingX = a.x < bRight && aRight > b.x;
        const isOverlappingY = a.y < bBottom && aBottom > b.y;

        if (isOverlappingX && isOverlappingY) {
          hasOverlap = true;

          // Calculate overlap depth in both axes
          const overlapX1 = aRight - b.x;
          const overlapX2 = bRight - a.x;
          const deltaX = overlapX1 < overlapX2 ? -overlapX1 : overlapX2;

          const overlapY1 = aBottom - b.y;
          const overlapY2 = bBottom - a.y;
          const deltaY = overlapY1 < overlapY2 ? -overlapY1 : overlapY2;

          // Push along the axis of minimum displacement
          if (Math.abs(deltaX) < Math.abs(deltaY)) {
            // Push Horizontally
            if (a.isLocked || !a.isScope) {
              b.x -= deltaX;
            } else if (b.isLocked || !b.isScope) {
              a.x += deltaX;
            } else {
              a.x += deltaX / 2;
              b.x -= deltaX / 2;
            }
          } else {
            // Push Vertically
            if (a.isLocked || !a.isScope) {
              b.y -= deltaY;
            } else if (b.isLocked || !b.isScope) {
              a.y += deltaY;
            } else {
              a.y += deltaY / 2;
              b.y -= deltaY / 2;
            }
          }

          movedInThisIteration = true;
        }
      }
    }

    if (!movedInThisIteration) break;
  }

  const finalPositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n) => {
    finalPositions[n.id] = { ...n.position };
  });

  let movedCount = 0;
  boxes.forEach((b) => {
    const init = initialPositions.get(b.id);
    const roundedX = Math.round(b.x);
    const roundedY = Math.round(b.y);

    if (init && (Math.abs(init.x - roundedX) > 1 || Math.abs(init.y - roundedY) > 1)) {
      movedCount++;
    }

    finalPositions[b.id] = { x: roundedX, y: roundedY };
  });

  return { positions: finalPositions, movedCount: hasOverlap ? movedCount : 0 };
};
