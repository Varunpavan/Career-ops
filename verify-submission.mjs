import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    await page.click('.cr-apply-btn');
    await page.waitForTimeout(1000);
    // Let's see if there are any error messages visible if we tried to submit empty (just to see where they appear)
    const content = await page.content();
    console.log('Is form still visible?', await page.isVisible('.cr-form'));
  } finally {
    await browser.close();
  }
}
main();
