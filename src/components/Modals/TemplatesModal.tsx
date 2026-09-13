import React from 'react';
import { X, Sparkles, Layers, ArrowRight, Check } from 'lucide-react';
import { PRESET_SCHEMAS, PresetSchema } from '../../utils/presets';
import { showToast } from '../../utils/alert';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: PresetSchema) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                Choose Schema Starter Preset
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Get started quickly with ready-to-use database schemas
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

        {/* Presets List */}
        <div className="p-5 overflow-y-auto space-y-3">
          {PRESET_SCHEMAS.map((preset) => (
            <div
              key={preset.id}
              className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-sky-500/60 hover:ring-1 hover:ring-sky-500/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {preset.name}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                      {preset.tables.length} tables • {preset.relations.length} relations
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {preset.description}
                  </p>

                  <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                    {preset.tables.map((t) => (
                      <span
                        key={t.id}
                        className="text-[10px] font-mono bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectPreset(preset);
                    showToast(`Template "${preset.name}" loaded successfully!`, 'success');
                    onClose();
                  }}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500 text-sky-600 dark:text-sky-400 hover:text-white dark:hover:text-slate-950 border border-sky-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <span>Use Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
