import fs from 'fs';
import path from 'path';

const tsvPath = path.resolve('data/india-jobs.tsv');
const pipelinePath = path.resolve('data/pipeline.md');

const content = fs.readFileSync(tsvPath, 'utf-8');
const lines = content.trim().split('\n');
const uniqueUrls = new Set();
let toAppend = '\n## Naukri Jobs\n\n';

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parts = line.split('\t');
    const url = parts[0];
    const title = parts[3];
    const company = parts[4];
    const location = parts[6];
    
    if (url.includes('naukri.com')) {
        const cleanUrl = url.split('?')[0]; 
        if (!uniqueUrls.has(cleanUrl)) {
            uniqueUrls.add(cleanUrl);
            toAppend += `- ${cleanUrl}\n  *${title} at ${company} (${location})*\n`;
        }
    }
}

fs.appendFileSync(pipelinePath, toAppend);
console.log(`Added ${uniqueUrls.size} unique Naukri jobs to the pipeline.`);
