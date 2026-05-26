import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('🚀 Launching Chrome for Narvee Technologies application...');
  // Launch in non-headless mode using Chrome channel so the user can interact and avoid Google bot detection
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized', '--remote-debugging-port=9222']
  });
  
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // The URL for Narvee Technologies from india-jobs.tsv
  const url = 'https://in.indeed.com/viewjob?jk=299ea538b6fb93dc'; 
  console.log(`Navigating to: ${url}`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  console.log('⏳ Looking for the "Apply now" or "Apply with Indeed" button...');
  
  try {
      const applyButton = page.locator('button:has-text("Apply now"), button:has-text("Apply with Indeed"), a:has-text("Apply now")').first();
      if (await applyButton.isVisible({ timeout: 5000 })) {
          await applyButton.click();
          console.log('✅ Automatically clicked the apply button!');
      } else {
          console.log('⚠️ Could not automatically click "Apply now" (might need manual click).');
      }
  } catch (err) {
      console.log('⚠️ Could not automatically click "Apply now". Error:', err.message);
  }

  // Find the exact generated CV filename from the output directory
  const { readdirSync } = await import('fs');
  const outputFiles = readdirSync(path.join(__dirname, 'output'));
  const cvFile = outputFiles.find(f => f.startsWith('cv-varun-narvee') && f.endsWith('.pdf'));
  const cvPath = cvFile ? path.join(__dirname, 'output', cvFile) : 'output/cv-varun-narvee...pdf';

  console.log('--------------------------------------------------');
  console.log('👀 Browser is now open on your screen!');
  console.log("1. Please log in to Indeed using Google or your Email if prompted.");
  console.log('2. Proceed through the application form.');
  console.log(`3. When asked for your resume, upload this newly tailored file:`);
  console.log(`   ${cvPath}`);
  console.log('4. Click the final Submit button yourself.');
  console.log('--------------------------------------------------');
  console.log('Press Ctrl+C in the terminal to close the browser when you are fully done.');
})();
