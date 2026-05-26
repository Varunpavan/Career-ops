import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console logs from the page
  page.on('console', msg => console.log('PAGE_LOG:', msg.text()));

  try {
    console.log('🚀 Navigating to career page...');
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    
    console.log('🖱️ Clicking Apply Now...');
    await page.click('.cr-apply-btn');
    await page.waitForTimeout(2000);

    console.log('✍️ Filling form fields...');
    await page.fill('input[name="full_name"]', 'Varun Pavan Sai Chadalavada');
    await page.fill('input[name="email"]', 'varunpavan45@gmail.com');
    await page.fill('input[name="mobile_number"]', '+91 8688128008');
    await page.selectOption('select[name="city"]', 'Vijayawada');

    // Select fresher radio explicitly
    await page.evaluate(() => {
      const fresco = document.querySelector('input[name="status"][value="fresher"]');
      if (fresco) fresco.click();
    });

    console.log('📎 Attaching resume...');
    const resumePath = path.resolve('output/cv-varun-oakya-frontend-2026-05-20.pdf');
    await page.setInputFiles('input[name="resume"]', resumePath);

    console.log('📤 Attempting submission via direct form dispatch...');
    
    // Set up a promise to wait for a success-like response or a timeout
    const submissionPromise = page.waitForResponse(response => {
      return response.url().includes('career') && response.status() === 200;
    }, { timeout: 15000 }).catch(() => null);

    await page.evaluate(() => {
      const form = document.querySelector('.cr-form');
      if (form) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.click();
        } else {
          form.submit();
        }
      }
    });

    const response = await submissionPromise;
    if (response) {
      console.log('📡 Received response from:', response.url());
    }

    await page.waitForTimeout(5000);
    
    const isVisible = await page.isVisible('.cr-form');
    const bodyText = await page.innerText('body');
    
    console.log('🏁 Form visible after attempt:', isVisible);
    
    if (!isVisible || bodyText.toLowerCase().includes('success') || bodyText.toLowerCase().includes('thank')) {
      console.log('✅ SUCCESS: Application submitted!');
    } else {
      console.log('❌ FAILED: Form still present and no success message found.');
      // Take a screenshot for debugging
      await page.screenshot({ path: 'output/oakya-failed-attempt.png', fullPage: true });
      
      // Check for validation errors on the page
      const errors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.error, .validation-message, .wpcf7-not-valid-tip')).map(e => e.innerText);
      });
      if (errors.length > 0) console.log('Validation Errors found:', errors);
    }

  } catch (err) {
    console.error('❌ ERROR during robust submission:', err.message);
  } finally {
    await browser.close();
  }
}

main();
