import { useMemo, useRef, useState } from 'react';
import type { Analysis } from '../engine/types';
import { searchTrials, sitesNear, trialQueryFor, websiteUrl, type Trial } from '../trials';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; total: number; trials: Trial[]; location: string }
  | { kind: 'error'; message: string };

export function Trials({ analysis }: { analysis: Analysis }) {
  const base = useMemo(() => trialQueryFor(analysis), [analysis]);
  const [location, setLocation] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const abort = useRef<AbortController | null>(null);
  if (!base) return null;
  const query = { ...base, location };

  async function run() {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setState({ kind: 'loading' });
    try {
      const res = await searchTrials(query, ctl.signal);
      setState({ kind: 'done', ...res, location });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState({ kind: 'error', message: navigator.onLine ? 'ClinicalTrials.gov did not answer. Please try again in a moment.' : 'You appear to be offline.' });
    }
  }

  return (
    <section className="section" id="trials" aria-labelledby="trials-title">
      <div className="section-head">
        <div>
          <h2 id="trials-title" className="h2">Clinical trials recruiting now</h2>
          <p className="sub">
            A live search of ClinicalTrials.gov, the public registry run by the U.S. National Library of Medicine. It is free
            and optional. Only the words in the box below are sent; your report stays on this device.
          </p>
        </div>
      </div>
      <div className="trials-grid">
        <form className="sending" onSubmit={(e) => { e.preventDefault(); void run(); }}>
          <p className="kicker">Exactly what will be sent</p>
          <pre aria-live="polite">
            <b>condition</b>  {query.condition}{'\n'}
            <b>keyword  </b>  {query.keyword ?? '(none)'}{'\n'}
            <b>status   </b>  recruiting{'\n'}
            <b>near     </b>  {location.trim() || '(anywhere)'}
          </pre>
          <label className="field">
            <span className="small muted">Near a place (optional): a city, state or country</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Seattle, or Texas" maxLength={60} autoComplete="off" />
          </label>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button type="submit" className="btn" disabled={state.kind === 'loading'}>
              {state.kind === 'loading' ? 'Searching...' : 'Search ClinicalTrials.gov'}
            </button>
            <a href={websiteUrl(query)} target="_blank" rel="noreferrer" className="small">Open on the website</a>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>Not sent: your report, your name, or anything else on this page.</p>
        </form>

        <div aria-live="polite">
          {state.kind === 'idle' && <p className="muted">Results will appear here. Searching is optional.</p>}
          {state.kind === 'loading' && <p className="muted">Searching ClinicalTrials.gov...</p>}
          {state.kind === 'error' && <p className="notice" role="alert">{state.message}</p>}
          {state.kind === 'done' && (
            state.trials.length === 0 ? (
              <p className="muted">No recruiting studies matched{state.location ? ` near “${state.location}”` : ''}. Try a wider place, or leave it blank.</p>
            ) : (
              <>
                <p className="small muted" style={{ marginBottom: 10 }}>
                  {state.total.toLocaleString()} recruiting {state.total === 1 ? 'study matches' : 'studies match'}. Showing the {state.trials.length} most recently updated.
                </p>
                <ol className="trial-list">
                  {state.trials.map((t) => {
                    const near = sitesNear(t, state.location);
                    return (
                      <li key={t.id}>
                        <p className="meta">
                          {[t.phases.join(' / ') || 'Phase not listed', t.updated && `updated ${t.updated}`, `${t.sites.length} ${t.sites.length === 1 ? 'site' : 'sites'}`].filter(Boolean).join(' · ')}
                        </p>
                        <h3><a href={`https://clinicaltrials.gov/study/${t.id}`} target="_blank" rel="noreferrer">{t.title}</a></h3>
                        {t.summary && <p>{t.summary.length > 230 ? `${t.summary.slice(0, 230).trimEnd()}...` : t.summary}</p>}
                        {near.length > 0 && (
                          <p className="small">Near {state.location}: {near.slice(0, 2).map((s) => [s.facility, s.city].filter(Boolean).join(', ')).join('; ')}{near.length > 2 ? ` and ${near.length - 2} more` : ''}</p>
                        )}
                        <p className="small muted">{t.id}</p>
                      </li>
                    );
                  })}
                </ol>
                <p className="small" style={{ marginTop: 14 }}>
                  Whether a trial fits depends on details only your care team knows. Bring any that interest you to your next
                  appointment. <a href={websiteUrl(query)} target="_blank" rel="noreferrer">See every match on ClinicalTrials.gov</a>
                </p>
              </>
            )
          )}
        </div>
      </div>
    </section>
  );
}
