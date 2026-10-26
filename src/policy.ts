/**
 * The Content-Security-Policy shipped with the production build. The landing page shows this
 * same list, so what users read is exactly what their browser enforces.
 *
 * connect-src allows one outside address: the public ClinicalTrials.gov API, used only when the
 * person presses "Search" and only with the words they can see. Nothing else can be contacted.
 * 'wasm-unsafe-eval' lets the on-device OCR engine (WebAssembly) run; it does not allow eval().
 */
export const CSP_DIRECTIVES: [string, string][] = [
  ['default-src', "'self'"],
  ['script-src', "'self' 'wasm-unsafe-eval'"],
  ['style-src', "'self' 'unsafe-inline'"],
  ['font-src', "'self'"],
  ['img-src', "'self' data: blob:"],
  ['worker-src', "'self' blob:"],
  ['connect-src', "'self' https://clinicaltrials.gov"],
  ['object-src', "'none'"],
  ['base-uri', "'self'"],
  ['form-action', "'none'"],
];

export const CSP = CSP_DIRECTIVES.map(([k, v]) => `${k} ${v}`).join('; ');
