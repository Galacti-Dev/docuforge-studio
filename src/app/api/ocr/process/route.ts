import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  performOcr,
  extractPdfPagesToPng,
  generateDocxFromText,
  generatePdfFromText,
} from '@/lib/ocr/tesseract-worker';
import { createTempDir, cleanupTempDir } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku do rozpoznawania OCR.' },
        { status: 400 }
      );
    }

    const language = (formData.get('language') as string) || 'pol+eng';
    const outputFormat = (formData.get('outputFormat') as string) || 'txt';
    const pages = (formData.get('pages') as string) || 'all';
    const isDownload = formData.get('download') === 'true';

    tempDir = await createTempDir('ocr');
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();

    let fullText = '';
    let totalConfidence = 0;
    let pageCount = 1;

    if (lowerName.endsWith('.pdf')) {
      // 1. Convert PDF pages to PNG images
      const pageImages = await extractPdfPagesToPng(fileBuffer, tempDir, pages);
      pageCount = pageImages.length;
      if (pageCount === 0) {
        throw new Error('Nie udało się wyekstrahować stron z pliku PDF.');
      }

      const pageTexts: string[] = [];
      for (let i = 0; i < pageImages.length; i++) {
        const imgBuf = await fs.readFile(pageImages[i]);
        const ocr = await performOcr(imgBuf, language);
        totalConfidence += ocr.confidence;
        pageTexts.push(ocr.text);
      }
      fullText = pageTexts.join('\n\n--- [Strona ' + (pageTexts.length > 1 ? '' : '1') + '] ---\n\n');
    } else {
      // 2. Direct Image (PNG, JPG, WebP)
      const ocr = await performOcr(fileBuffer, language);
      fullText = ocr.text;
      totalConfidence = ocr.confidence;
    }

    const avgConfidence = pageCount > 0 ? Math.round(totalConfidence / pageCount) : 0;
    const wordsCount = fullText.trim().split(/\s+/).filter(Boolean).length;
    const charsCount = fullText.length;
    const baseName = fileName.replace(/\.[^/.]+$/, '');

    // If download requested
    if (isDownload) {
      if (outputFormat === 'docx') {
        const docxBuffer = await generateDocxFromText(fullText);
        return new NextResponse(docxBuffer as unknown as BodyInit, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${baseName}-ocr.docx"`,
            'X-OCR-Confidence': avgConfidence.toString(),
            'X-OCR-Words': wordsCount.toString(),
          },
        });
      }

      if (outputFormat === 'pdf') {
        const pdfBuffer = await generatePdfFromText(fullText);
        return new NextResponse(pdfBuffer as unknown as BodyInit, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${baseName}-ocr.pdf"`,
            'X-OCR-Confidence': avgConfidence.toString(),
            'X-OCR-Words': wordsCount.toString(),
          },
        });
      }

      // Default TXT
      return new NextResponse(fullText, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseName}-ocr.txt"`,
          'X-OCR-Confidence': avgConfidence.toString(),
          'X-OCR-Words': wordsCount.toString(),
        },
      });
    }

    // Default JSON response for UI
    return NextResponse.json({
      text: fullText,
      confidence: avgConfidence,
      pageCount,
      wordCount: wordsCount,
      charCount: charsCount,
      language,
      fileName,
    });
  } catch (error: any) {
    console.error('Błąd w /api/ocr/process:', error);
    return NextResponse.json(
      { error: 'Błąd podczas przetwarzania OCR.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
