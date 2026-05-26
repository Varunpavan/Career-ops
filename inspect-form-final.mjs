import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    await page.click('.cr-apply-btn');
    await page.waitForTimeout(2000);
    const details = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.cr-form input, .cr-form select, .cr-form textarea')).map(el => ({
            tag: el.tagName,
            name: el.getAttribute('name'),
            type: el.getAttribute('type'),
            options: el.tagName === 'SELECT' ? Array.from(el.options).map(o => o.value) : null
        }));
    });
    console.log('FORM_DETAILS:', JSON.stringify(details, null, 2));
  } finally {
    await browser.close();
  }
}
main();
