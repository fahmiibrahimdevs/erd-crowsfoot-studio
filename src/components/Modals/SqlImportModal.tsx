import React, { useState } from 'react';
import { X, Upload, Code2, AlertCircle, Sparkles } from 'lucide-react';
import { parseSqlDdl } from '../../utils/sqlParser';
import { TableData, RelationshipData } from '../../types/schema';
import { showToast, StudioSwal } from '../../utils/alert';

interface SqlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (tables: TableData[], relations: RelationshipData[]) => void;
}

const SAMPLE_SQL = `CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL,
  author_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ADD CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE;`;

export const SqlImportModal: React.FC<SqlImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [sqlText, setSqlText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = () => {
    setError(null);
    if (!sqlText.trim()) {
      setError('Silakan masukkan script SQL DDL terlebih dahulu.');
      return;
    }

    try {
      const { tables, relations } = parseSqlDdl(sqlText);
      if (tables.length === 0) {
        setError('Tidak ditemukan statement CREATE TABLE yang valid dalam script.');
        return;
      }
      onImport(tables, relations);
      showToast(`Berhasil mengimpor ${tables.length} tabel & ${relations.length} relasi!`, 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal memproses script SQL.');
    }
  };

  const handleLoadSample = () => {
    setSqlText(SAMPLE_SQL);
    setError(null);
    showToast('Contoh script SQL dimuat', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                Import SQL DDL Script
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tempel script CREATE TABLE untuk mengenerate diagram otomatis
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Script SQL (PostgreSQL, MySQL, SQLite)
            </span>
            <button
              onClick={handleLoadSample}
              className="flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 font-medium cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Gunakan Contoh SQL</span>
            </button>
          </div>

          <textarea
            value={sqlText}
            onChange={(e) => {
              setSqlText(e.target.value);
              if (error) setError(null);
            }}
            placeholder={`CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email VARCHAR(255) NOT NULL UNIQUE\n);`}
            className="w-full flex-1 min-h-[260px] bg-slate-900 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-sky-400 dark:text-sky-300 placeholder-slate-500 focus:outline-none focus:border-sky-500/60 resize-none select-text"
          />

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-all shadow-md shadow-sky-500/20 cursor-pointer"
          >
            Parse & Render ke Canvas
          </button>
        </div>
      </div>
    </div>
  );
};
