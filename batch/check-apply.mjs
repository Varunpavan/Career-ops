import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const userDataDir = path.join(__dirname, '..', '.naukri-session');
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 900 }
});
const page = context.pages()[0] || await context.newPage();

await page.goto('https://www.naukri.com/job-listings-front-end-developer-ipropal-allps-kolkata-mumbai-new-delhi-hyderabad-pune-chennai-bengaluru-0-to-2-years-010426505767', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

const text = await page.evaluate(() => document.body.innerText);
const lines = text.split('\n').filter(l => l.match(/Apply|applied/i)).slice(0, 10);
console.log('Apply/Applied mentions:', lines);

const buttons = await page.evaluate(() => {
  const btns = document.querySelectorAll('button, a, span');
  return Array.from(btns).filter(b => b.innerText.match(/Apply|applied/i)).map(b => ({ text: b.innerText.trim(), tag: b.tagName }));
});
console.log('Buttons:', JSON.stringify(buttons, null, 2));

// Try clicking an Apply button
const btns = await page.$$('button, a, span');
for (const btn of btns) {
  const txt = await btn.innerText();
  if (txt.match(/^Apply$/i)) {
    console.log('Clicking Apply button:', txt);
    await btn.click();
    await page.waitForTimeout(3000);
    const newText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('After click:', newText);
    break;
  }
}

await new Promise(() => {});
await context.close();
