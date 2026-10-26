/**
 * Clinical-trial search through the public ClinicalTrials.gov API (v2, free, no key, CORS-enabled).
 *
 * Privacy rule: the report itself is never sent. Only a cancer type, at most one marker keyword
 * and an optional place the person types are sent, and the app shows that exact query before
 * anything is requested.
 */
import type { Analysis, FindingKind, FindingOf } from './engine/types';
import { GENERIC_HISTOLOGY_PREFIX } from './engine/extractors/core';

export interface TrialQuery {
  condition: string;
  keyword: string | null;
  location: string;
}

export interface TrialSite {
  facility: string;
  city: string;
  state: string;
  country: string;
}

export interface Trial {
  id: string;
  title: string;
  phases: string[];
  summary: string;
  updated: string;
  sites: TrialSite[];
}

export const API = 'https://clinicaltrials.gov/api/v2/studies';

const get = <K extends FindingKind>(a: Analysis, k: K) => a.findings.find((f) => f.kind === k) as FindingOf<K> | undefined;

/** The smallest query that still finds relevant trials. Returns null when there is no cancer to search for. */
export function trialQueryFor(a: Analysis): Omit<TrialQuery, 'location'> | null {
  const histology = get(a, 'histology');
  if (a.noMalignancy || !histology || histology.names.length === 0) return null;
  const er = get(a, 'er')?.status;
  const pr = get(a, 'pr')?.status;
  const her2 = get(a, 'her2')?.status;
  switch (a.site) {
    case 'breast': {
      let keyword: string | null = null;
      if (her2 === 'positive') keyword = 'HER2-positive';
      else if (er === 'negative' && pr === 'negative' && her2 && her2 !== 'equivocal' && her2 !== 'unknown') keyword = 'triple negative';
      else if (her2 === 'low' || her2 === 'ultralow') keyword = 'HER2-low';
      else if (er === 'positive' || er === 'low positive') keyword = 'hormone receptor positive';
      return { condition: 'breast cancer', keyword };
    }
    case 'colorectal':
      return { condition: 'colorectal cancer', keyword: get(a, 'mmr')?.status === 'deficient' ? 'mismatch repair deficient' : null };
    case 'lung':
      return histology.names.includes('Small cell carcinoma')
        ? { condition: 'small cell lung cancer', keyword: null }
        : { condition: 'non-small cell lung cancer', keyword: null };
    case 'prostate':
      return { condition: 'prostate cancer', keyword: null };
    case 'melanoma':
      return { condition: 'melanoma', keyword: null };
    default: {
      const name = histology.names[0].replace(GENERIC_HISTOLOGY_PREFIX, '');
      return { condition: name, keyword: null };
    }
  }
}

export function requestUrl(q: TrialQuery, pageSize = 10): string {
  const p = new URLSearchParams({
    'query.cond': q.condition,
    'filter.overallStatus': 'RECRUITING',
    pageSize: String(pageSize),
    countTotal: 'true',
    fields: 'NCTId,BriefTitle,Phase,BriefSummary,LastUpdatePostDate,LocationFacility,LocationCity,LocationState,LocationCountry',
    sort: 'LastUpdatePostDate:desc',
  });
  if (q.keyword) p.set('query.term', q.keyword);
  if (q.location.trim()) p.set('query.locn', q.location.trim());
  return `${API}?${p.toString()}`;
}

/** The same search on the ClinicalTrials.gov website, for people who want to browse further. */
export function websiteUrl(q: TrialQuery): string {
  const p = new URLSearchParams({ cond: q.condition, aggFilters: 'status:rec' });
  if (q.keyword) p.set('term', q.keyword);
  if (q.location.trim()) p.set('locStr', q.location.trim());
  return `https://clinicaltrials.gov/search?${p.toString()}`;
}

interface ApiStudy {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string };
    statusModule?: { lastUpdatePostDateStruct?: { date?: string } };
    descriptionModule?: { briefSummary?: string };
    designModule?: { phases?: string[] };
    contactsLocationsModule?: { locations?: { facility?: string; city?: string; state?: string; country?: string }[] };
  };
}

export function parseStudies(json: unknown): { total: number; trials: Trial[] } {
  const data = json as { totalCount?: number; studies?: ApiStudy[] };
  const trials = (data.studies ?? []).map((s): Trial => {
    const p = s.protocolSection ?? {};
    return {
      id: p.identificationModule?.nctId ?? '',
      title: p.identificationModule?.briefTitle ?? 'Untitled study',
      phases: (p.designModule?.phases ?? []).filter((x) => x !== 'NA').map((x) => x.replace('PHASE', 'Phase ').replace('EARLY_Phase 1', 'Early phase 1')),
      summary: p.descriptionModule?.briefSummary ?? '',
      updated: p.statusModule?.lastUpdatePostDateStruct?.date ?? '',
      sites: (p.contactsLocationsModule?.locations ?? []).map((l) => ({
        facility: l.facility ?? '', city: l.city ?? '', state: l.state ?? '', country: l.country ?? '',
      })),
    };
  }).filter((t) => /^NCT\d{8}$/.test(t.id));
  return { total: data.totalCount ?? trials.length, trials };
}

export async function searchTrials(q: TrialQuery, signal?: AbortSignal): Promise<{ total: number; trials: Trial[] }> {
  const res = await fetch(requestUrl(q), { signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
  if (!res.ok) throw new Error(`ClinicalTrials.gov answered ${res.status}`);
  return parseStudies(await res.json());
}

/** Sites that match what the person typed, so the nearest ones are listed first. */
export function sitesNear(t: Trial, location: string): TrialSite[] {
  const words = location.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  return t.sites.filter((s) => words.some((w) => `${s.city} ${s.state} ${s.country}`.toLowerCase().includes(w)));
}
