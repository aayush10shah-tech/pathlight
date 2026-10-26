import { describe, expect, it } from 'vitest';
import { analyze } from '../src/engine';
import { explainAll } from '../src/engine/explain';
import { flatten } from '../src/engine/flatten';
import { questionsFor } from '../src/engine/questions';
import { findGlossaryTerms } from '../src/engine/glossary';
import { isNegated, presenceStatus, sentences } from '../src/engine/text';
import { gradeGroupFor, her2Status } from '../src/engine/extractors/biomarkers';
import { REPORTS } from '../src/data/reports';
import { STRESS } from '../src/data/stress';

const flat = (text: string) => flatten(analyze(text));

describe('segmentation', () => {
  it('does not split on decimals', () => {
    const s = sentences('Tumor size: 2.3 cm. Margins negative.');
    expect(s.map((x) => x.text)).toEqual(['Tumor size: 2.3 cm.', 'Margins negative.']);
  });
  it('keeps absolute offsets', () => {
    const text = 'Line one.\nSecond line here. Third.';
    for (const seg of sentences(text)) expect(text.slice(seg.start, seg.end)).toBe(seg.text);
  });
});

describe('negation and presence', () => {
  const status = (s: string, term: string) => {
    const i = s.toLowerCase().indexOf(term.toLowerCase());
    return presenceStatus(s, i, i + term.length);
  };
  it.each([
    ['Lymphovascular invasion: Not identified', 'Lymphovascular invasion', 'absent'],
    ['Lymphovascular invasion (LVI): Present', 'Lymphovascular invasion', 'present'],
    ['No lymphovascular invasion is identified.', 'lymphovascular invasion', 'absent'],
    ['No lymphovascular or perineural invasion is seen.', 'perineural invasion', 'absent'],
    ['No LVI, perineural invasion or tumor deposits identified.', 'tumor deposits', 'absent'],
    ['Margins are not involved, lymphovascular invasion is present.', 'lymphovascular invasion', 'present'],
    ['Carcinoma with lymphovascular invasion.', 'lymphovascular invasion', 'present'],
    ['Lymphovascular invasion: cannot be determined', 'Lymphovascular invasion', 'indeterminate'],
    ['Perineural invasion: Absent', 'Perineural invasion', 'absent'],
  ])('%s', (s, term, expected) => {
    expect(status(s, term)).toBe(expected);
  });
  it('returns null when nothing is said either way', () => {
    expect(status('Lymphovascular invasion was evaluated on H&E', 'Lymphovascular invasion')).toBeNull();
  });
  it('negates a histology mention', () => {
    const s = 'Ductal carcinoma in situ: Not identified';
    expect(isNegated(s, 0, 24)).toBe(true);
  });
});

describe('extraction edge cases', () => {
  it('reads HER2 2+ with a negative FISH as HER2-low', () => {
    expect(flat('Left breast. Invasive ductal carcinoma.\nHER2: 2+ (equivocal); FISH not amplified.').her2).toBe('low');
  });
  it('reads HER2 2+ alone as equivocal', () => {
    expect(flat('Breast core biopsy. Invasive ductal carcinoma. HER2 IHC: 2+ (equivocal), ISH to follow.').her2).toBe('equivocal');
  });
  it('does not confuse ALK FISH with HER2', () => {
    const f = flat('Lung adenocarcinoma, left upper lobe.\nHER2: not tested\nALK FISH: negative');
    expect(f.her2).toBeUndefined();
  });
  it('calls ER 1-10% low positive', () => {
    expect(flat('Breast biopsy. ER: positive (5%)').er).toBe('low positive');
  });
  it('reads ER+/PR- shorthand', () => {
    const f = flat('Breast lumpectomy. IDC, ER+/PR-/HER2-.');
    expect([f.er, f.pr, f.her2]).toEqual(['positive', 'negative', 'negative']);
  });
  it('converts mm to cm for tumor size', () => {
    expect(flat('Breast excision. Tumor size: 23 mm.').sizeCm).toBe(2.3);
  });
  it('ignores the specimen dimensions', () => {
    const f = flat('Breast lumpectomy specimen measuring 8.0 x 6.0 x 3.0 cm. Within it is a firm mass measuring 1.9 cm.');
    expect(f.sizeCm).toBe(1.9);
  });
  it('ignores distances to the margin', () => {
    expect(flat('Left breast. Carcinoma is 0.3 cm from the deep margin.').sizeCm).toBeUndefined();
  });
  it('reads node ratios with number words', () => {
    const f = flat('Breast. Metastatic carcinoma in two of fifteen axillary lymph nodes.');
    expect([f.nodesPos, f.nodesExam]).toEqual([2, 15]);
  });
  it('adds separate specimens together', () => {
    const f = flat('Breast.\nSentinel lymph nodes: 1/2 positive.\nNon-sentinel axillary lymph nodes: 0/8.');
    expect([f.nodesPos, f.nodesExam]).toEqual([1, 10]);
  });
  it('does not double count a total and its breakdown', () => {
    const f = flat('Prostate, radical prostatectomy. Gleason 3+3=6.\nLymph nodes: 0/6 (right 0/3, left 0/3).');
    expect(f.nodesExam).toBe(6);
  });
  it('reads a "y" prefix TNM after neoadjuvant therapy', () => {
    const f = flat('Breast. ypT0 ypN0');
    expect([f.t, f.n]).toEqual(['T0', 'N0']);
  });
  it('requires a prefix or an N category before reading a bare T', () => {
    expect(flat('MRI showed a T2 hyperintense lesion in the breast.').t).toBeUndefined();
  });
  it('picks the highest Gleason result across cores', () => {
    const f = flat('Prostate biopsy.\nA. Gleason 3+3=6.\nB. Gleason 4+3=7.\nC. Gleason 3+4=7.');
    expect([f.gleasonGG, f.gleasonTotal]).toEqual([3, 7]);
  });
  it('classifies MMR loss', () => {
    const f = flat('Colon resection. Adenocarcinoma.\nMLH1: loss of expression\nPMS2: loss of expression\nMSH2: intact\nMSH6: intact');
    expect(f.mmr).toBe('deficient');
  });
  it('recognises a benign report and lists no cancer findings', () => {
    const a = analyze('Breast core biopsy: Fibrocystic changes. Negative for malignancy.');
    expect(a.noMalignancy).not.toBeNull();
    expect(a.findings.filter((x) => x.kind === 'histology')).toHaveLength(0);
  });
  it('does not call a negative margin positive because of "uninvolved"', () => {
    expect(flat('Breast. Margins: Uninvolved by invasive carcinoma.').margin).toBe('negative');
  });
  it('names an unsupported cancer type as written', () => {
    const f = flat('Kidney, left, partial nephrectomy. Clear cell renal cell carcinoma, 3.2 cm. Margins negative.');
    expect([f.site, f.histology]).toEqual(['other', 'Reported as: Clear cell renal cell carcinoma']);
  });
  it('handles empty and junk input without throwing', () => {
    for (const s of ['', '   ', '!!!', '12345', 'a'.repeat(20000)]) expect(() => analyze(s)).not.toThrow();
  });
});

describe('real-world (OCR and free-text) patterns found in the TCGA dev split', () => {
  it('reads OCR-garbled TNM codes', () => {
    const f = flat('Left breast. PATHOLOGIC STAGE: pTic pNO MX.');
    expect([f.t, f.n]).toEqual(['T1c', 'N0']);
  });
  it('ignores form scaffolding like "(0-3+,n/a)"', () => {
    expect(flat('Breast cancer summary. Her-2/neu (0-3+,n/a) : 1. Ki-67 (xy%,n/a) : 20.').her2).toBe('low');
  });
  it('reads a status written before the marker names', () => {
    const f = flat('Breast. The tumor cells are positive for ER and PR and negative for HER2 by immunohistochemistry.');
    expect([f.er, f.pr, f.her2]).toEqual(['positive', 'positive', 'negative']);
  });
  it('reads one status shared by a list', () => {
    const f = flat('Breast. TUMOR IS ESTROGEN RECEPTORS, PROGESTERONE RECEPTORS AND HER2/NEU NEGATIVE.');
    expect([f.er, f.pr, f.her2]).toEqual(['negative', 'negative', 'negative']);
  });
  it('does not take a result from a scoring legend', () => {
    const f = flat('Breast. HER2 IHC: Interpretation: Equivocal. Intensity: 2+. Legend: Positive (3+)/Strong complete membrane staining in more than 10% of cells.');
    expect(f.her2).toBe('equivocal');
  });
  it('reads "amplification not found" as not amplified', () => {
    expect(flat('Breast. HER2 score 2+. HER-2 gene amplification not found by FISH.').her2).toBe('low');
  });
  it('ignores ratios that are not node counts', () => {
    const f = flat('Colon. The fat was placed in a 50/50 solution to find lymph nodes. Twelve lymph nodes, negative (0/12).');
    expect([f.nodesPos, f.nodesExam]).toEqual([0, 12]);
  });
  it('counts identical small specimens separately', () => {
    const f = flat('Breast. D. SENTINEL LYMPH NODE #1: one benign lymph node (0/1). E. SENTINEL LYMPH NODE #2: one benign lymph node (0/1). F. SENTINEL LYMPH NODE #3: one benign lymph node (0/1).');
    expect(f.nodesExam).toBe(3);
  });
  it('uses a summary total instead of adding it to its parts', () => {
    const f = flat('Breast. A. Metastatic carcinoma in seven of eight lymph nodes (7/8). B. Metastatic carcinoma in one of five lymph nodes (1/5). Lymph node status: Positive 8 / 13.');
    expect([f.nodesPos, f.nodesExam]).toEqual([8, 13]);
  });
  it('does not double a total that is restated', () => {
    const f = flat('Colon. A. Metastatic adenocarcinoma in 2 of 41 lymph nodes (2/41). B. Summary: lymph nodes 2/41.');
    expect([f.nodesPos, f.nodesExam]).toEqual([2, 41]);
  });
  it('reads number words above twenty', () => {
    expect(flat('Colon. Thirty-nine lymph nodes, negative for carcinoma.').nodesExam).toBe(39);
  });
  it('reads labels split into their own sentences', () => {
    const f = flat('Colon. Regional Lymph Nodes: pN0. Number examined: 10. Number involved: 0.');
    expect([f.nodesPos, f.nodesExam]).toEqual([0, 10]);
  });
});

describe('helpers', () => {
  it('maps Gleason patterns to Grade Groups (ISUP 2014)', () => {
    expect([gradeGroupFor(3, 3), gradeGroupFor(3, 4), gradeGroupFor(4, 3), gradeGroupFor(4, 4), gradeGroupFor(3, 5), gradeGroupFor(4, 5), gradeGroupFor(5, 5)])
      .toEqual([1, 2, 3, 4, 4, 5, 5]);
  });
  it('follows the ASCO/CAP HER2 algorithm', () => {
    expect(her2Status(3, null, null)).toBe('positive');
    expect(her2Status(2, 'amplified', null)).toBe('positive');
    expect(her2Status(2, 'not amplified', null)).toBe('low');
    expect(her2Status(2, null, null)).toBe('equivocal');
    expect(her2Status(1, null, 'negative')).toBe('low');
    expect(her2Status(0, null, null)).toBe('zero');
    expect(her2Status(0, null, 'ultralow')).toBe('ultralow');
    expect(her2Status(null, null, 'negative')).toBe('negative');
  });
  it('finds glossary terms without overlaps', () => {
    const hits = findGlossaryTerms('Invasive ductal carcinoma with lymphovascular invasion.');
    for (let i = 1; i < hits.length; i++) expect(hits[i].span.start).toBeGreaterThanOrEqual(hits[i - 1].span.end);
    expect(hits.map((h) => h.key)).toContain('lvi');
  });
});

describe('every bundled report', () => {
  for (const r of [...REPORTS, ...STRESS]) {
    it(`${r.id}: matches its gold label`, () => {
      const pred = flatten(analyze(r.text));
      for (const [k, v] of Object.entries(r.gold)) expect(pred[k], k).toEqual(v);
    });
    it(`${r.id}: explanations are complete and evidence spans are valid`, () => {
      const a = analyze(r.text);
      for (const f of a.findings) {
        expect(f.spans.length, f.kind).toBeGreaterThan(0);
        for (const s of f.spans) {
          expect(s.start).toBeGreaterThanOrEqual(0);
          expect(s.end).toBeLessThanOrEqual(a.text.length);
          expect(s.end).toBeGreaterThan(s.start);
        }
      }
      for (const e of explainAll(a)) {
        expect(e.simple.length, e.id).toBeGreaterThan(20);
        expect(`${e.value} ${e.simple} ${e.detail}`).not.toMatch(/undefined|null|NaN|\[object/);
      }
      const qs = questionsFor(a);
      expect(qs.length).toBeGreaterThan(1);
      expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
    });
  }
});
