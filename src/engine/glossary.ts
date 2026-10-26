import type { GlossaryHit } from './types';

export interface GlossaryEntry {
  key: string;
  term: string;
  def: string;
  re: RegExp;
}

/**
 * Plain-language definitions written for PathLight. They paraphrase standard references
 * (NCI Dictionary of Cancer Terms, CAP "How to read your pathology report" guides, AJCC 8th ed.).
 */
const ENTRIES: [key: string, term: string, re: RegExp, def: string][] = [
  ['adenocarcinoma', 'Adenocarcinoma', /\badenocarcinomas?\b/gi, 'Cancer that starts in gland cells, the cells that make mucus and other fluids. Most breast, colon, prostate and many lung cancers are this type.'],
  ['carcinoma', 'Carcinoma', /\bcarcinomas?\b/gi, 'Cancer that starts in the cells that line organs and skin (epithelial cells). It is the most common family of cancers.'],
  ['invasive', 'Invasive', /\b(?:invasive|infiltrating)\b/gi, 'The cancer cells have grown past the layer where they started and into the tissue around it.'],
  ['insitu', 'In situ', /\bin[- ]situ\b(?! hybridi)/gi, 'Latin for "in its original place". Abnormal cells that have not grown past the layer where they started. Often called stage 0 or pre-invasive.'],
  ['dcis', 'DCIS', /\bDCIS\b/g, 'Ductal carcinoma in situ: abnormal cells inside the milk ducts that have not spread into the surrounding breast tissue.'],
  ['lcis', 'LCIS', /\bLCIS\b/g, 'Lobular carcinoma in situ: abnormal cells in the milk-making lobules. It is not considered cancer but is a marker of higher future risk.'],
  ['metastatic', 'Metastatic / metastasis', /\bmetasta(?:tic|sis|ses|sized)\b/gi, 'Cancer cells that have travelled from where they started to another place, such as a lymph node.'],
  ['micromet', 'Micrometastasis', /\bmicrometastas[ie]s\b/gi, 'A very small area of cancer in a lymph node. In breast cancer this means larger than 0.2 mm but no larger than 2 mm.'],
  ['macromet', 'Macrometastasis', /\bmacrometastas[ie]s\b/gi, 'An area of cancer in a lymph node larger than 2 mm.'],
  ['itc', 'Isolated tumor cells', /\bisolated tumou?r cells\b/gi, 'Single cancer cells or tiny clusters no larger than 0.2 mm in a lymph node. For breast cancer these do not count as a "positive" node.'],
  ['malignant', 'Malignant', /\bmalignan(?:t|cy)\b/gi, 'Cancerous. Malignant cells can grow into nearby tissue and spread.'],
  ['benign', 'Benign', /\bbenign\b/gi, 'Not cancer. Benign cells do not invade nearby tissue or spread.'],
  ['neoplasm', 'Neoplasm', /\bneoplasms?\b/gi, 'An abnormal growth of tissue. It can be benign (not cancer) or malignant (cancer).'],
  ['lesion', 'Lesion', /\blesions?\b/gi, 'Any area of tissue that looks abnormal. It does not by itself mean cancer.'],
  ['margin', 'Margin', /\bmargins?\b/gi, 'The outer edge of the tissue the surgeon removed. The pathologist checks whether cancer cells reach this edge.'],
  ['inked', 'Inked', /\binked\b|\bink\b/gi, 'The surface of the removed tissue is painted with colored ink so that the true surgical edge can be seen under the microscope.'],
  ['lymphnode', 'Lymph node', /\blymph nodes?\b/gi, 'Small bean-shaped filters of the immune system. Cancer can spread to nearby lymph nodes first.'],
  ['sentinel', 'Sentinel lymph node', /\bsentinel\b/gi, 'The first lymph node(s) that fluid from the tumor drains to. If they have no cancer, the others usually do not either.'],
  ['axillary', 'Axillary', /\baxilla(?:ry)?\b/gi, 'Relating to the armpit. Axillary lymph nodes are the main drainage nodes for the breast.'],
  ['lvi', 'Lymphovascular invasion', /\blympho-?vascular(?: space)? invasion\b|\bangiolymphatic invasion\b/gi, 'Cancer cells seen inside small blood vessels or lymph channels. It can mean a higher chance of spread.'],
  ['pni', 'Perineural invasion', /\bperineural invasion\b/gi, 'Cancer cells growing along or around a nerve.'],
  ['ene', 'Extranodal extension', /\bextranodal extension\b/gi, 'Cancer in a lymph node that has broken through the node\'s outer capsule.'],
  ['ihc', 'Immunohistochemistry (IHC)', /\bimmunohistochemi(?:stry|cal)\b|\bIHC\b/gi, 'A lab stain that uses antibodies with a colored tag to show whether a protein is present in the cells.'],
  ['ish', 'In situ hybridization (FISH / ISH)', /\b(?:FISH|SISH|CISH|ISH)\b|\bin situ hybridi[sz]ation\b/g, 'A lab test that counts copies of a gene (such as HER2) inside cells.'],
  ['er', 'Estrogen receptor (ER)', /\b(?:estrogen|oestrogen) receptors?\b|\bER\b/g, 'A protein that lets the hormone estrogen fuel cancer growth. ER-positive cancers can often be treated with hormone-blocking medicines.'],
  ['pr', 'Progesterone receptor (PR)', /\bprogesterone receptors?\b|\bP(?:g)?R\b/g, 'A protein that responds to the hormone progesterone. It is reported alongside ER.'],
  ['her2', 'HER2', /\bHER-?2(?:\/neu)?\b|\bERBB2\b/gi, 'A growth-signal protein. When cancer cells make too much of it (HER2-positive), HER2-targeted medicines can help.'],
  ['ki67', 'Ki-67', /\bKi-?67\b/gi, 'A protein found in cells that are dividing. The percentage gives a rough idea of how fast the tumor is growing.'],
  ['grade', 'Grade', /\bgrade\b/gi, 'How abnormal the cancer cells look under the microscope compared with normal cells. Higher grade usually means faster growing.'],
  ['nottingham', 'Nottingham grade', /\bnottingham\b/gi, 'The breast cancer grading system. It adds scores for gland formation, nuclear shape and cell division (3 to 9 points) to give grade 1, 2 or 3.'],
  ['differentiated', 'Differentiated', /\b(?:well|moderately|poorly|un)[- ]?differentiated\b/gi, 'How much the cancer cells still look like the normal cells they came from. "Well differentiated" looks most normal; "poorly differentiated" least.'],
  ['pleomorphism', 'Pleomorphism', /\bpleomorphism\b/gi, 'Variation in the size and shape of cell nuclei. More variation usually means a higher grade.'],
  ['mitoses', 'Mitoses / mitotic rate', /\bmito(?:ses|sis|tic)\b/gi, 'Cells caught in the act of dividing. A higher count means the tumor is dividing faster.'],
  ['tubule', 'Tubule formation', /\btubules?\b|\bglandular\b/gi, 'How much the cancer still forms normal-looking gland tubes. It is one part of the breast grade.'],
  ['stage', 'Stage', /\bstag(?:e|ing)\b/gi, 'How large the cancer is and how far it has spread. Your care team sets the final stage using pathology, imaging and exam findings together.'],
  ['tnm', 'TNM', /\bTNM\b/g, 'The staging code: T for the main tumor, N for lymph nodes, M for distant spread. A small "p" means it is based on pathology.'],
  ['ajcc', 'AJCC', /\bAJCC\b/g, 'American Joint Committee on Cancer, the group that publishes the cancer staging rules used in the United States.'],
  ['neoadjuvant', 'Neoadjuvant / "y" prefix', /\bneoadjuvant\b/gi, 'Treatment given before surgery. A "y" in front of the stage (e.g. ypT1) means the stage was measured after that treatment.'],
  ['residual', 'Residual', /\bresidual\b/gi, 'Cancer still present after treatment.'],
  ['tumordeposit', 'Tumor deposits', /\btumou?r deposits?\b/gi, 'Small separate nodules of cancer in the fat around the bowel that are not inside a lymph node.'],
  ['mucosa', 'Mucosa', /\bmucosa\b/gi, 'The innermost lining of the bowel, where colon cancers begin.'],
  ['submucosa', 'Submucosa', /\bsubmucosa\b/gi, 'The layer just under the lining of the bowel.'],
  ['muscularis', 'Muscularis propria', /\bmuscularis propria\b/gi, 'The thick muscle wall of the bowel.'],
  ['serosa', 'Serosa / visceral peritoneum', /\bserosa\b|\bvisceral peritoneum\b/gi, 'The thin outer covering of the bowel.'],
  ['pericolorectal', 'Pericolorectal tissue', /\bperi(?:colonic|colorectal|rectal)\b/gi, 'The fatty tissue just outside the bowel wall.'],
  ['pleura', 'Visceral pleura', /\b(?:visceral )?pleura(?:l)?\b/gi, 'The thin membrane covering the lung.'],
  ['gleason', 'Gleason score', /\bgleason\b/gi, 'The prostate cancer grading system. Two pattern numbers (3 to 5) are added: the most common pattern plus the highest-grade pattern.'],
  ['gradegroup', 'Grade Group', /\bgrade group\b/gi, 'A simpler 1-to-5 scale built from the Gleason score. Grade Group 1 is the slowest growing; 5 is the most aggressive.'],
  ['isup', 'ISUP', /\bISUP\b/g, 'International Society of Urological Pathology, which defined the Grade Group system.'],
  ['epe', 'Extraprostatic extension', /\bextraprostatic extension\b/gi, 'Cancer that has grown through the outer edge of the prostate.'],
  ['sv', 'Seminal vesicles', /\bseminal vesicles?\b/gi, 'Small glands behind the bladder, next to the prostate.'],
  ['pin', 'PIN', /\bPIN\b|\bprostatic intraepithelial neoplasia\b/g, 'Prostatic intraepithelial neoplasia: abnormal-looking cells inside the prostate glands that are not cancer.'],
  ['core', 'Core (needle) biopsy', /\bcores?\b/gi, 'A thin cylinder of tissue removed with a hollow needle.'],
  ['breslow', 'Breslow thickness', /\bbreslow\b/gi, 'How deep a melanoma goes into the skin, measured in millimetres from the top layer. It is the most important measurement for melanoma.'],
  ['ulceration', 'Ulceration', /\bulcerat(?:ion|ed)\b/gi, 'The skin over the melanoma is broken. In melanoma staging this moves the T category from "a" to "b".'],
  ['clark', 'Clark level', /\bclark(?:'s)? level\b/gi, 'An older way to describe melanoma depth by skin layer. It is no longer used for staging.'],
  ['mmr', 'Mismatch repair (MMR)', /\bmismatch repair\b|\b[dp]?MMR\b/g, 'Proteins (MLH1, PMS2, MSH2, MSH6) that fix DNA copying mistakes. If one is missing, the tumor is "MMR deficient".'],
  ['msi', 'Microsatellite instability (MSI)', /\bmicrosatellite\b|\bMSI(?:-H|-L)?\b|\bMSS\b/g, 'A DNA pattern seen when mismatch repair is not working. MSI-high tumors often respond to immunotherapy.'],
  ['lynch', 'Lynch syndrome', /\blynch\b/gi, 'An inherited condition that raises the risk of colon, uterine and other cancers. MMR results can suggest whether genetic testing is worthwhile.'],
  ['pdl1', 'PD-L1', /\bPD-?L1\b/gi, 'A protein that helps tumors hide from the immune system. The level helps decide whether immunotherapy may work.'],
  ['egfr', 'EGFR / ALK / ROS1', /\b(?:EGFR|ALK|ROS1|KRAS|BRAF)\b/g, 'Genes that can carry changes driving some cancers. Several have targeted medicines.'],
  ['specimen', 'Specimen', /\bspecimens?\b/gi, 'The tissue sample sent to the pathology lab.'],
  ['gross', 'Gross description', /\bgross\b/gi, 'What the pathologist sees with the naked eye before the microscope: size, weight, color.'],
  ['synoptic', 'Synoptic report', /\bsynoptic\b/gi, 'The checklist-style summary section, built on College of American Pathologists (CAP) templates.'],
  ['frozen', 'Frozen section', /\bfrozen section\b/gi, 'A quick test during surgery, where tissue is frozen and looked at within minutes.'],
  ['necrosis', 'Necrosis', /\bnecro(?:sis|tic)\b/gi, 'Dead tissue inside a tumor.'],
  ['calcification', 'Calcifications', /\b(?:micro)?calcifications?\b/gi, 'Tiny calcium deposits. On a mammogram they can lead to a biopsy, and the pathologist confirms they were sampled.'],
  ['atypia', 'Atypia / atypical', /\batypi(?:a|cal)\b/gi, 'Cells that look somewhat abnormal but are not cancer.'],
  ['hyperplasia', 'Hyperplasia', /\bhyperplasia\b/gi, 'An increase in the number of cells. Usually not cancer.'],
  ['dysplasia', 'Dysplasia', /\bdysplasia\b/gi, 'Abnormal, pre-cancerous cell changes. High-grade dysplasia is closer to cancer than low-grade.'],
  ['stroma', 'Stroma / desmoplasia', /\bstroma(?:l)?\b|\bdesmoplas(?:ia|tic)\b/gi, 'The supporting tissue around cells. Desmoplasia is a scar-like reaction to invasive cancer.'],
  ['focal', 'Focal / multifocal', /\b(?:multi)?focal(?:ity)?\b/gi, 'Focal means in one small area. Multifocal means more than one separate area of tumor.'],
  ['addendum', 'Addendum', /\baddend(?:um|a)\b/gi, 'A section added to the report later, often with biomarker results that take extra days.'],
  ['lumpectomy', 'Lumpectomy / excision', /\blumpectomy\b|\bexcision(?:al)?\b|\bpartial mastectomy\b/gi, 'Surgery that removes the tumor with a rim of normal tissue, keeping most of the organ.'],
  ['mastectomy', 'Mastectomy', /\bmastectomy\b/gi, 'Surgery to remove the whole breast.'],
  ['resection', 'Resection / -ectomy', /\bresection\b|\b(?:hemi)?colectomy\b|\blobectomy\b|\bprostatectomy\b|\bpneumonectomy\b/gi, 'Surgery to remove part or all of an organ.'],
];

export const GLOSSARY: Record<string, GlossaryEntry> = Object.fromEntries(
  ENTRIES.map(([key, term, re, def]) => [key, { key, term, def, re }]),
);

/** Find every glossary term in the report. Longer matches win when two overlap. */
export function findGlossaryTerms(text: string): GlossaryHit[] {
  const hits: GlossaryHit[] = [];
  for (const { key, term, re } of Object.values(GLOSSARY)) {
    for (const m of text.matchAll(re)) {
      hits.push({ key, term, span: { start: m.index!, end: m.index! + m[0].length } });
    }
  }
  hits.sort((a, b) => a.span.start - b.span.start || (b.span.end - b.span.start) - (a.span.end - a.span.start));
  const out: GlossaryHit[] = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.span.start >= lastEnd) {
      out.push(h);
      lastEnd = h.span.end;
    }
  }
  return out;
}
