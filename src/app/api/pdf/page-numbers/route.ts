import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { cleanTextForPdf, hexToRgb } from '@/lib/server/pdf-effects';
import { createTempDir, cleanupTempDir, runCliCommand, checkCliTool } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do numeracji stron.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Przesłany plik musi mieć rozszerzenie .pdf.' },
        { status: 400 }
      );
    }

    const format = (formData.get('format') as string) || 'Strona {n} z {total}';
    const position = (formData.get('position') as string) || 'bottom-center';
    const margin = Math.max(10, Math.min(100, parseInt(formData.get('margin') as string, 10) || 30));
    const startNumber = Math.max(1, parseInt(formData.get('startNumber') as string, 10) || 1);
    const fontSize = Math.max(6, Math.min(24, parseInt(formData.get('fontSize') as string, 10) || 10));
    const colorHex = (formData.get('color') as string) || '#333333';
    const skipFirstPage = formData.get('skipFirstPage') === 'true' || formData.get('skipFirstPage') === '1';

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const colorRgb = hexToRgb(colorHex);

    const totalPages = pdfDoc.getPageCount();

    for (let i = 0; i < totalPages; i++) {
      if (i === 0 && skipFirstPage) {
        continue;
      }

      const page = pdfDoc.getPage(i);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const pageNum = startNumber + i;
      const label = format
        .replace(/\{n\}/g, String(pageNum))
        .replace(/\{total\}/g, String(totalPages));
      const cleanLabel = cleanTextForPdf(label);

      const textWidth = font.widthOfTextAtSize(cleanLabel, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      let x = margin;
      let y = margin;

      switch (position) {
        case 'bottom-left':
          x = margin;
          y = margin;
          break;
        case 'bottom-center':
          x = (pageWidth - textWidth) / 2;
          y = margin;
          break;
        case 'bottom-right':
          x = pageWidth - margin - textWidth;
          y = margin;
          break;
        case 'top-left':
          x = margin;
          y = pageHeight - margin - textHeight;
          break;
        case 'top-center':
          x = (pageWidth - textWidth) / 2;
          y = pageHeight - margin - textHeight;
          break;
        case 'top-right':
          x = pageWidth - margin - textWidth;
          y = pageHeight - margin - textHeight;
          break;
        default:
          x = (pageWidth - textWidth) / 2;
          y = margin;
      }

      page.drawText(cleanLabel, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
      });
    }

    const modifiedPdfBytes = await pdfDoc.save();

    tempDir = await createTempDir('page-numbers');
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const tempInput = path.join(tempDir, 'raw-numbered.pdf');
    const finalOutput = path.join(tempDir, `${baseName}-ponumerowany.pdf`);

    await fs.writeFile(tempInput, modifiedPdfBytes);

    // Linearize via qpdf if available
    const qpdf = await checkCliTool('qpdf');
    if (qpdf.available && qpdf.path) {
      try {
        await runCliCommand(qpdf.path, ['--linearize', tempInput, finalOutput]);
      } catch {
        await fs.rename(tempInput, finalOutput);
      }
    } else {
      await fs.rename(tempInput, finalOutput);
    }

    const resultBuffer = await fs.readFile(finalOutput);

    return new NextResponse(resultBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}-ponumerowany.pdf"`,
        'X-Page-Numbered': 'true',
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/page-numbers:', error);
    return NextResponse.json(
      { error: 'Błąd podczas dodawania numeracji stron.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
