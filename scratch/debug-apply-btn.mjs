import { chromium } from 'playwright';
import path from 'path';

const USER_DATA_DIR = path.resolve('.naukri_user_data');
const URL = 'https://www.naukri.com/job-listings-react-js-developer-speqto-technologies-noida-0-to-1-years-150526002758';

async function test() {
  console.log('Launching browser...');
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  const page = context.pages()[0] || await context.newPage();
  console.log('Navigating to job page...');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 5000));

  console.log('Inspecting page buttons...');
  const buttonsInfo = await page.evaluate(() => {
    const elList = Array.from(document.querySelectorAll('button, a, span, div'));
    return elList
      .filter(el => {
        const text = el.innerText || '';
        return text.toLowerCase().includes('apply');
      })
      .map(el => ({
        tagName: el.tagName,
        text: (el.innerText || '').trim(),
        id: el.id,
        className: el.className,
        href: el.href || null,
        isVisible: el.offsetParent !== null
      }));
  });

  console.log('Elements containing "apply":', JSON.stringify(buttonsInfo, null, 2));

  // Try selectors one by one
  const selectors = [
    'button:has-text("Apply Now")',
    'button:has-text("Apply")',
    'a:has-text("Apply")',
    'button:has-text("Apply on company site")',
    'a:has-text("Apply on company site")',
    'button[class*="apply"]',
    'a[class*="apply"]'
  ];

  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      const visible = el ? await el.isVisible() : false;
      console.log(`Selector "${sel}": found = ${!!el}, visible = ${visible}`);
    } catch (e) {
      console.log(`Selector "${sel}": error = ${e.message}`);
    }
  }

  await context.close();
}

test();
