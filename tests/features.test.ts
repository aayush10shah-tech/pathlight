import { describe, expect, it } from 'vitest';
import { analyze } from '../src/engine';
import { summarize } from '../src/engine/summary';
import { parseStudies, requestUrl, sitesNear, trialQueryFor } from '../src/trials';
import { CSP } from '../src/policy';
import { REPORTS } from '../src/data/reports';
import { STRESS } from '../src/data/stress';

const report = (id: string) => REPORTS.find((r) => r.id === id)!.text;

describe('trial search', () => {
  it('builds a minimal query from findings, never from report text', () => {
    expect(trialQueryFor(analyze(report('breast-lumpectomy')))).toEqual({ condition: 'breast cancer', keyword: 'HER2-low' });
    expect(trialQueryFor(analyze(report('breast-tnbc')))).toEqual({ condition: 'breast cancer', keyword: 'triple negative' });
    expect(trialQueryFor(analyze(report('breast-neoadjuvant')))).toEqual({ condition: 'breast cancer', keyword: 'HER2-positive' });
    expect(trialQueryFor(analyze(report('colon-dmmr')))).toEqual({ condition: 'colorectal cancer', keyword: 'mismatch repair deficient' });
    expect(trialQueryFor(analyze(report('lung-small-cell')))?.condition).toBe('small cell lung cancer');
  });
  it('offers no search for a benign report', () => {
    expect(trialQueryFor(analyze(report('breast-benign')))).toBeNull();
  });
  it('sends only the condition, one keyword, status and an optional place', () => {
    const url = new URL(requestUrl({ condition: 'breast cancer', keyword: 'HER2-low', location: 'Seattle' }));
    expect(url.origin).toBe('https://clinicaltrials.gov');
    const keys = [...url.searchParams.keys()].sort();
    expect(keys).toEqual(['countTotal', 'fields', 'filter.overallStatus', 'pageSize', 'query.cond', 'query.locn', 'query.term', 'sort']);
  });
  it('parses the API response and drops malformed studies', () => {
    const parsed = parseStudies({
      totalCount: 2,
      studies: [
        { protocolSection: { identificationModule: { nctId: 'NCT01234567', briefTitle: 'A trial' }, designModule: { phases: ['PHASE2'] },
          contactsLocationsModule: { locations: [{ facility: 'Clinic', city: 'Seattle', state: 'Washington', country: 'United States' }] } } },
        { protocolSection: { identificationModule: { nctId: 'bad' } } },
      ],
    });
    expect(parsed.trials).toHaveLength(1);
    expect(parsed.trials[0].phases).toEqual(['Phase 2']);
    expect(sitesNear(parsed.trials[0], 'seattle')).toHaveLength(1);
  });
  it('is the only outside address the security policy allows', () => {
    const connect = CSP.split('; ').find((d) => d.startsWith('connect-src'))!;
    expect(connect).toBe("connect-src 'self' https://clinicaltrials.gov");
  });
});

describe('plain-language summary', () => {
  it('writes a complete paragraph for every bundled report', () => {
    for (const r of [...REPORTS, ...STRESS]) {
      const text = summarize(analyze(r.text)).map((x) => x.text).join('');
      expect(text.length, r.id).toBeGreaterThan(40);
      expect(text, r.id).not.toMatch(/undefined|null|NaN|\s{2,}|\.\./);
    }
  });
  it('links phrases to findings', () => {
    const runs = summarize(analyze(report('breast-lumpectomy')));
    const linked = runs.filter((r) => r.fid).map((r) => r.fid);
    expect(linked).toEqual(expect.arrayContaining(['histology', 'tumorSize', 'grade', 'lymphNodes', 'margins', 'her2']));
  });
});
