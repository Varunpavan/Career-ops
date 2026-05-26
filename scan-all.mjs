// scan-all.mjs
// Runs all scrapers (Naukri + LinkedIn + Indeed + Internshala) in sequence
// and prints a combined summary.
// Usage: node scan-all.mjs
// Optional: node scan-all.mjs --naukri-only  (just Naukri)
//           node scan-all.mjs --skip-linkedin  (skip LinkedIn if it's rate-limiting you)

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const TSV_PATH = path.resolve('data/india-jobs.tsv');

function countByStatus(status) {
  if (!fs.existsSync(TSV_PATH)) return 0;
  const raw = fs.readFileSync(TSV_PATH, 'utf8');
  return raw.split('\n').slice(1).filter(l => {
    const cols = l.split('\t');
    return cols[5]?.toLowerCase() === status;
  }).length;
}

function countTotal() {
  if (!fs.existsSync(TSV_PATH)) return 0;
  return fs.readFileSync(TSV_PATH, 'utf8').split('\n').slice(1).filter(Boolean).length;
}

function runScript(name) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`▶ Running ${name}`);
  console.log('═'.repeat(50));
  try {
    execSync(`node ${name}`, { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.log(`⚠️  ${name} exited with error (partial results may be saved).`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const naukriOnly = args.includes('--naukri-only');
  const skipLinkedIn = args.includes('--skip-linkedin');

  const before = countTotal();
  const beforeAdded = countByStatus('added');

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║         CAREER-OPS: SCAN ALL PORTALS        ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n📊 Current TSV: ${before} total, ${beforeAdded} pending review\n`);

  const scrapers = [
    { name: 'scrape-naukri.mjs', skip: false },
    { name: 'scrape-linkedin.mjs', skip: naukriOnly || skipLinkedIn },
    { name: 'scrape-indeed.mjs', skip: naukriOnly },
    { name: 'scrape-internshala.mjs', skip: naukriOnly },
  ];

  const results = [];
  for (const scraper of scrapers) {
    if (scraper.skip) {
      console.log(`\n⏭️  Skipping ${scraper.name}`);
      results.push({ name: scraper.name, ok: null });
    } else {
      const ok = runScript(scraper.name);
      results.push({ name: scraper.name, ok });
    }
  }

  const after = countTotal();
  const afterAdded = countByStatus('added');
  const newTotal = after - before;
  const newPending = afterAdded - beforeAdded;

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║                SCAN COMPLETE                ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n📊 Results:`);
  results.forEach(r => {
    if (r.ok === null) {
      console.log(`   ⏭️  ${r.name} — skipped`);
    } else if (r.ok) {
      console.log(`   ✅ ${r.name} — completed`);
    } else {
      console.log(`   ⚠️  ${r.name} — had errors`);
    }
  });

  console.log(`\n📈 New jobs found: ${newTotal > 0 ? '+' + newTotal : 0}`);
  console.log(`📋 Jobs pending review: ${afterAdded}`);
  console.log(`📁 Total in TSV: ${after}`);
  console.log(`\n💡 Next: node review-and-apply.mjs  (to review and apply)`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
