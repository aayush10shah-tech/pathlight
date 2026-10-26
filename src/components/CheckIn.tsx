import { useEffect, useRef } from 'react';

export type Pace = 'gentle' | 'full';

/** A short pause before results. Reading a report can be hard; the person sets the pace. */
export function CheckIn({ onChoose, onBack }: { onChoose: (p: Pace) => void; onBack: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <main id="main" className="wrap">
      <section className="checkin" aria-labelledby="checkin-title">
        <p className="kicker">Before you read</p>
        <h1 id="checkin-title" className="display" ref={ref} tabIndex={-1} style={{ marginTop: 12 }}>Take this at your own pace.</h1>
        <p>Pathology reports can bring up a lot of feelings. That is normal, and there is no rush.</p>
        <p>
          PathLight explains what the words in your report mean. It cannot tell you what will happen next. Your care team
          can, and the questions at the end are there to help that conversation.
        </p>
        <div className="choices">
          <button type="button" className="choice" onClick={() => onChoose('gentle')}>
            <strong>Start with the plain-language version</strong>
            <span>Short notes first. You can open more detail on any note.</span>
          </button>
          <button type="button" className="choice" onClick={() => onChoose('full')}>
            <strong>Show me everything</strong>
            <span>Every note with the guideline detail already open.</span>
          </button>
        </div>
        <p className="aside">
          If you need to talk to someone now, the National Cancer Institute's Cancer Information Service is free
          at <a href="tel:18004226237">1-800-422-6237</a> (US).{' '}
          <button type="button" className="link-btn" onClick={onBack}>Go back</button>
        </p>
      </section>
    </main>
  );
}
