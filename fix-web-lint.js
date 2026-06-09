const fs = require('fs');

const customNode = 'apps/web/src/components/CustomNode.tsx';
let cnContent = fs.readFileSync(customNode, 'utf8');
cnContent = cnContent.replace("data: Record<string, any>", "data: Record<string, unknown>");
fs.writeFileSync(customNode, cnContent);

