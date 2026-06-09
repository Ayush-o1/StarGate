const fs = require('fs');

const routes = [
  'apps/api/src/routes/edges.ts',
  'apps/api/src/routes/nodes.ts',
  'apps/api/src/routes/workflows.ts',
  'apps/api/src/routes/workspaces.ts',
];

for (const route of routes) {
  let content = fs.readFileSync(route, 'utf8');
  content = content.replace("import { Router } from 'express';", "import { Router, RequestHandler } from 'express';");
  content = content.replace("router.use(authenticateToken as any);", "router.use(authenticateToken as RequestHandler);");
  fs.writeFileSync(route, content);
}

const controllers = [
  'apps/api/src/controllers/edges.controller.ts',
  'apps/api/src/controllers/nodes.controller.ts',
  'apps/api/src/controllers/workflows.controller.ts',
];

for (const controller of controllers) {
  let content = fs.readFileSync(controller, 'utf8');
  content = content.replace("import { Request, Response, NextFunction } from 'express';", "import { Response, NextFunction } from 'express';");
  content = content.replace("import { Request, Response } from 'express';", "import { Response } from 'express';");
  fs.writeFileSync(controller, content);
}

const service = 'apps/api/src/modules/executions/executions.service.ts';
let svcContent = fs.readFileSync(service, 'utf8');
svcContent = svcContent.replace("nodes: any[];", "nodes: Record<string, unknown>[];");
svcContent = svcContent.replace("edges: any[];", "edges: Record<string, unknown>[];");
svcContent = svcContent.replace(/let input: any = null;/g, "let input: unknown = null;");
svcContent = svcContent.replace(/let output: any = null;/g, "let output: unknown = null;");
fs.writeFileSync(service, svcContent);

console.log('Lint fixes applied');
