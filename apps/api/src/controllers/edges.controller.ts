import { Response, NextFunction } from 'express';
import { prisma } from '@stargate/database';
import { CreateEdgeSchema } from '@stargate/shared';
import { AuthenticatedRequest } from '../middleware/auth';

export const createEdge = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { workflowId } = req.params;
    const validatedData = CreateEdgeSchema.parse(req.body);

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { nodes: true },
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

    // Validate nodes belong to the workflow
    const nodeIds = new Set(workflow.nodes.map((n) => n.id));
    if (!nodeIds.has(validatedData.sourceNodeId) || !nodeIds.has(validatedData.targetNodeId)) {
      res.status(400).json({ message: 'Source and target nodes must belong to the same workflow' });
      return;
    }

    const edge = await prisma.edge.create({
      data: {
        ...validatedData,
        workflowId,
      },
    });

    res.status(201).json(edge);
  } catch (error) {
    next(error);
  }
};

export const listEdges = async (
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

    const edges = await prisma.edge.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(edges);
  } catch (error) {
    next(error);
  }
};

export const deleteEdge = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const edge = await prisma.edge.findUnique({
      where: { id },
      include: { workflow: true },
    });
    if (!edge) {
      res.status(404).json({ message: 'Edge not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: edge.workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await prisma.edge.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateEdge = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { condition } = req.body;

    const edge = await prisma.edge.findUnique({
      where: { id },
      include: { workflow: true },
    });
    if (!edge) {
      res.status(404).json({ message: 'Edge not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: edge.workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const updated = await prisma.edge.update({
      where: { id },
      data: { condition },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
