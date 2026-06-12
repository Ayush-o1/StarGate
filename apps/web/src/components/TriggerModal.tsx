import React, { useState } from 'react';
import { CreateTriggerDTO } from '@stargate/shared';
import { Zap, Webhook, Clock } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Alert } from './ui/Alert';
import { cn } from '../lib/utils';

interface TriggerModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSubmit: (data: CreateTriggerDTO) => Promise<void>;
}

type TriggerType = 'MANUAL' | 'WEBHOOK' | 'SCHEDULE';

const triggerOptions: Array<{
  value:       TriggerType;
  label:       string;
  description: string;
  icon:        React.ElementType;
}> = [
  {
    value:       'MANUAL',
    label:       'Manual',
    description: 'Trigger runs on demand via the Run button or API',
    icon:        Zap,
  },
  {
    value:       'WEBHOOK',
    label:       'Webhook',
    description: 'Trigger fires when an HTTP request hits the webhook URL',
    icon:        Webhook,
  },
  {
    value:       'SCHEDULE',
    label:       'Schedule',
    description: 'Trigger fires automatically on a cron schedule',
    icon:        Clock,
  },
];

export const TriggerModal: React.FC<TriggerModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [type, setType]       = useState<TriggerType>('MANUAL');
  const [cron, setCron]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleClose = () => {
    if (loading) return;
    setType('MANUAL');
    setCron('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ type, cron: type === 'SCHEDULE' ? cron : undefined });
      setType('MANUAL');
      setCron('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={handleClose} disabled={loading}>
        Cancel
      </Button>
      <Button
        variant="primary"
        isLoading={loading}
        onClick={handleSubmit}
      >
        Add Trigger
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Trigger"
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <Alert variant="error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Trigger type — card-based selector instead of raw <select> */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-300">Trigger Type</p>
          <div className="space-y-2">
            {triggerOptions.map(({ value, label, description, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                aria-pressed={type === value}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-lg border text-left',
                  'transition-all duration-standard ease-spring',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900',
                  type === value
                    ? 'bg-brand-500/10 border-brand-500/40 text-zinc-100'
                    : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
                )}
              >
                <div
                  className={cn(
                    'shrink-0 w-8 h-8 rounded-md flex items-center justify-center mt-0.5',
                    type === value ? 'bg-brand-500/20 text-brand-400' : 'bg-zinc-800 text-zinc-500'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className={cn('text-sm font-medium', type === value && 'text-brand-400')}>
                    {label}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</div>
                </div>
                {/* Selected indicator */}
                {type === value && (
                  <div className="ml-auto shrink-0 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cron expression input — only shown for SCHEDULE type */}
        {type === 'SCHEDULE' && (
          <div className="animate-fade-in">
            <Input
              label="Cron Expression"
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="*/5 * * * *"
              hint="Standard 5-field cron. Example: */5 * * * * runs every 5 minutes."
              required
              className="font-mono"
            />
          </div>
        )}
      </form>
    </Modal>
  );
};
