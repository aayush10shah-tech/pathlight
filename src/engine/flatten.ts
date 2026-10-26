import type { Analysis, FindingKind, FindingOf } from './types';

/** A flat record of the main values, used by the evaluation script and the tests. */
export type Flat = Record<string, string | number | boolean>;

export function flatten(a: Analysis): Flat {
  const out: Flat = { site: a.site };
  const get = <K extends FindingKind>(k: K) => a.findings.find((f) => f.kind === k) as FindingOf<K> | undefined;
  const put = (k: string, v: string | number | boolean | null | undefined) => {
    if (v !== null && v !== undefined) out[k] = v;
  };
  const h = get('histology');
  put('histology', h?.names[0] ?? h?.inSitu[0]);
  if (h && h.inSitu.length) out.inSitu = true;
  const g = get('grade');
  if (a.site === 'colorectal') put('tier', g?.tier);
  else put('grade', g?.grade);
  put('sizeCm', get('tumorSize')?.cm);
  const tnm = get('tnm');
  put('t', tnm?.t);
  put('n', tnm?.n);
  put('m', tnm?.m);
  const mg = get('margins');
  if (mg && mg.status !== 'unknown') out.margin = mg.status;
  put('closestMm', mg?.closestMm);
  for (const k of ['lvi', 'pni', 'epe', 'svi', 'vpi', 'ulceration', 'tumorDeposits'] as const) put(k, get(k)?.status);
  const nodes = get('lymphNodes');
  put('nodesPos', nodes?.positive);
  put('nodesExam', nodes?.examined);
  const er = get('er');
  put('er', er?.status);
  put('erPct', er?.percent);
  const pr = get('pr');
  put('pr', pr?.status);
  put('prPct', pr?.percent);
  put('her2', get('her2')?.status);
  put('ki67', get('ki67')?.percent);
  const gl = get('gleason');
  put('gleasonGG', gl?.gradeGroup);
  put('gleasonTotal', gl?.total);
  put('mmr', get('mmr')?.status);
  put('breslow', get('breslow')?.mm);
  if (a.noMalignancy) out.noMalignancy = true;
  return out;
}
