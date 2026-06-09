import React, { useState } from 'react';
import { CreateTriggerDTO } from '@stargate/shared';

interface TriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTriggerDTO) => Promise<void>;
}

export const TriggerModal: React.FC<TriggerModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [type, setType] = useState<'MANUAL' | 'WEBHOOK' | 'SCHEDULE'>('MANUAL');
  const [cron, setCron] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ type, cron: type === 'SCHEDULE' ? cron : undefined });
      setType('MANUAL');
      setCron('');
      onClose();
    } catch (err: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Add Trigger</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">Trigger Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="MANUAL">Manual</option>
              <option value="WEBHOOK">Webhook</option>
              <option value="SCHEDULE">Schedule</option>
            </select>
          </div>

          {type === 'SCHEDULE' && (
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-bold mb-2">Cron Expression</label>
              <input
                type="text"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="*/5 * * * *"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
              <p className="text-xs text-gray-400 mt-1">e.g. */5 * * * * (every 5 minutes)</p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-500 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Trigger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
