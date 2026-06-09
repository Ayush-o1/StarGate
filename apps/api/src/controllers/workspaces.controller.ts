import { Request, Response, NextFunction } from 'express';
import { prisma } from '@stargate/database';
import { CreateWorkspaceSchema, UpdateWorkspaceSchema } from '@stargate/shared';

// Extends Request to include user set by requireAuth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

export const createWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const validatedData = CreateWorkspaceSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          createdById: userId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: workspace.id,
          role: 'OWNER',
        },
      });

      return workspace;
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const listWorkspaces = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
      orderBy: {
        workspace: {
          createdAt: 'desc',
        },
      },
    });

    const workspacesWithRole = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));

    res.json(workspacesWithRole);
  } catch (error) {
    next(error);
  }
};

export const getWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: id,
        },
      },
      include: {
        workspace: true,
      },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    res.json({
      ...membership.workspace,
      role: membership.role,
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validatedData = UpdateWorkspaceSchema.parse(req.body);

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: id,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      res.status(403).json({ message: 'Forbidden: Only owners can update the workspace' });
      return;
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: validatedData,
    });

    res.json({
      ...workspace,
      role: membership.role,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: id,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      res.status(403).json({ message: 'Forbidden: Only owners can delete the workspace' });
      return;
    }

    await prisma.workspace.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
