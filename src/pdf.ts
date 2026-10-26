/**
 * Read the text layer of a PDF in the browser. pdf.js and its worker are bundled with the app
 * and loaded only when someone picks a PDF, so nothing is fetched from another server.
 * Scanned PDFs have no text layer: their pages are drawn to a canvas and read with on-device OCR.
 */
import { ocrImage } from './ocr';

export interface PdfResult {
  text: string;
  usedOcr: boolean;
}

export async function pdfToText(file: File, onProgress: (label: string) => void = () => {}): Promise<PdfResult> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const pages: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let out = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        out += item.str + (item.hasEOL ? '\n' : '');
      }
      pages.push(out.replace(/[ \t]+\n/g, '\n').trim());
    }
    if (pages.join('').trim().length >= 40) return { text: pages.join('\n\n'), usedOcr: false };

    // No text layer: render each page (up to 10) at about 200 dpi and OCR it.
    const ocrPages: string[] = [];
    const count = Math.min(doc.numPages, 10);
    for (let i = 1; i <= count; i++) {
      onProgress(`Reading scanned page ${i} of ${count}...`);
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      await page.render({ canvasContext: ctx, viewport }).promise;
      ocrPages.push(await ocrImage(canvas));
    }
    return { text: ocrPages.join('\n\n'), usedOcr: true };
  } finally {
    await doc.destroy();
  }
}
