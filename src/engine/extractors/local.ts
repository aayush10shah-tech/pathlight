import type {
  MarginFinding, NodeFinding, Presence, PresenceFinding, PresenceKind, Segment, Site, Span,
} from '../types';
import { COUNT, isNegated, parseCount, PRE_NEGATION_RE, presenceStatus, round, span } from '../text';

// ---------------------------------------------------------------------------
// Margins (did the surgeon remove a rim of normal tissue around the tumor?)
// ---------------------------------------------------------------------------

const MARGIN_NEG = /\b(negative|uninvolved|free|clear|not involved|widely free|no (?:invasive )?(?:tumou?r|carcinoma|melanoma|dcis) (?:is )?(?:present )?(?:at|on|involving))\b/i;
const MARGIN_POS = /\b(positive|involved|transected|(?:tumou?r|carcinoma|melanoma|dcis|cancer) (?:is )?(?:present )?(?:at|on) (?:the )?(?:inked )?(?:[a-z]+ )?(?:surgical )?margins?|extends? to (?:the )?(?:inked )?(?:[a-z]+ )?(?:surgical )?margins?|ink on tumou?r)\b/i;
const MARGIN_CLOSE = /\bclose\b/i;
const MARGIN_NA = /\bmargins?\b[^.;]{0,20}\b(?:not applicable|cannot be assessed|cannot be determined)\b/i;
const DISTANCE = /\b(closest|nearest|distance|clearance|from (?:the )?(?:[a-z]+ )?margin|clear(?:ed)? by|(?:mm|cm) from (?:the )?(?:tumou?r|carcinoma|melanoma|lesion))\b/i;
const DIST_VALUE = /(<\s*)?(\d+(?:\.\d+)?)\s*(mm|cm)\b/i;
const WHICH = /\b(anterior|posterior|superior|inferior|medial|lateral|deep|peripheral|radial|circumferential|distal|proximal|mesenteric|apical|bladder neck|base|bronchial|vascular|parenchymal)\b/i;
const CONTINUATION = /^\s*(?:but\s+|however\s+|while\s+)?(?:focally\s+)?(?:positive|negative|involved|uninvolved|close|closest|nearest|free|dcis|carcinoma|tumou?r)\b/i;

export function extractMargins(segs: Segment[]): MarginFinding | null {
  const statuses: { s: 'negative' | 'positive' | 'close'; inSitu: boolean }[] = [];
  let closestMm: number | null = null;
  let closestWhich: string | null = null;
  const spans: Span[] = [];
  for (const seg of segs) {
    if (!/\bmargins?\b/i.test(seg.text) || MARGIN_NA.test(seg.text)) continue;
    let offset = 0;
    let inMarginContext = false;
    for (const clause of seg.text.split(/(;|\.\s)/)) {
      const here = offset;
      offset += clause.length;
      if (clause === ';' || /^\.\s$/.test(clause)) continue;
      const mentions = /\bmargins?\b/i.test(clause);
      if (!mentions && !(inMarginContext && CONTINUATION.test(clause))) continue;
      inMarginContext = true;
      let status: 'negative' | 'positive' | 'close' | null = null;
      if (MARGIN_NEG.test(clause)) status = 'negative';
      else if (MARGIN_CLOSE.test(clause)) status = 'close';
      else {
        const p = MARGIN_POS.exec(clause);
        if (p && !PRE_NEGATION_RE.test(clause.slice(0, p.index).split(/\s+/).slice(-4).join(' '))) status = 'positive';
      }
      if (status) {
        statuses.push({ s: status, inSitu: /\b(dcis|in[- ]situ|lcis)\b/i.test(clause) && !/\binvasive\b/i.test(clause) });
        spans.push(span(seg, here, here + clause.length));
      }
      if (DISTANCE.test(clause)) {
        const d = DIST_VALUE.exec(clause);
        if (d) {
          const mm = d[3].toLowerCase() === 'cm' ? parseFloat(d[2]) * 10 : parseFloat(d[2]);
          if (closestMm === null || mm < closestMm) {
            closestMm = round(mm, 2);
            const w = WHICH.exec(clause);
            closestWhich = w ? w[1].toLowerCase() : null;
          }
          if (!status) spans.push(span(seg, here, here + clause.length));
        }
      }
    }
  }
  if (statuses.length === 0 && closestMm === null) return null;
  const pos = statuses.filter((x) => x.s === 'positive');
  const status = pos.length ? 'positive'
    : statuses.some((x) => x.s === 'close') ? 'close'
    : statuses.some((x) => x.s === 'negative') ? 'negative'
    : 'unknown';
  return {
    id: 'margins',
    kind: 'margins',
    status,
    closestMm,
    closestWhich,
    positiveInSituOnly: pos.length > 0 && pos.every((x) => x.inSitu),
    spans,
  };
}

// ---------------------------------------------------------------------------
// Present / absent findings (invasion patterns, ulceration, deposits, ...)
// ---------------------------------------------------------------------------

const PRESENCE: { kind: PresenceKind; re: RegExp; sites?: Site[] }[] = [
  { kind: 'lvi', re: /\b(?:lympho-?vascular(?:\s+space)?(?:\s+invasion)?|lymph-vascular invasion|angiolymphatic(?:\s+invasion)?|(?:lymphatic|venous|vascular|small vessel|large vessel)\s*(?:\((?:[^)]{0,25})\)\s*)?invasion|LVI|LVSI)\b/gi },
  { kind: 'pni', re: /\bperineural(?:\s+invasion)?\b|\bPNI\b/gi },
  { kind: 'epe', re: /\b(?:extraprostatic|extracapsular) extension\b|\bEPE\b/gi, sites: ['prostate'] },
  { kind: 'svi', re: /\bseminal vesicles?\s*(?:invasion|involvement)\b|\bSVI\b/gi, sites: ['prostate'] },
  { kind: 'vpi', re: /\bvisceral pleura(?:l)? invasion\b|\bpleural invasion\b|\bVPI\b|\binvad\w* (?:into |through )?the visceral pleura\b/gi, sites: ['lung'] },
  { kind: 'ulceration', re: /\bulceration\b|\bulcerated\b/gi, sites: ['melanoma'] },
  { kind: 'tumorDeposits', re: /\btumou?r deposits?\b/gi, sites: ['colorectal'] },
  { kind: 'ene', re: /\b(?:extranodal|extracapsular) extension\b|\bENE\b/gi, sites: ['breast', 'colorectal', 'lung', 'melanoma', 'other'] },
];

export function extractPresence(segs: Segment[], site: Site): PresenceFinding[] {
  const out: PresenceFinding[] = [];
  for (const rule of PRESENCE) {
    if (rule.sites && !rule.sites.includes(site)) continue;
    const seen: Presence[] = [];
    const spans: Span[] = [];
    for (const seg of segs) {
      rule.re.lastIndex = 0;
      const m = rule.re.exec(seg.text);
      if (!m) continue;
      let status = presenceStatus(seg.text, m.index, m.index + m[0].length);
      // Wording like "invades the visceral pleura" or "ulcerated" states presence by itself.
      if (status === null && /^(?:invad|ulcerated)/i.test(m[0])) {
        const nonPrefix = /\bnon-?\s*$/i.test(seg.text.slice(0, m.index));
        status = nonPrefix || isNegated(seg.text, m.index, m.index + m[0].length) ? 'absent' : 'present';
      }
      // "Tumor deposits: 2" and "number of deposits" state presence by count.
      if (status === null && rule.kind === 'tumorDeposits') {
        const c = /^[\s:(]*(?:number[^:]*:\s*)?(\d+)/i.exec(seg.text.slice(m.index + m[0].length));
        if (c) status = parseInt(c[1], 10) > 0 ? 'present' : 'absent';
      }
      if (status === null) continue;
      seen.push(status);
      spans.push(span(seg, m.index, Math.min(seg.text.length, m.index + m[0].length + 40)));
    }
    if (seen.length === 0) continue;
    const status: Presence = seen.includes('present') ? 'present' : seen.includes('absent') ? 'absent' : 'indeterminate';
    out.push({ id: rule.kind, kind: rule.kind, status, spans: spans.map((s) => trimSpan(segs, s)) });
  }
  return out;
}

/** Cut an evidence span at the end of its clause so highlights stay tight. */
function trimSpan(segs: Segment[], sp: Span): Span {
  const seg = segs.find((s) => sp.start >= s.start && sp.start < s.end);
  if (!seg) return sp;
  const rel = seg.text.slice(sp.start - seg.start, sp.end - seg.start);
  const cut = rel.search(/[;.](?!\d)/);
  return cut === -1 ? sp : { start: sp.start, end: sp.start + cut };
}

// ---------------------------------------------------------------------------
// Lymph nodes
// ---------------------------------------------------------------------------

const NODE_WORD = /\b(?:lymph\s*nodes?|nodes?|LNs?|nodal)\b/i;
const RATIO = /(?<![\d/])(\d{1,3})\s*\/\s*(\d{1,3})(?![\d/%])/g;
const OF_RATIO = new RegExp(String.raw`\b${COUNT}\s+(?:(?:positive|involved)\s+)?(?:of|out of)\s+(?:the\s+)?${COUNT}\b`, 'gi');
const EXAMINED = new RegExp(String.raw`(?:(?:lymph\s*)?nodes?|LNs?)\s*(?:examined|retrieved|identified|submitted|recovered|evaluated|sampled)\s*(?:\([^)]*\))?\s*[:=]\s*${COUNT}\b|\btotal (?:number of )?(?:lymph )?nodes?(?: examined)?\s*:\s*${COUNT}\b|\b${COUNT}\s+(?:\w+\s+){0,2}?(?:lymph\s+)?nodes?\s+(?:were\s+|are\s+)?(?:examined|identified|retrieved|recovered|found)\b`, 'i');
const INVOLVED = new RegExp(String.raw`(?:(?:lymph\s*)?nodes?|LNs?)\s*(?:involved|positive|with (?:metastas[ie]s|metastatic (?:carcinoma|tumou?r|disease|melanoma)|tumou?r|carcinoma))\s*(?:\([^)]*\))?\s*[:=]\s*${COUNT}\b`, 'i');
const BARE_EXAMINED = new RegExp(String.raw`\b(?:total\s+)?number\s+(?:of\s+(?:lymph\s+)?nodes?\s+)?examined\s*[:=]\s*${COUNT}\b`, 'i');
const BARE_INVOLVED = new RegExp(String.raw`\bnumber\s+(?:of\s+(?:lymph\s+)?nodes?\s+)?(?:involved|positive)\s*[:=]\s*${COUNT}\b`, 'i');
const MACRO = new RegExp(String.raw`nodes?\s*with\s*macrometastas[ie]s\s*(?:\([^)]*\))?\s*[:=]\s*${COUNT}\b`, 'i');
const MICRO = new RegExp(String.raw`nodes?\s*with\s*micrometastas[ie]s\s*(?:\([^)]*\))?\s*[:=]\s*${COUNT}\b`, 'i');
const ITC = new RegExp(String.raw`nodes?\s*with\s*isolated tumou?r cells\s*(?:\([^)]*\))?\s*[:=]\s*${COUNT}\b`, 'i');
const ALL_NEGATIVE = new RegExp(String.raw`\b(?:all\s+)?${COUNT}\s+(?:\w+\s+){0,2}?(?:lymph\s+)?nodes?,?\s*(?:are\s+|were\s+|is\s+|was\s+)?(?:all\s+)?(?:negative|benign|free of (?:tumou?r|carcinoma|metastas[ie]s))\b`, 'i');

interface Labeled { n: number; key: string }

/** Specimen labels in a report: "A.", "2. SP:", "#3", "Part 2", "Station 10R", "Level II". */
// Case-sensitive on purpose: "A." and "2. Lymph" need a capital, so "examined: 10. the" is not a label.
const SPECIMEN_LABEL = /(?:^|[\s.;:(])(?:([A-L])[.)]\s|(\d{1,2})\.\s+(?=[A-Z])|#\s*(\d{1,2})\b|[Pp]art\s+(\d{1,2})\b|[Ss]tation\s+(\w+)|[Ll]evel\s+([IVX]+|\d)\b)/g;

/** The nearest specimen label within 300 characters before a position ('' when there is none). */
function specimenAt(text: string, pos: number): string {
  if (!text) return '';
  const from = Math.max(0, pos - 300);
  const window = text.slice(from, pos);
  let key = '';
  for (const m of window.matchAll(SPECIMEN_LABEL)) key = (m.slice(1).find((g) => g !== undefined) ?? '').toUpperCase();
  return key;
}

/** One count per specimen; a count that equals the sum of the others is the total. */
function combineCounts(list: Labeled[]): number | null {
  if (list.length === 0) return null;
  const perKey = new Map<string, number>();
  for (const { n, key } of list) {
    // The same count of 3+ nodes under another label is almost always the summary restating it.
    if (n >= 3 && [...perKey.values()].includes(n)) continue;
    if (!perKey.has(key)) perKey.set(key, n);
  }
  const values = [...perKey.values()];
  const total = values.find((v, i) => values.length >= 3 && values.reduce((x, o, j) => (j === i ? x : x + o), 0) === v);
  return total ?? values.reduce((x, v) => x + v, 0);
}

export function extractNodes(segs: Segment[], text = ''): NodeFinding | null {
  const examinedAt: Labeled[] = [];
  const involvedAt: Labeled[] = [];
  let macro: number | null = null;
  let micro: number | null = null;
  const groups = new Map<string, Map<string, [number, number]>>(); // specimen -> distinct ratios
  let sentinel = false;
  let micrometastasis = false;
  let itc = false;
  const spans: Span[] = [];

  let prevNode = false;
  for (const seg of segs) {
    const s = seg.text;
    const grab = (re: RegExp): number | null => {
      const m = re.exec(s);
      if (!m) return null;
      spans.push(span(seg, m.index, m.index + m[0].length));
      return parseCount(m.slice(1).find((g) => g !== undefined) ?? '');
    };
    const label = (list: Labeled[], re: RegExp) => {
      const m = re.exec(s);
      if (!m) return false;
      const n = parseCount(m.slice(1).find((g) => g !== undefined) ?? '');
      if (n === null) return false;
      spans.push(span(seg, m.index, m.index + m[0].length));
      list.push({ n, key: specimenAt(text, seg.start + m.index) });
      return true;
    };
    const hasNode = NODE_WORD.test(s);
    // "Regional Lymph Nodes: pN0. Number examined: 10. Number involved: 0." splits into sentences
    // that no longer say "nodes", so the label counts when the sentence before was about nodes.
    if (!hasNode) {
      if (prevNode) {
        label(examinedAt, BARE_EXAMINED);
        label(involvedAt, BARE_INVOLVED);
      }
      prevNode = prevNode && (BARE_EXAMINED.test(s) || BARE_INVOLVED.test(s));
      continue;
    }
    prevNode = true;
    if (!label(examinedAt, EXAMINED)) label(examinedAt, BARE_EXAMINED);
    if (!label(involvedAt, INVOLVED)) label(involvedAt, BARE_INVOLVED);
    macro ??= grab(MACRO);
    micro ??= grab(MICRO);
    const itcCount = grab(ITC);
    if (itcCount) itc = true;
    if (micro) micrometastasis = true;

    // "2/15" and "two of fifteen"; repeats of the same ratio count once.
    const local = new Map<string, [number, number]>();
    const localPos = new Map<string, number>(); // where each ratio first appears
    const raw: [number, number][] = []; // every ratio in order of appearance, repeats included
    const ofKeys = new Set<string>();
    for (const m of s.matchAll(OF_RATIO)) {
      const a = parseCount(m[1]);
      const b = parseCount(m[2]);
      // Only a node count when "nodes" is right next to it: "2 of 15 lymph nodes", "Sentinel nodes: 1 of 2".
      const tail = s.slice(m.index! + m[0].length, m.index! + m[0].length + 30);
      const head = s.slice(Math.max(0, m.index! - 20), m.index!);
      const nodeNear = /^\s+(?:\w+\s+){0,2}?(?:lymph\s+)?nodes?\b/i.test(tail) || /\bnodes?\s*:\s*$/i.test(head);
      if (a !== null && b !== null && a <= b && b > 0 && nodeNear) {
        local.set(`${a}/${b}`, [a, b]);
        if (!localPos.has(`${a}/${b}`)) localPos.set(`${a}/${b}`, m.index!);
        raw.push([a, b]);
        ofKeys.add(`${a}/${b}`);
        spans.push(span(seg, m.index!, m.index! + m[0].length));
      }
    }
    for (const m of s.matchAll(RATIO)) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      // Not a node count: "50/50 solution", "HER2/CEP17 ratio 1/2", "10/hpf", or far from any mention of nodes.
      const after = s.slice(m.index! + m[0].length, m.index! + m[0].length + 14);
      if (/^\s*(?:solution|dilution|ratio|mm|cm|hpf|high[- ]power|x\b|%|mixture)/i.test(after)) continue;
      if (/\bratio\b[^.]{0,12}$/i.test(s.slice(Math.max(0, m.index! - 20), m.index!))) continue;
      const near = s.slice(Math.max(0, m.index! - 110), m.index! + m[0].length + 50);
      if (!NODE_WORD.test(near)) continue;
      if (a <= b && b > 0 && b <= 100) {
        // "2 of 9 lymph nodes (2/9)" states one ratio twice: the slash form restates the words.
        if (ofKeys.has(`${a}/${b}`)) ofKeys.delete(`${a}/${b}`);
        else raw.push([a, b]);
        local.set(`${a}/${b}`, [a, b]);
        if (!localPos.has(`${a}/${b}`)) localPos.set(`${a}/${b}`, m.index!);
        spans.push(span(seg, m.index!, m.index! + m[0].length));
      }
    }
    if (local.size === 0) {
      const neg = ALL_NEGATIVE.exec(s);
      if (neg) {
        const b = parseCount(neg[1]);
        if (b !== null && b > 0) {
          local.set(`0/${b}`, [0, b]);
          localPos.set(`0/${b}`, neg.index);
          spans.push(span(seg, neg.index, neg.index + neg[0].length));
        }
      }
    }
    // "0/6 (right 0/3, left 0/3)": when one ratio is the total of the others, keep only the total.
    // The total comes first and equals the sum of the parts in both numbers.
    if (raw.length >= 3) {
      const [first, ...parts] = raw;
      const sumA = parts.reduce((acc, [a]) => acc + a, 0);
      const sumB = parts.reduce((acc, [, b]) => acc + b, 0);
      if (sumA === first[0] && sumB === first[1]) {
        const pos = localPos.get(`${first[0]}/${first[1]}`) ?? 0;
        local.clear();
        local.set(`${first[0]}/${first[1]}`, first);
        localPos.set(`${first[0]}/${first[1]}`, pos);
      }
    }
    // Each ratio belongs to the specimen labelled just before it ("D. Sentinel lymph node #1").
    // Within one specimen a repeated ratio is a restatement; across specimens it is new nodes.
    for (const [k, v] of local) {
      const key = specimenAt(text, seg.start + (localPos.get(k) ?? 0));
      const g = groups.get(key) ?? new Map<string, [number, number]>();
      g.set(k, v);
      groups.set(key, g);
    }

    if (/\bsentinel\b/i.test(s)) sentinel = true;
    const mi = /\bmicrometastas[ie]s\b/i.exec(s);
    if (mi && !MICRO.test(s) && !isNegated(s, mi.index, mi.index + mi[0].length)) micrometastasis = true;
    const it = /\bisolated tumou?r cells\b|\(i\+\)/i.exec(s);
    if (it && !ITC.test(s) && !isNegated(s, it.index, it.index + it[0].length)) itc = true;
  }

  const involved = combineCounts(involvedAt);
  const examinedLabel = combineCounts(examinedAt);
  let positive: number | null = involved ?? (macro !== null || micro !== null ? (macro ?? 0) + (micro ?? 0) : null);
  let examined: number | null = examinedLabel;
  // Identical ratios under different labels are separate specimens only when small ("0/1" for each
  // sentinel node); an identical larger ratio ("2/41" in the diagnosis and again in the summary) is a restatement.
  const entries: [number, number][] = [];
  for (const g of groups.values()) {
    for (const r of g.values()) {
      if (r[1] >= 3 && entries.some((e) => e[0] === r[0] && e[1] === r[1])) continue;
      entries.push(r);
    }
  }
  if ((positive === null || examined === null) && entries.length > 0) {
    // A summary line often restates the total of the specimens listed earlier
    // ("7/8" and "1/5" in the diagnosis, then "Positive 8/13" in the synoptic). Use that total alone.
    const total = entries.find((r, i) => {
      const others = entries.filter((_, j) => j !== i);
      return others.length >= 2 && others.reduce((x, o) => x + o[0], 0) === r[0] && others.reduce((x, o) => x + o[1], 0) === r[1];
    });
    // Otherwise separate specimens (e.g. sentinel 1/2 and axillary 0/8) are added together.
    const sum = total ?? entries.reduce((acc, [a, b]) => [acc[0] + a, acc[1] + b], [0, 0]);
    positive ??= sum[0];
    examined ??= sum[1];
  }
  if (positive === null && examined === null) return null;
  return {
    id: 'lymphNodes',
    kind: 'lymphNodes',
    positive,
    examined,
    sentinel,
    micrometastasis,
    isolatedTumorCells: itc,
    spans,
  };
}
