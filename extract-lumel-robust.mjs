import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.naukri.com/lumel-technologies-jobs-careers-4813432', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    const content = await page.innerText('body');
    console.log('--- BODY CONTENT (FIRST 2000 CHARS) ---');
    console.log(content.slice(0, 2000));
    
    const html = await page.content();
    console.log('--- HTML SNIPPET ---');
    console.log(html.slice(0, 1000));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}
main();
