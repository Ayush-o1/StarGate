import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { WorkflowExecutionProfile, NodeExecutionProfile } from '@stargate/shared';
import { apiFetch } from '../lib/api';

interface ExecutionDetailModalProps {
  execution: WorkflowExecutionProfile;
  onClose: () => void;
}

export const ExecutionDetailModal: React.FC<ExecutionDetailModalProps> = ({ execution, onClose }) => {
  const [nodes, setNodes] = useState<NodeExecutionProfile[]>([]);
  const [loading, setLoading] = useState(true);

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

  const renderOutput = (output: any) => {
    if (!output) return null;
    
    if (output.url && output.method) {
      return (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="font-bold text-gray-300 bg-gray-800 px-2 py-1 rounded">{output.method}</span>
            <span className="text-gray-400 font-mono break-all">{output.url}</span>
            {output.status && (
              <span className={`px-2 py-1 rounded font-bold text-xs ${output.status >= 200 && output.status < 300 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {output.status} {output.statusText}
              </span>
            )}
            {output.durationMs && <span className="text-gray-500 text-xs bg-gray-800/50 px-2 py-1 rounded">{output.durationMs}ms</span>}
          </div>
          
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Response Body</p>
            <pre className="bg-black/50 p-3 rounded-lg text-sm font-mono text-gray-300 overflow-x-auto max-h-64 overflow-y-auto">
              {typeof output.body === 'object' ? JSON.stringify(output.body, null, 2) : (output.body || JSON.stringify(output, null, 2))}
            </pre>
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Output</p>
        <pre className="bg-black/50 p-3 rounded-lg text-sm font-mono text-gray-300 overflow-x-auto max-h-64 overflow-y-auto">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Execution Details</h2>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="font-mono">{execution.id}</span>
              <span>•</span>
              <span>{new Date(execution.startedAt).toLocaleString()}</span>
              {execution.durationMs !== null && (
                <>
                  <span>•</span>
                  <span>{execution.durationMs}ms</span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : nodes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No node executions recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {nodes.map((node) => (
                <div key={node.id} className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-800/50 flex items-center justify-between bg-gray-900/50">
                    <div className="flex items-center gap-3">
                      {node.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : node.status === 'FAILED' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : node.status === 'RUNNING' ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="font-medium text-white">Node: {node.nodeId}</span>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-800 text-gray-300">
                      {node.status}
                    </span>
                  </div>
                  
                  {!!node.output && renderOutput(node.output)}

                  {!!node.error && (
                    <div className="p-4 bg-red-500/5 border-t border-red-500/10">
                      <p className="text-xs text-red-500 mb-2 font-medium uppercase tracking-wider">Error</p>
                      <pre className="bg-red-500/10 p-3 rounded-lg text-sm font-mono text-red-400 overflow-x-auto whitespace-pre-wrap">
                        {String(node.error)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
