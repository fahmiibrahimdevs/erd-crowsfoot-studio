import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode2,
  Image,
  FileJson,
} from 'lucide-react';
import { TableData, RelationshipData, SqlDialect } from '../../types/schema';
import { generateSql } from '../../utils/sqlGenerator';
import { toPng } from 'html-to-image';
import { showToast } from '../../utils/alert';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableData[];
  relations: RelationshipData[];
  currentDialect: SqlDialect;
  projectName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  tables,
  relations,
  currentDialect,
  projectName,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<SqlDialect | 'json'>((currentDialect as any) || 'postgres');
  const [copied, setCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  if (!isOpen) return null;

  const getExportContent = () => {
    if (selectedFormat === 'json') {
      return JSON.stringify(
        {
          project: projectName,
          version: '1.0',
          exportedAt: new Date().toISOString(),
          tables,
          relations,
        },
        null,
        2
      );
    }
    return generateSql(tables, relations, selectedFormat as SqlDialect);
  };

  const exportCode = getExportContent();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportCode);
    setCopied(true);
    showToast('Code skema berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
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

  const handleExportImage = async () => {
    const canvasElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!canvasElement) {
      showToast('Gagal menemukan area canvas untuk diekspor', 'error');
      return;
    }

    try {
      setIsExportingImage(true);
      const isDark = document.documentElement.classList.contains('dark') || !document.documentElement.classList.contains('light');
      const dataUrl = await toPng(canvasElement, {
        backgroundColor: isDark ? '#020617' : '#f8fafc',
        quality: 0.95,
        pixelRatio: 2,
      });

      const filename = `${projectName.toLowerCase().replace(/\s+/g, '_') || 'er-diagram'}.png`;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
      showToast(`Gambar diagram ${filename} berhasil diekspor!`, 'success');
    } catch (err) {
      console.error('Export image error:', err);
      showToast('Gagal mengekspor gambar diagram', 'error');
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                Export Schema & Diagram
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih format DDL database, Prisma schema, JSON, atau Gambar PNG
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Switcher */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'postgres', label: 'PostgreSQL' },
              { id: 'mysql', label: 'MySQL' },
              { id: 'sqlite', label: 'SQLite' },
              { id: 'prisma', label: 'Prisma' },
              { id: 'json', label: 'JSON Schema' },
            ].map((fmt) => (
              <button
                key={fmt.id}
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

          {/* Quick Image Export */}
          <button
            onClick={handleExportImage}
            disabled={isExportingImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <Image className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span>{isExportingImage ? 'Exporting...' : 'Export PNG'}</span>
          </button>
        </div>

        {/* Code Preview Box */}
        <div className="p-5 flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 bg-slate-900 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-sky-400 dark:text-sky-300 overflow-auto whitespace-pre select-text">
            {exportCode}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            {tables.length} tabel • {relations.length} relasi
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-all shadow-md shadow-sky-500/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
