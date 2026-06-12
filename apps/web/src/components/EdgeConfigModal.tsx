import React, { useState, useEffect } from 'react';
import { GitBranch, Save } from 'lucide-react';
import { Edge } from 'reactflow';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { Alert } from './ui/Alert';

interface EdgeConfigModalProps {
  edge:    Edge | null;
  isOpen:  boolean;
  onClose: () => void;
  onSave:  (edgeId: string, condition: string) => Promise<void>;
}

export const EdgeConfigModal: React.FC<EdgeConfigModalProps> = ({
  edge, isOpen, onClose, onSave,
}) => {
  const [condition, setCondition] = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (isOpen && edge) {
      setCondition(edge.label ? String(edge.label) : '');
      setError(null);
    }
  }, [isOpen, edge]);

  if (!isOpen || !edge) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave(edge.id, condition);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save condition');
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
      <Button variant="primary" isLoading={saving} onClick={handleSubmit} leftIcon={<Save />}>
        Save Condition
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-violet-400" />
          Edge Condition
        </div>
      }
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <Alert variant="error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Textarea
          label="Condition Expression"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="response.status === 200"
          rows={3}
          hint="Leave empty for unconditional routing. Use JavaScript expressions like: previousNode.result === true"
          className="font-mono text-sm"
        />
      </form>
    </Modal>
  );
};
