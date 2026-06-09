const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function run() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log("No user found");

  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const accessToken = jwt.sign({ userId: user.id }, accessSecret, { expiresIn: '1h' });

  // Create Workspace
  const wsRes = await fetch('http://localhost:3000/api/v1/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ name: 'Direct Test Workspace' })
  });
  const ws = await wsRes.json();
  console.log('WS Created:', ws.id);

  // Create Workflow
  const wfRes = await fetch(`http://localhost:3000/api/v1/workflows/workspace/${ws.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ name: 'Direct Test Workflow' })
  });
  console.log('Workflow Creation Status:', wfRes.status);
  console.log('Workflow Data:', await wfRes.text());
}
run();
