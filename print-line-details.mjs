import fs from 'fs';

const content = fs.readFileSync('reports/050-unknown-2026-05-21.md', 'utf-8');
const lines = content.split('\n');
const line26 = lines[25];

console.log('Line length:', line26.length);
const clean = line26.replace(/-{10,}/g, '[DASHES]');
console.log('Cleaned length:', clean.length);
console.log('Cleaned start:', clean.substring(0, 1000));
console.log('Cleaned end:', clean.substring(clean.length - 1000));
