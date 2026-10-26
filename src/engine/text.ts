import type { Presence, Segment, Span } from './types';

/** Split a report into lines, then into sentences, keeping absolute offsets. */
export function sentences(text: string): Segment[] {
  const out: Segment[] = [];
  for (const line of lines(text)) {
    // A sentence ends at . ! or ? followed by whitespace and a capital letter or "(".
    // Decimals such as "2.3 cm" have no space after the period, so they never split.
    const re = /[.!?](?=\s+[A-Z(])/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line.text)) !== null) {
      push(out, line, last, m.index + 1);
      last = m.index + 1;
    }
    push(out, line, last, line.text.length);
  }
  return out;
}

export function lines(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /[^\r\n]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].trim()) out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function push(out: Segment[], line: Segment, from: number, to: number) {
  const raw = line.text.slice(from, to);
  const lead = raw.length - raw.trimStart().length;
  const trimmed = raw.trim();
  if (!trimmed) return;
  const start = line.start + from + lead;
  out.push({ text: trimmed, start, end: start + trimmed.length });
}

const NUMBER_WORDS: Record<string, number> = {
  no: 0, none: 0, zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const UNITS = 'one|two|three|four|five|six|seven|eight|nine';

/** A count written as digits or words, up to "ninety-nine" ("thirty-nine lymph nodes"). */
export const COUNT = String.raw`(\d{1,3}|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](?:${UNITS}))?|no|none|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)`;

export function parseCount(s: string): number | null {
  const t = s.trim().toLowerCase();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const compound = /^(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](\w+))?$/.exec(t);
  if (compound) return TENS[compound[1]] + (compound[2] ? NUMBER_WORDS[compound[2]] ?? NaN : 0) || null;
  return t in NUMBER_WORDS ? NUMBER_WORDS[t] : null;
}

/** Convert a measurement to centimetres. */
export function toCm(value: number, unit: string): number {
  return unit.toLowerCase() === 'mm' ? value / 10 : value;
}

export function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function span(seg: Segment, relStart = 0, relEnd = seg.text.length): Span {
  return { start: seg.start + relStart, end: seg.start + relEnd };
}

// ---------------------------------------------------------------------------
// Negation and presence (a NegEx-style approach adapted to pathology wording)
// ---------------------------------------------------------------------------

export const PRE_NEGATION_RE = /\b(no|not|without|negative for|absence of|free of|no evidence of|no definite|nor|rules? out|ruled out)\b/i;
const PRE_AFFIRM = /\b(with|shows?|showing|demonstrat\w*|presence of|positive for|evidence of|associated)\b[^,;]*$/i;
/** A chunk containing one of these words makes its own statement, so negation stops there. */
const STATUS_VERB = /\b(is|are|was|were|present|identified|seen|involved|uninvolved|negative|positive|absent|noted|detected)\b/i;

const POST_NEGATIVE = /^[\s:,(-]*(?:(?:is|are|was|were)\s+)?(?:not\s+(?:identified|seen|present|detected|demonstrated|appreciated|observed)|absent|negative|none\b|no\b)/i;
const POST_INDETERMINATE = /^[\s:,(-]*(?:(?:is|are|was|were)\s+)?(?:cannot be (?:determined|assessed|excluded|ruled out)|indeterminate|equivocal|suspicious|not (?:assessable|applicable)|undetermined)/i;
const POST_POSITIVE = /^[\s:,(-]*(?:(?:is|are|was|were)\s+)?(?:also\s+)?(?:present|identified|seen|positive|yes\b|noted|detected|focal|extensive|multifocal)/i;

/** The text of the clause that precedes a term, cut at the last chunk that makes its own statement. */
export function preWindow(seg: string, relStart: number): string {
  const before = seg.slice(0, relStart);
  const clauseStart = Math.max(
    before.lastIndexOf(';'),
    before.lastIndexOf(':'),
    before.lastIndexOf('.'),
    lastWord(before, /\b(?:but|however|although|except|whereas)\b/gi),
  );
  const clause = before.slice(clauseStart + 1);
  // Walk back over comma/"and" chunks. Stop at the first earlier chunk that has its own verb.
  const parts = clause.split(/(,|\band\b|\bwhile\b)/i);
  let kept = parts[parts.length - 1] ?? '';
  for (let i = parts.length - 3; i >= 0; i -= 2) {
    if (STATUS_VERB.test(parts[i])) break;
    kept = parts[i] + parts[i + 1] + kept;
  }
  return kept.split(/\s+/).slice(-9).join(' ');
}

function lastWord(s: string, re: RegExp): number {
  let idx = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) idx = m.index + m[0].length - 1;
  return idx;
}

export function postWindow(seg: string, relEnd: number): string {
  // Skip a short parenthetical abbreviation, as in "Lymphovascular invasion (LVI): Not identified".
  const after = seg.slice(relEnd).replace(/^\s*\([^)]{0,20}\)/, '');
  const stop = after.search(/[;.](?!\d)/);
  return (stop === -1 ? after : after.slice(0, stop)).slice(0, 80);
}

export function isNegated(seg: string, relStart: number, relEnd: number): boolean {
  if (PRE_NEGATION_RE.test(preWindow(seg, relStart))) return true;
  return POST_NEGATIVE.test(postWindow(seg, relEnd));
}

/**
 * Decide whether a finding (e.g. "lymphovascular invasion") is reported present, absent or
 * indeterminate. Returns null when the sentence mentions the term without saying either way.
 */
export function presenceStatus(seg: string, relStart: number, relEnd: number): Presence | null {
  const pre = preWindow(seg, relStart);
  const post = postWindow(seg, relEnd);
  if (POST_INDETERMINATE.test(post)) return 'indeterminate';
  if (PRE_NEGATION_RE.test(pre)) return 'absent';
  if (POST_NEGATIVE.test(post)) return 'absent';
  if (POST_POSITIVE.test(post)) return 'present';
  if (PRE_AFFIRM.test(pre)) return 'present';
  return null;
}
