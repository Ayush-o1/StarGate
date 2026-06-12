import React from 'react';
import { cn } from '../../lib/utils';

// ─── Base Skeleton ────────────────────────────────────────────────────────────

interface SkeletonBaseProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  style?: React.CSSProperties;
}

const roundedMap = {
  sm:   'rounded',
  md:   'rounded-md',
  lg:   'rounded-lg',
  full: 'rounded-full',
};

const SkeletonBase: React.FC<SkeletonBaseProps> = ({
  className,
  rounded = 'md',
  style,
}) => (
  <div
    aria-hidden="true"
    style={style}
    className={cn(
      // Shimmer animation via background gradient sweep
      'animate-shimmer bg-[length:200%_100%]',
      'bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800',
      roundedMap[rounded],
      className
    )}
  />
);

// ─── Text Skeleton ────────────────────────────────────────────────────────────

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 2, className }) => (
  <div aria-hidden="true" className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBase
        key={i}
        className="h-3.5"
        // Last line is shorter for a natural paragraph look
        style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
      />
    ))}
  </div>
);

// ─── Metric Card Skeleton (matches SystemMetrics stat cards) ──────────────────

const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-hidden="true"
    className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3', className)}
  >
    <SkeletonBase className="h-3 w-24" />
    <SkeletonBase className="h-7 w-16" />
  </div>
);

// ─── Workflow Row Skeleton (matches Dashboard workflow list rows) ──────────────

const SkeletonWorkflowRow: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-hidden="true"
    className={cn(
      'flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900',
      className
    )}
  >
    <div className="space-y-2 flex-1">
      <div className="flex items-center gap-2">
        <SkeletonBase className="h-3.5 w-32" />
        <SkeletonBase className="h-4 w-14 rounded-full" />
      </div>
      <SkeletonBase className="h-3 w-24" />
    </div>
    <SkeletonBase className="h-7 w-7 rounded-md" />
  </div>
);

// ─── Metrics Dashboard Skeleton (full SystemMetrics layout) ──────────────────

const SkeletonMetricsDashboard: React.FC<{ className?: string }> = ({ className }) => (
  <div aria-hidden="true" className={cn('space-y-6', className)}>
    {/* 4-card stat row */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
    {/* 2-panel row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4"
        >
          <SkeletonBase className="h-3.5 w-28" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <SkeletonBase className="h-6 w-10" />
                <SkeletonBase className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Execution Row Skeleton ───────────────────────────────────────────────────

const SkeletonExecutionRow: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-hidden="true"
    className={cn('flex items-center justify-between p-4 border-b border-zinc-800', className)}
  >
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-5 w-16 rounded" />
        <SkeletonBase className="h-3.5 w-20" />
      </div>
      <SkeletonBase className="h-3 w-32" />
    </div>
  </div>
);

// ─── Compound export ─────────────────────────────────────────────────────────

export const Skeleton = Object.assign(SkeletonBase, {
  Text:              SkeletonText,
  Card:              SkeletonCard,
  WorkflowRow:       SkeletonWorkflowRow,
  MetricsDashboard:  SkeletonMetricsDashboard,
  ExecutionRow:      SkeletonExecutionRow,
});
