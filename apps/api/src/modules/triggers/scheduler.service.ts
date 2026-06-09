import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '@stargate/database';
import { executeWorkflow } from '../executions/executions.service';

class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();

  async loadSchedules() {
    console.log('Loading schedule triggers...');
    
    // Cleanup existing memory tasks
    for (const task of Array.from(this.tasks.values())) {
      task.stop();
    }
    this.tasks.clear();

    const triggers = await prisma.workflowTrigger.findMany({
      where: { type: 'SCHEDULE', enabled: true },
      include: { workflow: true },
    });

    for (const trigger of triggers) {
      if (trigger.workflow.isActive && trigger.cron) {
        this.scheduleTrigger(trigger.id, trigger.workflowId, trigger.cron);
      }
    }
    console.log(`Loaded ${this.tasks.size} schedules.`);
  }

  scheduleTrigger(triggerId: string, workflowId: string, cronExpression: string) {
    if (!cron.validate(cronExpression)) {
      console.error(`Invalid cron expression for trigger ${triggerId}: ${cronExpression}`);
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Executing scheduled trigger ${triggerId} for workflow ${workflowId}`);
        const triggerExecution = await prisma.triggerExecution.create({
          data: {
            triggerId,
            status: 'RUNNING',
          },
        });
        await executeWorkflow(workflowId, triggerExecution.id);
      } catch (error) {
        console.error(`Failed to execute schedule trigger ${triggerId}:`, error);
      }
    });

    this.tasks.set(triggerId, task);
  }

  unscheduleTrigger(triggerId: string) {
    const task = this.tasks.get(triggerId);
    if (task) {
      task.stop();
      this.tasks.delete(triggerId);
    }
  }

  // To dynamically add a trigger when it's created or enabled
  async addOrUpdateSchedule(triggerId: string) {
    this.unscheduleTrigger(triggerId);
    const trigger = await prisma.workflowTrigger.findUnique({
      where: { id: triggerId },
      include: { workflow: true },
    });

    if (trigger && trigger.type === 'SCHEDULE' && trigger.enabled && trigger.workflow.isActive && trigger.cron) {
      this.scheduleTrigger(trigger.id, trigger.workflowId, trigger.cron);
    }
  }
}

export const schedulerService = new SchedulerService();
