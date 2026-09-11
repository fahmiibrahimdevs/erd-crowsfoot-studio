import React, { memo, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  EdgeProps,
  Position,
  useReactFlow,
} from '@xyflow/react';
import { X, RotateCcw } from 'lucide-react';
import {
  RelationshipData,
  CrowsFootMarker,
  EdgeRoutingStyle,
  CustomPathData,
} from '../types/schema';
import { confirmDialog, showToast } from '../utils/alert';
import {
  Point,
  Rect,
  HorizontalSegment,
  liveEdgeRegistry,
  cleanAndSimplifyWaypoints,
  createRoundedOrthogonalPathWithJumps,
  computeSmartOrthogonalPath,
} from '../utils/orthogonalRouter';

export interface CustomEdgeData {
  relation?: RelationshipData;
  isSourceNullable?: boolean;
  isTargetNullable?: boolean;
  laneIndex?: number;
  totalLanes?: number;
  routingStyle?: EdgeRoutingStyle;
  isDimmed?: boolean;
  isFocused?: boolean;
  obstacles?: Rect[];
  allHorizontalSegments?: HorizontalSegment[];
  isInternalEdge?: boolean;
  precomputedWaypoints?: Point[];
  onHoverRelation?: (relationId: string | null) => void;
  onDeleteRelation?: (relationId: string) => void;
  onSelectRelation?: (relationId: string) => void;
  onUpdateRelationPath?: (relationId: string, customPath?: CustomPathData) => void;
}

// Render SVG elements for Crow's Foot markers
const renderCrowsFoot = (
  x: number,
  y: number,
  pos: Position,
  marker: CrowsFootMarker,
  color: string,
  strokeWidth: number = 1.5
) => {
  const dir = pos === Position.Right ? 1 : -1;
  const barLen = 7.5;
  const prongSpread = 6;

  if (marker === 'one-simple') {
    const x1 = x + 7 * dir;
    return (
      <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
        {/* Horizontal stem seamlessly connecting to table border */}
        <line x1={x} y1={y} x2={x1} y2={y} />
        {/* Single vertical cardinality bar */}
        <line x1={x1} y1={y - barLen} x2={x1} y2={y + barLen} />
      </g>
    );
  }

  if (marker === 'one-mandatory') {
    const x1 = x + 6 * dir;
    const x2 = x + 12 * dir;
    return (
      <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
        {/* Horizontal stem connecting through both bars to table border */}
        <line x1={x} y1={y} x2={x2} y2={y} />
        {/* Two vertical mandatory bars with clean breathing room */}
        <line x1={x1} y1={y - barLen} x2={x1} y2={y + barLen} />
        <line x1={x2} y1={y - barLen} x2={x2} y2={y + barLen} />
      </g>
    );
  }

  if (marker === 'one-optional') {
    const x1 = x + 6 * dir;
    const cx = x + 14 * dir;
    return (
      <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
        {/* Horizontal stem connecting through circle and bar to table border */}
        <line x1={x} y1={y} x2={cx + 3.2 * dir} y2={y} />
        {/* Vertical bar */}
        <line x1={x1} y1={y - barLen} x2={x1} y2={y + barLen} />
        {/* Optional circle */}
        <circle cx={cx} cy={y} r={3.2} className="fill-slate-50 dark:fill-slate-950" />
      </g>
    );
  }

  if (marker === 'many-simple') {
    const xApex = x + 11 * dir;
    return (
      <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
        {/* Three crow's foot prongs (top diagonal, middle stem, bottom diagonal) attached flush to table border */}
        <line x1={x} y1={y - prongSpread} x2={xApex} y2={y} />
        <line x1={x} y1={y} x2={xApex} y2={y} />
        <line x1={x} y1={y + prongSpread} x2={xApex} y2={y} />
      </g>
    );
  }

  if (marker === 'many-mandatory') {
    const xApex = x + 11 * dir;
    return (
      <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
        {/* Three crow's foot prongs attached flush to table border */}
        <line x1={x} y1={y - prongSpread} x2={xApex} y2={y} />
        <line x1={x} y1={y} x2={xApex} y2={y} />
        <line x1={x} y1={y + prongSpread} x2={xApex} y2={y} />
        {/* Mandatory vertical bar */}
        <line x1={xApex} y1={y - barLen} x2={xApex} y2={y + barLen} />
      </g>
    );
  }

  if (marker === 'many-optional') {
    const xApex = x + 9 * dir;
    const cx = x + 16 * dir;
    return (
      <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
        {/* Three crow's foot prongs attached flush to table border */}
        <line x1={x} y1={y - prongSpread} x2={xApex} y2={y} />
        <line x1={x} y1={y} x2={xApex} y2={y} />
        <line x1={x} y1={y + prongSpread} x2={xApex} y2={y} />
        {/* Horizontal stem to optional circle */}
        <line x1={xApex} y1={y} x2={cx + 3.2 * dir} y2={y} />
        {/* Optional circle */}
        <circle cx={cx} cy={y} r={3.2} className="fill-slate-50 dark:fill-slate-950" />
      </g>
    );
  }

  return null;
};

type DragState =
  | { type: 'segment'; segIndex: number; isVertical: boolean; initialPoints: Point[] }
  | { type: 'corner'; pointIndex: number; initialPoints: Point[] }
  | { type: 'midpoint'; segIndex: number; initialPoints: Point[] }
  | null;

export const CustomEdge: React.FC<EdgeProps> = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  style = {},
  selected,
  data,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);
  const [livePoints, setLivePoints] = useState<Point[] | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  const edgeData = data as unknown as CustomEdgeData;
  const relation = edgeData?.relation;
  const laneIndex = edgeData?.laneIndex ?? 0;
  const totalLanes = Math.max(1, edgeData?.totalLanes ?? 1);
  const routingStyle = edgeData?.routingStyle ?? 'smoothstep';
  const obstacles = edgeData?.obstacles ?? [];

  // Calibrate exact table border anchor point for Left and Right ports
  const anchorSourceX = sourcePosition === Position.Left ? sourceX + 2.5 : sourceX - 1.5;
  const anchorTargetX = targetPosition === Position.Left ? targetX + 2.5 : targetX - 1.5;

  const sourcePoint: Point = { x: anchorSourceX, y: sourceY };
  const targetPoint: Point = { x: anchorTargetX, y: targetY };

  const sourceDir = sourcePosition === Position.Left ? -1 : 1;
  const targetDir = targetPosition === Position.Right ? 1 : -1;

  const isInternalEdge = edgeData?.isInternalEdge ?? false;

  // Calculate Base Waypoints strictly anchored to live DOM sourcePoint and targetPoint
  let computedWaypoints: Point[];
  if (livePoints) {
    computedWaypoints = livePoints;
  } else if (relation?.customPath?.waypoints && relation.customPath.waypoints.length >= 4) {
    const saved = relation.customPath.waypoints;
    const pts = saved.map((p) => ({ ...p }));
    // Lock endpoints strictly to live DOM source/target positions while preserving intermediate shape
    pts[0] = { ...sourcePoint };
    pts[1] = { x: pts[1].x, y: sourcePoint.y };
    pts[pts.length - 1] = { ...targetPoint };
    pts[pts.length - 2] = { x: pts[pts.length - 2].x, y: targetPoint.y };
    computedWaypoints = cleanAndSimplifyWaypoints(pts);
  } else if (isInternalEdge) {
    // Rigid Locked Geometry for selected group internal edges
    const laneOffset = (laneIndex - (totalLanes - 1) / 2) * 14;
    if (
      (sourcePosition === Position.Right && targetPosition === Position.Left) ||
      (sourcePosition === Position.Left && targetPosition === Position.Right)
    ) {
      const midX = (sourcePoint.x + targetPoint.x) / 2 + laneOffset;
      computedWaypoints = [
        sourcePoint,
        { x: midX, y: sourcePoint.y },
        { x: midX, y: targetPoint.y },
        targetPoint,
      ];
    } else if (sourcePosition === Position.Right && targetPosition === Position.Right) {
      const commonX = Math.max(sourcePoint.x, targetPoint.x) + 36 + laneIndex * 14;
      computedWaypoints = [
        sourcePoint,
        { x: commonX, y: sourcePoint.y },
        { x: commonX, y: targetPoint.y },
        targetPoint,
      ];
    } else if (sourcePosition === Position.Left && targetPosition === Position.Left) {
      const commonX = Math.min(sourcePoint.x, targetPoint.x) - 36 - laneIndex * 14;
      computedWaypoints = [
        sourcePoint,
        { x: commonX, y: sourcePoint.y },
        { x: commonX, y: targetPoint.y },
        targetPoint,
      ];
    } else {
      computedWaypoints = computeSmartOrthogonalPath({
        source: sourcePoint,
        target: targetPoint,
        sourcePosition,
        targetPosition,
        obstacles: [],
        sourceTableId: relation?.sourceTableId,
        targetTableId: relation?.targetTableId,
        laneIndex,
        totalLanes,
      });
    }
  } else {
    // Smart Auto Multi-Step Calculation with Obstacle Avoidance from exact DOM sourcePoint/targetPoint
    computedWaypoints = computeSmartOrthogonalPath({
      source: sourcePoint,
      target: targetPoint,
      sourcePosition,
      targetPosition,
      obstacles,
      sourceTableId: relation?.sourceTableId,
      targetTableId: relation?.targetTableId,
      laneIndex,
      totalLanes,
    });
  }

  const waypoints = cleanAndSimplifyWaypoints(computedWaypoints);

  // Register live rendered waypoints for exact pixel crossover synchronization
  const edgeKey = relation?.id || id;
  liveEdgeRegistry.register(edgeKey, waypoints);

  // Generate Rendered Path & Label Placement
  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  if (routingStyle === 'bezier') {
    const curvature = 0.25 + laneIndex * 0.08;
    const [path, lx, ly] = getBezierPath({
      sourceX: anchorSourceX,
      sourceY,
      sourcePosition,
      targetX: anchorTargetX,
      targetY,
      targetPosition,
      curvature,
    });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  } else if (routingStyle === 'straight') {
    const [path, lx, ly] = getStraightPath({
      sourceX: anchorSourceX,
      sourceY,
      targetX: anchorTargetX,
      targetY,
    });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  } else {
    const liveCrossSegments = liveEdgeRegistry.getAllSegments(edgeKey);
    const allHorizontalSegments =
      liveCrossSegments.length > 0 ? liveCrossSegments : edgeData?.allHorizontalSegments || [];

    const ortho = createRoundedOrthogonalPathWithJumps(
      waypoints,
      allHorizontalSegments,
      edgeKey,
      8,
      6
    );
    edgePath = ortho.path;
    labelX = ortho.labelX;
    labelY = ortho.labelY;
  }

  const sourceMarker: CrowsFootMarker = relation?.sourceMarker || 'one-mandatory';
  const targetMarker: CrowsFootMarker = relation?.targetMarker || 'one-mandatory';

  const isSourceMany = sourceMarker.startsWith('many');
  const isTargetMany = targetMarker.startsWith('many');
  const centerLabelText =
    isSourceMany && isTargetMany ? 'M:M' : isSourceMany || isTargetMany ? 'M:1' : '1:1';
  const isManyToMany = isSourceMany && isTargetMany;

  // Drag Handlers
  const handleStartSegmentDrag = (
    segIndex: number,
    isVertical: boolean,
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      type: 'segment',
      segIndex,
      isVertical,
      initialPoints: waypoints.map((p) => ({ ...p })),
    });
  };

  const handleStartCornerDrag = (pointIndex: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      type: 'corner',
      pointIndex,
      initialPoints: waypoints.map((p) => ({ ...p })),
    });
  };

  const handleStartMidpointDrag = (segIndex: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      type: 'midpoint',
      segIndex,
      initialPoints: waypoints.map((p) => ({ ...p })),
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    e.stopPropagation();
    e.preventDefault();

    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    let pts = dragState.initialPoints.map((p) => ({ ...p }));

    if (dragState.type === 'segment') {
      const idx = dragState.segIndex;

      if (dragState.isVertical) {
        // Vertical segment: move X position
        const nextX = Math.round(flowPos.x / 4) * 4;
        pts[idx].x = nextX;
        pts[idx + 1].x = nextX;
      } else {
        // Horizontal segment: move Y position
        const nextY = Math.round(flowPos.y / 4) * 4;

        if (idx === 0) {
          // Dragging first segment (near source): split into step
          const stubX = sourcePoint.x + sourceDir * 28;
          pts = [
            sourcePoint,
            { x: stubX, y: sourcePoint.y },
            { x: stubX, y: nextY },
            { x: pts[1].x, y: nextY },
            ...pts.slice(1),
          ];
        } else if (idx === pts.length - 2) {
          // Dragging last segment (near target): split into step
          const stubX = targetPoint.x + targetDir * 28;
          pts = [
            ...pts.slice(0, -1),
            { x: pts[pts.length - 2].x, y: nextY },
            { x: stubX, y: nextY },
            { x: stubX, y: targetPoint.y },
            targetPoint,
          ];
        } else {
          // Intermediate horizontal segment
          pts[idx].y = nextY;
          pts[idx + 1].y = nextY;
        }
      }

      // Always guarantee endpoints remain attached to ports
      pts[0] = { ...sourcePoint };
      pts[1].y = sourcePoint.y;
      pts[pts.length - 1] = { ...targetPoint };
      pts[pts.length - 2].y = targetPoint.y;

      setLivePoints(cleanAndSimplifyWaypoints(pts));
    } else if (dragState.type === 'corner') {
      const idx = dragState.pointIndex;
      if (idx > 0 && idx < pts.length - 1) {
        const targetXCoord = Math.round(flowPos.x / 4) * 4;
        const targetYCoord = Math.round(flowPos.y / 4) * 4;

        const isPrevH = Math.abs(pts[idx - 1].y - pts[idx].y) <= 1;
        if (isPrevH) {
          if (idx - 1 > 0) pts[idx - 1].y = targetYCoord;
          pts[idx] = { x: targetXCoord, y: targetYCoord };
          if (idx + 1 < pts.length - 1) pts[idx + 1].x = targetXCoord;
        } else {
          if (idx - 1 > 0) pts[idx - 1].x = targetXCoord;
          pts[idx] = { x: targetXCoord, y: targetYCoord };
          if (idx + 1 < pts.length - 1) pts[idx + 1].y = targetYCoord;
        }
      }

      pts[0] = { ...sourcePoint };
      pts[1].y = sourcePoint.y;
      pts[pts.length - 1] = { ...targetPoint };
      pts[pts.length - 2].y = targetPoint.y;

      setLivePoints(cleanAndSimplifyWaypoints(pts));
    } else if (dragState.type === 'midpoint') {
      const idx = dragState.segIndex;
      const p1 = pts[idx];
      const p2 = pts[idx + 1];
      const isH = Math.abs(p1.y - p2.y) <= 1;

      let newPts: Point[];
      if (isH) {
        const splitY = Math.round(flowPos.y / 4) * 4;
        const midX = (p1.x + p2.x) / 2;
        const step1: Point = { x: midX - 24, y: p1.y };
        const step2: Point = { x: midX - 24, y: splitY };
        const step3: Point = { x: midX + 24, y: splitY };
        const step4: Point = { x: midX + 24, y: p2.y };
        newPts = [
          ...pts.slice(0, idx + 1),
          step1,
          step2,
          step3,
          step4,
          ...pts.slice(idx + 1),
        ];
      } else {
        const splitX = Math.round(flowPos.x / 4) * 4;
        const midY = (p1.y + p2.y) / 2;
        const step1: Point = { x: p1.x, y: midY - 24 };
        const step2: Point = { x: splitX, y: midY - 24 };
        const step3: Point = { x: splitX, y: midY + 24 };
        const step4: Point = { x: p2.x, y: midY + 24 };
        newPts = [
          ...pts.slice(0, idx + 1),
          step1,
          step2,
          step3,
          step4,
          ...pts.slice(idx + 1),
        ];
      }

      newPts[0] = { ...sourcePoint };
      newPts[1].y = sourcePoint.y;
      newPts[newPts.length - 1] = { ...targetPoint };
      newPts[newPts.length - 2].y = targetPoint.y;

      setLivePoints(cleanAndSimplifyWaypoints(newPts));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;
    e.stopPropagation();
    e.preventDefault();

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const finalPoints = livePoints ? cleanAndSimplifyWaypoints(livePoints) : waypoints;

    setDragState(null);
    setLivePoints(null);

    if (relation && edgeData?.onUpdateRelationPath) {
      edgeData.onUpdateRelationPath(relation.id, {
        waypoints: finalPoints,
      });
      showToast('Jalur kelokan relasi berhasil disimpan', 'info');
    }
  };

  // Remove corner waypoint on double click
  const handleRemoveCorner = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idx <= 1 || idx >= waypoints.length - 2) return;

    const remaining = waypoints.filter((_, i) => i !== idx);
    const cleaned = cleanAndSimplifyWaypoints(remaining);

    if (relation && edgeData?.onUpdateRelationPath) {
      edgeData.onUpdateRelationPath(relation.id, {
        waypoints: cleaned.length >= 4 ? cleaned : undefined,
      });
      showToast('Sudut belokan dihapus', 'info');
    }
  };

  // Double click on edge line to reset to smart auto
  const handleDoubleClickLine = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (relation && edgeData?.onUpdateRelationPath) {
      edgeData.onUpdateRelationPath(relation.id, undefined);
      showToast('Jalur garis dikembalikan ke otomatis cerdas', 'info');
    }
  };

  const handleDeleteRelation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!relation) return;

    const confirmed = await confirmDialog({
      title: 'Hapus Relasi?',
      text: 'Garis hubungan antar tabel ini akan dilepas dari skema database.',
      confirmText: 'Ya, Hapus Relasi',
      isDangerous: true,
    });

    if (confirmed) {
      edgeData?.onDeleteRelation?.(relation.id);
      showToast('Relasi foreign key berhasil dihapus', 'info');
    }
  };

  const isDimmed = edgeData?.isDimmed && !isHovered && !selected && !dragState;
  const isFocused = selected || isHovered || Boolean(dragState) || edgeData?.isFocused;
  const isActive = selected || isHovered || Boolean(dragState);

  const activeColor = selected || Boolean(dragState)
    ? '#38bdf8'
    : isHovered
    ? '#38bdf8'
    : isFocused
    ? '#0ea5e9'
    : isDimmed
    ? '#334155'
    : '#64748b';

  const activeWidth = selected || Boolean(dragState) ? 2.5 : isHovered ? 2.5 : isFocused ? 2 : 1.5;
  const activeOpacity = isDimmed ? 0.2 : 1;

  const hasCustomWaypoints = Boolean(
    relation?.customPath?.waypoints && relation.customPath.waypoints.length >= 4
  );

  return (
    <g
      className="transition-opacity duration-200"
      style={{ opacity: activeOpacity }}
      onDoubleClick={handleDoubleClickLine}
    >
      {/* Visual Rendered Connection Path */}
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          stroke: activeColor,
          strokeWidth: activeWidth,
          strokeDasharray: isManyToMany ? '6,4' : undefined,
          transition: dragState ? 'none' : 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
          filter: selected || Boolean(dragState)
            ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.7))'
            : isHovered
            ? 'drop-shadow(0 0 5px rgba(56, 189, 248, 0.5))'
            : isFocused
            ? 'drop-shadow(0 0 4px rgba(14, 165, 233, 0.4))'
            : 'none',
        }}
      />

      {/* Crow's Foot Endpoints */}
      <g className="pointer-events-none select-none transition-colors duration-150">
        {renderCrowsFoot(
          anchorSourceX,
          sourceY,
          sourcePosition,
          sourceMarker,
          activeColor,
          activeWidth
        )}
        {renderCrowsFoot(
          anchorTargetX,
          targetY,
          targetPosition,
          targetMarker,
          activeColor,
          activeWidth
        )}
      </g>

      {/* Invisible Hover Hitbox for Non-smoothstep edges */}
      {routingStyle !== 'smoothstep' && (
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          strokeLinecap="round"
          className="cursor-pointer"
          onMouseEnter={() => {
            setIsHovered(true);
            if (relation) edgeData?.onHoverRelation?.(relation.id);
          }}
          onMouseLeave={() => {
            if (!dragState) {
              setIsHovered(false);
              edgeData?.onHoverRelation?.(null);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (relation) edgeData?.onSelectRelation?.(relation.id);
          }}
        />
      )}

      {/* Interactive Segment Drag Hitboxes */}
      {routingStyle === 'smoothstep' &&
        waypoints.map((p, idx) => {
          if (idx === waypoints.length - 1) return null;
          const nextP = waypoints[idx + 1];
          const isVertical = Math.abs(p.x - nextP.x) < 2;
          const isHorizontal = Math.abs(p.y - nextP.y) < 2;

          if (!isVertical && !isHorizontal) return null;

          const cursorClass = isVertical ? 'cursor-ew-resize' : 'cursor-ns-resize';

          return (
            <line
              key={`segment-hitbox-${idx}`}
              x1={p.x}
              y1={p.y}
              x2={nextP.x}
              y2={nextP.y}
              stroke="transparent"
              strokeWidth={20}
              strokeLinecap="round"
              className={`${cursorClass} transition-all`}
              onMouseEnter={() => {
                setIsHovered(true);
                if (relation) edgeData?.onHoverRelation?.(relation.id);
              }}
              onMouseLeave={() => {
                if (!dragState) {
                  setIsHovered(false);
                  edgeData?.onHoverRelation?.(null);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (relation) edgeData?.onSelectRelation?.(relation.id);
              }}
              onPointerDown={(e) => handleStartSegmentDrag(idx, isVertical, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          );
        })}

      {/* Interactive Control Points / Waypoint Dots (Active when Hovered or Selected) */}
      {routingStyle === 'smoothstep' && isActive && (
        <g className="transition-all duration-200">
          {/* 1. Corner Control Dots (Move or Double-click to delete) */}
          {waypoints.map((p, idx) => {
            // Do not show for endpoints or port stubs
            if (idx === 0 || idx === waypoints.length - 1) return null;

            return (
              <g key={`corner-dot-${idx}`}>
                {/* Hit area */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={12}
                  fill="transparent"
                  className="cursor-move"
                  onPointerDown={(e) => handleStartCornerDrag(idx, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onDoubleClick={(e) => handleRemoveCorner(idx, e)}
                />
                {/* Visual Dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4.5}
                  stroke="#38bdf8"
                  strokeWidth={2}
                  className="pointer-events-none fill-slate-50 dark:fill-slate-950 transition-transform hover:scale-125 shadow-md"
                  style={{
                    filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.8))',
                  }}
                />
              </g>
            );
          })}

          {/* 2. Midpoint Insert Handles (Drag to create a new bend) */}
          {waypoints.map((p, idx) => {
            if (idx === waypoints.length - 1) return null;
            const nextP = waypoints[idx + 1];
            const midX = (p.x + nextP.x) / 2;
            const midY = (p.y + nextP.y) / 2;
            const len = Math.hypot(nextP.x - p.x, nextP.y - p.y);

            // Only show on segments long enough (> 28px)
            if (len < 28) return null;

            return (
              <g key={`midpoint-dot-${idx}`}>
                {/* Hit area */}
                <circle
                  cx={midX}
                  cy={midY}
                  r={10}
                  fill="transparent"
                  className="cursor-crosshair"
                  onPointerDown={(e) => handleStartMidpointDrag(idx, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
                {/* Visual Midpoint Indicator */}
                <circle
                  cx={midX}
                  cy={midY}
                  r={3.5}
                  fill="#0ea5e9"
                  strokeWidth={1.5}
                  className="pointer-events-none stroke-slate-50 dark:stroke-slate-950 opacity-80 hover:opacity-100 transition-all"
                />
              </g>
            );
          })}
        </g>
      )}

      {/* Center Relation Label Pill (Only visible on Hover, Select, or Drag) */}
      <EdgeLabelRenderer>
        {isActive && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: dragState ? 60 : 40,
              opacity: isDimmed ? 0.3 : 1,
            }}
            onMouseEnter={() => {
              setIsHovered(true);
              if (relation) edgeData?.onHoverRelation?.(relation.id);
            }}
            onMouseLeave={() => {
              if (!dragState) {
                setIsHovered(false);
                edgeData?.onHoverRelation?.(null);
              }
            }}
            className="transition-all duration-150 select-none animate-in fade-in zoom-in-95 duration-100"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (relation) edgeData?.onSelectRelation?.(relation.id);
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                dragState
                  ? 'bg-white dark:bg-slate-900 border border-sky-400 text-sky-600 dark:text-sky-200 shadow-xl ring-2 ring-sky-500/50 scale-110'
                  : selected
                  ? 'bg-white dark:bg-slate-900 border border-sky-500 text-sky-600 dark:text-sky-300 shadow-lg scale-110 ring-1 ring-sky-500/40'
                  : 'bg-white dark:bg-slate-900 border border-sky-500/80 text-sky-600 dark:text-sky-400 shadow-md scale-105'
              }`}
            >
              <span className="font-mono text-[9px] font-bold tracking-wider">
                {centerLabelText}
              </span>

              {/* Reset custom path shortcut */}
              {hasCustomWaypoints && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (relation && edgeData?.onUpdateRelationPath) {
                      edgeData.onUpdateRelationPath(relation.id, undefined);
                      showToast('Jalur garis dikembalikan ke otomatis cerdas', 'info');
                    }
                  }}
                  title="Kembalikan ke rute otomatis cerdas (atau klik ganda garis)"
                  className="p-0.5 rounded hover:bg-sky-500/20 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              )}

              {/* Quick delete button */}
              {!dragState && (
                <button
                  onClick={handleDeleteRelation}
                  title="Hapus Relasi"
                  className="ml-0.5 p-0.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </g>
  );
});

CustomEdge.displayName = 'CustomEdge';
