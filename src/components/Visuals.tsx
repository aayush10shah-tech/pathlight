import type { Finding, Site } from '../engine/types';
import { sizeReference } from '../engine/explain';

/** On-screen zoom for the diagrams; their viewBoxes stay in small, readable units. */
const Z = 1.35;

const C = {
  accent: { fill: 'var(--accent)' },
  soft: { fill: 'var(--accent-soft)' },
  surface2: { fill: 'var(--surface-2)' },
  discuss: { fill: 'var(--discuss)' },
  ink: { fill: 'var(--ink)' },
  ink3: { fill: 'var(--ink-3)' },
  line: { stroke: 'var(--line)' },
};

/** Pick the right picture for a finding, or nothing when a picture would not help. */
export function Visual({ f, site }: { f: Finding; site: Site }) {
  switch (f.kind) {
    case 'tumorSize': return <SizeViz cm={f.cm} />;
    case 'lymphNodes': return f.examined !== null && f.examined > 0 && f.examined <= 60 && f.positive !== null
      ? <NodesViz pos={f.positive} ex={f.examined} /> : null;
    case 'er':
    case 'pr': return f.percent !== null ? (
      <PercentBar pct={f.percent} label={`${f.kind.toUpperCase()} staining`}
        ticks={f.kind === 'er' ? [{ at: 1, label: '1%' }, { at: 10, label: '10%' }] : [{ at: 1, label: '1%' }]}
        caption={f.kind === 'er' ? '1% or more counts as positive; 1-10% is "low positive".' : '1% or more counts as positive.'} />
    ) : null;
    case 'ki67': return (
      <PercentBar pct={f.percent} label="Dividing cells" ticks={[{ at: 5, label: '5%' }, { at: 30, label: '30%' }]}
        caption="5% or less is clearly low and 30% or more clearly high (IKWG, early ER-positive breast cancer)." />
    );
    case 'her2': return <Scale label="HER2 IHC score" active={f.ihc ?? (f.status === 'positive' ? 3 : null)}
      items={[['0', 'HER2 0'], ['1+', 'HER2-low'], ['2+', 'ISH decides'], ['3+', 'Positive']]} />;
    case 'gleason': return f.gradeGroup ? <Scale label="Grade Group" active={f.gradeGroup - 1}
      items={[['1', 'slowest'], ['2', ''], ['3', ''], ['4', ''], ['5', 'fastest']]} /> : null;
    case 'grade': return f.grade ? <Scale label="Grade" active={f.grade - 1}
      items={[['1', 'slow'], ['2', 'medium'], ['3', 'faster']]} /> : null;
    case 'breslow': return <BreslowViz mm={f.mm} />;
    case 'margins': return f.status === 'unknown' && f.closestMm === null ? null : <MarginViz status={f.status} mm={f.closestMm} />;
    case 'tnm': return site === 'colorectal' && f.t ? <ColonWall t={f.t} /> : <TnmTiles t={f.t} n={f.n} m={f.m} prefix={f.prefix} />;
    default: return null;
  }
}

function SizeViz({ cm }: { cm: number }) {
  const [refCm, ref] = sizeReference(cm);
  const scale = Math.min(40, 120 / Math.max(cm, refCm));
  const r1 = Math.max(2.5, (cm * scale) / 2);
  const r2 = Math.max(2.5, (refCm * scale) / 2);
  const h = Math.max(r1, r2) * 2 + 56;
  const cy = Math.max(r1, r2) + 10;
  return (
    <figure className="viz" aria-label={`Tumor about ${cm} centimetres, compared with ${ref}`}>
      <svg viewBox={`0 0 320 ${h}`} width={320 * Z} role="img">
        <circle cx={90} cy={cy} r={r1} style={{ ...C.discuss, opacity: 0.85 }} />
        <circle cx={230} cy={cy} r={r2} style={{ ...C.surface2, stroke: 'var(--ink-3)', strokeDasharray: '4 3' }} />
        <text x={90} y={cy + Math.max(r1, r2) + 22} textAnchor="middle" fontSize="13" style={C.ink}>Tumor: {cm} cm</text>
        <text x={230} y={cy + Math.max(r1, r2) + 22} textAnchor="middle" fontSize="13" style={C.ink}>{ref} ≈ {refCm} cm</text>
        <line x1={20} x2={20 + scale} y1={h - 8} y2={h - 8} style={{ stroke: 'var(--ink-3)', strokeWidth: 2 }} />
        <text x={26 + scale} y={h - 4} fontSize="11" style={C.ink3}>1 cm</text>
      </svg>
      <figcaption className="viz-caption">Drawn to the same scale. Everyday objects are approximate.</figcaption>
    </figure>
  );
}

function NodesViz({ pos, ex }: { pos: number; ex: number }) {
  const perRow = Math.min(ex, 12);
  const rows = Math.ceil(ex / perRow);
  const s = 24;
  return (
    <figure className="viz" aria-label={`${pos} of ${ex} lymph nodes contained cancer`}>
      <svg viewBox={`0 0 ${perRow * s + 4} ${rows * s + 4}`} width={Math.max(160, (perRow * s + 4) * Z)} role="img">
        {Array.from({ length: ex }, (_, i) => (
          <circle key={i} cx={(i % perRow) * s + s / 2 + 2} cy={Math.floor(i / perRow) * s + s / 2 + 2} r={8}
            style={i < pos ? C.discuss : { fill: 'var(--calm-soft)', stroke: 'var(--calm)', strokeWidth: 1.5 }} />
        ))}
      </svg>
      <figcaption className="viz-caption">Each circle is one lymph node examined. {pos > 0 ? 'Filled circles contained cancer.' : 'None contained cancer.'}</figcaption>
    </figure>
  );
}

function PercentBar({ pct, label, ticks, caption }: { pct: number; label: string; ticks: { at: number; label: string }[]; caption: string }) {
  const W = 300;
  const x = (v: number) => 10 + (Math.min(100, Math.max(0, v)) / 100) * (W - 20);
  return (
    <figure className="viz" aria-label={`${label}: ${pct}%`}>
      <svg viewBox={`0 0 ${W} 58`} width={W * Z} role="img">
        <rect x={10} y={18} width={W - 20} height={12} rx={6} style={C.surface2} />
        <rect x={10} y={18} width={Math.max(3, x(pct) - 10)} height={12} rx={6} style={C.accent} />
        {ticks.map((t) => (
          <g key={t.at}>
            <line x1={x(t.at)} x2={x(t.at)} y1={14} y2={34} style={{ stroke: 'var(--ink-3)', strokeWidth: 1.5 }} />
            <text x={x(t.at)} y={48} fontSize="11" textAnchor="middle" style={C.ink3}>{t.label}</text>
          </g>
        ))}
        <text x={10} y={11} fontSize="11" style={C.ink3}>0%</text>
        <text x={W - 10} y={11} fontSize="11" textAnchor="end" style={C.ink3}>100%</text>
      </svg>
      <figcaption className="viz-caption">{caption}</figcaption>
    </figure>
  );
}

function Scale({ label, items, active }: { label: string; items: [string, string][]; active: number | null }) {
  const w = 64;
  const W = items.length * (w + 6);
  return (
    <figure className="viz" aria-label={`${label}: ${active !== null ? items[active][0] : 'not stated'}`}>
      <svg viewBox={`0 0 ${W} 62`} width={W * Z} role="img">
        {items.map(([top, sub], i) => (
          <g key={top}>
            <rect x={i * (w + 6)} y={4} width={w} height={34} rx={8}
              style={i === active ? { ...C.accent } : { ...C.surface2, stroke: 'var(--line)' }} />
            <text x={i * (w + 6) + w / 2} y={26} textAnchor="middle" fontSize="14" fontWeight="700"
              style={i === active ? { fill: 'var(--accent-ink)' } : C.ink}>{top}</text>
            <text x={i * (w + 6) + w / 2} y={54} textAnchor="middle" fontSize="10.5" style={C.ink3}>{sub}</text>
          </g>
        ))}
      </svg>
      <figcaption className="viz-caption">{label}{active !== null ? `: yours is highlighted.` : ': exact score not stated.'}</figcaption>
    </figure>
  );
}

function BreslowViz({ mm }: { mm: number }) {
  const max = Math.max(5, Math.ceil(mm + 0.5));
  const W = 300;
  const x = (v: number) => 10 + (v / max) * (W - 20);
  const steps: [number, string][] = [[0.8, '0.8'], [1, '1'], [2, '2'], [4, '4']];
  return (
    <figure className="viz" aria-label={`Melanoma depth ${mm} millimetres`}>
      <svg viewBox={`0 0 ${W} 64`} width={W * Z} role="img">
        <rect x={10} y={18} width={W - 20} height={12} rx={6} style={C.surface2} />
        <rect x={10} y={18} width={Math.max(3, x(mm) - 10)} height={12} rx={6} style={C.discuss} />
        {steps.filter(([v]) => v <= max).map(([v, l]) => (
          <g key={l}>
            <line x1={x(v)} x2={x(v)} y1={14} y2={34} style={{ stroke: 'var(--ink-3)', strokeWidth: 1.5 }} />
            <text x={x(v)} y={48} fontSize="11" textAnchor="middle" style={C.ink3}>{l} mm</text>
          </g>
        ))}
        <text x={10} y={11} fontSize="11" style={C.ink3}>skin surface</text>
      </svg>
      <figcaption className="viz-caption">T category steps: up to 1.0 mm (T1), 2.0 mm (T2), 4.0 mm (T3), deeper (T4).</figcaption>
    </figure>
  );
}

function MarginViz({ status, mm }: { status: string; mm: number | null }) {
  const touching = status === 'positive';
  const tumorX = touching ? 214 : 150;
  return (
    <figure className="viz" aria-label={touching ? 'Cancer reaches the inked edge' : 'A rim of healthy tissue surrounds the cancer'}>
      <svg viewBox="0 0 300 120" width={300 * Z} role="img">
        <rect x={20} y={10} width={260} height={100} rx={40} style={{ fill: 'var(--calm-soft)', stroke: 'var(--accent)', strokeWidth: 5 }} />
        <circle cx={tumorX} cy={60} r={touching ? 44 : 30} style={{ ...C.discuss, opacity: 0.85 }} />
        <text x={30} y={66} fontSize="11" style={C.ink3}>healthy rim</text>
        {mm !== null && !touching && (
          <g>
            <line x1={180} x2={276} y1={60} y2={60} style={{ stroke: 'var(--ink)', strokeWidth: 1.5, strokeDasharray: '3 3' }} />
            <text x={228} y={52} textAnchor="middle" fontSize="12" style={C.ink}>{mm} mm</text>
          </g>
        )}
      </svg>
      <figcaption className="viz-caption">Not to scale. The thick outline is the inked surgical edge.</figcaption>
    </figure>
  );
}

const WALL: [string, string][] = [
  ['Tis', 'Inner lining (mucosa)'],
  ['T1', 'Submucosa'],
  ['T2', 'Muscle wall (muscularis propria)'],
  ['T3', 'Fat around the bowel'],
  ['T4a', 'Outer lining (visceral peritoneum)'],
  ['T4b', 'Nearby organs'],
];

function ColonWall({ t }: { t: string }) {
  const base = t.startsWith('T4') ? (t === 'T4b' ? 'T4b' : 'T4a') : t.replace(/[a-d]$/, '');
  const depth = WALL.findIndex(([k]) => k === base);
  return (
    <figure className="viz" aria-label={`Depth of growth: ${depth >= 0 ? WALL[depth][1] : t}`}>
      <svg viewBox="0 0 320 200" width={320 * Z} role="img">
        {WALL.map(([k, label], i) => (
          <g key={k}>
            <rect x={0} y={i * 32} width={200} height={30} rx={4}
              style={i <= depth ? { fill: 'var(--discuss-soft)', stroke: 'var(--discuss)' } : { ...C.surface2, stroke: 'var(--line)' }} />
            <text x={10} y={i * 32 + 19} fontSize="12" style={C.ink}>{label}</text>
            <text x={212} y={i * 32 + 19} fontSize="12" fontWeight={i === depth ? 700 : 400} style={i === depth ? C.ink : C.ink3}>
              {k}{i === depth ? '  ← yours' : ''}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="viz-caption">Bowel wall layers from the inside out. Shaded layers show how deep the tumor has grown.</figcaption>
    </figure>
  );
}

function TnmTiles({ t, n, m, prefix }: { t: string | null; n: string | null; m: string | null; prefix: string }) {
  const tiles: [string, string, string | null][] = [['T', 'Main tumor', t], ['N', 'Lymph nodes', n], ['M', 'Distant spread', m]];
  return (
    <figure className="viz" aria-label="TNM categories">
      <svg viewBox="0 0 312 84" width={312 * Z} role="img">
        {tiles.map(([k, label, v], i) => (
          <g key={k}>
            <rect x={i * 104} y={2} width={98} height={78} rx={10} style={v ? { ...C.soft, stroke: 'var(--accent)' } : { ...C.surface2, stroke: 'var(--line)' }} />
            <text x={i * 104 + 49} y={22} textAnchor="middle" fontSize="11" style={C.ink3}>{label}</text>
            <text x={i * 104 + 49} y={54} textAnchor="middle" fontSize={v ? 20 : 13} fontWeight="700" style={v ? C.ink : C.ink3}>
              {v ? (k === 'T' ? prefix + v : v) : 'not given'}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
