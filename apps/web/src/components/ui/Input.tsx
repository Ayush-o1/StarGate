import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  hint?:     string;
  error?:    string;
  success?:  boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      hint,
      error,
      success,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      id: providedId,
      ...props
    },
    ref
  ) => {
    // Auto-generate accessible id from label when not provided
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const hintId  = hint  ? `${id}-hint`  : undefined;
    const errorId = error ? `${id}-error` : undefined;

    // Build aria-describedby from hint and/or error ids
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    const sizeStyles = {
      sm: 'h-7 px-3 text-xs rounded-md',
      md: 'h-9 px-3.5 text-sm rounded-lg',
    };

    const iconPadding = {
      left:  leftIcon  ? (inputSize === 'sm' ? 'pl-8'  : 'pl-10') : '',
      right: rightIcon ? (inputSize === 'sm' ? 'pr-8'  : 'pr-10') : '',
    };

    const iconWrapperSize = inputSize === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
    const iconSize        = inputSize === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-zinc-300 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {/* Left icon */}
          {leftIcon && (
            <div
              aria-hidden="true"
              className={cn(
                'absolute left-0 flex items-center justify-center pointer-events-none text-zinc-500',
                iconWrapperSize
              )}
            >
              <span className={iconSize}>{leftIcon}</span>
            </div>
          )}

          <input
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            aria-required={props.required || undefined}
            className={cn(
              'w-full border bg-zinc-950/60 text-zinc-100',
              'transition-all duration-standard ease-snappy',
              'placeholder:text-zinc-600',
              // Focus — using focus-visible from global CSS, plus ring for form fields
              'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500',
              // States
              error
                ? 'border-danger/60 focus:ring-danger/40 focus:border-danger'
                : success
                ? 'border-success/40 focus:ring-success/30 focus:border-success/60'
                : 'border-zinc-800 hover:border-zinc-700',
              'disabled:cursor-not-allowed disabled:opacity-50',
              sizeStyles[inputSize],
              iconPadding.left,
              iconPadding.right,
              className
            )}
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <div
              className={cn(
                'absolute right-0 flex items-center justify-center pointer-events-none',
                error || success ? 'text-zinc-400' : 'text-zinc-500',
                iconWrapperSize
              )}
            >
              <span className={iconSize}>{rightIcon}</span>
            </div>
          )}
        </div>

        {/* Hint text */}
        {hint && !error && (
          <p id={hintId} className="text-xs text-zinc-500">
            {hint}
          </p>
        )}

        {/* Error text */}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
