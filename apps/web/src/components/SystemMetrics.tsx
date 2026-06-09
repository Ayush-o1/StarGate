import React, { useEffect, useState } from 'react';
import { Activity, Clock, Server, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const SystemMetrics: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
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

  if (loading || !metrics || !health) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          System Overview
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-800 rounded-lg"></div>
          <div className="h-20 bg-gray-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const { workflowMetrics, queueMetrics, errorAnalytics } = metrics;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          System Overview
        </h3>
        <div className="flex gap-4 text-sm">
          {Object.entries(health).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1.5 capitalize">
              <div className={`w-2 h-2 rounded-full ${value === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-400">{key}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Workflow Metrics */}
        <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Executions</div>
          <div className="text-2xl font-semibold">{workflowMetrics.totalExecutions}</div>
        </div>
        <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Success Rate</div>
          <div className="text-2xl font-semibold text-green-400">
            {workflowMetrics.successRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Avg Duration</div>
          <div className="text-2xl font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            {Math.round(workflowMetrics.averageDuration)}ms
          </div>
        </div>
        <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Failed</div>
          <div className="text-2xl font-semibold text-red-400">{workflowMetrics.failedExecutions}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue Metrics */}
        <div className="bg-gray-950 p-5 rounded-lg border border-gray-800">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Server className="w-4 h-4" /> Queue Health
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-semibold text-blue-400">{queueMetrics.active}</div>
              <div className="text-xs text-gray-500">Active Jobs</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-yellow-400">{queueMetrics.waiting}</div>
              <div className="text-xs text-gray-500">Waiting Jobs</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-green-400">{queueMetrics.completed}</div>
              <div className="text-xs text-gray-500">Completed Jobs</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-red-400">{queueMetrics.failed}</div>
              <div className="text-xs text-gray-500">Failed Jobs</div>
            </div>
          </div>
        </div>

        {/* Error Analytics */}
        <div className="bg-gray-950 p-5 rounded-lg border border-gray-800">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Failure Analytics
          </h4>
          {errorAnalytics && errorAnalytics.length > 0 ? (
            <div className="space-y-3">
              {errorAnalytics.map((err: any) => (
                <div key={err.category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{err.category}</span>
                  <span className="text-sm font-semibold bg-red-500/10 text-red-400 px-2 py-0.5 rounded">
                    {err.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 flex items-center gap-2 mt-4">
              <CheckCircle className="w-4 h-4 text-green-500" /> No recorded failures.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
