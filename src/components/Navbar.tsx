import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Plus,
  LayoutGrid,
  Download,
  FolderDown,
  Trash2,
  Sparkles,
  Undo2,
  Redo2,
  Sun,
  Moon,
  Search,
  Play,
  ChevronDown,
  Check,
  Wand2,
} from 'lucide-react';
import { SqlDialect } from '../types/schema';
import { confirmDialog, showToast } from '../utils/alert';

interface NavbarProps {
  projectName: string;
  setProjectName: (name: string) => void;
  dialect: SqlDialect;
  setDialect: (dialect: SqlDialect) => void;
  onAddTable: () => void;
  onAutoLayout: () => void;
  onTidyOverlaps?: () => void;
  onOpenImportModal: () => void;
  onOpenExportModal: () => void;
  onOpenTemplatesModal: () => void;
  onOpenCommandPalette: () => void;
  onClearCanvas: () => void;
  totalTables: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onStartPresentation?: () => void;
}

const DIALECT_OPTIONS: { id: SqlDialect; label: string; short: string; badge: string }[] = [
  { id: 'postgres', label: 'PostgreSQL', short: 'Postgres', badge: 'PG' },
  { id: 'mysql', label: 'MySQL', short: 'MySQL', badge: 'MY' },
  { id: 'sqlite', label: 'SQLite', short: 'SQLite', badge: 'LITE' },
  { id: 'prisma', label: 'Prisma Schema', short: 'Prisma', badge: 'ORM' },
];

export const Navbar: React.FC<NavbarProps> = ({
  projectName,
  setProjectName,
  dialect,
  setDialect,
  onAddTable,
  onAutoLayout,
  onTidyOverlaps,
  onOpenImportModal,
  onOpenExportModal,
  onOpenTemplatesModal,
  onOpenCommandPalette,
  onClearCanvas,
  totalTables,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  theme,
  onToggleTheme,
  onStartPresentation,
}) => {
  const [isDialectOpen, setIsDialectOpen] = useState(false);
  const dialectRef = useRef<HTMLDivElement>(null);

  // Close dialect dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialectRef.current && !dialectRef.current.contains(e.target as Node)) {
        setIsDialectOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDialectOpen(false);
      }
    };

    if (isDialectOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDialectOpen]);

  const handleClearClick = async () => {
    const confirmed = await confirmDialog({
      title: 'Kosongkan Seluruh Canvas?',
      text: 'Semua tabel dan relasi yang ada di canvas akan dihapus.',
      confirmText: 'Ya, Kosongkan',
      cancelText: 'Batal',
      isDangerous: true,
    });

    if (confirmed) {
      onClearCanvas();
      showToast('Canvas telah dikosongkan', 'info');
    }
  };

  const handleAutoLayoutClick = () => {
    onAutoLayout();
    showToast('Tata letak tabel berhasil dirapikan', 'info');
  };

  const currentDialectObj =
    DIALECT_OPTIONS.find((d) => d.id === dialect) || DIALECT_OPTIONS[0];

  return (
    <header className="h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 flex items-center justify-between z-40 shrink-0 shadow-xs transition-colors select-none gap-2 flex-nowrap whitespace-nowrap">
      {/* LEFT SECTION: Brand, Project Name, Counter & Dialect Dropdown */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Brand Logo */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider">
          <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span className="hidden sm:inline">ERD Studio</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Project Name Input */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-950 px-2 py-1 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 border border-transparent focus:border-sky-500/50 outline-none transition-all w-28 sm:w-40 md:w-48"
            placeholder="Untitled Schema"
            title="Ubah Nama Project"
          />
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[10px] font-mono text-slate-500 dark:text-slate-400 hidden md:inline-block">
            {totalTables} {totalTables === 1 ? 'tabel' : 'tabel'}
          </span>
        </div>

        {/* Dialect Selector Dropdown */}
        <div className="relative" ref={dialectRef}>
          <button
            type="button"
            onClick={() => setIsDialectOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg bg-slate-100 dark:bg-slate-950/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer shadow-xs"
            title="Pilih Dialek SQL"
          >
            <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              {currentDialectObj.badge}
            </span>
            <span className="hidden sm:inline">{currentDialectObj.short}</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                isDialectOpen ? 'rotate-180 text-sky-400' : ''
              }`}
            />
          </button>

          {/* Dialect Dropdown Menu */}
          {isDialectOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Dialek SQL
              </div>
              <div className="space-y-0.5">
                {DIALECT_OPTIONS.map((d) => {
                  const isSelected = dialect === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setDialect(d.id);
                        setIsDialectOpen(false);
                        showToast(`Dialek diubah ke ${d.label}`, 'info');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
                            isSelected
                              ? 'bg-sky-500/30 text-sky-600 dark:text-sky-300'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {d.badge}
                        </span>
                        <span>{d.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER SECTION: Spotlight Search Bar */}
      <div className="flex items-center justify-center shrink-1 min-w-0 max-w-sm">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-medium transition-all cursor-pointer shadow-xs group"
          title="Buka Pencarian Cepat & Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 group-hover:scale-110 transition-transform" />
          <span className="hidden lg:inline text-slate-400">Cari tabel, kolom, aksi...</span>
          <span className="lg:hidden hidden sm:inline text-slate-400">Cari...</span>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700/80 rounded shadow-2xs">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* RIGHT SECTION: Grouped Action Toolbar & Primary CTAs */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Secondary Tools Group: History, Layout, Templates, Import, Present */}
        <div className="flex items-center bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-lg p-0.5 gap-0.5">
          {/* Undo Button */}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1.5 rounded-md transition-all ${
              canUndo
                ? 'text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer'
                : 'text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          {/* Redo Button */}
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            className={`p-1.5 rounded-md transition-all ${
              canRedo
                ? 'text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer'
                : 'text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-[1px] bg-slate-300 dark:bg-slate-800 my-auto mx-0.5" />

          {/* Auto Layout */}
          <button
            type="button"
            onClick={handleAutoLayoutClick}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-xs font-medium transition-all cursor-pointer"
            title="Tata ulang seluruh tata letak canvas secara otomatis"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Auto Layout</span>
          </button>

          {/* Tidy Overlaps */}
          {onTidyOverlaps && (
            <button
              type="button"
              onClick={onTidyOverlaps}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-xs font-medium transition-all cursor-pointer"
              title="Pisahkan tabel yang saling bertumpuk (Tidy Overlaps)"
            >
              <Wand2 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span className="hidden xl:inline">Rapikan Tabrakan</span>
            </button>
          )}

          {/* Templates */}
          <button
            type="button"
            onClick={onOpenTemplatesModal}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-xs font-medium transition-all cursor-pointer"
            title="Pilih Template Database Siap Pakai"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span className="hidden xl:inline">Templates</span>
          </button>

          {/* Import SQL */}
          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-xs font-medium transition-all cursor-pointer"
            title="Import Skrip SQL DDL"
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Import</span>
          </button>

          {/* Presentation Mode */}
          {onStartPresentation && (
            <button
              type="button"
              onClick={onStartPresentation}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-xs font-medium transition-all cursor-pointer"
              title="Mode Presentasi / Zen Showcase (Alt+P)"
            >
              <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
              <span className="hidden xl:inline">Present</span>
            </button>
          )}
        </div>

        {/* Primary CTAs: Add Table & Export */}
        <div className="flex items-center gap-1.5">
          {/* Add Table Button (Primary Sky Solid) */}
          <button
            type="button"
            onClick={onAddTable}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-semibold text-xs transition-all shadow-xs shadow-sky-500/20 cursor-pointer"
            title="Tambah Tabel Baru"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Tabel Baru</span>
            <span className="sm:hidden">Tabel</span>
          </button>

          {/* Export Modal Button */}
          <button
            type="button"
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-medium transition-all shadow-xs cursor-pointer hover:border-sky-500/50"
            title="Export ERD ke SQL, PNG, PDF, JSON, dsb"
          >
            <Download className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span>Export</span>
          </button>
        </div>

        {/* Utilities: Theme & Clear Canvas */}
        <div className="flex items-center gap-1">
          {/* Theme Switcher */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/70 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer shadow-xs"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700" />
            )}
          </button>

          {/* Clear Canvas */}
          <button
            type="button"
            onClick={handleClearClick}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/70 hover:bg-rose-500/20 border border-slate-200 dark:border-slate-800 hover:border-rose-500/40 text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-all cursor-pointer shadow-xs"
            title="Kosongkan Seluruh Canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
