import fs from 'fs';
import path from 'path';

const pipelinePath = path.resolve('data/pipeline.md');

let content = fs.readFileSync(pipelinePath, 'utf-8');

const lines = content.split('\n');

const newLines = [];
let removed = 0;
const goodUrls = [];

let i = 0;
while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('- https://www.naukri.com')) {
        const urlMatch = line.match(/- (https:\/\/.+)/);
        if (urlMatch) {
            const url = urlMatch[1];
            // Check if the URL slug contains years like 3-to-8-years, 5-to-10-years, etc.
            const hasHighExp = /([3-9]|[1-9][0-9])-to-/.test(url);
            
            if (hasHighExp) {
                // skip this line and the next line (the italic title)
                removed++;
                i += 2;
                continue;
            } else {
                goodUrls.push(url);
            }
        }
    }
    newLines.push(line);
    i++;
}

// Write the filtered pipeline back
fs.writeFileSync(pipelinePath, newLines.join('\n'));
console.log(`Pruned ${removed} jobs from the pipeline that clearly required senior experience.`);
console.log(`Remaining jobs to evaluate: ${goodUrls.length}`);

// Return the top 5 good URLs
console.log('\nTop 5 fresher-friendly jobs:');
goodUrls.slice(0, 5).forEach(u => console.log(u));
