import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('🚀 Navigating...');
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    await page.click('.cr-apply-btn');
    await page.waitForTimeout(2000);

    await page.fill('input[name="full_name"]', 'Varun Pavan Sai Chadalavada');
    await page.fill('input[name="email"]', 'varunpavan45@gmail.com');
    await page.fill('input[name="mobile_number"]', '+91 8688128008');
    await page.selectOption('select[name="city"]', 'Vijayawada');

    // Select fresher radio
    await page.evaluate(() => {
        const radios = Array.from(document.querySelectorAll('input[name="status"]'));
        if (radios.length > 0) radios[0].click();
    });

    const resumePath = path.resolve('output/cv-varun-oakya-frontend-2026-05-20.pdf');
    await page.setInputFiles('input[name="resume"]', resumePath);

    console.log('📤 Clicking Submit...');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(8000);
    const bodyText = await page.innerText('body');
    
    if (bodyText.toLowerCase().includes('success') || bodyText.toLowerCase().includes('thank you') || bodyText.toLowerCase().includes('received')) {
        console.log('✅ SUCCESS_CONFIRMED');
    } else {
        console.log('❓ CHECK_SCREENSHOT');
    }
    
    await page.screenshot({ path: 'output/oakya-final-result.png', fullPage: true });

  } catch (err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    await browser.close();
  }
}
main();
