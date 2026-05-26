import { chromium } from 'playwright';

(async () => {
  console.log('Connecting to existing Chrome instance...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
  
  const pages = context.pages();
  let targetPage = null;
  
  for (const p of pages) {
    if (p.url().includes('indeed.com')) {
      targetPage = p;
      break;
    }
  }

  if (!targetPage) {
    console.log('Could not find an Indeed tab open.');
    process.exit(1);
  }

  console.log('Found Indeed page:', targetPage.url());
  
  // Dump all input fields across the page and iframes
  const frames = targetPage.frames();
  console.log(`Found ${frames.length} frames.`);
  
  for (const frame of frames) {
    const inputs = await frame.$$eval('input, textarea, select, button', els => els.map(el => {
      return {
        tag: el.tagName,
        type: el.type,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder || '',
        text: el.innerText || el.value || '',
        isVisible: el.offsetWidth > 0 && el.offsetHeight > 0
      };
    }));
    
    const visibleInputs = inputs.filter(i => i.isVisible);
    if (visibleInputs.length > 0) {
      console.log(`\n--- Frame: ${frame.url()} ---`);
      console.table(visibleInputs);
    }
  }
  
  await browser.close();
})();
