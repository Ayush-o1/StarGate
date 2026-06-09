import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Edge } from 'reactflow';

interface EdgeConfigModalProps {
  edge: Edge | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (edgeId: string, condition: string) => Promise<void>;
}

export const EdgeConfigModal: React.FC<EdgeConfigModalProps> = ({
  edge,
  isOpen,
  onClose,
  onSave,
}) => {
  const [condition, setCondition] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && edge) {
      setCondition(edge.label ? String(edge.label) : '');
      setError(null);
    }
  }, [isOpen, edge]);

  if (!isOpen || !edge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await onSave(edge.id, condition);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save condition');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">Configure Edge Condition</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Condition
              </label>
              <textarea
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="response.status === 200"
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-white font-mono text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-2">
                Leave empty for unconditional routing. You can use JavaScript expressions like `previousNode.result === true`.
              </p>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Condition
          </button>
        </div>
      </div>
    </div>
  );
};
