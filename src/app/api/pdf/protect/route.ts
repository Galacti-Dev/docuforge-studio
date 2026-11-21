import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createTempDir, cleanupTempDir, encryptPdf } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do zaszyfrowania.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Przesłany plik musi mieć rozszerzenie .pdf.' },
        { status: 400 }
      );
    }

    const userPassword = (formData.get('userPassword') as string || '').trim();
    const ownerPassword = (formData.get('ownerPassword') as string || '').trim();
    const rawKeyLength = parseInt(formData.get('keyLength') as string || '256', 10);
    const keyLength: 128 | 256 = rawKeyLength === 128 ? 128 : 256;

    if (!userPassword) {
      return NextResponse.json(
        { error: 'Hasło użytkownika (do otwarcia pliku) jest wymagane.' },
        { status: 400 }
      );
    }

    tempDir = await createTempDir('protect');
    const inputPath = path.join(tempDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const outputPath = path.join(tempDir, `${baseName}-protected.pdf`);

    await encryptPdf(inputPath, outputPath, userPassword, ownerPassword, keyLength);

    const pdfBuffer = await fs.readFile(outputPath);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}-zabezpieczony.pdf"`,
        'X-Encrypted': 'true',
        'X-Key-Length': String(keyLength),
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/protect:', error);
    return NextResponse.json(
      { error: 'Błąd podczas szyfrowania dokumentu PDF.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}