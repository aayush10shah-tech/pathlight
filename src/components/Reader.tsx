import { useEffect, useMemo, useRef, useState } from 'react';
import type { Analysis } from '../engine/types';
import { explainAll, SITE_LABEL, type Explanation } from '../engine/explain';
import { questionsFor } from '../engine/questions';
import { summarize } from '../engine/summary';
import { GLOSSARY } from '../engine/glossary';
import { AnnotatedDocument, numberNotes } from './AnnotatedDocument';
import { Trials } from './Trials';
import type { Pace } from './CheckIn';

const KEY_ORDER = ['noMalignancy', 'histology', 'grade', 'gleason', 'tumorSize', 'breslow', 'lymphNodes', 'margins', 'er', 'pr', 'her2', 'tnbc', 'mmr', 'tnm'];

const TITLE: Record<Analysis['site'], string> = {
  breast: 'Your breast pathology report',
  colorectal: 'Your colorectal pathology report',
  prostate: 'Your prostate pathology report',
  lung: 'Your lung pathology report',
  melanoma: 'Your skin (melanoma) pathology report',
  other: 'Your pathology report',
};

export function Reader({ analysis, pace, onEdit, onReset }: {
  analysis: Analysis;
  pace: Pace;
  onEdit: () => void;
  onReset: () => void;
}) {
  const explanations = useMemo(() => explainAll(analysis), [analysis]);
  const { notes, general } = useMemo(() => numberNotes(analysis, explanations), [analysis, explanations]);
  const questions = useMemo(() => questionsFor(analysis), [analysis]);
  const runs = useMemo(() => summarize(analysis), [analysis]);
  const [detailed, setDetailed] = useState(pace === 'full');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(questions.map((q) => q.id)));
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [large, setLarge] = useState(() => document.body.classList.contains('large-text'));
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { document.body.classList.toggle('large-text', large); }, [large]);
  useEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  const keyFacts = KEY_ORDER.map((id) => explanations.find((e) => e.id === id)).filter((e): e is Explanation => !!e);
  const numberOf = new Map(notes.map((x) => [x.e.findingId ?? x.e.id, x.n]));
  const terms = [...new Set(analysis.glossary.map((g) => g.key))].map((k) => GLOSSARY[k]).sort((a, b) => a.term.localeCompare(b.term));
  const hasContent = explanations.length > 0;
  const canSpeak = 'speechSynthesis' in window;

  function jump(id: string) {
    setActiveId(id);
    document.getElementById(`note-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function readAloud() {
    const synth = window.speechSynthesis;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const script = [
      runs.map((r) => r.text).join(''),
      ...notes.map(({ e, n }) => `Note ${n}. ${e.title}: ${e.value}. ${e.simple}`),
      'Your care team is the best source of advice about your situation.',
    ].join(' ');
    const u = new SpeechSynthesisUtterance(script);
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  }

  async function copyQuestions() {
    const list = questions.filter((q) => checked.has(q.id)).map((q, i) => `${i + 1}. ${q.text}`).join('\n');
    try {
      await navigator.clipboard.writeText(`Questions for my care team\n\n${list}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  }

  return (
    <>
      <div className="toolbar-wrap no-print">
        <div className="wrap toolbar" role="toolbar" aria-label="Reading options">
          <span className="group" role="group" aria-label="Level of detail">
            <button type="button" className="tool" aria-pressed={!detailed} onClick={() => setDetailed(false)}>Plain</button>
            <button type="button" className="tool" aria-pressed={detailed} onClick={() => setDetailed(true)}>Detailed</button>
          </span>
          <span className="divider" />
          <button type="button" className="tool" aria-pressed={large} onClick={() => setLarge((v) => !v)}>Larger text</button>
          {canSpeak && hasContent && (
            <button type="button" className="tool" aria-pressed={speaking} onClick={readAloud}>{speaking ? 'Stop reading' : 'Read aloud'}</button>
          )}
          <button type="button" className="tool" onClick={() => window.print()}>Print</button>
          <span className="spacer" />
          {hasContent && <a className="tool" href="#questions">Questions</a>}
          <button type="button" className="tool" onClick={onEdit}>Edit text</button>
          <button type="button" className="tool" onClick={onReset}>Start over</button>
        </div>
      </div>

      <main id="main" className="wrap">
        <header className="reading-head">
          <div>
            <p className="kicker">A plain-language reading · {SITE_LABEL[analysis.site]}<span className="print-only">Made with PathLight on {new Date().toLocaleDateString()}. Educational, not medical advice.</span></p>
            <h1 ref={headingRef} tabIndex={-1} className="display" style={{ fontSize: 'clamp(36px, 4.6vw, 58px)', marginTop: 12 }}>{TITLE[analysis.site]}</h1>
            {hasContent ? (
              <p className="summary">
                {runs.map((r, i) => (r.fid && numberOf.has(r.fid)
                  ? <a key={i} href={`#note-${r.fid}`} className="ref" onClick={(ev) => { ev.preventDefault(); jump(r.fid!); }}>{r.text}</a>
                  : <span key={i}>{r.text}</span>))}
              </p>
            ) : (
              <div className="empty">
                <p className="summary">PathLight could not find pathology results in this text.</p>
                <p style={{ marginTop: 14 }}>
                  It works best with surgical pathology and biopsy reports for breast, colon and rectum, prostate, lung and skin
                  melanoma. Check that the diagnosis section was included.{terms.length ? ' The words below are still explained.' : ''}
                </p>
                <p style={{ marginTop: 18 }}><button type="button" className="btn secondary" onClick={onEdit}>Edit the text</button></p>
              </div>
            )}
            {analysis.site === 'other' && hasContent && (
              <p className="notice">
                PathLight could not tell which organ this report is about, so its notes are general. It fully supports breast,
                colorectal, prostate, lung and melanoma reports.
              </p>
            )}
          </div>
          {keyFacts.length > 0 && (
            <aside aria-label="Key facts">
              <p className="kicker">Key facts</p>
              <dl className="keyfacts">
                {keyFacts.map((e) => {
                  const id = e.findingId ?? e.id;
                  const n = numberOf.get(id);
                  return (
                    <div key={e.id}>
                      <dt>{e.title}</dt>
                      <dd>
                        {n ? <button type="button" onClick={() => jump(id)}>{e.value}</button> : e.value}
                        {e.tone === 'discuss' && <span className="flag-mark" title="Worth asking about" aria-label="worth asking about">✱</span>}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {keyFacts.some((e) => e.tone === 'discuss') && <p className="small muted" style={{ marginTop: 10 }}>✱ worth asking your care team about</p>}
            </aside>
          )}
        </header>

        {hasContent && (
          <section className="section" aria-labelledby="doc-title">
            <div className="section-head">
              <div>
                <h2 id="doc-title" className="h2">Your report, annotated</h2>
                <p className="sub">Highlighted words are explained in the numbered notes. Words with a dotted underline have a definition: tap them.</p>
              </div>
            </div>
            <AnnotatedDocument analysis={analysis} notes={notes} general={general} detailed={detailed} activeId={activeId} onActivate={setActiveId} />
          </section>
        )}

        {hasContent && (
          <section className="section" id="questions" aria-labelledby="q-title">
            <div className="section-head">
              <div>
                <h2 id="q-title" className="h2">Questions for your care team</h2>
                <p className="sub">Chosen from what your report says. Untick any you do not need, then copy or print the list.</p>
              </div>
            </div>
            <div className="notepad">
              <ol>
                {questions.map((q) => (
                  <li key={q.id} className={checked.has(q.id) ? '' : 'off no-print'}>
                    <label>
                      <input type="checkbox" className="no-print" checked={checked.has(q.id)}
                        onChange={() => setChecked((s) => { const x = new Set(s); if (x.has(q.id)) x.delete(q.id); else x.add(q.id); return x; })} />
                      <span className="qn" aria-hidden="true" />
                      <span><span className="qt">{q.text}</span><span className="qw">{q.why}</span></span>
                    </label>
                  </li>
                ))}
              </ol>
              <div className="bar no-print">
                <button type="button" className="link-btn" onClick={copyQuestions}>{copied ? 'Copied' : 'Copy the list'}</button>
                <button type="button" className="link-btn" onClick={() => window.print()}>Print it with the reading</button>
              </div>
            </div>
          </section>
        )}

        {hasContent && <Trials analysis={analysis} />}

        {terms.length > 0 && (
          <section className="section" aria-labelledby="w-title">
            <div className="section-head"><h2 id="w-title" className="h2">Words in your report</h2></div>
            <dl className="glossary">
              {terms.map((t) => <div key={t.key}><dt>{t.term}</dt><dd>{t.def}</dd></div>)}
            </dl>
          </section>
        )}

        <footer className="colophon">
          <div>
            <h2>You do not have to sort through this alone</h2>
            <ul>
              <li>NCI Cancer Information Service (US, free): <a href="tel:18004226237">1-800-422-6237</a></li>
              <li>American Cancer Society, 24 hours (US): <a href="tel:18002272345">1-800-227-2345</a></li>
              <li>Outside the US, ask your care team for your national cancer support line.</li>
            </ul>
          </div>
          <div>
            <p>
              PathLight is educational. It is not a medical device and does not give medical advice, a diagnosis or a stage.
              It can miss or misread results, especially unusual wording, so check each note against your report and confirm with
              your doctor.
            </p>
            <p className="fine">
              Explanations follow AJCC 8th edition staging, ASCO/CAP biomarker guidelines and ISUP grading. Accuracy was measured
              on 1,548 held-out reports from The Cancer Genome Atlas (TCGA-Reports, Kefeli &amp; Tatonetti, 2024).
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
