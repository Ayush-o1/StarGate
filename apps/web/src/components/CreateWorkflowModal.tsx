import React, { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Alert } from './ui/Alert';

interface CreateWorkflowModalProps {
  workspaceId: string;
  onClose:     () => void;
}

export const CreateWorkflowModal: React.FC<CreateWorkflowModalProps> = ({ workspaceId, onClose }) => {
  const { createWorkflow } = useWorkflowStore();
  const navigate = useNavigate();
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [error,       setError]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError('Workflow name is required');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const workflow = await createWorkflow(workspaceId, name, description);
      onClose();
      navigate(`/workflows/${workflow.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
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
        leftIcon={<GitBranch />}
      >
        Create Workflow
      </Button>
    </>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Create New Workflow"
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
          label="Workflow Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Support Ticket Automation"
          required
          autoFocus
        />

        <Textarea
          label="Description"
          hint="Optional — describe what this workflow does."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this workflow do?"
          rows={3}
        />
      </form>
    </Modal>
  );
};
