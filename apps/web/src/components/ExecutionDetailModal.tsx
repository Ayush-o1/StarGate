import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, XCircle, Clock, Loader2,
  ChevronDown, ChevronRight, Copy, Check, AlertTriangle,
} from 'lucide-react';
import { WorkflowExecutionProfile, NodeExecutionProfile } from '@stargate/shared';
import { apiFetch } from '../lib/api';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';
import { Alert } from './ui/Alert';
import { cn } from '../lib/utils';

interface ExecutionDetailModalProps {
  execution: WorkflowExecutionProfile;
  onClose:   () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000)   return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatShortId(id: string): string {
  return id.slice(0, 8);
}

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'info' | 'warning' | 'neutral'> = {
  SUCCESS: 'success',
  FAILED:  'danger',
  RUNNING: 'info',
  QUEUED:  'warning',
  PENDING: 'neutral',
};

const STATUS_ICON: React.FC<{ status: string; className?: string }> = ({ status, className }) => {
  const cls = cn('w-5 h-5 shrink-0', className);
  if (status === 'SUCCESS') return <CheckCircle2 className={cn(cls, 'text-success')} />;
  if (status === 'FAILED')  return <XCircle      className={cn(cls, 'text-danger')}  />;
  if (status === 'RUNNING') return <Loader2      className={cn(cls, 'text-info animate-spin')} />;
  return                           <Clock        className={cn(cls, 'text-zinc-500')} />;
};

// ─── Copy button ──────────────────────────────────────────────────────────────

const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      aria-label={label || 'Copy to clipboard'}
      className={cn(
        'p-1 rounded transition-colors duration-instant',
        copied ? 'text-success' : 'text-zinc-600 hover:text-zinc-300',
      )}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// ─── Node Output ──────────────────────────────────────────────────────────────

const NodeOutput: React.FC<{ output: any }> = ({ output }) => {
  const [expanded, setExpanded] = useState(false);
  const isHTTP = output?.url && output?.method;

  const bodyStr = typeof output.body === 'object'
    ? JSON.stringify(output.body, null, 2)
    : (output.body || JSON.stringify(output, null, 2));

  const isLong = bodyStr && bodyStr.length > 400;

  return (
    <div className="p-4 space-y-3">
      {isHTTP && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-zinc-800 text-zinc-300">
            {output.method}
          </span>
          <span className="text-zinc-400 font-mono text-xs break-all">{output.url}</span>
          {output.status && (
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-bold',
              output.status >= 200 && output.status < 300
                ? 'bg-success/10 text-success'
                : 'bg-danger/10 text-danger'
            )}>
              {output.status} {output.statusText}
            </span>
          )}
          {output.durationMs && (
            <span className="text-xs text-zinc-600 font-mono">{output.durationMs}ms</span>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
            {isHTTP ? 'Response Body' : 'Output'}
          </div>
          <CopyButton text={bodyStr} label="Copy response body" />
        </div>
        <pre className={cn(
          'bg-zinc-950 border border-zinc-800 rounded-lg',
          'p-3 text-xs font-mono text-zinc-300',
          'overflow-x-auto overflow-y-auto',
          'scrollbar-thin transition-all duration-standard',
          !expanded && isLong ? 'max-h-40' : 'max-h-[600px]',
        )}>
          {bodyStr}
        </pre>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 text-[11px] text-brand-400 hover:text-brand-300 transition-colors duration-instant flex items-center gap-1 focus-visible:outline-none focus-visible:underline"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {expanded ? 'Collapse' : 'Expand full response'}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Node Execution Card ──────────────────────────────────────────────────────

const NodeCard: React.FC<{ node: NodeExecutionProfile; index: number }> = ({ node, index }) => {
  const [open, setOpen] = useState(false);
  const errorStr: string | null = node.error != null ? String(node.error) : null;

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10',
          node.status === 'SUCCESS' ? 'border-success/50 bg-success/10 text-success' :
          node.status === 'FAILED'  ? 'border-danger/50  bg-danger/10  text-danger'  :
          node.status === 'RUNNING' ? 'border-info/50    bg-info/10    text-info'    :
          'border-zinc-700 bg-zinc-900 text-zinc-500'
        )}>
          {index + 1}
        </div>
        <div className="w-px flex-1 bg-zinc-800 mt-1 node-connector" />
      </div>

      {/* Card */}
      <div className="flex-1 mb-4 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3',
            'border-b border-zinc-800/60',
            'hover:bg-zinc-900/50 transition-colors duration-instant',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
          )}
          aria-expanded={open}
          aria-label={`Step ${index + 1} details`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <STATUS_ICON status={node.status} className="w-4 h-4" />
            <span className="text-sm font-medium text-zinc-200 truncate">
              {(node as any).nodeLabel || `Node ${formatShortId(node.nodeId)}`}
            </span>
            <Badge variant={STATUS_VARIANT[node.status] || 'neutral'} size="sm">
              {node.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            {node.durationMs !== null && (
              <span className="text-xs text-zinc-500 font-mono tabular-nums">
                {formatDuration(node.durationMs)}
              </span>
            )}
            {open
              ? <ChevronDown  className="w-3.5 h-3.5 text-zinc-600" />
              : <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            }
          </div>
        </button>

        {/* Meta row */}
        <div className="px-4 py-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-600 border-b border-zinc-800/40">
          <span>Started: <span className="text-zinc-500">{new Date(node.startedAt).toLocaleString()}</span></span>
          {node.completedAt && (
            <span>Completed: <span className="text-zinc-500">{new Date(node.completedAt).toLocaleString()}</span></span>
          )}
        </div>

        {/* Collapsible body */}
        {open && (
          <div className="divide-y divide-zinc-800/50">
            {errorStr && (
              <div className="p-4">
                <div className="flex items-start gap-2 bg-danger/5 border border-danger/20 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-danger mb-1">Error</div>
                    <pre className="text-xs font-mono text-danger/80 whitespace-pre-wrap break-words overflow-x-auto scrollbar-thin">
                      {errorStr}
                    </pre>
                  </div>
                  <CopyButton text={errorStr} label="Copy error message" />
                </div>
              </div>
            )}
            {node.output != null && <NodeOutput output={node.output as any} />}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ExecutionDetailModal ─────────────────────────────────────────────────────

export const ExecutionDetailModal: React.FC<ExecutionDetailModalProps> = ({ execution, onClose }) => {
  const [nodes,   setNodes]   = useState<NodeExecutionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [idCopied, setIdCopied] = useState(false);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const data = await apiFetch(`/executions/${execution.id}/nodes`);
        setNodes(data);
      } catch (err) {
        console.error('Failed to fetch node executions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNodes();
  }, [execution.id]);

  const copyId = () => {
    navigator.clipboard.writeText(execution.id);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 1500);
  };

  const statusVariant = STATUS_VARIANT[execution.status] || 'neutral';
  const isSlow = execution.durationMs !== null && execution.durationMs > 5000;

  // Build modal title with status icon
  const modalTitle = (
    <div className="flex items-center gap-2">
      <STATUS_ICON status={execution.status} />
      <span>Execution Details</span>
    </div>
  );

  return (
    <Modal isOpen onClose={onClose} title={modalTitle} size="xl">
      <div className="flex flex-col h-full">

        {/* ── Summary header ─────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/40">
          {/* Status + execution ID */}
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <Badge variant={statusVariant} size="sm" dot>
              {execution.status}
            </Badge>

            {/* Execution ID with copy */}
            <button
              onClick={copyId}
              aria-label="Copy execution ID"
              className={cn(
                'flex items-center gap-1.5 font-mono text-sm px-2 py-0.5 rounded-md',
                'border transition-all duration-instant',
                idCopied
                  ? 'text-success border-success/30 bg-success/5'
                  : 'text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200',
              )}
            >
              {idCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {formatShortId(execution.id)}…
            </button>

            {execution.retryCount > 1 && (
              <Badge variant="warning" size="sm">Attempt {execution.retryCount}</Badge>
            )}
            {isSlow && (
              <Badge variant="warning" size="sm">Slow (&gt;5s)</Badge>
            )}
          </div>

          {/* Time + duration meta */}
          <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
            <span>Started: {new Date(execution.startedAt).toLocaleString()}</span>
            {execution.completedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>Completed: {new Date(execution.completedAt).toLocaleString()}</span>
              </>
            )}
            {execution.durationMs !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-zinc-400">
                  {formatDuration(execution.durationMs)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Workflow-level error ────────────────────────────────────────── */}
        {execution.errorMessage && (
          <div className="px-6 pt-4">
            <Alert variant="error">{execution.errorMessage}</Alert>
          </div>
        )}

        {/* ── Node timeline ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => <Skeleton.Card key={i} className="h-16" />)}
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="w-8 h-8 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">No node executions recorded.</p>
              <p className="text-xs text-zinc-700 mt-1">The workflow may have failed before any nodes ran.</p>
            </div>
          ) : (
            /* Hide connector line on last node */
            <div className="[&>div:last-child_.node-connector]:hidden">
              {nodes.map((node, i) => (
                <NodeCard key={node.id} node={node} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
