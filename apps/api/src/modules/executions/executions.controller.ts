import { Response, NextFunction } from 'express';
import { prisma } from '@stargate/database';
import { AuthenticatedRequest } from '../../middleware/auth';
import { runWorkflowNodes } from './executions.service';

export const runWorkflow = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const workflowId = req.params.id;

    // Verify workflow exists and get workspace ID
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        nodes: {
          orderBy: { createdAt: 'asc' }
        },
        edges: true
      }
    });

    if (!workflow) {
      res.status(404).json({ message: 'Workflow not found' });
      return;
    }

    // Verify workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        startedById: userId,
        status: 'RUNNING',
      },
    });

    res.status(202).json({
      message: 'Workflow execution started',
      executionId: execution.id,
    });

    // Run execution asynchronously
    runWorkflowNodes(execution.id, workflow.nodes, workflow.edges).catch((err) => {
      console.error('Error in workflow execution background task:', err);
    });

  } catch (error) {
    next(error);
  }
};

export const listExecutions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const workflowId = req.params.id;

    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      res.status(404).json({ message: 'Workflow not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(executions);
  } catch (error) {
    next(error);
  }
};

export const getExecution = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const executionId = req.params.id;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
      }
    });

    if (!execution) {
      res.status(404).json({ message: 'Execution not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: execution.workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    res.json(execution);
  } catch (error) {
    next(error);
  }
};

export const getNodeExecutions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const executionId = req.params.id;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
      }
    });

    if (!execution) {
      res.status(404).json({ message: 'Execution not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: execution.workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const nodeExecutions = await prisma.nodeExecution.findMany({
      where: { workflowExecutionId: executionId },
      include: { node: true },
      orderBy: { startedAt: 'asc' },
    });

    res.json(nodeExecutions);
  } catch (error) {
    next(error);
  }
};
