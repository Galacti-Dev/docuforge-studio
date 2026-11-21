export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface DiffResult {
  fileAName: string;
  fileBName: string;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  similarityPercent: number;
  diffParts: Array<{
    value: string;
    added?: boolean;
    removed?: boolean;
  }>;
}

export interface OcrResult {
  text: string;
  confidence: number;
  language: string;
  lines: Array<{
    text: string;
    confidence: number;
    bbox?: { x0: number; y0: number; x1: number; y1: number };
  }>;
}

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount: number;
}
