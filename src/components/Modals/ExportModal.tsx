import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode2,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Crop,
  Maximize2,
  Palette,
  Loader2,
  Boxes,
  EyeOff,
} from 'lucide-react';
import { TableData, RelationshipData, SqlDialect, ErdGroup } from '../../types/schema';
import { generateSql } from '../../utils/sqlGenerator';
import { showToast } from '../../utils/alert';
import { Node, Edge } from '@xyflow/react';
import {
  generateDiagramImage,
  copyDiagramImageToClipboard,
  calculateDiagramBounds,
  ImageExportOptions,
} from '../../utils/imageExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableData[];
  relations: RelationshipData[];
  groups?: ErdGroup[];
  nodes?: Node[];
  edges?: Edge[];
  currentDialect: SqlDialect;
  projectName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  tables,
  relations,
  groups = [],
  nodes = [],
  edges = [],
  currentDialect,
  projectName,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'code'>('image');
  const [selectedFormat, setSelectedFormat] = useState<SqlDialect | 'json'>((currentDialect as any) || 'postgres');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Image Export Settings
  const [imageFormat, setImageFormat] = useState<'png' | 'svg' | 'jpeg'>('png');
  const [imageScale, setImageScale] = useState<1 | 2 | 3 | 4>(3);
  const [imageBgMode, setImageBgMode] = useState<'current' | 'dark' | 'light' | 'transparent'>('current');
  const [imageCropMode, setImageCropMode] = useState<'all' | 'viewport'>('all');
  const [showGroups, setShowGroups] = useState<boolean>(true);
  const [includeShadow, setIncludeShadow] = useState<boolean>(false);

  // Calculate live bounds and estimated dimensions
  const bounds = useMemo(() => {
    return calculateDiagramBounds(nodes, edges, tables, groups, showGroups);
  }, [nodes, edges, tables, groups, showGroups]);

  const estimatedDimensions = useMemo(() => {
    const pad = 80;
    const baseW = imageCropMode === 'all' ? bounds.width + pad * 2 : 1200;
    const baseH = imageCropMode === 'all' ? bounds.height + pad * 2 : 800;

    const finalW = Math.round(baseW * imageScale);
    const finalH = Math.round(baseH * imageScale);

    return {
      width: finalW,
      height: finalH,
      label:
        imageScale === 4
          ? '8K Ultra HD'
          : imageScale === 3
          ? '4K Super HD'
          : imageScale === 2
          ? 'Retina HD'
          : 'Standard',
    };
  }, [bounds, imageScale, imageCropMode]);

  if (!isOpen) return null;

  // Code generator
  const getExportContent = () => {
    if (selectedFormat === 'json') {
      return JSON.stringify(
        {
          project: projectName,
          version: '1.0',
          exportedAt: new Date().toISOString(),
          tables,
          relations,
          groups,
        },
        null,
        2
      );
    }
    return generateSql(tables, relations, selectedFormat as SqlDialect);
  };

  const exportCode = getExportContent();

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(exportCode);
    setCopiedCode(true);
    showToast('Schema code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCodeFile = () => {
    let filename = `${projectName.toLowerCase().replace(/\s+/g, '_') || 'schema'}`;
    let extension = 'sql';
    let mimeType = 'text/plain';

    if (selectedFormat === 'prisma') {
      extension = 'prisma';
    } else if (selectedFormat === 'json') {
      extension = 'json';
      mimeType = 'application/json';
    }

    const blob = new Blob([exportCode], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`File ${filename}.${extension} downloaded successfully!`, 'success');
  };

  const handleExportDiagramImage = async () => {
    try {
      setIsExporting(true);
      const options: ImageExportOptions = {
        format: imageFormat,
        scale: imageScale,
        backgroundMode: imageBgMode,
        pattern: 'solid',
        cropMode: imageCropMode,
        showGroups,
        includeShadow: imageBgMode === 'transparent' ? false : includeShadow,
        padding: 80,
        filename: projectName || 'er-diagram',
      };

      const result = await generateDiagramImage(options, nodes, edges, tables, groups);

      const a = document.createElement('a');
      a.href = result.dataUrl;
      a.download = result.filename;
      a.click();

      showToast(`Diagram image ${result.filename} (${estimatedDimensions.label}) downloaded successfully!`, 'success');
    } catch (err: any) {
      console.error('Export image error:', err);
      showToast(err?.message || 'Failed to export diagram image', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyDiagramToClipboard = async () => {
    try {
      setIsExporting(true);
      await copyDiagramImageToClipboard(
        {
          scale: imageScale === 4 ? 3 : imageScale, // Clipboards handle max 3x smoothly
          backgroundMode: imageBgMode,
          pattern: 'solid',
          cropMode: imageCropMode,
          showGroups,
          includeShadow: imageBgMode === 'transparent' ? false : includeShadow,
          padding: 80,
        },
        nodes,
        edges,
        tables,
        groups
      );

      setCopiedImage(true);
      showToast('Super HD diagram image copied to clipboard!', 'success');
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (err: any) {
      console.error('Copy image error:', err);
      showToast('Failed to copy image to clipboard', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Export Schema & Diagram
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold">
                  Clean HD Engine
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Export ultra-crisp visual diagram images or database DDL schema code
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Category Tab Switcher */}
        <div className="px-5 pt-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`pb-2.5 flex items-center gap-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'image'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Diagram Image (Super HD)</span>
            <span className="text-[9px] font-mono uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
              Auto Framing
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 flex items-center gap-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>DDL Schema Script & JSON</span>
          </button>
        </div>

        {/* Modal Body: Image Tab */}
        {activeTab === 'image' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Resolution Estimator Banner */}
            <div className="p-3.5 rounded-xl bg-sky-500/10 dark:bg-sky-950/40 border border-sky-500/30 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    Auto-Fit Bounding Box Snapshot
                    <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                      {estimatedDimensions.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Auto-frames all {tables.length} tables & {relations.length} relations with a precision 80px margin.
                  </div>
                </div>
              </div>

              <div className="font-mono font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs shadow-xs">
                ~{estimatedDimensions.width} × {estimatedDimensions.height} px
              </div>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Scale / Resolution Multiplier */}
              <div className="space-y-2">
                <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  Resolution Scale (Scale DPI)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { scale: 1, label: '1x Standard', desc: 'Standard web size' },
                    { scale: 2, label: '2x Retina HD', desc: 'Crisp for HD displays' },
                    { scale: 3, label: '3x Super HD (4K)', desc: 'Ultra crisp & sharp', recommended: true },
                    { scale: 4, label: '4x Ultra HD (8K)', desc: 'Maximum print quality' },
                  ].map((s) => (
                    <button
                      key={s.scale}
                      type="button"
                      onClick={() => setImageScale(s.scale as any)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer relative ${
                        imageScale === s.scale
                          ? 'bg-slate-100 dark:bg-slate-800 border-sky-500/80 ring-1 ring-sky-500/30'
                          : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-sky-500/50'
                      }`}
                    >
                      {s.recommended && (
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/40">
                          Best
                        </span>
                      )}
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">{s.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Image Format */}
              <div className="space-y-2">
                <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  Image File Format
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'png', label: 'PNG Image', desc: 'Sharp raster / transparency' },
                    { id: 'svg', label: 'SVG Vector', desc: 'Infinitely scalable vector' },
                    { id: 'jpeg', label: 'JPEG Image', desc: 'Smaller file size' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setImageFormat(fmt.id as any)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        imageFormat === fmt.id
                          ? 'bg-slate-100 dark:bg-slate-800 border-sky-500/80 ring-1 ring-sky-500/30'
                          : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-sky-500/50'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">{fmt.label}</div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Background Color */}
              <div className="space-y-2">
                <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  Canvas Background
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'current', label: 'Current Theme', desc: 'Auto Dark / Light' },
                    { id: 'dark', label: 'Dark Slate 950', desc: 'Deep dark background (#020617)' },
                    { id: 'light', label: 'Clean Light', desc: 'Bright white background (#ffffff)' },
                    {
                      id: 'transparent',
                      label: 'Transparent',
                      desc: 'No background (PNG/SVG only)',
                      disabled: imageFormat === 'jpeg',
                    },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      disabled={bg.disabled}
                      onClick={() => setImageBgMode(bg.id as any)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        bg.disabled ? 'opacity-40 cursor-not-allowed' : ''
                      } ${
                        imageBgMode === bg.id
                          ? 'bg-slate-100 dark:bg-slate-800 border-sky-500/80 ring-1 ring-sky-500/30'
                          : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-sky-500/50'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">{bg.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{bg.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Crop Mode */}
              <div className="space-y-2">
                <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  Export Area Crop
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      id: 'all',
                      label: 'Entire Diagram (Auto)',
                      desc: 'Auto-frame all tables & relations',
                    },
                    {
                      id: 'viewport',
                      label: 'Current Viewport',
                      desc: 'Exact current screen pan & zoom',
                    },
                  ].map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => setImageCropMode(cm.id as any)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        imageCropMode === cm.id
                          ? 'bg-slate-100 dark:bg-slate-800 border-sky-500/80 ring-1 ring-sky-500/30'
                          : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-sky-500/50'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">{cm.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{cm.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Efek Bayangan (Card Shadows) */}
              <div className="space-y-2 col-span-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                    Card Shadow Effect
                  </label>
                  {imageBgMode === 'transparent' && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      Auto Flat (No Transparent Halo)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIncludeShadow(false)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer relative ${
                      !includeShadow || imageBgMode === 'transparent'
                        ? 'bg-slate-100 dark:bg-slate-800 border-sky-500/80 ring-1 ring-sky-500/30'
                        : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-sky-500/50'
                    }`}
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] flex items-center justify-between">
                      <span>Flat & Clean (No Shadow)</span>
                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
                        Crisp
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      100% crisp table borders without gray/black halo on transparent or solid backgrounds.
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={imageBgMode === 'transparent'}
                    onClick={() => setIncludeShadow(true)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      imageBgMode === 'transparent' ? 'opacity-40 cursor-not-allowed' : ''
                    } ${
                      includeShadow && imageBgMode !== 'transparent'
                        ? 'bg-slate-100 dark:bg-slate-800 border-sky-500/80 ring-1 ring-sky-500/30'
                        : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-sky-500/50'
                    }`}
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                      Soft Elevation (Subtle Shadow)
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Subtle 3D table depth (recommended only for solid Dark/Light backgrounds).
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Clean Export Features & Group Toggle Box */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      Show Module Group Frames
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Include grouping boxes and domain names ({groups.length} active groups).
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGroups}
                    disabled={groups.length === 0}
                    onChange={(e) => setShowGroups(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500 disabled:opacity-40"></div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <EyeOff className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  <strong>Clean Export Engine Active:</strong> Editor controls (+ add column, delete button, drag handles, and relation port dots) are automatically hidden to produce clean architectural diagrams.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body: Code Tab */}
        {activeTab === 'code' && (
          <div className="p-5 flex-1 overflow-hidden flex flex-col gap-3">
            {/* Format Switcher */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'postgres', label: 'PostgreSQL' },
                { id: 'mysql', label: 'MySQL' },
                { id: 'sqlite', label: 'SQLite' },
                { id: 'prisma', label: 'Prisma Schema' },
                { id: 'json', label: 'JSON Schema' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedFormat(fmt.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedFormat === fmt.id
                      ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            {/* Code Viewport Box */}
            <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-sky-400 overflow-auto whitespace-pre select-text leading-relaxed shadow-inner">
              {exportCode}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="text-[11px] text-slate-500 font-mono">
            {tables.length} tables • {relations.length} relations {groups.length > 0 && `• ${groups.length} groups`}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'image' ? (
              <>
                {/* Copy Image Button */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleCopyDiagramToClipboard}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Copy PNG image to clipboard for instant pasting"
                >
                  {copiedImage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Image Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      <span>Copy to Clipboard</span>
                    </>
                  )}
                </button>

                {/* Download Image Button */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExportDiagramImage}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rendering...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Image ({imageFormat.toUpperCase()})</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Copy Code */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>

                {/* Download Code */}
                <button
                  type="button"
                  onClick={handleDownloadCodeFile}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Script File</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
