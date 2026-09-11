import {
  Database,
  Plus,
  LayoutGrid,
  FileCode2,
  Download,
  FolderDown,
  Trash2,
  Sparkles,
  Layers,
  Undo2,
  Redo2,
  Sun,
  Moon,
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
  onOpenImportModal: () => void;
  onOpenExportModal: () => void;
  onOpenTemplatesModal: () => void;
  onClearCanvas: () => void;
  totalTables: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projectName,
  setProjectName,
  dialect,
  setDialect,
  onAddTable,
  onAutoLayout,
  onOpenImportModal,
  onOpenExportModal,
  onOpenTemplatesModal,
  onClearCanvas,
  totalTables,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  theme,
  onToggleTheme,
}) => {
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

  return (
    <header className="h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-30 shrink-0 shadow-xs transition-colors">
      {/* Left Branding & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
          <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider">ERD Studio</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Project Name Input */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-950 px-2 py-1 rounded text-sm font-semibold text-slate-800 dark:text-slate-100 border border-transparent focus:border-sky-500/50 outline-none transition-all w-44 sm:w-56"
            placeholder="Untitled Schema"
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden md:inline">
            ({totalTables} {totalTables === 1 ? 'tabel' : 'tabel'})
          </span>
        </div>
      </div>

      {/* Middle Tools / Dialect Selector */}
      <div className="hidden lg:flex items-center gap-2">
        <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
          {(['postgres', 'mysql', 'sqlite', 'prisma'] as SqlDialect[]).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDialect(d);
                showToast(`Dialek diubah ke ${d === 'postgres' ? 'PostgreSQL' : d.toUpperCase()}`, 'info');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase transition-all cursor-pointer ${
                dialect === d
                  ? 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {d === 'postgres' ? 'PostgreSQL' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Undo & Redo History Controls */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
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
          <div className="h-3.5 w-[1px] bg-slate-300 dark:bg-slate-800 my-auto" />
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
        </div>

        {/* Templates */}
        <button
          onClick={onOpenTemplatesModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-medium transition-all cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <span className="hidden sm:inline">Templates</span>
        </button>

        {/* Import SQL */}
        <button
          onClick={onOpenImportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-medium transition-all cursor-pointer shadow-xs"
          title="Import SQL DDL Script"
        >
          <FolderDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Import SQL</span>
        </button>

        {/* Auto Layout */}
        <button
          onClick={handleAutoLayoutClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-medium transition-all cursor-pointer shadow-xs"
          title="Tata letak otomatis diagram"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Auto Layout</span>
        </button>

        {/* Add Table Button */}
        <button
          onClick={onAddTable}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Tabel Baru</span>
        </button>

        {/* Export Modal Button */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-medium transition-all shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <span>Export</span>
        </button>

        {/* Theme Switcher Toggle (Sun / Moon) */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
          className="p-1.5 rounded-lg bg-white dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer shadow-xs"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-700" />
          )}
        </button>

        {/* Clear Canvas */}
        <button
          onClick={handleClearClick}
          className="p-1.5 rounded-lg bg-white dark:bg-slate-950/70 hover:bg-rose-500/20 border border-slate-200 dark:border-slate-800 hover:border-rose-500/40 text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-all ml-1 cursor-pointer"
          title="Kosongkan Canvas"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
