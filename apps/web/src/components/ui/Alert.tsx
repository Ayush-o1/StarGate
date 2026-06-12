import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  /** Called when the dismiss (X) button is clicked. If omitted, no X button is shown. */
  onDismiss?: () => void;
  className?: string;
  children: React.ReactNode;
}

const variantConfig: Record<
  AlertVariant,
  { icon: React.ElementType; containerClass: string; iconClass: string; titleClass: string; textClass: string }
> = {
  error: {
    icon: AlertCircle,
    containerClass: 'bg-danger-subtle border border-danger-border',
    iconClass:  'text-danger',
    titleClass: 'text-danger',
    textClass:  'text-danger/80',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-warning-subtle border border-warning-border',
    iconClass:  'text-warning',
    titleClass: 'text-warning',
    textClass:  'text-warning/80',
  },
  info: {
    icon: Info,
    containerClass: 'bg-info-subtle border border-info-border',
    iconClass:  'text-info',
    titleClass: 'text-info',
    textClass:  'text-info/80',
  },
  success: {
    icon: CheckCircle2,
    containerClass: 'bg-success-subtle border border-success-border',
    iconClass:  'text-success',
    titleClass: 'text-success',
    textClass:  'text-success/80',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'error',
  title,
  onDismiss,
  className,
  children,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  // role="alert" for error/warning (announces immediately to screen readers)
  // role="status" for info/success (polite announcement)
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-3 rounded-lg px-4 py-3 text-sm animate-fade-in',
        config.containerClass,
        className
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', config.iconClass)} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn('font-semibold mb-0.5', config.titleClass)}>
            {title}
          </p>
        )}
        <div className={config.textClass}>{children}</div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            'shrink-0 p-0.5 rounded transition-colors duration-standard',
            'text-zinc-500 hover:text-zinc-300'
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

Alert.displayName = 'Alert';
