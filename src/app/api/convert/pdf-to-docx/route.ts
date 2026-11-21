import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createTempDir, cleanupTempDir, runCliCommand, checkCliTool } from '@/lib/server/cli-tools';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do konwersji.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Przesłany plik musi mieć rozszerzenie .pdf.' },
        { status: 400 }
      );
    }

    tempDir = await createTempDir('pdf2docx');
    const inputPath = path.join(tempDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const expectedDocxPath = path.join(tempDir, `${baseName}.docx`);

    // Method 1: Try LibreOffice with PDF import filter
    let success = false;
    const soffice = await checkCliTool('soffice');
    if (soffice.available && soffice.path) {
      try {
        await runCliCommand(soffice.path, [
          '--headless',
          '--infilter=writer_pdf_import',
          '--convert-to',
          'docx',
          '--outdir',
          tempDir,
          inputPath,
        ], 30000);

        await fs.access(expectedDocxPath, fs.constants.R_OK);
        success = true;
      } catch (cliErr) {
        console.warn('Konwersja LibreOffice PDF->DOCX nie powiodła się, uruchamiam fallback pure TS:', cliErr);
      }
    }

    // Method 2: Fallback in pure JS/TS using pdftotext / text extraction and docx library
    if (!success) {
      let rawText = '';
      try {
        const { stdout } = await runCliCommand('/usr/bin/pdftotext', ['-layout', inputPath, '-']);
        rawText = stdout;
      } catch {
        rawText = 'Dokument przekonwertowany z pliku PDF: ' + file.name;
      }

      const paragraphs = rawText
        .split('\n\n')
        .map((p) => p.trim())
        .filter(Boolean);

      const docChildren: Paragraph[] = [
        new Paragraph({
          text: baseName,
          heading: HeadingLevel.TITLE,
        }),
      ];

      for (const p of paragraphs) {
        if (p.length < 60 && (p.startsWith('Rozdział') || p.startsWith('Rozdzial') || p.includes(':'))) {
          docChildren.push(
            new Paragraph({
              text: p,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            })
          );
        } else {
          docChildren.push(
            new Paragraph({
              children: [new TextRun(p)],
              spacing: { after: 150 },
            })
          );
        }
      }

      const doc = new Document({
        sections: [{ properties: {}, children: docChildren }],
      });

      const docxBuffer = await Packer.toBuffer(doc);
      await fs.writeFile(expectedDocxPath, docxBuffer);
    }

    const resultBuffer = await fs.readFile(expectedDocxPath);

    return new NextResponse(resultBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${baseName}.docx"`,
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/convert/pdf-to-docx:', error);
    return NextResponse.json(
      { error: 'Błąd podczas konwersji PDF do DOCX.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
