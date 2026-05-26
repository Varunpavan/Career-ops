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
    
    const resumePath = path.resolve('output/cv-varun-oakya-frontend-2026-05-20.pdf');
    await page.setInputFiles('input[name="resume"]', resumePath);
    
    console.log('Clicking submit inside .cr-form...');
    await page.click('.cr-form button[type="submit"]');
    
    // Wait for any network activity to stop
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const isVisible = await page.isVisible('.cr-form');
    console.log('FORM_STILL_VISIBLE:', isVisible);
    
    const text = await page.innerText('body');
    if (text.toLowerCase().includes('success') || text.toLowerCase().includes('thank') || !isVisible) {
        console.log('✅ SUBMISSION_PROBABLY_SUCCESSFUL');
    } else {
        console.log('❌ SUBMISSION_FAILED_OR_STUCK');
    }
  } finally {
    await browser.close();
  }
}
main();
