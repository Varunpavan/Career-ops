import fs from 'fs';
import path from 'path';

const tsvPath = path.resolve('data/india-jobs.tsv');
let content = fs.readFileSync(tsvPath, 'utf-8');

// Fix literal backslash sequences
content = content.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
fs.writeFileSync(tsvPath, content);

console.log('Fixed india-jobs.tsv formatting.');
