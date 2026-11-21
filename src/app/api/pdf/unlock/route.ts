import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createTempDir, cleanupTempDir, decryptPdf } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do odblokowania.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Przesłany plik musi mieć rozszerzenie .pdf.' },
        { status: 400 }
      );
    }

    const password = (formData.get('password') as string || '').trim();
    if (!password) {
      return NextResponse.json(
        { error: 'Podaj hasło do odblokowania pliku PDF.' },
        { status: 400 }
      );
    }

    tempDir = await createTempDir('unlock');
    const inputPath = path.join(tempDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const outputPath = path.join(tempDir, `${baseName}-unlocked.pdf`);

    try {
      await decryptPdf(inputPath, outputPath, password);
    } catch (decryptErr: any) {
      return NextResponse.json(
        { error: 'Nieprawidłowe hasło lub plik nie jest zaszyfrowany.' },
        { status: 400 }
      );
    }

    const pdfBuffer = await fs.readFile(outputPath);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}-odblokowany.pdf"`,
        'X-Decrypted': 'true',
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/unlock:', error);
    return NextResponse.json(
      { error: 'Błąd podczas odblokowywania dokumentu PDF.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}