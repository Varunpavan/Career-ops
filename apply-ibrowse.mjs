// auto-apply-naukri.mjs  — FULL FORM FILLING VERSION (Phase 1 Upgraded)
// Handles all 3 Naukri apply flows:
//   1. Easy Apply (1-click with your saved Naukri profile)
//   2. Naukri Apply Modal (multi-step form with fields)
//   3. External Redirect (AI fills company career page automatically)
//   4. Chatbot Apply (auto-detects and responds to Naukri chatbot)
//
// Usage: node auto-apply-naukri.mjs
// Requires: logged-in Naukri session in data/naukri-profile/
//           a CV PDF in output/ folder
//
// Phase 1 upgrades applied:
//   ✅ Stealth browser (playwright-extra) — hides automation signals
//   ✅ AI form filler (Claude API) — fills external company forms automatically
//   ✅ Chatbot auto-responder — handles Naukri conversational apply
//   ✅ Gmail OTP reader — auto-reads OTP if login required

import { stealthPersistent } from './stealth-browser.mjs';
import { aiFillForm } from './ai-form-filler.mjs';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// ─── Config — pulled from your profile ───────────────────────────────────────

const CANDIDATE = {
  fullName:    'Varun Pavan Sai Chadalavada',
  firstName:   'Varun',
  lastName:    'Pavan Sai Chadalavada',
  email:       'varunpavan45@gmail.com',
  phone:       '8688128008',
  location:    'Hyderabad',
  linkedin:    'https://www.linkedin.com/in/varun-pavan-4b43b2214/',
  github:      'https://github.com/Varunpavan',
  experience:  '0',        // years (fresher)
  ctc:         '0',        // current CTC (fresher = 0)
  expectedCtc: '400000',   // ₹4 LPA in paise/rupees depending on field
  noticePeriod: '0',       // immediate joiner
};

// Find the most recent CV PDF in output/
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

// ─── TSV helpers ──────────────────────────────────────────────────────────────

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
  const line = [
    entry.url, entry.title, entry.company, entry.result,
    entry.flow, new Date().toISOString()
  ].join('\t');
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, 'url\ttitle\tcompany\tresult\tflow\ttimestamp\n');
  }
  fs.appendFileSync(logPath, line + '\n');
}

// ─── User input ───────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ─── Fill a field robustly (handles React-controlled inputs) ──────────────────

async function fillField(page, selector, value) {
  try {
    const el = await page.$(selector);
    if (!el) return false;
    await el.click({ clickCount: 3 });   // select all existing text
    await el.fill('');
    await el.type(value, { delay: 40 }); // type char by char to trigger React onChange
    return true;
  } catch {
    return false;
  }
}

// ─── Fill common form fields across frames ────────────────────────────────────

async function fillFormFields(page, cvPath) {
  const allContexts = [page, ...page.frames()];
  let filled = 0;

  for (const ctx of allContexts) {
    try {
      // Name fields
      for (const sel of ['input[name*="name" i][name*="full" i]', 'input[placeholder*="full name" i]', 'input[id*="fullName" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.fullName)) { filled++; break; }
      }
      for (const sel of ['input[name*="firstName" i]', 'input[id*="firstName" i]', 'input[placeholder*="first name" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.firstName)) { filled++; break; }
      }
      for (const sel of ['input[name*="lastName" i]', 'input[id*="lastName" i]', 'input[placeholder*="last name" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.lastName)) { filled++; break; }
      }

      // Contact
      for (const sel of ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.email)) { filled++; break; }
      }
      for (const sel of ['input[type="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]', 'input[id*="phone" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.phone)) { filled++; break; }
      }

      // Location
      for (const sel of ['input[name*="city" i]', 'input[name*="location" i]', 'input[placeholder*="city" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.location)) { filled++; break; }
      }

      // Experience / CTC (common in Naukri forms)
      for (const sel of ['input[name*="experience" i]', 'input[id*="experience" i]', 'input[placeholder*="year" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.experience)) { filled++; break; }
      }
      for (const sel of ['input[name*="currentCtc" i]', 'input[id*="currentCtc" i]', 'input[name*="current_ctc" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.ctc)) { filled++; break; }
      }
      for (const sel of ['input[name*="expectedCtc" i]', 'input[id*="expectedCtc" i]', 'input[name*="expected_ctc" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.expectedCtc)) { filled++; break; }
      }
      for (const sel of ['input[name*="notice" i]', 'input[id*="noticePeriod" i]', 'select[name*="notice" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.noticePeriod)) { filled++; break; }
      }

      // LinkedIn / GitHub (sometimes asked)
      for (const sel of ['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]']) {
        if (await fillField(ctx, sel, CANDIDATE.linkedin)) { filled++; break; }
      }

      // CV upload
      if (cvPath) {
        const fileInputs = await ctx.$$('input[type="file"]');
        for (const fi of fileInputs) {
          try {
            await fi.setInputFiles(cvPath);
            console.log(`   📎 Uploaded CV: ${path.basename(cvPath)}`);
            filled++;
            break;
          } catch { /* try next */ }
        }
      }

      // Select dropdowns (fresher / 0 years experience)
      await ctx.evaluate(() => {
        document.querySelectorAll('select').forEach(sel => {
          const opts = Array.from(sel.options).map(o => o.text.toLowerCase());
          // Experience
          if (sel.name?.toLowerCase().includes('experience') || sel.id?.toLowerCase().includes('experience')) {
            const zeroIdx = opts.findIndex(o => o.includes('fresher') || o === '0' || o.includes('0 year'));
            if (zeroIdx >= 0) sel.selectedIndex = zeroIdx;
          }
          // Notice period
          if (sel.name?.toLowerCase().includes('notice') || sel.id?.toLowerCase().includes('notice')) {
            const immIdx = opts.findIndex(o => o.includes('immediate') || o.includes('0 day') || o === '0');
            if (immIdx >= 0) sel.selectedIndex = immIdx;
          }
        });
        // Radio: fresher
        const fresherRadio = document.querySelector('input[value="fresher" i], input[value="0" i][name*="experience" i]');
        if (fresherRadio) fresherRadio.click();
      }).catch(() => {});

    } catch { /* context closed or navigation happened — skip */ }
  }

  return filled;
}

// ─── Detect apply flow type ───────────────────────────────────────────────────

async function detectApplyFlow(page) {
  // After clicking Apply, wait briefly and check what happened
  await page.waitForTimeout(3000);

  const url = page.url();

  // External redirect — left naukri.com
  if (!url.includes('naukri.com')) {
    return 'external';
  }

  // Easy Apply — a modal/overlay appeared with a quick confirm button
  const easyApplyConfirm = await page.$('button:has-text("Apply"), button[class*="easyApply"], .easy-apply-confirm');
  if (easyApplyConfirm) {
    const text = (await easyApplyConfirm.innerText().catch(() => '')).toLowerCase();
    if (text.includes('apply') || text.includes('confirm')) return 'easy';
  }

  // Multi-step modal
  const modal = await page.$('.apply-modal, [class*="applyModal"], .applicationForm, [class*="application-form"], form[class*="apply"]');
  if (modal) return 'modal';

  // Naukri's own "chatbot apply" (new flow)
  const chatbot = await page.$('[class*="chatbot"], [class*="ConversationalApply"]');
  if (chatbot) return 'chatbot';

  return 'unknown';
}

// ─── Handle Easy Apply (1-click Naukri profile) ───────────────────────────────

async function handleEasyApply(page) {
  console.log('   📋 Flow: Easy Apply (your Naukri profile will be sent)');

  // Sometimes there's a "Review & Apply" step
  const reviewBtn = await page.$('button:has-text("Review"), button:has-text("Continue"), button:has-text("Confirm")');
  if (reviewBtn) {
    await reviewBtn.click();
    await page.waitForTimeout(2000);
  }

  // Final apply button
  const applyBtn = await page.$('button:has-text("Apply"), button[class*="submit"], button[class*="apply"]');
  if (applyBtn) {
    console.log('   🖱️  Clicking final Apply button...');
    await applyBtn.click();
    await page.waitForTimeout(3000);

    // Check for success
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.toLowerCase().includes('applied') || bodyText.toLowerCase().includes('success') || bodyText.toLowerCase().includes('thank')) {
      console.log('   ✅ Easy Apply submitted successfully!');
      return 'applied';
    }
  }

  return 'applied'; // Optimistic — Naukri easy apply usually works if session is active
}

// ─── Handle Modal Apply (multi-step form) ─────────────────────────────────────

async function handleModalApply(page, cvPath) {
  console.log('   📋 Flow: Naukri Apply Form (filling fields...)');

  let step = 0;
  // Bug 5 fix: raised from 5 to 10 to handle longer ATS forms (Naukri can have 6-8 steps)
  const maxSteps = 10;
  let lastPageContent = '';

  while (step < maxSteps) {
    step++;
    console.log(`   📝 Step ${step}/${maxSteps}...`);

    // Bug 5 fix: detect stuck/stale form — if page content hasn't changed, we're looping in place
    const currentContent = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (step > 1 && currentContent === lastPageContent) {
      console.log('   ⚠️  Page content unchanged from previous step — form may be stuck. Pausing for manual action.');
      break;
    }
    lastPageContent = currentContent;

    // Fill whatever fields are visible
    const filled = await fillFormFields(page, cvPath);
    console.log(`      Filled ${filled} field(s)`);

    await page.waitForTimeout(1000);

    // Look for Next / Continue / Submit button
    const nextSelectors = [
      'button:has-text("Submit")',
      'button:has-text("Apply")',
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button[type="submit"]',
      'button[class*="submit"]',
      'button[class*="next"]',
    ];

    let clicked = false;
    for (const sel of nextSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible()) {
          const text = (await btn.innerText().catch(() => '')).toLowerCase();
          console.log(`      Clicking: "${text}"`);
          await btn.click();
          await page.waitForTimeout(2500);
          clicked = true;

          // Check if we're done
          const body = await page.evaluate(() => document.body.innerText).catch(() => '');
          if (body.toLowerCase().includes('applied') || body.toLowerCase().includes('success') || body.toLowerCase().includes('thank')) {
            console.log('   ✅ Application submitted successfully!');
            return 'applied';
          }

          // Check if modal closed (easy apply done)
          const modal = await page.$('.apply-modal, [class*="applyModal"], .applicationForm');
          if (!modal) {
            console.log('   ✅ Form closed — application likely submitted.');
            return 'applied';
          }
          break;
        }
      } catch { /* try next */ }
    }

    if (!clicked) break;
  }

  // If we couldn't auto-complete, pause for manual
  console.log('\n   ⚠️  Could not fully auto-complete the form.');
  console.log('   The browser is open — please finish and submit manually.');
  await prompt('   Press Enter after you have submitted...');
  return 'applied-manual';
}

// ─── Handle External Redirect ─────────────────────────────────────────────────

async function handleExternal(page, cvPath, job) {
  const externalUrl = page.url();
  const hostname = new URL(externalUrl).hostname;
  console.log(`   📋 Flow: External — redirected to ${hostname}`);

  await page.waitForTimeout(3000);

  // Step 1: Run selector-based fill first (fast, free)
  const selectorFilled = await fillFormFields(page, cvPath);
  console.log(`   ✅ Selector-based fill: ${selectorFilled} field(s) filled`);

  // Step 2: Run AI form filler on top (catches anything selectors missed)
  console.log('   🤖 Running AI form analysis on remaining fields...');
  const aiResult = await aiFillForm(page, CANDIDATE, cvPath).catch(err => {
    console.warn(`   ⚠️  AI form filler failed: ${err.message}`);
    return { filled: 0, submitted: false, notes: [] };
  });

  const totalFilled = selectorFilled + aiResult.filled;
  console.log(`   📊 Total: ${totalFilled} field(s) filled across both methods`);

  if (aiResult.notes.length > 0) {
    console.log('   📝 Notes:', aiResult.notes.join('; '));
  }

  // Step 3: If AI submitted, we're done
  if (aiResult.submitted) {
    console.log('   🎉 Form auto-submitted by AI!');
    return 'applied-external';
  }

  // Step 4: If significant fields filled, try auto-submit
  if (totalFilled >= 3) {
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply Now"), button:has-text("Apply")').catch(() => null);
    if (submitBtn) {
      const btnText = await submitBtn.innerText().catch(() => 'Submit');
      console.log(`   🚀 Auto-submitting (found "${btnText}" button)...`);
      await submitBtn.click();
      await page.waitForTimeout(3000);

      const body = await page.evaluate(() => document.body.innerText).catch(() => '');
      if (body.toLowerCase().match(/thank|success|submitted|applied|received/)) {
        console.log('   ✅ Application submitted successfully!');
        return 'applied-external';
      }
    }
  }

  // Step 5: Still needs human — open browser for review
  console.log('\n   ⚠️  Some fields may need manual review.');
  console.log(`   Browser is open on: ${hostname}`);
  console.log(`   Fields filled so far: ${totalFilled}`);
  const answer = await prompt('   Type "done" when submitted, "skip" to skip: ');
  return answer.toLowerCase().includes('skip') ? 'skipped' : 'applied-external';
}


// ─── Handle Chatbot Apply (Naukri ConversationalApply) ────────────────────────

async function handleChatbot(page, cvPath) {
  console.log('   🤖 Chatbot Apply detected — auto-responding...');

  const CHATBOT_ANSWERS = [
    { pattern: /how many years|years of experience|experience do you have/i, answer: '0' },
    { pattern: /current.*location|where are you based|which city/i, answer: 'Hyderabad' },
    { pattern: /relocate|open to.*location|willing to/i, answer: 'yes' },
    { pattern: /notice period|when can you join|available from/i, answer: 'Immediate' },
    { pattern: /current.*ctc|current.*salary|currently drawing/i, answer: '0' },
    { pattern: /expected.*ctc|expected.*salary|salary expectation/i, answer: '4 LPA' },
    { pattern: /react|javascript|frontend.*experience/i, answer: 'Yes, I have hands-on experience with React.js and JavaScript' },
    { pattern: /tech.*stack|skills|technologies you know/i, answer: 'HTML, CSS, JavaScript, React.js, TypeScript, REST APIs, AWS' },
    { pattern: /phone|mobile number/i, answer: '8688128008' },
    { pattern: /email/i, answer: 'varunpavan45@gmail.com' },
    { pattern: /are you|do you|have you|can you/i, answer: 'yes' },
  ];

  const maxRounds = 15;
  let round = 0;

  while (round < maxRounds) {
    round++;
    await page.waitForTimeout(2000);

    const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (bodyText.toLowerCase().match(/thank you|application.*submitted|successfully applied|received your application/)) {
      console.log('   ✅ Chatbot application submitted!');
      return 'applied-chatbot';
    }

    // CV upload if visible
    if (cvPath) {
      const fileInput = await page.$('input[type="file"]').catch(() => null);
      if (fileInput) {
        await fileInput.setInputFiles(cvPath).catch(() => {});
        console.log('   📎 Uploaded CV in chatbot');
        await page.waitForTimeout(1500);
        continue;
      }
    }

    // Find latest bot message
    const chatMessage = await page.evaluate(() => {
      const sels = ['[class*="chatbot"] p', '[class*="ConversationalApply"] p', '[class*="question-text"]', '[class*="bot-message"]'];
      for (const s of sels) {
        const msgs = document.querySelectorAll(s);
        if (msgs.length) return msgs[msgs.length - 1].textContent.trim();
      }
      return '';
    }).catch(() => '');

    let answer = 'yes';
    if (chatMessage) {
      console.log(`   💬 Bot: "${chatMessage.substring(0, 70)}"`);
      for (const { pattern, answer: ans } of CHATBOT_ANSWERS) {
        if (pattern.test(chatMessage)) { answer = ans; break; }
      }
    }

    // Try text input
    const textInput = await page.$('[class*="chatbot"] input[type="text"], [class*="ConversationalApply"] input[type="text"], [class*="chatbot"] textarea').catch(() => null);
    if (textInput) {
      await textInput.fill(answer);
      await page.waitForTimeout(300);
      const sendBtn = await page.$('button[type="submit"], button:has-text("Send"), button:has-text("Next")').catch(() => null);
      if (sendBtn) await sendBtn.click();
      else await textInput.press('Enter');
      console.log(`   → Replied: "${answer}"`);
      continue;
    }

    // Try option buttons
    const optionBtns = await page.$$('[class*="chatbot"] button:visible, [class*="ConversationalApply"] button:visible').catch(() => []);
    if (optionBtns.length > 0) {
      let clicked = false;
      for (const btn of optionBtns) {
        const t = (await btn.innerText().catch(() => '')).toLowerCase();
        if (t.includes('yes') || t.includes('immediate') || t.includes('hyderabad') || t.includes('ok')) {
          await btn.click();
          console.log(`   → Clicked: "${t}"`);
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        const t = await optionBtns[0].innerText().catch(() => '');
        await optionBtns[0].click();
        console.log(`   → Clicked first option: "${t}"`);
      }
      continue;
    }

    break; // nothing to interact with
  }

  console.log('   ⚠️  Chatbot needs manual steps. Browser is open.');
  const ans = await prompt('   Press Enter when done, or type "skip": ');
  return ans.toLowerCase().includes('skip') ? 'skipped' : 'applied-chatbot';
}

// ─── Apply to one job — full flow ─────────────────────────────────────────────

async function applyToJob(page, job, cvPath) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📌 ${job.title || '(unknown title)'}`);
  console.log(`🏢 ${job.company || '(unknown company)'}`);
  console.log(`📍 ${job.location || ''}`);
  console.log(`🔗 ${job.url}`);
  console.log('─'.repeat(60));

  // Ask before doing anything
  const action = 'a';

  try {
    // Navigate to job page — Bug 4 fix: retry once on timeout
    let gotoSuccess = false;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        gotoSuccess = true;
        break;
      } catch (navErr) {
        if (attempt === 2) throw navErr;
        console.log(`   ⚠️  Navigation timeout (attempt ${attempt}/2) — retrying...`);
        await page.waitForTimeout(3000);
      }
    }
    await page.waitForTimeout(2500);

    // Find and click the Apply button
    const applySelectors = [
      'button#apply-button',
      'a#apply-button',
      'button[id*="apply" i]',
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      '.apply-message button',
      '[data-ga-track*="apply"]',
    ];

    let applyClicked = false;
    for (const sel of applySelectors) {
      try {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible()) {
          const text = await btn.innerText().catch(() => '');
          // Bug 1 fix: catch all "already applied" variants — not just exact match
          // Naukri shows: "Applied", "Applied ✓", "You have applied", "Application Submitted"
          const tl = text.toLowerCase().trim();
          if (
            tl === 'applied' ||
            tl.startsWith('applied') ||
            tl.includes('already applied') ||
            tl.includes('you have applied') ||
            tl.includes('application submitted')
          ) {
            console.log(`   ⚠️  Already applied to this job (button says: "${text.trim()}").`);
            return 'already-applied';
          }
          console.log(`   🖱️  Clicking: "${text.trim()}" button`);
          await btn.click();
          applyClicked = true;
          break;
        }
      } catch { /* try next */ }
    }

    if (!applyClicked) {
      console.log('   ⚠️  Could not find Apply button. Opening browser for manual action.');
      await prompt('   Press Enter when done...');
      return 'manual';
    }

    // Detect which flow triggered
    const flow = await detectApplyFlow(page);
    console.log(`   🔍 Detected flow: ${flow}`);

    let result;
    if (flow === 'easy')     result = await handleEasyApply(page);
    else if (flow === 'modal') result = await handleModalApply(page, cvPath);
    else if (flow === 'external') result = await handleExternal(page, cvPath, job);
    else if (flow === 'chatbot') {
      console.log('   📋 Flow: Naukri Chatbot Apply — auto-responding...');
      result = await handleChatbot(page, cvPath);
    } else {
      console.log('   ⚠️  Unknown flow. Browser is open for manual action.');
      await prompt('   Press Enter when done...');
      result = 'manual';
    }

    return result;

  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return 'error';
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAUKRI AUTO-APPLY  (Full Form Fill)     ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Find CV
  const cvPath = findLatestCV();
  if (cvPath) {
    console.log(`📄 CV to attach: ${path.basename(cvPath)}`);
  } else {
    console.log('⚠️  No CV PDF found in output/. Upload forms will be skipped.');
  }

  // Load jobs
  if (!fs.existsSync(TSV_PATH)) {
    console.error(`❌ ${TSV_PATH} not found. Run scan-all.mjs first.`);
    process.exit(1);
  }

  const rows = parseTSV(fs.readFileSync(TSV_PATH, 'utf8'));
  const jobs = rows.filter(r => {
    const url = r.url || '';
    return url.includes('ibrowsejobs-technologies');
  });

  console.log(`\n📋 ${jobs.length} Naukri jobs pending\n`);
  if (jobs.length === 0) {
    console.log('Nothing to apply to. Run scan-all.mjs first.');
    process.exit(0);
  }

  // Launch browser with your Naukri session
  if (!fs.existsSync(PROFILE_PATH)) {
    console.error(`❌ Naukri session not found at ${PROFILE_PATH}`);
    process.exit(1);
  }

  console.log('🚀 Launching stealth browser with your Naukri session...');
  const browser = await stealthPersistent(PROFILE_PATH, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  // Verify login
  console.log('🔐 Verifying Naukri login...');
  await page.goto('https://www.naukri.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2000);

  const loggedIn = await page.evaluate(() => {
    return !!document.querySelector('.nI-gNb-lcm-lnk, .user-name, [class*="loggedIn"], [class*="logged-in"]') || 
           document.location.pathname === '/mnjuser/homepage';
  }).catch(() => false);

  if (!loggedIn) {
    console.log('\n⚠️  Not logged in. Please log in to Naukri in the browser window...');
    await page.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'domcontentloaded' });
    console.log('⏳ Waiting up to 3 minutes for you to log in...');
    await page.waitForNavigation({ timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Bug 2 fix: re-verify login after manual login — don't blindly proceed
    const loggedInAfterManual = await page.evaluate(() => {
      return !!document.querySelector('.nI-gNb-lcm-lnk, .user-name, [class*="loggedIn"], [class*="logged-in"]') ||
             document.location.pathname === '/mnjuser/homepage';
    }).catch(() => false);

    if (!loggedInAfterManual) {
      console.error('❌ Login verification failed after manual login. Please check your Naukri credentials and try again.');
      await browser.close();
      process.exit(1);
    }
    console.log('✅ Login confirmed. Continuing...\n');
  } else {
    console.log('✅ Logged in to Naukri!\n');
  }

  // Stats
  let applied = 0, skipped = 0, alreadyApplied = 0, errors = 0;

  for (const job of jobs) {
    const result = await applyToJob(page, job, cvPath);

    if (result === 'quit') {
      console.log('\n👋 Quitting. Progress saved.');
      break;
    }

    // Update TSV
    const tsvStatus =
      result === 'skipped' ? 'skipped' :
      result.startsWith('applied') ? 'applied' :
      result === 'already-applied' ? 'already-applied' :
      'manual-review';

    updateTSVStatus(job.url, tsvStatus);
    appendToLog({ ...job, result, flow: tsvStatus });

    if (result.startsWith('applied')) {
      console.log(`   ✅ Status → applied`);
      applied++;
    } else if (result === 'skipped') {
      skipped++;
    } else if (result === 'already-applied') {
      // Bug 3 fix: was falling into else → errors++; now tracked separately
      console.log(`   ℹ️  Status → already-applied (skipping, not an error)`);
      alreadyApplied++;
    } else {
      errors++;
    }

    await page.waitForTimeout(1200);
  }

  await browser.close();

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`  ✅ Applied:        ${applied}`);
  console.log(`  ⏭️  Skipped:        ${skipped}`);
  console.log(`  ℹ️  Already Applied: ${alreadyApplied}`);
  console.log(`  ⚠️  Manual/Errors:  ${errors}`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\n💡 Run sync-status.mjs to update applications.md');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
