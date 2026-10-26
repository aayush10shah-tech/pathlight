/**
 * Field-level evaluation against the hand-labelled synthetic gold set.
 * Run with: npm run eval
 *
 * For every field that appears in the gold label or in PathLight's output:
 *   correct value  -> true positive
 *   wrong value    -> false positive AND false negative
 *   extra value    -> false positive (PathLight said something the report does not say)
 *   missing value  -> false negative
 */
import { analyze } from '../src/engine';
import { flatten } from '../src/engine/flatten';
import { REPORTS } from '../src/data/reports';
import { STRESS } from '../src/data/stress';

type Tally = { tp: number; fp: number; fn: number };
const byField = new Map<string, Tally>();
const errors: string[] = [];
const tally = (f: string) => byField.get(f) ?? (byField.set(f, { tp: 0, fp: 0, fn: 0 }), byField.get(f)!);

// `npm run eval -- stress` scores the stress set instead of the main gold set.
const useStress = process.argv.includes('stress');
const SET = useStress ? STRESS : REPORTS;

for (const r of SET) {
  const pred = flatten(analyze(r.text));
  const gold = r.gold as unknown as Record<string, string | number | boolean>;
  for (const field of new Set([...Object.keys(gold), ...Object.keys(pred)])) {
    const g = gold[field];
    const p = pred[field];
    const t = tally(field);
    if (g !== undefined && p !== undefined && String(g) === String(p)) t.tp++;
    else {
      if (p !== undefined) t.fp++;
      if (g !== undefined) t.fn++;
      errors.push(`${r.id.padEnd(24)} ${field.padEnd(14)} expected ${JSON.stringify(g)}  got ${JSON.stringify(p)}`);
    }
  }
}

const pct = (n: number, d: number) => (d === 0 ? '  -  ' : `${((100 * n) / d).toFixed(1).padStart(5)}%`);
let TP = 0, FP = 0, FN = 0;
console.log(`\nPathLight extraction accuracy on ${SET.length} synthetic ${useStress ? "stress" : "gold"} reports\n`);
console.log('field           n   precision  recall');
for (const [field, t] of [...byField].sort()) {
  TP += t.tp; FP += t.fp; FN += t.fn;
  console.log(`${field.padEnd(14)} ${String(t.tp + t.fn).padStart(3)}   ${pct(t.tp, t.tp + t.fp)}    ${pct(t.tp, t.tp + t.fn)}`);
}
const p = TP / (TP + FP);
const rc = TP / (TP + FN);
console.log(`\nOVERALL  values=${TP + FN}  precision=${(100 * p).toFixed(1)}%  recall=${(100 * rc).toFixed(1)}%  F1=${((200 * p * rc) / (p + rc)).toFixed(1)}%`);
if (errors.length) {
  console.log(`\n${errors.length} mismatches:`);
  errors.forEach((e) => console.log('  ' + e));
}
process.exitCode = rc >= 0.95 && p >= 0.95 ? 0 : 1;
