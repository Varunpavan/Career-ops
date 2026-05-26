/**
 * naukri-easy-apply.mjs
 * ──────────────────────────────────────────────────────────────────
 * Scans Naukri for React/Frontend fresher jobs that have NAUKRI
 * EASY APPLY (not "Apply on company site"). These can be fully
 * auto-filled without leaving Naukri.
 *
 * Flow:
 *  1. Search Naukri for 0-1 yr React jobs
 *  2. Print job list with Easy Apply badges
 *  3. Open top 3 Easy Apply jobs one by one
 *  4. Click "Apply", auto-fill the chatbot/form, upload CV
 *  5. Wait for you to review + Submit, then close → next job
 * ──────────────────────────────────────────────────────────────────
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CV_PDF = path.join(ROOT, 'output/cv-varun-netlabs-2026-05-20.pdf');
const USER_DATA = path.join(ROOT, '.naukri_user_data');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const P = {
  name:     'Varun Pavan Sai Chadalavada',
  email:    'varunpavan45@gmail.com',
  phone:    '8688128008',
  linkedin: 'https://www.linkedin.com/in/varun-pavan-4b43b2214/',
  github:   'https://github.com/Varunpavan',
  exp:      '0',
  ctc:      '0',
  expected: '5',
  notice:   '0',
};

// ── Scan: find Easy Apply jobs ────────────────────────────────────
async function scanForEasyApply(page) {
  const url = 'https://www.naukri.com/react-js-developer-jobs-in-india?experience=0&qtype=cat';
  console.log('🔍 Scanning:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);

  const jobs = await page.evaluate(() => {
    const results = [];
    // Find all job card elements - Naukri uses various class names
    const allLinks = Array.from(document.querySelectorAll('a[href*="/job-listings-"]'));
    
    for (const link of allLinks) {
      const href = link.href;
      const title = link.innerText?.trim() || link.textContent?.trim() || '';
      if (!title || !href) continue;

      // Walk up to find the card container
      let card = link.closest('article') || link.closest('[class*="tuple"]') || link.closest('[class*="card"]') || link.parentElement;
      
      // Get company name - look for nearby elements
      let company = '';
      if (card) {
        const compEl = card.querySelector('a[class*="comp"], [class*="company"], a[class*="subTitle"]');
        company = compEl?.innerText?.trim() || compEl?.textContent?.trim() || '';
        
        // Also look for Easy Apply badge
        const text = card.innerText || '';
        const hasEasyApply = text.toLowerCase().includes('easy apply') || 
                             card.querySelector('[class*="easyApply"], [class*="easy-apply"]') !== null;
        
        results.push({ title, company, href, hasEasyApply });
      }
    }

    // Deduplicate by href
    const seen = new Set();
    return results.filter(j => {
      if (seen.has(j.href)) return false;
      seen.add(j.href);
      return j.title.length > 5;
    }).slice(0, 10);
  });

  return jobs;
}

// ── Fill Naukri Easy Apply modal/chatbot ─────────────────────────
async function fillNaukriModal(page) {
  console.log('  📋 Filling Naukri Apply modal...');
  await sleep(2000);

  // Naukri Easy Apply sometimes shows a chatbot or a modal with questions
  // Try to answer yes/no questions and fill text inputs

  for (let attempt = 0; attempt < 5; attempt++) {
    // Fill any visible text inputs
    const inputs = await page.$$('input[type="text"], input[type="tel"], input[type="email"], input[type="number"]');
    for (const inp of inputs) {
      try {
        if (!await inp.isVisible()) continue;
        const ph = (await inp.getAttribute('placeholder') || '').toLowerCase();
        const nm = (await inp.getAttribute('name') || '').toLowerCase();
        const combined = ph + nm;

        let val = '';
        if (combined.includes('exp') || combined.includes('year')) val = P.exp;
        else if (combined.includes('current') && (combined.includes('ctc') || combined.includes('salary'))) val = P.ctc;
        else if (combined.includes('expected') || combined.includes('expect')) val = P.expected;
        else if (combined.includes('notice')) val = P.notice;
        else if (combined.includes('phone') || combined.includes('mobile')) val = P.phone;
        else if (combined.includes('email')) val = P.email;
        else if (combined.includes('name')) val = P.name;
        else if (combined.includes('linkedin')) val = P.linkedin;

        if (val) {
          const current = await inp.inputValue();
          if (!current) { await inp.fill(val); console.log(`  ✅ Filled: ${combined || 'field'}`); }
        }
      } catch {}
    }

    // Click "Yes" buttons for any yes/no questions
    try {
      const yesBtns = await page.$$('button:has-text("Yes"), input[value="Yes"], label:has-text("Yes")');
      for (const btn of yesBtns) {
        if (await btn.isVisible().catch(() => false)) {
          await btn.click().catch(() => {});
        }
      }
    } catch {}

    // Upload resume if file input appears
    try {
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(CV_PDF);
        console.log('  📎 Resume uploaded!');
      }
    } catch {}

    // Click "Next" or "Continue" to move through chatbot steps
    const nextClicked = await clickButton(page, ['Next', 'Continue', 'Save & Continue']);
    if (!nextClicked) break;
    await sleep(2000);
  }
}

async function clickButton(page, texts) {
  for (const text of texts) {
    try {
      const btn = page.locator(`button:has-text("${text}"), a:has-text("${text}")`).first();
      if (await btn.isVisible({ timeout: 1000 })) {
        await btn.click();
        console.log(`  🖱️  Clicked: ${text}`);
        return true;
      }
    } catch {}
  }
  return false;
}

// ── Apply to one job ──────────────────────────────────────────────
async function applyToJob(job, idx, total) {
  console.log('\n' + '═'.repeat(65));
  console.log(`🚀  JOB ${idx}/${total}`);
  console.log(`    Company: ${job.company || '(unknown)'}`);
  console.log(`    Role   : ${job.title}`);
  console.log(`    Easy   : ${job.hasEasyApply ? '✅ YES' : '⚠️ Maybe'}`);
  console.log(`    URL    : ${job.href.slice(0, 70)}...`);
  console.log('═'.repeat(65));

  const context = await chromium.launchPersistentContext(USER_DATA, {
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  const stop = { done: false };
  
  // Watch for new tabs (company site redirects)
  context.on('page', async newPage => {
    await sleep(1500);
    const url = newPage.url();
    if (url && !url.startsWith('chrome://')) {
      console.log(`  📄 New tab: ${url.slice(0, 80)}`);
      // Try to fill whatever form is on the new tab
      newPage.once('load', async () => {
        await sleep(2000);
        await fillNewTabForm(newPage, job);
      });
    }
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto(job.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);

  // Click Apply
  const applyTexts = ['Apply', 'Apply Now', 'Apply now', 'Easy Apply'];
  let applied = false;
  for (const text of applyTexts) {
    try {
      const btn = page.locator(`button:has-text("${text}")`).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        console.log(`  🖱️  Clicked: ${text}`);
        applied = true;
        await sleep(3000);
        break;
      }
    } catch {}
  }
  if (!applied) console.log('  ⚠️  No Apply button found — form may already be visible');

  // Fill Naukri modal if it appeared
  await fillNaukriModal(page);

  // Screenshot
  const shot = path.join(ROOT, `output/job${idx}-apply.png`);
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  console.log(`  📸 Screenshot: output/job${idx}-apply.png`);

  // Keep polling for new fields
  ;(async () => {
    while (!stop.done) {
      if (context.pages().length === 0) break;
      try { await fillNaukriModal(page); } catch {}
      await sleep(3000);
    }
  })();

  console.log('\n⚡'.repeat(32));
  console.log('  👉 REVIEW the browser — check all answers are correct');
  console.log('  👉 Complete any remaining chatbot questions manually');
  console.log('  👉 Click SUBMIT / Apply on the final step');
  console.log('  👉 CLOSE the browser window to open the next job');
  console.log('⚡'.repeat(32) + '\n');

  await new Promise(resolve => context.on('close', resolve));
  stop.done = true;
  await context.close().catch(() => {});
  console.log(`  ✅ Job ${idx} done!\n`);
}

async function fillNewTabForm(page, job) {
  const fields = await page.$$('input, textarea');
  if (fields.length === 0) {
    // Email-only page — note the email
    const bodyText = await page.innerText('body').catch(() => '');
    const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatch) {
      console.log(`  📧 Email-only application page. Send CV to: ${[...new Set(emailMatch)].join(', ')}`);
    }
    return;
  }

  for (const field of fields) {
    try {
      if (!await field.isVisible()) continue;
      const ph = (await field.getAttribute('placeholder') || '').toLowerCase();
      const nm = (await field.getAttribute('name') || '').toLowerCase();
      const combined = ph + nm;
      let val = '';
      if (combined.includes('name')) val = P.name;
      else if (combined.includes('email')) val = P.email;
      else if (combined.includes('phone') || combined.includes('mobile')) val = P.phone;
      else if (combined.includes('linkedin')) val = P.linkedin;
      if (val) await field.fill(val).catch(() => {});
    } catch {}
  }

  // Upload CV
  try {
    const fi = await page.$('input[type="file"]');
    if (fi) { await fi.setInputFiles(CV_PDF); console.log('  📎 Resume uploaded on company page!'); }
  } catch {}
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎯 Naukri Easy Apply — Scan + Auto-Fill\n');
  
  if (!fs.existsSync(CV_PDF)) {
    console.error(`❌ CV not found: ${CV_PDF}`); process.exit(1);
  }
  console.log(`✅ CV: ${path.basename(CV_PDF)}\n`);

  // Scan with persistent context (logged-in session)
  const scanCtx = await chromium.launchPersistentContext(USER_DATA, {
    headless: false, viewport: null, args: ['--start-maximized'],
  });
  const scanPage = scanCtx.pages()[0] || await scanCtx.newPage();
  const jobs = await scanForEasyApply(scanPage);
  await scanCtx.close();

  console.log(`\n📋 Found ${jobs.length} jobs:\n`);
  jobs.forEach((j, i) => {
    console.log(`  ${i+1}. [${j.hasEasyApply ? '✅ Easy' : '🔗 Ext '}] ${j.company || '?'} — ${j.title}`);
  });

  if (jobs.length === 0) {
    console.log('❌ No jobs found. Check your Naukri login or try again.');
    return;
  }

  // Pick top 3
  const top3 = jobs.slice(0, 3);
  console.log(`\n🚀 Applying to top ${top3.length} jobs. Starting in 3s...\n`);
  await sleep(3000);

  for (let i = 0; i < top3.length; i++) {
    await applyToJob(top3[i], i + 1, top3.length);
    if (i < top3.length - 1) { console.log('⏳ Next opens in 3s...\n'); await sleep(3000); }
  }

  console.log('\n🎉 ALL DONE! Run: node merge-tracker.mjs to update tracker.\n');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
