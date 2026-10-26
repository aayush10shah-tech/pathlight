/**
 * On-device OCR for photos and scanned PDFs, using tesseract.js (WebAssembly). The engine and the
 * English model are served from this site's own /ocr folder, so the image never leaves the device.
 */
import type { Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;
let progressHandler: (p: number) => void = () => {};
/** Errors raised inside the worker are routed to the job that is running, instead of being thrown globally. */
let failCurrent: ((err: Error) => void) | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const base = new URL('./ocr/', document.baseURI).href;
      return createWorker('eng', 1, {
        workerPath: `${base}worker.min.js`,
        corePath: base,
        langPath: base,
        gzip: true,
        workerBlobURL: false,
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') progressHandler(m.progress);
        },
        errorHandler: (err: unknown) => failCurrent?.(err instanceof Error ? err : new Error(String(err))),
      });
    })();
    workerPromise.catch(() => { workerPromise = null; });
  }
  return workerPromise;
}

/** Recognise the text in one image (a File, or a canvas rendered from a scanned PDF page). */
export async function ocrImage(image: File | HTMLCanvasElement, onProgress: (p: number) => void = () => {}): Promise<string> {
  // Check that the browser can decode the file at all before handing it to the OCR engine.
  if (image instanceof File) {
    const bitmap = await createImageBitmap(image).catch(() => null);
    if (!bitmap) throw new Error('This file is not an image the browser can open.');
    bitmap.close();
  }
  progressHandler = onProgress;
  const worker = await getWorker();
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => { failCurrent = null; reject(new Error('Reading the image took too long.')); }, 120_000);
    failCurrent = (err) => { clearTimeout(timer); failCurrent = null; reject(err); };
    worker.recognize(image).then(
      ({ data }) => { clearTimeout(timer); failCurrent = null; resolve(data.text); },
      (err: unknown) => { clearTimeout(timer); failCurrent = null; reject(err instanceof Error ? err : new Error(String(err))); },
    );
  });
}
