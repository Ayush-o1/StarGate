import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 px-4 py-2.5",
          "rounded-lg font-medium text-sm transition-all duration-200",
          "bg-gradient-to-r from-indigo-500 to-violet-600 text-white",
          "shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)]",
          "hover:brightness-110 active:scale-[0.98]",
          "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950",
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        <span className={cn(isLoading && "opacity-90")}>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
