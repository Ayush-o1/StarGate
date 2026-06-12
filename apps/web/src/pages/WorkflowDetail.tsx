import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Download, RefreshCw,
  Globe, GitBranch, ChevronDown, Zap, Copy, CheckCircle,
  Clock, Plus, Home
} from 'lucide-react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node as ReactFlowNode,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { apiFetch } from '../lib/api';
import { WorkflowProfile, WorkflowExecutionProfile } from '@stargate/shared';
import { useWorkflowStore } from '../store/workflowStore';
import { useWorkflowExecutionStore } from '../store/workflowExecutionStore';
import { useTriggerStore } from '../store/triggerStore';
import { useAuthStore } from '../store/authStore';
import { ExecutionDetailModal } from '../components/ExecutionDetailModal';
import { CustomNode } from '../components/CustomNode';
import { TriggerModal } from '../components/TriggerModal';
import { NodeConfigModal } from '../components/NodeConfigModal';
import { EdgeConfigModal } from '../components/EdgeConfigModal';
import { ResizablePanel } from '../components/ResizablePanel';
import { CanvasStatusBar } from '../components/CanvasStatusBar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/EmptyState';
import { Separator } from '../components/ui/Separator';
import { Tooltip } from '../components/ui/Tooltip';
import { toast } from '../components/ui/Toast';
import { PageLoader } from '../components/ui/PageLoader';
import { cn } from '../lib/utils';

// ─── ReactFlow node types ─────────────────────────────────────────────────────

const nodeTypes = { HTTP: CustomNode, IF: CustomNode };

// ─── Duration formatter ────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms === null) return '';
  if (ms < 1000)   return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

interface BreadcrumbProps {
  workflowName: string;
  onHome: () => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ workflowName, onHome }) => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500 min-w-0">
    <button
      onClick={onHome}
      className="flex items-center gap-1 hover:text-zinc-300 transition-colors duration-instant focus-visible:outline-none focus-visible:text-zinc-300"
      aria-label="Dashboard"
    >
      <Home className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">Dashboard</span>
    </button>
    <span className="text-zinc-700" aria-hidden="true">/</span>
    <span className="text-zinc-300 font-medium truncate max-w-[160px]" aria-current="page">
      {workflowName}
    </span>
  </nav>
);

// ─── Add Node Dropdown ─────────────────────────────────────────────────────────

interface AddNodeDropdownProps {
  onAdd: (type: 'HTTP' | 'IF') => void;
}

const AddNodeDropdown: React.FC<AddNodeDropdownProps> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        rightIcon={<ChevronDown className={cn('transition-transform duration-standard', open && 'rotate-180')} />}
        leftIcon={<Plus />}
      >
        Add Node
      </Button>

      {open && (
        <div className={cn(
          'absolute top-full left-0 mt-2 w-44 z-50',
          'bg-zinc-900 border border-zinc-800 rounded-xl shadow-modal overflow-hidden',
          'animate-fade-in-scale',
        )}>
          <div className="p-1.5">
            <button
              onClick={() => { onAdd('HTTP'); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left',
                'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
                'transition-colors duration-instant',
              )}
            >
              <Globe className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              HTTP Request
            </button>
            <button
              onClick={() => { onAdd('IF'); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left',
                'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
                'transition-colors duration-instant',
              )}
            >
              <GitBranch className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              Condition (IF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Execution summary strip ───────────────────────────────────────────────────

interface ExecSummaryProps {
  executions: WorkflowExecutionProfile[];
}

const ExecSummary: React.FC<ExecSummaryProps> = ({ executions }) => {
  if (executions.length === 0) return null;
  const success  = executions.filter((e) => e.status === 'SUCCESS').length;
  const failed   = executions.filter((e) => e.status === 'FAILED').length;
  const running  = executions.filter((e) => e.status === 'RUNNING').length;

  return (
    <div className="flex items-center gap-2 text-[11px] text-zinc-600 select-none">
      <span className="tabular-nums">{executions.length} total</span>
      {success > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-success tabular-nums">{success} ✓</span>
        </>
      )}
      {failed > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-danger tabular-nums">{failed} ✗</span>
        </>
      )}
      {running > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-info tabular-nums animate-pulse">{running} running</span>
        </>
      )}
    </div>
  );
};

// ─── Execution status filter ───────────────────────────────────────────────────

type ExecFilter = 'ALL' | 'SUCCESS' | 'FAILED' | 'RUNNING';

interface ExecFilterPillsProps {
  active: ExecFilter;
  onChange: (f: ExecFilter) => void;
}

const ExecFilterPills: React.FC<ExecFilterPillsProps> = ({ active, onChange }) => {
  const pills: { label: string; value: ExecFilter; color: string }[] = [
    { label: 'All',     value: 'ALL',     color: 'text-zinc-400' },
    { label: 'Success', value: 'SUCCESS', color: 'text-success'  },
    { label: 'Failed',  value: 'FAILED',  color: 'text-danger'   },
    { label: 'Running', value: 'RUNNING', color: 'text-info'     },
  ];

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Filter executions">
      {pills.map(({ label, value, color }) => (
        <button
          key={value}
          role="radio"
          aria-checked={active === value}
          onClick={() => onChange(value)}
          className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-full transition-all duration-instant',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500/70',
            active === value
              ? `${color} bg-zinc-800 border border-zinc-700`
              : 'text-zinc-600 hover:text-zinc-400',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

// ─── Execution row ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, 'success' | 'danger' | 'info' | 'warning' | 'neutral'> = {
  SUCCESS: 'success',
  FAILED:  'danger',
  RUNNING: 'info',
  QUEUED:  'warning',
  PENDING: 'neutral',
};

interface ExecRowProps {
  exec:    WorkflowExecutionProfile;
  onClick: () => void;
  index:   number;
}

const ExecRow: React.FC<ExecRowProps> = ({ exec, onClick, index }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
    style={{ animationDelay: `${index * 40}ms` }}
    className={cn(
      'flex items-center justify-between px-4 py-3',
      'border-b border-zinc-800/60 last:border-0',
      'hover:bg-zinc-800/40 cursor-pointer',
      'transition-colors duration-instant',
      'focus-visible:outline-none focus-visible:bg-zinc-800/40',
      'animate-fade-in-up fill-mode-both',
      exec.status === 'RUNNING' && 'border-l-2 border-l-info',
    )}
  >
    <div className="flex items-center gap-3 min-w-0">
      <Badge variant={STATUS_BADGE[exec.status] || 'neutral'} size="sm">
        {exec.status}
      </Badge>
      <span className="text-xs font-mono text-zinc-500 tabular-nums">
        #{exec.id.slice(0, 8)}
      </span>
      {exec.errorMessage && (
        <span className="text-xs text-danger truncate max-w-[140px]">
          {exec.errorMessage}
        </span>
      )}
    </div>
    <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-600">
      {exec.retryCount > 1 && (
        <Badge variant="warning" size="sm">Retry {exec.retryCount}</Badge>
      )}
      {exec.durationMs !== null && (
        <span className="font-mono tabular-nums">{formatDuration(exec.durationMs)}</span>
      )}
      <span>{new Date(exec.startedAt).toLocaleTimeString()}</span>
    </div>
  </div>
);

// ─── Trigger card ─────────────────────────────────────────────────────────────

const TRIGGER_TYPE_BADGE: Record<string, 'brand' | 'neutral' | 'info'> = {
  WEBHOOK:  'brand',
  SCHEDULE: 'neutral',
  MANUAL:   'info',
};

interface TriggerCardProps {
  trigger:  any;
  onToggle: () => void;
  onDelete: () => void;
  index:    number;
}

const TriggerCard: React.FC<TriggerCardProps> = ({ trigger, onToggle, onDelete, index }) => {
  const [copying, setCopying] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/api/v1/webhooks/${trigger.webhookPath}`;
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copied');
    setCopying(true);
    setTimeout(() => setCopying(false), 1500);
  };

  return (
    <div
      style={{ animationDelay: `${index * 50}ms` }}
      className={cn(
        'bg-zinc-950 border border-zinc-800 rounded-xl p-4',
        'flex flex-col gap-3',
        'animate-fade-in-up fill-mode-both',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={TRIGGER_TYPE_BADGE[trigger.type] || 'neutral'} size="sm">
            {trigger.type}
          </Badge>
          <Badge variant={trigger.enabled ? 'success' : 'neutral'} size="sm" dot>
            {trigger.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={onToggle} aria-label={trigger.enabled ? 'Disable trigger' : 'Enable trigger'}>
            {trigger.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete trigger" className="text-danger hover:text-danger hover:bg-danger/10">
            Delete
          </Button>
        </div>
      </div>

      {trigger.type === 'WEBHOOK' && trigger.webhookPath && (
        <div className={cn(
          'flex items-center justify-between gap-2',
          'bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2',
        )}>
          <span className="text-[11px] font-mono text-zinc-400 truncate">
            {`${window.location.origin}/api/v1/webhooks/${trigger.webhookPath}`}
          </span>
          <button
            onClick={handleCopy}
            aria-label="Copy webhook URL"
            className={cn(
              'shrink-0 p-1 rounded transition-colors duration-instant',
              copying ? 'text-success' : 'text-zinc-500 hover:text-zinc-200',
            )}
          >
            {copying ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {trigger.type === 'SCHEDULE' && trigger.cron && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock className="w-3 h-3 shrink-0" />
          <span className="font-mono">{trigger.cron}</span>
        </div>
      )}
    </div>
  );
};

// ─── WorkflowDetail ───────────────────────────────────────────────────────────

export const WorkflowDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.tokens?.accessToken);

  const [workflow, setWorkflow] = useState<WorkflowProfile | null>(null);
  const [loading,  setLoading]  = useState(true);

  const { nodes: storeNodes, edges: storeEdges, fetchWorkflowGraph, updateNodePosition } = useWorkflowStore();
  const { executions, fetchExecutions, runWorkflow, loading: runningWorkflow } = useWorkflowExecutionStore();
  const { triggers, fetchTriggers, createTrigger, toggleTrigger, deleteTrigger } = useTriggerStore();

  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecutionProfile | null>(null);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [configModalNodeId,  setConfigModalNodeId]  = useState<string | null>(null);
  const [configModalEdgeId,  setConfigModalEdgeId]  = useState<string | null>(null);
  const [execFilter,         setExecFilter]         = useState<ExecFilter>('ALL');

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchWorkflowData = useCallback(async () => {
    try {
      const data = await apiFetch(`/workflows/${id}`);
      setWorkflow(data);
      await fetchWorkflowGraph(id!);
      await fetchExecutions(id!);
      if (token) await fetchTriggers(id!, token);
    } catch (e) {
      console.error(e);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, fetchWorkflowGraph, fetchExecutions, fetchTriggers, token]);

  useEffect(() => { fetchWorkflowData(); }, [fetchWorkflowData]);

  // Polling for live execution updates
  useEffect(() => {
    if (!id || !workflow) return;
    const interval = setInterval(() => fetchExecutions(id), 3000);
    return () => clearInterval(interval);
  }, [id, workflow, fetchExecutions]);

  // Sync store nodes → ReactFlow (with execution status overlay)
  useEffect(() => {
    // Map latest execution statuses onto nodes
    const latestExec = executions[0]; // most recent execution
    const nodeStatusMap: Record<string, string> = {};
    if (latestExec && (latestExec.status === 'RUNNING' || latestExec.status === 'SUCCESS' || latestExec.status === 'FAILED')) {
      // We don't have per-node status here without fetching nodeExecutions,
      // so show the workflow-level status on all nodes when an exec is selected
      if (selectedExecution) {
        storeNodes.forEach((n) => { nodeStatusMap[n.id] = selectedExecution.status; });
      }
    }

    const formattedNodes: ReactFlowNode[] = storeNodes.map((n) => ({
      id:       n.id,
      type:     n.type as any,
      position: { x: n.positionX, y: n.positionY },
      data: {
        type:     n.type,
        label:    n.label,
        config:   (n as any).config,
        workflowId: id,
        executionStatus: nodeStatusMap[n.id],
        onConfigure: (nodeId: string) => setConfigModalNodeId(nodeId),
      },
    }));
    setRfNodes(formattedNodes);

    const formattedEdges: Edge[] = storeEdges.map((e) => ({
      id:        e.id,
      source:    e.sourceNodeId,
      target:    e.targetNodeId,
      type:      'smoothstep',
      animated:  true,
      label:     e.condition || '',
      labelStyle:   { fill: '#a5b4fc', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#18181b', fillOpacity: 0.9 },
      style:        { stroke: '#6366f1', strokeWidth: 2 },
    }));
    setRfEdges(formattedEdges);
  }, [storeNodes, storeEdges, setRfNodes, setRfEdges, id, executions, selectedExecution]);

  // ─── Event Handlers ─────────────────────────────────────────────────────────
  const onNodeDragStop = useCallback(
    async (_e: React.MouseEvent, node: ReactFlowNode) => {
      await updateNodePosition(node.id, node.position.x, node.position.y);
    },
    [updateNodePosition]
  );

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;
      setRfEdges((eds) => addEdge(params, eds));
      try {
        await apiFetch(`/edges/workflow/${id}`, {
          method: 'POST',
          body:   JSON.stringify({ sourceNodeId: params.source, targetNodeId: params.target }),
        });
        await fetchWorkflowGraph(id!);
      } catch (e) {
        console.error('Failed to create edge', e);
        setRfEdges((eds) => eds.filter((e) => e.source !== params.source || e.target !== params.target));
      }
    },
    [id, fetchWorkflowGraph, setRfEdges]
  );

  const onEdgesDelete = useCallback(
    async (edges: Edge[]) => {
      for (const edge of edges) {
        try { await apiFetch(`/edges/${edge.id}`, { method: 'DELETE' }); }
        catch (e) { console.error(e); }
      }
      if (id) await fetchWorkflowGraph(id);
    },
    [id, fetchWorkflowGraph]
  );

  const onNodesDelete = useCallback(
    async (nodes: ReactFlowNode[]) => {
      for (const node of nodes) {
        try { await apiFetch(`/nodes/${node.id}`, { method: 'DELETE' }); }
        catch (e) { console.error(e); }
      }
      if (id) await fetchWorkflowGraph(id);
    },
    [id, fetchWorkflowGraph]
  );

  const onEdgeClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
    setConfigModalEdgeId(edge.id);
  }, []);

  const handleAddNode = async (type: 'HTTP' | 'IF') => {
    try {
      await apiFetch(`/nodes/workflow/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          label:     `${type} Node ${storeNodes.length + 1}`,
          positionX: 150 + storeNodes.length * 50,
          positionY: 150 + storeNodes.length * 30,
        }),
      });
      await fetchWorkflowGraph(id!);
    } catch (e) {
      console.error('Failed to add node', e);
      toast.error('Failed to add node');
    }
  };

  const handleExport = async () => {
    if (!workflow) return;
    try {
      const data = await apiFetch(`/workflows/${id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${workflow.name || 'workflow'}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error('Failed to export workflow');
    }
  };

  const handleRunWorkflow = async () => {
    if (!id || !workflow?.isActive) return;
    try {
      await runWorkflow(id);
      await fetchExecutions(id);
    } catch (e) {
      console.error(e);
      toast.error('Failed to run workflow. Ensure the workflow is active and has nodes.');
    }
  };

  const handleToggleActive = async () => {
    if (!workflow || !id) return;
    try {
      const updated = await apiFetch(`/workflows/${id}`, {
        method: 'PUT',
        body:   JSON.stringify({ isActive: !workflow.isActive }),
      });
      setWorkflow(updated);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update workflow status');
    }
  };

  if (loading) return <PageLoader />;
  if (!workflow) return null;

  const canRun = !runningWorkflow && storeNodes.length > 0 && workflow.isActive;

  // Filter executions
  const filteredExecutions = execFilter === 'ALL'
    ? executions
    : executions.filter((e) => e.status === execFilter);

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav
        className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex-none z-40 h-14"
        aria-label="Workflow toolbar"
      >
        <div className="h-full px-4 flex items-center justify-between gap-4">

          {/* Left: Back + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-4" />

            <Breadcrumb
              workflowName={workflow.name}
              onHome={() => navigate('/dashboard')}
            />

            <Separator orientation="vertical" className="h-4 hidden sm:block" />

            {/* Status badge (clickable) */}
            <Tooltip
              content={workflow.isActive
                ? 'Active — triggers will fire. Click to deactivate.'
                : 'Inactive — triggers are paused. Click to activate.'
              }
              side="bottom"
            >
              <button
                onClick={handleToggleActive}
                aria-label={`Workflow is ${workflow.isActive ? 'active' : 'inactive'} — click to toggle`}
                className="hidden sm:flex focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500/70 rounded-full"
              >
                <Badge
                  variant={workflow.isActive ? 'success' : 'neutral'}
                  size="sm"
                  dot
                >
                  {workflow.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </button>
            </Tooltip>
          </div>

          {/* Center: Add Node */}
          <AddNodeDropdown onAdd={handleAddNode} />

          {/* Right: Export + Run */}
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip content="Download workflow as JSON" side="bottom">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download />}
                onClick={handleExport}
                aria-label="Export workflow as JSON"
              >
                Export
              </Button>
            </Tooltip>

            <Tooltip
              content={canRun
                ? 'Run this workflow now (manual execution)'
                : 'Workflow must be Active and have at least one node to run'
              }
              side="bottom"
            >
              <Button
                variant="primary"
                size="sm"
                leftIcon={runningWorkflow ? <RefreshCw className="animate-spin" /> : <Play />}
                onClick={handleRunWorkflow}
                disabled={!canRun}
                aria-label="Run workflow"
              >
                {runningWorkflow ? 'Running…' : 'Run'}
              </Button>
            </Tooltip>
          </div>
        </div>
      </nav>

      {/* ── Main: Canvas + Panels ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0">

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            onNodesDelete={onNodesDelete}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            className="bg-zinc-950"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="#27272a"
              gap={24}
              size={1}
            />
            <MiniMap
              nodeColor="#6366f1"
              maskColor="rgba(9,9,11,0.65)"
              style={{
                backgroundColor: '#09090b',
                border:          '1px solid #27272a',
                borderRadius:    '10px',
              }}
            />
            <Controls />
          </ReactFlow>

          {/* Canvas status bar */}
          <CanvasStatusBar
            nodeCount={storeNodes.length}
            edgeCount={storeEdges.length}
          />

          {/* Canvas empty state */}
          {storeNodes.length === 0 && (
            <div className={cn(
              'absolute inset-0 flex items-center justify-center pointer-events-none',
              'animate-fade-in',
            )}>
              <div className="text-center pointer-events-auto">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                  <Plus className="w-7 h-7 text-brand-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-300 mb-1">No nodes yet</h3>
                <p className="text-xs text-zinc-600 mb-5 max-w-[200px] leading-relaxed">
                  Use <strong className="text-zinc-400">Add Node</strong> above to add your first HTTP or IF node.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus />}
                  onClick={() => handleAddNode('HTTP')}
                >
                  Add HTTP Node
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Panels (resizable) ──────────────────────────────────────── */}
        <ResizablePanel defaultHeight={288} minHeight={140} maxHeight={520} storageKey="sg-workflow-panel-height">

          {/* Executions panel */}
          <div className="flex-1 flex flex-col border-r border-zinc-800 min-w-0">
            {/* Panel header */}
            <div className={cn(
              'flex items-center justify-between px-4 py-2.5',
              'border-b border-zinc-800/60 bg-zinc-900/80 shrink-0',
            )}>
              <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0">
                  Executions
                </span>
                <ExecSummary executions={executions} />
                <ExecFilterPills active={execFilter} onChange={setExecFilter} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw />}
                onClick={() => id && fetchExecutions(id)}
                aria-label="Refresh executions"
              >
                Refresh
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredExecutions.length === 0 ? (
                <EmptyState
                  icon={Play}
                  title={execFilter === 'ALL' ? 'No executions yet' : `No ${execFilter.toLowerCase()} executions`}
                  description={
                    execFilter === 'ALL'
                      ? 'Each run creates an execution record. Trigger manually or via webhook to see results.'
                      : `Change the filter to see other execution statuses.`
                  }
                  variant="plain"
                  className="py-8"
                />
              ) : (
                <div>
                  {filteredExecutions.map((exec, i) => (
                    <ExecRow
                      key={exec.id}
                      exec={exec}
                      index={i}
                      onClick={() => setSelectedExecution(exec)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Triggers panel */}
          <div className="w-80 shrink-0 flex flex-col">
            <div className={cn(
              'flex items-center justify-between px-4 py-2.5',
              'border-b border-zinc-800/60 bg-zinc-900/80 shrink-0',
            )}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Triggers
                </span>
                {triggers.length > 0 && (
                  <Badge variant="neutral" size="sm">{triggers.length}</Badge>
                )}
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus />}
                onClick={() => setIsTriggerModalOpen(true)}
              >
                Add Trigger
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {triggers.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="No triggers"
                  description="Add a webhook, cron schedule, or manual trigger to automate this workflow."
                  action={{ label: 'Add Trigger', onClick: () => setIsTriggerModalOpen(true) }}
                  variant="plain"
                  className="py-6"
                />
              ) : (
                triggers.map((trigger, i) => (
                  <TriggerCard
                    key={trigger.id}
                    trigger={trigger}
                    index={i}
                    onToggle={() => toggleTrigger(trigger.id, !trigger.enabled, token!)}
                    onDelete={() => deleteTrigger(trigger.id, token!)}
                  />
                ))
              )}
            </div>
          </div>
        </ResizablePanel>
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {selectedExecution && (
        <ExecutionDetailModal
          execution={selectedExecution}
          onClose={() => setSelectedExecution(null)}
        />
      )}

      <TriggerModal
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
        onSubmit={async (data) => {
          if (id && token) await createTrigger(id, data, token);
        }}
      />

      <NodeConfigModal
        node={storeNodes.find((n) => n.id === configModalNodeId) || null}
        isOpen={!!configModalNodeId}
        onClose={() => setConfigModalNodeId(null)}
        onSave={async (nodeId, config) => {
          await apiFetch(`/nodes/${nodeId}`, {
            method: 'PUT',
            body:   JSON.stringify({ config }),
          });
          if (id) await fetchWorkflowGraph(id);
        }}
      />

      <EdgeConfigModal
        edge={rfEdges.find((e) => e.id === configModalEdgeId) || null}
        isOpen={!!configModalEdgeId}
        onClose={() => setConfigModalEdgeId(null)}
        onSave={async (edgeId, condition) => {
          await apiFetch(`/edges/${edgeId}`, {
            method: 'PATCH',
            body:   JSON.stringify({ condition }),
          });
          if (id) await fetchWorkflowGraph(id);
        }}
      />
    </div>
  );
};
