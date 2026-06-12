import React, { forwardRef, useId, useRef } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:      string;
  hint?:       string;
  error?:      string;
  fontMono?:   boolean;
  autoResize?: boolean;
  maxRows?:    number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      hint,
      error,
      fontMono = false,
      autoResize = false,
      maxRows = 12,
      id: providedId,
      rows = 3,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id     = providedId ?? generatedId;
    const hintId  = hint  ? `${id}-hint`  : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    // Internal ref for auto-resize logic
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize && innerRef.current) {
        const el = innerRef.current;
        el.style.height = 'auto';
        const lineHeight = parseInt(getComputedStyle(el).lineHeight, 10) || 20;
        const maxHeight  = lineHeight * maxRows + 16; // 16px padding compensation
        el.style.height  = Math.min(el.scrollHeight, maxHeight) + 'px';
      }
      onChange?.(e);
    };

    // Merge refs
    const setRef = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

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

        <textarea
          ref={setRef}
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-required={props.required || undefined}
          onChange={handleChange}
          className={cn(
            'w-full border bg-zinc-950/60 text-zinc-100 text-sm rounded-lg px-3.5 py-2.5',
            'transition-all duration-standard ease-snappy',
            'placeholder:text-zinc-600 resize-y',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500',
            error
              ? 'border-danger/60 focus:ring-danger/40 focus:border-danger'
              : 'border-zinc-800 hover:border-zinc-700',
            'disabled:cursor-not-allowed disabled:opacity-50',
            fontMono && 'font-mono text-[13px]',
            autoResize && 'resize-none overflow-hidden',
            className
          )}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
