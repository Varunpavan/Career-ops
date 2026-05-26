import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    console.log('Clicking Apply Now...');
    await page.click('.cr-apply-btn');
    await page.waitForTimeout(3000);
    
    const text = await page.innerText('body');
    console.log('Is "Full Name" present now?', text.includes('Full Name'));
    
    const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
            id: f.id,
            class: f.className,
            fields: Array.from(f.querySelectorAll('input, textarea')).map(i => i.getAttribute('name'))
        }));
    });
    console.log('Forms found:', JSON.stringify(forms, null, 2));
    
    await page.screenshot({ path: 'output/oakya-after-click.png', fullPage: true });
  } finally {
    await browser.close();
  }
}
main();
