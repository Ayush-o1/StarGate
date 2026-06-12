import React from 'react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon:         React.ElementType;
  title:        string;
  description:  string;
  action?: {
    label:   string;
    onClick: () => void;
  };
  className?: string;
  /** Use 'dashed' for inline empty state (within a list section), 'plain' for standalone */
  variant?: 'dashed' | 'plain';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'dashed',
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        variant === 'dashed' && [
          'rounded-xl border border-dashed border-zinc-800',
          'bg-zinc-900/30',
        ],
        className
      )}
    >
      {/* Icon container — first to appear */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20',
          'flex items-center justify-center mb-4',
          'animate-fade-in-up fill-mode-both',
        )}
        style={{ animationDelay: '0ms', animationDuration: '350ms' }}
      >
        <Icon className="w-5 h-5 text-brand-400" />
      </div>

      {/* Title — second */}
      <h3
        className={cn(
          'text-sm font-semibold text-zinc-200 mb-1.5',
          'animate-fade-in-up fill-mode-both',
        )}
        style={{ animationDelay: '60ms', animationDuration: '350ms' }}
      >
        {title}
      </h3>

      {/* Description — third */}
      <p
        className={cn(
          'text-sm text-zinc-500 max-w-xs leading-relaxed mb-5',
          'animate-fade-in-up fill-mode-both',
        )}
        style={{ animationDelay: '120ms', animationDuration: '350ms' }}
      >
        {description}
      </p>

      {/* CTA — last */}
      {action && (
        <div
          className="animate-fade-in-up fill-mode-both"
          style={{ animationDelay: '180ms', animationDuration: '350ms' }}
        >
          <Button
            variant="primary"
            size="sm"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
