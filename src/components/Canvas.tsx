import React, { useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  ConnectionMode,
  SelectionMode,
  BackgroundVariant,
  OnSelectionChangeParams,
} from '@xyflow/react';
import { CornerDownRight, Spline, Minus, Hand, BoxSelect } from 'lucide-react';
import { TableNode } from './TableNode';
import { GroupNode } from './GroupNode';
import { CustomEdge } from './CustomEdge';
import { EdgeRoutingStyle } from '../types/schema';

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  onPaneClick: () => void;
  onInitReactFlow: (instance: any) => void;
  routingStyle: EdgeRoutingStyle;
  onChangeRoutingStyle: (style: EdgeRoutingStyle) => void;
  onNodeDragStart?: (event: React.MouseEvent, node: Node) => void;
  onNodeDrag?: (event: React.MouseEvent, node: Node) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: Node) => void;
  onSelectionChange?: (params: OnSelectionChangeParams) => void;
  theme: 'dark' | 'light';
}

const NODE_TYPES = { tableNode: TableNode, groupNode: GroupNode };
const EDGE_TYPES = { customEdge: CustomEdge };
const FIT_VIEW_OPTIONS = { padding: 0.2 };
const CONNECTION_LINE_STYLE = {
  stroke: '#38bdf8',
  strokeWidth: 2.5,
};
const DEFAULT_EDGE_OPTIONS = {
  type: 'customEdge',
};

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onInitReactFlow,
  routingStyle,
  onChangeRoutingStyle,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  onSelectionChange,
  theme,
}) => {
  const [canvasMode, setCanvasMode] = useState<'pan' | 'select'>('pan');

  return (
    <div className="w-full h-full relative bg-[#f8fafc] dark:bg-[#020617] transition-colors">
      {/* Floating Canvas Header Toolbar: Canvas Mode & Line Style Switcher */}
      <div className="absolute top-3.5 right-3.5 z-20 flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-2xl gap-1 transition-colors">
        {/* Canvas Navigation Mode (Hand Pan vs Select Box) */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-950/80 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          <button
            type="button"
            title="Mode Geser Canvas (Klik & Drag untuk menggeser)"
            onClick={() => setCanvasMode('pan')}
            className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              canvasMode === 'pan'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="text-[11px]">Geser</span>
          </button>

          <button
            type="button"
            title="Mode Kotak Seleksi (Drag mouse untuk blok banyak tabel sekaligus)"
            onClick={() => setCanvasMode('select')}
            className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              canvasMode === 'select'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs font-semibold ring-1 ring-sky-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BoxSelect className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-[11px]">Pilih Area</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* Line Style Switcher */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Siku 90° Multi-Lane (Rapi & Tidak Bertumpuk)"
            onClick={() => onChangeRoutingStyle('smoothstep')}
            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
              routingStyle === 'smoothstep'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/40 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <CornerDownRight className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="text-[11px]">Siku</span>
          </button>

          <button
            type="button"
            title="Kurva Bezier Organik (Melengkung Halus)"
            onClick={() => onChangeRoutingStyle('bezier')}
            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
              routingStyle === 'bezier'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/40 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Spline className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="text-[11px]">Kurva</span>
          </button>

          <button
            type="button"
            title="Garis Langsung (Straight Line)"
            onClick={() => onChangeRoutingStyle('straight')}
            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
              routingStyle === 'straight'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/40 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Minus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="text-[11px]">Lurus</span>
          </button>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onInit={onInitReactFlow}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.2}
        maxZoom={2}
        selectionMode={SelectionMode.Partial}
        panOnDrag={canvasMode === 'pan' ? true : [1, 2]}
        selectionOnDrag={canvasMode === 'select'}
        elementsSelectable={true}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={35}
        connectionLineStyle={CONNECTION_LINE_STYLE}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        className={`bg-[#f8fafc] dark:bg-[#020617] ${canvasMode === 'select' ? 'mode-select' : ''}`}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={theme === 'dark' ? '#334155' : '#94a3b8'}
          className={theme === 'dark' ? 'opacity-40' : 'opacity-30'}
        />
        <Controls
          showInteractive={false}
          className="!bottom-4 !left-4"
        />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          maskColor={theme === 'dark' ? 'rgba(2, 6, 23, 0.7)' : 'rgba(248, 250, 252, 0.7)'}
          nodeColor={theme === 'dark' ? '#1e293b' : '#e2e8f0'}
          className="!bottom-4 !right-4"
        />
      </ReactFlow>
    </div>
  );
};

