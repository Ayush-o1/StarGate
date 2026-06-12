import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'brand' | 'running';
type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Shows an animated pulsing dot instead of a solid background */
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-subtle text-success border border-success-border',
  danger:  'bg-danger-subtle  text-danger  border border-danger-border',
  warning: 'bg-warning-subtle text-warning border border-warning-border',
  info:    'bg-info-subtle    text-info    border border-info-border',
  neutral: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  brand:   'bg-brand-500/15 text-brand-400 border border-brand-500/20',
  running: 'bg-info-subtle  text-info    border border-info-border',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider leading-none',
  md: 'text-xs px-2 py-0.5 rounded-md font-medium',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-success',
  danger:  'bg-danger',
  warning: 'bg-warning',
  info:    'bg-info',
  neutral: 'bg-zinc-400',
  brand:   'bg-brand-500',
  running: 'bg-info animate-pulse-dot',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className,
  children,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            'inline-block w-1.5 h-1.5 rounded-full shrink-0',
            dotStyles[variant]
          )}
        />
      )}
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
