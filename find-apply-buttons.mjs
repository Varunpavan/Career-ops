import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button'))
            .filter(b => b.innerText.toLowerCase().includes('apply'))
            .map(b => ({ text: b.innerText, id: b.id, class: b.className }));
    });
    console.log('Apply Buttons:', JSON.stringify(buttons, null, 2));
  } finally {
    await browser.close();
  }
}
main();
