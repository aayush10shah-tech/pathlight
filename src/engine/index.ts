import type { Analysis, Finding } from './types';
import { sentences } from './text';
import { detectSite, extractGrade, extractHistology, extractNoMalignancy, extractSize, extractTnm } from './extractors/core';
import { extractMargins, extractNodes, extractPresence } from './extractors/local';
import {
  extractBreslow, extractER, extractGleason, extractHer2, extractKi67, extractMmr, extractPR,
} from './extractors/biomarkers';
import { findGlossaryTerms } from './glossary';

export * from './types';

/** Normalise characters that PDFs and portals often mangle, without changing offsets. */
export function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[   ]/g, ' ')
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Scanned (OCR'd) reports often read 0 as O and 1 as I/l inside TNM codes ("pNO", "pTic").
    // Each fix swaps one character for one character, so evidence offsets stay valid.
    .replace(/\b((?:y|r)?[pc])([TNM])[Oo](?![A-Za-z])/g, '$1$20')
    .replace(/\b((?:y|r)?[pc])([TN])[Iil](?=[a-d]?(?![A-Za-z]))/g, '$1$21')
    .replace(/(\b(?:y|r)?[pc]?T(?:is|[0-4X])[a-d]?(?:\/[a-d])?[\s,.]*)N[Oo](?![A-Za-z])/g, '$1N0');
}

/** Run the whole pipeline. Pure and synchronous: no network, no storage. */
export function analyze(raw: string): Analysis {
  const text = normalise(raw);
  const segs = sentences(text);
  const { site, evidence } = detectSite(text);
  const histology = extractHistology(segs, site);
  const breast = site === 'breast';
  const findings: Finding[] = [
    histology,
    extractGrade(segs, site),
    extractSize(segs, site),
    extractBreslow(segs, site),
    extractGleason(segs, site),
    extractTnm(segs),
    extractMargins(segs),
    extractNodes(segs, text),
    ...extractPresence(segs, site),
    breast || /\b(?:estrogen|oestrogen) receptor/i.test(text) ? extractER(text) : null,
    breast || /\bprogesterone receptor/i.test(text) ? extractPR(text) : null,
    extractHer2(text),
    extractKi67(text),
    extractMmr(segs),
  ].filter((f): f is Finding => f !== null);
  const hasCancer = !!histology && (histology.names.length > 0 || histology.inSitu.length > 0);
  return {
    text,
    site,
    siteEvidence: evidence,
    findings,
    glossary: findGlossaryTerms(text),
    noMalignancy: hasCancer ? null : extractNoMalignancy(segs),
  };
}
