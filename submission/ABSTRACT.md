# PathLight: your pathology report, read alongside you

**Category:** Detection & Diagnosis (medical report visualization)

A pathology report often reaches the patient before the doctor does. Under the 21st Century Cures Act, results are released to patient portals immediately. In a 2023 survey of 8,139 portal users, 16.5% of people with abnormal results felt more worried reading them alone, and 39.9% turned to internet searches. The reports are written for doctors: "pT2 pN0(sn), HER2 1+, LVI not identified."

PathLight turns the patient's own report into an annotated document. Paste the text, upload the PDF, or photograph the paper copy (OCR runs on the device). A clinical language engine we built identifies more than 20 kinds of findings across breast, colorectal, prostate, lung and melanoma reports. It highlights each one in the report, numbers it like a footnote, and writes a plain-language note in the margin beside it. A summary paragraph, to-scale visuals and tailored questions for the care team follow. Guideline logic is built in: PathLight flags HER2-low results that reports label "negative" but that can now open treatment options.

It also connects to ClinicalTrials.gov for a live search of recruiting trials. Only a cancer type and one marker are sent, and the patient sees the exact query first. A browser-enforced security policy blocks every other outside request, so the report never leaves the device. No account, no API key, no cost.

We validated it on 1,548 held-out real reports from The Cancer Genome Atlas, compared with curated clinical records. 92.6% of 5,489 extracted values agreed (ER 97.5%, pathologic T 96.8%, N 98.2%). Errors were analyzed only on a separate development half. 118 automated tests protect the engine.

PathLight does not diagnose or stage. It helps people understand their report, then talk with their care team.
