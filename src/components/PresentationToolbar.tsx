import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { TableData, SqlDialect } from '../types/schema';

interface PresentationToolbarProps {
  isOpen: boolean;
  tables: TableData[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onNextTable: () => void;
  onPrevTable: () => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onExit: () => void;
  projectName: string;
  dialect: SqlDialect;
}

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export const PresentationToolbar: React.FC<PresentationToolbarProps> = ({
  isOpen,
  tables,
  selectedTableId,
  onSelectTable,
  onNextTable,
  onPrevTable,
  onFitView,
  onZoomIn,
  onZoomOut,
  onExit,
  projectName,
}) => {
  const [isLaserActive, setIsLaserActive] = useState<boolean>(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Global Presentation Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setIsLaserActive((prev) => !prev);
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        onNextTable();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        onPrevTable();
      } else if (e.key === '0') {
        e.preventDefault();
        onFitView();
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        onZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        onZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onExit, onNextTable, onPrevTable, onFitView, onZoomIn, onZoomOut]);

  // Handle Laser Pointer Canvas 60fps rendering
  const renderLaser = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const maxAge = 400; // ms trail lifetime

    // Prune old trail points
    trailRef.current = trailRef.current.filter((p) => now - p.time < maxAge);

    if (isLaserActive && trailRef.current.length > 1) {
      const trail = trailRef.current;
      for (let i = 1; i < trail.length; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        const age = now - p2.time;
        const progress = Math.max(0, 1 - age / maxAge);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(56, 189, 248, ${progress * 0.75})`;
        ctx.lineWidth = 3.5 * progress;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    // Draw active laser head
    if (isLaserActive && mousePosRef.current) {
      const { x, y } = mousePosRef.current;

      // Outer glow halo
      const grad = ctx.createRadialGradient(x, y, 2, x, y, 16);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
      grad.addColorStop(0.4, 'rgba(14, 165, 233, 0.4)');
      grad.addColorStop(1, 'rgba(14, 165, 233, 0)');

      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Sharp center core dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    }

    animFrameRef.current = requestAnimationFrame(renderLaser);
  }, [isLaserActive]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      if (isLaserActive) {
        trailRef.current.push({
          x: e.clientX,
          y: e.clientY,
          time: Date.now(),
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    animFrameRef.current = requestAnimationFrame(renderLaser);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, isLaserActive, renderLaser]);

  if (!isOpen) return null;

  // Calculate current table index for slide display
  const currentTableIndex = tables.findIndex((t) => t.id === selectedTableId);
  const currentTable = currentTableIndex !== -1 ? tables[currentTableIndex] : tables[0];
  const displayIndex = currentTableIndex !== -1 ? currentTableIndex + 1 : 1;
  const totalTables = tables.length;

  return (
    <>
      {/* 1. Interactive Laser Pointer Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-40"
        style={{ cursor: isLaserActive ? 'none' : 'default' }}
      />

      {/* 2. Top Minimalist Presentation Indicator */}
      <div className="fixed top-4 left-6 z-50 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl text-slate-300 text-xs font-medium animate-in fade-in slide-in-from-top-3 duration-200">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-slate-100">{projectName || 'ER Diagram'}</span>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
          Presentation Mode
        </span>
      </div>

      {/* 3. Floating Bottom Presentation Control Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl text-xs text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200 select-none">
        {/* Table Walkthrough / Slide Navigator */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={onPrevTable}
            title="Previous Table (Left Arrow / PageUp)"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Current Table Dropdown Trigger */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer max-w-[200px]"
              title="Click to select specific table"
            >
              {currentTable && (
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: currentTable.colorTag || '#38bdf8' }}
                />
              )}
              <span className="font-mono text-[11px] text-sky-400 font-bold shrink-0">
                {totalTables > 0 ? `${displayIndex}/${totalTables}` : '0/0'}
              </span>
              <span className="font-semibold truncate text-[11px] text-slate-100">
                {currentTable?.name || 'No Tables'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
            </button>

            {/* Quick Table Jump Menu */}
            {isDropdownOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-56 max-h-64 overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-1 space-y-0.5 z-50">
                <div className="px-2.5 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-800 mb-1">
                  Select Table Focus
                </div>
                {tables.map((tbl, idx) => (
                  <button
                    key={tbl.id}
                    type="button"
                    onClick={() => {
                      onSelectTable(tbl.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      tbl.id === selectedTableId
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tbl.colorTag || '#38bdf8' }}
                      />
                      <span className="truncate text-xs font-medium">{tbl.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onNextTable}
            title="Next Table (Right Arrow / Space / PageDown)"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-800 my-auto" />

        {/* Laser Pointer Toggle */}
        <button
          type="button"
          onClick={() => setIsLaserActive((prev) => !prev)}
          title="Toggle Laser Pointer (L key)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isLaserActive
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm shadow-sky-500/20'
              : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isLaserActive ? 'text-sky-400 animate-spin-slow' : ''}`} />
          <span>Laser</span>
          <kbd className="text-[9px] font-mono text-slate-500 bg-slate-800/80 px-1 rounded border border-slate-700/60">
            L
          </kbd>
        </button>

        <div className="h-5 w-px bg-slate-800 my-auto" />

        {/* Camera / Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onFitView}
            title="Fit to Screen (0 key)"
            className="p-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out (-)"
            className="p-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In (+)"
            className="p-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-800 my-auto" />

        {/* Exit Presentation Mode Button */}
        <button
          type="button"
          onClick={onExit}
          title="Exit Presentation Mode (Esc)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit</span>
          <kbd className="text-[9px] font-mono text-rose-300/70 bg-rose-950/60 px-1 rounded border border-rose-500/30">
            Esc
          </kbd>
        </button>
      </div>
    </>
  );
};
