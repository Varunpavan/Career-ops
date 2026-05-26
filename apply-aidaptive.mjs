import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('🚀 Launching browser for Aidaptive application...');
  const userDataDir = '/Users/varun/Library/Application Support/Google/Chrome';
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized']
  });
  
  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
  
  const url = 'https://in.indeed.com/viewjob?jk=6d7d29a339e73cd0'; 
  console.log(`Navigating to: ${url}`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  console.log('⏳ Looking for the "Apply now" button...');
  try {
    const applyButton = page.locator('button:has-text("Apply now"), a:has-text("Apply now"), button[id*="apply"], a[id*="apply"]').first();
    await applyButton.waitFor({ state: 'visible', timeout: 5000 });
    await applyButton.click();
    console.log('✅ Clicked "Apply now".');
  } catch (err) {
    console.log('⚠️ Could not click "Apply now" automatically. Trying to proceed anyway...');
  }

  // Wait for the modal or iframe to load
  await page.waitForTimeout(5000);

  const cvPath = path.join(__dirname, 'output', 'cv-varun-aidaptive-2026-05-22.pdf');

  console.log('⏳ Attempting to auto-fill application fields...');
  try {
    const frames = page.frames();
    for (const frame of frames) {
      const inputs = await frame.$$('input');
      if (inputs.length > 0) {
        // Try filling basic fields
        await frame.evaluate(() => {
          const fill = (selector, val) => {
            const el = document.querySelector(selector);
            if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
          };
          fill('input[name="firstName"], input[id*="firstName"]', 'Varun');
          fill('input[name="lastName"], input[id*="lastName"]', 'Pavan');
          fill('input[type="email"], input[id*="email"]', 'varunpavan45@gmail.com');
          fill('input[type="tel"], input[id*="phone"]', '+91 8688128008');
        });
        
        // Try uploading resume
        const fileInput = await frame.$('input[type="file"]');
        if (fileInput) {
           await fileInput.setInputFiles(cvPath);
           console.log('✅ Auto-uploaded Resume!');
        }
        
        // Try to click continue/submit
        await frame.evaluate(() => {
            const btn = document.querySelector('button:has-text("Continue"), button:has-text("Submit"), button:has-text("Review")');
            if (btn) btn.click();
        });
      }
    }
    console.log('✅ Automated application steps performed!');
  } catch (e) {
    console.log('⚠️ Auto-fill encountered an error:', e.message);
  }

  console.log('--------------------------------------------------');
  console.log('👀 Browser is now open on your screen!');
  console.log('Please verify everything looks correct and click Submit manually if it did not auto-submit.');
  console.log('--------------------------------------------------');

})();
