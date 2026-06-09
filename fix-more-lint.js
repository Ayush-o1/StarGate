const fs = require('fs');

const filesToFixCatch = [
  'apps/web/src/components/CreateWorkflowModal.tsx',
  'apps/web/src/components/CreateWorkspaceModal.tsx',
];

for (const file of filesToFixCatch) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/catch \(e: any\)/g, "catch (e: unknown)");
  content = content.replace(/catch \(err: any\)/g, "catch (err: unknown)");
  content = content.replace(/catch \(error: any\)/g, "catch (error: unknown)");
  fs.writeFileSync(file, content);
}
console.log('Fixed additional lint catches');
