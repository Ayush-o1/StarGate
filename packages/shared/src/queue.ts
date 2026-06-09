export interface ExecuteWorkflowPayload {
  workflowId: string;
  executionId: string;
  triggerExecutionId?: string;
}
