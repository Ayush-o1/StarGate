import { create } from 'zustand';
import { WorkflowProfile, NodeProfile, EdgeProfile } from '@stargate/shared';
import { apiFetch } from '../lib/api';

interface WorkflowState {
  workflows: WorkflowProfile[];
  loading: boolean;
  error: string | null;
  fetchWorkflows: (workspaceId: string) => Promise<void>;
  createWorkflow: (workspaceId: string, name: string, description?: string) => Promise<WorkflowProfile>;
  deleteWorkflow: (workflowId: string) => Promise<void>;

  // Graph state
  nodes: NodeProfile[];
  edges: EdgeProfile[];
  selectedNodeId: string | null;
  setNodes: (nodes: NodeProfile[] | ((nds: NodeProfile[]) => NodeProfile[])) => void;
  setEdges: (edges: EdgeProfile[] | ((eds: EdgeProfile[]) => EdgeProfile[])) => void;
  setSelectedNodeId: (id: string | null) => void;
  fetchWorkflowGraph: (workflowId: string) => Promise<void>;
  updateNodePosition: (nodeId: string, x: number, y: number) => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  loading: false,
  error: null,

  fetchWorkflows: async (workspaceId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch(`/workflows/workspace/${workspaceId}`);
      set({ workflows: data });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch workflows' });
    } finally {
      set({ loading: false });
    }
  },

  createWorkflow: async (workspaceId: string, name: string, description?: string) => {
    set({ loading: true, error: null });
    try {
      const newWorkflow = await apiFetch(`/workflows/workspace/${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      set((state) => ({
        workflows: [newWorkflow, ...state.workflows],
      }));
      return newWorkflow;
    } catch (e: any) {
      set({ error: e.message || 'Failed to create workflow' });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  deleteWorkflow: async (workflowId: string) => {
    try {
      await apiFetch(`/workflows/${workflowId}`, {
        method: 'DELETE',
      });
      set((state) => ({
        workflows: state.workflows.filter((w) => w.id !== workflowId),
      }));
    } catch (e: any) {
      set({ error: e.message || 'Failed to delete workflow' });
      throw e;
    }
  },

  nodes: [],
  edges: [],
  selectedNodeId: null,

  setNodes: (nodesOrUpdater) => {
    if (typeof nodesOrUpdater === 'function') {
      set({ nodes: nodesOrUpdater(get().nodes) });
    } else {
      set({ nodes: nodesOrUpdater });
    }
  },

  setEdges: (edgesOrUpdater) => {
    if (typeof edgesOrUpdater === 'function') {
      set({ edges: edgesOrUpdater(get().edges) });
    } else {
      set({ edges: edgesOrUpdater });
    }
  },

  setSelectedNodeId: (id: string | null) => set({ selectedNodeId: id }),

  fetchWorkflowGraph: async (workflowId: string) => {
    try {
      const [nodesData, edgesData] = await Promise.all([
        apiFetch(`/nodes/workflow/${workflowId}`),
        apiFetch(`/edges/workflow/${workflowId}`)
      ]);
      set({ nodes: nodesData, edges: edgesData });
    } catch (e: any) {
      console.error('Failed to fetch graph data', e);
    }
  },

  updateNodePosition: async (nodeId: string, positionX: number, positionY: number) => {
    // Optimistic UI update (optional, usually React Flow handles local state and we just commit)
    try {
      await apiFetch(`/nodes/${nodeId}/position`, {
        method: 'PUT',
        body: JSON.stringify({ positionX, positionY }),
      });
    } catch (e: any) {
      console.error('Failed to update node position', e);
    }
  },
}));
