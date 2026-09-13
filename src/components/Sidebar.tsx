import React, { useState } from 'react';
import {
  Search,
  Table2,
  GitFork,
  Layers,
  ChevronRight,
  PlusCircle,
  Hash,
  KeyRound,
  Database,
  Sparkles,
  Focus,
  Trash2,
  Info,
  HelpCircle,
  FolderTree,
} from 'lucide-react';
import { TableData, RelationshipData, ErdTreeItem, SqlDialect } from '../types/schema';
import { confirmDialog, showToast } from '../utils/alert';
import { ProjectExplorer } from './ProjectExplorer';

interface SidebarProps {
  tables: TableData[];
  relations: RelationshipData[];
  selectedTableId: string | null;
  selectedRelationId: string | null;
  onSelectTable: (tableId: string) => void;
  onSelectRelation: (relationId: string) => void;
  onDeleteRelation: (relationId: string) => void;
  onFocusTable: (tableId: string) => void;
  onAddQuickTable: (templateName: string) => void;
  // Workspace / File Tree props
  workspaceItems: ErdTreeItem[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name: string, parentId?: string | null, dialect?: SqlDialect) => void;
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onRenameWorkspaceItem: (itemId: string, newName: string) => void;
  onDeleteWorkspaceItem: (itemId: string) => void;
  onDuplicateFile: (fileId: string) => void;
  onExportFile: (fileId: string) => void;
  onImportFile: (file: File, parentId?: string | null) => void;
  onMoveWorkspaceItem: (itemId: string, targetParentId: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tables,
  relations,
  selectedTableId,
  selectedRelationId,
  onSelectTable,
  onSelectRelation,
  onDeleteRelation,
  onFocusTable,
  onAddQuickTable,
  workspaceItems,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRenameWorkspaceItem,
  onDeleteWorkspaceItem,
  onDuplicateFile,
  onExportFile,
  onImportFile,
  onMoveWorkspaceItem,
}) => {
  const [mainView, setMainView] = useState<'explorer' | 'schema'>('explorer');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'tables' | 'relations' | 'primitives'>('tables');

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalColumns = tables.reduce((acc, t) => acc + t.columns.length, 0);

  const QUICK_TEMPLATES = [
    { name: 'users', label: 'Users Auth', desc: 'id, email, password, name, created_at' },
    { name: 'profiles', label: 'User Profiles', desc: 'id, user_id, bio, avatar, phone' },
    { name: 'products', label: 'Products', desc: 'id, title, sku, price, stock' },
    { name: 'orders', label: 'Orders', desc: 'id, user_id, total, status, created_at' },
    { name: 'audit_logs', label: 'Audit Logs', desc: 'id, user_id, action, ip, timestamp' },
  ];

  const handleDeleteRelationClick = async (e: React.MouseEvent, relId: string) => {
    e.stopPropagation();
    const confirmed = await confirmDialog({
      title: 'Delete Relationship?',
      text: 'This relationship line between tables will be removed from the schema.',
      confirmText: 'Delete Relation',
      isDangerous: true,
    });

    if (confirmed) {
      onDeleteRelation(relId);
      showToast('Relationship deleted successfully', 'info');
    }
  };

  return (
    <aside className="w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] shrink-0 z-20 transition-colors">
      {/* Top Main Mode Switcher: [📁 Explorer] vs [📑 Schema] */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
        <div className="flex bg-slate-200/70 dark:bg-slate-950/80 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setMainView('explorer')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mainView === 'explorer'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Files & Folders</span>
          </button>

          <button
            type="button"
            onClick={() => setMainView('schema')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mainView === 'schema'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Tables & Relations</span>
          </button>
        </div>
      </div>

      {mainView === 'explorer' ? (
        <ProjectExplorer
          items={workspaceItems}
          activeFileId={activeFileId}
          onSelectFile={onSelectFile}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onRenameItem={onRenameWorkspaceItem}
          onDeleteItem={onDeleteWorkspaceItem}
          onDuplicateFile={onDuplicateFile}
          onExportFile={onExportFile}
          onImportFile={onImportFile}
          onMoveItem={onMoveWorkspaceItem}
        />
      ) : (
        <>
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500/60 focus:bg-white dark:focus:bg-slate-950 transition-colors font-medium"
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-2 pt-2 bg-slate-50/50 dark:bg-slate-950/40">
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex-1 py-1.5 text-xs font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'tables'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/5 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Tables</span>
              <span className="text-[10px] font-mono opacity-80">({tables.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('relations')}
              className={`flex-1 py-1.5 text-xs font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'relations'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/5 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Relations</span>
              <span className="text-[10px] font-mono opacity-80">({relations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('primitives')}
              className={`flex-1 py-1.5 text-xs font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'primitives'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/5 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>
          </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeTab === 'tables' && (
          <>
            {filteredTables.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                {tables.length === 0
                  ? 'No tables on canvas yet'
                  : 'No tables found'}
              </div>
            ) : (
              filteredTables.map((table) => {
                const isSelected = selectedTableId === table.id;
                return (
                  <div
                    key={table.id}
                    onClick={() => onSelectTable(table.id)}
                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 border-sky-500/80 text-slate-900 dark:text-slate-100 ring-1 ring-sky-500/30'
                        : 'bg-slate-50/80 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: table.colorTag || '#38bdf8' }}
                      />
                      <span className="text-xs font-medium truncate">
                        {table.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                        {table.columns.length} col
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFocusTable(table.id);
                        }}
                        title="Focus on this table"
                        className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Focus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {activeTab === 'relations' && (
          <div className="space-y-2">
            {/* Helpful instructions banner */}
            <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>How to Connect Relations</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                Drag handle port from a <strong className="text-slate-800 dark:text-slate-200">FK</strong> column to a <strong className="text-slate-800 dark:text-slate-200">PK</strong> column on another table.
              </p>
            </div>

            {relations.length === 0 ? (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                No relationships yet
              </div>
            ) : (
              relations.map((rel) => {
                const srcTable = tables.find((t) => t.id === rel.sourceTableId);
                const tgtTable = tables.find((t) => t.id === rel.targetTableId);
                const srcCol = srcTable?.columns.find((c) => c.id === rel.sourceColumnId);
                const tgtCol = tgtTable?.columns.find((c) => c.id === rel.targetColumnId);
                const isSelected = selectedRelationId === rel.id;

                return (
                  <div
                    key={rel.id}
                    onClick={() => onSelectRelation(rel.id)}
                    className={`group/rel p-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 border-sky-500/80 ring-1 ring-sky-500/30'
                        : 'bg-slate-50/80 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30 font-semibold">
                        {rel.cardinality}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                          {rel.onDelete}
                        </span>
                        <button
                          onClick={(e) => handleDeleteRelationClick(e, rel.id)}
                          title="Delete Relationship"
                          className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 truncate font-mono">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {srcTable?.name || 'src'}.{srcCol?.name || 'id'}
                      </span>
                      <ChevronRight className="w-3 h-3 text-sky-500 dark:text-sky-400 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {tgtTable?.name || 'tgt'}.{tgtCol?.name || 'id'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'primitives' && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-slate-500 px-1 py-0.5">
              Click to add pre-built table template to canvas:
            </p>
            {QUICK_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.name}
                onClick={() => {
                  onAddQuickTable(tmpl.name);
                  showToast(`Table template "${tmpl.name}" added!`);
                }}
                className="group p-2 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-sky-500/60 hover:bg-white dark:hover:bg-slate-900/80 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {tmpl.label}
                  </span>
                  <PlusCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors" />
                </div>
                <p className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                  {tmpl.desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

          {/* Bottom Schema Stats */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Schema Stats
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">Tables</div>
                <div className="text-slate-800 dark:text-slate-100 font-mono font-semibold text-xs">
                  {tables.length}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">Columns</div>
                <div className="text-slate-800 dark:text-slate-100 font-mono font-semibold text-xs">
                  {totalColumns}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">Relations</div>
                <div className="text-slate-800 dark:text-slate-100 font-mono font-semibold text-xs">
                  {relations.length}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};
