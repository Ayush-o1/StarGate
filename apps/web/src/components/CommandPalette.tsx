import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, GitBranch, Plus, Upload, Command, X,
} from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type CommandGroup = 'workflows' | 'actions' | 'recent';

interface PaletteItem {
  id:       string;
  group:    CommandGroup;
  label:    string;
  sublabel?: string;
  icon:     React.ElementType;
  iconColor?: string;
  onSelect: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen:  boolean;
  onClose: () => void;
  onCreateWorkflow?: () => void;
  onImportWorkflow?: () => void;
}

// ─── Simple fuzzy match ───────────────────────────────────────────────────────

function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  // Character-by-character fuzzy
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ─── Group label ──────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<CommandGroup, string> = {
  workflows: 'Workflows',
  actions:   'Actions',
  recent:    'Recent',
};

// ─── CommandPalette ───────────────────────────────────────────────────────────

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen, onClose, onCreateWorkflow, onImportWorkflow,
}) => {
  const navigate              = useNavigate();
  const { workflows }         = useWorkflowStore();
  const { activeWorkspaceId } = useWorkspaceStore();

  const [query,        setQuery]        = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setFocusedIndex(0);
    } else {
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build item list
  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [];

    // Actions
    if (activeWorkspaceId) {
      list.push({
        id: 'action-new-workflow',
        group: 'actions',
        label: 'New Workflow',
        sublabel: 'Create a new automation workflow',
        icon: Plus,
        iconColor: 'text-brand-400',
        keywords: ['create', 'add', 'new'],
        onSelect: () => { onClose(); onCreateWorkflow?.(); },
      });
      list.push({
        id: 'action-import',
        group: 'actions',
        label: 'Import Workflow',
        sublabel: 'Import a workflow from a JSON file',
        icon: Upload,
        iconColor: 'text-zinc-400',
        keywords: ['import', 'upload', 'json'],
        onSelect: () => { onClose(); onImportWorkflow?.(); },
      });
    }

    // Workflows
    workflows.forEach((wf) => {
      list.push({
        id: `wf-${wf.id}`,
        group: 'workflows',
        label: wf.name,
        sublabel: `${wf.status} · v${wf.version}`,
        icon: GitBranch,
        iconColor: wf.status === 'ACTIVE' ? 'text-success' : 'text-zinc-500',
        keywords: [wf.name.toLowerCase(), wf.status.toLowerCase()],
        onSelect: () => { onClose(); navigate(`/workflows/${wf.id}`); },
      });
    });

    return list;
  }, [workflows, activeWorkspaceId, navigate, onClose, onCreateWorkflow, onImportWorkflow]);

  // Filter items by query
  const filtered = useMemo<PaletteItem[]>(() => {
    if (!query.trim()) return items;
    return items.filter((item) =>
      fuzzyMatch(query, item.label) ||
      fuzzyMatch(query, item.sublabel || '') ||
      (item.keywords || []).some((kw) => fuzzyMatch(query, kw))
    );
  }, [items, query]);

  // Group filtered items
  const grouped = useMemo(() => {
    const groups: Partial<Record<CommandGroup, PaletteItem[]>> = {};
    filtered.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group]!.push(item);
    });
    return groups;
  }, [filtered]);

  // Flat ordered list for keyboard navigation
  const flatList = useMemo(() => {
    const order: CommandGroup[] = ['actions', 'workflows', 'recent'];
    return order.flatMap((g) => grouped[g] || []);
  }, [grouped]);

  // Clamp focus index
  useEffect(() => {
    setFocusedIndex((i) => Math.min(i, Math.max(0, flatList.length - 1)));
  }, [flatList.length]);

  // Scroll focused item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-palette-index="${focusedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, flatList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatList[focusedIndex]) flatList[focusedIndex].onSelect();
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatList, focusedIndex, onClose]);

  if (!isOpen) return null;

  const renderGroup = (group: CommandGroup) => {
    const groupItems = grouped[group];
    if (!groupItems || groupItems.length === 0) return null;
    return (
      <div key={group}>
        <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider select-none">
          {GROUP_LABELS[group]}
        </div>
        {groupItems.map((item) => {
          const globalIndex = flatList.indexOf(item);
          const isFocused = globalIndex === focusedIndex;
          const ItemIcon = item.icon;
          return (
            <button
              key={item.id}
              data-palette-index={globalIndex}
              onClick={item.onSelect}
              onMouseEnter={() => setFocusedIndex(globalIndex)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                'transition-colors duration-instant',
                'focus-visible:outline-none',
                isFocused ? 'bg-zinc-800' : 'hover:bg-zinc-800/50',
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                'bg-zinc-900 border border-zinc-800',
                item.iconColor,
              )}>
                <ItemIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-200 truncate">{item.label}</div>
                {item.sublabel && (
                  <div className="text-xs text-zinc-600 truncate">{item.sublabel}</div>
                )}
              </div>
              {isFocused && (
                <div className="shrink-0 flex items-center gap-1 text-[10px] text-zinc-600 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                  <span>↵</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9990] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Command palette"
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm animate-fade-in" />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full max-w-xl mx-4',
          'bg-zinc-900 border border-zinc-700 rounded-2xl shadow-overlay',
          'overflow-hidden',
          'animate-scale-in',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFocusedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search workflows, actions…"
            className={cn(
              'flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600',
              'outline-none border-none',
            )}
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-600 hover:text-zinc-400 transition-colors duration-instant p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-700 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto p-2 space-y-1 scrollbar-thin"
        >
          {flatList.length === 0 ? (
            <div className="py-10 text-center">
              <Search className="w-6 h-6 text-zinc-700 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-zinc-500">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            (['actions', 'workflows', 'recent'] as CommandGroup[]).map((g) => renderGroup(g))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3 text-[10px] text-zinc-700 select-none">
            <span className="flex items-center gap-1">
              <kbd className="bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded text-[9px]">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded text-[9px]">↵</kbd>
              select
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-700">
            <Command className="w-3 h-3" aria-hidden="true" />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
};

CommandPalette.displayName = 'CommandPalette';
