import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createTempDir, cleanupTempDir, compressPdfWithGs } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do kompresji.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Przesłany plik musi mieć rozszerzenie .pdf.' },
        { status: 400 }
      );
    }

    const rawLevel = (formData.get('level') as string || 'balanced').toLowerCase();
    const level: 'low' | 'balanced' | 'extreme' =
      rawLevel === 'low' || rawLevel === 'extreme' ? rawLevel : 'balanced';

    const linearize = formData.get('linearize') !== 'false';

    tempDir = await createTempDir('compress');
    const inputPath = path.join(tempDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const outputPath = path.join(tempDir, `${baseName}-compressed.pdf`);

    const { originalSize, compressedSize, reductionPercent } = await compressPdfWithGs(
      inputPath,
      outputPath,
      level,
      linearize
    );

    const pdfBuffer = await fs.readFile(outputPath);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}-skompresowany.pdf"`,
        'X-Original-Size': String(originalSize),
        'X-Compressed-Size': String(compressedSize),
        'X-Reduction-Percent': String(reductionPercent),
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/compress:', error);
    return NextResponse.json(
      { error: 'Błąd podczas kompresji pliku PDF.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}