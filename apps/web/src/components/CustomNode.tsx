import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Trash2, Settings } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useWorkflowStore } from '../store/workflowStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CustomNode = memo(({ id, data, isConnectable }: { id: string; data: any; isConnectable: boolean }) => {
  const { fetchWorkflowGraph } = useWorkflowStore();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/nodes/${id}`, {
        method: 'DELETE',
      });
      if (data.workflowId) {
        await fetchWorkflowGraph(data.workflowId);
      }
    } catch (err) {
      console.error('Failed to delete node', err);
    }
  };

  return (
    <div className="bg-gray-900 border-2 border-gray-700 hover:border-indigo-500 rounded-lg shadow-xl overflow-hidden min-w-[200px] transition-colors">
      <div className="bg-gray-800 px-3 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="font-mono text-xs text-gray-400 font-bold uppercase tracking-wider">{data.type || 'Node'}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (data.onConfigure) {
                data.onConfigure(id);
              }
            }}
            className="text-gray-500 hover:text-indigo-400 p-1 rounded transition-colors bg-gray-900/50 hover:bg-indigo-500/10"
            title="Configure Node"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors bg-gray-900/50 hover:bg-red-500/10"
            title="Delete Node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="text-sm font-medium text-white">{data.label}</div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-indigo-500 border-2 border-gray-900"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-indigo-500 border-2 border-gray-900"
      />
    </div>
  );
});
