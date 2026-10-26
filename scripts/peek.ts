/** Error-analysis helper: print report snippets around a pattern. Usage: vite-node scripts/peek.ts -- <patient> <regex> [width] */
import { readFileSync } from 'node:fs';

const [patient, pattern, width = '160'] = process.argv.slice(2).filter((a) => a !== '--');
const csv = readFileSync('eval-data/raw/TCGA_Reports.csv', 'utf8');
const start = csv.indexOf(`\n${patient}.`);
if (start < 0) { console.log('not found'); process.exit(0); }
const end = csv.indexOf('\nTCGA-', start + 10);
const text = csv.slice(start, end === -1 ? undefined : end);
const re = new RegExp(pattern, 'gi');
const w = +width;
let m: RegExpExecArray | null;
let n = 0;
while ((m = re.exec(text)) !== null && n < 6) {
  console.log(`...${text.slice(Math.max(0, m.index - w), m.index + m[0].length + w).replace(/\s+/g, ' ')}...\n`);
  n++;
}
