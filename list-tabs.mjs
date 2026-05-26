import { chromium } from 'playwright';

(async () => {
  console.log('Connecting to existing Chrome instance...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
  
  const pages = context.pages();
  for (const p of pages) {
    console.log('Open tab URL:', p.url());
  }
  
  await browser.close();
})();
