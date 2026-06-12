import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value:    string;
  label:    string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:       string;
  hint?:        string;
  error?:       string;
  options?:     SelectOption[];
  placeholder?: string;
  selectSize?: 'sm' | 'md';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      hint,
      error,
      options,
      placeholder,
      selectSize = 'md',
      id: providedId,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id      = providedId ?? generatedId;
    const hintId  = hint  ? `${id}-hint`  : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    const sizeStyles = {
      sm: 'h-7 pl-3 pr-7 text-xs rounded-md',
      md: 'h-9 pl-3.5 pr-9 text-sm rounded-lg',
    };

    const chevronSize = selectSize === 'sm' ? 'w-3 h-3 right-2' : 'w-4 h-4 right-2.5';

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

        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={cn(
              'w-full appearance-none border bg-zinc-950/60 text-zinc-100',
              'transition-all duration-standard ease-snappy',
              'cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500',
              error
                ? 'border-danger/60 focus:ring-danger/40 focus:border-danger'
                : 'border-zinc-800 hover:border-zinc-700',
              'disabled:cursor-not-allowed disabled:opacity-50',
              sizeStyles[selectSize],
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Custom chevron — replaces browser default arrow */}
          <div
            aria-hidden="true"
            className={cn(
              'absolute top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500',
              chevronSize
            )}
          >
            <ChevronDown className="w-full h-full" />
          </div>
        </div>

        {hint && !error && (
          <p id={hintId} className="text-xs text-zinc-500">
            {hint}
          </p>
        )}

        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
