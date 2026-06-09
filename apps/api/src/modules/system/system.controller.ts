import { Request, Response, NextFunction } from 'express';
import { prisma } from '@stargate/database';
import { executionQueue, redisConnection } from '../../lib/queue';

export const getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let database = 'unhealthy';
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = 'healthy';
    } catch (e) { }

    let redis = 'unhealthy';
    try {
      if (await redisConnection.ping() === 'PONG') {
        redis = 'healthy';
      }
    } catch (e) { }

    let worker = 'unhealthy';
    try {
      const workers = await executionQueue.getWorkers();
      if (workers && workers.length > 0) {
        worker = 'healthy';
      }
    } catch (e) { }

    res.json({
      api: 'healthy',
      worker,
      redis,
      database,
    });
  } catch (error) {
    next(error);
  }
};

export const getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const queueCounts = await executionQueue.getJobCounts();

    const executionStats = await prisma.workflowExecution.groupBy({
      by: ['status'],
      _count: { id: true },
      _avg: { durationMs: true },
    });

    let totalExecutions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let avgDurationArr: number[] = [];

    executionStats.forEach(stat => {
      totalExecutions += stat._count.id;
      if (stat.status === 'SUCCESS') {
        successfulExecutions += stat._count.id;
      }
      if (stat.status === 'FAILED') {
        failedExecutions += stat._count.id;
      }
      if (stat._avg.durationMs !== null) {
        avgDurationArr.push(stat._avg.durationMs);
      }
    });

    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    const averageDuration = avgDurationArr.length > 0 ? avgDurationArr.reduce((a, b) => a + b, 0) / avgDurationArr.length : 0;

    // Node metrics
    // Fetch all node executions joined with node to get node types
    const nodeExecutions = await prisma.nodeExecution.findMany({
      include: { node: true }
    });

    const nodeMetricsMap: Record<string, { executions: number; success: number; failure: number; durations: number[] }> = {};
    const errorAnalyticsMap: Record<string, number> = {
      'Timeout': 0,
      'DNS Failure': 0,
      'HTTP 500': 0,
      'Authentication Error': 0,
      'Validation Error': 0,
      'Other': 0,
    };

    nodeExecutions.forEach(ne => {
      const type = ne.node.type;
      if (!nodeMetricsMap[type]) {
        nodeMetricsMap[type] = { executions: 0, success: 0, failure: 0, durations: [] };
      }
      nodeMetricsMap[type].executions++;
      if (ne.status === 'SUCCESS') nodeMetricsMap[type].success++;
      if (ne.status === 'FAILED') {
        nodeMetricsMap[type].failure++;
        // Categorize error
        if (ne.error) {
          const errStr = ne.error.toLowerCase();
          if (errStr.includes('timeout') || errStr.includes('abort')) errorAnalyticsMap['Timeout']++;
          else if (errStr.includes('enotfound') || errStr.includes('dns') || errStr.includes('econnrefused')) errorAnalyticsMap['DNS Failure']++;
          else if (errStr.includes('500') || errStr.includes('502') || errStr.includes('503') || errStr.includes('504')) errorAnalyticsMap['HTTP 500']++;
          else if (errStr.includes('401') || errStr.includes('403') || errStr.includes('auth')) errorAnalyticsMap['Authentication Error']++;
          else if (errStr.includes('validation') || errStr.includes('invalid') || errStr.includes('missing')) errorAnalyticsMap['Validation Error']++;
          else errorAnalyticsMap['Other']++;
        } else {
          errorAnalyticsMap['Other']++;
        }
      }
      if (ne.durationMs) {
        nodeMetricsMap[type].durations.push(ne.durationMs);
      }
    });

    const nodeMetrics = Object.keys(nodeMetricsMap).map(type => {
      const data = nodeMetricsMap[type];
      return {
        type,
        executions: data.executions,
        successRate: data.executions > 0 ? (data.success / data.executions) * 100 : 0,
        averageDuration: data.durations.length > 0 ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length : 0,
      };
    });

    const errorAnalytics = Object.keys(errorAnalyticsMap)
      .map(category => ({ category, count: errorAnalyticsMap[category] }))
      .filter(item => item.count > 0);

    res.json({
      workflowMetrics: {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate,
        averageDuration,
      },
      queueMetrics: {
        waiting: queueCounts.waiting,
        active: queueCounts.active,
        completed: queueCounts.completed,
        failed: queueCounts.failed,
      },
      nodeMetrics,
      errorAnalytics,
    });
  } catch (error) {
    next(error);
  }
};
