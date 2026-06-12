import React from 'react';
import { TrendingUp, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { Sparkline } from './ui/Sparkline';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiData {
  totalWorkflows:   number;
  activeWorkflows:  number;
  totalExecutions:  number;
  successRate:      number;
  /** Optional 8-point trend arrays for sparklines */
  executionTrend?:  number[];
  successTrend?:    number[];
}

interface KpiStripProps {
  data:       KpiData;
  loading?:   boolean;
  className?: string;
}

// ─── Individual KPI card ──────────────────────────────────────────────────────

interface KpiCardProps {
  label:        string;
  value:        string | number;
  icon:         React.ElementType;
  iconColor:    string;
  iconBg:       string;
  trend?:       number[];
  trendColor?:  string;
  trendFill?:   string;
  /** Optional delta indicator */
  delta?:       string;
  deltaPositive?: boolean;
  suffix?:      string;
  index:        number;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label, value, icon: Icon, iconColor, iconBg,
  trend, trendColor, trendFill, delta, deltaPositive,
  suffix, index,
}) => (
  <div
    className={cn(
      'relative flex flex-col justify-between',
      'bg-zinc-900 border border-zinc-800 rounded-xl p-5',
      'hover:border-zinc-700 transition-all duration-standard',
      'group overflow-hidden',
      'animate-fade-in-up fill-mode-both',
    )}
    style={{ animationDelay: `${index * 60}ms` }}
  >
    {/* Top row: label + icon */}
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider select-none">
        {label}
      </span>
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center border', iconBg, iconColor)}>
        <Icon className="w-4 h-4" />
      </div>
    </div>

    {/* Value */}
    <div className="flex items-end justify-between gap-2">
      <div>
        <div className="text-2xl font-bold tabular-nums tracking-tight text-zinc-100">
          {value}
          {suffix && (
            <span className="text-sm font-medium text-zinc-500 ml-1">{suffix}</span>
          )}
        </div>
        {delta && (
          <div className={cn(
            'flex items-center gap-1 mt-1 text-xs font-medium',
            deltaPositive ? 'text-success' : 'text-danger',
          )}>
            <span>{delta}</span>
          </div>
        )}
      </div>

      {/* Sparkline */}
      {trend && trend.length >= 2 && (
        <div className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-standard">
          <Sparkline
            data={trend}
            width={72}
            height={32}
            color={trendColor || '#6366f1'}
            fillColor={trendFill || trendColor || '#6366f1'}
          />
        </div>
      )}
    </div>

    {/* Subtle gradient accent */}
    <div
      className="absolute inset-x-0 bottom-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-standard"
      style={{ background: `linear-gradient(90deg, transparent, ${trendColor || '#6366f1'}40, transparent)` }}
    />
  </div>
);

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const KpiCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <div
    className={cn(
      'bg-zinc-900 border border-zinc-800 rounded-xl p-5',
      'animate-fade-in-up fill-mode-both',
    )}
    style={{ animationDelay: `${index * 60}ms` }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="h-3 w-24 bg-zinc-800 rounded animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
      <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
    </div>
    <div className="h-8 w-16 bg-zinc-800 rounded mt-1 animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
  </div>
);

// ─── KpiStrip ─────────────────────────────────────────────────────────────────

export const KpiStrip: React.FC<KpiStripProps> = ({ data, loading, className }) => {
  if (loading) {
    return (
      <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
        {[0, 1, 2, 3].map((i) => <KpiCardSkeleton key={i} index={i} />)}
      </div>
    );
  }

  const successRateColor = data.successRate >= 90
    ? '#22c55e'
    : data.successRate >= 70
    ? '#f59e0b'
    : '#ef4444';

  const cards: Omit<KpiCardProps, 'index'>[] = [
    {
      label:     'Total Workflows',
      value:     data.totalWorkflows,
      icon:      Zap,
      iconColor: 'text-brand-400',
      iconBg:    'bg-brand-500/10 border-brand-500/20',
      trendColor:'#6366f1',
    },
    {
      label:     'Active Workflows',
      value:     data.activeWorkflows,
      icon:      CheckCircle2,
      iconColor: 'text-success',
      iconBg:    'bg-success/10 border-success/20',
      trendColor:'#22c55e',
    },
    {
      label:     'Total Executions',
      value:     data.totalExecutions,
      icon:      TrendingUp,
      iconColor: 'text-info',
      iconBg:    'bg-info/10 border-info/20',
      trend:     data.executionTrend,
      trendColor:'#3b82f6',
      trendFill: '#3b82f6',
    },
    {
      label:     'Success Rate',
      value:     `${data.successRate.toFixed(1)}`,
      suffix:    '%',
      icon:      XCircle,
      iconColor: data.successRate >= 90 ? 'text-success' : data.successRate >= 70 ? 'text-warning' : 'text-danger',
      iconBg:    data.successRate >= 90
        ? 'bg-success/10 border-success/20'
        : data.successRate >= 70
        ? 'bg-warning/10 border-warning/20'
        : 'bg-danger/10 border-danger/20',
      trend:     data.successTrend,
      trendColor: successRateColor,
      trendFill:  successRateColor,
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {cards.map((card, i) => (
        <KpiCard key={card.label} {...card} index={i} />
      ))}
    </div>
  );
};

KpiStrip.displayName = 'KpiStrip';
