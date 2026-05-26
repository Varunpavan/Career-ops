import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  console.log('Navigating to InMobi URL...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const response = await page.goto('https://job-boards.greenhouse.io/inmobi/jobs/7793050', {
      waitUntil: 'networkidle',
      timeout: 20000
    });
    
    console.log('Final URL:', page.url());
    console.log('Status code:', response?.status());
    
    const title = await page.title();
    console.log('Page Title:', title);
    
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    
    fs.mkdirSync('./batch', { recursive: true });
    fs.writeFileSync('./batch/inmobi-jd.txt', bodyText, 'utf-8');
    console.log('✅ Successfully extracted InMobi JD to ./batch/inmobi-jd.txt');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
