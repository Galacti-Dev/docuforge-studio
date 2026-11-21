import * as pdfjsLib from 'pdfjs-dist';

let isWorkerInitialized = false;

export function initPdfWorker(): typeof pdfjsLib {
  if (typeof window !== 'undefined' && !isWorkerInitialized) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    isWorkerInitialized = true;
  }
  return pdfjsLib;
}
