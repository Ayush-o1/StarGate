const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  
  // Try to login if redirected
  if (page.url().includes('/login')) {
    console.log('Logging in...');
    await page.type('input[type="email"]', 'ayush@example.com');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  }

  const workflowId = '766f9176-07d8-4e69-9bb2-f07a85199130';
  console.log(`Navigating to workflow ${workflowId}...`);
  await page.goto(`http://localhost:5173/workflows/${workflowId}`, { waitUntil: 'networkidle2' });
  
  console.log('Waiting for execution history to load...');
  await page.waitForSelector('.w-80.border-r.border-gray-200.bg-gray-50');

  await new Promise(r => setTimeout(r, 2000));

  // Take screenshot of the page showing the SLOW badge in the left panel
  await page.screenshot({ path: '/Users/ayush/Desktop/stargate/slow_badge.png', fullPage: true });
  console.log('Screenshot saved to slow_badge.png');

  await browser.close();
})();
