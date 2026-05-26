import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  console.log('Navigating to G7 CR Technologies URL...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const response = await page.goto('https://g7cr.com/careers/mern-stack-developer/', {
      waitUntil: 'networkidle',
      timeout: 20000
    });
    
    console.log('Final URL:', page.url());
    console.log('Status code:', response?.status());
    
    const title = await page.title();
    console.log('Page Title:', title);
    
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    
    fs.mkdirSync('./batch', { recursive: true });
    fs.writeFileSync('./batch/g7cr-jd.txt', bodyText, 'utf-8');
    console.log('✅ Successfully extracted G7CR JD to ./batch/g7cr-jd.txt');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
