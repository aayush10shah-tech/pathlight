import { useMemo, useState } from 'react';
import { analyze } from './engine';
import { Intake } from './components/Intake';
import { CheckIn, type Pace } from './components/CheckIn';
import { Reader } from './components/Reader';
import { REPORTS } from './data/reports';

type Step = 'intake' | 'checkin' | 'reading';

/** "#example=colon-resection" opens a bundled synthetic report directly (for demos and links). */
function exampleFromHash(): string {
  const id = /^#example=([\w-]+)$/.exec(window.location.hash)?.[1];
  return REPORTS.find((r) => r.id === id)?.text ?? '';
}

/** All state lives in memory. Closing the tab, or "Start over", erases the report completely. */
export function App() {
  const [step, setStep] = useState<Step>(() => (exampleFromHash() ? 'reading' : 'intake'));
  const [text, setText] = useState(exampleFromHash);
  const [pace, setPace] = useState<Pace>('gentle');
  const analysis = useMemo(() => (text ? analyze(text) : null), [text]);

  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };
  const reset = () => {
    window.speechSynthesis?.cancel();
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
    setText('');
    go('intake');
  };

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="masthead">
        <div className="wrap">
          <button type="button" className="wordmark" onClick={reset} aria-label="PathLight, start over">
            Path<span>Light</span>
          </button>
          <p className="masthead-note">Your report stays on this device. <a href="#how" onClick={() => step !== 'intake' && go('intake')}>How</a></p>
        </div>
      </header>
      {step === 'intake' && <Intake initial={text} onSubmit={(t) => { setText(t); go('checkin'); }} />}
      {step === 'checkin' && <CheckIn onBack={() => go('intake')} onChoose={(p) => { setPace(p); go('reading'); }} />}
      {step === 'reading' && analysis && <Reader analysis={analysis} pace={pace} onEdit={() => go('intake')} onReset={reset} />}
    </>
  );
}
