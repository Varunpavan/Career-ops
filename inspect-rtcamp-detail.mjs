import { chromium } from 'playwright';

async function main() {
  console.log('Navigating to rtCamp URL...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const response = await page.goto('https://rtcamp.com/careers/associate-react-engineer/', {
      waitUntil: 'networkidle',
      timeout: 20000
    });
    
    console.log('Final URL:', page.url());
    console.log('Status code:', response?.status());
    
    const title = await page.title();
    console.log('Page Title:', title);
    
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    const hasReact = bodyText.toLowerCase().includes('react');
    console.log('Contains "react" in body text?', hasReact);
    if (hasReact) {
      // Find where "react" occurs and print some context
      const idx = bodyText.toLowerCase().indexOf('react');
      console.log('Context:', bodyText.substring(Math.max(0, idx - 100), Math.min(bodyText.length, idx + 200)));
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
