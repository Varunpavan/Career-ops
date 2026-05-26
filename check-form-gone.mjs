import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    await page.click('.cr-apply-btn');
    await page.waitForTimeout(1000);
    await page.fill('input[name="full_name"]', 'Varun Pavan Sai Chadalavada');
    await page.fill('input[name="email"]', 'varunpavan45@gmail.com');
    await page.fill('input[name="mobile_number"]', '+91 8688128008');
    await page.selectOption('select[name="city"]', 'Vijayawada');
    await page.evaluate(() => {
        const radios = Array.from(document.querySelectorAll('input[name="status"]'));
        if (radios.length > 0) radios[0].click();
    });
    const resumePath = path.resolve('output/cv-varun-oakya-frontend-2026-05-20.pdf');
    await page.setInputFiles('input[name="resume"]', resumePath);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(10000);
    const isVisible = await page.isVisible('.cr-form');
    console.log('FORM_VISIBLE_AFTER_SUBMIT:', isVisible);
    console.log('FINAL_URL:', page.url());
  } finally {
    await browser.close();
  }
}
main();
