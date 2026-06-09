const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  let user = await prisma.user.findFirst();
  let workspace = await prisma.workspace.findFirst({ where: { createdById: user.id }});
  
  const workflow = await prisma.workflow.create({
    data: { name: 'HTTP Real Test', workspaceId: workspace.id, createdById: user.id, isActive: true, status: 'ACTIVE' }
  });

  await prisma.node.create({
    data: { workflowId: workflow.id, type: 'HTTP', label: 'GET Post 1', positionX: 100, positionY: 100, config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1', timeout: 5000 } }
  });
  await prisma.node.create({
    data: { workflowId: workflow.id, type: 'HTTP', label: 'POST New Post', positionX: 100, positionY: 200, config: { method: 'POST', url: 'https://jsonplaceholder.typicode.com/posts', body: { title: 'foo', body: 'bar', userId: 1 }, headers: { 'Content-Type': 'application/json' }, timeout: 5000 } }
  });
  await prisma.node.create({
    data: { workflowId: workflow.id, type: 'HTTP', label: 'Invalid Domain', positionX: 100, positionY: 300, config: { method: 'GET', url: 'https://invalid-domain-stargate-test.com', timeout: 5000 } }
  });
  await prisma.node.create({
    data: { workflowId: workflow.id, type: 'HTTP', label: 'Timeout Sim', positionX: 100, positionY: 400, config: { method: 'GET', url: 'https://httpbin.org/delay/2', timeout: 1000 } }
  });

  console.log(workflow.id);
  console.log(user.id);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
