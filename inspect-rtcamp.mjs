import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  console.log('Launching browser to inspect rtCamp...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://rtcamp.com/careers/associate-react-engineer/', {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    // Wait for content hydration
    await page.waitForTimeout(3000);
    
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    
    if (!bodyText || bodyText.trim().length < 100) {
      throw new Error('Retrieved body text is too short or empty');
    }
    
    fs.mkdirSync('./batch', { recursive: true });
    fs.writeFileSync('./batch/rtcamp-jd.txt', bodyText, 'utf-8');
    console.log('✅ Successfully extracted rtCamp JD to ./batch/rtcamp-jd.txt');
  } catch (err) {
    console.error('❌ Error inspecting rtCamp:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
