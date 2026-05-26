import { stealthPersistent } from '../stealth-browser.mjs';
import fs from 'fs';
import path from 'path';

const PROFILE_PATH = path.resolve('data/naukri-profile');
const JOB_URL = 'https://www.naukri.com/job-listings-frontend-developer-kilonewtons-hyderabad-1-to-3-years-260326502369';

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
  console.log('🖱️ Clicked apply. Waiting for redirection to Kilonewtons...');

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

  console.log('✍️ Filling form fields using generic selectors...');
  try {
    // 1. Full Name input field (it is the first text input on the page)
    await newTab.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      // Find the one that corresponds to Full Name (usually the first text input, or label says Full Name)
      for (const inp of inputs) {
        const parentText = inp.parentElement ? inp.parentElement.innerText : '';
        if (parentText.toLowerCase().includes('name') || inp.placeholder.toLowerCase().includes('name') || inputs.indexOf(inp) === 0) {
          inp.value = 'Varun Pavan Sai Chadalavada';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Filled Full Name in page context');
          break;
        }
      }
    });

    // 2. Email field
    await newTab.evaluate(() => {
      const emailInp = document.querySelector('input[type="email"]');
      if (emailInp) {
        emailInp.value = 'varunpavan45@gmail.com';
        emailInp.dispatchEvent(new Event('input', { bubbles: true }));
        emailInp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 3. Phone field
    await newTab.evaluate(() => {
      const telInp = document.querySelector('input[type="tel"]');
      if (telInp) {
        telInp.value = '8688128008';
        telInp.dispatchEvent(new Event('input', { bubbles: true }));
        telInp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 4. Bio textarea
    await newTab.evaluate(() => {
      const bioTa = document.querySelector('textarea');
      if (bioTa) {
        bioTa.value = 'Enthusiastic Software Engineer and Frontend Developer fresher with hands-on experience building modern, responsive user interfaces using HTML, CSS, JavaScript, React.js, Bootstrap, and Tailwind CSS. Eager to contribute and grow in entry-level frontend/fullstack developer roles.';
        bioTa.dispatchEvent(new Event('input', { bubbles: true }));
        bioTa.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 5. Upload Resume
    if (cvPath) {
      const fileInput = await newTab.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(cvPath);
        console.log('📎 Uploaded CV');
      }
    }

    await newTab.waitForTimeout(1000);

    // 6. Checkbox click
    const checkbox = await newTab.$('input[type="checkbox"]');
    if (checkbox) {
      await checkbox.click({ force: true });
      console.log('☑️ Checked agreement checkbox');
    }

    await newTab.waitForTimeout(1500);

    // 7. Click submit button
    const submitBtn = await newTab.$('input[type="submit"], button:has-text("Submit"), button[type="submit"]');
    if (submitBtn) {
      console.log('🚀 Clicking Submit button...');
      await submitBtn.click();
      console.log('🎉 Application submitted!');
      await newTab.waitForTimeout(5000);
    }
  } catch (err) {
    console.log(`❌ Form filling failed: ${err.message}`);
  }

  console.log('👀 Keeping browser open for 30 seconds for visual confirmation...');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
}

main().catch(console.error);
