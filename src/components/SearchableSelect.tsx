import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Plus } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
  category?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  className?: string;
  threshold?: number;
  allowCustom?: boolean; // Allow typing custom data types like ENUM('a','b')
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  threshold = 5,
  allowCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt
    );
  }, [options]);

  const showSearch = normalizedOptions.length > threshold;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.category && opt.category.toLowerCase().includes(q))
    );
  }, [normalizedOptions, search]);

  // Group filtered options by category
  const groupedOptions = useMemo(() => {
    const groups: { [category: string]: SelectOption[] } = {};
    const noCategory: SelectOption[] = [];

    filteredOptions.forEach((opt) => {
      if (opt.category) {
        if (!groups[opt.category]) groups[opt.category] = [];
        groups[opt.category].push(opt);
      } else {
        noCategory.push(opt);
      }
    });

    return { groups, noCategory };
  }, [filteredOptions]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  const getDisplayLabel = () => {
    const selectedOption = normalizedOptions.find((opt) => opt.value === value);
    if (selectedOption) return selectedOption.label;
    if (value && value.toUpperCase().startsWith('ENUM')) return 'ENUM (Custom Choice List)';
    if (value && value.toUpperCase().startsWith('SET')) return 'SET (Multi-choice Set)';
    return value || placeholder;
  };

  // Handle custom typed type submission
  const handleSelectCustom = (customVal: string) => {
    if (!customVal.trim()) return;
    onChange(customVal.trim());
    setIsOpen(false);
    setSearch('');
  };

  const isExactMatch = normalizedOptions.some(
    (o) => o.value.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-xs ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white dark:bg-slate-900 border rounded-lg px-2.5 py-1.5 flex items-center justify-between text-left transition-all cursor-pointer ${
          isOpen
            ? 'border-sky-500/80 ring-1 ring-sky-500/30 text-slate-900 dark:text-slate-100'
            : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <span className="truncate font-mono text-[11px] font-medium">
          {getDisplayLabel()}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0 ml-1.5 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-sky-500 dark:text-sky-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden min-w-[230px]">
          {/* Search Box if choices > 5 */}
          {showSearch && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 dark:text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type data type or search..."
                  value={search}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && search.trim()) {
                      e.preventDefault();
                      handleSelectCustom(search.trim());
                    }
                  }}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md pl-6.5 pr-2 py-1 text-[11px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500/60 font-medium"
                />
              </div>
            </div>
          )}

          {/* Custom Typed Value Prompt */}
          {allowCustom && search.trim() && !isExactMatch && (
            <div
              onClick={() => handleSelectCustom(search.trim())}
              className="p-2 bg-sky-500/10 hover:bg-sky-500/20 border-b border-slate-200 dark:border-slate-800 text-sky-600 dark:text-sky-400 font-mono text-[11px] cursor-pointer flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Plus className="w-3.5 h-3.5 shrink-0 text-sky-500 dark:text-sky-400" />
                <span>Use custom type: <strong className="text-slate-900 dark:text-slate-100">{search.trim()}</strong></span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans shrink-0 ml-1">Enter ↵</span>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800/40">
            {filteredOptions.length === 0 && !search.trim() ? (
              <div className="py-3 text-center text-slate-400 dark:text-slate-500 text-[11px]">
                No options found
              </div>
            ) : filteredOptions.length === 0 && search.trim() ? (
              <div className="py-2.5 text-center text-slate-600 dark:text-slate-400 text-[11px]">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sky-600 dark:text-sky-400 font-mono text-[10px]">Enter</kbd> to use <span className="font-mono text-slate-800 dark:text-slate-200">"{search.trim()}"</span>
              </div>
            ) : (
              <>
                {Object.entries(groupedOptions.groups).map(([cat, items]) => (
                  <div key={cat} className="py-1 first:pt-0 last:pb-0">
                    <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                      {cat}
                    </div>
                    {items.map((opt) => {
                      const isSelected = opt.value === value || (value.startsWith('ENUM') && opt.value.startsWith('ENUM'));
                      return (
                        <div
                          key={opt.value}
                          onClick={() => {
                            onChange(opt.value);
                            setIsOpen(false);
                            setSearch('');
                          }}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors text-[11px] font-mono ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && <Check className="w-3 h-3 text-sky-500 dark:text-sky-400 shrink-0 ml-1" />}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {groupedOptions.noCategory.length > 0 && (
                  <div className="py-1">
                    {groupedOptions.noCategory.map((opt) => {
                      const isSelected = opt.value === value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => {
                            onChange(opt.value);
                            setIsOpen(false);
                            setSearch('');
                          }}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors text-[11px] font-mono ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && <Check className="w-3 h-3 text-sky-500 dark:text-sky-400 shrink-0 ml-1" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
