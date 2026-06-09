import { prisma } from '@stargate/database';
import { CreateTriggerDTO } from '@stargate/shared';
import crypto from 'crypto';
import { schedulerService } from './scheduler.service';

export const createTrigger = async (workflowId: string, data: CreateTriggerDTO) => {
  let webhookPath = null;
  
  if (data.type === 'WEBHOOK') {
    webhookPath = crypto.randomBytes(4).toString('hex');
  }

  const trigger = await prisma.workflowTrigger.create({
    data: {
      workflowId,
      type: data.type,
      webhookPath,
      cron: data.cron,
    },
  });

  if (trigger.type === 'SCHEDULE') {
    schedulerService.addOrUpdateSchedule(trigger.id);
  }

  return trigger;
};

export const getTriggers = async (workflowId: string) => {
  return await prisma.workflowTrigger.findMany({
    where: { workflowId },
    orderBy: { createdAt: 'desc' },
  });
};

export const deleteTrigger = async (id: string) => {
  await prisma.workflowTrigger.delete({
    where: { id },
  });
  schedulerService.unscheduleTrigger(id);
};

export const toggleTrigger = async (id: string, enabled: boolean) => {
  const trigger = await prisma.workflowTrigger.update({
    where: { id },
    data: { enabled },
  });
  
  if (trigger.type === 'SCHEDULE') {
    schedulerService.addOrUpdateSchedule(trigger.id);
  }
  
  return trigger;
};

export const getTriggerByWebhookPath = async (webhookPath: string) => {
  return await prisma.workflowTrigger.findFirst({
    where: { webhookPath },
    include: { workflow: true },
  });
};
