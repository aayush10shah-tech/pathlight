import type {
  Analysis, Finding, GleasonFinding, Her2Finding, NodeFinding, ReceptorFinding, Site, TnmFinding,
} from './types';

export type Group = 'diagnosis' | 'cells' | 'size' | 'spread' | 'edges' | 'biology' | 'stage';

export const GROUPS: { id: Group; title: string; blurb: string }[] = [
  { id: 'diagnosis', title: 'What was found', blurb: 'The kind of cells the pathologist saw.' },
  { id: 'cells', title: 'How the cells behave', blurb: 'How abnormal the cells look and how fast they are dividing.' },
  { id: 'size', title: 'Size and depth', blurb: 'How big the tumor is or how deep it goes.' },
  { id: 'spread', title: 'Signs of spread', blurb: 'Whether cancer cells were seen beyond the main tumor.' },
  { id: 'edges', title: 'Surgical edges', blurb: 'Whether the removed tissue had a clear rim of healthy cells.' },
  { id: 'biology', title: 'Tumor biology', blurb: 'Markers that help choose medicines.' },
  { id: 'stage', title: 'Staging code', blurb: 'The TNM shorthand used to set the stage.' },
];

/** "discuss" marks results worth raising with the care team; it is never shown as an alarm. */
export type Tone = 'calm' | 'neutral' | 'discuss';

export interface Explanation {
  id: string;
  findingId: string | null;
  group: Group;
  title: string;
  value: string;
  simple: string;
  detail: string;
  tone: Tone;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// Histology
// ---------------------------------------------------------------------------

const HISTOLOGY_TEXT: Record<string, [simple: string, detail: string]> = {
  'Invasive ductal carcinoma (no special type)': [
    'The most common type of breast cancer. It started in a milk duct and has grown into the breast tissue around it.',
    '"No special type" (NST) is the current name for what was called invasive ductal carcinoma. About 70-80% of invasive breast cancers are this type.',
  ],
  'Invasive lobular carcinoma': [
    'Breast cancer that started in the milk-making lobules and has grown into nearby tissue. It is the second most common type, about 10-15% of cases.',
    'Lobular cancer cells often grow in single-file lines instead of forming a lump, so they can be harder to see on imaging.',
  ],
  'Invasive mammary carcinoma': [
    'Invasive breast cancer. Pathologists may use this name when the cancer has features of both ductal and lobular types.',
    'Ask your team whether the cancer behaves more like the ductal or the lobular type.',
  ],
  'Tubular carcinoma': [
    'A less common type of invasive breast cancer that is usually slow growing.',
    'The cells form small, well-shaped tubes that look close to normal breast tissue.',
  ],
  'Mucinous carcinoma': [
    'A type of cancer whose cells make a lot of mucus. In the breast it tends to grow slowly.',
    'The cancer cells float in pools of mucus.',
  ],
  'Mucinous adenocarcinoma': [
    'An adenocarcinoma in which more than half of the tumor is made of mucus.',
    'It is treated much like other adenocarcinomas of the same organ.',
  ],
  'Signet-ring cell carcinoma': [
    'A type of adenocarcinoma in which mucus pushes each cell\'s nucleus to one side, so the cells look like signet rings.',
    'It is less common and is treated as a higher-grade cancer.',
  ],
  'Superficial spreading melanoma': [
    'The most common type of melanoma. It tends to spread along the top layers of skin before growing deeper.',
    'The subtype matters less than the depth (Breslow thickness) and ulceration for staging.',
  ],
  'Nodular melanoma': [
    'A type of melanoma that tends to grow downward into the skin more quickly than other types.',
    'The subtype matters less than the depth (Breslow thickness) and ulceration for staging.',
  ],
  'Lentigo maligna melanoma': [
    'A type of melanoma that usually appears on sun-damaged skin, such as the face, in older adults.',
    'The subtype matters less than the depth (Breslow thickness) and ulceration for staging.',
  ],
  'Acral lentiginous melanoma': [
    'A type of melanoma found on the palms, soles or under the nails. It is not linked to sun exposure.',
    'The subtype matters less than the depth (Breslow thickness) and ulceration for staging.',
  ],
  'Desmoplastic melanoma': [
    'A rare type of melanoma made of spindle-shaped cells with scar-like tissue.',
    'It can behave differently from other melanomas; ask how it affects your plan.',
  ],
  'Invasive melanoma': [
    'Cancer of the pigment-making skin cells (melanocytes) that has grown below the top layer of skin.',
    'For melanoma, the depth (Breslow thickness) and ulceration are the key facts for staging.',
  ],
  'Prostatic adenocarcinoma (acinar type)': [
    'The usual type of prostate cancer. It started in the gland cells of the prostate.',
    'Acinar adenocarcinoma makes up more than 90% of prostate cancers.',
  ],
  'Prostatic adenocarcinoma': [
    'The usual type of prostate cancer. It started in the gland cells of the prostate.',
    'How it behaves is described mostly by the Gleason score and Grade Group.',
  ],
  'Small cell carcinoma': [
    'A fast-growing type of lung cancer, about 10-15% of lung cancers. It is treated differently from non-small cell types.',
    'Small cell cancers are usually treated with chemotherapy and immunotherapy rather than surgery alone.',
  ],
  'Large cell neuroendocrine carcinoma': [
    'A rare, fast-growing cancer with features of nerve-like (neuroendocrine) cells.',
    'It is grouped with the high-grade neuroendocrine cancers.',
  ],
  'Large cell carcinoma': [
    'A type of non-small cell lung cancer whose large cells do not show features of adenocarcinoma or squamous cell carcinoma.',
    'Special stains are used to rule out the other types first.',
  ],
  'Squamous cell carcinoma': [
    'Cancer that started in squamous cells, the thin flat cells that line the airways, skin and some other organs.',
    'In the lung it is one of the main types of non-small cell lung cancer.',
  ],
  'Non-small cell lung carcinoma': [
    'The umbrella group that covers about 85% of lung cancers.',
    'Your report may name a more specific type, such as adenocarcinoma or squamous cell carcinoma.',
  ],
  'Ductal carcinoma in situ (DCIS)': [
    'Abnormal cells inside the milk ducts that have not grown into the surrounding breast tissue (stage 0).',
    'DCIS is pre-invasive. When it is found next to invasive cancer, it is usually removed in the same surgery.',
  ],
  'Lobular carcinoma in situ (LCIS)': [
    'Abnormal cells inside the milk-making lobules. LCIS is not cancer, but it signals a higher chance of breast cancer later.',
    'It is usually managed with closer screening rather than more surgery.',
  ],
  'Melanoma in situ': [
    'Melanoma cells only in the top layer of skin (the epidermis). This is stage 0.',
    'It is usually cured by removing it with a small rim of normal skin.',
  ],
};

function adenoText(site: Site): [string, string] {
  switch (site) {
    case 'colorectal':
      return ['The most common type of colon and rectal cancer, more than 90% of cases. It started in the gland cells that line the bowel.',
        'Most colorectal adenocarcinomas grow slowly from a polyp over several years.'];
    case 'lung':
      return ['The most common type of lung cancer. It is a non-small cell lung cancer that started in mucus-making gland cells.',
        'Lung adenocarcinomas are routinely tested for gene changes (such as EGFR or ALK) that have targeted medicines.'];
    default:
      return ['Cancer that started in gland cells, the cells that make mucus and other fluids.',
        'Where it started (the organ) matters more than the name for planning treatment.'];
  }
}

// ---------------------------------------------------------------------------
// TNM tables (AJCC 8th edition, simplified wording)
// ---------------------------------------------------------------------------

const T_TEXT: Record<string, Record<string, string>> = {
  breast: {
    Tis: 'abnormal cells only inside the ducts (in situ)', T0: 'no main tumor found',
    T1mi: 'invasive cancer 1 mm or smaller', T1a: 'invasive cancer larger than 1 mm, up to 5 mm',
    T1b: 'larger than 5 mm, up to 10 mm', T1c: 'larger than 1 cm, up to 2 cm', T1: '2 cm or smaller',
    T2: 'larger than 2 cm, up to 5 cm', T3: 'larger than 5 cm',
    T4: 'grown into the chest wall or skin, whatever its size', T4a: 'grown into the chest wall',
    T4b: 'affecting the skin (ulcers, swelling or skin nodules)', T4c: 'both chest wall and skin involved',
    T4d: 'inflammatory breast cancer',
  },
  colorectal: {
    Tis: 'cancer cells only in the inner lining (mucosa)', T0: 'no main tumor found',
    T1: 'grown into the submucosa, the layer under the lining', T2: 'grown into the muscle wall (muscularis propria)',
    T3: 'grown through the muscle wall into the fat around the bowel', T4: 'grown through the outer lining or into nearby organs',
    T4a: 'grown through the outer lining of the bowel (visceral peritoneum)', T4b: 'grown into or stuck to other organs or structures',
  },
  lung: {
    Tis: 'abnormal cells only in the lining (in situ)', T0: 'no main tumor found',
    T1mi: 'minimally invasive: 3 cm or smaller with an invasive part of 5 mm or less',
    T1: '3 cm or smaller', T1a: '1 cm or smaller', T1b: 'larger than 1 cm, up to 2 cm', T1c: 'larger than 2 cm, up to 3 cm',
    T2: 'larger than 3 cm up to 5 cm, or grown into the main airway or the lung lining (visceral pleura)',
    T2a: 'larger than 3 cm up to 4 cm, or a smaller tumor that involves the lung lining or main airway',
    T2b: 'larger than 4 cm, up to 5 cm',
    T3: 'larger than 5 cm up to 7 cm, grown into the chest wall, or with separate nodules in the same lobe',
    T4: 'larger than 7 cm, grown into structures in the middle of the chest, or with nodules in another lobe of the same lung',
  },
  prostate: {
    T2: 'cancer confined to the prostate', T2a: 'cancer confined to the prostate', T2b: 'cancer confined to the prostate',
    T2c: 'cancer confined to the prostate', T3: 'grown outside the prostate',
    T3a: 'grown through the outer edge of the prostate (extraprostatic extension) or into the bladder neck',
    T3b: 'grown into the seminal vesicles', T4: 'grown into nearby structures such as the rectum, bladder or pelvic wall',
  },
  melanoma: {
    Tis: 'melanoma cells only in the top layer of skin (in situ)', T0: 'no main tumor found',
    T1: '1.0 mm thick or less', T1a: 'thinner than 0.8 mm and not ulcerated',
    T1b: 'thinner than 0.8 mm with ulceration, or 0.8 to 1.0 mm thick', T2: 'more than 1.0 mm up to 2.0 mm thick',
    T2a: 'more than 1.0 mm up to 2.0 mm thick, not ulcerated', T2b: 'more than 1.0 mm up to 2.0 mm thick, ulcerated',
    T3: 'more than 2.0 mm up to 4.0 mm thick', T3a: 'more than 2.0 mm up to 4.0 mm thick, not ulcerated',
    T3b: 'more than 2.0 mm up to 4.0 mm thick, ulcerated', T4: 'more than 4.0 mm thick',
    T4a: 'more than 4.0 mm thick, not ulcerated', T4b: 'more than 4.0 mm thick, ulcerated',
  },
};

const N_TEXT: Record<string, Record<string, string>> = {
  breast: {
    N0: 'no cancer found in the lymph nodes', 'N0(i+)': 'only isolated tumor cells (0.2 mm or smaller) in a node, which still counts as node-negative',
    'N0(mol+)': 'cancer detected only by a molecular test, which still counts as node-negative',
    N1mi: 'micrometastases: small deposits larger than 0.2 mm, up to 2 mm', N1: 'cancer in 1 to 3 underarm (axillary) nodes',
    N1a: 'cancer in 1 to 3 underarm nodes, at least one deposit larger than 2 mm', N1b: 'cancer in the internal mammary (breastbone) nodes found by sentinel biopsy',
    N1c: 'cancer in 1 to 3 underarm nodes and the internal mammary nodes', N2: 'cancer in 4 to 9 underarm nodes, or internal mammary nodes alone',
    N2a: 'cancer in 4 to 9 underarm nodes', N2b: 'cancer in the internal mammary nodes without underarm nodes',
    N3: 'cancer in 10 or more underarm nodes, or in nodes near the collarbone', N3a: 'cancer in 10 or more underarm nodes, or in nodes below the collarbone',
    N3b: 'cancer in underarm and internal mammary nodes together', N3c: 'cancer in nodes above the collarbone',
  },
  colorectal: {
    N0: 'no cancer found in the lymph nodes', N1: 'cancer in 1 to 3 nearby nodes', N1a: 'cancer in 1 nearby lymph node',
    N1b: 'cancer in 2 to 3 nearby lymph nodes', N1c: 'no nodes involved, but small tumor deposits in the fat around the bowel',
    N2: 'cancer in 4 or more nearby nodes', N2a: 'cancer in 4 to 6 nearby lymph nodes', N2b: 'cancer in 7 or more nearby lymph nodes',
  },
  lung: {
    N0: 'no cancer found in the lymph nodes', N1: 'cancer in nodes inside the lung or around the main airway on the same side',
    N2: 'cancer in nodes in the middle of the chest on the same side, or just below where the windpipe splits',
    N3: 'cancer in nodes on the opposite side of the chest or above the collarbone',
  },
  prostate: { N0: 'no cancer found in the pelvic lymph nodes', N1: 'cancer in the nearby (pelvic) lymph nodes' },
};

const GENERIC_T = 'the higher the T number, the larger the tumor or the further it has grown into nearby tissue';
const GENERIC_N = 'the higher the N number, the more lymph nodes contain cancer';

function describeT(t: string, site: Site, prefix: string): string {
  if (t === 'TX') return 'TX: the main tumor could not be measured or assessed from this sample.';
  if (t === 'T0' && prefix.includes('y')) return 'T0 after treatment: no remaining tumor was found at the main site. Doctors call this a complete response.';
  const table = T_TEXT[site] ?? {};
  const base = t.replace(/\(.*\)$/, '');
  const text = table[base] ?? table[base.replace(/[a-d]$|mi$/, '')];
  return `${t}: ${text ?? GENERIC_T}.`;
}

function describeN(n: string, site: Site): string {
  if (n.startsWith('NX')) return 'NX: the lymph nodes could not be assessed (for example, none were removed).';
  const table = N_TEXT[site] ?? {};
  const noSuffix = n.replace(/\((?:sn|f)\)/g, '');
  const text = table[noSuffix] ?? table[noSuffix.replace(/\(.*\)$/, '')] ?? table[noSuffix.replace(/\(.*\)$/, '').replace(/[a-c]$|mi$/, '')]
    ?? (n.startsWith('N0') ? 'no cancer found in the lymph nodes' : null);
  const sn = /\(sn\)/.test(n) ? ' "(sn)" means only sentinel nodes were checked.' : '';
  return `${n}: ${text ?? GENERIC_N}.${sn}`;
}

function describeM(m: string): string {
  if (m.startsWith('M1')) return `${m}: the cancer has spread to distant parts of the body.`;
  if (m === 'MX') return 'MX: distant spread was not assessed. A tissue sample alone usually cannot show this; scans are used instead.';
  return `${m}: no distant spread was found.`;
}

// ---------------------------------------------------------------------------
// Everyday size comparisons (approximate diameters)
// ---------------------------------------------------------------------------

export const SIZE_REFERENCES: [cm: number, label: string][] = [
  [0.3, 'a sesame seed'], [0.6, 'a pencil eraser'], [1, 'a pea'], [2, 'a grape'], [3, 'a walnut'],
  [4.3, 'a golf ball'], [5.5, 'a lime'], [7, 'a lemon'], [9, 'an orange'],
];

export function sizeReference(cm: number): [number, string] {
  return SIZE_REFERENCES.reduce((best, r) => (Math.abs(r[0] - cm) < Math.abs(best[0] - cm) ? r : best));
}

// ---------------------------------------------------------------------------
// Per-finding explanations
// ---------------------------------------------------------------------------

export function explainFinding(f: Finding, a: Analysis): Explanation | null {
  const site = a.site;
  const base = { id: f.id, findingId: f.id };
  switch (f.kind) {
    case 'histology': {
      const main = f.names[0] ?? f.inSitu[0];
      if (!main) return null;
      const [simple, detail] = main === 'Adenocarcinoma' ? adenoText(site)
        : HISTOLOGY_TEXT[main] ?? [
          'This is the cancer type exactly as your report names it. PathLight does not have a detailed explanation for this type yet, but the glossary below explains many of the words around it.',
          'Your care team can explain what this type means for you. The NCI website (cancer.gov) has patient guides for most cancer types.',
        ];
      const others = [...f.names.slice(1), ...(f.names.length ? f.inSitu : f.inSitu.slice(1))];
      const also = others.length
        ? ` Also present: ${others.join(', ')}.${others.some((o) => o.includes('DCIS')) && f.names.length ? ' DCIS next to invasive cancer is common and is usually removed in the same surgery.' : ''}`
        : '';
      return { ...base, group: 'diagnosis', title: 'Type of cancer', value: main, simple: simple + also, detail, tone: 'neutral' };
    }
    case 'grade': {
      if (site === 'colorectal' && f.tier) {
        return {
          ...base, group: 'cells', title: 'Grade', value: `${f.tier === 'low' ? 'Low' : 'High'} grade`,
          simple: f.tier === 'low'
            ? 'Low grade: the cancer cells still form glands fairly well (well to moderately differentiated).'
            : 'High grade: the cancer cells form few glands (poorly differentiated) and may grow faster.',
          detail: 'Colorectal cancer uses a two-tier grade. It is one of several factors your team weighs; depth of growth and lymph nodes matter more for stage.',
          tone: 'neutral',
        };
      }
      if (!f.grade) return null;
      const g = f.grade;
      const simple = [
        'Grade 1: the cancer cells look fairly similar to normal cells and tend to grow slowly.',
        'Grade 2: the cells look moderately different from normal cells and grow at an in-between speed.',
        'Grade 3: the cells look very different from normal cells and tend to grow faster. This is common, and your team uses it, with other results, to plan treatment.',
      ][g - 1];
      const detail = site === 'breast'
        ? `Breast cancer is graded with the Nottingham system: gland formation, nuclear shape and cell division are each scored 1-3 and added (3-9 points).${f.nottinghamScore ? ` Your total score was ${f.nottinghamScore} of 9.` : ''} 3-5 points = grade 1, 6-7 = grade 2, 8-9 = grade 3.`
        : 'Grade describes how abnormal the cells look under the microscope. It is different from stage, which describes size and spread.';
      return { ...base, group: 'cells', title: 'Grade', value: `Grade ${g} of 3`, simple, detail, tone: 'neutral' };
    }
    case 'tumorSize': {
      const [refCm, ref] = sizeReference(f.cm);
      const approx = Math.abs(refCm - f.cm) / refCm < 0.25 ? 'about the size of' : 'roughly comparable to';
      const dims = f.dimsCm.length > 1 ? ` Dimensions recorded: ${f.dimsCm.join(' × ')} cm.` : '';
      const ctx = site === 'breast'
        ? ' For breast cancer, tumors up to 2 cm are T1, over 2 cm to 5 cm are T2, and over 5 cm are T3.'
        : site === 'lung'
          ? ' For lung cancer, size steps are at 1, 2, 3, 4, 5 and 7 cm.'
          : site === 'colorectal'
            ? ' For colorectal cancer, size does not set the stage; how deep it grows through the bowel wall does.'
            : '';
      return {
        ...base, group: 'size', title: 'Tumor size', value: `${f.cm} cm (${Math.round(f.cm * 100) / 10} mm)`,
        simple: `The tumor measured about ${f.cm} cm across at its longest point: ${approx} ${ref}.`,
        detail: `Measured in greatest dimension.${dims}${ctx}`, tone: 'neutral',
      };
    }
    case 'breslow':
      return {
        ...base, group: 'size', title: 'Breslow thickness (depth)', value: `${f.mm} mm deep`,
        simple: `The melanoma reaches about ${f.mm} mm down into the skin. ${f.mm <= 1 ? 'Thin melanomas (1 mm or less) have the best outlook.' : 'Depth is the most important single measure for melanoma, and your team uses it to plan next steps.'}`,
        detail: 'T category by depth: T1 up to 1.0 mm, T2 over 1.0 to 2.0 mm, T3 over 2.0 to 4.0 mm, T4 over 4.0 mm. A sentinel lymph node biopsy is usually discussed for melanomas 0.8 mm or thicker, or thinner ones with ulceration.',
        tone: f.mm >= 0.8 ? 'discuss' : 'neutral',
      };
    case 'gleason':
      return explainGleason(f);
    case 'ki67':
      return {
        ...base, group: 'cells', title: 'Ki-67 (growth rate)', value: f.percentText,
        simple: `About ${f.percentText} of the cancer cells were dividing when the sample was taken. A higher number means faster growth.`,
        detail: 'There is no single agreed cut-off. The International Ki67 in Breast Cancer Working Group considers 5% or less clearly low and 30% or more clearly high in early ER-positive breast cancer; values in between are read together with other results.',
        tone: 'neutral',
      };
    case 'tnm':
      return explainTnm(f, site);
    case 'margins': {
      const where = f.closestMm !== null
        ? ` The closest the cancer came to an edge was ${f.closestMm} mm${f.closestWhich ? ` (the ${f.closestWhich} margin)` : ''}.`
        : '';
      const breastNote = site === 'breast'
        ? ' For invasive breast cancer, "no ink on tumor" is the accepted definition of a clear margin; for DCIS alone, 2 mm is the usual guide.'
        : ' The distance that counts as safe depends on the type of cancer.';
      const detail = `The pathologist paints the outside of the removed tissue with ink, then checks under the microscope whether cancer touches the ink.${breastNote}`;
      if (f.status === 'positive') {
        return {
          ...base, group: 'edges', title: 'Margins (surgical edges)', value: f.positiveInSituOnly ? 'Positive (in situ cells)' : 'Positive',
          simple: f.positiveInSituOnly
            ? 'Pre-invasive cells (in situ, such as DCIS) reach an edge of the removed tissue. It is not invasive cancer, but it matters for planning, and doctors sometimes recommend more surgery or radiation.'
            : 'Cancer cells reach an edge of the removed tissue. This can mean some cancer was left behind, so doctors sometimes recommend more surgery or radiation. Ask your surgeon what it means for you.',
          detail, tone: 'discuss',
        };
      }
      if (f.status === 'close') {
        return {
          ...base, group: 'edges', title: 'Margins (surgical edges)', value: 'Close',
          simple: `The cancer was near an edge but did not touch it.${where} What counts as "close" depends on the cancer type, so ask whether anything more is needed.`,
          detail, tone: 'discuss',
        };
      }
      if (f.status === 'negative') {
        return {
          ...base, group: 'edges', title: 'Margins (surgical edges)', value: 'Negative (clear)',
          simple: `No cancer cells were found at the edges of the removed tissue. This suggests the tumor was removed with a rim of healthy tissue.${where}`,
          detail, tone: 'calm',
        };
      }
      if (f.closestMm === null) return null;
      return { ...base, group: 'edges', title: 'Margins (surgical edges)', value: `${f.closestMm} mm`, simple: where.trim(), detail, tone: 'neutral' };
    }
    case 'lymphNodes':
      return explainNodes(f, site);
    case 'er':
    case 'pr':
      return explainReceptor(f);
    case 'her2':
      return explainHer2(f);
    case 'mmr':
      if (f.status === 'deficient') {
        const lost = f.lost.length ? ` (${f.lost.join(' and ')} not seen)` : '';
        const methyl = f.lost.includes('MLH1') ? ' When MLH1 is lost, the cause is most often a change that is not inherited; labs often test BRAF or MLH1 methylation to tell the two apart.' : '';
        return {
          ...base, group: 'biology', title: 'Mismatch repair (MMR / MSI)', value: 'Deficient (dMMR / MSI-high)',
          simple: `One or more DNA-repair proteins are missing${lost}. This matters in two ways: these tumors often respond very well to immunotherapy, and it can be a sign of Lynch syndrome, an inherited condition, so genetic counseling is often recommended.`,
          detail: `Mismatch repair proteins (MLH1, PMS2, MSH2, MSH6) fix DNA copying mistakes. About 15% of colorectal cancers are MMR-deficient.${methyl}`,
          tone: 'discuss',
        };
      }
      return {
        ...base, group: 'biology', title: 'Mismatch repair (MMR / MSI)', value: 'Proficient (pMMR / MSS)',
        simple: 'The DNA-repair (mismatch repair) system appears to be working normally. This is the most common result.',
        detail: 'Mismatch repair proteins (MLH1, PMS2, MSH2, MSH6) fix DNA copying mistakes. About 85% of colorectal cancers are MMR-proficient.',
        tone: 'calm',
      };
    default:
      return explainPresence(f, site);
  }
}

const PRESENCE_TEXT: Record<string, { title: string; present: string; absent: string; detail: string }> = {
  lvi: {
    title: 'Lymphovascular invasion (LVI)',
    present: 'Cancer cells were seen inside tiny blood vessels or lymph channels near the tumor. This raises the chance that cells travelled elsewhere, and your team will factor it into treatment planning.',
    absent: 'No cancer cells were seen inside blood vessels or lymph channels. This is a favorable finding.',
    detail: 'LVI is not used to set the stage, but it is one of the risk factors doctors consider.',
  },
  pni: {
    title: 'Perineural invasion',
    present: 'Cancer cells were seen growing along a nerve. In prostate biopsies this is common; in other cancers it can affect treatment planning.',
    absent: 'No cancer was seen growing along nerves.',
    detail: 'Nerves can act as a path for cancer cells to travel along.',
  },
  epe: {
    title: 'Extraprostatic extension',
    present: 'The cancer has grown through the outer edge of the prostate. This places it in category pT3a.',
    absent: 'The cancer appears to be contained inside the prostate.',
    detail: 'It is one of the main factors that separates pT2 (confined) from pT3 (beyond the prostate).',
  },
  svi: {
    title: 'Seminal vesicle invasion',
    present: 'Cancer has grown into the seminal vesicles, the glands next to the prostate. This places it in category pT3b.',
    absent: 'No cancer was found in the seminal vesicles.',
    detail: 'Seminal vesicle invasion is used to set the T category.',
  },
  vpi: {
    title: 'Visceral pleural invasion',
    present: 'The tumor has grown into the thin lining that covers the lung. Even a small tumor with this finding is staged as at least T2.',
    absent: 'The tumor has not grown into the lining of the lung.',
    detail: 'Pathologists often use a special elastic stain to check for this.',
  },
  ulceration: {
    title: 'Ulceration',
    present: 'The skin surface over the melanoma is broken. This is used in staging and adds a "b" to the T category.',
    absent: 'The skin over the melanoma was intact (not ulcerated). This is a favorable finding.',
    detail: 'Ulceration is judged under the microscope, not just by how the skin looks.',
  },
  tumorDeposits: {
    title: 'Tumor deposits',
    present: 'Small separate nodules of cancer were found in the fat around the bowel. If no lymph nodes contain cancer, these are staged as N1c.',
    absent: 'No separate tumor nodules were found in the fat around the bowel.',
    detail: 'Tumor deposits are different from lymph nodes and are counted separately.',
  },
  ene: {
    title: 'Extranodal extension',
    present: 'Cancer inside a lymph node has grown through the node\'s outer capsule.',
    absent: 'Cancer in the lymph nodes stayed inside the nodes\' outer capsule.',
    detail: 'It is one of the factors used to plan radiation and other treatment.',
  },
};

function explainPresence(f: Finding, _site: Site): Explanation | null {
  if (!('status' in f) || !(f.kind in PRESENCE_TEXT)) return null;
  const t = PRESENCE_TEXT[f.kind];
  const status = f.status as string;
  const value = status === 'present' ? 'Present' : status === 'absent' ? 'Not seen' : 'Uncertain';
  const simple = status === 'present' ? t.present : status === 'absent' ? t.absent
    : 'The pathologist could not say for sure. Ask your team whether it changes anything.';
  const group: Group = f.kind === 'vpi' || f.kind === 'ulceration' || f.kind === 'epe' || f.kind === 'svi' ? 'size' : 'spread';
  return {
    id: f.id, findingId: f.id, group, title: t.title, value, simple, detail: t.detail,
    tone: status === 'present' ? 'discuss' : status === 'absent' ? 'calm' : 'neutral',
  };
}

function explainGleason(f: GleasonFinding): Explanation {
  const gg = f.gradeGroup;
  const ggText: Record<number, string> = {
    1: 'Grade Group 1 is the slowest-growing group. Many men with Grade Group 1 can be safely watched (active surveillance) instead of treated right away.',
    2: 'Grade Group 2 is mostly slow-growing pattern 3, with a smaller amount of faster-growing pattern 4.',
    3: 'Grade Group 3 is mostly pattern 4, which tends to grow faster than pattern 3.',
    4: 'Grade Group 4 is a higher-grade cancer that tends to grow faster.',
    5: 'Grade Group 5 is the highest grade. The cells look very abnormal and tend to grow fastest.',
  };
  const score = f.primary !== null ? `Gleason ${f.primary}+${f.secondary}=${f.total}` : '';
  const value = [score, gg ? `Grade Group ${gg}` : ''].filter(Boolean).join(' · ');
  const multi = f.statements > 1
    ? ` Your report lists ${f.statements} Gleason results (for example from different needle cores). PathLight shows the highest, which usually guides treatment.`
    : '';
  return {
    id: f.id, findingId: f.id, group: 'cells', title: 'Gleason score and Grade Group', value,
    simple: gg ? ggText[gg] : 'The Gleason score describes how abnormal the prostate cancer cells look.',
    detail: `The first number is the most common pattern and the second is the highest-grade pattern. Patterns run from 3 (most like normal) to 5, so 6 is the lowest score given today.${multi}`,
    tone: gg && gg >= 4 ? 'discuss' : 'neutral',
  };
}

function explainTnm(f: TnmFinding, site: Site): Explanation {
  const parts = [f.t && describeT(f.t, site, f.prefix), f.n && describeN(f.n, site), f.m && describeM(f.m)].filter(Boolean) as string[];
  const prefix = f.prefix.includes('y')
    ? ' The "y" means it was measured after treatment given before surgery.'
    : f.prefix.includes('p') ? ' The "p" means it is based on the removed tissue (pathology).'
    : f.prefix.includes('c') ? ' The "c" means it is based on exam and imaging (clinical).' : '';
  const value = [f.t && f.prefix + f.t, f.n && f.nPrefix + f.n, f.m].filter(Boolean).join(' ');
  return {
    id: f.id, findingId: f.id, group: 'stage', title: 'TNM staging code', value,
    simple: parts.join(' '),
    detail: `T is the main tumor, N is the lymph nodes and M is distant spread.${prefix} PathLight does not calculate your overall stage. Your care team combines this code with other results (and, for some cancers, grade and biomarkers) to set it.`,
    tone: 'neutral',
  };
}

function explainNodes(f: NodeFinding, site: Site): Explanation {
  const pos = f.positive;
  const ex = f.examined;
  let value: string;
  let simple: string;
  let tone: Tone = 'neutral';
  if (pos === 0) {
    value = ex !== null ? `0 of ${ex} had cancer` : 'No cancer found';
    simple = ex !== null
      ? `${ex === 1 ? 'The one lymph node checked did not have cancer' : ex === 2 ? 'Neither of the 2 lymph nodes checked had cancer' : `None of the ${plural(ex, 'lymph node')} checked had cancer`}. This is a favorable sign.`
      : 'No cancer was found in the lymph nodes checked. This is a favorable sign.';
    if (f.sentinel) simple += ' The sentinel nodes, the first ones the tumor drains to, were clear, so other nodes are usually clear too.';
    if (f.isolatedTumorCells && site === 'breast') simple += ' Only isolated tumor cells (tiny clusters of 0.2 mm or less) were seen, which in breast cancer still counts as node-negative.';
    tone = 'calm';
  } else if (pos !== null) {
    value = ex !== null ? `${pos} of ${ex} had cancer` : `${plural(pos, 'node')} with cancer`;
    simple = `Cancer was found in ${ex !== null ? `${pos} of the ${plural(ex, 'lymph node')}` : plural(pos, 'lymph node')} checked. This means some cancer cells travelled beyond the tumor. It is important for choosing treatment, such as chemotherapy, radiation or more surgery.`;
    if (f.micrometastasis) simple += ' At least one was a micrometastasis (a very small deposit).';
    tone = 'discuss';
  } else {
    value = `${ex} examined`;
    simple = `${plural(ex ?? 0, 'lymph node')} were examined. The report wording about how many had cancer was not clear to PathLight; please check this line with your doctor.`;
  }
  let detail = 'Lymph nodes filter fluid from the tumor area, so they are often the first place cancer spreads.';
  if (site === 'colorectal' && ex !== null) {
    detail += ' Guidelines recommend checking at least 12 lymph nodes in colon cancer surgery to stage it reliably.';
    if (ex < 12) detail += ` Your report lists ${ex}; you can ask whether that affects staging.`;
  }
  return { id: f.id, findingId: f.id, group: 'spread', title: 'Lymph nodes', value, simple, detail, tone };
}

function explainReceptor(f: ReceptorFinding): Explanation {
  const er = f.kind === 'er';
  const name = er ? 'Estrogen receptor (ER)' : 'Progesterone receptor (PR)';
  const pct = f.percentText ? ` (${f.percentText})` : '';
  const value = `${f.status === 'positive' ? 'Positive' : f.status === 'low positive' ? 'Low positive' : f.status === 'negative' ? 'Negative' : 'Unclear'}${pct}`;
  let simple: string;
  if (f.status === 'positive') {
    simple = er
      ? 'The cancer cells have estrogen receptors, so estrogen helps them grow. That is useful to know: hormone (endocrine) therapy, such as tamoxifen or an aromatase inhibitor, can block this.'
      : 'Progesterone receptors are present. PR is read together with ER and adds to the picture of a hormone-sensitive cancer.';
  } else if (f.status === 'low positive') {
    simple = 'Only a small share of cells (1-10%) have estrogen receptors. Guidelines call this "ER low positive". These cancers can behave more like ER-negative cancers, and the benefit of hormone therapy is less certain, so ask how it affects your plan.';
  } else if (f.status === 'negative') {
    simple = er
      ? 'The cancer cells do not have estrogen receptors, so hormone-blocking medicines are not expected to help. Other treatments are used instead.'
      : 'Progesterone receptors were not found.';
  } else {
    simple = 'The report mentions this marker but PathLight could not read a clear result. Please check this line with your doctor.';
  }
  const detail = `Measured with an immunohistochemistry stain${f.percent !== null ? `: ${f.percentText} of cancer cells stained` : ''}${f.intensity ? `, ${f.intensity} intensity` : ''}. Under ASCO/CAP guidelines, 1% or more counts as positive${er ? ', and 1-10% is reported as "low positive"' : ''}.`;
  return {
    id: f.id, findingId: f.id, group: 'biology', title: name, value, simple, detail,
    tone: f.status === 'low positive' ? 'discuss' : 'neutral',
  };
}

function explainHer2(f: Her2Finding): Explanation {
  const ihc = f.ihc !== null ? `IHC ${f.ihc === 0 ? '0' : `${f.ihc}+`}` : null;
  const ish = f.ish ? `ISH ${f.ish}` : null;
  const tests = [ihc, ish].filter(Boolean).join(', ');
  const map: Record<string, [string, string, Tone]> = {
    positive: ['Positive', 'The cancer cells make too much HER2, a growth-signal protein. That is actionable: HER2-targeted medicines (such as trastuzumab) work well against these cancers.', 'discuss'],
    equivocal: ['Equivocal (borderline)', 'The first test (IHC 2+) was borderline. A second test (ISH or FISH) is needed to decide. Ask whether it has been done; results sometimes arrive later in an addendum.', 'discuss'],
    low: ['HER2-low', 'Reports may call this HER2-negative, but a score of 1+, or 2+ without amplification, is called "HER2-low". It matters: a medicine called trastuzumab deruxtecan is approved for some people with HER2-low breast cancer that has spread.', 'discuss'],
    ultralow: ['HER2-ultralow', 'A score of 0 with faint staining in a few cells is called "HER2-ultralow". Since 2025, some people with HER2-ultralow breast cancer that has spread may also be eligible for trastuzumab deruxtecan.', 'discuss'],
    zero: ['HER2 0', 'No HER2 protein staining was seen (score 0). HER2-targeted medicines are not expected to help.', 'neutral'],
    negative: ['Negative', 'HER2 is negative. The report does not show the exact score (0, 1+ or 2+). It is worth asking, because a "HER2-low" result can open extra treatment options if the cancer ever spreads.', 'neutral'],
    unknown: ['Unclear', 'HER2 is mentioned but PathLight could not read a clear result. Please check this line with your doctor.', 'neutral'],
  };
  const [value, simple, tone] = map[f.status];
  return {
    id: f.id, findingId: f.id, group: 'biology', title: 'HER2', value: tests ? `${value} (${tests})` : value, simple,
    detail: 'IHC scores run 0, 1+, 2+ and 3+. 3+ is positive. 2+ needs an in situ hybridization (ISH/FISH) test, where "amplified" means positive (ASCO/CAP 2018 guideline, with 2023 HER2-low wording).',
    tone,
  };
}

// ---------------------------------------------------------------------------
// Whole-report helpers
// ---------------------------------------------------------------------------

export function explainAll(a: Analysis): Explanation[] {
  const out: Explanation[] = [];
  if (a.noMalignancy) {
    out.push({
      id: 'noMalignancy', findingId: null, group: 'diagnosis', title: 'Result', value: 'No cancer found',
      simple: 'The report states that no cancer was found in this sample. If you had the test because of a scan or a symptom, ask your doctor whether this result fully explains it.',
      detail: 'Pathologists use phrases like "negative for malignancy" or "no evidence of carcinoma" to say this.', tone: 'calm',
    });
  }
  for (const f of a.findings) {
    const e = explainFinding(f, a);
    if (e) out.push(e);
  }
  const er = a.findings.find((f) => f.kind === 'er') as ReceptorFinding | undefined;
  const pr = a.findings.find((f) => f.kind === 'pr') as ReceptorFinding | undefined;
  const her2 = a.findings.find((f) => f.kind === 'her2') as Her2Finding | undefined;
  if (er?.status === 'negative' && pr?.status === 'negative' && her2 && ['zero', 'negative', 'low', 'ultralow'].includes(her2.status)) {
    out.push({
      id: 'tnbc', findingId: null, group: 'biology', title: 'Combined result', value: 'Triple-negative',
      simple: 'ER, PR and HER2 are all negative. This is called triple-negative breast cancer. Treatment usually includes chemotherapy and may include immunotherapy.',
      detail: 'Triple-negative cancers are about 10-15% of breast cancers. If HER2 is "low", that can still matter for later treatment options.',
      tone: 'discuss',
    });
  }
  const order = GROUPS.map((g) => g.id);
  return out.sort((x, y) => order.indexOf(x.group) - order.indexOf(y.group));
}

export const SITE_LABEL: Record<Site, string> = {
  breast: 'Breast', colorectal: 'Colon / rectum', prostate: 'Prostate', lung: 'Lung', melanoma: 'Skin (melanoma)', other: 'Not recognised',
};
