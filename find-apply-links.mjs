import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
            .filter(a => a.innerText.toLowerCase().includes('apply'))
            .map(a => ({ text: a.innerText, href: a.href }));
    });
    console.log('Apply Links:', JSON.stringify(links, null, 2));
  } finally {
    await browser.close();
  }
}
main();
