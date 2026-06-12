import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { WorkflowExecutionProfile } from '@stargate/shared';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentExecution extends WorkflowExecutionProfile {
  workflowName?: string;
}

interface ActivityFeedProps {
  workspaceId?: string;
  className?:   string;
  /** Max items to show */
  limit?:       number;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_ICON: React.FC<{ status: string; className?: string }> = ({ status, className }) => {
  const cls = cn('w-3.5 h-3.5 shrink-0', className);
  if (status === 'SUCCESS') return <CheckCircle2 className={cn(cls, 'text-success')} />;
  if (status === 'FAILED')  return <XCircle      className={cn(cls, 'text-danger')}  />;
  if (status === 'RUNNING') return <Activity     className={cn(cls, 'text-info animate-pulse')} />;
  return                           <Clock        className={cn(cls, 'text-zinc-500')} />;
};

const STATUS_BADGE: Record<string, 'success' | 'danger' | 'info' | 'warning' | 'neutral'> = {
  SUCCESS: 'success',
  FAILED:  'danger',
  RUNNING: 'info',
  QUEUED:  'warning',
  PENDING: 'neutral',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)    return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Activity row ─────────────────────────────────────────────────────────────

interface ActivityRowProps {
  exec:    RecentExecution;
  index:   number;
  onClick: () => void;
}

const ActivityRow: React.FC<ActivityRowProps> = ({ exec, index, onClick }) => (
  <button
    onClick={onClick}
    style={{ animationDelay: `${index * 35}ms` }}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
      'hover:bg-zinc-800/60 transition-colors duration-instant',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500/70',
      'animate-fade-in-up fill-mode-both',
      'group',
    )}
  >
    {/* Status icon */}
    <STATUS_ICON status={exec.status} />

    {/* Content */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-zinc-200 truncate">
          {exec.workflowName || `Workflow`}
        </span>
        <Badge variant={STATUS_BADGE[exec.status] || 'neutral'} size="sm">
          {exec.status}
        </Badge>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[11px] font-mono text-zinc-600">
          #{exec.id.slice(0, 8)}
        </span>
        {exec.durationMs !== null && (
          <>
            <span className="text-zinc-700" aria-hidden="true">·</span>
            <span className="text-[11px] text-zinc-600 tabular-nums font-mono">
              {exec.durationMs < 1000 ? `${exec.durationMs}ms` : `${(exec.durationMs / 1000).toFixed(1)}s`}
            </span>
          </>
        )}
      </div>
    </div>

    {/* Time + arrow */}
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-[11px] text-zinc-600 tabular-nums">
        {relativeTime(exec.startedAt)}
      </span>
      <ArrowRight
        className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-instant"
        aria-hidden="true"
      />
    </div>
  </button>
);

// ─── Skeleton row ─────────────────────────────────────────────────────────────

const SkeletonRow: React.FC<{ index: number }> = ({ index }) => (
  <div
    className="flex items-center gap-3 px-3 py-2.5 animate-fade-in-up fill-mode-both"
    style={{ animationDelay: `${index * 35}ms` }}
  >
    <div className="w-3.5 h-3.5 rounded-full bg-zinc-800 animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3 w-32 bg-zinc-800 rounded animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
      <div className="h-2.5 w-20 bg-zinc-800 rounded animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
    </div>
    <div className="h-2.5 w-8 bg-zinc-800 rounded animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
  </div>
);

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  workspaceId,
  className,
  limit = 8,
}) => {
  const navigate  = useNavigate();
  const [executions, setExecutions] = useState<RecentExecution[]>([]);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    try {
      // Fetch all workflows in the workspace, then gather recent executions
      const workflows = await apiFetch(`/workflows/workspace/${workspaceId}`);
      const all: RecentExecution[] = [];

      // Gather executions for each workflow (parallel, best-effort)
      await Promise.allSettled(
        workflows.slice(0, 10).map(async (wf: any) => {
          try {
            const execs = await apiFetch(`/executions/workflow/${wf.id}`);
            // Take only the 3 most recent (API already returns desc order)
            const recent = (Array.isArray(execs) ? execs : []).slice(0, 3);
            recent.forEach((e: WorkflowExecutionProfile) => {
              all.push({ ...e, workflowName: wf.name });
            });
          } catch { /* skip unreachable workflows */ }
        })
      );

      // Sort by most recent first, take limit
      all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      setExecutions(all.slice(0, limit));
    } catch (err) {
      console.error('ActivityFeed: failed to load', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, limit]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15s
  useEffect(() => {
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-brand-400" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider select-none">
            Recent Activity
          </h3>
        </div>
        <span className="text-[10px] text-zinc-700 select-none">
          Auto-refreshes · 15s
        </span>
      </div>

      {/* Body */}
      <div className="p-2">
        {loading ? (
          <div>
            {[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} index={i} />)}
          </div>
        ) : executions.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="w-6 h-6 text-zinc-700 mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs text-zinc-600">No recent executions</p>
            <p className="text-[11px] text-zinc-700 mt-0.5">Run a workflow to see activity here</p>
          </div>
        ) : (
          <div>
            {executions.map((exec, i) => (
              <ActivityRow
                key={exec.id}
                exec={exec}
                index={i}
                onClick={() => navigate(`/workflows/${exec.workflowId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

ActivityFeed.displayName = 'ActivityFeed';
