import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, PDFName } from 'pdf-lib';
import { createTempDir, cleanupTempDir, runCliCommand, checkCliTool } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do sanityzacji.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Przesłany plik musi mieć rozszerzenie .pdf.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    // 1. Wipe DocumentInfo fields
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('Sanitized');
    pdfDoc.setCreator('Sanitized');

    // 2. Wipe catalog-level metadata and tracking streams
    const catalog = pdfDoc.catalog;
    catalog.delete(PDFName.of('Metadata'));
    catalog.delete(PDFName.of('PieceInfo'));
    catalog.delete(PDFName.of('Names'));
    catalog.delete(PDFName.of('OpenAction'));
    catalog.delete(PDFName.of('AA'));

    // 3. Wipe page-level annotations, links and scripts
    const pages = pdfDoc.getPages();
    for (const p of pages) {
      p.node.delete(PDFName.of('Annots'));
      p.node.delete(PDFName.of('PieceInfo'));
      p.node.delete(PDFName.of('AA'));
    }

    const sanitizedBytes = await pdfDoc.save();

    tempDir = await createTempDir('sanitize');
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const tempInput = path.join(tempDir, 'raw-sanitized.pdf');
    const finalOutput = path.join(tempDir, `${baseName}-oczyszczony.pdf`);

    await fs.writeFile(tempInput, sanitizedBytes);

    // 4. Standardize and linearize with qpdf
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
        'Content-Disposition': `attachment; filename="${baseName}-oczyszczony.pdf"`,
        'X-Sanitized': 'true',
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/sanitize:', error);
    return NextResponse.json(
      { error: 'Błąd podczas sanityzacji dokumentu PDF.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}