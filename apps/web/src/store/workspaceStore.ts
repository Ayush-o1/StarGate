import { create } from 'zustand';
import { WorkspaceWithRole } from '@stargate/shared';
import { apiFetch } from '../lib/api';

interface WorkspaceState {
  workspaces: WorkspaceWithRole[];
  activeWorkspaceId: string | null;
  loading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<void>;
  setActiveWorkspaceId: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspaceId: localStorage.getItem('stargate_active_workspace') || null,
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch('/workspaces');
      set((state) => {
        const currentActive = state.activeWorkspaceId || localStorage.getItem('stargate_active_workspace');
        const newActiveId = currentActive && data.some((w: WorkspaceWithRole) => w.id === currentActive)
          ? currentActive
          : data.length > 0 ? data[0].id : null;

        if (newActiveId) {
          localStorage.setItem('stargate_active_workspace', newActiveId);
        } else {
          localStorage.removeItem('stargate_active_workspace');
        }

        return {
          workspaces: data,
          activeWorkspaceId: newActiveId,
        };
      });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch workspaces' });
    } finally {
      set({ loading: false });
    }
  },

  createWorkspace: async (name: string, description?: string) => {
    set({ loading: true, error: null });
    try {
      const newWorkspace = await apiFetch('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      localStorage.setItem('stargate_active_workspace', newWorkspace.id);
      set((state) => ({
        workspaces: [newWorkspace, ...state.workspaces],
        activeWorkspaceId: newWorkspace.id,
      }));
    } catch (e: any) {
      set({ error: e.message || 'Failed to create workspace' });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  setActiveWorkspaceId: (id: string) => {
    localStorage.setItem('stargate_active_workspace', id);
    set({ activeWorkspaceId: id });
  },
}));

