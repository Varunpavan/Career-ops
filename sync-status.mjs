// sync-status.mjs
// Keeps data/india-jobs.tsv and data/applications.md in sync.
// - Finds jobs marked 'applied' in the TSV that aren't in applications.md
// - Adds them as rows in the tracker
// - Optionally marks TSV rows as 'applied' when found in applications.md
// Usage: node sync-status.mjs
//        node sync-status.mjs --dry-run   (show changes without writing)

import fs from 'fs';
import path from 'path';

const TSV_PATH = path.resolve('data/india-jobs.tsv');
const APPS_PATH = path.resolve('data/applications.md');

const DRY_RUN = process.argv.includes('--dry-run');

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

// ─── Applications.md helpers ──────────────────────────────────────────────────

function parseApplicationsMd(raw) {
  // Extract all URLs/notes from the table rows
  const urlSet = new Set();
  const rows = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    if (line.startsWith('|') && !line.includes('---')) {
      // Try to extract any URL from the line
      const urlMatch = line.match(/https?:\/\/[^\s|)]+/);
      if (urlMatch) urlSet.add(urlMatch[0]);
      rows.push(line);
    }
  }
  return { urlSet, rows };
}

function getNextId(raw) {
  const matches = raw.match(/^\|\s*(\d+)\s*\|/gm) || [];
  const ids = matches.map(m => parseInt(m.match(/\d+/)[0]));
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

function buildNewRow(id, job) {
  const date = job.first_seen || new Date().toISOString().split('T')[0];
  const company = (job.company || '').replace(/\|/g, '-');
  const title = (job.title || '').replace(/\|/g, '-');
  const portal = (job.portal || '').replace(/\|/g, '-');
  const url = job.url;

  return `| ${id} | ${date} | ${company} | ${title} | N/A | Applied | ❌ | - | Applied via ${portal} — ${url} |`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║          CAREER-OPS: SYNC STATUS            ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  if (DRY_RUN) console.log('🔍 DRY RUN — no files will be modified\n');

  // ── 1. Load TSV ─────────────────────────────────────────────────────────────

  if (!fs.existsSync(TSV_PATH)) {
    console.log(`❌ ${TSV_PATH} not found. Run scan-all.mjs first.`);
    process.exit(1);
  }

  const tsvRows = parseTSV(fs.readFileSync(TSV_PATH, 'utf8'));
  const appliedInTSV = tsvRows.filter(r => (r.status || '').toLowerCase() === 'applied');

  console.log(`📊 TSV: ${tsvRows.length} total, ${appliedInTSV.length} applied`);

  // ── 2. Load applications.md ─────────────────────────────────────────────────

  if (!fs.existsSync(APPS_PATH)) {
    console.log(`❌ ${APPS_PATH} not found.`);
    process.exit(1);
  }

  const appsMd = fs.readFileSync(APPS_PATH, 'utf8');
  const { urlSet: alreadyTrackedURLs } = parseApplicationsMd(appsMd);

  console.log(`📋 applications.md: ${alreadyTrackedURLs.size} tracked URLs`);

  // ── 3. Find applied TSV jobs not in applications.md ──────────────────────────

  const missing = appliedInTSV.filter(r => !alreadyTrackedURLs.has(r.url));
  console.log(`\n🔎 Applied in TSV but not in applications.md: ${missing.length}`);

  if (missing.length === 0) {
    console.log('✅ Everything is already in sync!');
  } else {
    missing.forEach(job => {
      console.log(`   ➕ ${job.title} @ ${job.company} (${job.portal})`);
    });

    if (!DRY_RUN) {
      let nextId = getNextId(appsMd);
      const newRows = missing.map(job => {
        const row = buildNewRow(nextId, job);
        nextId++;
        return row;
      });

      // Insert new rows at the top of the table (after header rows)
      const lines = appsMd.split('\n');
      const headerIdx = lines.findIndex(l => l.includes('| # |'));
      const separatorIdx = headerIdx + 1;
      const insertAt = separatorIdx + 1;

      lines.splice(insertAt, 0, ...newRows);
      fs.writeFileSync(APPS_PATH, lines.join('\n'), 'utf8');
      console.log(`\n✅ Added ${missing.length} rows to applications.md`);
    }
  }

  // ── 4. Reverse sync: find 'Applied' in applications.md not marked in TSV ────

  let tsvUpdated = 0;
  for (const url of alreadyTrackedURLs) {
    const tsvRow = tsvRows.find(r => r.url === url);
    if (tsvRow && (tsvRow.status || '').toLowerCase() === 'added') {
      console.log(`\n🔄 Marking as applied in TSV: ${tsvRow.title || url}`);
      if (!DRY_RUN) {
        updateTSVStatus(url, 'applied');
      }
      tsvUpdated++;
    }
  }

  if (tsvUpdated > 0) {
    console.log(`\n✅ Updated ${tsvUpdated} TSV rows to 'applied'`);
  }

  // ── 5. Summary ──────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════');
  console.log(`📋 applications.md: +${missing.length} rows added`);
  console.log(`📊 TSV: ${tsvUpdated} rows updated to 'applied'`);
  if (DRY_RUN) console.log('⚠️  DRY RUN — no actual changes made');
  console.log('═══════════════════════════════════');
}

main();
