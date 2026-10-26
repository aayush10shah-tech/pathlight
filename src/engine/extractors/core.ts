import type {
  GradeFinding, HistologyFinding, Segment, Site, SizeFinding, Span, TnmFinding,
} from '../types';
import { isNegated, round, span, toCm } from '../text';

// ---------------------------------------------------------------------------
// Organ site
// ---------------------------------------------------------------------------

const SITE_PATTERNS: Record<Exclude<Site, 'other'>, RegExp> = {
  breast: /\b(breast|axilla(?:ry)?|mammary|lumpectomy|mastectomy|nipple|areola)\b/gi,
  colorectal: /\b(colon|colonic|rectum|rectal|colorectal|cecum|cecal|caecum|sigmoid|hemicolectomy|colectomy|rectosigmoid|hepatic flexure|splenic flexure)\b/gi,
  prostate: /\b(prostate|prostatic|prostatectomy|gleason|seminal vesicles?)\b/gi,
  lung: /\b(lung|pulmonary|lobectomy|pneumonectomy|bronch\w*|visceral pleura|(?:upper|middle|lower) lobe)\b/gi,
  melanoma: /\b(melanoma|breslow|melanocytic|clark level)\b/gi,
};

export function detectSite(text: string): { site: Site; evidence: Span[] } {
  let best: Site = 'other';
  let bestScore = 0;
  let bestEvidence: Span[] = [];
  for (const [site, re] of Object.entries(SITE_PATTERNS) as [Exclude<Site, 'other'>, RegExp][]) {
    const evidence = [...text.matchAll(re)].map((m) => ({ start: m.index!, end: m.index! + m[0].length }));
    // Melanoma words are very specific, so they count double.
    const score = evidence.length * (site === 'melanoma' ? 2 : 1);
    if (score > bestScore) {
      best = site;
      bestScore = score;
      bestEvidence = evidence;
    }
  }
  return { site: best, evidence: bestEvidence };
}

// ---------------------------------------------------------------------------
// Histology (the cancer's cell type)
// ---------------------------------------------------------------------------

interface HistologyRule {
  re: RegExp;
  name: string | ((m: RegExpExecArray) => string);
  inSitu?: boolean;
  sites?: Site[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** Ordered from most to least specific. Earlier matches claim their text first. */
const HISTOLOGY: HistologyRule[] = [
  { re: /\bductal carcinoma in[- ]situ\b|\bDCIS\b/gi, name: 'Ductal carcinoma in situ (DCIS)', inSitu: true },
  { re: /\blobular carcinoma in[- ]situ\b|\bLCIS\b/gi, name: 'Lobular carcinoma in situ (LCIS)', inSitu: true },
  { re: /\bmelanoma in[- ]situ\b/gi, name: 'Melanoma in situ', inSitu: true },
  { re: /\b(?:invasive|infiltrating) ductal carcinoma\b|\binvasive (?:breast )?carcinoma,? (?:of )?(?:no special type|NST)\b|\bIDC\b/gi, name: 'Invasive ductal carcinoma (no special type)' },
  { re: /\b(?:invasive|infiltrating) lobular carcinoma\b|\bILC\b/gi, name: 'Invasive lobular carcinoma' },
  { re: /\binvasive mammary carcinoma\b/gi, name: 'Invasive mammary carcinoma' },
  { re: /\btubular carcinoma\b/gi, name: 'Tubular carcinoma' },
  { re: /\bmucinous adenocarcinoma\b/gi, name: 'Mucinous adenocarcinoma' },
  { re: /\b(?:mucinous|colloid) carcinoma\b/gi, name: 'Mucinous carcinoma' },
  { re: /\bsignet[- ]ring cell (?:adeno)?carcinoma\b/gi, name: 'Signet-ring cell carcinoma' },
  { re: /\b(superficial spreading|nodular|lentigo maligna|acral lentiginous|desmoplastic) melanoma\b/gi, name: (m) => `${cap(m[1])} melanoma` },
  { re: /\bmelanoma,? (superficial spreading|nodular|lentigo maligna|acral lentiginous|desmoplastic) type\b/gi, name: (m) => `${cap(m[1])} melanoma` },
  { re: /\b(?:invasive |malignant )?melanoma\b(?![- ]in[- ]situ)/gi, name: 'Invasive melanoma', sites: ['melanoma', 'other'] },
  { re: /\b(?:prostatic )?acinar (?:type )?adenocarcinoma\b|\badenocarcinoma,? acinar type\b/gi, name: 'Prostatic adenocarcinoma (acinar type)', sites: ['prostate'] },
  { re: /\bprostatic adenocarcinoma\b|\badenocarcinoma of (?:the )?prostate\b/gi, name: 'Prostatic adenocarcinoma', sites: ['prostate'] },
  { re: /\b(?<!non[- ])small[- ]cell (?:lung )?carcinoma\b|\bSCLC\b/gi, name: 'Small cell carcinoma' },
  { re: /\blarge[- ]cell neuroendocrine carcinoma\b/gi, name: 'Large cell neuroendocrine carcinoma' },
  { re: /\blarge[- ]cell carcinoma\b/gi, name: 'Large cell carcinoma' },
  { re: /\bsquamous cell carcinoma\b|\bSCC\b/gi, name: 'Squamous cell carcinoma' },
  { re: /\badenocarcinoma\b/gi, name: 'Adenocarcinoma' },
  { re: /\bnon[- ]small[- ]cell (?:lung )?(?:carcinoma|cancer)\b|\bNSCLC\b/gi, name: 'Non-small cell lung carcinoma' },
];

const SPECIFIC_NSCLC = ['Adenocarcinoma', 'Squamous cell carcinoma', 'Large cell carcinoma', 'Large cell neuroendocrine carcinoma'];

export function extractHistology(segs: Segment[], site: Site): HistologyFinding | null {
  const claimed: Span[] = [];
  const found = new Map<string, { inSitu: boolean; spans: Span[] }>();
  for (const rule of HISTOLOGY) {
    if (rule.sites && !rule.sites.includes(site)) continue;
    for (const seg of segs) {
      rule.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rule.re.exec(seg.text)) !== null) {
        const sp = span(seg, m.index, m.index + m[0].length);
        if (claimed.some((c) => sp.start < c.end && c.start < sp.end)) continue;
        claimed.push(sp);
        if (isNegated(seg.text, m.index, m.index + m[0].length)) continue;
        const name = typeof rule.name === 'function' ? rule.name(m) : rule.name;
        const entry = found.get(name) ?? { inSitu: !!rule.inSitu, spans: [] };
        entry.spans.push(sp);
        found.set(name, entry);
      }
    }
  }
  if (found.size === 0 && site === 'other') {
    const generic = genericHistology(segs);
    if (generic) found.set(generic.name, { inSitu: false, spans: [generic.span] });
  }
  if (found.size === 0) return null;
  const names = [...found.keys()];
  // A specific lung cell type makes the umbrella "non-small cell" label redundant.
  if (names.some((n) => SPECIFIC_NSCLC.includes(n))) found.delete('Non-small cell lung carcinoma');
  // A named melanoma subtype makes the generic label redundant.
  if (found.has('Invasive melanoma') && [...found.keys()].some((n) => n !== 'Invasive melanoma' && / melanoma$/.test(n))) {
    found.delete('Invasive melanoma');
  }
  // Generic "adenocarcinoma" adds nothing when a more specific adenocarcinoma was named.
  if (found.has('Adenocarcinoma') && [...found.keys()].some((n) => n !== 'Adenocarcinoma' && /adenocarcinoma/i.test(n))) {
    found.delete('Adenocarcinoma');
  }
  // In a prostate report, plain "adenocarcinoma" means prostatic adenocarcinoma.
  if (site === 'prostate' && found.has('Adenocarcinoma')) {
    const generic = found.get('Adenocarcinoma')!;
    found.delete('Adenocarcinoma');
    if (![...found.keys()].some((n) => n.startsWith('Prostatic'))) found.set('Prostatic adenocarcinoma', generic);
  }
  const invasive = [...found].filter(([, v]) => !v.inSitu).map(([k]) => k);
  const inSitu = [...found].filter(([, v]) => v.inSitu).map(([k]) => k);
  return {
    id: 'histology',
    kind: 'histology',
    names: invasive,
    inSitu,
    // Invasive mentions first, so the card quotes the main diagnosis.
    spans: [...invasive, ...inSitu].flatMap((n) => found.get(n)!.spans),
  };
}

const GENERIC_TYPE = /((?:\b[A-Za-z][\w/-]*\s+){0,4})(carcinoma|sarcoma|lymphoma|myeloma|mesothelioma|glioblastoma|glioma|blastoma)\b/gi;
const LEADING_STOP = /^(?:(?:a|an|the|of|for|with|and|or|no|negative|positive|metastatic|residual|diagnosis|is|are|shows?)\s+)+/i;

/** For organs PathLight has no rules for, name the cancer type exactly as the report wrote it. */
export const GENERIC_HISTOLOGY_PREFIX = 'Reported as: ';
function genericHistology(segs: Segment[]): { name: string; span: Span } | null {
  for (const seg of segs) {
    GENERIC_TYPE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = GENERIC_TYPE.exec(seg.text)) !== null) {
      const lead = m[1].replace(LEADING_STOP, '');
      const start = m.index + (m[0].length - lead.length - m[2].length);
      const end = m.index + m[0].length;
      if (isNegated(seg.text, start, end)) continue;
      const phrase = seg.text.slice(start, end).trim();
      return { name: GENERIC_HISTOLOGY_PREFIX + phrase.charAt(0).toUpperCase() + phrase.slice(1), span: span(seg, start, end) };
    }
  }
  return null;
}

const NO_MALIGNANCY =/\b(?:negative for (?:malignancy|carcinoma|malignant cells|dysplasia or malignancy|high[- ]grade dysplasia or malignancy)|no evidence of (?:malignancy|carcinoma|malignant neoplasm|residual (?:invasive )?carcinoma)|no (?:residual )?(?:(?:invasive|in[- ]situ)(?: or (?:invasive|in[- ]situ))? )?(?:carcinoma|malignancy) (?:is )?(?:identified|seen|present))\b/i;

export function extractNoMalignancy(segs: Segment[]): Span | null {
  for (const seg of segs) {
    const m = NO_MALIGNANCY.exec(seg.text);
    if (m) return span(seg, m.index, m.index + m[0].length);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Grade
// ---------------------------------------------------------------------------

const ROMAN: Record<string, 1 | 2 | 3> = { '1': 1, '2': 2, '3': 3, i: 1, ii: 2, iii: 3, low: 1, intermediate: 2, high: 3 };

const LABELLED_GRADE = /\b(?:nottingham|histologic(?:al)?|overall|combined|tumou?r|SBR|bloom[- ]richardson|elston[- ]ellis)(?:\s+histologic)?\s+grade(?:\s*\((?:nottingham|modified bloom[- ]richardson)\))?\s*[:\-]?\s*(?:grade\s*)?(1|2|3|III|II|I|low|intermediate|high)\b/i;
const BARE_GRADE = /(?<!nuclear\s)(?<!ISUP\s)\bgrade\s*[:\-]?\s*(1|2|3|III|II|I)\b(?!\s*(?:\+|group|\/))|\bG([1-3])\b/i;
const DIFFERENTIATION = /\b(well|moderately|poorly|un)[- ]?differentiated\b/i;
const NOTTINGHAM_SCORE = /\b(?:nottingham|total|overall|combined)\s+score\s*(?:of\s*)?[:=]?\s*([3-9])(?:\s*\/\s*9)?\b/i;
const TWO_TIER = /\b(low|high)[- ]grade\b(?!\s+(?:dysplasia|intraepithelial|neoplasia|PIN|squamous intraepithelial))/i;
const SKIP_GRADE_SEGMENT = /\b(?:DCIS|in[- ]situ|dysplasia|grade group|gleason|intraepithelial)\b/i;

export function extractGrade(segs: Segment[], site: Site): GradeFinding | null {
  if (site === 'prostate' || site === 'melanoma') return null;
  let grade: 1 | 2 | 3 | null = null;
  let tier: 'low' | 'high' | null = null;
  let score: number | null = null;
  const spans: Span[] = [];
  const take = (seg: Segment, m: RegExpExecArray) => spans.push(span(seg, m.index, m.index + m[0].length));

  for (const seg of segs) {
    const m = LABELLED_GRADE.exec(seg.text);
    if (m && grade === null && tier === null) {
      const v = m[1].toLowerCase();
      // Colorectal reports use a two-tier "low / high grade" system, not grades 1-3.
      if (site === 'colorectal' && (v === 'low' || v === 'high')) tier = v;
      else grade = ROMAN[v];
      take(seg, m);
    }
    const s = NOTTINGHAM_SCORE.exec(seg.text);
    if (s && score === null) {
      score = parseInt(s[1], 10);
      take(seg, s);
    }
  }
  if (grade === null && tier === null) {
    for (const seg of segs) {
      if (SKIP_GRADE_SEGMENT.test(seg.text)) continue;
      const m = BARE_GRADE.exec(seg.text);
      if (m) {
        grade = ROMAN[(m[1] ?? m[2]).toLowerCase()];
        take(seg, m);
        break;
      }
    }
  }
  if (grade === null && tier === null) {
    for (const seg of segs) {
      if (SKIP_GRADE_SEGMENT.test(seg.text)) continue;
      const m = DIFFERENTIATION.exec(seg.text);
      if (m) {
        grade = ({ well: 1, moderately: 2, poorly: 3, un: 3 } as const)[m[1].toLowerCase() as 'well'];
        take(seg, m);
        break;
      }
    }
  }
  if (grade === null && score !== null) grade = score <= 5 ? 1 : score <= 7 ? 2 : 3;
  if (site === 'colorectal' && tier === null) {
    for (const seg of segs) {
      if (SKIP_GRADE_SEGMENT.test(seg.text)) continue;
      const m = TWO_TIER.exec(seg.text);
      if (m) {
        tier = m[1].toLowerCase() as 'low' | 'high';
        take(seg, m);
        break;
      }
    }
    if (tier === null && grade !== null) tier = grade === 3 ? 'high' : 'low';
  }
  if (grade === null && tier === null) return null;
  return { id: 'grade', kind: 'grade', grade, tier, nottinghamScore: score, spans };
}

// ---------------------------------------------------------------------------
// Tumor size
// ---------------------------------------------------------------------------

const MEASURE = /(\d+(?:\.\d+)?)(?:\s*(?:x|×|by)\s*(\d+(?:\.\d+)?))?(?:\s*(?:x|×|by)\s*(\d+(?:\.\d+)?))?\s*(cm|mm)\b/gi;
const STRONG_SIZE = /\b(?:(?:DCIS|tumou?r) (?:extent|size)|extent of (?:DCIS|tumou?r)|tumou?r size|size of (?:the )?(?:largest )?(?:invasive )?(?:tumou?r|focus|carcinoma|component)|greatest dimension|largest (?:invasive )?(?:focus|tumou?r)|invasive (?:carcinoma|tumou?r|component) (?:measures|measuring|size))/i;
const WEAK_SIZE = /\b(tumou?r|mass|lesion|nodule|carcinoma|neoplasm|induration)\b/i;
const NOT_SIZE = /\b(margin|distance|from|specimen|fragments?|cores?|nodes?|breslow|thickness|depth|ellipse|skin|received|aggregate|cassettes?|pieces?|portion|segment|length|weigh\w*|lumpectomy|mastectomy|resection|excision|colectomy|lobectomy|prostatectomy|wedge|biopsy|ink)\b/gi;

export function extractSize(segs: Segment[], site: Site): SizeFinding | null {
  if (site === 'prostate' || site === 'melanoma') return null;
  type Cand = { cm: number; dims: number[]; sp: Span; strong: boolean };
  const cands: Cand[] = [];
  for (const seg of segs) {
    let offset = 0;
    for (const clause of seg.text.split(/(;|,(?!\d)|\band\b)/)) {
      const here = offset;
      offset += clause.length;
      if (!/\d/.test(clause) || /cannot be (?:determined|assessed)/i.test(clause)) continue;
      // A length within a biopsy core is not the size of the tumor.
      if (/\b(?:cores?|fragments?)\b/i.test(clause)) continue;
      // "Invasive ductal carcinoma, grade 1, 1.4 cm.": a bare measurement takes the sentence as context.
      const bare = clause.replace(MEASURE, '').replace(/[\s.:()]|measur\w*/gi, '') === '';
      MEASURE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = MEASURE.exec(clause)) !== null) {
        const dims = [m[1], m[2], m[3]].filter(Boolean).map((v) => toCm(parseFloat(v!), m![4]));
        const cm = Math.max(...dims);
        if (!(cm > 0 && cm <= 30)) continue;
        // "mass at 8 cm" or "3 cm from the nipple" is a location, not a size.
        if (/\bat\s*$/i.test(clause.slice(0, m.index)) || /^\s*(?:cm|mm)?\s*from\b/i.test(clause.slice(m.index + m[0].length))) continue;
        const strong = STRONG_SIZE.test(clause);
        if (!strong && bare) {
          if (!WEAK_SIZE.test(seg.text) || [...seg.text.matchAll(NOT_SIZE)].length > 0) continue;
        } else if (!strong) {
          const weak = WEAK_SIZE.exec(clause);
          if (!weak) continue;
          // Accept only if a size word is closer to the number than any "not a tumor" word.
          const weakDist = Math.abs(weak.index - m.index);
          const notDist = Math.min(...[...clause.matchAll(NOT_SIZE)].map((n) => Math.abs(n.index! - m!.index)), Infinity);
          if (notDist <= weakDist) continue;
        }
        cands.push({
          cm: round(cm, 2),
          dims: dims.map((d) => round(d, 2)),
          sp: span(seg, here + m.index, here + m.index + m[0].length),
          strong,
        });
      }
    }
  }
  if (cands.length === 0) return null;
  const pool = cands.some((c) => c.strong) ? cands.filter((c) => c.strong) : cands;
  const best = pool.reduce((a, b) => (b.cm > a.cm ? b : a));
  return { id: 'tumorSize', kind: 'tumorSize', cm: best.cm, dimsCm: best.dims, spans: [best.sp] };
}

// ---------------------------------------------------------------------------
// TNM
// ---------------------------------------------------------------------------

const T_RE = /(?<![A-Za-z])((?:y|r|a)?(?:p|c)?)T(is|[0-4]|X)(mi|[a-d])?(?:\((?:m|\d+|is|DCIS|LCIS)\))?/g;
const N_RE = /(?<![A-Za-z])((?:y|r)?(?:p|c)?)N(X|[0-3])(mi|[a-c])?((?:\((?:sn|i\+|i-|mol\+|mol-|f)\)){0,2})/g;
const M_RE = /(?<![A-Za-z])((?:y|r)?(?:p|c)?)M(X|[01])([a-d])?(?:\((?:i\+)\))?(?![A-Za-z0-9])/g;

export function extractTnm(segs: Segment[]): TnmFinding | null {
  let prefix = '';
  let nPrefix = '';
  let t: string | null = null;
  let n: string | null = null;
  let mStage: string | null = null;
  const spans: Span[] = [];
  for (const seg of segs) {
    const s = seg.text;
    for (const m of s.matchAll(T_RE)) {
      // Without a p/c prefix, accept "T2" only when an N category follows right after it.
      const after = s.slice(m.index! + m[0].length, m.index! + m[0].length + 4);
      if (!m[1] && !/^\s*,?\s*[pc]?N[0-3X]/.test(after)) continue;
      if (t === null) {
        t = `T${m[2]}${m[3] ?? ''}`;
        prefix = m[1];
      }
      spans.push(span(seg, m.index!, m.index! + m[0].length));
    }
    for (const m of s.matchAll(N_RE)) {
      const before = s.slice(Math.max(0, m.index! - 6), m.index!);
      if (!m[1] && !/T(?:is|[0-4X])[a-d]?\s*,?\s*$/.test(before)) continue;
      if (n === null) {
        n = `N${m[2]}${m[3] ?? ''}${m[4] ?? ''}`;
        nPrefix = m[1];
      }
      spans.push(span(seg, m.index!, m.index! + m[0].length));
    }
    for (const m of s.matchAll(M_RE)) {
      const before = s.slice(Math.max(0, m.index! - 8), m.index!);
      if (!m[1] && !/N(?:[0-3X])[a-c]?(?:\([^)]*\))*\s*,?\s*$/.test(before)) continue;
      if (mStage === null) mStage = `M${m[2]}${m[3] ?? ''}`;
      spans.push(span(seg, m.index!, m.index! + m[0].length));
    }
  }
  if (!t && !n && !mStage) return null;
  return { id: 'tnm', kind: 'tnm', prefix, nPrefix, t, n, m: mStage, spans };
}
