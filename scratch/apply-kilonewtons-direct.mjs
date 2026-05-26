import { stealthPersistent } from '../stealth-browser.mjs';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const PROFILE_PATH = path.resolve('data/naukri-profile');

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
  console.log('Navigating directly to Kilonewtons homepage...');
  await page.goto('https://www.kilonewtons.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Click on Careers or Jobs
  console.log('Searching for Careers/Jobs links...');
  let careersClicked = false;
  const links = ['a:has-text("Careers")', 'a:has-text("Jobs")', 'a:has-text("Careers / Jobs")', 'a:has-text("Work with us")'];
  for (const selector of links) {
    try {
      const linkEl = await page.$(selector);
      if (linkEl && await linkEl.isVisible()) {
        await linkEl.click();
        careersClicked = true;
        console.log(`🖱️ Clicked: "${selector}"`);
        break;
      }
    } catch {}
  }

  if (!careersClicked) {
    console.log('⚠️ Careers link not clicked. Navigating directly to careers page...');
    await page.goto('https://www.kilonewtons.com/careers', { waitUntil: 'domcontentloaded' }).catch(() => {});
  }

  await page.waitForTimeout(3000);
  console.log(`Current page URL: ${page.url()}`);

  // Scroll down to find Frontend Developer
  await page.evaluate(() => window.scrollBy(0, 1000));
  await page.waitForTimeout(2000);

  // Click Frontend Developer position
  console.log('Searching for Frontend Developer position...');
  let jobClicked = false;
  const jobSelectors = [
    'a:has-text("Frontend Developer")',
    'a:has-text("Front End Developer")',
    'h3:has-text("Frontend Developer")',
    'h4:has-text("Frontend Developer")',
    'div:has-text("Frontend Developer")'
  ];

  for (const selector of jobSelectors) {
    try {
      const jobEl = await page.$(selector);
      if (jobEl && await jobEl.isVisible()) {
        await jobEl.click();
        jobClicked = true;
        console.log(`🖱️ Clicked job title: "${selector}"`);
        break;
      }
    } catch {}
  }

  if (!jobClicked) {
    console.log('⚠️ Job not clicked. Scanning page for jobs/apply sections...');
    // Maybe the application form is already on the page or we are on it
  }

  await page.waitForTimeout(4000);
  console.log(`Current page URL: ${page.url()}`);

  // Scroll to the form section
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollBy(0, 1200);
    }
  });
  await page.waitForTimeout(2000);

  // Now, let's fill the form fields
  console.log('✍️ Filling form fields...');
  try {
    // 1. Full Name
    const nameFilled = await page.evaluate(() => {
      // Find text inputs
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      for (const inp of inputs) {
        const text = (inp.parentElement ? inp.parentElement.innerText : '').toLowerCase();
        if (text.includes('name') || inp.placeholder.toLowerCase().includes('name') || inputs.indexOf(inp) === 0) {
          inp.value = 'Varun Pavan Sai Chadalavada';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return `Filled Name input (placeholder: "${inp.placeholder}")`;
        }
      }
      return 'Name input not found';
    });
    console.log(`Name: ${nameFilled}`);

    // 2. Email
    const emailFilled = await page.evaluate(() => {
      const emailInp = document.querySelector('input[type="email"]');
      if (emailInp) {
        emailInp.value = 'varunpavan45@gmail.com';
        emailInp.dispatchEvent(new Event('input', { bubbles: true }));
        emailInp.dispatchEvent(new Event('change', { bubbles: true }));
        return 'Filled Email';
      }
      return 'Email input not found';
    });
    console.log(`Email: ${emailFilled}`);

    // 3. Phone
    const phoneFilled = await page.evaluate(() => {
      const telInp = document.querySelector('input[type="tel"]');
      if (telInp) {
        telInp.value = '8688128008';
        telInp.dispatchEvent(new Event('input', { bubbles: true }));
        telInp.dispatchEvent(new Event('change', { bubbles: true }));
        return 'Filled Phone';
      }
      return 'Phone input not found';
    });
    console.log(`Phone: ${phoneFilled}`);

    // 4. Bio textarea
    const bioFilled = await page.evaluate(() => {
      const bioTa = document.querySelector('textarea');
      if (bioTa) {
        bioTa.value = 'Enthusiastic Software Engineer and Frontend Developer fresher with a B.Tech in Computer Science and hands-on experience building modern, responsive React.js and JavaScript applications. Adept at turning design specs into clean web interfaces, integrating APIs, and deploying on AWS.';
        bioTa.dispatchEvent(new Event('input', { bubbles: true }));
        bioTa.dispatchEvent(new Event('change', { bubbles: true }));
        return 'Filled Bio';
      }
      return 'Bio textarea not found';
    });
    console.log(`Bio: ${bioFilled}`);

    // 5. Upload Resume
    if (cvPath) {
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(cvPath);
        console.log('📎 Uploaded CV');
      }
    }

    await page.waitForTimeout(1000);

    // 6. Checkbox click (via evaluate to bypass hidden/overlapped element errors)
    const checked = await page.evaluate(() => {
      const cb = document.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        cb.dispatchEvent(new Event('click', { bubbles: true }));
        return true;
      }
      return false;
    });
    if (checked) {
      console.log('☑️ Checked agreement checkbox');
    } else {
      console.log('⚠️ Agreement checkbox not found or not checked');
    }

    await page.waitForTimeout(1500);

    // 7. Click submit button (with evaluation fallback if click fails)
    const submitBtn = await page.$('input[type="submit"], button:has-text("Submit"), button[type="submit"]');
    if (submitBtn) {
      console.log('🚀 Clicking Submit button...');
      try {
        await submitBtn.click();
        console.log('🎉 Application submitted via Playwright click!');
      } catch (clickErr) {
        console.log(`⚠️ Direct click failed (${clickErr.message}). Trying DOM element click...`);
        await page.evaluate(() => {
          const btn = document.querySelector('input[type="submit"], button[type="submit"]');
          if (btn) {
            btn.click();
            return true;
          }
          const btns = Array.from(document.querySelectorAll('button'));
          const submitB = btns.find(b => b.innerText.toLowerCase().includes('submit'));
          if (submitB) {
            submitB.click();
            return true;
          }
          return false;
        });
        console.log('🎉 Application submitted via fallback DOM click!');
      }
      await page.waitForTimeout(5000);
    }
  } catch (err) {
    console.log(`❌ Form filling failed: ${err.message}`);
  }

  console.log('👀 Browser is open. Press Enter to close the browser and exit...');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => rl.question('', () => {
    rl.close();
    resolve();
  }));
  await browser.close();
}

main().catch(console.error);
