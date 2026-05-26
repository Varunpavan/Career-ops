import fs from 'fs';

const content = fs.readFileSync('reports/050-unknown-2026-05-21.md', 'utf-8');
const lines = content.split('\n');
console.log(`Total lines: ${lines.length}`);
lines.forEach((line, idx) => {
  console.log(`Line ${idx + 1}: length=${line.length}, start="${line.substring(0, 80)}", end="${line.substring(line.length - 80)}"`);
});
