import { create } from 'zustand';
import { CreateTriggerDTO, WorkflowTriggerProfile } from '@stargate/shared';

interface TriggerState {
  triggers: WorkflowTriggerProfile[];
  loading: boolean;
  error: string | null;

  fetchTriggers: (workflowId: string, token: string) => Promise<void>;
  createTrigger: (workflowId: string, data: CreateTriggerDTO, token: string) => Promise<void>;
  deleteTrigger: (id: string, token: string) => Promise<void>;
  toggleTrigger: (id: string, enabled: boolean, token: string) => Promise<void>;
}

const API_URL = 'http://localhost:3000/api/v1';

export const useTriggerStore = create<TriggerState>((set) => ({
  triggers: [],
  loading: false,
  error: null,

  fetchTriggers: async (workflowId: string, token: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/workflows/${workflowId}/triggers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch triggers');
      const triggers = await response.json();
      set({ triggers, loading: false });
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set({ error: e instanceof Error ? e.message : 'Unknown error', loading: false });
    }
  },

  createTrigger: async (workflowId: string, data: CreateTriggerDTO, token: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/workflows/${workflowId}/triggers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create trigger');
      const trigger = await response.json();
      set((state) => ({ triggers: [trigger, ...state.triggers], loading: false }));
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set({ error: e instanceof Error ? e.message : 'Unknown error', loading: false });
      throw e;
    }
  },

  deleteTrigger: async (id: string, token: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/triggers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 403) throw new Error('Forbidden: Only owners can delete triggers');
        throw new Error('Failed to delete trigger');
      }
      set((state) => ({
        triggers: state.triggers.filter((t) => t.id !== id),
        loading: false,
      }));
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set({ error: e instanceof Error ? e.message : 'Unknown error', loading: false });
      throw e;
    }
  },

  toggleTrigger: async (id: string, enabled: boolean, token: string) => {
    try {
      // Optimistic update
      set((state) => ({
        triggers: state.triggers.map((t) => (t.id === id ? { ...t, enabled } : t)),
      }));
      const response = await fetch(`${API_URL}/triggers/${id}/${enabled ? 'enable' : 'disable'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to toggle trigger');
      const updated = await response.json();
      set((state) => ({
        triggers: state.triggers.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set({ error: e instanceof Error ? e.message : 'Unknown error' });
      // Revert on error could be implemented here
    }
  },
}));
