/**
 * Synthetic pathology reports. None of these describe a real person: they were written for
 * PathLight from CAP synoptic templates and common free-text phrasing, then labelled by hand.
 * The first five (`sample: true`) are offered in the app; all twenty form the evaluation set.
 */

export interface Gold {
  site: string;
  histology?: string;
  inSitu?: boolean;
  grade?: number;
  tier?: 'low' | 'high';
  sizeCm?: number;
  t?: string;
  n?: string;
  m?: string;
  margin?: 'negative' | 'positive' | 'close';
  closestMm?: number;
  lvi?: string;
  pni?: string;
  epe?: string;
  svi?: string;
  vpi?: string;
  ulceration?: string;
  tumorDeposits?: string;
  nodesPos?: number;
  nodesExam?: number;
  er?: string;
  erPct?: number;
  pr?: string;
  prPct?: number;
  her2?: string;
  ki67?: number;
  gleasonGG?: number;
  gleasonTotal?: number;
  mmr?: string;
  breslow?: number;
  noMalignancy?: boolean;
}

export interface Report {
  id: string;
  title: string;
  blurb: string;
  sample: boolean;
  text: string;
  gold: Gold;
}

export const REPORTS: Report[] = [
  {
    id: 'breast-lumpectomy',
    title: 'Breast lumpectomy',
    blurb: 'Early breast cancer, hormone-receptor positive',
    sample: true,
    text: `SURGICAL PATHOLOGY REPORT (synthetic example)

SPECIMENS:
A. Left breast, lumpectomy
B. Left axillary sentinel lymph nodes

FINAL DIAGNOSIS:
A. Left breast, lumpectomy:
   - Invasive ductal carcinoma, Nottingham grade 2 (tubules 3, nuclei 2, mitoses 1; total score 6/9).
   - Ductal carcinoma in situ (DCIS), intermediate nuclear grade, solid and cribriform types.
   - Margins are negative for invasive carcinoma and DCIS.
B. Sentinel lymph nodes: Two lymph nodes, negative for metastatic carcinoma (0/2).

SYNOPTIC SUMMARY (CAP Invasive Breast Carcinoma, Resection)
Procedure: Excision (less than total mastectomy)
Specimen Laterality: Left
Tumor Site: Upper outer quadrant
Histologic Type: Invasive carcinoma of no special type (ductal)
Tumor Size: Greatest dimension of largest invasive focus: 2.1 cm (additional dimensions 1.8 x 1.5 cm)
Histologic Grade (Nottingham Histologic Score): Overall Grade: Grade 2
Ductal Carcinoma In Situ (DCIS): Present
Lymphovascular Invasion: Not identified
Margins: Uninvolved by invasive carcinoma
Distance from invasive carcinoma to closest margin: 4 mm (posterior)
Regional Lymph Nodes:
   Number of Lymph Nodes Examined: 2
   Number of Sentinel Nodes Examined: 2
   Number of Lymph Nodes with Macrometastases (>2 mm): 0
   Number of Lymph Nodes with Micrometastases (>0.2 mm to 2 mm): 0
Pathologic Stage Classification (pTNM, AJCC 8th Edition)
   Primary Tumor (pT): pT2
   Regional Lymph Nodes (pN): pN0(sn)

BIOMARKER RESULTS (performed on block A3)
Estrogen Receptor (ER): Positive, 95% of cells, strong intensity
Progesterone Receptor (PR): Positive, 40% of cells, moderate intensity
HER2 (by immunohistochemistry): Negative (Score 1+)
Ki-67: 15%`,
    gold: {
      site: 'breast', histology: 'Invasive ductal carcinoma (no special type)', inSitu: true, grade: 2, sizeCm: 2.1,
      t: 'T2', n: 'N0(sn)', margin: 'negative', closestMm: 4, lvi: 'absent', nodesPos: 0, nodesExam: 2,
      er: 'positive', erPct: 95, pr: 'positive', prPct: 40, her2: 'low', ki67: 15,
    },
  },
  {
    id: 'colon-resection',
    title: 'Colon resection',
    blurb: 'Colon cancer with two positive lymph nodes',
    sample: true,
    text: `SURGICAL PATHOLOGY REPORT (synthetic example)

SPECIMEN: Right colon, right hemicolectomy

FINAL DIAGNOSIS:
Adenocarcinoma of the ascending colon, low grade (moderately differentiated).
The tumor invades through the muscularis propria into pericolorectal tissue.
Metastatic adenocarcinoma in 2 of 18 regional lymph nodes (2/18).
All surgical margins are negative for carcinoma.

SYNOPTIC REPORT (CAP Colon and Rectum, Resection)
Tumor Site: Ascending colon
Histologic Type: Adenocarcinoma
Histologic Grade: Low grade (well to moderately differentiated)
Tumor Size: 4.5 x 3.0 x 1.2 cm
Tumor Extent: Invades through the muscularis propria into pericolorectal tissue
Lymphovascular Invasion: Present (small vessel)
Perineural Invasion: Not identified
Tumor Deposits: Not identified
Margins: Proximal, distal and radial margins uninvolved by invasive carcinoma
Regional Lymph Nodes:
   Number of Lymph Nodes Involved: 2
   Number of Lymph Nodes Examined: 18
Pathologic Stage Classification (pTNM, AJCC 8th Edition): pT3 pN1b

MISMATCH REPAIR IMMUNOHISTOCHEMISTRY
MLH1: Intact nuclear expression
PMS2: Intact nuclear expression
MSH2: Intact nuclear expression
MSH6: Intact nuclear expression
Interpretation: No loss of nuclear expression of mismatch repair proteins (MMR proficient).`,
    gold: {
      site: 'colorectal', histology: 'Adenocarcinoma', tier: 'low', sizeCm: 4.5, t: 'T3', n: 'N1b', margin: 'negative',
      lvi: 'present', pni: 'absent', tumorDeposits: 'absent', nodesPos: 2, nodesExam: 18, mmr: 'proficient',
    },
  },
  {
    id: 'prostate-biopsy',
    title: 'Prostate biopsy',
    blurb: '12-core needle biopsy, intermediate grade',
    sample: true,
    text: `SURGICAL PATHOLOGY REPORT (synthetic example)

SPECIMENS: Prostate, 12-core needle biopsy (A-L)

FINAL DIAGNOSIS:
A. Right base: Benign prostatic tissue.
B. Right mid: Prostatic adenocarcinoma, Gleason score 3+4=7 (Grade Group 2), involving 30% of one core (4 mm).
C. Right apex: Benign prostatic tissue.
D. Right lateral base: Benign prostatic tissue with chronic inflammation.
E. Right lateral mid: Prostatic adenocarcinoma, Gleason score 3+4=7 (Grade Group 2), involving 10% of one core.
F. Right lateral apex: Benign prostatic tissue.
G. Left base: Benign prostatic tissue.
H. Left mid: Prostatic adenocarcinoma, Gleason score 4+3=7 (Grade Group 3), involving 60% of one core (9 mm). Perineural invasion is present.
I. Left apex: High-grade prostatic intraepithelial neoplasia (PIN).
J. Left lateral base: Benign prostatic tissue.
K. Left lateral mid: Benign prostatic tissue.
L. Left lateral apex: Benign prostatic tissue.

COMMENT: Adenocarcinoma is present in 3 of 12 cores. The highest grade is Gleason 4+3=7, Grade Group 3 (part H).`,
    gold: { site: 'prostate', histology: 'Prostatic adenocarcinoma', gleasonGG: 3, gleasonTotal: 7, pni: 'present' },
  },
  {
    id: 'lung-lobectomy',
    title: 'Lung lobectomy',
    blurb: 'Small lung adenocarcinoma, nodes clear',
    sample: true,
    text: `SURGICAL PATHOLOGY REPORT (synthetic example)

SPECIMEN: Right upper lobe, lobectomy, with mediastinal lymph node dissection

FINAL DIAGNOSIS:
Invasive adenocarcinoma of the lung, acinar predominant (60% acinar, 30% lepidic, 10% papillary), moderately differentiated.
Visceral pleural invasion is not identified (confirmed with elastic stain).
Bronchial, vascular and parenchymal margins are negative for carcinoma.
Eleven lymph nodes, negative for metastatic carcinoma (0/11).

SYNOPTIC REPORT (CAP Lung, Resection)
Tumor Size: Total tumor size 2.8 cm; invasive component 2.4 cm
Histologic Grade: G2, moderately differentiated
Visceral Pleura Invasion: Not identified
Lymphovascular Invasion: Not identified
Closest Margin: Bronchial margin, 2.5 cm from tumor
Regional Lymph Nodes: Number of Lymph Nodes Examined: 11; Number of Lymph Nodes Involved: 0
Pathologic Stage Classification (pTNM, AJCC 8th Edition): pT1c pN0

ADDENDUM: Specimen sent for EGFR, ALK, ROS1 and PD-L1 testing; results will follow.`,
    gold: {
      site: 'lung', histology: 'Adenocarcinoma', grade: 2, sizeCm: 2.8, t: 'T1c', n: 'N0', margin: 'negative', closestMm: 25,
      vpi: 'absent', lvi: 'absent', nodesPos: 0, nodesExam: 11,
    },
  },
  {
    id: 'melanoma-excision',
    title: 'Skin melanoma excision',
    blurb: 'Melanoma 1.2 mm deep, not ulcerated',
    sample: true,
    text: `DERMATOPATHOLOGY REPORT (synthetic example)

SPECIMEN: Skin, left upper back, excisional biopsy

DIAGNOSIS:
Invasive melanoma, superficial spreading type.

MICROSCOPIC SUMMARY:
Breslow thickness: 1.2 mm
Ulceration: Not identified
Mitotic rate: 2 per mm2
Microsatellites: Not identified
Lymphovascular invasion: Not identified
Perineural invasion: Not identified
Tumor-infiltrating lymphocytes: Non-brisk
Regression: Not identified
Margins: Peripheral and deep margins are negative for melanoma.
Distance of invasive melanoma from closest peripheral margin: 3 mm
Pathologic Stage Classification (pTNM, AJCC 8th Edition): pT2a

COMMENT: Re-excision and discussion of sentinel lymph node biopsy are recommended per current guidelines.`,
    gold: {
      site: 'melanoma', histology: 'Superficial spreading melanoma', breslow: 1.2, ulceration: 'absent', lvi: 'absent', pni: 'absent',
      margin: 'negative', closestMm: 3, t: 'T2a',
    },
  },
  {
    id: 'breast-core-lobular',
    title: 'Breast core biopsy (lobular)',
    blurb: '',
    sample: false,
    text: `PATHOLOGY REPORT (synthetic example)
Specimen: Right breast, 10 o'clock, ultrasound-guided core needle biopsy.

Diagnosis: Invasive lobular carcinoma, Nottingham histologic grade 2. The carcinoma spans 1.1 cm in the largest core. Calcifications are not identified.

Immunohistochemistry: E-cadherin is negative in tumor cells, supporting lobular type. Estrogen receptor is positive (90%, strong). Progesterone receptor is negative (<1%).
HER2: 2+ (equivocal) by immunohistochemistry.
HER2 FISH: Not amplified (HER2/CEP17 ratio 1.4; average HER2 copy number 3.1 signals/cell).
Ki-67 proliferation index: approximately 10%.`,
    gold: {
      site: 'breast', histology: 'Invasive lobular carcinoma', grade: 2, er: 'positive', erPct: 90, pr: 'negative', prPct: 0.5,
      her2: 'low', ki67: 10,
    },
  },
  {
    id: 'breast-tnbc',
    title: 'Breast mastectomy (triple-negative)',
    blurb: '',
    sample: false,
    text: `SURGICAL PATHOLOGY (synthetic example)
Specimen: Right breast, simple mastectomy, and right axillary lymph node dissection.

Final diagnosis: Invasive ductal carcinoma, poorly differentiated (Nottingham grade 3; score 9/9), measuring 3.4 cm in greatest dimension. Extensive lymphovascular invasion is identified. Ductal carcinoma in situ is not identified. All margins are free of tumor; the deep margin is closest at 6 mm.
Lymph nodes: Metastatic carcinoma in 2 of 14 axillary lymph nodes (2/14); largest metastatic deposit 7 mm, without extranodal extension.
Stage: pT2 pN1a.
Receptors: ER negative (0%). PR negative (0%). HER2 negative (IHC 0). Ki-67: 70%.`,
    gold: {
      site: 'breast', histology: 'Invasive ductal carcinoma (no special type)', grade: 3, sizeCm: 3.4, lvi: 'present', margin: 'negative',
      closestMm: 6, nodesPos: 2, nodesExam: 14, t: 'T2', n: 'N1a', er: 'negative', erPct: 0, pr: 'negative', prPct: 0, her2: 'zero', ki67: 70,
    },
  },
  {
    id: 'breast-neoadjuvant',
    title: 'Breast after neoadjuvant therapy',
    blurb: '',
    sample: false,
    text: `SURGICAL PATHOLOGY REPORT (synthetic example)
Clinical history: HER2-positive breast cancer, status post neoadjuvant chemotherapy and trastuzumab/pertuzumab.
Specimen: Left breast, partial mastectomy; left sentinel lymph nodes.

DIAGNOSIS:
Residual invasive ductal carcinoma, grade 3, 0.6 cm in greatest dimension, with treatment effect.
Margins: Negative. Closest margin (superior): 8 mm.
Lymphovascular invasion: Not identified.
Sentinel lymph nodes: 0/3, negative for residual carcinoma; treatment effect present in one node.
ypT1b ypN0(sn)

Pre-treatment biomarkers (from core biopsy): ER low positive (5%), PR negative (0%), HER2 positive (IHC 3+).`,
    gold: {
      site: 'breast', histology: 'Invasive ductal carcinoma (no special type)', grade: 3, sizeCm: 0.6, margin: 'negative', closestMm: 8,
      lvi: 'absent', nodesPos: 0, nodesExam: 3, t: 'T1b', n: 'N0(sn)', er: 'low positive', erPct: 5, pr: 'negative', prPct: 0, her2: 'positive',
    },
  },
  {
    id: 'colon-dmmr',
    title: 'Sigmoid colon (MMR deficient)',
    blurb: '',
    sample: false,
    text: `PATHOLOGY REPORT (synthetic example)
Specimen: Sigmoid colon, sigmoid colectomy.

Diagnosis: Adenocarcinoma, high grade (poorly differentiated), invading through the visceral peritoneum. Tumor size 5.2 cm.
Twenty-two lymph nodes are negative for metastatic carcinoma (0/22).
No lymphovascular invasion is identified. Tumor deposits: none.
Proximal, distal and radial margins are uninvolved.
pT4a pN0

Mismatch repair immunohistochemistry: Loss of nuclear expression of MLH1 and PMS2, with retained expression of MSH2 and MSH6. Recommend MLH1 promoter methylation and BRAF V600E testing to evaluate for Lynch syndrome.`,
    gold: {
      site: 'colorectal', histology: 'Adenocarcinoma', tier: 'high', sizeCm: 5.2, nodesPos: 0, nodesExam: 22, lvi: 'absent',
      tumorDeposits: 'absent', margin: 'negative', t: 'T4a', n: 'N0', mmr: 'deficient',
    },
  },
  {
    id: 'rectal-mucinous',
    title: 'Rectum after treatment (mucinous)',
    blurb: '',
    sample: false,
    text: `SURGICAL PATHOLOGY (synthetic example)
History: Rectal cancer treated with neoadjuvant chemoradiation.
Specimen: Rectum, low anterior resection.

Final diagnosis: Residual mucinous adenocarcinoma invading into the muscularis propria, with marked treatment effect.
Lymph nodes: 0/9.
Margins: Distal and circumferential (radial) margins are negative; the circumferential margin is 12 mm from tumor.
Perineural invasion: Present.
Pathologic stage: ypT2 ypN0.
Microsatellite status: Microsatellite stable (MSS) by PCR.`,
    gold: {
      site: 'colorectal', histology: 'Mucinous adenocarcinoma', nodesPos: 0, nodesExam: 9, margin: 'negative', closestMm: 12, pni: 'present',
      t: 'T2', n: 'N0', mmr: 'proficient',
    },
  },
  {
    id: 'prostatectomy',
    title: 'Radical prostatectomy',
    blurb: '',
    sample: false,
    text: `SURGICAL PATHOLOGY REPORT (synthetic example)
Specimen: Prostate and seminal vesicles, radical prostatectomy; bilateral pelvic lymph nodes.

SYNOPTIC REPORT (CAP Prostate, Radical Prostatectomy)
Histologic Type: Acinar adenocarcinoma
Grade: Gleason score 3 + 4 = 7; Grade Group 2; percentage of pattern 4: 20%
Tumor Quantitation: Approximately 15% of prostate involved
Extraprostatic Extension: Present, focal (right posterolateral)
Seminal Vesicle Invasion: Not identified
Margins: Negative for invasive carcinoma
Perineural Invasion: Present
Lymphovascular Invasion: Not identified
Regional Lymph Nodes: 0/6 (right 0/3, left 0/3)
Pathologic Stage Classification (pTNM, AJCC 8th Edition): pT3a pN0`,
    gold: {
      site: 'prostate', histology: 'Prostatic adenocarcinoma (acinar type)', gleasonGG: 2, gleasonTotal: 7, epe: 'present', svi: 'absent',
      margin: 'negative', pni: 'present', lvi: 'absent', nodesPos: 0, nodesExam: 6, t: 'T3a', n: 'N0',
    },
  },
  {
    id: 'lung-squamous',
    title: 'Lung squamous cell carcinoma',
    blurb: '',
    sample: false,
    text: `PATHOLOGY REPORT (synthetic example)
Specimen: Left lower lobe, lobectomy.

Diagnosis: Squamous cell carcinoma, keratinizing, poorly differentiated, 5.6 cm in greatest dimension.
The tumor invades the visceral pleura (PL1), confirmed on elastic stain.
Lymphovascular invasion is present.
Metastatic squamous cell carcinoma is identified in 2 of 9 lymph nodes (peribronchial 2/4; hilar 0/2; mediastinal 0/3).
Bronchial margin: negative, 1.8 cm from tumor.
pT3 pN1
PD-L1 (22C3) tumor proportion score: 60%.`,
    gold: {
      site: 'lung', histology: 'Squamous cell carcinoma', grade: 3, sizeCm: 5.6, vpi: 'present', lvi: 'present', nodesPos: 2, nodesExam: 9,
      margin: 'negative', closestMm: 18, t: 'T3', n: 'N1',
    },
  },
  {
    id: 'melanoma-thick',
    title: 'Thick nodular melanoma',
    blurb: '',
    sample: false,
    text: `DERMATOPATHOLOGY (synthetic example)
Specimen A: Skin, right calf, wide local excision. Specimen B: Right inguinal sentinel lymph nodes.

A. Nodular melanoma, Breslow depth 4.5 mm, Clark level V. Ulceration is present. Mitoses: 9/mm2. The deep margin is involved by melanoma.
B. Metastatic melanoma in one of two sentinel lymph nodes (1/2), largest deposit 3 mm.
Stage: pT4b pN1a.`,
    gold: {
      site: 'melanoma', histology: 'Nodular melanoma', breslow: 4.5, ulceration: 'present', margin: 'positive', nodesPos: 1, nodesExam: 2,
      t: 'T4b', n: 'N1a',
    },
  },
  {
    id: 'breast-benign',
    title: 'Breast core biopsy (benign)',
    blurb: '',
    sample: false,
    text: `PATHOLOGY REPORT (synthetic example)
Specimen: Left breast, 2 o'clock, ultrasound-guided core biopsy.

Diagnosis: Fibroadenoma. Negative for malignancy.
Comment: The findings are concordant with a well-circumscribed mass on ultrasound.`,
    gold: { site: 'breast', noMalignancy: true },
  },
  {
    id: 'breast-shorthand',
    title: 'Breast lumpectomy (shorthand)',
    blurb: '',
    sample: false,
    text: `PATH REPORT (synthetic example)
Rt breast lumpectomy + SLNB.
Dx: IDC, grade 3, tumor size 1.6 cm. No LVI. Margins clear (closest 2 mm, anterior). 0/3 sentinel lymph nodes.
ER+/PR+/HER2- (ER 80%, PR 30%, HER2 IHC 1+).
pT1c pN0(sn)`,
    gold: {
      site: 'breast', histology: 'Invasive ductal carcinoma (no special type)', grade: 3, sizeCm: 1.6, lvi: 'absent', margin: 'negative', closestMm: 2,
      nodesPos: 0, nodesExam: 3, er: 'positive', erPct: 80, pr: 'positive', prPct: 30, her2: 'low', t: 'T1c', n: 'N0(sn)',
    },
  },
  {
    id: 'breast-dcis',
    title: 'Breast DCIS only',
    blurb: '',
    sample: false,
    text: `SURGICAL PATHOLOGY (synthetic example)
Specimen: Right breast, wire-localized excision.

Diagnosis: Ductal carcinoma in situ (DCIS), high nuclear grade, comedo type, with associated microcalcifications.
DCIS extent: 1.5 cm.
No invasive carcinoma is identified.
Distance of DCIS from closest margin: 1 mm (anterior).
Estrogen receptor (on DCIS): Positive (80%).
pTis (DCIS)`,
    gold: { site: 'breast', histology: 'Ductal carcinoma in situ (DCIS)', inSitu: true, sizeCm: 1.5, closestMm: 1, er: 'positive', erPct: 80, t: 'Tis' },
  },
  {
    id: 'breast-positive-margin',
    title: 'Breast lumpectomy (positive margin)',
    blurb: '',
    sample: false,
    text: `SURGICAL PATHOLOGY REPORT (synthetic example)
Specimen: Left breast lumpectomy; left axillary sentinel lymph nodes.

Diagnosis: Invasive ductal carcinoma, Nottingham grade 1, 1.4 cm.
Margins: Invasive carcinoma is present at the inked superior margin; other margins negative.
Lymphovascular invasion: Not identified.
Sentinel lymph nodes: Micrometastasis (1.5 mm) in one of three sentinel lymph nodes (1/3).
pT1c pN1mi(sn)
ER: Positive (98%). PR: Positive (85%). HER2: Negative (0).`,
    gold: {
      site: 'breast', histology: 'Invasive ductal carcinoma (no special type)', grade: 1, sizeCm: 1.4, margin: 'positive', lvi: 'absent',
      nodesPos: 1, nodesExam: 3, t: 'T1c', n: 'N1mi(sn)', er: 'positive', erPct: 98, pr: 'positive', prPct: 85, her2: 'zero',
    },
  },
  {
    id: 'colon-polyp',
    title: 'Colon polyp (benign)',
    blurb: '',
    sample: false,
    text: `PATHOLOGY REPORT (synthetic example)
Specimen: Colon, transverse, polypectomy.

Diagnosis: Tubular adenoma. Negative for high-grade dysplasia or malignancy.`,
    gold: { site: 'colorectal', noMalignancy: true },
  },
  {
    id: 'lung-small-cell',
    title: 'Lung biopsy (small cell)',
    blurb: '',
    sample: false,
    text: `PATHOLOGY REPORT (synthetic example)
Specimen: Lung, left hilar mass, endobronchial biopsy.

Diagnosis: Small cell carcinoma.
Immunohistochemistry: Tumor cells are positive for synaptophysin, chromogranin and TTF-1. Ki-67 proliferation index is approximately 90%.`,
    gold: { site: 'lung', histology: 'Small cell carcinoma', ki67: 90 },
  },
  {
    id: 'prostate-low',
    title: 'Prostate biopsy (Grade Group 1)',
    blurb: '',
    sample: false,
    text: `SURGICAL PATHOLOGY (synthetic example)
Specimen: Prostate, MRI-targeted and systematic needle biopsies.

Diagnosis: Prostatic adenocarcinoma, Gleason score 6 (3+3), Grade Group 1, present in 2 of 14 cores, involving up to 5% of tissue.
Perineural invasion: Not identified.
All other cores: Benign prostatic tissue.`,
    gold: { site: 'prostate', histology: 'Prostatic adenocarcinoma', gleasonGG: 1, gleasonTotal: 6, pni: 'absent' },
  },
];
