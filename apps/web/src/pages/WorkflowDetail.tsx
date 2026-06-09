import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Loader2 } from 'lucide-react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
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
import { ExecutionDetailModal } from '../components/ExecutionDetailModal';
import { CustomNode } from '../components/CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

export const WorkflowDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<WorkflowProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    nodes: storeNodes,
    edges: storeEdges,
    fetchWorkflowGraph,
    updateNodePosition,
  } = useWorkflowStore();

  const { executions, fetchExecutions, runWorkflow, loading: runningWorkflow } = useWorkflowExecutionStore();
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecutionProfile | null>(null);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  const fetchWorkflowData = useCallback(async () => {
    try {
      const data = await apiFetch(`/workflows/${id}`);
      setWorkflow(data);
      await fetchWorkflowGraph(id!);
      await fetchExecutions(id!);
    } catch (e) {
      console.error(e);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, fetchWorkflowGraph, fetchExecutions]);

  useEffect(() => {
    fetchWorkflowData();
  }, [fetchWorkflowData]);

  // Sync store data to React Flow state
  useEffect(() => {
    const formattedNodes: ReactFlowNode[] = storeNodes.map((n) => ({
      id: n.id,
      type: 'custom',
      position: { x: n.positionX, y: n.positionY },
      data: { label: n.label, type: n.type, workflowId: n.workflowId },
    }));
    setRfNodes(formattedNodes);

    const formattedEdges: Edge[] = storeEdges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: 'smoothstep',
      animated: true,
    }));
    setRfEdges(formattedEdges);
  }, [storeNodes, storeEdges, setRfNodes, setRfEdges]);

  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: ReactFlowNode) => {
      await updateNodePosition(node.id, node.position.x, node.position.y);
    },
    [updateNodePosition]
  );

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;
      
      // Optimistically add the edge to the UI immediately
      setRfEdges((eds) => addEdge(params, eds));

      try {
        await apiFetch(`/edges/workflow/${id}`, {
          method: 'POST',
          body: JSON.stringify({
            sourceNodeId: params.source,
            targetNodeId: params.target,
          }),
        });
        // Fetch from backend to ensure we have the real Edge ID (UUID)
        await fetchWorkflowGraph(id!);
      } catch (e) {
        console.error('Failed to create edge', e);
        // Rollback optimistic update
        setRfEdges((eds) => eds.filter(e => e.source !== params.source || e.target !== params.target));
      }
    },
    [id, fetchWorkflowGraph, setRfEdges]
  );

  const onEdgesDelete = useCallback(
    async (edgesToDelete: Edge[]) => {
      for (const edge of edgesToDelete) {
        try {
          await apiFetch(`/edges/${edge.id}`, { method: 'DELETE' });
        } catch (e) {
          console.error('Failed to delete edge', e);
        }
      }
      if (id) await fetchWorkflowGraph(id);
    },
    [id, fetchWorkflowGraph]
  );

  const onNodesDelete = useCallback(
    async (nodesToDelete: ReactFlowNode[]) => {
      for (const node of nodesToDelete) {
        try {
          await apiFetch(`/nodes/${node.id}`, { method: 'DELETE' });
        } catch (e) {
          console.error('Failed to delete node', e);
        }
      }
      if (id) await fetchWorkflowGraph(id);
    },
    [id, fetchWorkflowGraph]
  );

  const handleAddMockNode = async () => {
    try {
      await apiFetch(`/nodes/workflow/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'HTTP',
          label: `HTTP Request ${storeNodes.length + 1}`,
          positionX: 100,
          positionY: 100,
        }),
      });
      await fetchWorkflowGraph(id!);
    } catch (e) {
      console.error('Failed to add node', e);
    }
  };

  const handleRunWorkflow = async () => {
    if (!id) return;
    try {
      await runWorkflow(id);
      await fetchExecutions(id);
      setTimeout(() => fetchExecutions(id), 1500);
    } catch (e) {
      console.error('Failed to run workflow', e);
      alert('Failed to run workflow');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!workflow) return null;

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex-none z-50">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-lg">{workflow.name}</h1>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded uppercase font-bold text-[9px] ${
                    workflow.status === 'ACTIVE'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {workflow.status}
                </span>
                <span>v{workflow.version}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleRunWorkflow}
            disabled={runningWorkflow || storeNodes.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/20"
          >
            {runningWorkflow ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4" />
            )}
            Run Workflow
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col min-h-0 relative">
        {/* Canvas Area */}
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
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-950"
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#374151" gap={16} />
            <MiniMap
              nodeColor="#4f46e5"
              maskColor="rgba(17, 24, 39, 0.7)"
              style={{ backgroundColor: '#1f2937' }}
            />
            <Controls
              className="bg-gray-800 border-gray-700 fill-white"
              style={{ fill: 'white' }}
            />
          </ReactFlow>

          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={handleAddMockNode}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors flex items-center gap-2"
            >
              + Add Node
            </button>
          </div>
        </div>

        {/* Executions Panel */}
        <div className="h-64 border-t border-gray-800 bg-gray-900 overflow-y-auto flex-none">
          <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-800/50 flex items-center justify-between z-10">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Execution History
            </h3>
            <button
              onClick={() => id && fetchExecutions(id)}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Refresh
            </button>
          </div>
          {executions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No executions found. Click Run Workflow to start.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {executions.map((exec) => (
                <div
                  key={exec.id}
                  onClick={() => setSelectedExecution(exec)}
                  className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        exec.status === 'SUCCESS'
                          ? 'bg-green-500/10 text-green-500'
                          : exec.status === 'FAILED'
                          ? 'bg-red-500/10 text-red-500'
                          : exec.status === 'RUNNING'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {exec.status}
                    </span>
                    <span className="font-mono text-sm text-gray-300">
                      {exec.id.split('-')[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    {exec.durationMs !== null && <span>{exec.durationMs}ms</span>}
                    <span>{new Date(exec.startedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedExecution && (
        <ExecutionDetailModal
          execution={selectedExecution}
          onClose={() => setSelectedExecution(null)}
        />
      )}
    </div>
  );
};
