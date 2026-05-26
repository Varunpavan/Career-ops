import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    const text = await page.innerText('body');
    console.log('Is "Full Name" present?', text.includes('Full Name'));
    console.log('Is "Apply" present?', text.includes('Apply'));
    console.log('Is "Contact" present?', text.includes('Contact'));
    const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('button, a')).map(b => b.innerText));
    console.log('Buttons/Links:', buttons.filter(b => b.trim().length > 0).slice(0, 20));
  } finally {
    await browser.close();
  }
}
main();
