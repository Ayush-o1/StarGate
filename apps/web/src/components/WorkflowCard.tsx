import React from 'react';
import { Settings, ArrowRight } from 'lucide-react';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';
import type { WorkflowProfile, WorkflowExecutionProfile } from '@stargate/shared';

interface WorkflowCardProps {
  workflow:         WorkflowProfile;
  onOpen:           () => void;
  /** Index used to compute stagger animation delay */
  index?:           number;
  /** Most recent execution for this workflow */
  lastExecution?:   WorkflowExecutionProfile | null;
  /** Last 5 executions for run-history dots */
  runHistory?:      WorkflowExecutionProfile[];
  className?:       string;
}

// ─── Run-history dots ─────────────────────────────────────────────────────────

const DOT_COLOR: Record<string, string> = {
  SUCCESS: 'bg-success',
  FAILED:  'bg-danger',
  RUNNING: 'bg-info animate-pulse',
  QUEUED:  'bg-warning',
};

const RunHistoryDots: React.FC<{ history: WorkflowExecutionProfile[] }> = ({ history }) => (
  <div
    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-standard"
    aria-label={`Last ${history.length} run statuses`}
    title={`Last ${history.length} runs`}
  >
    {history.slice(0, 5).map((exec) => (
      <span
        key={exec.id}
        className={cn(
          'inline-block w-1.5 h-1.5 rounded-full shrink-0',
          DOT_COLOR[exec.status] || 'bg-zinc-600',
        )}
        aria-hidden="true"
      />
    ))}
  </div>
);

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)    return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)    return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)     return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Last-run status dot ──────────────────────────────────────────────────────

const LastRunDot: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, string> = {
    SUCCESS: 'bg-success',
    FAILED:  'bg-danger',
    RUNNING: 'bg-info animate-pulse',
    QUEUED:  'bg-warning',
    PENDING: 'bg-zinc-500',
  };
  return (
    <span
      className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', colorMap[status] || 'bg-zinc-600')}
      aria-label={`Last run: ${status}`}
    />
  );
};

// ─── WorkflowCard ─────────────────────────────────────────────────────────────

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onOpen,
  index = 0,
  lastExecution,
  runHistory,
  className,
}) => {
  const isActive  = workflow.status === 'ACTIVE';
  const createdAt = new Date(workflow.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open workflow: ${workflow.name}`}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      style={{ animationDelay: `${index * 40}ms` }}
      className={cn(
        // Layout
        'group relative flex items-center gap-4 p-4 rounded-xl',
        // Background + border
        'bg-zinc-900 border border-zinc-800',
        // Hover state — lift + border glow
        'hover:border-brand-500/30 hover:bg-zinc-900/80',
        'hover:-translate-y-0.5 hover:shadow-elevated',
        // Transitions
        'transition-all duration-standard ease-spring',
        // Cursor
        'cursor-pointer',
        // Focus ring
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
        // Entrance animation
        'animate-fade-in-up fill-mode-both',
        // Active left accent
        isActive && 'border-l-2 border-l-success/60',
        className
      )}
    >
      {/* Workflow icon / avatar */}
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold',
          isActive
            ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
        )}
        aria-hidden="true"
      >
        {workflow.name.charAt(0).toUpperCase()}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-zinc-100 truncate">
            {workflow.name}
          </span>
          <Badge
            variant={isActive ? 'success' : 'neutral'}
            size="sm"
          >
            {workflow.status}
          </Badge>
        </div>

        {/* Meta row: version · created · last run */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
          <span>v{workflow.version}</span>
          <span aria-hidden="true">·</span>
          <span>Created {createdAt}</span>

          {lastExecution && (
            <>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <LastRunDot status={lastExecution.status} />
                <span className="tabular-nums">
                  {relativeTime(lastExecution.startedAt)}
                </span>
              </span>
            </>
          )}
        </div>

        {(workflow as any).description && (
          <div className="text-xs text-zinc-600 truncate mt-0.5">
            {(workflow as any).description}
          </div>
        )}
      </div>

      {/* Settings + arrow */}
      {/* Run-history dots (last 5 runs, shown on hover) */}
      {runHistory && runHistory.length > 0 && (
        <RunHistoryDots history={runHistory} />
      )}

      {/* Settings + arrow */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          aria-label={`Settings for ${workflow.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className={cn(
            'p-1.5 rounded-lg text-zinc-600 opacity-0 group-hover:opacity-100',
            'hover:bg-zinc-800 hover:text-zinc-300',
            'transition-all duration-150',
            'focus-visible:opacity-100 focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-brand-500/70'
          )}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <ArrowRight
          className={cn(
            'w-3.5 h-3.5 text-zinc-700 opacity-0 group-hover:opacity-100',
            'group-hover:translate-x-0.5',
            'transition-all duration-150'
          )}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

WorkflowCard.displayName = 'WorkflowCard';
