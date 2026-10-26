import type { Analysis, FindingKind, FindingOf } from './types';

export interface Question {
  id: string;
  text: string;
  why: string;
}

const get = <K extends FindingKind>(a: Analysis, kind: K) =>
  a.findings.find((f) => f.kind === kind) as FindingOf<K> | undefined;

/** Questions to bring to the care team, tailored to what the report says (and does not say). */
export function questionsFor(a: Analysis): Question[] {
  const q: Question[] = [];
  const add = (id: string, text: string, why: string) => q.push({ id, text, why });
  const histology = get(a, 'histology');
  const hasInvasive = !!histology?.names.length;

  if (a.noMalignancy && !histology) {
    add('benign-fit', 'Does this result fully explain what was seen on my scan or exam?', 'A benign biopsy should match the imaging. If it does not, doctors sometimes repeat the biopsy.');
    add('benign-next', 'What follow-up, if any, do I need?', 'Some benign findings still need a check-up scan later.');
    return q;
  }

  add('stage', 'What is my stage, and what information did you use to decide it?', 'The pathology report is one input; scans and exams complete the picture.');
  add('team', 'Who will be on my care team, and who do I call with questions?', 'Most cancer care involves a surgeon, a medical oncologist and sometimes a radiation oncologist.');

  const margins = get(a, 'margins');
  if (margins?.status === 'positive') add('margin-pos', 'Since a margin is positive, will I need more surgery or radiation?', 'Cancer at the edge can mean some cells were left behind.');
  if (margins?.status === 'close') add('margin-close', 'Is the close margin enough, or do you recommend more treatment?', 'What counts as "close" differs by cancer type.');

  const nodes = get(a, 'lymphNodes');
  if (nodes?.positive) add('nodes-pos', 'What does the lymph node result mean for my treatment?', 'Positive nodes often change whether chemotherapy or radiation is recommended.');

  const lvi = get(a, 'lvi');
  if (lvi?.status === 'present') add('lvi', 'How does the lymphovascular invasion affect my treatment plan?', 'LVI is a risk factor that can tip treatment decisions.');

  const er = get(a, 'er');
  const her2 = get(a, 'her2');
  if (a.site === 'breast' && hasInvasive) {
    if (er?.status === 'positive' || er?.status === 'low positive') {
      add('endocrine', 'Will hormone (endocrine) therapy be part of my treatment, and for how long?', 'ER-positive cancers usually respond to hormone-blocking medicines.');
    }
    if (er?.status === 'positive' && her2 && her2.status !== 'positive' && her2.status !== 'equivocal' && (nodes?.positive ?? 0) <= 3) {
      add('genomic', 'Would a genomic test (such as Oncotype DX or MammaPrint) help decide whether I need chemotherapy?', 'For ER-positive, HER2-negative early breast cancer, these tests estimate how much chemotherapy would help.');
    }
    if (er?.status === 'low positive') add('er-low', 'My ER result is "low positive". How does that change the benefit of hormone therapy?', 'ER low-positive cancers can behave like ER-negative ones.');
    if (her2?.status === 'equivocal') add('her2-ish', 'Has the HER2 ISH (FISH) test been done, and what did it show?', 'An IHC 2+ result needs ISH to decide HER2 status.');
    if (her2?.status === 'low' || her2?.status === 'ultralow') add('her2-low', 'My HER2 result is low. Does that matter for any treatment options now or later?', 'HER2-low and ultralow results can make newer medicines an option if the cancer spreads.');
    if (her2?.status === 'negative') add('her2-score', 'What was my exact HER2 IHC score: 0, 1+ or 2+?', 'The score decides whether the cancer counts as HER2-low.');
    if (!er || !her2) add('markers-missing', 'Have the ER, PR and HER2 tests been done yet?', 'These markers are essential to plan breast cancer treatment and sometimes arrive later in an addendum.');
    add('genetics', 'Should I have genetic counseling or testing (for example BRCA1/BRCA2)?', 'Guidelines recommend it for many people with breast cancer, depending on age, family history and tumor type.');
  }

  if (a.site === 'colorectal' && hasInvasive) {
    const mmr = get(a, 'mmr');
    if (!mmr) add('mmr-missing', 'Has my tumor been tested for mismatch repair (MMR) or MSI?', 'Guidelines recommend this test for every colorectal cancer.');
    if (mmr?.status === 'deficient') {
      add('lynch', 'Should I see a genetic counselor about Lynch syndrome?', 'MMR-deficient tumors can be a sign of an inherited condition that affects relatives too.');
      add('immuno', 'Is immunotherapy an option for me?', 'MMR-deficient tumors often respond well to immunotherapy.');
    }
    if (nodes?.examined != null && nodes.examined < 12) add('nodes-12', `Only ${nodes.examined} lymph nodes were examined. Does that affect my staging?`, 'At least 12 nodes are recommended for colon cancer staging.');
    add('cea', 'Do I need a CEA blood test or scans as part of staging and follow-up?', 'CEA and CT scans are part of standard colorectal cancer care.');
  }

  if (a.site === 'lung' && hasInvasive) {
    const nsclc = histology!.names.some((n) => n !== 'Small cell carcinoma' && n !== 'Large cell neuroendocrine carcinoma');
    if (nsclc) add('biomarkers', 'Has biomarker testing (EGFR, ALK, ROS1, KRAS, PD-L1 and others) been done on my tumor?', 'Many non-small cell lung cancers have gene changes with targeted medicines.');
  }

  if (a.site === 'prostate' && hasInvasive) {
    const g = get(a, 'gleason');
    if (g?.gradeGroup && g.gradeGroup <= 2) add('surveillance', 'Is active surveillance an option for me, or do you recommend treatment now?', 'Lower Grade Group cancers can often be monitored safely.');
    add('options', 'What are the pros and cons of each option (surgery, radiation, or monitoring)?', 'Several options can have similar cure rates but different side effects.');
    add('psa', 'How do my PSA level and MRI results fit with this biopsy?', 'Prostate cancer risk groups combine PSA, Grade Group and stage.');
  }

  if (a.site === 'melanoma' && hasInvasive) {
    const b = get(a, 'breslow');
    const ulcer = get(a, 'ulceration');
    if (b && (b.mm >= 0.8 || ulcer?.status === 'present')) add('slnb', 'Should I have a sentinel lymph node biopsy?', 'It is usually discussed for melanomas 0.8 mm or thicker, or thinner ones with ulceration.');
    add('wle', 'How wide does the excision around the melanoma need to be?', 'The recommended rim of normal skin depends on the Breslow thickness.');
    add('skin-checks', 'How often should I have skin checks from now on?', 'People who have had melanoma have a higher chance of another one.');
  }

  add('trials', 'Is there a clinical trial that might be right for me?', 'Trials can offer access to new treatments.');
  add('walkthrough', 'Can we go over this report together, line by line?', 'It is your report, and your team can explain anything PathLight could not.');
  return q;
}
