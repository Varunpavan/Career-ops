import fs from 'fs';
import path from 'path';

// 1. Generate Reject Reports
const reportsDir = path.resolve('reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const today = new Date().toISOString().split('T')[0];

const evaluations = [
  { company: 'PlanetScale', role: 'Software Engineer - Postgres Internals', url: 'https://job-boards.greenhouse.io/planetscale/jobs/4257174009', score: '1.0', reason: 'Requires C and Postgres internals, completely misaligned with frontend profile.' },
  { company: 'Rapid Care', role: 'Full Stack AI Development Engineer', url: 'https://www.naukri.com/job-listings-full-stack-ai-development-engineer-freshers-welcome-hyderabad-rapid-care-hyderabad-0-to-4-years-180526026227', score: '2.5', reason: 'Requires Python and strict 2-year bond with predatory 1.5 Lakhs clawback policy.' },
  { company: 'Naukri Expert Assist', role: 'React Frontend Developer', url: 'https://www.naukri.com/job-listings-react-frontend-developer-naukri-expert-assist-hyderabad-6-to-9-years-220526017293', score: '1.0', reason: 'Requires 6 - 8.4 years of experience (senior role masking as fresher).' },
  { company: 'P99soft', role: 'Sr. React Developer', url: 'https://www.naukri.com/job-listings-sr-react-developer-p99soft-pvt-ltd-hyderabad-2-to-5-years-210526501026', score: '2.0', reason: 'Requires 2 - 5 years of experience.' },
  { company: 'Valuelabs', role: 'React Developer', url: 'https://www.naukri.com/job-listings-react-developer-valuelabs-hyderabad-4-to-9-years-210526011509', score: '1.0', reason: 'Requires 5-12 years of experience.' }
];

const trackerAdditionsDir = path.resolve('batch/tracker-additions');
if (!fs.existsSync(trackerAdditionsDir)) fs.mkdirSync(trackerAdditionsDir, { recursive: true });

for (let i = 0; i < evaluations.length; i++) {
    const ev = evaluations[i];
    const num = String(100 + i).padStart(3, '0');
    const slug = ev.company.toLowerCase().replace(/\s+/g, '-');
    const reportPath = path.join(reportsDir, `${num}-${slug}-${today}.md`);
    
    // Write Report
    const reportContent = `# Evaluation: ${ev.company} - ${ev.role}\n\n**URL:** ${ev.url}\n**Score:** ${ev.score}/5\n**Legitimacy:** B-Tier\n\n## Rejection Reason\n${ev.reason}\n`;
    fs.writeFileSync(reportPath, reportContent);
    
    // Write TSV
    const tsvContent = `${num}\t${today}\t${ev.company}\t${ev.role}\tSKIP\t${ev.score}/5\t❌\t[${num}](reports/${num}-${slug}-${today}.md)\t${ev.reason}\n`;
    fs.writeFileSync(path.join(trackerAdditionsDir, `${num}-${slug}.tsv`), tsvContent);
}

// 2. Remove first 5 from pipeline.md
const pipelinePath = path.resolve('data/pipeline.md');
const lines = fs.readFileSync(pipelinePath, 'utf-8').split('\n');
const newLines = lines.filter((line, index) => {
    // We manually counted them as the first 5 bullet points
    if (line.includes('PlanetScale') || line.includes('Rapid Care') || line.includes('Naukri Expert Assist') || line.includes('P99soft') || line.includes('Valuelabs')) {
        return false;
    }
    // Also remove the URLs under Naukri that might be naked links for these
    if (line.includes('180526026227') || line.includes('220526017293') || line.includes('210526501026') || line.includes('210526011509')) {
        return false;
    }
    return true;
});

fs.writeFileSync(pipelinePath, newLines.join('\n'));
console.log('Processed batch 1. Wrote reports, TSVs, and removed from pipeline.');
