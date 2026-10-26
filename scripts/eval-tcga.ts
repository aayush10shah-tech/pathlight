/**
 * Real-world evaluation on TCGA-Reports (Kefeli & Tatonetti, Patterns 2024; 9,523 OCR'd pathology
 * reports) against curated TCGA clinical data from cBioPortal.
 *
 * Patients are split 50/50 by a hash of their ID. Only the DEV half is ever inspected to find and
 * fix errors; the TEST half is scored as held-out data.
 *
 *   npm run eval:tcga            -> scores both halves
 *   npm run eval:tcga -- errors  -> prints DEV-half disagreements for error analysis
 *
 * The data is not part of the repository; see eval-data/README.md for how to fetch it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { analyze } from '../src/engine';
import type { Finding, FindingKind, FindingOf } from '../src/engine/types';

const RAW = 'eval-data/raw';
if (!existsSync(`${RAW}/TCGA_Reports.csv`)) {
  console.error('Missing eval-data/raw/TCGA_Reports.csv. See eval-data/README.md.');
  process.exit(1);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

type Labels = Record<string, string>;
const STUDIES = { brca_tcga: 'breast', coadread_tcga: 'colorectal', luad_tcga: 'lung', lusc_tcga: 'lung', prad_tcga: 'prostate', skcm_tcga: 'melanoma' } as const;
const labels = new Map<string, { study: string; l: Labels }>();
for (const study of Object.keys(STUDIES)) {
  const data = JSON.parse(readFileSync(`${RAW}/clin_${study}.json`, 'utf8')) as { patientId: string; clinicalAttributeId: string; value: string }[];
  for (const d of data) {
    const e = labels.get(d.patientId) ?? { study, l: {} };
    e.l[d.clinicalAttributeId] = d.value;
    labels.set(d.patientId, e);
  }
}

/** Deterministic 50/50 split (FNV-1a hash of the patient ID). */
function half(id: string): 'dev' | 'test' {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h % 2 === 0 ? 'dev' : 'test';
}

const NA = /^(?:\[?(?:not available|not applicable|unknown|not evaluated|discrepancy|completed|indeterminate|equivocal)\]?|)$/i;
const tCat = (v: string | null | undefined) => (v ? (/^T(is|X|[0-4])/i.exec(v.trim())?.[0].toUpperCase().replace('TIS', 'Tis') ?? null) : null);
const nCat = (v: string | null | undefined) => (v ? (/^N(X|[0-3])/i.exec(v.trim())?.[0].toUpperCase() ?? null) : null);
const posNeg = (s: string | undefined) => (s === 'positive' || s === 'low positive' ? 'Positive' : s === 'negative' ? 'Negative' : null);

type Pred = Record<string, string | number | null>;
function predict(text: string): Pred {
  const a = analyze(text);
  const get = <K extends FindingKind>(k: K) => a.findings.find((f: Finding) => f.kind === k) as FindingOf<K> | undefined;
  const tnm = get('tnm');
  const her2 = get('her2');
  const nodes = get('lymphNodes');
  const gl = get('gleason');
  return {
    site: a.site,
    T: tCat(tnm?.t),
    N: nCat(tnm?.n),
    ER: posNeg(get('er')?.status),
    PR: posNeg(get('pr')?.status),
    HER2: her2 ? (her2.status === 'positive' ? 'Positive' : her2.status === 'equivocal' ? 'Equivocal' : her2.status === 'unknown' ? null : 'Negative') : null,
    nodesExamined: nodes?.examined ?? null,
    nodesPositive: nodes?.positive ?? null,
    gleasonPrimary: gl?.primary ?? null,
    gleasonSecondary: gl?.secondary ?? null,
    gleasonTotal: gl?.total ?? null,
    breslow: get('breslow')?.mm ?? null,
    ulceration: get('ulceration')?.status === 'present' ? 'YES' : get('ulceration')?.status === 'absent' ? 'NO' : null,
  };
}

function gold(study: string, l: Labels): Pred {
  const g: Pred = { site: STUDIES[study as keyof typeof STUDIES] };
  const take = (k: string) => (l[k] && !NA.test(l[k]) ? l[k] : null);
  if (study !== 'prad_tcga') {
    g.T = tCat(take('AJCC_TUMOR_PATHOLOGIC_PT'));
    g.N = nCat(take('AJCC_NODES_PATHOLOGIC_PN'));
  }
  if (study === 'brca_tcga') {
    g.ER = take('ER_STATUS_BY_IHC');
    g.PR = take('PR_STATUS_BY_IHC');
    // Clinical HER2 status: ISH decides when it was done, otherwise IHC.
    const fish = take('HER2_FISH_STATUS');
    const ihc = l.IHC_HER2 && !/^\[/.test(l.IHC_HER2) ? l.IHC_HER2 : null;
    g.HER2 = fish ?? (ihc === 'Indeterminate' ? null : ihc);
  }
  if (study === 'brca_tcga' || study === 'coadread_tcga' || study === 'prad_tcga') {
    const ex = take('LYMPH_NODE_EXAMINED_COUNT');
    g.nodesExamined = ex !== null && /^\d+$/.test(ex) ? +ex : null;
    const pos = take('LYMPH_NODES_EXAMINED_HE_COUNT');
    g.nodesPositive = pos !== null && /^\d+$/.test(pos) ? +pos : null;
  }
  if (study === 'prad_tcga') {
    for (const [k, a] of [['gleasonPrimary', 'GLEASON_PATTERN_PRIMARY'], ['gleasonSecondary', 'GLEASON_PATTERN_SECONDARY'], ['gleasonTotal', 'GLEASON_SCORE']] as const) {
      const v = take(a);
      g[k] = v !== null && /^\d+$/.test(v) ? +v : null;
    }
  }
  if (study === 'skcm_tcga') {
    const b = take('BRESLOW_DEPTH');
    g.breslow = b !== null && /^\d+(\.\d+)?$/.test(b) ? +b : null;
    g.ulceration = take('PRIMARY_MELANOMA_TUMOR_ULCERATION');
  }
  return g;
}

const same = (field: string, p: string | number | null, g: string | number) =>
  field === 'breslow' ? typeof p === 'number' && Math.abs(p - (g as number)) <= 0.05 : String(p).toLowerCase() === String(g).toLowerCase();

type Tally = { gold: number; answered: number; correct: number };
const score = { dev: new Map<string, Tally>(), test: new Map<string, Tally>() };
const errors: string[] = [];
const showErrors = process.argv.includes('errors');
const counts = { dev: 0, test: 0 };

const rows = parseCsv(readFileSync(`${RAW}/TCGA_Reports.csv`, 'utf8')).slice(1);
for (const [file, text] of rows) {
  if (!file || !text) continue;
  const patient = file.slice(0, 12);
  const lab = labels.get(patient);
  if (!lab) continue;
  const split = half(patient);
  counts[split]++;
  const g = gold(lab.study, lab.l);
  const p = predict(text);
  for (const [field, gv] of Object.entries(g)) {
    if (gv === null || gv === undefined) continue;
    const t = score[split].get(field) ?? { gold: 0, answered: 0, correct: 0 };
    t.gold++;
    const pv = p[field];
    if ((pv === null || pv === undefined) && split === 'dev' && process.argv.includes(`miss=${field}`)) {
      errors.push(`${patient} ${field.padEnd(16)} gold=${gv}  pathlight=MISSING`);
    }
    if (pv !== null && pv !== undefined) {
      t.answered++;
      if (same(field, pv, gv)) t.correct++;
      else if (split === 'dev') errors.push(`${patient} ${field.padEnd(16)} gold=${gv}  pathlight=${pv}`);
    }
    score[split].set(field, t);
  }
}

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : '-');
for (const split of ['dev', 'test'] as const) {
  console.log(`\n${split.toUpperCase()} half: ${counts[split]} reports with curated labels`);
  console.log('field              labeled  answered  accuracy-when-answered  coverage');
  let G = 0, A = 0, C = 0;
  for (const [f, t] of [...score[split]].sort()) {
    G += t.gold; A += t.answered; C += t.correct;
    console.log(`${f.padEnd(18)} ${String(t.gold).padStart(7)}  ${String(t.answered).padStart(8)}  ${pct(t.correct, t.answered).padStart(22)}  ${pct(t.answered, t.gold).padStart(8)}`);
  }
  console.log(`${'ALL'.padEnd(18)} ${String(G).padStart(7)}  ${String(A).padStart(8)}  ${pct(C, A).padStart(22)}  ${pct(A, G).padStart(8)}`);
}
if (showErrors) {
  console.log(`\nDEV disagreements (${errors.length}):`);
  for (const e of errors) console.log('  ' + e);
}
