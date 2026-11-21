import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createTempDir, cleanupTempDir, convertDocxToPdf } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku DOCX do konwersji.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Przesłany plik musi mieć rozszerzenie .docx.' },
        { status: 400 }
      );
    }

    tempDir = await createTempDir('docx2pdf');
    const inputPath = path.join(tempDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    const outputPdfPath = await convertDocxToPdf(inputPath, tempDir);
    const pdfBuffer = await fs.readFile(outputPdfPath);

    const baseName = file.name.replace(/\.[^/.]+$/, '');

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/convert/docx-to-pdf:', error);
    return NextResponse.json(
      { error: 'Błąd podczas konwersji DOCX do PDF.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
