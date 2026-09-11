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

  // Calculate live bounds and estimated dimensions
  const bounds = useMemo(() => {
    return calculateDiagramBounds(nodes, edges, tables, groups);
  }, [nodes, edges, tables, groups]);

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
          : 'Standar',
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
    showToast('Code skema berhasil disalin ke clipboard!', 'success');
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
    showToast(`File ${filename}.${extension} berhasil didownload!`, 'success');
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
        padding: 80,
        filename: projectName || 'er-diagram',
      };

      const result = await generateDiagramImage(options, nodes, edges, tables, groups);

      const a = document.createElement('a');
      a.href = result.dataUrl;
      a.download = result.filename;
      a.click();

      showToast(`Gambar ${result.filename} (${estimatedDimensions.label}) berhasil didownload!`, 'success');
    } catch (err: any) {
      console.error('Export image error:', err);
      showToast(err?.message || 'Gagal mengekspor gambar diagram', 'error');
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
          padding: 80,
        },
        nodes,
        edges,
        tables,
        groups
      );

      setCopiedImage(true);
      showToast('Gambar diagram Super HD berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (err: any) {
      console.error('Copy image error:', err);
      showToast('Gagal menyalin gambar ke clipboard', 'error');
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
                  HD Engine
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih ekspor gambar diagram visual super jernih atau kode skema DDL database
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
            <span>Gambar Diagram (Super HD)</span>
            <span className="text-[9px] font-mono uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
              Auto Crop
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
            <span>Script Skema DDL & JSON</span>
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
                    Membingkai otomatis seluruh {tables.length} tabel & {relations.length} relasi dengan margin presisi
                    80px.
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
                  Kerapatan Resolusi (Scale DPI)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { scale: 1, label: '1x Standar', desc: 'Ukuran web standar' },
                    { scale: 2, label: '2x Retina HD', desc: 'Jernih untuk layar HD' },
                    { scale: 3, label: '3x Super HD (4K)', desc: 'Sangat jernih & tajam', recommended: true },
                    { scale: 4, label: '4x Ultra HD (8K)', desc: 'Maksimal untuk cetak' },
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
                  Format Berkas Gambar
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'png', label: 'PNG Image', desc: 'Raster tajam / transparan' },
                    { id: 'svg', label: 'SVG Vector', desc: 'Vektor tak terbatas' },
                    { id: 'jpeg', label: 'JPEG Image', desc: 'File lebih hemat' },
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
                  Latar Belakang (Background Canvas)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'current', label: 'Tema Saat Ini', desc: 'Otomatis Gelap / Terang' },
                    { id: 'dark', label: 'Dark Slate 950', desc: 'Latar gelap pekat (#020617)' },
                    { id: 'light', label: 'Clean Light', desc: 'Latar putih cerah (#ffffff)' },
                    {
                      id: 'transparent',
                      label: 'Transparan',
                      desc: 'Tanpa latar (khusus PNG/SVG)',
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
                  Cakupan Area Ekspor
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      id: 'all',
                      label: 'Seluruh Diagram (Auto)',
                      desc: 'Otomatis membingkai semua tabel & relasi',
                    },
                    {
                      id: 'viewport',
                      label: 'Kamera Layar Saat Ini',
                      desc: 'Persis posisi pan & zoom layar sekarang',
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
            {tables.length} tabel • {relations.length} relasi {groups.length > 0 && `• ${groups.length} grup`}
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
                  title="Salin gambar PNG ke clipboard untuk langsung di-paste ke aplikasi lain"
                >
                  {copiedImage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Gambar Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      <span>Salin ke Clipboard</span>
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
                      <span>Sedang Merender...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Gambar ({imageFormat.toUpperCase()})</span>
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
                      <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      <span>Salin Code</span>
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
                  <span>Download File Script</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
