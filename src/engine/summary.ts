import type { Analysis, FindingKind, FindingOf, Site } from './types';
import { GENERIC_HISTOLOGY_PREFIX } from './extractors/core';

/** A run of summary text; `fid` marks a phrase that links to a finding in the report. */
export interface Run {
  text: string;
  fid?: string;
}

const ORGAN: Record<Site, string> = {
  breast: 'breast', colorectal: 'colorectal', prostate: 'prostate', lung: 'lung', melanoma: 'skin', other: '',
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const article = (s: string) => (/^[aeiou]/i.test(s) ? 'an' : 'a');

/**
 * A plain-language opening paragraph, written from the findings with fixed rules (no AI), so that
 * every phrase is checkable against the report.
 */
export function summarize(a: Analysis): Run[] {
  const get = <K extends FindingKind>(k: K) => a.findings.find((f) => f.kind === k) as FindingOf<K> | undefined;
  const runs: Run[] = [];
  const say = (text: string, fid?: string) => runs.push({ text, fid });

  if (a.noMalignancy && !get('histology')) {
    say('This report says ');
    say('no cancer was found in the sample', 'noMalignancy');
    say('. The notes beside the report explain the medical words it uses.');
    return runs;
  }

  const h = get('histology');
  const organ = ORGAN[a.site];
  if (h && (h.names[0] || h.inSitu[0])) {
    const main = (h.names[0] ?? h.inSitu[0]).replace(GENERIC_HISTOLOGY_PREFIX, '');
    say(organ ? `This ${organ} report describes ` : 'This report describes ');
    say(`${article(main)} ${lower(main)}`, 'histology');
    const inSitu = h.names.length ? h.inSitu : [];
    if (inSitu.length) say(`, with ${lower(inSitu[0]).replace(/ \(.*\)$/, '')} nearby`);
    say('. ');
  } else {
    say('PathLight found the results below in this report. ');
  }

  const size = get('tumorSize');
  const grade = get('grade');
  const gleason = get('gleason');
  const breslow = get('breslow');
  if (size) {
    say('The tumor measured ');
    say(`${size.cm} cm`, 'tumorSize');
    if (grade?.grade) { say(' and is '); say(`grade ${grade.grade} of 3`, 'grade'); }
    else if (grade?.tier) { say(' and is '); say(`${grade.tier} grade`, 'grade'); }
    say('. ');
  } else if (grade?.grade || grade?.tier) {
    say('It is ');
    say(grade.grade ? `grade ${grade.grade} of 3` : `${grade.tier} grade`, 'grade');
    say('. ');
  }
  if (gleason?.gradeGroup) {
    say('The highest result is ');
    say(`Grade Group ${gleason.gradeGroup}${gleason.total ? ` (Gleason ${gleason.primary}+${gleason.secondary}=${gleason.total})` : ''}`, 'gleason');
    say(gleason.gradeGroup === 1 ? ', the slowest-growing group. ' : '. ');
  }
  if (breslow) {
    say('It reaches ');
    say(`${breslow.mm} mm deep`, 'breslow');
    say(' into the skin. ');
  }

  const nodes = get('lymphNodes');
  if (nodes && nodes.positive !== null) {
    if (nodes.positive === 0) {
      if (nodes.examined === 1) { say('The one lymph node checked '); say('did not have cancer', 'lymphNodes'); }
      else if (nodes.examined === 2) { say('Neither of the 2 lymph nodes checked '); say('had cancer', 'lymphNodes'); }
      else { say(nodes.examined ? `None of the ${plural(nodes.examined, 'lymph node')} checked ` : 'No lymph node checked '); say('had cancer', 'lymphNodes'); }
      say('. ');
    } else {
      say('Cancer was found in ');
      say(nodes.examined ? `${nodes.positive} of ${plural(nodes.examined, 'lymph node')}` : plural(nodes.positive, 'lymph node'), 'lymphNodes');
      say('. ');
    }
  }
  const margins = get('margins');
  if (margins?.status === 'negative') { say('The '); say('surgical edges were clear', 'margins'); say('. '); }
  else if (margins?.status === 'positive') { say('Cancer cells '); say('reached a surgical edge', 'margins'); say(', which is worth discussing. '); }
  else if (margins?.status === 'close') { say('The cancer came '); say('close to a surgical edge', 'margins'); say('. '); }

  const er = get('er');
  const pr = get('pr');
  const her2 = get('her2');
  const bits: Run[] = [];
  const hrPos = er && (er.status === 'positive' || er.status === 'low positive');
  if (er && pr && er.status === pr.status && er.status !== 'unknown') {
    bits.push({ text: `${er.status === 'negative' ? 'estrogen- and progesterone-receptor negative' : 'estrogen- and progesterone-receptor positive'}`, fid: 'er' });
  } else {
    if (er && er.status !== 'unknown') bits.push({ text: `ER ${er.status}`, fid: 'er' });
    if (pr && pr.status !== 'unknown') bits.push({ text: `PR ${pr.status}`, fid: 'pr' });
  }
  if (her2 && her2.status !== 'unknown') {
    const label = { positive: 'HER2-positive', equivocal: 'HER2 borderline (more testing needed)', low: 'HER2-low', ultralow: 'HER2-ultralow', zero: 'HER2 0', negative: 'HER2-negative' }[her2.status];
    bits.push({ text: label, fid: 'her2' });
  }
  if (bits.length) {
    say(hrPos || bits.length > 1 ? 'The tumor is ' : 'It is ');
    bits.forEach((b, i) => {
      if (i > 0) say(i === bits.length - 1 ? ' and ' : ', ');
      say(b.text, b.fid);
    });
    say('. ');
  }
  const mmr = get('mmr');
  if (mmr) {
    say('Its DNA-repair (mismatch repair) test is ');
    say(mmr.status === 'deficient' ? 'deficient' : 'normal', 'mmr');
    say(mmr.status === 'deficient' ? ', which matters for immunotherapy and genetic counseling. ' : '. ');
  }
  say('Each result is marked in your report below, with a plain-language note beside it.');
  return runs;
}
