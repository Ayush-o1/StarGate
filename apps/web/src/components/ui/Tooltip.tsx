/**
 * Tooltip — CSS-only, zero-dependency tooltip component.
 *
 * Wraps any child element and shows a tooltip on hover/focus.
 * Uses the `group` pattern with Tailwind CSS only — no JS positioning,
 * no Popper.js, no Radix (keeping bundle lean).
 *
 * Usage:
 *   <Tooltip content="Run workflow manually">
 *     <Button>Run</Button>
 *   </Tooltip>
 *
 * Supports:
 *   - side: 'top' (default) | 'bottom' | 'left' | 'right'
 *   - Keyboard-accessible (shown on focus-visible)
 *   - Respects prefers-reduced-motion via CSS
 */
import React from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  content:    React.ReactNode;
  children:   React.ReactElement;
  side?:      'top' | 'bottom' | 'left' | 'right';
  className?: string;
  /** Maximum width of the tooltip bubble. Defaults to 'max-w-[200px]' */
  maxWidth?:  string;
}

const sideConfig = {
  top: {
    container: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow:     'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-zinc-700',
  },
  bottom: {
    container: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow:     'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-zinc-700',
  },
  left: {
    container: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow:     'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-zinc-700',
  },
  right: {
    container: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow:     'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-zinc-700',
  },
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side    = 'top',
  className,
  maxWidth = 'max-w-[200px]',
}) => {
  const { container, arrow } = sideConfig[side];

  return (
    <span className="relative inline-flex group/tooltip">
      {/* Trigger — clone child to add aria-describedby would require id, keeping simple */}
      {children}

      {/* Tooltip bubble */}
      <span
        role="tooltip"
        className={cn(
          // Position
          'absolute z-[9000] pointer-events-none',
          container,
          // Shape + color
          'bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5',
          'shadow-overlay',
          // Text
          'text-xs text-zinc-200 text-center leading-snug whitespace-normal',
          maxWidth,
          // Visibility — hidden by default, shown on group hover/focus
          'opacity-0 scale-95 translate-y-0',
          'group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100',
          'group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100',
          // Transition
          'transition-all duration-fast ease-spring',
          className
        )}
      >
        {content}
        {/* Arrow */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute w-0 h-0 border-4',
            arrow
          )}
        />
      </span>
    </span>
  );
};

Tooltip.displayName = 'Tooltip';
