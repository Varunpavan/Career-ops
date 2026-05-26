import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CV_PDF = path.join(ROOT, 'output/cv-varun-netlabs-2026-05-20.pdf');

const P = {
  full_name:  'Varun Pavan Sai Chadalavada',
  email:      'varunpavan45@gmail.com',
  phone:      '8688128008',
  linkedin:   'https://www.linkedin.com/in/varun-pavan-4b43b2214/',
  github:     'https://github.com/Varunpavan',
};

const coverLetter = `Dear Hiring Manager,

I am writing to express my strong interest in the React JS Developer (Intern) position at your company. As a B.Tech CSE (AI & ML) 2025 graduate, I have hands-on experience building and deploying React.js applications:

• Eventify — React.js event discovery app with Hooks, REST APIs, deployed on Vercel
• GitHub User Search — JavaScript + GitHub REST API, responsive design
• Food Munch — Deployed on AWS CloudFront

I am proficient in React.js, JavaScript (ES6+), HTML5, CSS3, and Git. I can join immediately.

Best regards,
Varun Pavan Sai Chadalavada
varunpavan45@gmail.com | +91 8688128008
GitHub: github.com/Varunpavan`;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fillAndScreenshot() {
  console.log('🚀 Opening Castus Info careers page...');
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  await page.goto('https://www.castusinfo.com/pages/carrers.html', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  await sleep(3000);

  console.log('Page title:', await page.title());
  console.log('URL:', page.url());

  // Dump all form fields for debugging
  const fields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
      tag: el.tagName,
      type: el.type || '',
      name: el.name || '',
      id: el.id || '',
      placeholder: el.placeholder || '',
      className: el.className?.slice(0, 50) || ''
    }));
  });
  console.log('\n📋 Form fields found:');
  console.log(JSON.stringify(fields, null, 2));

  // Try filling common patterns
  const fillMap = [
    { sels: ['input[name*="name" i]', 'input[placeholder*="name" i]', '#name', '#fullName'], val: P.full_name },
    { sels: ['input[type="email"]', 'input[name*="email" i]', '#email'], val: P.email },
    { sels: ['input[type="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]', '#phone', '#mobile'], val: P.phone },
    { sels: ['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]'], val: P.linkedin },
    { sels: ['textarea', 'textarea[name*="message" i]', 'textarea[name*="cover" i]'], val: coverLetter },
  ];

  for (const { sels, val } of fillMap) {
    for (const sel of sels) {
      try {
        const el = await page.$(sel);
        if (!el) continue;
        if (!await el.isVisible().catch(() => false)) continue;
        await el.fill(val);
        console.log(`✅ Filled: ${sel}`);
        break;
      } catch (e) {}
    }
  }

  // Upload resume
  try {
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(CV_PDF);
      console.log('📎 Resume uploaded!');
    } else {
      console.log('⚠️  No file input found on this page.');
    }
  } catch (e) { console.log('⚠️  Upload error:', e.message); }

  // Screenshot
  fs.mkdirSync(path.join(ROOT, 'output'), { recursive: true });
  await page.screenshot({ path: path.join(ROOT, 'output/castus-form.png'), fullPage: true });
  console.log('\n📸 Screenshot saved: output/castus-form.png');

  console.log('\n' + '⚡'.repeat(30));
  console.log('👉 REVIEW the form in the browser window');
  console.log('👉 Click SUBMIT when ready');
  console.log('👉 Then CLOSE this browser to finish');
  console.log('⚡'.repeat(30));

  // Wait for browser close
  await new Promise(resolve => browser.on('disconnected', resolve));
  await browser.close().catch(() => {});
  console.log('✅ Done!');
}

fillAndScreenshot().catch(console.error);
