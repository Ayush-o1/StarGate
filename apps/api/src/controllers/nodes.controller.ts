import { Request, Response, NextFunction } from 'express';
import { prisma } from '@stargate/database';
import { CreateNodeSchema, UpdateNodeSchema, UpdateNodePositionSchema } from '@stargate/shared';
import { AuthenticatedRequest } from '../middleware/auth';

export const createNode = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { workflowId } = req.params;
    const validatedData = CreateNodeSchema.parse(req.body);

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

    const node = await prisma.node.create({
      data: {
        ...validatedData,
        workflowId,
      },
    });

    res.status(201).json(node);
  } catch (error) {
    next(error);
  }
};

export const listNodes = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { workflowId } = req.params;

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

    const nodes = await prisma.node.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(nodes);
  } catch (error) {
    next(error);
  }
};

export const updateNode = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validatedData = UpdateNodeSchema.parse(req.body);

    const node = await prisma.node.findUnique({
      where: { id },
      include: { workflow: true },
    });
    if (!node) {
      res.status(404).json({ message: 'Node not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: node.workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const updatedNode = await prisma.node.update({
      where: { id },
      data: validatedData,
    });

    res.json(updatedNode);
  } catch (error) {
    next(error);
  }
};

export const deleteNode = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const node = await prisma.node.findUnique({
      where: { id },
      include: { workflow: true },
    });
    if (!node) {
      res.status(404).json({ message: 'Node not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: node.workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await prisma.node.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateNodePosition = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validatedData = UpdateNodePositionSchema.parse(req.body);

    const node = await prisma.node.findUnique({
      where: { id },
      include: { workflow: true },
    });
    if (!node) {
      res.status(404).json({ message: 'Node not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: node.workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const updatedNode = await prisma.node.update({
      where: { id },
      data: {
        positionX: validatedData.positionX,
        positionY: validatedData.positionY,
      },
    });

    res.json(updatedNode);
  } catch (error) {
    next(error);
  }
};
