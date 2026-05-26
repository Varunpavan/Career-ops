import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.hcltech.com/careers/frontend-developer-react-js', { waitUntil: 'networkidle', timeout: 30000 });
    const content = await page.content();
    const title = await page.title();
    console.log('TITLE:', title);
    // Basic extraction of main content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('BODY:', bodyText);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await browser.close();
  }
})();
