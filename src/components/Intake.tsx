import { useRef, useState, type DragEvent } from 'react';
import { REPORTS } from '../data/reports';
import { CSP_DIRECTIVES } from '../policy';

const MAX_CHARS = 200_000;

export function Intake({ initial, onSubmit }: { initial: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      let content: string;
      if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name)) {
        setBusy('Reading the photo on this device. The first time takes a few seconds...');
        const { ocrImage } = await import('../ocr');
        content = await ocrImage(file, (p) => setBusy(`Reading the photo on this device: ${Math.round(p * 100)}%`));
      } else if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        setBusy('Reading the PDF...');
        const { pdfToText } = await import('../pdf');
        const res = await pdfToText(file, (label) => setBusy(label));
        content = res.text;
      } else {
        content = await file.text();
      }
      if (content.trim().length < 20) {
        setError('No readable text was found in that file. Try a clearer photo, or copy the text from your patient portal.');
      } else {
        setText(content.slice(0, MAX_CHARS));
      }
    } catch {
      setError('PathLight could not read that file. Try another PDF or photo, or paste the text instead.');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void onFile(e.dataTransfer.files?.[0]);
  }

  const ready = text.trim().length >= 20 && !busy;
  return (
    <main id="main">
      <section className="intake wrap">
        <p className="kicker">For patients and the people helping them</p>
        <h1 className="display intake-title">Your pathology report, <em>read alongside you.</em></h1>
        <div className="intake-grid">
          <div className="intake-copy">
            <p className="lede">
              Paste the report from your patient portal, or upload the PDF or a photo of the paper copy.
              PathLight marks each result in the report itself, writes a plain-language note beside it, and
              helps you prepare questions for your care team.
            </p>
            <dl className="facts">
              <div><dt>Where it runs</dt><dd>In this browser tab. The report is never uploaded or stored.</dd></div>
              <div><dt>What it reads</dt><dd>Breast, colorectal, prostate, lung and melanoma reports, plus a glossary for any other kind.</dd></div>
              <div><dt>How it was checked</dt><dd>On 1,548 real reports from The Cancer Genome Atlas it had never seen, 92.6% of the results it gave matched the curated clinical record. When it is unsure, it says nothing rather than guess.</dd></div>
              <div><dt>Cost</dt><dd>Free, with no account.</dd></div>
            </dl>
          </div>

          <div>
            <form className={`sheet paste${dragging ? ' dragging' : ''}`}
              onSubmit={(e) => { e.preventDefault(); if (ready) onSubmit(text); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)} onDrop={onDrop}>
              <label htmlFor="report" className="kicker">Your report</label>
              <textarea id="report" value={text} maxLength={MAX_CHARS} spellCheck={false}
                placeholder="Paste the text of the report here, or drop a PDF or a photo of it onto this page."
                onChange={(e) => setText(e.target.value)} />
              <div className="paste-bar">
                <button type="button" className="link-btn" onClick={() => fileRef.current?.click()} disabled={!!busy}>
                  Upload a PDF or photo
                </button>
                {text && !busy && <button type="button" className="link-btn" onClick={() => setText('')}>Clear</button>}
                <span className="spacer" />
                <button type="submit" className="btn" disabled={!ready}>Read my report <span aria-hidden="true">→</span></button>
              </div>
              <input ref={fileRef} type="file" hidden accept=".pdf,.txt,image/*,application/pdf,text/plain"
                onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload a PDF, photo or text file" />
              {busy && <p className="status-line muted" role="status">{busy}</p>}
              {error && <p className="status-line error" role="alert">{error}</p>}
            </form>
            <p className="examples">
              No report to hand? Open a made-up one:{' '}
              {REPORTS.filter((r) => r.sample).map((r) => (
                <button key={r.id} type="button" className="link-btn" onClick={() => { setText(r.text); setError(null); }}>{r.title.toLowerCase()}</button>
              ))}
            </p>
          </div>
        </div>
      </section>

      <section className="how wrap" id="how" aria-labelledby="how-title">
        <div>
          <h2 id="how-title" className="h2">What happens to your report</h2>
          <ol>
            <li><strong>It is read here, in your browser.</strong> PathLight's rules run on your device. There is no PathLight server to send it to.</li>
            <li><strong>Every note shows where it came from.</strong> Each explanation is tied to the exact words in your report, so you can check it.</li>
            <li><strong>Clinical-trial search is optional.</strong> If you use it, only a cancer type and one marker go to ClinicalTrials.gov, and you see the exact words first.</li>
          </ol>
        </div>
        <div>
          <p className="kicker">The rule your browser enforces on this page</p>
          <pre className="policy" aria-label="Content security policy">
            {CSP_DIRECTIVES.map(([k, v]) => <span key={k}><b>{k}</b> {v}{'\n'}</span>)}
          </pre>
          <p className="proof">
            <strong>connect-src</strong> lists the only places this page is allowed to contact: itself, and the public
            ClinicalTrials.gov registry. Anything else, including any server that could collect your report, is blocked by the browser.
          </p>
        </div>
      </section>
      <footer className="wrap colophon" style={{ marginTop: 40 }}>
        <div><h2>PathLight</h2><p className="fine">Free and open source. Made for the 2026 CodeTheCure Hackathon. Example reports are synthetic.</p></div>
        <p>PathLight explains words; it does not give medical advice, a diagnosis or a stage. Always confirm what your report means with your care team.</p>
      </footer>
    </main>
  );
}
