import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize    = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  isLoading?: boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
}

// ─── Variant styles ──────────────────────────────────────────────────────────
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-gradient-to-r from-brand-500 to-violet-600 text-white',
    'shadow-brand-sm hover:shadow-brand-md hover:brightness-110',
    'border border-transparent',
  ].join(' '),

  secondary: [
    'bg-zinc-800 text-zinc-100 border border-zinc-700',
    'hover:bg-zinc-700 hover:border-zinc-600',
    'shadow-surface',
  ].join(' '),

  ghost: [
    'bg-transparent text-zinc-400 border border-transparent',
    'hover:bg-zinc-800 hover:text-zinc-100',
  ].join(' '),

  danger: [
    'bg-danger-subtle text-danger border border-danger-border',
    'hover:bg-danger/10 hover:border-danger/40',
    'hover:shadow-danger-glow',
  ].join(' '),

  outline: [
    'bg-transparent text-zinc-100 border border-zinc-700',
    'hover:bg-zinc-800 hover:border-zinc-500',
  ].join(' '),
};

// ─── Size styles ─────────────────────────────────────────────────────────────
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7  px-2.5 text-xs  rounded-md  gap-1.5',
  md: 'h-9  px-4   text-sm  rounded-lg  gap-2',
  lg: 'h-11 px-5   text-base rounded-lg gap-2',
};

// ─── Icon size per button size ───────────────────────────────────────────────
const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant    = 'primary',
      size       = 'md',
      isLoading  = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = isLoading || disabled;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || undefined}
        className={cn(
          // Base
          'relative inline-flex items-center justify-center font-medium',
          'transition-all duration-standard ease-spring',
          'select-none whitespace-nowrap',
          // Focus
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-brand-500/70 focus-visible:ring-offset-2',
          'focus-visible:ring-offset-zinc-950',
          // Press
          'active:scale-[0.98]',
          // Disabled
          'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
          // Variant + size
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {/* Loading spinner replaces leftIcon */}
        {isLoading ? (
          <Loader2
            className={cn(iconSizeStyles[size], 'animate-spin shrink-0')}
            aria-hidden="true"
          />
        ) : leftIcon ? (
          <span className={cn(iconSizeStyles[size], 'shrink-0 [&>svg]:w-full [&>svg]:h-full')} aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}

        {/* Text — hidden visually during loading but preserved for width stability */}
        {children && (
          <span className={cn(isLoading && 'opacity-0 w-0 overflow-hidden')} aria-hidden={isLoading || undefined}>
            {children}
          </span>
        )}

        {/* Right icon — hidden during loading */}
        {!isLoading && rightIcon && (
          <span className={cn(iconSizeStyles[size], 'shrink-0 [&>svg]:w-full [&>svg]:h-full')} aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
