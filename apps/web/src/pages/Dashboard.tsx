import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiFetch } from '../lib/api';
import { LogOut, User as UserIcon, LayoutDashboard, Settings, Users, Plus, Upload } from 'lucide-react';
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useWorkflowStore } from '../store/workflowStore';
import { CreateWorkspaceModal } from '../components/CreateWorkspaceModal';
import { CreateWorkflowModal } from '../components/CreateWorkflowModal';
import { SystemMetrics } from '../components/SystemMetrics';

export const Dashboard: React.FC = () => {
  const { user, clearAuth, updateUser } = useAuthStore();
  const { workspaces, activeWorkspaceId, fetchWorkspaces, loading: workspacesLoading } = useWorkspaceStore();
  const { workflows, fetchWorkflows, loading: workflowsLoading } = useWorkflowStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspaceId) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const json = event.target?.result as string;
        try {
          const payload = JSON.parse(json);
          await apiFetch(`/workflows/workspace/${activeWorkspaceId}/import`, {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          await fetchWorkflows(activeWorkspaceId);
          alert('Workflow imported successfully!');
        } catch (err) {
          console.error(err);
          alert('Failed to parse or import workflow JSON.');
        }
      };
      reader.readAsText(file);
    } catch (e) {
      console.error(e);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await apiFetch('/users/me');
        updateUser(profile);
        await fetchWorkspaces();
      } catch (e) {
        console.error('Failed to load initial data', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [updateUser, fetchWorkspaces]);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchWorkflows(activeWorkspaceId);
    }
  }, [activeWorkspaceId, fetchWorkflows]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <LayoutDashboard className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-lg tracking-tight">Stargate</span>
              </div>
              <div className="h-6 w-px bg-gray-800"></div>
              <WorkspaceSwitcher />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
                <UserIcon className="w-4 h-4 text-gray-400" />
                {user?.name || user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-gray-400 mb-8">Phase 3 Workspaces are successfully active.</p>
          
          <SystemMetrics />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Your Profile</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500">ID</div>
                  <div className="font-mono text-sm">{user?.id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div>{user?.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Registered</div>
                  <div>{new Date(user?.createdAt || '').toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Your Workspaces</h3>
                <button 
                  onClick={() => setShowCreateWorkspaceModal(true)}
                  className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </button>
              </div>
              
              {workspacesLoading ? (
                <div className="text-center py-8 text-gray-500 text-sm">Loading workspaces...</div>
              ) : workspaces.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-sm mb-4">You don't belong to any workspaces yet.</p>
                  <button 
                    onClick={() => setShowCreateWorkspaceModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Create your first workspace
                  </button>
                </div>
              ) : activeWorkspaceId ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">Workflows</h4>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleImport} 
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        <Upload className="w-4 h-4" /> Import JSON
                      </button>
                      <button 
                        onClick={() => setShowCreateWorkflowModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> New Workflow
                      </button>
                    </div>
                  </div>
                  
                  {workflowsLoading ? (
                    <div className="text-center py-4 text-gray-500 text-sm">Loading workflows...</div>
                  ) : workflows.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-800 rounded-lg">
                      <p className="text-gray-400 text-sm mb-3">No workflows in this workspace.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workflows.map((wf) => (
                        <div 
                          key={wf.id} 
                          onClick={() => navigate(`/workflows/${wf.id}`)}
                          className="flex items-center justify-between p-3 rounded-lg border bg-gray-900 border-gray-800 hover:border-indigo-500/50 cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="font-medium text-sm text-white flex items-center gap-2">
                              {wf.name}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${wf.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                                {wf.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">v{wf.version} • {new Date(wf.createdAt).toLocaleDateString()}</div>
                          </div>
                          <button className="text-gray-500 hover:text-white p-1.5 rounded transition-colors">
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {showCreateWorkspaceModal && (
        <CreateWorkspaceModal onClose={() => setShowCreateWorkspaceModal(false)} />
      )}
      {showCreateWorkflowModal && activeWorkspaceId && (
        <CreateWorkflowModal workspaceId={activeWorkspaceId} onClose={() => setShowCreateWorkflowModal(false)} />
      )}
    </div>
  );
};
