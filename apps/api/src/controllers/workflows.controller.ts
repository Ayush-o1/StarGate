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

export const getWorkflowGraph = async (
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

    res.json({
      nodes: workflow.nodes,
      edges: workflow.edges,
    });
  } catch (error) {
    next(error);
  }
};

export const exportWorkflow = async (
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
        triggers: true,
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

export const importWorkflow = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { workspaceId } = req.params;
    const exportData = req.body;

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    if (!exportData || !exportData.name) {
      res.status(400).json({ message: 'Invalid workflow export data' });
      return;
    }

    // Recreate workflow
    const newWorkflow = await prisma.$transaction(async (tx) => {
      const createdWorkflow = await tx.workflow.create({
        data: {
          name: `${exportData.name} (Imported)`,
          description: exportData.description,
          workspaceId,
          createdById: userId,
          isActive: false, // Imported workflows start inactive
        },
      });

      // Map old node IDs to new node IDs
      const nodeIdMap = new Map<string, string>();

      // Create Nodes
      if (exportData.nodes && Array.isArray(exportData.nodes)) {
        for (const node of exportData.nodes) {
          const createdNode = await tx.node.create({
            data: {
              workflowId: createdWorkflow.id,
              type: node.type,
              label: node.label,
              config: node.config || {},
              positionX: node.positionX,
              positionY: node.positionY,
            },
          });
          nodeIdMap.set(node.id, createdNode.id);
        }
      }

      // Create Edges
      if (exportData.edges && Array.isArray(exportData.edges)) {
        for (const edge of exportData.edges) {
          const newSourceId = nodeIdMap.get(edge.sourceNodeId);
          const newTargetId = nodeIdMap.get(edge.targetNodeId);
          
          if (newSourceId && newTargetId) {
            await tx.edge.create({
              data: {
                workflowId: createdWorkflow.id,
                sourceNodeId: newSourceId,
                targetNodeId: newTargetId,
                condition: edge.condition,
              },
            });
          }
        }
      }

      // Create Triggers
      if (exportData.triggers && Array.isArray(exportData.triggers)) {
        for (const trigger of exportData.triggers) {
          await tx.workflowTrigger.create({
            data: {
              workflowId: createdWorkflow.id,
              type: trigger.type,
              webhookPath: trigger.webhookPath,
              cron: trigger.cron,
              enabled: trigger.enabled ?? true,
            },
          });
        }
      }

      return createdWorkflow;
    });

    res.status(201).json(newWorkflow);
  } catch (error) {
    next(error);
  }
};
