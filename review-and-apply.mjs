// review-and-apply.mjs
// Interactive terminal workflow: reads india-jobs.tsv, shows each job,
// lets you press (a)pply / (s)kip / (q)uit, then opens Naukri auto-apply.
// Usage: node review-and-apply.mjs
//        node review-and-apply.mjs --all       (show all statuses, not just 'added')
//        node review-and-apply.mjs --portal naukri  (filter by portal)

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const TSV_PATH = path.resolve('data/india-jobs.tsv');
const PROFILE_PATH = path.resolve('data/naukri-profile');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTSV(raw) {
  const lines = raw.trim().split('\n');
  const headers = lines[0].split('\t');
  return lines.slice(1)
    .filter(Boolean)
    .map(line => {
      const cols = line.split('\t');
      return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
    });
}

function updateTSVStatus(url, newStatus) {
  if (!fs.existsSync(TSV_PATH)) return;
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

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function displayJob(job, index, total) {
  console.log('\n' + '─'.repeat(60));
  console.log(`Job ${index + 1}/${total}`);
  console.log(`📌 Title:    ${job.title || '(unknown)'}`);
  console.log(`🏢 Company:  ${job.company || '(unknown)'}`);
  console.log(`📍 Location: ${job.location || '(unknown)'}`);
  console.log(`🌐 Portal:   ${job.portal || '(unknown)'}`);
  console.log(`🔗 URL:      ${job.url}`);
  console.log(`📅 Added:    ${job.first_seen || '(unknown)'}`);
  console.log('─'.repeat(60));
}

// ─── Apply via Naukri session ──────────────────────────────────────────────────

async function applyNaukriJob(url) {
  if (!fs.existsSync(PROFILE_PATH)) {
    console.log('   ⚠️  No Naukri session found. Opening browser without session...');
  }

  const browser = await chromium.launchPersistentContext(
    fs.existsSync(PROFILE_PATH) ? PROFILE_PATH : undefined,
    {
      headless: false,
      channel: 'chrome',
      viewport: { width: 1280, height: 900 },
    }
  ).catch(async () => {
    // Fallback: launch without persistent context
    const b = await chromium.launch({ headless: false });
    return b.newContext({ viewport: { width: 1280, height: 900 } });
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Try to click Apply
  const selectors = [
    'button#apply-button',
    'button:has-text("Apply")',
    '.apply-message button',
    'a:has-text("Apply Now")',
  ];

  for (const sel of selectors) {
    try {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        console.log('   🖱️  Clicked Apply button. Browser is open — complete the form, then press Enter here.');
        break;
      }
    } catch {
      // try next
    }
  }

  // Wait for user confirmation
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
    setTimeout(resolve, 120000); // auto-close after 2 mins
  });

  await browser.close();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const showAll = args.includes('--all');
  const portalFilter = args[args.indexOf('--portal') + 1]?.toLowerCase();

  if (!fs.existsSync(TSV_PATH)) {
    console.error(`❌ ${TSV_PATH} not found. Run scan-all.mjs first.`);
    process.exit(1);
  }

  const rows = parseTSV(fs.readFileSync(TSV_PATH, 'utf8'));

  let jobs = rows.filter(r => {
    const status = (r.status || '').toLowerCase();
    const statusOk = showAll || status === 'added' || status === '';
    const portalOk = !portalFilter || (r.portal || '').toLowerCase().includes(portalFilter);
    return statusOk && portalOk && r.url;
  });

  if (jobs.length === 0) {
    console.log('\n📭 No jobs to review.');
    console.log('   Run scan-all.mjs first to find new jobs.');
    process.exit(0);
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║       CAREER-OPS: REVIEW & APPLY            ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n📋 ${jobs.length} jobs to review`);
  console.log('Controls: [a] Apply  [s] Skip  [o] Open in browser  [q] Quit\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let applied = 0, skipped = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    displayJob(job, i, jobs.length);

    const answer = await ask(rl, '\nAction [a/s/o/q]: ');
    const cmd = answer.trim().toLowerCase();

    if (cmd === 'q' || cmd === 'quit') {
      console.log('\n👋 Quitting review session.');
      break;
    } else if (cmd === 'a' || cmd === 'apply') {
      if (job.url.includes('naukri.com')) {
        console.log('\n🚀 Opening Naukri job in browser...');
        await applyNaukriJob(job.url);
      } else {
        console.log(`\n🌐 Opening URL in your default browser: ${job.url}`);
        const open = (await import('child_process')).execSync;
        try {
          open(`xdg-open "${job.url}" 2>/dev/null || open "${job.url}" 2>/dev/null`, { stdio: 'ignore' });
        } catch { /* ignore */ }
        await ask(rl, 'Press Enter when done applying...');
      }
      updateTSVStatus(job.url, 'applied');
      console.log('   ✅ Marked as applied.');
      applied++;
    } else if (cmd === 'o' || cmd === 'open') {
      try {
        const { execSync } = await import('child_process');
        execSync(`xdg-open "${job.url}" 2>/dev/null || open "${job.url}" 2>/dev/null`, { stdio: 'ignore' });
        console.log(`   🌐 Opened: ${job.url}`);
      } catch {
        console.log(`   🔗 URL: ${job.url}`);
      }
      // re-ask for the same job
      i--;
    } else {
      // skip (default)
      updateTSVStatus(job.url, 'skipped');
      console.log('   ⏭️  Skipped.');
      skipped++;
    }
  }

  rl.close();

  console.log('\n═══════════════════════════════════');
  console.log(`✅ Applied:  ${applied}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log('═══════════════════════════════════');
  console.log('💡 Run sync-status.mjs to sync applications.md with the TSV.');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
