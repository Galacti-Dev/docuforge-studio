import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import {
  createTempDir,
  cleanupTempDir,
  convertPdfToImages,
  PdfToImagesOptions,
} from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do eksportu obrazów.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Przesłany plik musi mieć rozszerzenie .pdf.' },
        { status: 400 }
      );
    }

    const rawFormat = (formData.get('format') as string || 'png').toLowerCase();
    const format: PdfToImagesOptions['format'] =
      rawFormat === 'jpeg' || rawFormat === 'jpg'
        ? 'jpeg'
        : rawFormat === 'webp'
        ? 'webp'
        : 'png';

    const rawDpi = parseInt(formData.get('dpi') as string || '150', 10);
    const dpi = [72, 150, 300].includes(rawDpi) ? rawDpi : 150;

    const pageRange = formData.get('pageRange') as string || '';
    let firstPage: number | undefined;
    let lastPage: number | undefined;

    if (pageRange && pageRange !== 'all') {
      const match = pageRange.match(/^(\d+)(?:-(\d+))?$/);
      if (match) {
        firstPage = parseInt(match[1], 10);
        lastPage = match[2] ? parseInt(match[2], 10) : firstPage;
      }
    }

    const forceZip = formData.get('zip') === 'true' || formData.get('zipOnly') === 'true';

    tempDir = await createTempDir('pdf2img');
    const inputPath = path.join(tempDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    const imagePaths = await convertPdfToImages(inputPath, tempDir, {
      format,
      dpi,
      firstPage,
      lastPage,
    });

    if (imagePaths.length === 0) {
      return NextResponse.json(
        { error: 'Nie wygenerowano żadnych obrazów z podanego pliku PDF.' },
        { status: 500 }
      );
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const ext = format === 'jpeg' ? 'jpg' : format;

    // If exactly 1 image generated and not forced to ZIP, return the image directly
    if (imagePaths.length === 1 && !forceZip) {
      const imgBuffer = await fs.readFile(imagePaths[0]);
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
      };

      return new NextResponse(imgBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': mimeMap[format] || 'image/png',
          'Content-Disposition': `attachment; filename="${baseName}-strona-1.${ext}"`,
          'X-Image-Count': '1',
        },
      });
    }

    // Multiple images: pack into a ZIP archive
    const zip = new JSZip();
    for (let i = 0; i < imagePaths.length; i++) {
      const imgPath = imagePaths[i];
      const imgBuffer = await fs.readFile(imgPath);
      const fileName = `strona-${i + 1}.${ext}`;
      zip.file(fileName, imgBuffer);
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${baseName}-obrazy.zip"`,
        'X-Image-Count': String(imagePaths.length),
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/convert/pdf-to-images:', error);
    return NextResponse.json(
      { error: 'Błąd podczas konwersji PDF do obrazów.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}