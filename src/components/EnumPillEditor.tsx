import React, { useState } from 'react';
import { ListFilter, Plus, X, Sparkles, Tag } from 'lucide-react';
import { parseEnumValues, buildEnumType } from '../utils/enumHelper';

interface EnumPillEditorProps {
  currentType: string;
  onUpdateType: (newType: string) => void;
}

const PRESET_ENUM_SUGGESTIONS = [
  { name: 'Status', values: ['active', 'inactive', 'pending', 'archived'] },
  { name: 'User Roles', values: ['admin', 'manager', 'user', 'guest'] },
  { name: 'Order Status', values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
  { name: 'Priority', values: ['low', 'medium', 'high', 'urgent'] },
  { name: 'Gender', values: ['male', 'female', 'other'] },
];

export const EnumPillEditor: React.FC<EnumPillEditorProps> = ({
  currentType,
  onUpdateType,
}) => {
  const values = parseEnumValues(currentType);
  const [inputValue, setInputValue] = useState('');

  const handleAddValue = (val: string) => {
    const trimmed = val.trim().toLowerCase().replace(/['"]/g, '');
    if (!trimmed) return;
    if (values.includes(trimmed)) return;

    const newValues = [...values, trimmed];
    onUpdateType(buildEnumType(newValues));
    setInputValue('');
  };

  const handleRemoveValue = (valToRemove: string) => {
    const newValues = values.filter((v) => v !== valToRemove);
    if (newValues.length === 0) {
      newValues.push('option_1');
    }
    onUpdateType(buildEnumType(newValues));
  };

  const handleApplyPreset = (presetValues: string[]) => {
    onUpdateType(buildEnumType(presetValues));
  };

  return (
    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/90 border border-sky-500/30 space-y-2 mt-1.5 transition-all shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold text-[11px]">
          <ListFilter className="w-3.5 h-3.5" />
          <span>ENUM Values ({values.length} options)</span>
        </div>
      </div>

      {/* Pill Tags Container */}
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950/60 rounded-md border border-slate-200 dark:border-slate-800/80 min-h-[34px] items-center">
        {values.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-[10px] font-mono shadow-xs group"
          >
            <Tag className="w-2.5 h-2.5 text-sky-500 dark:text-sky-400" />
            <span>'{val}'</span>
            <button
              type="button"
              onClick={() => handleRemoveValue(val)}
              className="hover:bg-rose-500/30 hover:text-rose-500 dark:hover:text-rose-300 text-slate-400 rounded-full p-0.5 transition-colors cursor-pointer"
              title={`Remove '${val}'`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>

      {/* Add New Value Input */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          placeholder="Type new value and press Enter..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddValue(inputValue);
            }
          }}
          className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500/60"
        />
        <button
          type="button"
          onClick={() => handleAddValue(inputValue)}
          disabled={!inputValue.trim()}
          className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500 text-sky-600 dark:text-sky-400 hover:text-white dark:hover:text-slate-950 border border-sky-500/30 text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>
      </div>

      {/* Quick Presets */}
      <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
          <Sparkles className="w-3 h-3 text-sky-500 dark:text-sky-400" />
          <span>Quick Presets:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {PRESET_ENUM_SUGGESTIONS.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => handleApplyPreset(s.values)}
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-[10px] transition-colors cursor-pointer"
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
