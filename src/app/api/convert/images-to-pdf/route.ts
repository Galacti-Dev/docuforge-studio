import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { createTempDir, cleanupTempDir, convertImageToPng } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const files = (formData.getAll('files') as File[]).concat(
      formData.getAll('images') as File[]
    );

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Nie przesłano plików graficznych do utworzenia PDF.' },
        { status: 400 }
      );
    }

    const pageSize = (formData.get('pageSize') as string || 'A4').toUpperCase();
    const orientation = (formData.get('orientation') as string || 'auto').toLowerCase();
    const margin = (formData.get('margin') as string || 'none').toLowerCase();

    // Calculate margins in points (1 mm = 2.83465 pt)
    let marginPt = 0;
    if (margin === 'small') {
      marginPt = 28.35; // 10 mm
    } else if (margin === 'normal') {
      marginPt = 56.7; // 20 mm
    }

    tempDir = await createTempDir('img2pdf');
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileNameLower = file.name.toLowerCase();

      let embeddedImg: any = null;

      if (fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg')) {
        embeddedImg = await pdfDoc.embedJpg(buffer);
      } else if (fileNameLower.endsWith('.png')) {
        embeddedImg = await pdfDoc.embedPng(buffer);
      } else {
        // Format WebP or others: convert to PNG using ffmpeg
        const tempInput = path.join(tempDir, `input-${i}-${file.name}`);
        const tempPng = path.join(tempDir, `output-${i}.png`);
        await fs.writeFile(tempInput, buffer);
        await convertImageToPng(tempInput, tempPng);
        const pngBuf = await fs.readFile(tempPng);
        embeddedImg = await pdfDoc.embedPng(pngBuf);
      }

      const imgW = embeddedImg.width;
      const imgH = embeddedImg.height;

      let pageW: number;
      let pageH: number;
      let drawX: number;
      let drawY: number;
      let drawW: number;
      let drawH: number;

      if (pageSize === 'FIT') {
        pageW = imgW + marginPt * 2;
        pageH = imgH + marginPt * 2;
        drawX = marginPt;
        drawY = marginPt;
        drawW = imgW;
        drawH = imgH;
      } else {
        // Base dimensions (A4 or LETTER)
        const baseW = pageSize === 'LETTER' ? 612.0 : 595.28;
        const baseH = pageSize === 'LETTER' ? 792.0 : 841.89;

        if (orientation === 'landscape') {
          pageW = Math.max(baseW, baseH);
          pageH = Math.min(baseW, baseH);
        } else if (orientation === 'portrait') {
          pageW = Math.min(baseW, baseH);
          pageH = Math.max(baseW, baseH);
        } else {
          // Auto orientation: match image aspect ratio
          if (imgW > imgH) {
            pageW = Math.max(baseW, baseH);
            pageH = Math.min(baseW, baseH);
          } else {
            pageW = Math.min(baseW, baseH);
            pageH = Math.max(baseW, baseH);
          }
        }

        const availW = Math.max(10, pageW - marginPt * 2);
        const availH = Math.max(10, pageH - marginPt * 2);

        const scale = Math.min(availW / imgW, availH / imgH);
        drawW = imgW * scale;
        drawH = imgH * scale;
        drawX = marginPt + (availW - drawW) / 2;
        drawY = marginPt + (availH - drawH) / 2;
      }

      const page = pdfDoc.addPage([pageW, pageH]);
      page.drawImage(embeddedImg, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
      });
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="obrazy-dokument.pdf"',
        'X-Page-Count': String(files.length),
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/convert/images-to-pdf:', error);
    return NextResponse.json(
      { error: 'Błąd podczas tworzenia PDF z obrazów.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}