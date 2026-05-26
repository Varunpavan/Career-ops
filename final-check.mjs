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
    await page.selectOption('select[name="position"]', 'Web Developer');
    await page.fill('input[name="experience"]', '0');
    await page.fill('textarea[name="message"]', "Frontend Developer Application");
    const resumePath = path.resolve('output/cv-varun-oakya-frontend-2026-05-20.pdf');
    await page.setInputFiles('input[name="resume"]', resumePath);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(7000); // Wait longer

    const isFormVisible = await page.isVisible('.cr-form');
    console.log('RESULT_FORM_VISIBLE:', isFormVisible);
    
    const bodyText = await page.innerText('body');
    console.log('RESULT_BODY_TEXT_LENGTH:', bodyText.length);
    console.log('RESULT_TEXT_SNIPPET:', bodyText.slice(0, 500));
    
    // Look for common success elements in WordPress (likely what they use)
    const wpcf7Response = await page.evaluate(() => document.querySelector('.wpcf7-response-output')?.innerText);
    if (wpcf7Response) console.log('WPCF7_RESPONSE:', wpcf7Response);

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}
main();
