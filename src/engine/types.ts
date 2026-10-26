/** A character range in the original report text: [start, end). */
export interface Span {
  start: number;
  end: number;
}

export type Site = 'breast' | 'colorectal' | 'prostate' | 'lung' | 'melanoma' | 'other';

export type Presence = 'present' | 'absent' | 'indeterminate';

export type ReceptorStatus = 'positive' | 'low positive' | 'negative' | 'unknown';

export type Her2Status = 'positive' | 'equivocal' | 'low' | 'ultralow' | 'zero' | 'negative' | 'unknown';

/** Every finding carries the evidence spans it was read from (provenance). */
interface Base {
  id: string;
  spans: Span[];
}

export interface HistologyFinding extends Base {
  kind: 'histology';
  /** Canonical histology names, most important (invasive) first. */
  names: string[];
  inSitu: string[];
}

export interface GradeFinding extends Base {
  kind: 'grade';
  grade: 1 | 2 | 3 | null;
  /** Colorectal reports often use two tiers instead of 1-3. */
  tier: 'low' | 'high' | null;
  nottinghamScore: number | null;
}

export interface SizeFinding extends Base {
  kind: 'tumorSize';
  /** Greatest dimension, in centimetres. */
  cm: number;
  dimsCm: number[];
}

export interface TnmFinding extends Base {
  kind: 'tnm';
  prefix: string;
  /** The prefix written on the N category ("pN1a" -> "p"), which can differ from T's. */
  nPrefix: string;
  t: string | null;
  n: string | null;
  m: string | null;
}

export interface MarginFinding extends Base {
  kind: 'margins';
  status: 'negative' | 'positive' | 'close' | 'unknown';
  closestMm: number | null;
  closestWhich: string | null;
  /** True when the positive statement only concerns an in-situ (pre-invasive) component. */
  positiveInSituOnly: boolean;
}

export type PresenceKind =
  | 'lvi'
  | 'pni'
  | 'epe'
  | 'svi'
  | 'vpi'
  | 'ulceration'
  | 'tumorDeposits'
  | 'ene';

export interface PresenceFinding extends Base {
  kind: PresenceKind;
  status: Presence;
}

export interface NodeFinding extends Base {
  kind: 'lymphNodes';
  positive: number | null;
  examined: number | null;
  sentinel: boolean;
  micrometastasis: boolean;
  isolatedTumorCells: boolean;
}

export interface ReceptorFinding extends Base {
  kind: 'er' | 'pr';
  status: ReceptorStatus;
  percent: number | null;
  percentText: string | null;
  intensity: string | null;
}

export interface Her2Finding extends Base {
  kind: 'her2';
  status: Her2Status;
  ihc: 0 | 1 | 2 | 3 | null;
  ish: 'amplified' | 'not amplified' | null;
}

export interface Ki67Finding extends Base {
  kind: 'ki67';
  percent: number;
  percentText: string;
}

export interface GleasonFinding extends Base {
  kind: 'gleason';
  primary: number | null;
  secondary: number | null;
  total: number | null;
  gradeGroup: 1 | 2 | 3 | 4 | 5 | null;
  /** How many distinct Gleason statements were seen (e.g. several biopsy cores). */
  statements: number;
}

export interface MmrFinding extends Base {
  kind: 'mmr';
  status: 'proficient' | 'deficient' | 'unknown';
  lost: string[];
}

export interface BreslowFinding extends Base {
  kind: 'breslow';
  mm: number;
}

export type Finding =
  | HistologyFinding
  | GradeFinding
  | SizeFinding
  | TnmFinding
  | MarginFinding
  | PresenceFinding
  | NodeFinding
  | ReceptorFinding
  | Her2Finding
  | Ki67Finding
  | GleasonFinding
  | MmrFinding
  | BreslowFinding;

export type FindingKind = Finding['kind'];

export interface GlossaryHit {
  term: string;
  key: string;
  span: Span;
}

export interface Analysis {
  text: string;
  site: Site;
  /** Words that suggest which organ the report is about, used for the site guess. */
  siteEvidence: Span[];
  findings: Finding[];
  glossary: GlossaryHit[];
  /** A "no cancer seen" statement, set only when no cancer histology was found. */
  noMalignancy: Span | null;
}

/** A sentence or synoptic line, with its offset in the full report. */
export interface Segment {
  text: string;
  start: number;
  end: number;
}

/** The finding interface whose `kind` can be K (works for union kinds such as 'er' | 'pr'). */
export type FindingOf<K extends FindingKind> = Finding extends infer F
  ? F extends { kind: infer FK } ? (K extends FK ? F : never) : never
  : never;
