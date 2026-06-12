import React from 'react';
import { cn } from '../lib/utils';

// ─── CanvasStatusBar ──────────────────────────────────────────────────────────
// Floating bottom-left overlay on the ReactFlow canvas showing:
//   • Node count
//   • Edge count
//   • "Saved" indicator

interface CanvasStatusBarProps {
  nodeCount: number;
  edgeCount: number;
  className?: string;
}

export const CanvasStatusBar: React.FC<CanvasStatusBarProps> = ({
  nodeCount,
  edgeCount,
  className,
}) => (
  <div
    className={cn(
      'absolute bottom-4 left-4 z-10 pointer-events-none',
      'flex items-center gap-2',
      'bg-zinc-900/80 backdrop-blur-sm',
      'border border-zinc-800 rounded-lg',
      'px-3 py-1.5',
      'animate-fade-in',
      className,
    )}
    aria-live="polite"
    aria-label={`Canvas: ${nodeCount} nodes, ${edgeCount} edges`}
  >
    <span className="text-[11px] text-zinc-500 tabular-nums select-none">
      <span className="text-zinc-300 font-medium">{nodeCount}</span>
      {' '}node{nodeCount !== 1 ? 's' : ''}
    </span>
    <span className="text-zinc-700" aria-hidden="true">·</span>
    <span className="text-[11px] text-zinc-500 tabular-nums select-none">
      <span className="text-zinc-300 font-medium">{edgeCount}</span>
      {' '}edge{edgeCount !== 1 ? 's' : ''}
    </span>
  </div>
);

CanvasStatusBar.displayName = 'CanvasStatusBar';
