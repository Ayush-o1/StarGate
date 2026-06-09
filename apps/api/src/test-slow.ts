const { PrismaClient } = require('@stargate/database');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function run() {
  const workspace = await prisma.workspace.findFirst();
  const user = await prisma.user.findFirst();
  
  const wfSlow = await prisma.workflow.create({
    data: {
      name: 'SLOW WORKFLOW TEST',
      workspace: { connect: { id: workspace.id } },
      createdBy: { connect: { id: user.id } },
      status: 'ACTIVE',
      nodes: {
        create: [
          {
            type: 'HTTP',
            label: 'Slow Node',
            positionX: 0,
            positionY: 0,
            config: {
              url: 'https://httpbin.org/delay/6',
              method: 'GET',
              timeout: 10000
            }
          }
        ]
      }
    },
    include: { nodes: true }
  });
  
  console.log(`Created slow workflow ${wfSlow.id}`);

  const token = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET || '192621d9f42950d9d5b7d2c8c4f135a8461bb32cd4eead2ec226c1d76212e7c0');
  const res = await fetch(`http://localhost:3000/api/v1/workflows/${wfSlow.id}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ userId: user.id })
  });
  console.log('Execution response:', await res.json());
}

run().catch(console.error).finally(() => prisma.$disconnect());
