import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    const iframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(i => ({
            src: i.src,
            width: i.width,
            height: i.height
        }));
    });
    console.log('Iframes:', JSON.stringify(iframes, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}
main();
