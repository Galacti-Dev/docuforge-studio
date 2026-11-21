import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import { createTempDir, cleanupTempDir, runCliCommand } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku do ekstrakcji tekstu.' },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    let text = '';

    if (ext === '.docx') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
    } else if (ext === '.pdf') {
      tempDir = await createTempDir('pdf2txt');
      const inputPath = path.join(tempDir, file.name);
      await fs.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

      const { stdout } = await runCliCommand('/usr/bin/pdftotext', ['-layout', inputPath, '-']);
      text = stdout;
    } else {
      return NextResponse.json(
        { error: `Nieobsługiwany format (${ext}). Prześlij plik .docx lub .pdf.` },
        { status: 400 }
      );
    }

    return new NextResponse(Buffer.from(text, 'utf-8') as unknown as BodyInit, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}.txt"`,
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/convert/to-txt:', error);
    return NextResponse.json(
      { error: 'Błąd podczas ekstrakcji tekstu TXT.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
