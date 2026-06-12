import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Globe, GitBranch, Settings, Trash2, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useWorkflowStore } from '../store/workflowStore';
import { cn } from '../lib/utils';

// ─── Type Config ─────────────────────────────────────────────────────────────

const NODE_TYPE_CONFIG = {
  HTTP: {
    icon:        Globe,
    label:       'HTTP Request',
    color:       'text-brand-400',
    bg:          'bg-brand-500/10',
    border:      'border-brand-500/30',
    handleColor: 'bg-brand-500',
    ringColor:   'rgba(99,102,241,0.4)',
  },
  IF: {
    icon:        GitBranch,
    label:       'Condition',
    color:       'text-violet-400',
    bg:          'bg-violet-500/10',
    border:      'border-violet-500/30',
    handleColor: 'bg-violet-500',
    ringColor:   'rgba(139,92,246,0.4)',
  },
} as const;

type NodeType = keyof typeof NODE_TYPE_CONFIG;

// ─── Status styling ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  leftBorder: string;
  bg: string;
  ring?: string;
  pulse?: boolean;
}> = {
  SUCCESS: { leftBorder: 'border-l-success',  bg: '' },
  FAILED:  { leftBorder: 'border-l-danger',   bg: 'bg-danger/5' },
  RUNNING: { leftBorder: 'border-l-info',     bg: 'bg-info/5', ring: 'rgba(59,130,246,0.35)', pulse: true },
  QUEUED:  { leftBorder: 'border-l-warning',  bg: 'bg-warning/5' },
};

// ─── Config state indicator ───────────────────────────────────────────────────

function getConfigState(type: string, config: any): { configured: boolean; label: string } {
  if (!config) return { configured: false, label: 'Not configured' };
  if (type === 'IF')   return { configured: !!config.expression, label: config.expression ? 'Expression set' : 'No expression' };
  if (type === 'HTTP') return {
    configured: !!config.url,
    label: config.url
      ? `${config.method || 'GET'} · ${config.url.replace(/^https?:\/\//, '').slice(0, 28)}${config.url.length > 36 ? '…' : ''}`
      : 'No URL set',
  };
  return { configured: false, label: 'Not configured' };
}

// ─── Execution status badge ───────────────────────────────────────────────────

const ExecBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    SUCCESS: { bg: 'bg-success/10',  text: 'text-success', label: 'Passed'  },
    FAILED:  { bg: 'bg-danger/10',   text: 'text-danger',  label: 'Failed'  },
    RUNNING: { bg: 'bg-info/10',     text: 'text-info',    label: 'Running' },
    QUEUED:  { bg: 'bg-warning/10',  text: 'text-warning', label: 'Queued'  },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <div className={cn(
      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit',
      s.bg, s.text,
      status === 'RUNNING' && 'animate-pulse',
    )}>
      {s.label}
    </div>
  );
};

// ─── CustomNode ───────────────────────────────────────────────────────────────

export const CustomNode = memo(({
  id,
  data,
  isConnectable,
  selected,
}: NodeProps) => {
  const { fetchWorkflowGraph } = useWorkflowStore();

  const nodeType   = (data.type || 'HTTP') as NodeType;
  const typeConfig = NODE_TYPE_CONFIG[nodeType] || NODE_TYPE_CONFIG.HTTP;
  const TypeIcon   = typeConfig.icon;

  const configState = getConfigState(nodeType, data.config);
  const execStatus  = data.executionStatus as string | undefined;
  const statusCfg   = execStatus ? STATUS_CONFIG[execStatus] : undefined;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/nodes/${id}`, { method: 'DELETE' });
      if (data.workflowId) await fetchWorkflowGraph(data.workflowId);
    } catch (err) {
      console.error('Failed to delete node', err);
    }
  };

  return (
    <div
      className={cn(
        // Base layout
        'group relative flex flex-col rounded-xl overflow-hidden',
        'min-w-[210px] max-w-[250px]',
        // Background + default border
        'bg-zinc-900 border border-zinc-700',
        // Left status accent
        'border-l-2',
        statusCfg ? statusCfg.leftBorder : 'border-l-zinc-700',
        // Status-aware background tint
        statusCfg?.bg,
        // Hover
        'hover:border-zinc-600 hover:shadow-elevated',
        'hover:-translate-y-0.5',
        // Selected — brand ring
        selected && [
          'border-brand-500/70',
          'shadow-[0_0_0_2px_rgba(99,102,241,0.25)]',
        ],
        // Transition
        'transition-all duration-200 ease-snappy',
        'cursor-default',
      )}
      style={
        // RUNNING animated glow ring
        execStatus === 'RUNNING'
          ? { boxShadow: `0 0 0 2px ${statusCfg?.ring || typeConfig.ringColor}, 0 0 12px ${statusCfg?.ring || typeConfig.ringColor}` }
          : undefined
      }
    >
      {/* RUNNING pulse ring overlay */}
      {execStatus === 'RUNNING' && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none animate-pulse-glow"
          style={{ boxShadow: `0 0 0 2px ${statusCfg?.ring}` }}
        />
      )}

      {/* ── Type Header Bar ─────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2',
        'border-b border-zinc-800',
      )}>
        {/* Type badge */}
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-0.5 rounded-md',
          typeConfig.bg, typeConfig.border, 'border',
        )}>
          <TypeIcon className={cn('w-3 h-3', typeConfig.color)} aria-hidden="true" />
          <span className={cn('text-[10px] font-bold uppercase tracking-widest', typeConfig.color)}>
            {nodeType}
          </span>
        </div>

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            aria-label={`Configure ${data.label || nodeType} node`}
            onClick={(e) => {
              e.stopPropagation();
              data.onConfigure?.(id);
            }}
            className={cn(
              'p-1 rounded-md text-zinc-500',
              'hover:bg-brand-500/10 hover:text-brand-400',
              'transition-colors duration-instant',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500/70',
            )}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            aria-label={`Delete ${data.label || nodeType} node`}
            onClick={handleDelete}
            className={cn(
              'p-1 rounded-md text-zinc-500',
              'hover:bg-danger/10 hover:text-danger',
              'transition-colors duration-instant',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger/70',
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Node Body ────────────────────────────────────────────────────── */}
      <div className="px-3 py-3 flex flex-col gap-2">
        {/* Label */}
        <div className="text-sm font-semibold text-zinc-100 truncate">
          {data.label || `${nodeType} Node`}
        </div>

        {/* Config state */}
        <div className="flex items-center gap-1.5">
          {configState.configured ? (
            <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-success" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-3 h-3 text-warning shrink-0" aria-hidden="true" />
          )}
          <span className={cn(
            'text-[11px] truncate',
            configState.configured ? 'text-zinc-500' : 'text-warning/80',
          )}>
            {configState.label}
          </span>
        </div>

        {/* Execution status badge */}
        {execStatus && <ExecBadge status={execStatus} />}
      </div>

      {/* ── Handles ──────────────────────────────────────────────────────── */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className={cn(
          'w-3 h-3 rounded-full border-2 border-zinc-950',
          typeConfig.handleColor,
          '!-top-1.5',
        )}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className={cn(
          'w-3 h-3 rounded-full border-2 border-zinc-950',
          typeConfig.handleColor,
          '!-bottom-1.5',
        )}
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
