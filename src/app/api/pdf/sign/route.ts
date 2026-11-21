import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { createTempDir, cleanupTempDir, runCliCommand, checkCliTool } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do podpisania.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Przesłany plik musi mieć rozszerzenie .pdf.' },
        { status: 400 }
      );
    }

    const pageNumber = Math.max(1, parseInt(formData.get('pageNumber') as string, 10) || 1);
    const signatureImageParam = formData.get('signatureImage');
    const x = parseFloat(formData.get('x') as string) || 400;
    const y = parseFloat(formData.get('y') as string) || 50;
    const width = Math.max(10, parseFloat(formData.get('width') as string) || 140);
    const height = Math.max(10, parseFloat(formData.get('height') as string) || 55);

    if (!signatureImageParam) {
      return NextResponse.json(
        { error: 'Brak obrazu podpisu (wymagany parametr signatureImage jako base64 lub plik graficzny).' },
        { status: 400 }
      );
    }

    let imageBytes: Buffer;
    let isPng = true;

    if (typeof signatureImageParam === 'string') {
      const match = signatureImageParam.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
      if (match) {
        isPng = match[1].toLowerCase() === 'png';
        imageBytes = Buffer.from(match[2], 'base64');
      } else {
        const base64Data = signatureImageParam.replace(/^data:image\/[^;]+;base64,/, '');
        imageBytes = Buffer.from(base64Data, 'base64');
        isPng = imageBytes.length > 4 && imageBytes[0] === 0x89 && imageBytes[1] === 0x50;
      }
    } else {
      // File object
      const imgFile = signatureImageParam as File;
      const arrBuf = await imgFile.arrayBuffer();
      imageBytes = Buffer.from(arrBuf);
      isPng = imgFile.type.includes('png') || (imageBytes.length > 4 && imageBytes[0] === 0x89 && imageBytes[1] === 0x50);
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    let embeddedImage;
    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    }

    const pageCount = pdfDoc.getPageCount();
    const targetIndex = Math.max(0, Math.min(pageNumber - 1, pageCount - 1));
    const targetPage = pdfDoc.getPage(targetIndex);

    targetPage.drawImage(embeddedImage, {
      x,
      y,
      width,
      height,
    });

    const modifiedPdfBytes = await pdfDoc.save();

    tempDir = await createTempDir('sign');
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const tempInput = path.join(tempDir, 'raw-signed.pdf');
    const finalOutput = path.join(tempDir, `${baseName}-podpisany.pdf`);

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
        'Content-Disposition': `attachment; filename="${baseName}-podpisany.pdf"`,
        'X-Signed': 'true',
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/sign:', error);
    return NextResponse.json(
      { error: 'Błąd podczas podpisywania dokumentu PDF.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
