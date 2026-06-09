import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@stargate.local' },
    update: {},
    create: {
      email: 'admin@stargate.local',
      passwordHash: '$2b$10$wTfO/1k0j528T1Z6K9zMweN33k8e.Z0RXYa43rNxt8yQ4X1/YnUFW', // "password"
      name: 'Admin User',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Default Workspace',
      description: 'Default workspace created by seed',
      createdById: user.id,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  console.log('Database seeded:', { user, workspace });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
