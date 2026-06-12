import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Alert } from './ui/Alert';

interface CreateWorkspaceModalProps {
  onClose: () => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ onClose }) => {
  const { createWorkspace } = useWorkspaceStore();
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [error,       setError]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await createWorkspace(name, description);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        variant="primary"
        isLoading={isSubmitting}
        onClick={handleSubmit}
        leftIcon={<Building2 />}
      >
        Create Workspace
      </Button>
    </>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Create New Workspace"
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <Alert variant="error" onDismiss={() => setError('')}>
            {error}
          </Alert>
        )}

        <Input
          label="Workspace Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Engineering Team"
          required
          autoFocus
        />

        <Textarea
          label="Description"
          hint="Optional — describe what this workspace is for."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this workspace for?"
          rows={3}
        />
      </form>
    </Modal>
  );
};
