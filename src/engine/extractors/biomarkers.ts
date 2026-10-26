import type {
  BreslowFinding, GleasonFinding, Her2Finding, Her2Status, Ki67Finding, MmrFinding,
  ReceptorFinding, ReceptorStatus, Segment, Site, Span,
} from '../types';
import { lines, round, sentences, span } from '../text';

const MARKER = /\b(?:estrogen receptors?|oestrogen receptors?|progesterone receptors?|HER-?2(?:\/neu)?|ERBB2|Ki-?67|MIB-?1|ER|PR|PgR)\b/gi;

/**
 * Blank out form scaffolding that looks like results: "(xy%,n/a)", "(0-3+,n/a)" and
 * "Reference range: Negative <1%". Replaced with spaces so offsets stay the same.
 */
export function scrubForm(text: string): string {
  return text
    .replace(/\((?=[^()]{0,24}(?:xy|n\/a|0\s*-\s*3\+))[^()]{0,24}\)/gi, (m) => ' '.repeat(m.length))
    .replace(/\breference range[^.;\n]{0,80}/gi, (m) => ' '.repeat(m.length))
    // Scoring legends such as "Positive (3+)/Strong complete membrane staining, >10% of cells".
    .replace(/[^.;\n]*\(\s*[0-3]\+?\s*\)\s*\/[^.;\n]*/g, (m) => ' '.repeat(m.length));
}

/** Words that mean "not done yet" rather than a result. */
const PENDING = /\b(?:pending|to follow|will be (?:reported|issued|performed)|ordered|in progress|sent out)\b/i;

/**
 * The clause about one marker: from its name to the next marker's name, the end of the
 * sentence (one follow-on sentence is allowed when it carries the numbers, as in
 * "ER: Positive. Nuclei stained: 95%"), or 160 characters, whichever comes first.
 */
function clauseAt(text: string, from: number, tokenEnd: number): string {
  MARKER.lastIndex = tokenEnd;
  const next = MARKER.exec(text);
  let end = Math.min(next ? next.index : text.length, tokenEnd + 160);
  const tail = text.slice(tokenEnd, end);
  const stop = tail.search(/\.(?=\s+[A-Z(])|;|\n/);
  if (stop !== -1) {
    const follow = /^\.\s+(?:nuclei|percent|cells|staining|intensity|allred|h-?score|score|\()[^.;\n]{0,70}/i.exec(tail.slice(stop));
    end = tokenEnd + stop + (follow ? follow[0].length : 0);
  }
  return text.slice(from, end);
}

// ---------------------------------------------------------------------------
// ER / PR
// ---------------------------------------------------------------------------

const ER_TOKEN = /\b(?:estrogen|oestrogen) receptors?\b(?:\s*\(ER\))?|\bER\b/gi;
const PR_TOKEN = /\bprogesterone receptors?\b(?:\s*\((?:PR|PgR)\))?|\b(?:PR|PgR)\b/gi;
const PERCENT = /(<|>|≥|≤)?\s*(\d{1,3}(?:\.\d+)?)\s*(?:(?:-|–|to)\s*(\d{1,3}(?:\.\d+)?)\s*)?%/;
const SHORTHAND_SIGN = /^\s*(\+|[-−–](?![a-z]))/i;
const ANY_RECEPTOR = String.raw`(?:estrogen receptors?|oestrogen receptors?|progesterone receptors?|ER|PR|PgR|HER-?2(?:\/neu)?)`;
/** "positive for ER and PR": the result comes before the names. */
const STATUS_BEFORE = new RegExp(String.raw`\b(positive|negative|reactive|non-?reactive)\s+(?:for|to)\s+(?:(?:the\s+|both\s+)?${ANY_RECEPTOR}\s*(?:,|and|&|\/)?\s*)*$`, 'i');
/** "ER, PR and HER2 negative" / "ER and PR are both positive": one result shared by a list. */
const STATUS_SHARED = new RegExp(String.raw`^\s*(?:(?:,|and|&|\/)\s*${ANY_RECEPTOR}\s*)+(?:(?:are|is|were|both|all)\s+)*(low[- ]positive|positive|negative)\b`, 'i');

function receptor(raw: string, kind: 'er' | 'pr'): ReceptorFinding | null {
  const text = scrubForm(raw);
  const token = kind === 'er' ? ER_TOKEN : PR_TOKEN;
  let status0: ReceptorStatus | null = null;
  let percent: number | null = null;
  let percentText: string | null = null;
  let intensity: string | null = null;
  const spans: Span[] = [];
  token.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = token.exec(text)) !== null) {
    // Abbreviations must be upper-case ("ER", "PR"); full names may be any case.
    if (m[0].length <= 3 && !['ER', 'PR', 'PgR'].includes(m[0])) continue;
    const tokenEnd = m.index + m[0].length;
    const after = text.slice(tokenEnd, tokenEnd + 160);
    const clause = clauseAt(text, m.index, tokenEnd);
    if (/\bcontrols?\b/i.test(clause) || PENDING.test(clause)) continue;
    let status: ReceptorStatus | null = statusWord(clause.slice(m[0].length));
    const sign = SHORTHAND_SIGN.exec(after);
    if (!status && sign) status = sign[1] === '+' ? 'positive' : 'negative';
    if (!status) {
      const shared = STATUS_SHARED.exec(after);
      if (shared) status = statusWord(shared[1]);
    }
    status ??= statusBefore(text, m.index);
    const pct = PERCENT.exec(clause);
    if (!status && !pct) continue;
    // Shorthand like "ER+/PR+ (ER 80%, PR 30%)" splits status and percent across mentions,
    // so the first status and the first percent are kept from whichever mention has them.
    status0 ??= status;
    if (pct && percentText === null) {
      percentText = pct[0].trim();
      const lo = parseFloat(pct[2]);
      const hi = pct[3] ? parseFloat(pct[3]) : lo;
      percent = pct[1] === '<' || pct[1] === '≤' ? Math.max(0, hi - 0.5) : hi;
    }
    intensity ??= /\b(weak|moderate|intermediate|strong)\b/i.exec(clause)?.[1].toLowerCase() ?? null;
    spans.push({ start: m.index, end: m.index + clause.trimEnd().length });
  }
  if (spans.length === 0) return null;
  const derived: ReceptorStatus | null = percent === null ? null
    : percent < 1 ? 'negative' : kind === 'er' && percent <= 10 ? 'low positive' : 'positive';
  let status: ReceptorStatus = status0 ?? derived ?? 'unknown';
  // ASCO/CAP: ER staining in 1-10% of cells is reported as "low positive".
  if (status === 'positive' && derived === 'low positive') status = 'low positive';
  return {
    id: kind,
    kind,
    status,
    percent: percent === null ? null : round(percent, 1),
    percentText,
    intensity,
    spans,
  };
}

function statusWord(s: string): ReceptorStatus | null {
  if (/\blow[- ]positive\b/i.test(s)) return 'low positive';
  // "...and negative for HER2": a result followed by "for" belongs to the marker after it.
  const m = /\b(positive|pos|negative|neg)\b(?!\s+(?:for|to)\b)|\bnot (?:detected|expressed)\b/i.exec(s);
  if (!m) return null;
  return /^pos/i.test(m[0]) ? 'positive' : 'negative';
}

/** "positive for ER and PR" / "negative for HER2": the result written just before the marker. */
function statusBefore(text: string, at: number): 'positive' | 'negative' | null {
  const sentenceStart = Math.max(text.lastIndexOf('. ', at), text.lastIndexOf('\n', at), text.lastIndexOf(';', at), at - 80);
  const before = STATUS_BEFORE.exec(text.slice(sentenceStart + 1, at));
  if (!before) return null;
  return /^pos|^reac/i.test(before[1]) ? 'positive' : 'negative';
}

export const extractER = (text: string) => receptor(text, 'er');
export const extractPR = (text: string) => receptor(text, 'pr');

// ---------------------------------------------------------------------------
// HER2 (ASCO/CAP 2018 scoring, with the 2023 HER2-low / ultralow vocabulary)
// ---------------------------------------------------------------------------

const HER2_TOKEN = /\b(?:HER-?2(?:\/neu)?|ERBB2)\b/gi;
const HER2_ANY = /\b(?:HER-?2|ERBB2)\b/i;
const ISH_TERM = /\b(?:FISH|ISH|SISH|CISH|DISH|DDISH|in situ hybridi[sz]ation)\b/i;
const OTHER_GENE = /\b(?:ALK|ROS1|EGFR|MET|RET|NTRK\d?|BRAF|KRAS|MYC|ERG|1p|19q|MDM2|HPV|EBER|kappa|lambda)\b/i;

export function extractHer2(raw: string): Her2Finding | null {
  const text = scrubForm(raw);
  let ihc: 0 | 1 | 2 | 3 | null = null;
  let ish: 'amplified' | 'not amplified' | null = null;
  let word: string | null = null;
  const spans: Span[] = [];
  HER2_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HER2_TOKEN.exec(text)) !== null) {
    const tokenEnd = m.index + m[0].length;
    const clause = clauseAt(text, m.index, tokenEnd);
    if (/\bcontrols?\b/i.test(clause)) continue;
    const rest = clause.slice(m[0].length);
    const restNoIsh = rest.split(ISH_TERM)[0];
    let found = false;
    if (!PENDING.test(restNoIsh) || /\b[0-3]\s*\+/.test(restNoIsh)) {
      // "2+" but not the "0-3+" of a range; "score 1"; "Negative (0)"; or a bare "HER2: 1" after a scrubbed form label.
      const plus = /(?<![-–\d])\b([0-3])\s*\+/.exec(restNoIsh)
        ?? /\b(?:score|IHC)\D{0,6}([0-3])\b(?!\s*(?:%|\.\d))/i.exec(restNoIsh)
        ?? /^[\s:(\-–]*(?:\(?IHC\)?\s*:?\s*)?(?:negative\s*)?\(?\s*(0)\s*\)?(?![\d.%])/i.exec(restNoIsh)
        ?? /^\s*:\s*([0-3])(?!\d|\.\d|%|\+)/.exec(restNoIsh);
      if (plus && ihc === null) {
        ihc = parseInt(plus[1], 10) as 0 | 1 | 2 | 3;
        found = true;
      }
      const before = statusBefore(text, m.index);
      const w = /\b(ultra-?low|low|positive|negative|equivocal|null)\b(?!\s+(?:for|to)\b)/i.exec(restNoIsh)
        ?? /^\s*(\+|[-−–](?![a-z]))/i.exec(restNoIsh)
        ?? (before ? [before, before] : null);
      if (w && word === null && !/\bweakly\s+positive\b/i.test(restNoIsh)) {
        word = w[1].toLowerCase().replace('-', '');
        if (word === '+') word = 'positive';
        else if (/^[−–]$/.test(word) || word === '') word = 'negative';
        found = true;
      }
    }
    if (found) spans.push({ start: m.index, end: m.index + clause.trimEnd().length });
  }
  // In situ hybridization, judged sentence by sentence: it must be about HER2 (in the same
  // sentence or the one before) and must not be about another gene or still pending.
  const sents = sentences(text);
  for (let i = 0; i < sents.length && ish === null; i++) {
    const s = sents[i];
    if (!ISH_TERM.test(s.text) || PENDING.test(s.text) || /\bcontrols?\b/i.test(s.text)) continue;
    const aboutHer2 = HER2_ANY.test(s.text) || (i > 0 && HER2_ANY.test(sents[i - 1].text) && !OTHER_GENE.test(s.text));
    if (!aboutHer2) continue;
    const r = ishResult(s.text);
    if (r) {
      ish = r;
      spans.push(span(s));
    }
  }
  if (ihc === null && ish === null && word === null) return null;
  return { id: 'her2', kind: 'her2', status: her2Status(ihc, ish, word), ihc, ish, spans };
}

function ishResult(s: string): 'amplified' | 'not amplified' | null {
  if (/\bamplification\s+(?:is\s+|was\s+)?not\s+(?:found|detected|present|identified|seen)\b|\bno\s+(?:evidence\s+of\s+)?(?:gene\s+)?amplification\b/i.test(s)) return 'not amplified';
  if (/\bamplification\s+(?:is\s+|was\s+)?(?:found|detected|present|identified)\b/i.test(s)) return 'amplified';
  const m = /\b(not amplified|non-?amplified|no amplification|negative|amplified|positive)\b/i.exec(s.split(ISH_TERM).slice(1).join(' ') || s);
  if (!m) return null;
  return /^(amplified|positive)$/i.test(m[1]) ? 'amplified' : 'not amplified';
}

export function her2Status(ihc: 0 | 1 | 2 | 3 | null, ish: 'amplified' | 'not amplified' | null, word: string | null): Her2Status {
  if (ish === 'amplified' || ihc === 3) return 'positive';
  if (ihc === 2) return ish === 'not amplified' || word === 'negative' || word === 'low' ? 'low' : 'equivocal';
  if (ihc === 1) return 'low';
  if (ihc === 0) return word === 'ultralow' ? 'ultralow' : 'zero';
  if (ish === 'not amplified') return word === 'low' ? 'low' : 'negative';
  switch (word) {
    case 'positive': return 'positive';
    case 'equivocal': return 'equivocal';
    case 'low': return 'low';
    case 'ultralow': return 'ultralow';
    case 'null': return 'zero';
    case 'negative': return 'negative';
    default: return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// Ki-67
// ---------------------------------------------------------------------------

export function extractKi67(text: string): Ki67Finding | null {
  for (const line of lines(text)) {
    const m = /\b(?:Ki-?67|MIB-?1)\b/i.exec(line.text);
    if (!m) continue;
    const clause = clauseAt(line.text, m.index, m.index + m[0].length);
    const p = PERCENT.exec(clause);
    if (!p) continue;
    const lo = parseFloat(p[2]);
    const hi = p[3] ? parseFloat(p[3]) : lo;
    return {
      id: 'ki67',
      kind: 'ki67',
      percent: round((lo + hi) / 2, 1),
      percentText: p[0].trim(),
      spans: [{ start: line.start + m.index, end: line.start + m.index + clause.trimEnd().length }],
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mismatch repair (MMR) / microsatellite instability (MSI)
// ---------------------------------------------------------------------------

const PROTEINS = ['MLH1', 'PMS2', 'MSH2', 'MSH6'];

export function extractMmr(segs: Segment[]): MmrFinding | null {
  const lost = new Set<string>();
  let intact = false;
  let deficient = false;
  const spans: Span[] = [];
  for (const seg of segs) {
    const s = seg.text;
    if (/\bMSI-H\b|microsatellite instability[- ]high|high[- ](?:level )?microsatellite instability|\bdMMR\b|mismatch repair[- ]deficien|deficient mismatch repair/i.test(s)) {
      deficient = true;
      spans.push(span(seg));
    }
    if (/\bMSS\b|microsatellite[- ]stable|\bMSI-L\b|\bpMMR\b|mismatch repair[- ]proficient|proficient mismatch repair|(?:mismatch repair|MMR)[^.;]{0,60}\b(?:intact|retained|preserved)\b|\bno loss\b[^.;]{0,40}\b(?:mismatch repair|MMR)\b/i.test(s)) {
      intact = true;
      spans.push(span(seg));
    }
    if (!PROTEINS.some((p) => s.includes(p))) continue;
    // Judge each protein by the clause it sits in: "Loss of MLH1 and PMS2, with retained MSH2 and MSH6".
    let offset = 0;
    for (const clause of s.split(/(;|,\s*(?:with|while|and)\b|\bwhile\b|\bwhereas\b|\bbut\b)/i)) {
      const here = offset;
      offset += clause.length;
      const named = PROTEINS.filter((p) => new RegExp(`\\b${p}\\b`).test(clause));
      if (named.length === 0) continue;
      const noLoss = /\b(?:no|without) loss\b/i.test(clause);
      const isLost = !noLoss && /\b(?:loss|lost|absent|deficient|negative|not retained|no (?:nuclear )?(?:expression|staining))\b/i.test(clause);
      const isIntact = noLoss || /\b(?:intact|retained|present|preserved|positive|normal)\b/i.test(clause);
      if (isLost && !isIntact) {
        named.forEach((p) => lost.add(p));
        spans.push(span(seg, here, here + clause.length));
      } else if (isIntact && !isLost) {
        intact = true;
        spans.push(span(seg, here, here + clause.length));
      }
    }
  }
  if (lost.size > 0) deficient = true;
  if (!deficient && !intact) return null;
  return {
    id: 'mmr',
    kind: 'mmr',
    status: deficient ? 'deficient' : 'proficient',
    lost: PROTEINS.filter((p) => lost.has(p)),
    spans: dedupe(spans),
  };
}

function dedupe(spans: Span[]): Span[] {
  const seen = new Set<string>();
  return spans.filter((s) => {
    const k = `${s.start}:${s.end}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Gleason score / Grade Group (prostate)
// ---------------------------------------------------------------------------

const GLEASON = /\bGleason(?:\s+(?:score|grade|sum|pattern))?\s*(?:\(\s*GS\s*\))?\s*[:=]?\s*(?:(\d{1,2})\s*\(\s*([3-5])\s*\+\s*([3-5])\s*\)|([3-5])\s*\+\s*([3-5])(?:\s*=\s*(\d{1,2}))?)/gi;
const GRADE_GROUP = /\b(?:ISUP\s+|WHO\s+)?grade\s+group\s*(?:\(\s*GG\s*\))?\s*[:=]?\s*([1-5]|IV|V|I{1,3})\b/gi;
const GG_ROMAN: Record<string, 1 | 2 | 3 | 4 | 5> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, i: 1, ii: 2, iii: 3, iv: 4, v: 5 };

export function gradeGroupFor(primary: number, secondary: number): 1 | 2 | 3 | 4 | 5 {
  const total = primary + secondary;
  if (total <= 6) return 1;
  if (total === 7) return primary === 3 ? 2 : 3;
  if (total === 8) return 4;
  return 5;
}

export function extractGleason(segs: Segment[], site: Site): GleasonFinding | null {
  if (site !== 'prostate') return null;
  type Cand = { primary: number | null; secondary: number | null; total: number | null; gg: 1 | 2 | 3 | 4 | 5 | null; sp: Span };
  const cands: Cand[] = [];
  for (const seg of segs) {
    for (const m of seg.text.matchAll(GLEASON)) {
      const primary = parseInt(m[2] ?? m[4], 10);
      const secondary = parseInt(m[3] ?? m[5], 10);
      // A number attached to a Grade Group in the same segment overrides the derived one.
      cands.push({ primary, secondary, total: primary + secondary, gg: gradeGroupFor(primary, secondary), sp: span(seg, m.index!, m.index! + m[0].length) });
    }
    for (const m of seg.text.matchAll(GRADE_GROUP)) {
      const gg = GG_ROMAN[m[1].toLowerCase()];
      const sp = span(seg, m.index!, m.index! + m[0].length);
      const sameSeg = cands.find((c) => c.sp.start >= seg.start && c.sp.end <= seg.end && c.gg === gg);
      if (sameSeg) sameSeg.sp = { start: Math.min(sameSeg.sp.start, sp.start), end: Math.max(sameSeg.sp.end, sp.end) };
      else cands.push({ primary: null, secondary: null, total: null, gg, sp });
    }
  }
  if (cands.length === 0) return null;
  const rank = (c: Cand) => (c.gg ?? 0) * 100 + (c.total ?? 0) * 10 + (c.primary ?? 0);
  const best = cands.reduce((a, b) => (rank(b) > rank(a) ? b : a));
  return {
    id: 'gleason',
    kind: 'gleason',
    primary: best.primary,
    secondary: best.secondary,
    total: best.total,
    gradeGroup: best.gg,
    statements: cands.length,
    spans: cands.map((c) => c.sp),
  };
}

// ---------------------------------------------------------------------------
// Breslow thickness (melanoma)
// ---------------------------------------------------------------------------

export function extractBreslow(segs: Segment[], site: Site): BreslowFinding | null {
  if (site !== 'melanoma') return null;
  let best: BreslowFinding | null = null;
  for (const seg of segs) {
    const m = /\b(?:breslow(?:\s+(?:thickness|depth))?|(?:maximum|tumou?r)\s+(?:\(breslow\)\s+)?thickness)\b[^.\n\d]{0,40}?(\d+(?:\.\d+)?)\s*(mm|cm)\b/i.exec(seg.text);
    if (!m) continue;
    const mm = round(m[2].toLowerCase() === 'cm' ? parseFloat(m[1]) * 10 : parseFloat(m[1]), 2);
    if (!best || mm > best.mm) {
      best = { id: 'breslow', kind: 'breslow', mm, spans: [span(seg, m.index, m.index + m[0].length)] };
    }
  }
  return best;
}
