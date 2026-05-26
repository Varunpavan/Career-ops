import { chromium } from 'playwright';
import path from 'path';

async function main() {
  let headless = false;
  // Check if we should run headless (e.g. if we want to run in background first or if display is not available)
  if (process.argv.includes('--headless')) {
    headless = true;
  }

  console.log(`🚀 Launching browser (headless: ${headless})...`);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: null
  });
  const page = await context.newPage();

  try {
    console.log('🔗 Navigating to Patoliya Careers page...');
    await page.goto('https://www.patoliyainfotech.com/company/careers', { waitUntil: 'networkidle' });

    console.log('🖱️ Clicking the first "Apply here" button for MERN Stack Developer (Fresher)...');
    await page.locator('text=Apply here').first().click();
    await page.waitForTimeout(2000); // Wait for modal to load

    console.log('✍️ Selecting Area of Interest...');
    const interestInput = page.locator('input[labelText="Area of Interest"], .MuiAutocomplete-input').first();
    await interestInput.click();
    await interestInput.fill('MERN');
    await page.waitForTimeout(1000);
    // Click the option
    await page.locator('[role="option"]:has-text("MERN Stack Developer")').first().click();

    console.log('✍️ Filling personal information...');
    await page.locator('input[name="firstName"]').fill('Varun Pavan Sai');
    await page.locator('input[name="lastName"]').fill('Chadalavada');
    await page.locator('input[name="email"]').fill('varunpavan45@gmail.com');
    await page.locator('input[type="tel"]').fill('+91 8688128008');
    await page.locator('input[name="skype"]').fill('N/A');
    await page.locator('input[name="linkedin"]').fill('https://www.linkedin.com/in/varun-pavan-4b43b2214/');

    console.log('✍️ Filling professional and compensation details...');
    await page.locator('input[name="totalExp"]').fill('0');
    await page.locator('input[name="relevantExp"]').fill('0');
    await page.locator('input[name="expectedCtc"]').fill('5-7 LPA');
    await page.locator('input[name="currentCtc"]').fill('0');

    // How soon can you join? joiningDate
    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[name="joiningDate"]').fill(today);

    await page.locator('input[name="lastCompany"]').fill('None (Fresher)');

    console.log('📎 Attaching resume (output/patoliya-cv.pdf)...');
    const resumePath = path.resolve('output/patoliya-cv.pdf');
    await page.setInputFiles('#file-upload', resumePath);
    await page.waitForTimeout(1000);

    // Take screenshot of the filled form
    await page.screenshot({ path: 'output/patoliya-application-ready.png', fullPage: true });
    console.log('📸 Screenshot of completed form saved to output/patoliya-application-ready.png');

    if (!headless) {
      console.log('\n==================================================');
      console.log('👉 BROWSER IS OPEN!');
      console.log('Please review the form, solve the Google reCAPTCHA, and click Submit.');
      console.log('Once you are done, close the browser window to complete the script.');
      console.log('==================================================\n');
      
      // Keep the browser open until the user closes it
      await page.waitForEvent('close', { timeout: 0 });
    } else {
      console.log('✅ Form filled successfully in headless mode.');
    }

  } catch (err) {
    console.error('❌ Error during form filling:', err);
  } finally {
    await browser.close();
  }
}

main();
