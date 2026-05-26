/**
 * smart-apply.mjs
 * ─────────────────────────────────────────────────────────────────
 * Handles 3 jobs:
 *   1. MindNudge  (direct site form)
 *   2. Lumel Technologies  (search Naukri live → click best React match)
 *   3. Netlabs Australia   (search Naukri live → click best Frontend match)
 *
 * For each job:
 *   • Opens browser with your saved Naukri session (persistent context)
 *   • Navigates to job page / search results
 *   • Auto-clicks "Apply" button
 *   • Auto-fills all form fields (name, email, phone, LinkedIn, GitHub…)
 *   • Auto-uploads your CV PDF
 *   • Leaves browser open — YOU review & submit, then CLOSE to continue
 * ─────────────────────────────────────────────────────────────────
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Candidate Profile ───────────────────────────────────────────
const PROFILE = {
  first_name:  'Varun Pavan Sai',
  last_name:   'Chadalavada',
  full_name:   'Varun Pavan Sai Chadalavada',
  email:       'varunpavan45@gmail.com',
  phone:       '8688128008',
  phone_full:  '+91 8688128008',
  linkedin:    'https://www.linkedin.com/in/varun-pavan-4b43b2214/',
  github:      'https://github.com/Varunpavan',
  portfolio:   'https://eventify-web-lilac.vercel.app/',
  experience:  '0',
  current_ctc: '0',
  expected_ctc:'5-7 LPA',
  notice:      'Immediate',
  location:    'Andhra Pradesh, India',
};

const CV_PDF = path.join(ROOT, 'output/cv-varun-netlabs-2026-05-20.pdf');

// ─── Cover Letter ────────────────────────────────────────────────
function coverLetter(company, role) {
  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${role} position at ${company}. As a B.Tech graduate in Computer Science & Engineering (AI & ML) from the 2025 batch, I have built and deployed production-ready React.js web applications that demonstrate my readiness to contribute from day one.

Key highlights:
• Eventify — A React.js event discovery app (Vercel) with REST API integration, React Hooks, and custom state management for real-time filtering across 100+ events.
• GitHub User Search — JavaScript + GitHub REST API with dynamic rendering and responsive design.
• Food Munch — A static site deployed on AWS CloudFront with responsive design.

I am proficient in React.js, JavaScript (ES6+), HTML5, CSS3, REST APIs, and Git. I am eager to grow my skills in a product-driven environment like ${company} and can join immediately.

Thank you for considering my application.

Sincerely,
Varun Pavan Sai Chadalavada
varunpavan45@gmail.com | +91 8688128008
GitHub: github.com/Varunpavan | Portfolio: eventify-web-lilac.vercel.app`;
}

// ─── Utilities ───────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tryFill(page, selectors, value) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      const visible = await el.isVisible().catch(() => false);
      if (!visible) continue;
      const current = await el.inputValue().catch(() => '');
      if (current) continue; // already filled
      await el.fill(value);
      return true;
    } catch (_) {}
  }
  return false;
}

async function tryUpload(page, pdfPath) {
  const uploadSelectors = [
    'input[type="file"]',
    'input[accept*="pdf"]',
    'input[accept*=".pdf"]',
    'input[name*="resume" i]',
    'input[name*="cv" i]',
    'input[id*="resume" i]',
    'input[id*="cv" i]',
    'input[id*="file" i]',
  ];
  for (const sel of uploadSelectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      await el.setInputFiles(pdfPath);
      console.log(`  📎 Uploaded resume via: ${sel}`);
      return true;
    } catch (_) {}
  }
  return false;
}

async function autoFillPage(page, company, role) {
  // Fill text fields
  await tryFill(page,
    ['input[name="your-name"]','input[name="firstName"]','input[name="first_name"]',
     'input[name="name"]','input[placeholder*="name" i]','input[id*="name" i]'],
    PROFILE.full_name);

  await tryFill(page,
    ['input[name="firstName"]'],
    PROFILE.first_name);

  await tryFill(page,
    ['input[name="lastName"]','input[name="last_name"]'],
    PROFILE.last_name);

  await tryFill(page,
    ['input[type="email"]','input[name*="email" i]','input[placeholder*="email" i]','input[id*="email" i]'],
    PROFILE.email);

  await tryFill(page,
    ['input[type="tel"]','input[name*="phone" i]','input[name*="mobile" i]','input[placeholder*="phone" i]','input[placeholder*="mobile" i]'],
    PROFILE.phone);

  await tryFill(page,
    ['input[name*="linkedin" i]','input[placeholder*="linkedin" i]'],
    PROFILE.linkedin);

  await tryFill(page,
    ['input[name*="github" i]','input[placeholder*="github" i]'],
    PROFILE.github);

  await tryFill(page,
    ['input[name*="portfolio" i]','input[name*="website" i]','input[placeholder*="portfolio" i]','input[placeholder*="website" i]'],
    PROFILE.portfolio);

  await tryFill(page,
    ['input[name*="experience" i]','input[name*="exp" i]','input[placeholder*="experience" i]'],
    PROFILE.experience);

  await tryFill(page,
    ['input[name*="currentCtc" i]','input[name*="current_ctc" i]','input[name*="currentSalary" i]'],
    PROFILE.current_ctc);

  await tryFill(page,
    ['input[name*="expectedCtc" i]','input[name*="expected_ctc" i]','input[name*="expectedSalary" i]'],
    PROFILE.expected_ctc);

  await tryFill(page,
    ['input[name*="notice" i]','input[placeholder*="notice" i]'],
    PROFILE.notice);

  await tryFill(page,
    ['input[name*="location" i]','input[name*="city" i]','input[placeholder*="location" i]'],
    PROFILE.location);

  // Fill textarea (cover letter / message)
  const textareas = ['textarea[name*="message" i]','textarea[name*="cover" i]','textarea[name*="motivation" i]','textarea'];
  for (const sel of textareas) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      const visible = await el.isVisible().catch(() => false);
      if (!visible) continue;
      const current = await el.inputValue().catch(() => '');
      if (!current) {
        await el.fill(coverLetter(company, role));
        console.log(`  ✍️  Filled cover letter / message field.`);
        break;
      }
    } catch (_) {}
  }

  // Check privacy/consent checkboxes
  try {
    const checkboxes = await page.$$('input[type="checkbox"]');
    for (const cb of checkboxes) {
      const checked = await cb.isChecked().catch(() => true);
      if (!checked) {
        await cb.check().catch(() => {});
        console.log(`  ☑️  Checked consent checkbox.`);
      }
    }
  } catch (_) {}

  // Upload resume
  const uploaded = await tryUpload(page, CV_PDF);
  if (!uploaded) {
    console.log('  ⚠️  No file upload field found yet (may appear after clicking Apply).');
  }

  console.log('  ✅  Auto-fill pass complete.');
}

// ─── Background polling auto-filler ─────────────────────────────
async function startPollingFiller(page, company, role, stop) {
  let filled = false;
  let uploaded = false;

  while (!stop.done) {
    if (page.isClosed()) break;
    try {
      // Only log on first fill
      const didFill = !filled;
      await autoFillPage(page, company, role);
      if (didFill) filled = true;

      // Check upload separately
      if (!uploaded) {
        uploaded = await tryUpload(page, CV_PDF);
      }
    } catch (_) {}
    await sleep(2500);
  }
}

// ─── Click Apply Button ──────────────────────────────────────────
async function clickApply(page) {
  const applySelectors = [
    'button:has-text("Apply Now")',
    'button:has-text("Apply now")',
    'button:has-text("Apply")',
    'a:has-text("Apply Now")',
    'a:has-text("Apply now")',
    'a:has-text("Apply")',
    '.apply-button',
    '.apply-btn',
    '#apply-button',
    '#apply-btn',
    'button:has-text("Submit Application")',
    'a:has-text("Apply on company site")',
    'a[href="#career_detail"]',   // G7CR style
    'button:has-text("Click here")',
    'a:has-text("Click here")',
  ];

  for (const sel of applySelectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      const visible = await el.isVisible().catch(() => false);
      if (!visible) continue;
      await el.click();
      console.log(`  🖱️  Clicked: ${sel}`);
      await sleep(2000);
      return true;
    } catch (_) {}
  }
  return false;
}

// ─── Job Runner ──────────────────────────────────────────────────
async function runJob(jobConfig) {
  const { num, company, role, url, searchQuery, platform } = jobConfig;

  console.log('\n' + '═'.repeat(65));
  console.log(`🚀  JOB ${num}/3 — ${company}`);
  console.log(`    Role    : ${role}`);
  console.log(`    Platform: ${platform}`);
  console.log('═'.repeat(65));

  const userDataDir = path.join(ROOT, '.naukri_user_data');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  const stop = { done: false };
  const fillers = new Map(); // page → filler promise

  // Monitor all pages/tabs
  context.on('page', newPage => {
    newPage.once('domcontentloaded', async () => {
      console.log(`  📄 New tab: ${newPage.url().substring(0, 80)}`);
      await sleep(1500);
      await clickApply(newPage).catch(() => {});
      // Start polling filler on the new tab
      const p = startPollingFiller(newPage, company, role, stop);
      fillers.set(newPage, p);
    });
  });

  const page = context.pages()[0] || await context.newPage();

  let targetUrl = url;

  // If we need to search Naukri for a live listing
  if (searchQuery && platform === 'naukri-search') {
    const searchUrl = `https://www.naukri.com/${searchQuery}`;
    console.log(`  🔍 Searching Naukri: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);

    // Find first relevant job link
    const jobLink = await page.evaluate((companyName) => {
      const links = Array.from(document.querySelectorAll('a.title, a[href*="/job-listings-"]'));
      for (const a of links) {
        const title = a.innerText?.toLowerCase() || '';
        const href = a.href || '';
        if (title && href.includes('/job-listings-')) {
          return href;
        }
      }
      return null;
    }, company);

    if (jobLink) {
      targetUrl = jobLink;
      console.log(`  ✅ Found job link: ${targetUrl}`);
    } else {
      console.log(`  ⚠️  No specific job link found — staying on search results page.`);
      // Try clicking on the first job card
      await page.locator('a.title, a[href*="/job-listings-"]').first().click().catch(() => {});
      await sleep(2000);
      targetUrl = page.url();
    }
  }

  // Navigate to target URL
  console.log(`  🔗 Navigating to: ${targetUrl.substring(0, 80)}...`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);

  // Start polling filler on main page
  startPollingFiller(page, company, role, stop);

  // Try to click Apply on main page
  const clicked = await clickApply(page);
  if (clicked) {
    console.log('  ✅ Apply clicked — watching for form/new tab...');
  } else {
    console.log('  ℹ️  No Apply button found yet — form may already be on the page.');
  }

  // Do an immediate fill pass
  await sleep(2000);
  await autoFillPage(page, company, role);

  // Screenshot for confirmation
  fs.mkdirSync(path.join(ROOT, 'output'), { recursive: true });
  const screenshotPath = path.join(ROOT, `output/${num}-${company.replace(/\s+/g, '-').toLowerCase()}-apply.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});

  console.log('\n' + '⚡'.repeat(32));
  console.log('  👉 FORM AUTO-FILLED! Please review everything.');
  console.log('  👉 Fix any fields that need correction.');
  console.log('  👉 Solve CAPTCHA if shown, then click SUBMIT.');
  console.log('  👉 CLOSE this browser window to proceed to the next job.');
  console.log('⚡'.repeat(32) + '\n');

  // Wait for browser close
  await new Promise(resolve => {
    context.on('close', resolve);
  });

  stop.done = true;
  await context.close().catch(() => {});
  console.log(`  ✅ Job ${num} (${company}) — DONE!\n`);
}

// ─── Job Queue ───────────────────────────────────────────────────
const JOBS = [
  {
    num: 1,
    company: 'MindNudge',
    role: 'React Developer',
    url: 'https://mindnudge.com/jobs/react-developer/',
    platform: 'direct',
  },
  {
    num: 2,
    company: 'Lumel Technologies',
    role: 'Junior React Developer',
    url: 'https://www.naukri.com/lumel-technologies-jobs-in-india',
    searchQuery: 'lumel-technologies-jobs-in-india',
    platform: 'naukri-search',
  },
  {
    num: 3,
    company: 'Netlabs Australia',
    role: 'Front End Developer',
    url: 'https://www.naukri.com/netlabs-australia-jobs',
    searchQuery: 'netlabs-australia-jobs',
    platform: 'naukri-search',
  },
];

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎯 Smart Auto-Apply — 3 Jobs');
  console.log('   Auto-clicks Apply + fills all fields + uploads CV.');
  console.log('   You review each form → Submit → Close browser → next job.\n');

  if (!fs.existsSync(CV_PDF)) {
    console.error(`❌ CV not found: ${CV_PDF}`);
    console.error('   Please ensure the PDF exists before running this script.');
    process.exit(1);
  }
  console.log(`✅ CV found: ${path.basename(CV_PDF)}\n`);

  for (const job of JOBS) {
    await runJob(job);
    if (job.num < JOBS.length) {
      console.log('⏳ Next job opens in 3 seconds...\n');
      await sleep(3000);
    }
  }

  console.log('\n🎉 ALL 3 JOBS COMPLETE!');
  console.log('   Run: node merge-tracker.mjs  to update your applications tracker.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
