import fs from 'fs';
import path from 'path';

// 1. Generate Reject Reports
const reportsDir = path.resolve('reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const today = new Date().toISOString().split('T')[0];

const evaluations = [
  { company: 'Accenture Solutions', role: 'Custom Software Engineer', url: 'https://www.naukri.com/job-listings-custom-software-engineer-accenture-solutions-pvt-ltd-hyderabad-2-to-5-years-200526940494', score: '1.0', reason: 'Explicitly requires a minimum of 5 years of experience and Java Enterprise Edition. Complete mismatch for a React frontend fresher.' },
  { company: 'Innominds Software', role: 'Frontend Developer', url: 'https://www.naukri.com/job-listings-frontend-developer-innominds-software-bengaluru-2-to-4-years-190526020688', score: '1.5', reason: 'Despite the title, the JD heavily requires Python/Flask, Linux sysadmin (Debian/Ubuntu), and Docker. Not a React frontend role.' },
  { company: 'Resolve Business Services', role: 'Front End Developer', url: 'https://www.naukri.com/job-listings-front-end-developer-resolve-business-services-bengaluru-2-to-6-years-180526505783', score: '2.0', reason: 'Requires 2-6 years of experience with React AND .NET backend + Postgres. Full stack role requiring mid-level experience.' },
  { company: 'Probo', role: 'Frontend Developer', url: 'https://www.naukri.com/job-listings-frontend-developer-probo-bengaluru-1-to-5-years-220526919336', score: '2.5', reason: 'Tech stack matches well (React, Redux), but explicitly requires 2-4 years of strong proficiency.' },
  { company: 'CGI Information Systems', role: 'Front End UI Developer', url: 'https://www.naukri.com/job-listings-front-end-ui-developer-cgi-information-systems-and-management-consultants-bengaluru-1-to-6-years-210526501537', score: '3.0', reason: 'Generic UI developer role (HTML, CSS, JS). Good tech fit, but CGI typically expects 1+ years of experience for this band.' }
];

const trackerAdditionsDir = path.resolve('batch/tracker-additions');
if (!fs.existsSync(trackerAdditionsDir)) fs.mkdirSync(trackerAdditionsDir, { recursive: true });

// Find highest existing report number to continue sequentially
const existingReports = fs.readdirSync(reportsDir);
let maxNum = 162; // We know 162 is Narvee
existingReports.forEach(f => {
    const m = f.match(/^(\d{3})-/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
});

for (let i = 0; i < evaluations.length; i++) {
    const ev = evaluations[i];
    const num = String(maxNum + 1 + i).padStart(3, '0');
    const slug = ev.company.toLowerCase().replace(/\s+/g, '-');
    const reportPath = path.join(reportsDir, `${num}-${slug}-${today}.md`);
    
    // Write Report
    const reportContent = `# Evaluation: ${ev.company} - ${ev.role}\n\n**URL:** ${ev.url}\n**Score:** ${ev.score}/5\n**Legitimacy:** B-Tier\n\n## Rejection Reason\n${ev.reason}\n`;
    fs.writeFileSync(reportPath, reportContent);
    
    // Write TSV
    const tsvContent = `${num}\t${today}\t${ev.company}\t${ev.role}\tSKIP\t${ev.score}/5\t❌\t[${num}](reports/${num}-${slug}-${today}.md)\t${ev.reason}\n`;
    fs.writeFileSync(path.join(trackerAdditionsDir, `${num}-${slug}.tsv`), tsvContent);
}

// 2. Remove these 5 from pipeline.md
const pipelinePath = path.resolve('data/pipeline.md');
const lines = fs.readFileSync(pipelinePath, 'utf-8').split('\n');
const urlsToRemove = evaluations.map(e => e.url);

const newLines = lines.filter(line => {
    return !urlsToRemove.some(url => line.includes(url));
});

fs.writeFileSync(pipelinePath, newLines.join('\n'));
console.log('✅ Evaluated Batch 2. Wrote 5 rejection reports, TSVs, and removed from pipeline.');
