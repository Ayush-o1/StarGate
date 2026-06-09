import { Response, NextFunction } from 'express';
import { prisma } from '@stargate/database';
import { CreateWorkflowSchema, UpdateWorkflowSchema } from '@stargate/shared';
import { AuthenticatedRequest } from '../middleware/auth';

export const createWorkflow = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { workspaceId } = req.params;
    const validatedData = CreateWorkflowSchema.parse(req.body);

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const workflow = await prisma.workflow.create({
      data: {
        ...validatedData,
        workspaceId,
        createdById: userId,
      },
    });

    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
};

export const listWorkflows = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { workspaceId } = req.params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const workflows = await prisma.workflow.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(workflows);
  } catch (error) {
    next(error);
  }
};

export const getWorkflow = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        nodes: true,
        edges: true,
      },
    });

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

    res.json(workflow);
  } catch (error) {
    next(error);
  }
};

export const updateWorkflow = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validatedData = UpdateWorkflowSchema.parse(req.body);

    const workflow = await prisma.workflow.findUnique({ where: { id } });
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

    const updatedWorkflow = await prisma.workflow.update({
      where: { id },
      data: validatedData,
    });

    res.json(updatedWorkflow);
  } catch (error) {
    next(error);
  }
};

export const deleteWorkflow = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      res.status(404).json({ message: 'Workflow not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: workflow.workspaceId } },
    });

    if (!membership || membership.role !== 'OWNER') {
      res.status(403).json({ message: 'Forbidden: Only owners can delete workflows' });
      return;
    }

    await prisma.workflow.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
