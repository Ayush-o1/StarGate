import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiFetch } from '../lib/api';
import {
  GitBranch, Users, Plus, Upload, ChevronDown, Settings, LogOut, Search,
} from 'lucide-react';
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useWorkflowStore } from '../store/workflowStore';
import { CreateWorkspaceModal } from '../components/CreateWorkspaceModal';
import { CreateWorkflowModal } from '../components/CreateWorkflowModal';
import { SystemMetrics } from '../components/SystemMetrics';
import { WorkflowCard } from '../components/WorkflowCard';
import { KpiStrip } from '../components/KpiStrip';
import { ActivityFeed } from '../components/ActivityFeed';
import { CommandPalette } from '../components/CommandPalette';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { PageLoader } from '../components/ui/PageLoader';
import { Separator } from '../components/ui/Separator';
import { toast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import type { WorkflowExecutionProfile } from '@stargate/shared';

// ─── Time-aware greeting ──────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Stargate logomark ────────────────────────────────────────────────────────

const Logo: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="24" cy="24" r="21" stroke="url(#dash-gradient)" strokeWidth="2" opacity="0.8" />
    <circle cx="24" cy="24" r="13" stroke="url(#dash-gradient)" strokeWidth="1.5" opacity="0.4" />
    <path d="M14 24 C14 18.477 18.477 14 24 14 C29.523 14 34 18.477 34 24" stroke="url(#dash-gradient)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="14" y1="24" x2="14" y2="32" stroke="url(#dash-gradient)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="34" y1="24" x2="34" y2="32" stroke="url(#dash-gradient)" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="24" r="2.5" fill="url(#dash-gradient)" />
    <defs>
      <linearGradient id="dash-gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#a78bfa" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── User menu dropdown ───────────────────────────────────────────────────────

interface UserMenuProps {
  user: any;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        className={cn(
          'flex items-center gap-2 text-xs text-zinc-300 px-2.5 py-1.5 rounded-lg',
          'border transition-all duration-standard',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70',
          open
            ? 'bg-zinc-800 border-zinc-600'
            : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800/80 hover:text-zinc-100',
        )}
      >
        {/* Avatar circle */}
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {initial}
        </div>
        <span className="hidden sm:block max-w-[100px] truncate">{displayName}</span>
        <ChevronDown className={cn('w-3 h-3 text-zinc-500 shrink-0 transition-transform duration-standard', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full right-0 mt-2 w-56 z-50',
          'bg-zinc-900 border border-zinc-800 rounded-xl shadow-modal overflow-hidden',
          'animate-fade-in-scale',
        )}>
          {/* Profile section */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="text-sm font-semibold text-zinc-100 truncate">{displayName}</div>
            <div className="text-xs text-zinc-500 truncate mt-0.5">{user?.email}</div>
          </div>

          {/* Menu items */}
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => setOpen(false)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left',
                'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
                'transition-colors duration-instant',
              )}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Settings
              <span className="ml-auto text-[10px] text-zinc-700 bg-zinc-800 px-1.5 py-0.5 rounded">soon</span>
            </button>
          </div>

          {/* Sign out */}
          <div className="p-1.5 border-t border-zinc-800">
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left',
                'text-danger/80 hover:bg-danger/10 hover:text-danger',
                'transition-colors duration-instant',
              )}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Quick-start banner (new workspaces only) ─────────────────────────────────

const QuickStartBanner: React.FC<{ onCreateWorkflow: () => void }> = ({ onCreateWorkflow }) => (
  <div className={cn(
    'rounded-xl border border-brand-500/20 bg-brand-500/5 p-5 mb-6',
    'animate-fade-in-up fill-mode-both',
  )}>
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm font-semibold text-brand-300">Get started with Stargate</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[
        {
          step: '01', title: 'Create a workflow',
          desc: 'Define the name and purpose of your automation.',
          action: onCreateWorkflow, actionLabel: 'Create now →',
        },
        {
          step: '02', title: 'Add HTTP nodes',
          desc: 'Chain requests and conditional logic with the visual builder.',
          action: null, actionLabel: null,
        },
        {
          step: '03', title: 'Run & monitor',
          desc: 'Trigger via webhook, schedule, or manually and watch results live.',
          action: null, actionLabel: null,
        },
      ].map(({ step, title, desc, action, actionLabel }) => (
        <div key={step} className="flex flex-col gap-2 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
          <span className="text-[10px] font-bold text-brand-500/60 font-mono">{step}</span>
          <div className="text-xs font-semibold text-zinc-200">{title}</div>
          <div className="text-xs text-zinc-500 leading-relaxed">{desc}</div>
          {action && (
            <button
              onClick={action}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium mt-auto transition-colors duration-instant text-left focus-visible:outline-none focus-visible:underline"
            >
              {actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { user, clearAuth, updateUser } = useAuthStore();
  const { workspaces, activeWorkspaceId, fetchWorkspaces, loading: workspacesLoading } = useWorkspaceStore();
  const { workflows, fetchWorkflows, loading: workflowsLoading } = useWorkflowStore();
  const navigate = useNavigate();

  const [loading,   setLoading]   = useState(true);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showCreateWorkflowModal,  setShowCreateWorkflowModal]  = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // KPI state
  const [kpiData,    setKpiData]    = useState<any>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  // Last-execution map: workflowId → most recent execution
  const [lastExecMap,    setLastExecMap]    = useState<Record<string, WorkflowExecutionProfile>>({});
  // Run-history map: workflowId → last 5 executions (for dots)
  const [runHistoryMap,  setRunHistoryMap]  = useState<Record<string, WorkflowExecutionProfile[]>>();

  // ─── Import handler ───────────────────────────────────────────────────────
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
          toast.success('Workflow imported successfully');
        } catch (err) {
          console.error(err);
          toast.error('Failed to import workflow. Check that the file is valid JSON.');
        }
      };
      reader.readAsText(file);
    } catch (e) {
      console.error(e);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Init ─────────────────────────────────────────────────────────────────
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
    if (activeWorkspaceId) fetchWorkflows(activeWorkspaceId);
  }, [activeWorkspaceId, fetchWorkflows]);

  // ─── Fetch KPI metrics ────────────────────────────────────────────────────
  const fetchKpi = useCallback(async () => {
    try {
      const metrics = await apiFetch('/system/metrics');
      const { workflowMetrics } = metrics;
      setKpiData({
        totalWorkflows:   workflows.length,
        activeWorkflows:  workflows.filter((w) => w.status === 'ACTIVE').length,
        totalExecutions:  workflowMetrics.totalExecutions,
        successRate:      workflowMetrics.successRate,
      });
    } catch (err) {
      console.error('KPI fetch failed', err);
    } finally {
      setKpiLoading(false);
    }
  }, [workflows]);

  useEffect(() => {
    if (!workflowsLoading) fetchKpi();
  }, [workflowsLoading, fetchKpi]);

  // ─── Fetch last executions per workflow ───────────────────────────────────
  useEffect(() => {
    if (workflows.length === 0) return;
    const fetchLastExecs = async () => {
      const lastMap: Record<string, WorkflowExecutionProfile>   = {};
      const histMap: Record<string, WorkflowExecutionProfile[]> = {};
      await Promise.allSettled(
        workflows.map(async (wf) => {
          try {
            const execs = await apiFetch(`/executions/workflow/${wf.id}`);
            if (Array.isArray(execs) && execs.length > 0) {
              lastMap[wf.id] = execs[0];          // most recent (API desc order)
              histMap[wf.id] = execs.slice(0, 5); // last 5 for run-history dots
            }
          } catch { /* skip */ }
        })
      );
      setLastExecMap(lastMap);
      setRunHistoryMap(histMap);
    };
    fetchLastExecs();
  }, [workflows]);

  // ─── Logout ───────────────────────────────────────────────────────────────
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

  if (loading) return <PageLoader />;

  const displayName = user?.name || user?.email?.split('@')[0] || 'there';
  const greeting    = getGreeting();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ─── Navbar ────────────────────────────────────────────────────────── */}
      <nav
        className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo + Workspace Switcher */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <Logo />
                <span className="font-semibold text-sm tracking-tight text-zinc-100">
                  Stargate
                </span>
              </div>

              <Separator orientation="vertical" className="h-4" />

              <WorkspaceSwitcher />
            </div>

            {/* Center: ⌘K Search */}
            <button
              onClick={() => setShowPalette(true)}
              aria-label="Open command palette"
              className={cn(
                'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'text-xs text-zinc-500 bg-zinc-900 border border-zinc-800',
                'hover:border-zinc-700 hover:text-zinc-300',
                'transition-all duration-standard',
              )}
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Search workflows…</span>
              <div className="flex items-center gap-0.5 ml-2 opacity-60">
                <kbd className="text-[9px] bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded">⌘</kbd>
                <kbd className="text-[9px] bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded">K</kbd>
              </div>
            </button>

            {/* Right: User menu */}
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </nav>

      {/* ─── Main Layout ─────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div className="mb-7 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            {greeting}, {displayName}.
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {kpiData
              ? `${kpiData.activeWorkflows} workflow${kpiData.activeWorkflows !== 1 ? 's' : ''} active · ${kpiData.totalExecutions} total executions`
              : 'Build, automate, and monitor HTTP workflows — visually.'}
          </p>
        </div>

        {/* ── KPI Strip ──────────────────────────────────────────────────── */}
        {activeWorkspaceId && (
          <div className="mb-7">
            <KpiStrip
              data={kpiData ?? {
                totalWorkflows:  0,
                activeWorkflows: 0,
                totalExecutions: 0,
                successRate:     0,
              }}
              loading={kpiLoading || workflowsLoading}
            />
          </div>
        )}

        {/* ── Two-column layout ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* Left: Workflows ─────────────────────────────────────────────── */}
          <div className="space-y-6">
            <section aria-labelledby="workflows-heading">
              <div className="flex items-center justify-between mb-4">
                <h2
                  id="workflows-heading"
                  className="text-sm font-semibold text-zinc-300 uppercase tracking-wider"
                >
                  Workflows
                  {workflows.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-zinc-600 normal-case tracking-normal">
                      {workflows.length} total
                    </span>
                  )}
                </h2>

                {activeWorkspaceId && (
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleImport}
                      aria-label="Import workflow JSON"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Upload />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Import
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus />}
                      onClick={() => setShowCreateWorkflowModal(true)}
                    >
                      New Workflow
                    </Button>
                  </div>
                )}
              </div>

              {/* Content area */}
              {!activeWorkspaceId ? (
                <EmptyState
                  icon={Users}
                  title="No workspace selected"
                  description="Workspaces group your workflows. Create or select one to get started."
                  action={{
                    label:   'Create Workspace',
                    onClick: () => setShowCreateWorkspaceModal(true),
                  }}
                />
              ) : workflowsLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton.WorkflowRow key={i} />
                  ))}
                </div>
              ) : workflows.length === 0 ? (
                <>
                  <QuickStartBanner onCreateWorkflow={() => setShowCreateWorkflowModal(true)} />
                  <EmptyState
                    icon={GitBranch}
                    title="No workflows yet"
                    description="A workflow chains HTTP requests and conditional logic into an automated sequence. Create your first one to get started."
                    action={{
                      label:   'Create Workflow',
                      onClick: () => setShowCreateWorkflowModal(true),
                    }}
                  />
                </>
              ) : (
                <div className="space-y-2.5">
                  {workflows.map((wf, i) => (
                    <WorkflowCard
                      key={wf.id}
                      workflow={wf}
                      index={i}
                      lastExecution={lastExecMap[wf.id] ?? null}
                      runHistory={runHistoryMap?.[wf.id]}
                      onOpen={() => navigate(`/workflows/${wf.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── System Metrics (collapsed section below workflows) ──────── */}
            {activeWorkspaceId && (
              <section aria-labelledby="metrics-heading">
                <SystemMetrics />
              </section>
            )}
          </div>

          {/* Right: Activity Feed + Workspaces ────────────────────────────── */}
          <aside className="space-y-4 animate-fade-in-up" style={{ animationDelay: '80ms' }}>

            {/* Activity Feed */}
            {activeWorkspaceId && (
              <ActivityFeed workspaceId={activeWorkspaceId} limit={8} />
            )}

            {/* Workspaces card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Workspaces
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus />}
                  onClick={() => setShowCreateWorkspaceModal(true)}
                  aria-label="Create new workspace"
                >
                  New
                </Button>
              </div>

              {workspacesLoading ? (
                <div className="space-y-2">
                  {[0, 1].map((i) => <Skeleton.Card key={i} className="h-10" />)}
                </div>
              ) : workspaces.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No workspaces"
                  description="Create your first workspace to get started."
                  action={{
                    label:   'Create',
                    onClick: () => setShowCreateWorkspaceModal(true),
                  }}
                  variant="plain"
                  className="py-6"
                />
              ) : (
                <div className="space-y-1.5">
                  {workspaces.map((ws) => {
                    const isActive = ws.id === activeWorkspaceId;
                    return (
                      <div
                        key={ws.id}
                        className={cn(
                          'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm',
                          'transition-colors duration-instant',
                          isActive
                            ? 'bg-brand-500/10 text-brand-400'
                            : 'text-zinc-400'
                        )}
                      >
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{
                            background: `linear-gradient(135deg, hsl(${(ws.name.charCodeAt(0) * 37) % 360}, 60%, 35%), hsl(${((ws.name.charCodeAt(0) * 37) + 40) % 360}, 60%, 25%))`,
                          }}
                          aria-hidden="true"
                        >
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate text-xs">{ws.name}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" aria-hidden="true" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}
      {showCreateWorkspaceModal && (
        <CreateWorkspaceModal onClose={() => setShowCreateWorkspaceModal(false)} />
      )}
      {showCreateWorkflowModal && activeWorkspaceId && (
        <CreateWorkflowModal
          workspaceId={activeWorkspaceId}
          onClose={() => setShowCreateWorkflowModal(false)}
        />
      )}
      <CommandPalette
        isOpen={showPalette}
        onClose={() => setShowPalette(false)}
        onCreateWorkflow={() => setShowCreateWorkflowModal(true)}
        onImportWorkflow={() => fileInputRef.current?.click()}
      />
    </div>
  );
};
