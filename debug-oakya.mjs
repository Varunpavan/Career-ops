import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'output/oakya-debug.png', fullPage: true });
    const content = await page.content();
    console.log(content.slice(0, 1000)); // Print start of HTML
    const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => f.innerHTML.slice(0, 500));
    });
    console.log('Forms found:', forms.length);
    console.log(forms[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}
main();
