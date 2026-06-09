import { Response, NextFunction } from 'express';
import { prisma } from '@stargate/database';
import { CreateTriggerSchema } from '@stargate/shared';
import { AuthenticatedRequest } from '../../middleware/auth';
import * as triggersService from './triggers.service';

export const createTrigger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { workflowId } = req.params;
    const validatedData = CreateTriggerSchema.parse(req.body);

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

    const trigger = await triggersService.createTrigger(workflowId, validatedData);
    res.status(201).json(trigger);
  } catch (error) {
    next(error);
  }
};

export const listTriggers = async (
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

    const triggers = await triggersService.getTriggers(workflowId);
    res.json(triggers);
  } catch (error) {
    next(error);
  }
};

export const deleteTrigger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const trigger = await prisma.workflowTrigger.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!trigger) {
      res.status(404).json({ message: 'Trigger not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: trigger.workflow.workspaceId } },
    });

    if (!membership || membership.role !== 'OWNER') {
      res.status(403).json({ message: 'Forbidden: Only owners can delete triggers' });
      return;
    }

    await triggersService.deleteTrigger(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const enableTrigger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const trigger = await prisma.workflowTrigger.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!trigger) {
      res.status(404).json({ message: 'Trigger not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: trigger.workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const updated = await triggersService.toggleTrigger(id, true);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const disableTrigger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const trigger = await prisma.workflowTrigger.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!trigger) {
      res.status(404).json({ message: 'Trigger not found' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: trigger.workflow.workspaceId } },
    });

    if (!membership) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const updated = await triggersService.toggleTrigger(id, false);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
