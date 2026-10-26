# PathLight: final presentation (5-minute talk + 4-minute Q&A)

The finished deck is `PathLight_Deck.pptx` (10 slides with speaker notes). This is its outline. A live demo can replace slides 5-6.

1. **Title.** "PathLight: your pathology report, read alongside you." Hook line: a notification millions of people get every year.
2. **The page patients actually see.** A portal notification and the raw report text (`pT2 pN0(sn) · HER2 (IHC): Negative (Score 1+)`). Since the Cures Act it arrives before the doctor calls.
3. **The problem, with evidence.** 95.7% of 8,139 portal users want results immediately; 16.5% with abnormal results felt more worried reading alone; 39.9% searched the internet (Steitz et al., JAMA Netw Open 2023). The alternatives are search engines, chatbots (a privacy risk, and they can make things up) or waiting.
4. **The idea: the report is the interface.** The patient's own report is highlighted and footnoted, with plain-language notes in the margin. Three principles: checkable, private, humane.
5. **Walkthrough.** Summary and key facts, then the annotated report with margin notes, definitions and two-way linking.
6. **"Negative" is not the whole story.** The HER2-low catch, plus the question PathLight adds automatically.
7. **Connected, without giving up privacy.** On-device OCR for photos and scans, and a live ClinicalTrials.gov search that sends only a condition, one marker and a place, shown before sending. The CSP allows one outside address.
8. **Architecture.** Input → pdf.js / OCR → normalise (OCR fixes) → segment with offsets → extractors with NegEx negation and specimen-aware node counting → findings with evidence spans → summary, notes, questions, trial query. React + TypeScript, static hosting, 118 tests in CI.
9. **Validation on real reports.** 1,548 held-out TCGA reports and 8,150 curated values: 92.6% agreement when it answers (ER 97.5%, T 96.8%, N 98.2%); up from 89.5% for the first version; dev/test split; silence when unsure.
10. **Impact and close.** $0 per user at any scale, deployable from portals and cancer-center pages, measured by comprehension and anxiety studies. Roadmap: pathologist review, Spanish, more organs. "No one should face that page alone."
