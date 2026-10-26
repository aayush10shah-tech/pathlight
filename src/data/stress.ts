import type { Report } from './reports';

/**
 * Stress set: 12 extra synthetic reports in deliberately varied wording (UK spelling, shorthand,
 * station-by-station node counts, free-text phrasing). They were written and labelled after the
 * main gold set, and the first run was recorded before any extractor was changed to fit them.
 */
export const STRESS: Report[] = [
  {
    id: 's-breast-uk', title: '', blurb: '', sample: false,
    text: `HISTOPATHOLOGY (synthetic example)
Left breast wide local excision and sentinel node biopsy.
Invasive carcinoma of no special type, grade II (Nottingham score 7: T3 P2 M2).
Tumour size 18 mm.
Lymphovascular space invasion: not seen.
Excision margins: all clear, nearest radial margin 3 mm.
Oestrogen receptor: positive, Allred score 8/8.
Progesterone receptor: positive, Allred score 6/8.
HER2: negative (1+).
Nodes: 0/4 axillary lymph nodes.
pT1c pN0`,
    gold: {
      site: 'breast', histology: 'Invasive ductal carcinoma (no special type)', grade: 2, sizeCm: 1.8, lvi: 'absent', margin: 'negative',
      closestMm: 3, er: 'positive', pr: 'positive', her2: 'low', nodesPos: 0, nodesExam: 4, t: 'T1c', n: 'N0',
    },
  },
  {
    id: 's-breast-her2-ish', title: '', blurb: '', sample: false,
    text: `SURGICAL PATHOLOGY (synthetic example)
Right breast, modified radical mastectomy.
Invasive ductal carcinoma, Nottingham grade 3.
Size of invasive carcinoma: 2.6 cm.
Lymph nodes: 4 of 12 lymph nodes positive for metastatic carcinoma; extranodal extension present.
Margins negative; closest is deep at 1.5 mm.
ER: Negative (<1%). PR: Negative (<1%).
HER2 (SP3) IHC: Equivocal (2+).
HER2 dual ISH: Amplified, HER2/CEP17 ratio 2.6.
pT2 pN2a`,
    gold: {
      site: 'breast', histology: 'Invasive ductal carcinoma (no special type)', grade: 3, sizeCm: 2.6, nodesPos: 4, nodesExam: 12,
      margin: 'negative', closestMm: 1.5, er: 'negative', erPct: 0.5, pr: 'negative', prPct: 0.5, her2: 'positive', t: 'T2', n: 'N2a',
    },
  },
  {
    id: 's-colon-t2', title: '', blurb: '', sample: false,
    text: `PATHOLOGY (synthetic example)
Sigmoid colon, laparoscopic resection.
Moderately differentiated adenocarcinoma arising in a tubulovillous adenoma, invading into but not through the muscularis propria.
0 of 15 lymph nodes involved.
Margins free. LVI: absent. PNI: absent.
MMR: all four proteins retained.
pT2 N0`,
    gold: {
      site: 'colorectal', histology: 'Adenocarcinoma', tier: 'low', nodesPos: 0, nodesExam: 15, margin: 'negative', lvi: 'absent', pni: 'absent',
      mmr: 'proficient', t: 'T2', n: 'N0',
    },
  },
  {
    id: 's-rectal-biopsy', title: '', blurb: '', sample: false,
    text: `PATHOLOGY (synthetic example)
Rectum, mass at 8 cm, endoscopic biopsy.
Invasive adenocarcinoma, at least moderately differentiated, arising in a villous adenoma.
Biopsy fragments; depth of invasion cannot be assessed.`,
    gold: { site: 'colorectal', histology: 'Adenocarcinoma', tier: 'low' },
  },
  {
    id: 's-prostate-gg4', title: '', blurb: '', sample: false,
    text: `PATHOLOGY (synthetic example)
Prostate, transperineal biopsies.
Adenocarcinoma, Gleason 4 + 4 = 8 (ISUP Grade Group 4), 3/12 cores, maximum 70% of a core.
No perineural invasion.`,
    gold: { site: 'prostate', histology: 'Prostatic adenocarcinoma', gleasonGG: 4, gleasonTotal: 8, pni: 'absent' },
  },
  {
    id: 's-prostatectomy-t3b', title: '', blurb: '', sample: false,
    text: `RADICAL PROSTATECTOMY (synthetic example)
Gleason score: 4+5=9, Grade Group 5.
Extraprostatic Extension (EPE): Present, established (right posterior).
Seminal vesicle invasion: present (left).
Margins: Positive (apical), length 3 mm.
Pelvic lymph nodes: 2/8 positive.
pT3b pN1`,
    gold: {
      site: 'prostate', gleasonGG: 5, gleasonTotal: 9, epe: 'present', svi: 'present', margin: 'positive', nodesPos: 2, nodesExam: 8,
      t: 'T3b', n: 'N1',
    },
  },
  {
    id: 's-lung-stations', title: '', blurb: '', sample: false,
    text: `PATHOLOGY (synthetic example)
Right lower lobe lobectomy.
Invasive mucinous adenocarcinoma. Tumor measures 4.2 cm.
Visceral pleura invasion: Not identified (PL0).
Lymph nodes: Station 7: 0/3; Station 10R: 1/2; Station 11R: 0/1.
Margins: negative.
pT2b pN1`,
    gold: { site: 'lung', histology: 'Mucinous adenocarcinoma', sizeCm: 4.2, vpi: 'absent', nodesPos: 1, nodesExam: 6, margin: 'negative', t: 'T2b', n: 'N1' },
  },
  {
    id: 's-melanoma-ulcerated', title: '', blurb: '', sample: false,
    text: `DERMATOPATHOLOGY (synthetic example)
Skin, left shoulder, excision.
Malignant melanoma, nodular type, Breslow 2.3 mm, ulcerated.
Peripheral margins clear; deep margin clear by 1.1 mm.
pT3b`,
    gold: { site: 'melanoma', histology: 'Nodular melanoma', breslow: 2.3, ulceration: 'present', margin: 'negative', closestMm: 1.1, t: 'T3b' },
  },
  {
    id: 's-breast-lobular', title: '', blurb: '', sample: false,
    text: `PATHOLOGY (synthetic example)
Left breast mastectomy and sentinel lymph node biopsy.
Invasive lobular carcinoma, classic type, grade 2, measuring 35 mm. E-cadherin negative.
ER 100%, PR 0%. HER2 score 0.
Sentinel nodes: 1 positive out of 2 (macrometastasis 4 mm).
pT2 pN1a(sn)`,
    gold: {
      site: 'breast', histology: 'Invasive lobular carcinoma', grade: 2, sizeCm: 3.5, er: 'positive', erPct: 100, pr: 'negative', prPct: 0,
      her2: 'zero', nodesPos: 1, nodesExam: 2, t: 'T2', n: 'N1a(sn)',
    },
  },
  {
    id: 's-prostate-benign', title: '', blurb: '', sample: false,
    text: `PATHOLOGY (synthetic example)
Prostate, needle biopsies x12.
Benign prostatic tissue. No evidence of malignancy.`,
    gold: { site: 'prostate', noMalignancy: true },
  },
  {
    id: 's-breast-adh', title: '', blurb: '', sample: false,
    text: `PATHOLOGY (synthetic example)
Right breast, stereotactic core biopsy for calcifications.
Atypical ductal hyperplasia associated with calcifications. No in situ or invasive carcinoma identified.`,
    gold: { site: 'breast', noMalignancy: true },
  },
  {
    id: 's-colon-deposits', title: '', blurb: '', sample: false,
    text: `PATHOLOGY (synthetic example)
Transverse colon, segmental resection.
Adenocarcinoma, low grade, extending into pericolonic fat.
Tumor deposits: present (2).
Lymph nodes negative (0/14).
Margins uninvolved.
pT3 pN1c`,
    gold: {
      site: 'colorectal', histology: 'Adenocarcinoma', tier: 'low', tumorDeposits: 'present', nodesPos: 0, nodesExam: 14, margin: 'negative',
      t: 'T3', n: 'N1c',
    },
  },
];
