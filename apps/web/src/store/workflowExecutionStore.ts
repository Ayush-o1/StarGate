import { create } from 'zustand';
import { WorkflowExecutionProfile } from '@stargate/shared';
import { apiFetch } from '../lib/api';

interface WorkflowExecutionState {
  executions: WorkflowExecutionProfile[];
  loading: boolean;
  error: string | null;
  fetchExecutions: (workflowId: string) => Promise<void>;
  runWorkflow: (workflowId: string) => Promise<void>;
}

export const useWorkflowExecutionStore = create<WorkflowExecutionState>((set) => ({
  executions: [],
  loading: false,
  error: null,

  fetchExecutions: async (workflowId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch(`/workflows/${workflowId}/executions`);
      set({ executions: data });
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set({ error: e.message || 'Failed to fetch executions' });
    } finally {
      set({ loading: false });
    }
  },

  runWorkflow: async (workflowId: string) => {
    set({ loading: true, error: null });
    try {
      await apiFetch(`/workflows/${workflowId}/run`, { method: 'POST' });
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set({ error: e.message || 'Failed to run workflow' });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
}));
