import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Table,
  Key,
  Columns,
  Sparkles,
  LayoutGrid,
  Download,
  FolderDown,
  CornerDownRight,
  Spline,
  Minus,
  Sun,
  Moon,
  Plus,
  Focus,
  Trash2,
  X,
  ArrowRight,
  Command,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignVerticalSpaceBetween,
  Wand2,
} from 'lucide-react';
import { TableData, SqlDialect, EdgeRoutingStyle } from '../types/schema';
import { AlignMode, DistributeMode } from '../utils/alignment';
import { formatColumnTypeDisplay } from '../utils/enumHelper';

export interface CommandPaletteItem {
  id: string;
  category: 'tables' | 'columns' | 'commands';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeType?: 'pk' | 'fk' | 'uq' | 'cmd' | 'tag';
  colorTag?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableData[];
  selectedTableIds?: string[];
  onNavigateToTable: (tableId: string, columnId?: string) => void;
  onAddTable: () => void;
  onAutoLayout: () => void;
  onAlignTables?: (mode: AlignMode, tableIds: string[]) => void;
  onDistributeTables?: (mode: DistributeMode, tableIds: string[]) => void;
  onTidyOverlaps?: (scopeIds?: string[]) => void;
  onOpenTemplatesModal: () => void;
  onOpenImportModal: () => void;
  onOpenExportModal: () => void;
  onFitView: () => void;
  onClearCanvas: () => void;
  routingStyle: EdgeRoutingStyle;
  onChangeRoutingStyle: (style: EdgeRoutingStyle) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  dialect: SqlDialect;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTableIds = [],
  onNavigateToTable,
  onAddTable,
  onAutoLayout,
  onAlignTables,
  onDistributeTables,
  onTidyOverlaps,
  onOpenTemplatesModal,
  onOpenImportModal,
  onOpenExportModal,
  onFitView,
  onClearCanvas,
  routingStyle,
  onChangeRoutingStyle,
  theme,
  onToggleTheme,
  dialect,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'all' | 'tables' | 'columns' | 'commands'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setActiveCategory('all');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build searchable items
  const allItems = useMemo<CommandPaletteItem[]>(() => {
    const items: CommandPaletteItem[] = [];

    // 1. Tables
    tables.forEach((tbl) => {
      items.push({
        id: `table-${tbl.id}`,
        category: 'tables',
        title: tbl.name,
        subtitle: `${tbl.columns.length} kolom · ${tbl.comment || dialect.toUpperCase()}`,
        colorTag: tbl.colorTag || '#38bdf8',
        icon: <Table className="w-4 h-4 text-sky-400" />,
        onSelect: () => {
          onNavigateToTable(tbl.id);
          onClose();
        },
      });
    });

    // 2. Columns
    tables.forEach((tbl) => {
      tbl.columns.forEach((col) => {
        const typeMeta = formatColumnTypeDisplay(col.type);
        let badgeType: 'pk' | 'fk' | 'uq' | undefined;
        let badgeText: string | undefined;

        if (col.isPrimary) {
          badgeType = 'pk';
          badgeText = 'PK';
        } else if (col.isUnique) {
          badgeType = 'uq';
          badgeText = 'UQ';
        }

        items.push({
          id: `col-${tbl.id}-${col.id}`,
          category: 'columns',
          title: col.name,
          subtitle: `Tabel: ${tbl.name} · ${typeMeta.display}`,
          badge: badgeText,
          badgeType,
          colorTag: tbl.colorTag || '#38bdf8',
          icon: col.isPrimary ? (
            <Key className="w-4 h-4 text-amber-400" />
          ) : (
            <Columns className="w-4 h-4 text-slate-400" />
          ),
          onSelect: () => {
            onNavigateToTable(tbl.id, col.id);
            onClose();
          },
        });
      });
    });

    // 3. Commands / Quick Actions
    items.push({
      id: 'cmd-add-table',
      category: 'commands',
      title: 'Tambah Tabel Baru',
      subtitle: 'Buat tabel baru langsung di canvas',
      icon: <Plus className="w-4 h-4 text-emerald-400" />,
      onSelect: () => {
        onAddTable();
        onClose();
      },
    });

    items.push({
      id: 'cmd-auto-layout',
      category: 'commands',
      title: 'Tata Otomatis Canvas (Auto Layout)',
      subtitle: 'Rapikan posisi seluruh tabel dan relasi secara terstruktur',
      icon: <LayoutGrid className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onAutoLayout();
        onClose();
      },
    });

    items.push({
      id: 'cmd-tidy-overlaps',
      category: 'commands',
      title: 'Pisahkan Tabel Bertumpuk (Tidy Overlaps)',
      subtitle: 'Dorong tabel-tabel yang saling menutupi ke ruang kosong terdekat',
      icon: <Wand2 className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onTidyOverlaps?.(selectedTableIds.length > 0 ? selectedTableIds : undefined);
        onClose();
      },
    });

    const targetTableIdsForAlign = selectedTableIds.length >= 2 ? selectedTableIds : tables.map((t) => t.id);
    const targetScopeLabel = selectedTableIds.length >= 2 ? `${selectedTableIds.length} tabel terpilih` : 'seluruh tabel';

    items.push({
      id: 'cmd-align-left',
      category: 'commands',
      title: 'Ratakan Tabel ke Sisi Kiri (Align Left)',
      subtitle: `Sejajarkan koordinat X ke paling kiri (${targetScopeLabel})`,
      icon: <AlignStartHorizontal className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onAlignTables?.('left', targetTableIdsForAlign);
        onClose();
      },
    });

    items.push({
      id: 'cmd-align-center',
      category: 'commands',
      title: 'Ratakan Tabel ke Tengah Horizontal (Align Center)',
      subtitle: `Sejajarkan titik tengah horizontal (${targetScopeLabel})`,
      icon: <AlignCenterHorizontal className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onAlignTables?.('center', targetTableIdsForAlign);
        onClose();
      },
    });

    items.push({
      id: 'cmd-align-right',
      category: 'commands',
      title: 'Ratakan Tabel ke Sisi Kanan (Align Right)',
      subtitle: `Sejajarkan koordinat X ke paling kanan (${targetScopeLabel})`,
      icon: <AlignEndHorizontal className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onAlignTables?.('right', targetTableIdsForAlign);
        onClose();
      },
    });

    items.push({
      id: 'cmd-align-top',
      category: 'commands',
      title: 'Ratakan Tabel ke Sisi Atas (Align Top)',
      subtitle: `Sejajarkan koordinat Y ke paling atas (${targetScopeLabel})`,
      icon: <AlignStartVertical className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onAlignTables?.('top', targetTableIdsForAlign);
        onClose();
      },
    });

    items.push({
      id: 'cmd-align-middle',
      category: 'commands',
      title: 'Ratakan Tabel ke Tengah Vertikal (Align Middle)',
      subtitle: `Sejajarkan titik tengah vertikal (${targetScopeLabel})`,
      icon: <AlignCenterVertical className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onAlignTables?.('middle', targetTableIdsForAlign);
        onClose();
      },
    });

    items.push({
      id: 'cmd-align-bottom',
      category: 'commands',
      title: 'Ratakan Tabel ke Sisi Bawah (Align Bottom)',
      subtitle: `Sejajarkan koordinat Y ke paling bawah (${targetScopeLabel})`,
      icon: <AlignEndVertical className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onAlignTables?.('bottom', targetTableIdsForAlign);
        onClose();
      },
    });

    items.push({
      id: 'cmd-distribute-horizontal',
      category: 'commands',
      title: 'Ratakan Jarak Spasi Horizontal (Distribute Horizontally)',
      subtitle: `Seragamkan jarak spasi mendatar antar tabel (${targetScopeLabel})`,
      icon: <AlignHorizontalSpaceBetween className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onDistributeTables?.('horizontal', targetTableIdsForAlign);
        onClose();
      },
    });

    items.push({
      id: 'cmd-distribute-vertical',
      category: 'commands',
      title: 'Ratakan Jarak Spasi Vertikal (Distribute Vertically)',
      subtitle: `Seragamkan jarak spasi tegak antar tabel (${targetScopeLabel})`,
      icon: <AlignVerticalSpaceBetween className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onDistributeTables?.('vertical', targetTableIdsForAlign);
        onClose();
      },
    });

    items.push({
      id: 'cmd-fit-view',
      category: 'commands',
      title: 'Pusatkan Seluruh Diagram (Fit View)',
      subtitle: 'Fokuskan pandangan canvas mencakup semua tabel',
      icon: <Focus className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onFitView();
        onClose();
      },
    });

    items.push({
      id: 'cmd-templates',
      category: 'commands',
      title: 'Buka Template Skema ERD...',
      subtitle: 'Pilih preset skema database (E-Commerce, Social, Auth, SaaS)',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      onSelect: () => {
        onOpenTemplatesModal();
        onClose();
      },
    });

    items.push({
      id: 'cmd-import-sql',
      category: 'commands',
      title: 'Import SQL DDL Script...',
      subtitle: 'Muat tabel dari file SQL CREATE TABLE / ALTER TABLE',
      icon: <FolderDown className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onOpenImportModal();
        onClose();
      },
    });

    items.push({
      id: 'cmd-export',
      category: 'commands',
      title: 'Export SQL & Diagram...',
      subtitle: 'Download script SQL DDL, skema ERD, atau gambar',
      icon: <Download className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onOpenExportModal();
        onClose();
      },
    });

    items.push({
      id: 'cmd-line-smoothstep',
      category: 'commands',
      title: 'Gaya Garis: Siku 90° (Multi-Lane Smart Routing)',
      subtitle: 'Garis orthogonal rapi dengan penghindaran tabrakan',
      badge: routingStyle === 'smoothstep' ? 'Aktif' : undefined,
      badgeType: 'tag',
      icon: <CornerDownRight className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onChangeRoutingStyle('smoothstep');
        onClose();
      },
    });

    items.push({
      id: 'cmd-line-bezier',
      category: 'commands',
      title: 'Gaya Garis: Kurva Bezier Organik',
      subtitle: 'Garis melengkung halus dan elegan',
      badge: routingStyle === 'bezier' ? 'Aktif' : undefined,
      badgeType: 'tag',
      icon: <Spline className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onChangeRoutingStyle('bezier');
        onClose();
      },
    });

    items.push({
      id: 'cmd-line-straight',
      category: 'commands',
      title: 'Gaya Garis: Garis Lurus (Straight)',
      subtitle: 'Hubungan langsung tanpa tikungan',
      badge: routingStyle === 'straight' ? 'Aktif' : undefined,
      badgeType: 'tag',
      icon: <Minus className="w-4 h-4 text-sky-400" />,
      onSelect: () => {
        onChangeRoutingStyle('straight');
        onClose();
      },
    });

    items.push({
      id: 'cmd-toggle-theme',
      category: 'commands',
      title: theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode',
      subtitle: `Beralih ke tema tampilan ${theme === 'dark' ? 'terang' : 'gelap'}`,
      icon: theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-300" />
      ),
      onSelect: () => {
        onToggleTheme();
        onClose();
      },
    });

    items.push({
      id: 'cmd-clear-canvas',
      category: 'commands',
      title: 'Kosongkan Seluruh Canvas',
      subtitle: 'Hapus semua tabel dan relasi pada file yang aktif',
      icon: <Trash2 className="w-4 h-4 text-rose-400" />,
      onSelect: () => {
        onClearCanvas();
        onClose();
      },
    });

    return items;
  }, [
    tables,
    dialect,
    routingStyle,
    theme,
    onNavigateToTable,
    onAddTable,
    onAutoLayout,
    onFitView,
    onOpenTemplatesModal,
    onOpenImportModal,
    onOpenExportModal,
    onChangeRoutingStyle,
    onToggleTheme,
    onClearCanvas,
    onClose,
  ]);

  // Filter items according to search query and active tab
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    return allItems.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (!q) return true;

      const titleMatch = item.title.toLowerCase().includes(q);
      const subtitleMatch = item.subtitle?.toLowerCase().includes(q) ?? false;
      const categoryMatch = item.category.toLowerCase().includes(q);

      return titleMatch || subtitleMatch || categoryMatch;
    });
  }, [allItems, query, activeCategory]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, activeCategory]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeElement = listRef.current.querySelector('[data-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari tabel, kolom, perintah cepat... (Ctrl+K)"
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm font-medium outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/60 rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Filter Category Tabs */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 w-fit">
            {(
              [
                { key: 'all', label: 'Semua', count: allItems.length },
                { key: 'tables', label: 'Tabel', count: tables.length },
                {
                  key: 'columns',
                  label: 'Kolom',
                  count: tables.reduce((acc, t) => acc + t.columns.length, 0),
                },
                {
                  key: 'commands',
                  label: 'Perintah',
                  count: allItems.filter((i) => i.category === 'commands').length,
                },
              ] as const
            ).map((tab) => {
              const isActive = activeCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveCategory(tab.key);
                    setSelectedIndex(0);
                    inputRef.current?.focus();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono transition-colors ${
                      isActive
                        ? 'bg-sky-500/25 text-sky-300 font-bold'
                        : 'bg-slate-800/80 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5 focus:outline-none"
          tabIndex={-1}
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-slate-300 text-sm font-medium">Tidak ditemukan hasil yang cocok</p>
              <p className="text-slate-500 text-xs mt-1 font-mono">
                Coba ketik kata kunci nama tabel, kolom, atau tindakan
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-active={isSelected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => item.onSelect()}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-all ${
                    isSelected
                      ? 'bg-slate-800 text-slate-100 border border-sky-500/50 ring-1 ring-sky-500/20 shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Icon container */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-slate-900/90 border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      {item.icon}
                    </div>

                    {/* Text Title & Subtitle */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {item.colorTag && (
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.colorTag }}
                          />
                        )}
                        <span
                          className={`text-sm font-semibold truncate ${
                            isSelected ? 'text-slate-100' : 'text-slate-200'
                          }`}
                        >
                          {item.title}
                        </span>

                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                              item.badgeType === 'pk'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : item.badgeType === 'fk'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : item.badgeType === 'uq'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {item.subtitle && (
                        <p className="text-xs text-slate-400 truncate mt-0.5 font-normal">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Enter / Arrow Action Indicator */}
                  <div className="shrink-0 flex items-center text-slate-500">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-md">
                        <span>Pilih</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-600 uppercase">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hotkey Legend */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">
                ↑↓
              </kbd>
              <span>Navigasi</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">
                ↵
              </kbd>
              <span>Pilih</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">
                ESC
              </kbd>
              <span>Tutup</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-slate-400">
            <Command className="w-3 h-3" />
            <span>Spotlight Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
};
