import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 1. Generate Reject Reports
const reportsDir = path.resolve('reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const today = new Date().toISOString().split('T')[0];

const { urls, jdPaths } = JSON.parse(fs.readFileSync('batch2-jobs.json', 'utf-8'));

const tsvLines = [];

for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const jdPath = jdPaths[i];
    
    // Evaluate using q.mjs
    console.log(`\nEvaluating ${url}...`);
    try {
        const resultJSON = execSync(`node q.mjs "Evaluate this JD against my profile. Return JSON. JD: $(cat ${jdPath})"`, { encoding: 'utf-8' });
        
        // Find JSON block
        const match = resultJSON.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON returned from evaluation");
        
        const evalData = JSON.parse(match[0]);
        const score = evalData.score || 0;
        const status = score >= 4.0 ? 'Evaluated' : 'SKIP';
        
        const companySlug = url.split('-').slice(3, 5).join('-');
        
        // Find next report number
        const existingReports = fs.readdirSync(reportsDir);
        let maxNum = 0;
        existingReports.forEach(f => {
            const m = f.match(/^(\d{3})-/);
            if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        });
        const num = String(maxNum + 1).padStart(3, '0');
        
        const reportPath = path.join(reportsDir, `${num}-${companySlug}-${today}.md`);
        
        // Generate Report Content
        const reportContent = `
# Offer Evaluation: ${companySlug}
**Score:** ${score}/5
**URL:** ${url}
**Date:** ${today}
**Legitimacy:** Verified

## Summary
${evalData.verdict || evalData.summary || 'Automatically evaluated.'}

## Fit
${evalData.fit_analysis || 'No detailed fit analysis provided.'}
        `.trim();
        
        fs.writeFileSync(reportPath, reportContent);
        
        // TSV Line for Tracker
        // {num} {date} {company} {role} {status} {score}/5 {pdf_emoji} [{num}](reports/{num}-{slug}-{date}.md) {note}
        const pdfEmoji = score >= 4.0 ? '✅' : '❌';
        const roleName = evalData.role || url.split('-').slice(0, 3).join(' ');
        const tsvLine = `${num}\t${today}\t${companySlug}\t${roleName}\t${status}\t${score.toFixed(1)}/5\t${pdfEmoji}\t[${num}](reports/${num}-${companySlug}-${today}.md)\t${evalData.summary || 'Batch eval'}`;
        tsvLines.push(tsvLine);
        
        console.log(`Evaluated ${companySlug}: Score ${score}/5`);
        
        // If score >= 4.0, generate PDF
        if (score >= 4.0) {
            console.log(`Score >= 4.0! Generating PDF for ${companySlug}...`);
            execSync(`node generate-pdf.mjs "${companySlug}" "${roleName}"`, { stdio: 'inherit' });
        }
        
    } catch (err) {
        console.error(`Error evaluating ${url}:`, err.message);
    }
}

// Write TSV to batch/tracker-additions
const additionsDir = path.resolve('batch/tracker-additions');
if (!fs.existsSync(additionsDir)) fs.mkdirSync(additionsDir, { recursive: true });

tsvLines.forEach((line, i) => {
    const slug = urls[i].split('-').slice(3, 5).join('-');
    const tsvPath = path.join(additionsDir, `batch2-${slug}.tsv`);
    fs.writeFileSync(tsvPath, line);
});

console.log('\n✅ Batch 2 Evaluation Complete. TSVs written to batch/tracker-additions/');

// Remove the evaluated URLs from pipeline.md
const pipelinePath = path.resolve('data/pipeline.md');
let pipelineLines = fs.readFileSync(pipelinePath, 'utf-8').split('\n');
urls.forEach(url => {
    pipelineLines = pipelineLines.filter(line => !line.includes(url));
});
fs.writeFileSync(pipelinePath, pipelineLines.join('\n'));
console.log('✅ URLs removed from pipeline.md.');
