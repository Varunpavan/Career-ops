import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const PIPELINE_PATH = './data/pipeline.md';
const TEMP_JD_PATH = './batch/temp-jd.txt';
const TRACKER_ADDITIONS_DIR = './batch/tracker-additions';

async function main() {
  if (!fs.existsSync(PIPELINE_PATH)) {
    console.error('Pipeline file not found.');
    return;
  }

  // Ensure tracker additions directory exists
  fs.mkdirSync(TRACKER_ADDITIONS_DIR, { recursive: true });

  const pipelineContent = fs.readFileSync(PIPELINE_PATH, 'utf-8');
  const lines = pipelineContent.split('\n');

  const pendingOffers = [];
  const processedLines = [];
  const otherLines = [];

  let inPendientes = false;
  let inProcesadas = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed === '## Pendientes') {
      inPendientes = true;
      inProcesadas = false;
      continue;
    }
    if (trimmed === '## Procesadas') {
      inPendientes = false;
      inProcesadas = true;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      continue;
    }

    if (inPendientes && trimmed.startsWith('- [ ]')) {
      // Line format: - [ ] URL | Company | Role
      const parts = trimmed.slice(6).split('|');
      const url = parts[0]?.trim();
      const company = parts[1]?.trim() || 'Unknown';
      const role = parts[2]?.trim() || 'Unknown';
      if (url) {
        pendingOffers.push({ url, company, role, originalLine: line });
      } else {
        otherLines.push(line);
      }
    } else if (inProcesadas) {
      if (trimmed) processedLines.push(line);
    } else {
      if (trimmed) otherLines.push(line);
    }
  }

  if (pendingOffers.length === 0) {
    console.log('No pending offers to evaluate in data/pipeline.md.');
    return;
  }

  console.log(`Found ${pendingOffers.length} pending offer(s). Launching browser...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const newlyProcessedLines = [];

  for (const offer of pendingOffers) {
    console.log(`\nEvaluating offer: ${offer.company} - ${offer.role}`);
    console.log(`URL: ${offer.url}`);

    try {
      // 1. Fetch JD page content
      await page.goto(offer.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000); // Wait for hydration
      const bodyText = await page.evaluate(() => document.body?.innerText ?? '');

      if (!bodyText || bodyText.trim().length < 100) {
        throw new Error('Retrieved body text is too short or empty');
      }

      // Save to temp file
      fs.writeFileSync(TEMP_JD_PATH, bodyText, 'utf-8');

      // 2. Run gemini-eval.mjs
      console.log('Running Gemini evaluation...');
      const stdout = execSync(`node gemini-eval.mjs --file ${TEMP_JD_PATH}`, {
        env: { ...process.env, GEMINI_MODEL: 'gemini-2.5-flash' },
        encoding: 'utf-8'
      });

      // Parse output
      const summaryMatch = stdout.match(/---SCORE_SUMMARY---\s*([\s\S]*?)---END_SUMMARY---/);
      if (!summaryMatch) {
        throw new Error('Gemini output did not contain SCORE_SUMMARY block');
      }

      const block = summaryMatch[1];
      const extract = (key) => {
        const prefix = `${key}:`;
        const lines = block.split('\n');
        for (const line of lines) {
          const trimmed = line.trimStart();
          if (trimmed.startsWith(prefix)) {
            return trimmed.slice(prefix.length).trim();
          }
        }
        return 'Unknown';
      };

      const company = extract('COMPANY');
      const role = extract('ROLE');
      const score = extract('SCORE');
      const archetype = extract('ARCHETYPE');
      const legitimacy = extract('LEGITIMACY');

      // Find the report file in reports/
      const today = new Date().toISOString().split('T')[0];
      const companySlug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Let's find next report number or the actual saved report
      const reportsDir = './reports';
      const files = fs.readdirSync(reportsDir);
      // Find the file that matches the slug and date
      const matchingFile = files.find(f => f.includes(companySlug) && f.includes(today));
      if (!matchingFile) {
        throw new Error(`Saved report for ${companySlug} not found in reports/`);
      }

      const num = matchingFile.slice(0, 3);
      console.log(`Saved report: ${matchingFile} (Report #${num})`);
      console.log(`Score: ${score}/5 | Archetype: ${archetype} | Legitimacy: ${legitimacy}`);

      // 3. Write tracker additions TSV
      // Format: {num}\t{date}\t{company}\t{role}\t{status}\t{score}/5\t{pdf_emoji}\t[{num}](reports/{num}-{slug}-{date}.md)\t{note}
      const tsvContent = `${num}\t${today}\t${company}\t${role}\tEvaluated\t${score}/5\t❌\t[${num}](reports/${matchingFile})\t${archetype} (Legitimacy: ${legitimacy})`;
      const tsvFilename = `${num}-${companySlug}.tsv`;
      fs.writeFileSync(path.join(TRACKER_ADDITIONS_DIR, tsvFilename), tsvContent, 'utf-8');
      console.log(`Tracker additions TSV written: ${tsvFilename}`);

      // 4. Create processed line for pipeline.md
      // Format: - [x] #{num} | {url} | {company} | {role} | {score}/5 | PDF ❌
      const processedLine = `- [x] #${num} | ${offer.url} | ${offer.company} | ${offer.role} | ${score}/5 | PDF ❌`;
      newlyProcessedLines.push(processedLine);

    } catch (err) {
      console.error(`❌ Failed to evaluate ${offer.company}: ${err.message}`);
      // Keep it as pending or mark as failed? Keep as pending in data/pipeline.md
      newlyProcessedLines.push(offer.originalLine);
    }
  }

  await browser.close();

  // Clean up temp JD file
  if (fs.existsSync(TEMP_JD_PATH)) {
    fs.unlinkSync(TEMP_JD_PATH);
  }

  // 5. Write updated pipeline.md
  const updatedContent = [
    '# Pipeline',
    '',
    '## Pendientes',
    '',
    // If any failed evaluation was kept as pending, it will remain here.
    ...newlyProcessedLines.filter(l => l.startsWith('- [ ]')),
    '',
    '## Procesadas',
    '',
    ...newlyProcessedLines.filter(l => l.startsWith('- [x]')),
    ...processedLines,
    ''
  ].join('\n');

  fs.writeFileSync(PIPELINE_PATH, updatedContent, 'utf-8');
  console.log('\nPipeline file updated.');

  // 6. Merge tracker additions
  console.log('\nMerging tracker additions into applications.md...');
  try {
    execSync('node merge-tracker.mjs', { stdio: 'inherit' });
  } catch (err) {
    console.error('Error merging tracker additions:', err.message);
  }

  // 7. Verify pipeline
  console.log('\nVerifying pipeline integrity...');
  try {
    execSync('node verify-pipeline.mjs', { stdio: 'inherit' });
  } catch (err) {
    console.error('Pipeline verification failed:', err.message);
  }

  console.log('\nBatch processing complete!');
}

main().catch(err => {
  console.error('Fatal batch process error:', err);
});
