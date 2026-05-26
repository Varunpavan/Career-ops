import fs from 'fs';
import path from 'path';

const tsvPath = path.resolve('data/india-jobs.tsv');
const lines = fs.readFileSync(tsvPath, 'utf-8').trim().split('\n');

const uniqueUrls = new Set();
const uniqueJobs = [];

const header = lines[0];

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parts = line.split('\t');
    const url = parts[0];
    
    // We only want Naukri jobs for this batch
    if (url.includes('naukri.com')) {
        // Naukri URLs sometimes have unique query params, but the base URL up to the job ID is unique
        const cleanUrl = url.split('?')[0]; 
        if (!uniqueUrls.has(cleanUrl)) {
            uniqueUrls.add(cleanUrl);
            uniqueJobs.push(line);
        }
    }
}

console.log(`Found ${uniqueJobs.length} unique Naukri jobs out of 120 extracted.`);

// Write the first 10 unique jobs to a batch evaluation list
const batchListPath = path.resolve('batch/naukri-pipeline.md');
let batchContent = '# Naukri Batch Pipeline\n\n';
for (let i = 0; i < Math.min(10, uniqueJobs.length); i++) {
    const jobInfo = uniqueJobs[i].split('\t');
    batchContent += `- ${jobInfo[0]}\n`;
}

fs.writeFileSync(batchListPath, batchContent);
console.log(`Wrote top 10 unique Naukri jobs to ${batchListPath}`);
