import { Position } from '@xyflow/react';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoutingOptions {
  source: Point;
  target: Point;
  sourcePosition?: Position;
  targetPosition?: Position;
  obstacles?: Rect[];
  sourceTableId?: string;
  targetTableId?: string;
  laneIndex?: number;
  totalLanes?: number;
  padding?: number;
}

// Check if a point is inside a rectangle (with margin)
export function pointInRect(p: Point, rect: Rect, margin: number = 6): boolean {
  return (
    p.x >= rect.x - margin &&
    p.x <= rect.x + rect.width + margin &&
    p.y >= rect.y - margin &&
    p.y <= rect.y + rect.height + margin
  );
}

// Check if a line segment intersects a rectangle (with optional margin)
export function lineIntersectsRect(
  p1: Point,
  p2: Point,
  rect: Rect,
  margin: number = 8
): boolean {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  const rLeft = rect.x - margin;
  const rRight = rect.x + rect.width + margin;
  const rTop = rect.y - margin;
  const rBottom = rect.y + rect.height + margin;

  // No overlap in bounding boxes
  if (maxX < rLeft || minX > rRight || maxY < rTop || minY > rBottom) {
    return false;
  }

  // Vertical segment
  if (Math.abs(p1.x - p2.x) < 1) {
    return p1.x >= rLeft && p1.x <= rRight && !(maxY <= rTop || minY >= rBottom);
  }

  // Horizontal segment
  if (Math.abs(p1.y - p2.y) < 1) {
    return p1.y >= rTop && p1.y <= rBottom && !(maxX <= rLeft || minX >= rRight);
  }

  return true;
}

// Check if an orthogonal segment (strictly horizontal or vertical) intersects any obstacles
export function isSegmentBlocked(p1: Point, p2: Point, obstacles: Rect[], margin: number = 8): boolean {
  for (const obs of obstacles) {
    if (lineIntersectsRect(p1, p2, obs, margin)) {
      return true;
    }
  }
  return false;
}

// Clean and simplify orthogonal waypoints (remove micro-jogs, duplicate points, collinear points, and enforce 90° orthogonality)
export function cleanAndSimplifyWaypoints(
  rawPoints: Point[],
  tolerance: number = 4
): Point[] {
  if (rawPoints.length <= 2) return rawPoints;

  // Step 1: Remove consecutive duplicate points
  const deduped: Point[] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const curr = rawPoints[i];
    const prev = deduped[deduped.length - 1];
    if (Math.abs(curr.x - prev.x) > tolerance || Math.abs(curr.y - prev.y) > tolerance) {
      deduped.push(curr);
    }
  }

  if (deduped.length <= 2) return deduped;

  // Step 2: Ensure all adjacent segments are strictly orthogonal (90°)
  const orthogonal: Point[] = [deduped[0]];
  for (let i = 1; i < deduped.length; i++) {
    const prev = orthogonal[orthogonal.length - 1];
    const curr = deduped[i];

    const isH = Math.abs(prev.y - curr.y) <= 1;
    const isV = Math.abs(prev.x - curr.x) <= 1;

    if (isH) {
      orthogonal.push({ x: curr.x, y: prev.y });
    } else if (isV) {
      orthogonal.push({ x: prev.x, y: curr.y });
    } else {
      // Non-orthogonal diagonal jump: insert a 90° corner
      orthogonal.push({ x: curr.x, y: prev.y });
      orthogonal.push(curr);
    }
  }

  // Step 3: Remove collinear points (points lying on the same horizontal or vertical line)
  const simplified: Point[] = [orthogonal[0]];
  for (let i = 1; i < orthogonal.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = orthogonal[i];
    const next = orthogonal[i + 1];

    const isCollinearH = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
    const isCollinearV = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;

    if (!isCollinearH && !isCollinearV) {
      simplified.push(curr);
    }
  }
  simplified.push(orthogonal[orthogonal.length - 1]);

  return simplified;
}

export interface HorizontalSegment {
  edgeId: string;
  y: number;
  minX: number;
  maxX: number;
}

// Global live registry of rendered horizontal segments across all edges in canvas
class LiveEdgeSegmentRegistry {
  private segments = new Map<string, HorizontalSegment[]>();

  public register(edgeId: string, waypoints: Point[]) {
    if (!edgeId) return;
    const segs = extractHorizontalSegments(edgeId, waypoints);
    this.segments.set(edgeId, segs);
  }

  public unregister(edgeId: string) {
    this.segments.delete(edgeId);
  }

  public clear() {
    this.segments.clear();
  }

  public sync(activeEdgeIds: Set<string>) {
    const keysToDelete: string[] = [];
    this.segments.forEach((_, key) => {
      if (!activeEdgeIds.has(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((k) => this.segments.delete(k));
  }

  public getAllSegments(excludeEdgeId?: string): HorizontalSegment[] {
    const all: HorizontalSegment[] = [];
    this.segments.forEach((segs, id) => {
      if (!excludeEdgeId || (id !== excludeEdgeId && !excludeEdgeId.includes(id) && !id.includes(excludeEdgeId))) {
        all.push(...segs);
      }
    });
    return all;
  }
}

export const liveEdgeRegistry = new LiveEdgeSegmentRegistry();

// Extract all significant horizontal segments from orthogonal waypoints with exact subpixel float precision
export function extractHorizontalSegments(
  edgeId: string,
  waypoints: Point[]
): HorizontalSegment[] {
  const clean = cleanAndSimplifyWaypoints(waypoints);
  const segments: HorizontalSegment[] = [];

  for (let i = 0; i < clean.length - 1; i++) {
    const p1 = clean[i];
    const p2 = clean[i + 1];

    if (Math.abs(p1.y - p2.y) <= 1.5) {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      if (maxX - minX >= 16) {
        segments.push({
          edgeId,
          y: p1.y, // Exact float subpixel coordinate
          minX,
          maxX,
        });
      }
    }
  }

  return segments;
}

// Generate smooth rounded orthogonal SVG path with quadratic fillet curves and Electrical Line Jumps (Arc Hop Bridges)
export function createRoundedOrthogonalPathWithJumps(
  points: Point[],
  crossSegments: HorizontalSegment[] = [],
  myEdgeId?: string,
  cornerRadius: number = 8,
  jumpRadius: number = 6
): { path: string; labelX: number; labelY: number } {
  const clean = cleanAndSimplifyWaypoints(points);
  if (clean.length < 2) return { path: '', labelX: 0, labelY: 0 };
  if (clean.length === 2) {
    const p1 = clean[0];
    const p2 = clean[1];
    const isV = Math.abs(p1.x - p2.x) <= 1.5;

    if (!isV || crossSegments.length === 0) {
      return {
        path: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
        labelX: (p1.x + p2.x) / 2,
        labelY: (p1.y + p2.y) / 2,
      };
    }
  }

  const numSegments = clean.length - 1;

  // Precompute corner points for smooth fillet arcs
  const cornerIns: Point[] = [];
  const cornerOuts: Point[] = [];

  for (let i = 1; i < clean.length - 1; i++) {
    const prev = clean[i - 1];
    const curr = clean[i];
    const next = clean[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.hypot(v2x, v2y);

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);

    if (r <= 0 || (v1x === 0 && v1y === 0) || (v2x === 0 && v2y === 0)) {
      cornerIns.push({ ...curr });
      cornerOuts.push({ ...curr });
    } else {
      cornerIns.push({
        x: curr.x - (v1x / len1) * r,
        y: curr.y - (v1y / len1) * r,
      });
      cornerOuts.push({
        x: curr.x + (v2x / len2) * r,
        y: curr.y + (v2y / len2) * r,
      });
    }
  }

  let path = `M ${clean[0].x} ${clean[0].y}`;

  for (let i = 0; i < numSegments; i++) {
    const startPoint = i === 0 ? clean[0] : cornerOuts[i - 1];
    const endPoint = i === numSegments - 1 ? clean[clean.length - 1] : cornerIns[i];

    const isV = Math.abs(startPoint.x - endPoint.x) <= 1.5;

    if (isV && crossSegments.length > 0) {
      const segX = startPoint.x;
      const minY = Math.min(startPoint.y, endPoint.y);
      const maxY = Math.max(startPoint.y, endPoint.y);
      const goingDown = startPoint.y < endPoint.y;

      const safeMargin = cornerRadius + jumpRadius + 2; // 16px minimum clearance from corners

      // Find all intersecting horizontal segments from other edges
      const validJumps: number[] = [];
      crossSegments.forEach((cross) => {
        if (!cross.edgeId) return;
        if (
          myEdgeId &&
          (cross.edgeId === myEdgeId ||
            myEdgeId.includes(cross.edgeId) ||
            cross.edgeId.includes(myEdgeId))
        ) {
          return;
        }

        // Strict geometric intersection: X falls inside horizontal span, and Y falls inside vertical span
        const isStrictlyIntersectingX = segX > cross.minX + 8 && segX < cross.maxX - 8;
        const isStrictlyIntersectingY =
          cross.y >= minY + safeMargin && cross.y <= maxY - safeMargin;

        if (isStrictlyIntersectingX && isStrictlyIntersectingY) {
          validJumps.push(cross.y);
        }
      });

      // Sort jumps in travel direction
      if (goingDown) {
        validJumps.sort((a, b) => a - b);
      } else {
        validJumps.sort((a, b) => b - a);
      }

      // Deduplicate nearby jump points
      const dedupedJumps: number[] = [];
      for (const y of validJumps) {
        if (
          dedupedJumps.length === 0 ||
          Math.abs(y - dedupedJumps[dedupedJumps.length - 1]) >= 12
        ) {
          dedupedJumps.push(y);
        }
      }

      // Draw vertical segment with Line Jump Arcs (electrical schematic style)
      for (const yc of dedupedJumps) {
        const R = Math.min(jumpRadius, 6);
        if (goingDown) {
          // Downward travel: arc bends to right (clockwise)
          path += ` L ${segX} ${yc - R} A ${R} ${R} 0 0 1 ${segX} ${yc + R}`;
        } else {
          // Upward travel: arc bends to right (counter-clockwise)
          path += ` L ${segX} ${yc + R} A ${R} ${R} 0 0 0 ${segX} ${yc - R}`;
        }
      }
      path += ` L ${endPoint.x} ${endPoint.y}`;
    } else {
      path += ` L ${endPoint.x} ${endPoint.y}`;
    }

    // Draw Corner Fillet if not the last segment
    if (i < numSegments - 1) {
      const currCorner = clean[i + 1];
      const nextOut = cornerOuts[i];
      if (
        Math.abs(currCorner.x - nextOut.x) > 0.5 ||
        Math.abs(currCorner.y - nextOut.y) > 0.5
      ) {
        path += ` Q ${currCorner.x} ${currCorner.y} ${nextOut.x} ${nextOut.y}`;
      } else {
        path += ` L ${nextOut.x} ${nextOut.y}`;
      }
    }
  }

  // Find longest segment for centered label placement
  let longestSegment = { start: clean[0], end: clean[1], len: 0 };
  for (let i = 0; i < clean.length - 1; i++) {
    const p1 = clean[i];
    const p2 = clean[i + 1];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (len > longestSegment.len) {
      longestSegment = { start: p1, end: p2, len };
    }
  }

  const labelX = (longestSegment.start.x + longestSegment.end.x) / 2;
  const labelY = (longestSegment.start.y + longestSegment.end.y) / 2;

  return { path, labelX, labelY };
}

// Generate smooth rounded orthogonal SVG path with quadratic fillet curves
export function createRoundedOrthogonalPath(
  points: Point[],
  radius: number = 8
): { path: string; labelX: number; labelY: number } {
  return createRoundedOrthogonalPathWithJumps(points, [], undefined, radius, 6);
}

// Compute Smart Auto Orthogonal Multi-Step Path with Strict 90° Siku and Obstacle Avoidance
export function computeSmartOrthogonalPath(options: RoutingOptions): Point[] {
  const {
    source,
    target,
    sourcePosition = Position.Right,
    targetPosition = Position.Left,
    obstacles = [],
    sourceTableId,
    targetTableId,
    laneIndex = 0,
    totalLanes = 1,
    padding = 24,
  } = options;

  const sourceDir = sourcePosition === Position.Left ? -1 : 1;
  const targetDir = targetPosition === Position.Right ? 1 : -1;

  // Staggered distinct channel offsets so parallel exit lines never overlap
  const laneGap = 14;
  const stub1 = padding + laneIndex * laneGap;
  const stub2 = padding + (laneIndex % 3) * 8;
  const laneOffset = (laneIndex - (totalLanes - 1) / 2) * 14;

  const relevantObstacles = obstacles.filter(
    (o) => o.id !== sourceTableId && o.id !== targetTableId
  );

  const dx = target.x - source.x;
  const dy = target.y - source.y;

  // Case 1: Same Side Left (Left-to-Left Bracket)
  if (sourcePosition === Position.Left && targetPosition === Position.Left) {
    let commonX = Math.min(source.x, target.x) - padding - laneIndex * laneGap;
    // Check if any obstacle is on the left corridor
    const minY = Math.min(source.y, target.y);
    const maxY = Math.max(source.y, target.y);
    relevantObstacles.forEach((obs) => {
      if (obs.y + obs.height >= minY - 6 && obs.y <= maxY + 6) {
        const obsLeft = obs.x - 8;
        const obsRight = obs.x + obs.width + 8;
        if (commonX >= obsLeft && commonX <= obsRight) {
          commonX = obsLeft - 16 - laneIndex * 8;
        }
      }
    });

    return cleanAndSimplifyWaypoints([
      source,
      { x: commonX, y: source.y },
      { x: commonX, y: target.y },
      target,
    ]);
  }

  // Case 2: Same Side Right (Right-to-Right Bracket)
  if (sourcePosition === Position.Right && targetPosition === Position.Right) {
    let commonX = Math.max(source.x, target.x) + padding + laneIndex * laneGap;
    // Check if any obstacle is on the right corridor
    const minY = Math.min(source.y, target.y);
    const maxY = Math.max(source.y, target.y);
    relevantObstacles.forEach((obs) => {
      if (obs.y + obs.height >= minY - 6 && obs.y <= maxY + 6) {
        const obsLeft = obs.x - 8;
        const obsRight = obs.x + obs.width + 8;
        if (commonX >= obsLeft && commonX <= obsRight) {
          commonX = obsRight + 16 + laneIndex * 8;
        }
      }
    });

    return cleanAndSimplifyWaypoints([
      source,
      { x: commonX, y: source.y },
      { x: commonX, y: target.y },
      target,
    ]);
  }

  // Case 3: Forward Right-to-Left
  if (sourcePosition === Position.Right && targetPosition === Position.Left) {
    const isForward = dx >= 8;
    if (isForward) {
      if (Math.abs(dy) <= 8 && !isSegmentBlocked(source, target, relevantObstacles, 8)) {
        return [source, target];
      }
      const midX = (source.x + target.x) / 2 + laneOffset;
      const bendX = Math.max(source.x + 6, Math.min(target.x - 6, midX));
      const pA: Point = { x: bendX, y: source.y };
      const pB: Point = { x: bendX, y: target.y };

      return cleanAndSimplifyWaypoints([source, pA, pB, target]);
    }
  }

  // Case 4: Forward Left-to-Right
  if (sourcePosition === Position.Left && targetPosition === Position.Right) {
    const isForward = dx <= -8;
    if (isForward) {
      if (Math.abs(dy) <= 8 && !isSegmentBlocked(source, target, relevantObstacles, 8)) {
        return [source, target];
      }
      const midX = (source.x + target.x) / 2 + laneOffset;
      const bendX = Math.min(source.x - 6, Math.max(target.x + 6, midX));
      const pA: Point = { x: bendX, y: source.y };
      const pB: Point = { x: bendX, y: target.y };

      return cleanAndSimplifyWaypoints([source, pA, pB, target]);
    }
  }

  // Complex / Backward Obstacle Navigation using Multi-Channel Grid Pathfinder
  const startStub: Point = { x: source.x + sourceDir * stub1, y: source.y };
  const endStub: Point = { x: target.x + targetDir * stub2, y: target.y };

  // Collect candidate X channels
  const xs = new Set<number>();
  xs.add(startStub.x);
  xs.add(endStub.x);
  xs.add((source.x + target.x) / 2 + laneOffset);

  relevantObstacles.forEach((obs) => {
    xs.add(obs.x - 28 - laneIndex * 6);
    xs.add(obs.x + obs.width + 28 + laneIndex * 6);
  });

  // Collect candidate Y channels
  const ys = new Set<number>();
  ys.add(startStub.y);
  ys.add(endStub.y);
  ys.add((source.y + target.y) / 2 + laneOffset);

  relevantObstacles.forEach((obs) => {
    ys.add(obs.y - 28 - laneIndex * 6);
    ys.add(obs.y + obs.height + 28 + laneIndex * 6);
  });

  const sortedXs = Array.from(xs).sort((a, b) => a - b);
  const sortedYs = Array.from(ys).sort((a, b) => a - b);

  // A* Search on Orthogonal Grid from startStub to endStub
  interface GridNode {
    x: number;
    y: number;
    g: number;
    h: number;
    f: number;
    parent: GridNode | null;
    dir: 'H' | 'V' | null;
  }

  const startNode: GridNode = {
    x: startStub.x,
    y: startStub.y,
    g: 0,
    h: Math.abs(endStub.x - startStub.x) + Math.abs(endStub.y - startStub.y),
    f: 0,
    parent: null,
    dir: null,
  };
  startNode.f = startNode.h;

  const openList: GridNode[] = [startNode];
  const closedSet = new Set<string>();
  const nodeKey = (n: { x: number; y: number }) => `${Math.round(n.x)},${Math.round(n.y)}`;

  let bestNode: GridNode | null = null;
  let iterations = 0;

  while (openList.length > 0 && iterations < 400) {
    iterations++;
    openList.sort((a, b) => a.f - b.f);
    const curr = openList.shift()!;

    if (Math.abs(curr.x - endStub.x) < 2 && Math.abs(curr.y - endStub.y) < 2) {
      bestNode = curr;
      break;
    }

    const key = nodeKey(curr);
    if (closedSet.has(key)) continue;
    closedSet.add(key);

    // Expand to neighbor X (Horizontal steps)
    for (const nx of sortedXs) {
      if (Math.abs(nx - curr.x) < 2) continue;
      const nextPoint: Point = { x: nx, y: curr.y };
      if (isSegmentBlocked(curr, nextPoint, relevantObstacles, 8)) continue;

      const dist = Math.abs(nx - curr.x);
      const bendCost = curr.dir === 'V' ? 40 : 0;
      const g = curr.g + dist + bendCost;
      const h = Math.abs(endStub.x - nx) + Math.abs(endStub.y - curr.y);

      openList.push({
        x: nx,
        y: curr.y,
        g,
        h,
        f: g + h,
        parent: curr,
        dir: 'H',
      });
    }

    // Expand to neighbor Y (Vertical steps)
    for (const ny of sortedYs) {
      if (Math.abs(ny - curr.y) < 2) continue;
      const nextPoint: Point = { x: curr.x, y: ny };
      if (isSegmentBlocked(curr, nextPoint, relevantObstacles, 8)) continue;

      const dist = Math.abs(ny - curr.y);
      const bendCost = curr.dir === 'H' ? 40 : 0;
      const g = curr.g + dist + bendCost;
      const h = Math.abs(endStub.x - curr.x) + Math.abs(endStub.y - ny);

      openList.push({
        x: curr.x,
        y: ny,
        g,
        h,
        f: g + h,
        parent: curr,
        dir: 'V',
      });
    }
  }

  if (bestNode) {
    const rawPath: Point[] = [];
    let curr: GridNode | null = bestNode;
    while (curr) {
      rawPath.unshift({ x: curr.x, y: curr.y });
      curr = curr.parent;
    }
    return cleanAndSimplifyWaypoints([source, ...rawPath, target]);
  }

  // Fallback: Safe Bypass
  let bypassY: number;
  if (relevantObstacles.length > 0) {
    const allTops = relevantObstacles.map((o) => o.y - 28);
    const allBottoms = relevantObstacles.map((o) => o.y + o.height + 28);
    const minTop = Math.min(...allTops);
    const maxBottom = Math.max(...allBottoms);

    bypassY =
      Math.abs(source.y - minTop) <= Math.abs(source.y - maxBottom)
        ? minTop - 16 - laneIndex * 12
        : maxBottom + 16 + laneIndex * 12;
  } else {
    bypassY =
      source.y <= target.y
        ? target.y + 36 + laneIndex * 16
        : source.y + 36 + laneIndex * 16;
  }

  return cleanAndSimplifyWaypoints([
    source,
    startStub,
    { x: startStub.x, y: bypassY },
    { x: endStub.x, y: bypassY },
    endStub,
    target,
  ]);
}
