// auto-apply-naukri.mjs — MANUS EDITION
// Handles all 4 Naukri apply flows:
//   1. Easy Apply
//   2. Naukri Apply Modal
//   3. External Redirect — same tab OR new tab → MANUS VISION LOOP
//   4. Chatbot Apply
//
// ── UPGRADES ──────────────────────────────────────────────────────────────────
//   ✅ Stealth browser
//   ✅ New-tab detection (Apply on Company Site)
//   ✅ Gemini AI replaces Claude API
//   ✅ Manus-style continuous vision loop for external forms
//   ✅ Chatbot auto-responder
//   ✅ Gmail OTP reader

import { stealthPersistent } from './stealth-browser.mjs';
import { manusApply } from './manus-apply.mjs';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// ── Load .env ─────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const env = fs.readFileSync('.env', 'utf8');
    env.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    });
  } catch {}
}
loadEnv();

// ── Config ────────────────────────────────────────────────────────────────────

const CANDIDATE = {
  fullName:     'Varun Pavan Sai Chadalavada',
  firstName:    'Varun',
  lastName:     'Pavan Sai Chadalavada',
  email:        'varunpavan45@gmail.com',
  phone:        '8688128008',
  location:     'Hyderabad',
  linkedin:     'https://www.linkedin.com/in/varun-pavan-4b43b2214/',
  github:       'https://github.com/Varunpavan',
  experience:   '0',
  ctc:          '0',
  expectedCtc:  '400000',
  noticePeriod: '0',
  skills:       'HTML, CSS, Bootstrap, JavaScript, React.js, TypeScript, REST APIs, AWS, Figma',
};

function findLatestCV() {
  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) return null;
  const pdfs = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.pdf') && f.includes('varun'))
    .map(f => ({ file: f, mtime: fs.statSync(path.join(outputDir, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);
  return pdfs.length > 0 ? path.join(outputDir, pdfs[0].file) : null;
}

const TSV_PATH     = path.resolve('data/india-jobs.tsv');
const PROFILE_PATH = path.resolve('data/naukri-profile');

// ── TSV helpers ───────────────────────────────────────────────────────────────

function parseTSV(raw) {
  const lines = raw.trim().split('\n');
  const headers = lines[0].split('\t');
  return lines.slice(1).filter(Boolean).map(line => {
    const cols = line.split('\t');
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
  });
}

function updateTSVStatus(url, newStatus) {
  const raw = fs.readFileSync(TSV_PATH, 'utf8');
  const updated = raw.split('\n').map(line => {
    if (line.startsWith(url + '\t')) {
      const cols = line.split('\t');
      cols[5] = newStatus;
      return cols.join('\t');
    }
    return line;
  }).join('\n');
  fs.writeFileSync(TSV_PATH, updated, 'utf8');
}

function appendToLog(entry) {
  const logPath = path.resolve('data/apply-log.tsv');
  const line = [entry.url, entry.title, entry.company, entry.result, entry.flow, new Date().toISOString()].join('\t');
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, 'url\ttitle\tcompany\tresult\tflow\ttimestamp\n');
  }
  fs.appendFileSync(logPath, line + '\n');
}

// ── User input ────────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ── Fill field ────────────────────────────────────────────────────────────────

async function fillField(page, selector, value) {
  try {
    const el = await page.$(selector);
    if (!el) return false;
    await el.click({ clickCount: 3, timeout: 2000 }).catch(() => {});
    await el.fill('', { timeout: 2000 });
    await el.type(value, { delay: 40, timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// ── Selector-based form fill (fast pass before Manus) ─────────────────────────

async function selectorFill(page, cvPath) {
  const allContexts = [page, ...page.frames()];
  let filled = 0;
  for (const ctx of allContexts) {
    try {
      for (const sel of ['input[name*="name" i][name*="full" i]', 'input[placeholder*="full name" i]', 'input[id*="fullName" i]'])
        if (await fillField(ctx, sel, CANDIDATE.fullName)) { filled++; break; }
      for (const sel of ['input[name*="firstName" i]', 'input[id*="firstName" i]', 'input[placeholder*="first name" i]'])
        if (await fillField(ctx, sel, CANDIDATE.firstName)) { filled++; break; }
      for (const sel of ['input[name*="lastName" i]', 'input[id*="lastName" i]', 'input[placeholder*="last name" i]'])
        if (await fillField(ctx, sel, CANDIDATE.lastName)) { filled++; break; }
      for (const sel of ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]'])
        if (await fillField(ctx, sel, CANDIDATE.email)) { filled++; break; }
      for (const sel of ['input[type="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]', 'input[id*="phone" i]'])
        if (await fillField(ctx, sel, CANDIDATE.phone)) { filled++; break; }
      for (const sel of ['input[name*="city" i]', 'input[name*="location" i]', 'input[placeholder*="city" i]'])
        if (await fillField(ctx, sel, CANDIDATE.location)) { filled++; break; }
      for (const sel of ['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]'])
        if (await fillField(ctx, sel, CANDIDATE.linkedin)) { filled++; break; }

      if (cvPath) {
        const fileInputs = await ctx.$$('input[type="file"]');
        for (const fi of fileInputs) {
          try { await fi.setInputFiles(cvPath); console.log(`   📎 CV uploaded`); filled++; break; } catch {}
        }
      }
    } catch {}
  }
  return filled;
}

// ── Detect apply flow (same-tab) ──────────────────────────────────────────────

async function detectApplyFlow(page) {
  await page.waitForTimeout(3000);
  const url = page.url();
  if (!url.includes('naukri.com')) return 'external';
  const easy = await page.$('button:has-text("Apply"), button[class*="easyApply"], .easy-apply-confirm');
  if (easy) {
    const t = (await easy.innerText().catch(() => '')).toLowerCase();
    if (t.includes('apply') || t.includes('confirm')) return 'easy';
  }
  const modal = await page.$('.apply-modal, [class*="applyModal"], .applicationForm, [class*="application-form"], form[class*="apply"]');
  if (modal) return 'modal';
  const chatbot = await page.$('[class*="chatbot"], [class*="ConversationalApply"]');
  if (chatbot) return 'chatbot';
  return 'unknown';
}

// ── Easy Apply ────────────────────────────────────────────────────────────────

async function handleEasyApply(page) {
  console.log('   📋 Flow: Easy Apply');
  const reviewBtn = await page.$('button:has-text("Review"), button:has-text("Continue"), button:has-text("Confirm")');
  if (reviewBtn) { await reviewBtn.click({ force: true }); await page.waitForTimeout(2000); }
  const applyBtn = await page.$('button:has-text("Apply"), button[class*="submit"], button[class*="apply"]');
  if (applyBtn) {
    await applyBtn.click({ force: true });
    await page.waitForTimeout(3000);
    const body = await page.evaluate(() => document.body.innerText);
    if (body.toLowerCase().match(/applied|success|thank/)) {
      console.log('   ✅ Easy Apply submitted!');
      return 'applied';
    }
  }
  return 'applied';
}

// ── Modal Apply ───────────────────────────────────────────────────────────────

async function handleModalApply(page, cvPath) {
  console.log('   📋 Flow: Naukri Apply Form');
  let step = 0;
  let lastContent = '';
  while (step < 10) {
    step++;
    const content = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (step > 1 && content === lastContent) { console.log('   ⚠️  Form stuck'); break; }
    lastContent = content;
    await selectorFill(page, cvPath);
    await page.waitForTimeout(1000);
    const btns = ['button:has-text("Submit")', 'button:has-text("Apply")', 'button:has-text("Next")', 'button:has-text("Continue")', 'button[type="submit"]'];
    let clicked = false;
    for (const sel of btns) {
      try {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible()) {
          await btn.click({ force: true }); await page.waitForTimeout(2500); clicked = true;
          const body = await page.evaluate(() => document.body.innerText).catch(() => '');
          if (body.toLowerCase().match(/applied|success|thank/)) { console.log('   ✅ Submitted!'); return 'applied'; }
          const modal = await page.$('.apply-modal, [class*="applyModal"], .applicationForm');
          if (!modal) { console.log('   ✅ Form closed.'); return 'applied'; }
          break;
        }
      } catch {}
    }
    if (!clicked) break;
  }
  console.log('   ⚠️  Bypassing manual prompt in auto mode. Marking as manual-review.');
  return 'manual-review';
}

// ── External: Manus Vision Loop ───────────────────────────────────────────────
// This is the main upgrade — uses continuous Gemini vision instead of
// one-shot selector fills. Works like Manus AI.

async function handleExternal(page, cvPath, job) {
  const externalUrl = page.url();
  const hostname = new URL(externalUrl).hostname;
  console.log(`\n   📋 Flow: External — ${hostname}`);
  console.log('   🚀 Launching Manus-style vision loop...');

  await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Step 1: Fast selector fill first (instant, no API cost)
  const quickFilled = await selectorFill(page, cvPath);
  if (quickFilled > 0) {
    console.log(`   ⚡ Quick fill: ${quickFilled} fields filled by selector`);
    await page.waitForTimeout(1000);
  }

  // Step 2: Manus vision loop takes over
  const result = await manusApply(page, CANDIDATE, cvPath);

  if (result.submitted) {
    console.log('   🎉 Manus fully automated this application!');
    return 'applied-external';
  }

  // Step 3: If Manus couldn't fully submit, log it and return 'manual-review'
  console.log('\n   ⚠️  Manus completed as much as it could.');
  console.log(`   Browser is open on: ${hostname}`);
  console.log(`   Steps taken: ${result.steps}`);
  console.log('   ⏭️ Bypassing manual prompt in auto mode. Marking as manual-review.');
  return 'manual-review';
}

// ── Chatbot Apply ─────────────────────────────────────────────────────────────

async function handleChatbot(page, cvPath) {
  console.log('   🤖 Chatbot Apply — auto-responding...');
  const ANSWERS = [
    { pattern: /how many years|years of experience/i, answer: '0' },
    { pattern: /current.*location|which city/i,       answer: 'Hyderabad' },
    { pattern: /relocate|willing to/i,                answer: 'yes' },
    { pattern: /notice period|when can you join/i,    answer: 'Immediate' },
    { pattern: /current.*ctc|current.*salary/i,       answer: '0' },
    { pattern: /expected.*ctc|salary expectation/i,   answer: '4 LPA' },
    { pattern: /react|javascript|frontend/i,          answer: 'Yes, I have hands-on React.js and JavaScript experience' },
    { pattern: /tech.*stack|skills/i,                 answer: 'HTML, CSS, JavaScript, React.js, TypeScript, REST APIs, AWS' },
    { pattern: /phone|mobile/i,                       answer: '8688128008' },
    { pattern: /email/i,                              answer: 'varunpavan45@gmail.com' },
    { pattern: /are you|do you|have you|can you/i,    answer: 'yes' },
  ];
  let round = 0;
  while (round < 15) {
    round++;
    await page.waitForTimeout(2000);
    const body = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (body.toLowerCase().match(/thank you|submitted|successfully applied/)) {
      console.log('   ✅ Chatbot submitted!'); return 'applied-chatbot';
    }
    if (cvPath) {
      const fi = await page.$('input[type="file"]').catch(() => null);
      if (fi) { await fi.setInputFiles(cvPath).catch(() => {}); await page.waitForTimeout(1500); continue; }
    }
    const msg = await page.evaluate(() => {
      const sels = ['[class*="chatbot"] p', '[class*="ConversationalApply"] p', '[class*="question-text"]'];
      for (const s of sels) { const m = document.querySelectorAll(s); if (m.length) return m[m.length-1].textContent.trim(); }
      return '';
    }).catch(() => '');
    let answer = 'yes';
    if (msg) {
      console.log(`   💬 Bot: "${msg.substring(0, 70)}"`);
      for (const { pattern, answer: a } of ANSWERS) if (pattern.test(msg)) { answer = a; break; }
    }
    const input = await page.$('[class*="chatbot"] input[type="text"], [class*="ConversationalApply"] input[type="text"]').catch(() => null);
    if (input) {
      await input.fill(answer);
      const send = await page.$('button[type="submit"], button:has-text("Send"), button:has-text("Next")').catch(() => null);
      if (send) await send.click(); else await input.press('Enter');
      console.log(`   → "${answer}"`); continue;
    }
    const opts = await page.$$('[class*="chatbot"] button:visible').catch(() => []);
    if (opts.length) {
      let clicked = false;
      for (const b of opts) {
        const t = (await b.innerText().catch(() => '')).toLowerCase();
        if (t.includes('yes') || t.includes('immediate') || t.includes('hyderabad')) { await b.click(); clicked = true; break; }
      }
      if (!clicked) await opts[0].click();
      continue;
    }
    break;
  }
  console.log('   ⚠️  Bypassing manual prompt in auto mode. Marking as manual-review.');
  return 'manual-review';
}

// ── Apply to one job ──────────────────────────────────────────────────────────

async function applyToJob(page, job, cvPath) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📌 ${job.title || '(unknown)'}`);
  console.log(`🏢 ${job.company || '(unknown)'}`);
  console.log(`📍 ${job.location || ''}`);
  console.log(`🔗 ${job.url}`);
  console.log('─'.repeat(60));

  console.log('\n   🚀 Auto-applying...');

  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        break;
      } catch {
        if (attempt === 2) throw new Error('Navigation failed after 2 attempts');
        console.log('   ⚠️  Retrying navigation...');
        await page.waitForTimeout(3000);
      }
    }
    await page.waitForTimeout(2500);

    // Find Apply button
    const applySelectors = [
      'button#apply-button', 'a#apply-button', 'button[id*="apply" i]',
      'button:has-text("Apply")', 'a:has-text("Apply")',
      '.apply-message button', '[data-ga-track*="apply"]',
      '#already-applied', '.already-applied', 'span:has-text("Applied")', 'span:has-text("Already Applied")'
    ];

    let applyBtn = null;
    for (const sel of applySelectors) {
      try {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible()) {
          const text = await btn.innerText().catch(() => '');
          const tl = text.toLowerCase().trim();
          if (tl === 'applied' || tl.startsWith('applied') || tl.includes('already applied')) {
            console.log(`   ⚠️  Already applied (button: "${text.trim()}")`);
            return 'already-applied';
          }
          applyBtn = btn;
          console.log(`   🖱️  Found: "${text.trim()}"`);
          break;
        }
      } catch {}
    }

    if (!applyBtn) {
      console.log('   ⚠️  Apply button not found. Bypassing manual prompt in auto mode.');
      return 'manual-review';
    }

    // ── NEW TAB FIX + MANUS ──────────────────────────────────────────────────
    // Listen for new tab before clicking — Naukri opens company sites in new tab
    const context = page.context();
    const newTabPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);

    await applyBtn.click({ force: true });
    console.log('   🖱️  Clicked Apply. Watching for new tab...');

    const newTab = await newTabPromise;

    if (newTab) {
      await newTab.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
      await newTab.waitForTimeout(2000);
      const newUrl = newTab.url();

      if (newUrl && newUrl !== 'about:blank' && !newUrl.includes('naukri.com')) {
        console.log(`   🔗 New tab → ${new URL(newUrl).hostname}`);
        const result = await handleExternal(newTab, cvPath, job);
        await newTab.close().catch(() => {});
        return result;
      } else {
        await newTab.close().catch(() => {});
      }
    }

    // Same-tab flow detection
    const flow = await detectApplyFlow(page);
    console.log(`   🔍 Flow: ${flow}`);

    if (flow === 'easy')          return await handleEasyApply(page);
    if (flow === 'modal')         return await handleModalApply(page, cvPath);
    if (flow === 'external')      return await handleExternal(page, cvPath, job);
    if (flow === 'chatbot')       return await handleChatbot(page, cvPath);

    console.log('   ⚠️  Unknown flow. Bypassing manual prompt in auto mode.');
    return 'manual-review';

  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return 'error';
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   NAUKRI AUTO-APPLY  (Manus Edition 🤖)    ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Check Gemini key
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  GEMINI_API_KEY not found in .env');
    console.log('   Get a free key at: https://aistudio.google.com/app/apikey');
    console.log('   Then add to .env: GEMINI_API_KEY=your-key-here\n');
  } else {
    console.log('✅ Gemini API key found\n');
  }

  const cvPath = findLatestCV();
  console.log(cvPath ? `📄 CV: ${path.basename(cvPath)}` : '⚠️  No CV found in output/');

  if (!fs.existsSync(TSV_PATH)) {
    console.error(`❌ ${TSV_PATH} not found. Run scan-all.mjs first.`);
    process.exit(1);
  }

  const targetUrl = process.argv[2];
  const rows = parseTSV(fs.readFileSync(TSV_PATH, 'utf8'));
  const jobs = rows.filter(r => {
    const url = r.url || '';
    const status = (r.status || '').toLowerCase();
    if (targetUrl) return url.split('?')[0] === targetUrl.split('?')[0];
    return url.includes('naukri.com') && (status === 'added' || status === '');
  });

  console.log(`\n📋 ${jobs.length} Naukri jobs pending\n`);
  if (jobs.length === 0) { console.log('Nothing to apply. Run scan-all.mjs first.'); process.exit(0); }

  if (!fs.existsSync(PROFILE_PATH)) {
    console.error(`❌ Naukri session not found at ${PROFILE_PATH}`);
    process.exit(1);
  }

  console.log('🚀 Launching stealth browser...');
  const browser = await stealthPersistent(PROFILE_PATH, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  console.log('🔐 Checking Naukri login...');
  await page.goto('https://www.naukri.com/', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});

  let loggedIn = false;
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    loggedIn = await page.evaluate(() =>
      !!document.querySelector('.nI-gNb-lcm-lnk, .user-name, [class*="loggedIn"], [class*="logged-in"]') ||
      document.location.pathname.includes('/homepage') ||
      document.location.pathname.includes('/mnjuser')
    ).catch(() => false);
    if (loggedIn) break;
  }

  if (!loggedIn) {
    console.log('\n⚠️  Not logged in. Please log in to Naukri...');
    await page.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(3000);
      loggedIn = await page.evaluate(() =>
        !!document.querySelector('.nI-gNb-lcm-lnk, .user-name, [class*="loggedIn"]') ||
        document.location.pathname.includes('/homepage')
      ).catch(() => false);
      if (loggedIn) break;
    }
    if (!loggedIn) { console.error('❌ Login failed.'); await browser.close(); process.exit(1); }
    console.log('✅ Logged in!\n');
  } else {
    console.log('✅ Logged in!\n');
  }

  let applied = 0, skipped = 0, alreadyApplied = 0, errors = 0;

  for (const job of jobs) {
    try {
      // Re-create the page if it has been closed by previous activities/errors
      if (page.isClosed()) {
        console.log('   🔄 Browser page was closed. Reopening new page...');
        page = await browser.newPage();
      }

      const url = job.url || '';
      const title = (job.title || '').toLowerCase();

      // Check experience requirement in URL
      const expMatch = url.match(/-(\d+)-to-(\d+)-years/);
      let shouldSkip = false;
      let skipReason = '';

      if (expMatch) {
        const minExp = parseInt(expMatch[1], 10);
        if (minExp >= 3) {
          shouldSkip = true;
          skipReason = `requires ${minExp}+ years experience`;
        }
      }

      const negatives = ['senior', 'lead', 'manager', 'principal', 'architect', 'sr.'];
      const hasNegative = negatives.some(kw => title.includes(kw));
      if (hasNegative) {
        shouldSkip = true;
        skipReason = 'senior title';
      }

      if (shouldSkip) {
        console.log(`\n⏭️  Skipping non-fresher job: "${job.title}" @ ${job.company} (${skipReason})`);
        updateTSVStatus(job.url, 'skipped');
        appendToLog({ ...job, result: 'skipped', flow: 'skipped' });
        skipped++;
        continue;
      }

      const result = await applyToJob(page, job, cvPath);
      if (result === 'quit') { console.log('\n👋 Quitting.'); break; }

      const tsvStatus =
        result === 'skipped'         ? 'skipped' :
        result.startsWith('applied') ? 'applied' :
        result === 'already-applied' ? 'already-applied' :
        'manual-review';

      updateTSVStatus(job.url, tsvStatus);
      appendToLog({ ...job, result, flow: tsvStatus });

      if (result.startsWith('applied'))   { console.log('   ✅ applied'); applied++; }
      else if (result === 'skipped')      { skipped++; }
      else if (result === 'already-applied') { console.log('   ℹ️  already-applied'); alreadyApplied++; }
      else                                { errors++; }

      if (!page.isClosed()) {
        await page.waitForTimeout(1200).catch(() => {});
      }
    } catch (err) {
      console.log(`   ❌ Iteration error: ${err.message}`);
      errors++;
      try {
        updateTSVStatus(job.url, 'manual-review');
        appendToLog({ ...job, result: 'error', flow: 'manual-review' });
      } catch {}
    }
  }

  await browser.close();

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`  ✅ Applied:         ${applied}`);
  console.log(`  ⏭️  Skipped:         ${skipped}`);
  console.log(`  ℹ️  Already Applied: ${alreadyApplied}`);
  console.log(`  ⚠️  Manual/Errors:   ${errors}`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\n💡 Run sync-status.mjs to update applications.md');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
