# Q&A prep: likely judge questions

**Q: Why not use an LLM? The theme is "frontier intelligence."**
Because the stakes need checkability. A fluent but wrong explanation of a cancer report is dangerous, and a patient can't spot it. Every PathLight note is tied to its exact source words and a published rule. A cloud LLM would also mean sending health records to a third party; ours is provably blocked from doing that. The engine is clinical NLP (the NegEx family that hospitals use for clinical text mining), and it runs on-device AI where AI is the right tool: OCR for photos of paper reports.

**Q: How do you know it's accurate on real reports?**
We tested it on TCGA-Reports, 9,523 real OCR'd pathology reports from The Cancer Genome Atlas, against curated clinical records from cBioPortal. Patients were split 50/50 by a hash of their ID, and only the development half was ever looked at. On the 1,548-report held-out half, 92.6% of 5,489 values agreed (ER 97.5%, T 96.8%, N 98.2%, PR 92.5%). The first version scored 89.5% on the same half, so the error analysis helped. Each fix is now a regression test.

**Q: Why is coverage only 67%?**
That's by design: when PathLight isn't sure, it says nothing rather than guess. Many TCGA reports also don't contain the value at all; HER2, for example, is often reported in a separate addendum. Some disagreements are label noise: TCGA's record sometimes draws on other documents, which shows up clearly in lymph-node counts.

**Q: What's weakest?**
HER2 (76.9%) and lymph nodes examined (72.1%). HER2 is hard because reports mix pending tests, legends and FISH results; nodes because counts are spread across specimens and restated in summaries. Both are where the next round of work goes, ideally with a pathologist reviewing.

**Q: How does privacy actually work? Prove it.**
There's no backend. The production build ships a Content-Security-Policy whose `connect-src` allows only the site itself and `clinicaltrials.gov`. Even a bug or a malicious dependency couldn't send the report anywhere, because the browser refuses. The landing page shows the policy verbatim. Fonts, pdf.js, the OCR engine and its language model are all bundled; open DevTools → Network to check.

**Q: Doesn't the trial search leak health information?**
It sends a cancer type ("breast cancer"), at most one marker ("HER2-low") and an optional place the user types. The user sees that exact query before pressing Search. No report text, no name, no cookies (`credentials: 'omit'`) and no referrer. It's the same information someone would type into the ClinicalTrials.gov website themselves.

**Q: How do the margin notes line up with the text?**
Each finding keeps character offsets for its evidence. The report is cut into pieces at every highlight boundary; the first piece of each finding carries an anchor. After layout, each note is placed level with its anchor, and pushed down when the note above it would overlap. A ResizeObserver re-runs this when fonts load or the window changes. On phones the notes become footnotes.

**Q: How does the OCR work offline? How big is it?**
tesseract.js, which is the Tesseract engine compiled to WebAssembly. The worker, core and English LSTM model (about 7 MB) are served from the site's own `/ocr` folder and load only when someone uploads a photo. A test photo took about 7 seconds. Bad files fail with a clear message rather than hanging.

**Q: What was the hardest technical problem?**
Lymph node counting on real reports. The same count is written several ways ("two of nine (2/9)"), totals are restated after their parts ("7/8" and "1/5", then "Positive 8/13"), and separate sentinel specimens can have identical counts ("0/1" each). PathLight tracks which specimen label each count belongs to (A., #2, Station 7), counts restatements once, and recognizes totals.

**Q: How does it scale? What does it cost?**
It's a static site, so all computing happens on the user's device: 1 user or 1 million costs the same, and no server ever holds health data. The trial search uses a free public government API.

**Q: Is this a medical device?**
It's patient education, like a glossary or a patient guide. It doesn't diagnose, stage, analyze images for disease or recommend treatment, and it always routes the person back to their care team.

**Q: Did you talk to patients or clinicians?**
Answer honestly. If not yet: "That's the first step after the hackathon: a pathologist reviewing every explanation, and a small usability study with caregivers measuring comprehension and anxiety before and after."

**Q: How did you build it?**
Describe your real process honestly, including any AI tools you used and how you tested what they produced. The held-out evaluation and the test suite are evidence of rigor whoever wrote the code.

---

### Numbers to remember
- 1,548 held-out real reports · 8,150 curated values · **92.6%** agreement (from 89.5%) · 67.3% coverage
- ER 97.5% · PR 92.5% · T 96.8% · N 98.2% · HER2 76.9%
- 118 automated tests · 20 gold + 12 stress synthetic reports at 100%
- 1 outside address allowed (ClinicalTrials.gov) · 0 servers · $0 per user
- Survey: 8,139 portal users; 95.7% want immediate results; 16.5% with abnormal results felt more worried; 39.9% searched online
