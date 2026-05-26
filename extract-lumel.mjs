import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('🚀 Navigating to Lumel JD...');
    await page.goto('https://www.naukri.com/lumel-technologies-jobs-careers-4813432', { waitUntil: 'networkidle' });
    
    // Naukri sometimes has anti-bot, let's wait a bit
    await page.waitForTimeout(3000);

    const jd = await page.evaluate(() => {
        const title = document.querySelector('.jd-header-title')?.innerText;
        const company = document.querySelector('.jd-header-comp-name')?.innerText;
        const description = document.querySelector('.job-desc')?.innerText;
        const details = Array.from(document.querySelectorAll('.details > span')).map(s => s.innerText);
        return { title, company, description, details };
    });

    console.log('--- JD EXTRACTED ---');
    console.log(JSON.stringify(jd, null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}
main();
