import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to network requests
  page.on('request', request => {
    if (request.url().includes('/api/v1/edges/workflow/')) {
      console.log('API Request:', request.method(), request.url());
      console.log('Payload:', request.postData());
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/v1/edges/workflow/')) {
      console.log('API Response:', response.status());
      try {
        console.log('Response body:', await response.text());
      } catch(e) {}
    }
  });

  page.on('console', msg => console.log('Browser console:', msg.text()));

  // Setup account & login
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'test2@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);

  // Click on the first workflow
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForTimeout(1000);
  const wfLinks = await page.$$('a[href^="/workflows/"]');
  if (wfLinks.length > 0) {
    await wfLinks[0].click();
    await page.waitForTimeout(2000);

    // Wait for canvas to load
    await page.waitForSelector('.react-flow__pane');

    // Create 2 nodes
    await page.click('button:has-text("+ Add Node")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("+ Add Node")');
    await page.waitForTimeout(1000);

    // Find handles
    const sources = await page.$$('.react-flow__handle-bottom');
    const targets = await page.$$('.react-flow__handle-top');

    if (sources.length >= 1 && targets.length >= 2) {
      console.log('Found handles, trying to drag and drop to connect...');
      // Drag from source 0 to target 1
      const sourceBox = await sources[0].boundingBox();
      const targetBox = await targets[1].boundingBox();
      
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
      await page.mouse.up();
      
      console.log('Finished drag drop sequence');
      await page.waitForTimeout(2000);
    } else {
      console.log('Could not find enough handles', sources.length, targets.length);
    }
  } else {
    console.log('No workflows found on dashboard');
  }

  await browser.close();
})();
