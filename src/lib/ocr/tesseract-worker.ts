import fs from 'node:fs/promises';
import path from 'node:path';
import { createWorker } from 'tesseract.js';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { cleanTextForPdf } from '@/lib/server/pdf-effects';
import { runCliCommand, checkCliTool } from '@/lib/server/cli-tools';

export interface OcrResult {
  text: string;
  confidence: number;
  pageCount: number;
  wordCount: number;
  charCount: number;
}

/**
 * Rozpoznaje tekst z obrazu za pomocą lokalnego silnika Tesseract.js.
 */
export async function performOcr(
  imageBuffer: Buffer,
  language: string = 'pol+eng'
): Promise<{ text: string; confidence: number }> {
  const lang = language === 'pol' ? 'pol' : language === 'eng' ? 'eng' : 'pol+eng';
  const workerPath = path.join(process.cwd(), 'node_modules/tesseract.js/src/worker-script/node/index.js');
  const worker = await createWorker(lang, 1, {
    workerPath,
  });
  try {
    const ret = await worker.recognize(imageBuffer);
    return {
      text: ret.data.text || '',
      confidence: Math.round(ret.data.confidence || 0),
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Konwertuje strony PDF na obrazy PNG za pomocą pdftoppm.
 */
export async function extractPdfPagesToPng(
  pdfBuffer: Buffer,
  tempDir: string,
  pageRange?: string
): Promise<string[]> {
  const inputPdfPath = path.join(tempDir, 'input-ocr.pdf');
  await fs.writeFile(inputPdfPath, pdfBuffer);

  const pdftoppm = await checkCliTool('pdftoppm');
  if (!pdftoppm.available || !pdftoppm.path) {
    throw new Error('Narzędzie pdftoppm jest niedostępne na serwerze.');
  }

  const prefix = path.join(tempDir, 'page');
  const args = ['-png', '-r', '200'];

  if (pageRange && pageRange.trim() !== 'all') {
    const match = pageRange.match(/^(\d+)(?:-(\d+))?$/);
    if (match) {
      const first = match[1];
      const last = match[2] || match[1];
      args.push('-f', first, '-l', last);
    }
  }

  args.push(inputPdfPath, prefix);
  await runCliCommand(pdftoppm.path, args);

  const files = await fs.readdir(tempDir);
  const pngFiles = files
    .filter((f) => f.startsWith('page-') && f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    })
    .map((f) => path.join(tempDir, f));

  return pngFiles;
}

/**
 * Generuje dokument DOCX na podstawie tekstu z OCR.
 */
export async function generateDocxFromText(text: string): Promise<Buffer> {
  const paragraphs = text.split('\n').map((line) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: line,
          font: 'Calibri',
          size: 22, // 11 pt
        }),
      ],
      spacing: { after: 120 },
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [new TextRun('')] })],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Generuje dokument PDF na podstawie tekstu z OCR.
 */
export async function generatePdfFromText(text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const lineHeight = 14;
  const margin = 50;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxLineWidth = pageWidth - 2 * margin;

  const rawLines = text.split('\n');
  const wrappedLines: string[] = [];

  for (const rawLine of rawLines) {
    if (!rawLine.trim()) {
      wrappedLines.push('');
      continue;
    }
    const words = rawLine.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const cleanTest = cleanTextForPdf(testLine);
      const textWidth = font.widthOfTextAtSize(cleanTest, fontSize);
      if (textWidth <= maxLineWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) wrappedLines.push(cleanTextForPdf(currentLine));
        currentLine = word;
      }
    }
    if (currentLine) {
      wrappedLines.push(cleanTextForPdf(currentLine));
    }
  }

  const linesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);
  const totalPages = Math.max(1, Math.ceil(wrappedLines.length / linesPerPage));

  for (let p = 0; p < totalPages; p++) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const pageLines = wrappedLines.slice(p * linesPerPage, (p + 1) * linesPerPage);
    for (let j = 0; j < pageLines.length; j++) {
      const line = pageLines[j];
      if (line) {
        page.drawText(line, {
          x: margin,
          y: pageHeight - margin - j * lineHeight,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
