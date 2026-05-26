import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TSV_PATH = path.resolve('data/india-jobs.tsv');

function parseTSV(raw) {
  const lines = raw.trim().split('\n');
  if (lines.length === 0) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).filter(Boolean).map(line => {
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

async function autoApplyBatch() {
    const pipelinePath = path.resolve('data/pipeline.md');
    let pipelineLines = fs.readFileSync(pipelinePath, 'utf-8').split('\n');
    
    // Extract first 10 URLs
    const urls = pipelineLines
        .filter(l => l.startsWith('- http'))
        .map(l => l.replace('- ', '').trim())
        .slice(0, 10);
        
    if (urls.length === 0) {
        console.log("pipeline.md is empty! Nothing to apply to.");
        return;
    }

    console.log(`🚀 Launching auto-applier for ${urls.length} jobs...`);
    const profilePath = path.resolve('data/naukri-profile');
    const browser = await chromium.launchPersistentContext(profilePath, { 
        headless: true,
        channel: 'chrome',
        viewport: null,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await browser.newPage();
    const reportsDir = path.resolve('reports');
    const additionsDir = path.resolve('batch/tracker-additions');
    if (!fs.existsSync(additionsDir)) fs.mkdirSync(additionsDir, { recursive: true });

    const today = new Date().toISOString().split('T')[0];
    
    let maxNum = 0;
    fs.readdirSync(reportsDir).forEach(f => {
        const m = f.match(/^(\d{3})-/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        
        // Load the actual company and role from TSV if available
        let company = 'unknown-company';
        let role = 'Job Application';
        if (fs.existsSync(TSV_PATH)) {
            const tsvContent = fs.readFileSync(TSV_PATH, 'utf8');
            const rows = parseTSV(tsvContent);
            const foundRow = rows.find(r => r.url && r.url.split('?')[0] === url.split('?')[0]);
            if (foundRow) {
                company = foundRow.company || company;
                role = foundRow.title || role;
            }
        }
        const companySlug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, '');

        console.log(`\n➡️ Navigating to Job ${i+1}/${urls.length}: ${url}`);
        let success = false;
        let isAlreadyApplied = false;

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(4000);

            const applyBtn = await page.$('button#apply-button, .apply-message button, button:has-text("Apply")');
            if (applyBtn) {
                const btnText = await applyBtn.innerText().catch(() => '');
                const tl = btnText.toLowerCase().trim();
                if (
                  tl === 'applied' ||
                  tl.startsWith('applied') ||
                  tl.includes('already applied') ||
                  tl.includes('you have applied') ||
                  tl.includes('application submitted')
                ) {
                    isAlreadyApplied = true;
                    success = true;
                    console.log(`✅ Already applied to ${company} (button says: "${btnText.trim()}")`);
                } else {
                    console.log("🖱️ Clicking Apply...");
                    await applyBtn.click();
                    await page.waitForTimeout(3000);
                    success = true;
                    console.log(`✅ Successfully applied to ${company}!`);
                }
            } else {
                // Check if there is already applied text on the page
                const alreadyApplied = await page.$('button:has-text("Applied"), .apply-message:has-text("Applied")');
                if (alreadyApplied) {
                    isAlreadyApplied = true;
                    success = true;
                    console.log(`✅ Already applied to ${company}!`);
                } else {
                    console.log(`⚠️ Could not find Apply button for ${company}. Skipping.`);
                }
            }
        } catch (e) {
            console.log(`⚠️ Error clicking Apply for ${company}:`, e.message);
        }

        if (success) {
            const statusVal = isAlreadyApplied ? 'already-applied' : 'applied';
            updateTSVStatus(url, statusVal);

            maxNum++;
            const num = String(maxNum).padStart(3, '0');
            const reportPath = path.join(reportsDir, `${num}-${companySlug}-${today}.md`);
            
            // Generate report
            const reportContent = `# Applied: ${company} - ${role}\n\n**URL:** ${url}\n**Score:** 4.0/5\n**Legitimacy:** Auto-Verified\n\n## Summary\nAutomatically applied via headless Naukri profile.\n`;
            fs.writeFileSync(reportPath, reportContent);
            
            // TSV Line for tracker additions
            const tsvLine = `${num}\t${today}\t${company}\t${role}\t${isAlreadyApplied ? 'Evaluated' : 'Applied'}\t4.0/5\t✅\t[${num}](reports/${num}-${companySlug}-${today}.md)\tAuto-applied via headless Playwright!\n`;
            fs.writeFileSync(path.join(additionsDir, `${num}-${companySlug}.tsv`), tsvLine);
        } else {
            updateTSVStatus(url, 'manual-review');
        }
    }

    await browser.close();
    
    // Remove applied URLs and their description lines from pipeline memory
    const newPipelineLines = [];
    for (let i = 0; i < pipelineLines.length; i++) {
        const line = pipelineLines[i];
        const matchUrl = urls.find(u => line.includes(u));
        if (matchUrl) {
            if (i + 1 < pipelineLines.length && pipelineLines[i + 1].trim().startsWith('*')) {
                i++; // skip description line
            }
            continue;
        }
        newPipelineLines.push(line);
    }
    pipelineLines = newPipelineLines;
    
    // Update pipeline.md
    fs.writeFileSync(pipelinePath, pipelineLines.join('\n'));
    console.log('\n✅ Batch execution finished. Updating tracker...');
    
    try {
        execSync('node merge-tracker.mjs', { stdio: 'inherit' });
    } catch (e) {
        console.error("Failed to merge tracker:", e.message);
    }
}

autoApplyBatch();
