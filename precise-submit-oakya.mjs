import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Navigating...');
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    
    await page.click('.cr-apply-btn');
    await page.waitForTimeout(1000);

    console.log('✍️ Filling fields...');
    await page.fill('input[name="full_name"]', 'Varun Pavan Sai Chadalavada');
    await page.fill('input[name="email"]', 'varunpavan45@gmail.com');
    await page.fill('input[name="mobile_number"]', '8688128008');
    await page.selectOption('select[name="city"]', 'Vijayawada');
    await page.check('input[name="status"][value="fresher"]');

    console.log('📎 Attaching resume...');
    const resumePath = path.resolve('output/cv-varun-oakya-frontend-2026-05-20.pdf');
    await page.setInputFiles('input[name="resume"]', resumePath);

    console.log('📤 Submitting...');
    await page.click('.cr-submit-btn');

    await page.waitForTimeout(8000);
    
    const bodyText = await page.innerText('body');
    const isVisible = await page.isVisible('.cr-form');
    
    if (bodyText.toLowerCase().includes('success') || bodyText.toLowerCase().includes('thank') || !isVisible) {
      console.log('✅ SUCCESS_OAKYA');
    } else {
      console.log('❌ FAILED_OAKYA');
      await page.screenshot({ path: 'output/oakya-final-fail.png', fullPage: true });
    }

  } catch (err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    await browser.close();
  }
}

main();
