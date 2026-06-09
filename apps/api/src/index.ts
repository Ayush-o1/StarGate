import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { workspacesRouter } from './routes/workspaces';
import { nodesRouter } from './routes/nodes';
import { edgesRouter } from './routes/edges';
import { workflowsRouter } from './routes/workflows';
import { workflowExecutionRouter, executionDetailRouter } from './modules/executions/executions.routes';
import { workflowTriggersRouter, triggersRouter } from './modules/triggers/triggers.routes';
import { webhooksRouter } from './modules/triggers/webhooks.routes';
import { systemRouter } from './modules/system/system.routes';
import { schedulerService } from './modules/triggers/scheduler.service';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/workspaces', workspacesRouter);
app.use('/api/v1/nodes', nodesRouter);
app.use('/api/v1/edges', edgesRouter);
app.use('/api/v1/workflows', workflowsRouter);
app.use('/api/v1/workflows/:id', workflowExecutionRouter);
app.use('/api/v1/executions', executionDetailRouter);
app.use('/api/v1/workflows/:workflowId/triggers', workflowTriggersRouter);
app.use('/api/v1/triggers', triggersRouter);
app.use('/api/v1/webhooks', webhooksRouter);
app.use('/api/v1/system', systemRouter);

// Global Error Handler
app.use(errorHandler);

app.listen(port, () => {
  console.log(`[stargate-api] Server running on port ${port}`);
  schedulerService.loadSchedules();
});
