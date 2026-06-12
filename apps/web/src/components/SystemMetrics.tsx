import React, { useEffect, useState } from 'react';
import {
  Activity, CheckCircle2, Clock, XCircle,
  Server, AlertTriangle, CheckCircle, TrendingUp
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';
import { cn } from '../lib/utils';

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:      string;
  value:      string | number;
  icon:       React.ElementType;
  color?:     'default' | 'success' | 'danger' | 'info' | 'warning';
  suffix?:    string;
}

const colorMap = {
  default: { icon: 'text-zinc-400', value: 'text-zinc-100' },
  success: { icon: 'text-success',  value: 'text-success'  },
  danger:  { icon: 'text-danger',   value: 'text-danger'   },
  info:    { icon: 'text-info',     value: 'text-info'     },
  warning: { icon: 'text-warning',  value: 'text-warning'  },
};

const StatCard: React.FC<StatCardProps> = ({
  label, value, icon: Icon, color = 'default', suffix,
}) => {
  const colors = colorMap[color];
  return (
    <div className={cn(
      'bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3',
      'hover:border-zinc-700 transition-colors duration-standard',
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-900 border border-zinc-800', colors.icon)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className={cn('text-2xl font-bold tabular-nums tracking-tight', colors.value)}>
        {value}
        {suffix && <span className="text-sm font-medium ml-1 text-zinc-500">{suffix}</span>}
      </div>
    </div>
  );
};

// ─── Queue Row ────────────────────────────────────────────────────────────────

const QueueRow: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
    <span className="text-sm text-zinc-400">{label}</span>
    <span className={cn('text-sm font-semibold tabular-nums', color)}>{value}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const SystemMetrics: React.FC = () => {
  const [health,  setHealth]  = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthData, metricsData] = await Promise.all([
          apiFetch('/system/health'),
          apiFetch('/system/metrics'),
        ]);
        setHealth(healthData);
        setMetrics(metricsData);
      } catch (err) {
        console.error('Failed to fetch metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading || !metrics || !health) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">System Overview</h3>
        </div>
        <Skeleton.MetricsDashboard />
      </div>
    );
  }

  const { workflowMetrics, queueMetrics, errorAnalytics } = metrics;

  const successRateFormatted = `${workflowMetrics.successRate.toFixed(1)}%`;
  const avgDurationFormatted = workflowMetrics.averageDuration >= 1000
    ? `${(workflowMetrics.averageDuration / 1000).toFixed(2)}s`
    : `${Math.round(workflowMetrics.averageDuration)}ms`;

  return (
    <div className="mt-6 animate-fade-in">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            System Overview
          </h3>
        </div>
        <span className="text-[11px] text-zinc-600">Live · refreshes every 10s</span>

        {/* Health status badges */}
        <div className="flex items-center gap-2">
          {Object.entries(health).map(([key, value]) => (
            <Badge
              key={key}
              variant={value === 'healthy' ? 'success' : 'danger'}
              size="sm"
              dot
            >
              {key}
            </Badge>
          ))}
        </div>
      </div>

      {/* 4-column stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total Executions"
          value={workflowMetrics.totalExecutions}
          icon={TrendingUp}
          color="default"
        />
        <StatCard
          label="Success Rate"
          value={successRateFormatted}
          icon={CheckCircle2}
          color={workflowMetrics.successRate >= 90 ? 'success' : workflowMetrics.successRate >= 70 ? 'warning' : 'danger'}
        />
        <StatCard
          label="Avg Duration"
          value={avgDurationFormatted}
          icon={Clock}
          color="info"
        />
        <StatCard
          label="Failed"
          value={workflowMetrics.failedExecutions}
          icon={XCircle}
          color={workflowMetrics.failedExecutions > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* 2-column detail panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Queue Health */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-zinc-500" />
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Queue Health
            </h4>
          </div>
          <div>
            <QueueRow label="Active Jobs"    value={queueMetrics.active}    color="text-info" />
            <QueueRow label="Waiting Jobs"   value={queueMetrics.waiting}   color="text-warning" />
            <QueueRow label="Completed Jobs" value={queueMetrics.completed} color="text-success" />
            <QueueRow label="Failed Jobs"    value={queueMetrics.failed}    color="text-danger" />
          </div>
        </div>

        {/* Failure Analytics */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-zinc-500" />
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Failure Analytics
            </h4>
          </div>
          {errorAnalytics && errorAnalytics.length > 0 ? (
            <div>
              {errorAnalytics.map((err: any) => (
                <div key={err.category} className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
                  <span className="text-sm text-zinc-400 truncate">{err.category}</span>
                  <Badge variant="danger" size="sm">{err.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2 text-sm text-zinc-500">
              <CheckCircle className="w-4 h-4 text-success shrink-0" />
              No recorded failures
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
