import { z } from 'zod';

export interface HealthResponse {
  api: 'healthy' | 'unhealthy';
  worker: 'healthy' | 'unhealthy';
  redis: 'healthy' | 'unhealthy';
  database: 'healthy' | 'unhealthy';
}

export const API_VERSION = 'v1';

// Auth Schemas
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().optional(),
});
export type RegisterDTO = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginDTO = z.infer<typeof LoginSchema>;

// Auth Responses
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

// Workspace Schemas
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  description: z.string().optional(),
});
export type CreateWorkspaceDTO = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').optional(),
  description: z.string().optional(),
});
export type UpdateWorkspaceDTO = z.infer<typeof UpdateWorkspaceSchema>;

// Workspace Responses
export interface WorkspaceProfile {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberProfile {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  createdAt: string;
}

export interface WorkspaceWithRole extends WorkspaceProfile {
  role: string;
}

// Workflow Schemas
export const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
});
export type CreateWorkflowDTO = z.infer<typeof CreateWorkflowSchema>;

export const UpdateWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
  isActive: z.boolean().optional(),
  version: z.number().optional(),
});
export type UpdateWorkflowDTO = z.infer<typeof UpdateWorkflowSchema>;

// Node Schemas
export const CreateNodeSchema = z.object({
  type: z.string(),
  label: z.string(),
  positionX: z.number().default(100),
  positionY: z.number().default(100),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type CreateNodeDTO = z.infer<typeof CreateNodeSchema>;

export const UpdateNodeSchema = z.object({
  type: z.string().optional(),
  label: z.string().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateNodeDTO = z.infer<typeof UpdateNodeSchema>;

export const UpdateNodePositionSchema = z.object({
  positionX: z.number(),
  positionY: z.number(),
});
export type UpdateNodePositionDTO = z.infer<typeof UpdateNodePositionSchema>;

// Edge Schemas
export const CreateEdgeSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  condition: z.string().nullable().optional(),
});
export type CreateEdgeDTO = z.infer<typeof CreateEdgeSchema>;

// Interfaces
export interface WorkflowProfile {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  createdById: string;
  status: 'DRAFT' | 'ACTIVE';
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface NodeProfile {
  id: string;
  workflowId: string;
  type: string;
  label: string;
  positionX: number;
  positionY: number;
  config: Record<string, unknown> | null;
  createdAt: string;
}

export interface EdgeProfile {
  id: string;
  workflowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition: string | null;
  createdAt: string;
}

// Execution Enums & Interfaces
export type ExecutionStatus = 'QUEUED' | 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface WorkflowExecutionProfile {
  id: string;
  workflowId: string;
  startedById: string;
  status: ExecutionStatus;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  retryCount: number;
  createdAt: string;
}

export interface NodeExecutionProfile {
  id: string;
  workflowExecutionId: string;
  nodeId: string;
  status: ExecutionStatus;
  input: unknown | null;
  output: unknown | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

// Trigger Enums & Interfaces
export type TriggerType = 'MANUAL' | 'WEBHOOK' | 'SCHEDULE';

export const CreateTriggerSchema = z.object({
  type: z.enum(['MANUAL', 'WEBHOOK', 'SCHEDULE']),
  cron: z.string().optional(),
});
export type CreateTriggerDTO = z.infer<typeof CreateTriggerSchema>;

export interface WorkflowTriggerProfile {
  id: string;
  workflowId: string;
  type: TriggerType;
  webhookPath: string | null;
  cron: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface TriggerExecutionProfile {
  id: string;
  triggerId: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string | null;
}
export * from './queue';
