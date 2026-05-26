import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.naukri.com/phonepe-jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    const content = await page.innerText('body');
    console.log(content.slice(0, 3000));
  } finally {
    await browser.close();
  }
}
main();
