import React, { useState, useEffect } from 'react';
import { Save, Copy, CheckCircle2, Globe, GitBranch } from 'lucide-react';
import { NodeProfile } from '@stargate/shared';
import { useWorkflowStore } from '../store/workflowStore';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { toast } from './ui/Toast';
import { cn } from '../lib/utils';

interface NodeConfigModalProps {
  node:    NodeProfile | null;
  isOpen:  boolean;
  onClose: () => void;
  onSave:  (nodeId: string, config: any) => Promise<void>;
}

// ─── HTTP Method badge color ──────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET:    'text-success bg-success/10',
  POST:   'text-brand-400 bg-brand-500/10',
  PUT:    'text-warning bg-warning/10',
  PATCH:  'text-violet-400 bg-violet-500/10',
  DELETE: 'text-danger bg-danger/10',
};

// ─── Variable chip ────────────────────────────────────────────────────────────

const VarChip: React.FC<{ path: string }> = ({ path }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`{{${path}}}`);
    toast.success('Variable copied to clipboard');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={`Copy variable {{${path}}}`}
      title={`Copy {{${path}}}`}
      className={cn(
        'group flex items-center gap-1.5 w-full',
        'px-2 py-1.5 rounded-lg text-xs font-mono text-left',
        'border transition-colors duration-instant',
        copied
          ? 'bg-success/10 border-success/30 text-success'
          : 'bg-zinc-900 border-zinc-800 text-brand-400 hover:border-brand-500/40 hover:bg-brand-500/5 hover:text-brand-300',
      )}
    >
      {copied
        ? <CheckCircle2 className="w-3 h-3 shrink-0" />
        : <Copy className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
      }
      <span className="truncate">{`{{${path}}}`}</span>
    </button>
  );
};

// ─── NodeConfigModal ──────────────────────────────────────────────────────────

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
  node, isOpen, onClose, onSave,
}) => {
  const [method,     setMethod]     = useState('GET');
  const [url,        setUrl]        = useState('');
  const [headers,    setHeaders]    = useState('');
  const [body,       setBody]       = useState('');
  const [timeout,    setTimeoutVal] = useState('30000');
  const [expression, setExpression] = useState('');
  const [error,      setError]      = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);

  const { nodes: graphNodes } = useWorkflowStore();
  const [availableVars, setAvailableVars] = useState<any[]>([]);

  // Populate vars when modal opens
  useEffect(() => {
    if (isOpen && node && graphNodes) {
      setAvailableVars(
        graphNodes
          .filter((n: any) => n.id !== node.id)
          .map((n: any) => ({ id: n.id, label: n.label || 'Node', type: n.type }))
      );
    }
  }, [isOpen, node, graphNodes]);

  // Populate form from saved config
  useEffect(() => {
    if (isOpen && node) {
      const config = node.config as any;
      setMethod(config?.method || 'GET');
      setUrl(config?.url || '');
      setHeaders(config?.headers ? JSON.stringify(config.headers, null, 2) : '');
      setBody(config?.body ? (typeof config.body === 'string' ? config.body : JSON.stringify(config.body, null, 2)) : '');
      setTimeoutVal(config?.timeout?.toString() || '30000');
      setExpression(config?.expression || '');
      setError(null);
    }
  }, [isOpen, node]);

  if (!isOpen || !node) return null;

  const isIF   = node.type === 'IF';
  const isHTTP = node.type === 'HTTP';

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isIF) {
        if (!expression.trim()) { setError('Expression is required.'); setSaving(false); return; }
        await onSave(node.id, { expression });
      } else {
        if (!url) { setError('URL is required.'); setSaving(false); return; }
        let parsedHeaders = {};
        if (headers.trim()) {
          try { parsedHeaders = JSON.parse(headers); }
          catch { setError('Headers must be valid JSON.'); setSaving(false); return; }
        }
        let parsedBody: any = body;
        if (body.trim() && ['POST', 'PUT', 'PATCH'].includes(method)) {
          try { parsedBody = JSON.parse(body); } catch { /* keep as string */ }
        }
        await onSave(node.id, { method, url, headers: parsedHeaders, body: parsedBody, timeout: parseInt(timeout, 10) || 30000 });
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
      <Button variant="primary" isLoading={saving} onClick={handleSubmit} leftIcon={<Save />}>
        Save Configuration
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {isHTTP ? <Globe className="w-4 h-4 text-brand-400" /> : <GitBranch className="w-4 h-4 text-violet-400" />}
          Configure {node.type} Node
          <Badge variant={isHTTP ? 'brand' : 'neutral'} size="sm">
            {node.label || `${node.type} Node`}
          </Badge>
        </div>
      }
      size="xl"
      footer={footer}
    >
      {/* Two-column layout inside modal body */}
      <div className="flex flex-row min-h-0 flex-1 divide-x divide-zinc-800">

        {/* ── Left: Form ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {isIF ? (
            <>
              <Textarea
                label="Condition Expression *"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="response.status === 200"
                rows={4}
                hint="Evaluates to true or false. Access: response, previousNode, workflow."
                className="font-mono text-sm"
              />
            </>
          ) : (
            <>
              {/* Method + URL row */}
              <div className="flex gap-3 items-end">
                <div className="w-36 shrink-0">
                  <Select
                    label="Method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m }))}
                    selectSize="sm"
                  />
                </div>
                {/* Method color badge preview */}
                <div className={cn('mb-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase', METHOD_COLORS[method] || '')}>
                  {method}
                </div>
                <div className="flex-1">
                  <Input
                    label="URL *"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/v1/endpoint"
                  />
                </div>
              </div>

              {/* Headers */}
              <Textarea
                label="Headers (JSON)"
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder={'{\n  "Authorization": "Bearer token",\n  "Content-Type": "application/json"\n}'}
                rows={3}
                hint="Must be valid JSON. Leave empty for no headers."
                className="font-mono text-xs"
              />

              {/* Body — only for mutating methods */}
              {['POST', 'PUT', 'PATCH'].includes(method) && (
                <Textarea
                  label="Request Body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={'{\n  "key": "value"\n}'}
                  rows={4}
                  hint="JSON body sent with the request. You can use {{variables}}."
                  className="font-mono text-xs"
                />
              )}

              {/* Timeout */}
              <Input
                label="Timeout (ms)"
                type="number"
                value={timeout}
                onChange={(e) => setTimeoutVal(e.target.value)}
                min={1000}
                max={300000}
                hint="Default: 30000ms (30 seconds). Maximum: 300000ms."
              />
            </>
          )}
        </form>

        {/* ── Right: Variable Explorer ────────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col bg-zinc-950/50">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Available Variables
            </h3>
            <p className="text-[11px] text-zinc-600 mt-0.5">Click to copy</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Trigger payload */}
            <div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
                Trigger Payload
              </div>
              <VarChip path="trigger.payload" />
            </div>

            {/* Upstream node variables */}
            {availableVars.map((v) => (
              <div key={v.id}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider truncate">
                    {v.label}
                  </span>
                  <span className="text-[9px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-500 shrink-0 uppercase">
                    {v.type}
                  </span>
                </div>
                <div className="space-y-1">
                  {['status', 'body', 'headers'].map((prop) => (
                    <VarChip key={prop} path={`${v.id}.${prop}`} />
                  ))}
                </div>
              </div>
            ))}

            {availableVars.length === 0 && (
              <p className="text-xs text-zinc-600">
                No upstream nodes found. Add and connect nodes to see their output variables here.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
