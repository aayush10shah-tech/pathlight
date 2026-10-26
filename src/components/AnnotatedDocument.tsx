import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Analysis, Finding } from '../engine/types';
import type { Explanation } from '../engine/explain';
import { GLOSSARY } from '../engine/glossary';
import { Visual } from './Visuals';

const WIDE = '(min-width: 1061px)';

interface Piece {
  start: number;
  end: number;
  ids: string[];
  term: string | null;
  anchorOf: string | null;
  footnotes: number[];
}

export interface NoteItem {
  e: Explanation;
  finding: Finding | undefined;
  n: number;
  anchor: number;
}

/** Number the notes in reading order: by where each finding first appears in the report. */
export function numberNotes(analysis: Analysis, explanations: Explanation[]): { notes: NoteItem[]; general: Explanation[] } {
  const byId = new Map(analysis.findings.map((f) => [f.id, f]));
  const anchored: Omit<NoteItem, 'n'>[] = [];
  const general: Explanation[] = [];
  for (const e of explanations) {
    const finding = e.findingId ? byId.get(e.findingId) : undefined;
    const first = finding ? Math.min(...finding.spans.map((s) => s.start)) : e.id === 'noMalignancy' ? analysis.noMalignancy?.start : undefined;
    if (first === undefined || !Number.isFinite(first)) general.push(e);
    else anchored.push({ e, finding, anchor: first });
  }
  anchored.sort((a, b) => a.anchor - b.anchor);
  return { notes: anchored.map((x, i) => ({ ...x, n: i + 1 })), general };
}

function spansOf(a: Analysis, id: string) {
  if (id === 'noMalignancy') return a.noMalignancy ? [a.noMalignancy] : [];
  return a.findings.find((f) => f.id === id)?.spans ?? [];
}

function piecesFor(a: Analysis, notes: NoteItem[]): Piece[] {
  const ids = notes.map((x) => x.e.findingId ?? x.e.id);
  const cuts = new Set<number>([0, a.text.length]);
  for (const id of ids) for (const s of spansOf(a, id)) { cuts.add(s.start); cuts.add(s.end); }
  for (const g of a.glossary) { cuts.add(g.span.start); cuts.add(g.span.end); }
  const points = [...cuts].filter((c) => c >= 0 && c <= a.text.length).sort((x, y) => x - y);
  // The first span of each finding carries its footnote number at its end.
  const firstSpan = new Map(notes.map((x) => {
    const id = x.e.findingId ?? x.e.id;
    const s = [...spansOf(a, id)].sort((p, q) => p.start - q.start)[0];
    return [id, { s, n: x.n }];
  }));
  const out: Piece[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;
    const covering = ids.filter((id) => spansOf(a, id).some((s) => s.start <= start && s.end >= end));
    const term = a.glossary.find((g) => g.span.start <= start && g.span.end >= end)?.key ?? null;
    let anchorOf: string | null = null;
    const footnotes: number[] = [];
    for (const [id, { s, n }] of firstSpan) {
      if (!s) continue;
      if (s.start === start) anchorOf ??= id;
      if (s.end === end) footnotes.push(n);
    }
    out.push({ start, end, ids: covering, term, anchorOf, footnotes: footnotes.sort((x, y) => x - y) });
  }
  return out;
}

export function AnnotatedDocument({ analysis, notes, general, detailed, activeId, onActivate }: {
  analysis: Analysis;
  notes: NoteItem[];
  general: Explanation[];
  detailed: boolean;
  activeId: string | null;
  onActivate: (id: string | null) => void;
}) {
  const pieces = useMemo(() => piecesFor(analysis, notes), [analysis, notes]);
  const docRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const marginRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [pop, setPop] = useState<{ key: string; top: number; left: number } | null>(null);
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Place each margin note level with its highlight, pushing a note down when the one above it is long.
  const layout = useCallback(() => {
    const doc = docRef.current;
    const margin = marginRef.current;
    if (!doc || !margin) return;
    const noteEls = [...margin.querySelectorAll<HTMLElement>('[data-note]')];
    if (!window.matchMedia(WIDE).matches) {
      noteEls.forEach((el) => { el.style.transform = ''; });
      margin.style.minHeight = '';
      return;
    }
    const marginTop = margin.getBoundingClientRect().top;
    let cursor = 0;
    const generalEl = margin.querySelector<HTMLElement>('.whole-report');
    if (generalEl) cursor = generalEl.offsetHeight + 24;
    for (const el of noteEls) {
      const anchor = doc.querySelector<HTMLElement>(`[data-anchor="${el.dataset.note}"]`);
      const want = anchor ? anchor.getBoundingClientRect().top - marginTop - 4 : cursor;
      const y = Math.max(want, cursor);
      el.style.transform = `translateY(${Math.round(y)}px)`;
      cursor = y + el.offsetHeight + 16;
    }
    margin.style.minHeight = `${Math.ceil(cursor)}px`;
  }, []);

  useLayoutEffect(() => { layout(); }, [layout, pieces, detailed, open, wide]);
  useEffect(() => {
    const ro = new ResizeObserver(() => layout());
    if (sheetRef.current) ro.observe(sheetRef.current);
    if (marginRef.current) ro.observe(marginRef.current);
    void document.fonts?.ready.then(() => layout());
    return () => ro.disconnect();
  }, [layout]);

  // Close the definition popover on Escape or a click elsewhere.
  useEffect(() => {
    if (!pop) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof MouseEvent && (e.target as HTMLElement).closest('.popover, .term')) return;
      setPop(null);
    };
    window.addEventListener('keydown', close);
    window.addEventListener('mousedown', close);
    return () => { window.removeEventListener('keydown', close); window.removeEventListener('mousedown', close); };
  }, [pop]);

  function showTerm(key: string, el: HTMLElement) {
    const sheet = sheetRef.current;
    if (!sheet) return;
    if (pop?.key === key) { setPop(null); return; }
    const r = el.getBoundingClientRect();
    const s = sheet.getBoundingClientRect();
    setPop({ key, top: r.bottom - s.top + 8, left: Math.max(12, Math.min(r.left - s.left, s.width - 332)) });
  }

  function toggle(id: string) {
    setOpen((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });
  }

  function fromReport(id: string) {
    onActivate(id);
    setOpen((s) => (s.has(id) ? s : new Set(s).add(id)));
    const note = marginRef.current?.querySelector<HTMLElement>(`[data-note="${id}"]`);
    note?.scrollIntoView({ behavior: 'smooth', block: wide ? 'nearest' : 'center' });
  }

  function toReport(id: string) {
    onActivate(id);
    const mark = docRef.current?.querySelector<HTMLElement>(`[data-anchor="${id}"]`);
    mark?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const def = pop ? GLOSSARY[pop.key] : null;
  return (
    <div className="doc" ref={docRef}>
      <div className="sheet" ref={sheetRef}>
        <pre className="report" aria-label="Your report, with findings highlighted">
          {pieces.map((p) => {
            const text = analysis.text.slice(p.start, p.end);
            const inner = p.term ? (
              <button type="button" className="term" aria-expanded={pop?.key === p.term}
                onClick={(e) => { e.stopPropagation(); showTerm(p.term!, e.currentTarget); }}>{text}</button>
            ) : text;
            const fns = p.footnotes.map((n) => {
              const id = notes[n - 1].e.findingId ?? notes[n - 1].e.id;
              return <sup key={n} className="fn" onClick={() => fromReport(id)} aria-hidden="true">{n}</sup>;
            });
            if (!p.ids.length) return <span key={p.start}>{inner}{fns}</span>;
            const active = activeId !== null && p.ids.includes(activeId);
            return (
              <span key={p.start}>
                <mark className={active ? 'is-active' : undefined} data-anchor={p.anchorOf ?? undefined}
                  onClick={() => fromReport(p.ids[0])} onMouseEnter={() => onActivate(p.ids[0])}>{inner}</mark>{fns}
              </span>
            );
          })}
        </pre>
        {pop && def && (
          <div className="popover" role="dialog" aria-label={def.term} style={{ top: pop.top, left: pop.left }}>
            <strong>{def.term}</strong>
            {def.def}
            <span className="src">Plain-language summary based on the NCI Dictionary of Cancer Terms.</span>
          </div>
        )}
      </div>

      <div className="margin" ref={marginRef} aria-label="Notes on your report">
        {general.length > 0 && (
          <div className="whole-report">
            {general.map((e) => (
              <div key={e.id} className="note" style={{ position: 'static', marginBottom: 18 }}>
                <p className="label">About the whole report</p>
                <p className="val">{e.value}</p>
                <p className="text">{e.simple}</p>
                {e.tone === 'discuss' && <span className="flagged">Worth asking about</span>}
              </div>
            ))}
          </div>
        )}
        {notes.map(({ e, finding, n }) => {
          const id = e.findingId ?? e.id;
          // Plain mode keeps notes short so each stays level with its highlight; a click opens one fully.
          const expanded = detailed || open.has(id);
          const [lead, ...rest] = e.simple.split(/(?<=\.)\s+/);
          return (
            <article key={id} id={`note-${id}`} data-note={id} className={`note${activeId === id ? ' is-active' : ''}${expanded ? ' is-open' : ''}`}
              onMouseEnter={() => onActivate(id)} aria-labelledby={`nt-${id}`}>
              <button type="button" className="note-head" aria-expanded={expanded} onClick={() => toggle(id)}>
                <span className="num" aria-hidden="true">{n}</span>
                <span className="label" id={`nt-${id}`}><span className="sr-only">Note {n}: </span>{e.title}</span>
                <span className="val">{e.value}</span>
              </button>
              <p className="text">{expanded ? e.simple : lead}{!expanded && rest.length > 0 && <span className="muted"> …</span>}</p>
              {e.tone === 'discuss' && <span className="flagged">Worth asking about</span>}
              {e.tone === 'calm' && <span className="reassure">A reassuring result</span>}
              {expanded && finding && <Visual f={finding} site={analysis.site} />}
              {expanded && <p className="more">{e.detail}</p>}
              {(expanded || !wide) && <div className="actions">
                {!detailed && (
                  <button type="button" className="link-btn" aria-expanded={expanded} onClick={() => toggle(id)}>
                    {expanded ? 'Show less' : 'Read more'}
                  </button>
                )}
                <button type="button" className="link-btn" onClick={() => toReport(id)}>
                  {wide ? 'Find in report' : 'Show in report'}
                </button>
              </div>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
