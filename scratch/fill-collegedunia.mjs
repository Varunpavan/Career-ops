import { stealthPersistent } from './stealth-browser.mjs';
import fs from 'fs';
import path from 'path';

const PROFILE_PATH = path.resolve('data/naukri-profile');
const JOB_URL = 'https://www.naukri.com/job-listings-ui-developer-collegedunia-web-private-limited-gurugram-0-to-5-years-081024500844';

function findLatestCV() {
  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) return null;
  const pdfs = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.pdf') && f.includes('varun'))
    .map(f => ({ file: f, mtime: fs.statSync(path.join(outputDir, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);
  return pdfs.length > 0 ? path.join(outputDir, pdfs[0].file) : null;
}

async function main() {
  const cvPath = findLatestCV();
  console.log(`📄 CV: ${cvPath ? path.basename(cvPath) : 'None'}`);

  console.log('🚀 Launching browser with Naukri profile...');
  const browser = await stealthPersistent(PROFILE_PATH, {
    headless: false,
    viewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  console.log(`Navigating to Naukri job: ${JOB_URL}`);
  await page.goto(JOB_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Find Apply button
  const applyBtn = await page.$('button:has-text("Apply"), a:has-text("Apply"), button:has-text("Apply on company site")');
  if (!applyBtn) {
    console.log('❌ Apply button not found.');
    await browser.close();
    return;
  }

  // Click apply and wait for new tab
  const context = page.context();
  const newTabPromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
  await applyBtn.click({ force: true });
  console.log('🖱️ Clicked apply. Waiting for redirection to Collegedunia...');

  const newTab = await newTabPromise;
  if (!newTab) {
    console.log('❌ Redirection tab not opened.');
    await browser.close();
    return;
  }

  await newTab.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
  await newTab.waitForTimeout(3000);
  console.log(`🎯 Redirected to: ${newTab.url()}`);

  // Bring new tab to front
  await newTab.bringToFront();

  // Step 1: Fill Name, Email, Phone, Upload Resume
  console.log('✍️ Step 1: Filling general information...');
  try {
    // Fill Name
    const nameInput = await newTab.$('input[placeholder*="Name" i], input[id*="name" i], input[name*="name" i]');
    if (nameInput) {
      await nameInput.fill('Varun Pavan Sai Chadalavada');
      console.log('   Filled Name');
    }

    // Fill Email
    const emailInput = await newTab.$('input[type="email"], input[placeholder*="Email" i], input[name*="email" i]');
    if (emailInput) {
      await emailInput.fill('varunpavan45@gmail.com');
      console.log('   Filled Email');
    }

    // Fill Phone
    const phoneInput = await newTab.$('input[type="tel"], input[placeholder*="Mobile" i], input[placeholder*="Phone" i], input[name*="phone" i]');
    if (phoneInput) {
      await phoneInput.fill('8688128008');
      console.log('   Filled Phone');
    }

    // Upload Resume
    if (cvPath) {
      const fileInput = await newTab.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(cvPath);
        console.log('   Uploaded CV');
      }
    }

    await newTab.waitForTimeout(1000);

    // Click Next/Submit to go to Step 2
    const nextBtn = await newTab.$('button:has-text("Next"), button:has-text("Continue"), button:has-text("Submit"), button[type="submit"]');
    if (nextBtn) {
      await nextBtn.click();
      console.log('🖱️ Clicked Next/Continue. Waiting for Step 2...');
      await newTab.waitForTimeout(3000);
    }
  } catch (err) {
    console.log(`⚠️ Step 1 error: ${err.message}`);
  }

  // Step 2: Fill College, Qualification, Position, Resume
  console.log('✍️ Step 2: Filling qualification details...');
  try {
    // Fill College
    // Collegedunia might have a select or input for college name. Let's find any input not filled yet or with placeholder containing "college"
    const collegeInput = await newTab.$('input[placeholder*="College" i], input[id*="college" i]');
    if (collegeInput) {
      await collegeInput.click({ clickCount: 3 });
      await collegeInput.type('Jawaharlal Nehru Technological University', { delay: 40 });
      console.log('   Filled College Name');
    }

    // Select Qualification
    // Select dropdowns
    const selects = await newTab.$$('select');
    console.log(`Found ${selects.length} select dropdowns.`);

    // 1st dropdown: Qualification
    if (selects.length >= 1) {
      // Find option B.Tech or B.E
      const hasBTech = await selects[0].evaluate(sel => {
        for (const opt of Array.from(sel.options)) {
          if (opt.text.includes('B.Tech') || opt.text.includes('B.E') || opt.value.includes('B.Tech')) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      });
      if (hasBTech) console.log('   Selected B.Tech in qualification select');
    }

    // 2nd dropdown: Position to Apply
    if (selects.length >= 2) {
      const hasUI = await selects[1].evaluate(sel => {
        for (const opt of Array.from(sel.options)) {
          if (opt.text.toLowerCase().includes('ui') || opt.text.toLowerCase().includes('frontend') || opt.text.toLowerCase().includes('web')) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      });
      if (hasUI) console.log('   Selected UI Developer in position select');
    }

    // Upload Resume again if input[type="file"] exists and is empty
    if (cvPath) {
      const fileInput2 = await newTab.$('input[type="file"]');
      if (fileInput2) {
        const isUploaded = await fileInput2.evaluate(el => el.files && el.files.length > 0);
        if (!isUploaded) {
          await fileInput2.setInputFiles(cvPath);
          console.log('   Uploaded CV (Step 2)');
        }
      }
    }

    await newTab.waitForTimeout(1000);

    // Final Submit button click
    const submitBtn = await newTab.$('button:has-text("Submit"), button[type="submit"]');
    if (submitBtn) {
      console.log('🚀 Form filled! Clicking final SUBMIT button...');
      await submitBtn.click();
      await newTab.waitForTimeout(4000);
      console.log('🎉 Application submitted!');
    }
  } catch (err) {
    console.log(`⚠️ Step 2 error: ${err.message}`);
  }

  console.log('👀 Keeping browser open for 30 seconds for visual confirmation...');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
}

main().catch(console.error);
