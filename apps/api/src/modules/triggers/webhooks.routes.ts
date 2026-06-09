import { Router, Request, Response } from 'express';
import { prisma } from '@stargate/database';
import { executeWorkflow } from '../executions/executions.service';

export const webhooksRouter: Router = Router();

webhooksRouter.post('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const trigger = await prisma.workflowTrigger.findFirst({
      where: { webhookPath: token, type: 'WEBHOOK' },
      include: { workflow: true },
    });

    if (!trigger) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    if (!trigger.enabled) {
      res.status(400).json({ error: 'Trigger disabled' });
      return;
    }

    if (!trigger.workflow.isActive) {
      res.status(400).json({ error: 'Workflow inactive' });
      return;
    }

    // Create TriggerExecution
    const triggerExecution = await prisma.triggerExecution.create({
      data: {
        triggerId: trigger.id,
        status: 'RUNNING',
      },
    });

    try {
      await executeWorkflow(trigger.workflowId, triggerExecution.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'Workflow inactive') {
        res.status(400).json({ error: 'Workflow inactive' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
