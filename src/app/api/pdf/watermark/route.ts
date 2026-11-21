import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { cleanTextForPdf, hexToRgb, parsePageSelection } from '@/lib/server/pdf-effects';
import { createTempDir, cleanupTempDir, runCliCommand, checkCliTool } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do nałożenia znaku wodnego.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Przesłany plik musi mieć rozszerzenie .pdf.' },
        { status: 400 }
      );
    }

    const text = (formData.get('text') as string) || 'POUFNE';
    const fontSize = Math.max(8, Math.min(150, parseInt(formData.get('fontSize') as string, 10) || 48));
    const rawRot = formData.get('rotation');
    const parsedRot = rawRot !== null ? parseInt(rawRot as string, 10) : 45;
    const rotation = isNaN(parsedRot) ? 45 : Math.max(-90, Math.min(90, parsedRot));
    const colorHex = (formData.get('color') as string) || '#ef4444';
    const opacity = Math.max(0.05, Math.min(1.0, parseFloat(formData.get('opacity') as string) || 0.3));
    const position = (formData.get('position') as string) || 'center'; // 'center' | 'tile' | 'header' | 'footer'
    const pagesParam = (formData.get('pages') as string) || 'all';

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const colorRgb = hexToRgb(colorHex);

    const totalPages = pdfDoc.getPageCount();
    const targetPageIndices = parsePageSelection(pagesParam, totalPages);
    const cleanedText = cleanTextForPdf(text);
    const textWidth = font.widthOfTextAtSize(cleanedText, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = (textWidth / 2) * cos - (textHeight / 2) * sin;
    const dy = (textWidth / 2) * sin + (textHeight / 2) * cos;

    for (const pageIdx of targetPageIndices) {
      const page = pdfDoc.getPage(pageIdx);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      if (position === 'tile') {
        const cols = 2;
        const rows = 3;
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const cx = (pageWidth / (cols + 1)) * (c + 1);
            const cy = (pageHeight / (rows + 1)) * (r + 1);
            page.drawText(cleanedText, {
              x: cx - dx,
              y: cy - dy,
              size: fontSize,
              font,
              color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
              opacity,
              rotate: degrees(rotation),
            });
          }
        }
      } else if (position === 'header') {
        const hSize = Math.min(fontSize, 20);
        const hWidth = font.widthOfTextAtSize(cleanedText, hSize);
        page.drawText(cleanedText, {
          x: Math.max(20, (pageWidth - hWidth) / 2),
          y: pageHeight - 35,
          size: hSize,
          font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          opacity,
          rotate: degrees(rotation === 45 ? 0 : rotation),
        });
      } else if (position === 'footer') {
        const fSize = Math.min(fontSize, 20);
        const fWidth = font.widthOfTextAtSize(cleanedText, fSize);
        page.drawText(cleanedText, {
          x: Math.max(20, (pageWidth - fWidth) / 2),
          y: 25,
          size: fSize,
          font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          opacity,
          rotate: degrees(rotation === 45 ? 0 : rotation),
        });
      } else {
        // default: center
        const cx = pageWidth / 2;
        const cy = pageHeight / 2;
        page.drawText(cleanedText, {
          x: cx - dx,
          y: cy - dy,
          size: fontSize,
          font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          opacity,
          rotate: degrees(rotation),
        });
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();

    tempDir = await createTempDir('watermark');
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const tempInput = path.join(tempDir, 'raw-watermarked.pdf');
    const finalOutput = path.join(tempDir, `${baseName}-znak-wodny.pdf`);

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
        'Content-Disposition': `attachment; filename="${baseName}-znak-wodny.pdf"`,
        'X-Watermarked': 'true',
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/watermark:', error);
    return NextResponse.json(
      { error: 'Błąd podczas nakładania znaku wodnego.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
