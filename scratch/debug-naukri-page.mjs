import { stealthPersistent } from '../stealth-browser.mjs';
import path from 'path';
import fs from 'fs';

(async () => {
  const PROFILE_PATH = path.resolve('data/naukri-profile');
  console.log('🚀 Launching browser for debug...');
  const browser = await stealthPersistent(PROFILE_PATH, {
    headless: true,
    viewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  const url = 'https://www.naukri.com/job-listings-senior-react-developer-sithafal-technologies-hyderabad-5-to-10-years-100125503207';
  console.log(`🔗 Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('Navigation error caught:', e.message));
  await page.waitForTimeout(5000);

  const title = await page.title();
  const pageUrl = page.url();
  console.log(`📌 Title: "${title}"`);
  console.log(`📌 Current URL: "${pageUrl}"`);

  // Check buttons
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a')).map(el => ({
      tag: el.tagName,
      id: el.id,
      class: el.className,
      text: el.innerText.trim(),
      visible: el.offsetHeight > 0 && el.offsetWidth > 0,
    })).filter(b => b.text.length > 0 && b.visible);
  });

  console.log('📋 Visible buttons/links on page:');
  console.log(buttons.filter(b => b.text.toLowerCase().includes('apply') || b.id.includes('apply') || b.class.includes('apply')));

  // Take screenshot
  const screenshotPath = path.resolve('data/debug-naukri-screen.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot saved to ${screenshotPath}`);

  await browser.close();
})();
