import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { NodeProfile } from '@stargate/shared';
import { useWorkflowStore } from '../store/workflowStore';

interface NodeConfigModalProps {
  node: NodeProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, config: any) => Promise<void>;
}

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
}) => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [timeout, setTimeoutVal] = useState('30000');
  const [expression, setExpression] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { nodes: graphNodes } = useWorkflowStore();
  const [availableVars, setAvailableVars] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && node && graphNodes) {
      // Find all nodes that are not the current node (simplified upstream check for UI)
      const vars = graphNodes
        .filter((n: any) => n.id !== node.id)
        .map((n: any) => ({
          id: n.id,
          label: n.label || n.data?.label || 'Node',
          type: n.type,
        }));
      setAvailableVars(vars);
    }
  }, [isOpen, node, graphNodes]);

  const copyVariable = (path: string) => {
    navigator.clipboard.writeText(`{{${path}}}`);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (node.type === 'IF') {
        if (!expression.trim()) {
          setError('Expression is required.');
          return;
        }
        await onSave(node.id, { expression });
      } else {
        if (!url) {
          setError('URL is required.');
          return;
        }

        let parsedHeaders = {};
        if (headers.trim()) {
          try {
            parsedHeaders = JSON.parse(headers);
          } catch (e) {
            setError('Headers must be valid JSON.');
            return;
          }
        }

        let parsedBody = body;
        if (body.trim() && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          try {
            parsedBody = JSON.parse(body);
          } catch (e) {
            // If it's not JSON, keep it as string.
          }
        }

        await onSave(node.id, {
          method,
          url,
          headers: parsedHeaders,
          body: parsedBody,
          timeout: parseInt(timeout, 10) || 30000,
        });
      }
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save config');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-row">
        
        {/* Left Side: Configuration */}
        <div className="flex-1 flex flex-col border-r border-gray-800">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">Configure {node.type} Node</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {node.type === 'IF' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Expression *
                </label>
                <textarea
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  placeholder="response.status === 200"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white font-mono text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Write an expression that evaluates to true or false. You have access to `response`, `previousNode`, and `workflow`. Example: `response.status === 200`
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Method
                    </label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      URL *
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://api.example.com/v1/data"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Headers (JSON)
                  </label>
                  <textarea
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    placeholder={'{\n  "Authorization": "Bearer token",\n  "Content-Type": "application/json"\n}'}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 text-white font-mono text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {['POST', 'PUT', 'PATCH'].includes(method) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Body
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={'{\n  "key": "value"\n}'}
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-700 text-white font-mono text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeoutVal(e.target.value)}
                    min="1000"
                    max="300000"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}
          </div>
        </form>

          <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </div>

        {/* Right Side: Variable Explorer */}
        <div className="w-80 bg-gray-900/50 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/80">
            <h2 className="text-sm font-semibold text-white">Available Variables</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Trigger Payload</h3>
                <div 
                  onClick={() => copyVariable('trigger.payload')}
                  className="text-xs text-indigo-400 font-mono hover:text-indigo-300 cursor-pointer p-1.5 rounded hover:bg-indigo-500/10 transition-colors"
                >
                  &#123;&#123;trigger.payload&#125;&#125;
                </div>
              </div>
              
              {availableVars.map(v => (
                <div key={v.id}>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    {v.label} <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{v.type}</span>
                  </h3>
                  <div className="space-y-1">
                    {['status', 'body', 'headers'].map(prop => (
                      <div 
                        key={prop}
                        onClick={() => copyVariable(`${v.id}.${prop}`)}
                        className="text-xs text-indigo-400 font-mono hover:text-indigo-300 cursor-pointer p-1.5 rounded hover:bg-indigo-500/10 transition-colors"
                        title={`Click to copy: {{${v.id}.${prop}}}`}
                      >
                        &#123;&#123;{v.id}.{prop}&#125;&#125;
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {availableVars.length === 0 && (
                <p className="text-xs text-gray-500">No upstream nodes found.</p>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};
