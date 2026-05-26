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
    
    // Check radio values
    const radioValues = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input[name="status"]')).map(r => ({
            value: r.value,
            id: r.id,
            checked: r.checked
        }));
    });
    console.log('RADIOS:', radioValues);
    
    await page.evaluate(() => { document.querySelectorAll('input[name="status"]')[0].click(); });

    const resumePath = path.resolve('output/cv-varun-oakya-frontend-2026-05-20.pdf');
    await page.setInputFiles('input[name="resume"]', resumePath);
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const errors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(':invalid')).map(el => ({
            name: el.getAttribute('name'),
            validationMessage: el.validationMessage
        }));
    });
    console.log('VALIDATION_ERRORS:', JSON.stringify(errors, null, 2));

  } finally {
    await browser.close();
  }
}
main();
