import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, PDFName, rgb, degrees } from 'pdf-lib';
import {
  createTempDir,
  cleanupTempDir,
  compressPdfWithGs,
  convertDocxToPdf,
  runCliCommand,
  checkCliTool,
} from '@/lib/server/cli-tools';
import { cleanTextForPdf, hexToRgb } from '@/lib/server/pdf-effects';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const action = (formData.get('action') as string) || 'compress';
    const watermarkText = (formData.get('watermarkText') as string) || 'POUFNE';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Nie przesłano żadnych plików do kolejki wsadowej.' },
        { status: 400 }
      );
    }

    if (files.length > 20) {
      return NextResponse.json(
        { error: 'Maksymalna liczba plików w jednym zadaniu wsadowym to 20.' },
        { status: 400 }
      );
    }

    tempDir = await createTempDir('batch');
    const zip = new JSZip();
    let successCount = 0;
    let errorCount = 0;
    const results: Array<{ name: string; success: boolean; outName?: string; error?: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const rawName = file.name;
      const baseName = rawName.replace(/\.[^/.]+$/, '');
      const ext = path.extname(rawName).toLowerCase();

      try {
        const arrayBuf = await file.arrayBuffer();
        const inputBuf = Buffer.from(arrayBuf);
        const inputPath = path.join(tempDir, `in_${i}_${rawName}`);
        await fs.writeFile(inputPath, inputBuf);

        let outBuffer: Buffer | Uint8Array;
        let outFileName: string;

        if (action === 'compress') {
          if (ext === '.pdf') {
            const outPath = path.join(tempDir, `out_${i}_${baseName}-compressed.pdf`);
            await compressPdfWithGs(inputPath, outPath, 'balanced', true);
            outBuffer = await fs.readFile(outPath);
            outFileName = `${baseName}-skompresowany.pdf`;
          } else {
            outBuffer = inputBuf;
            outFileName = rawName;
          }
        } else if (action === 'docx-to-pdf') {
          if (ext === '.docx') {
            const convertedPdfPath = await convertDocxToPdf(inputPath, tempDir);
            outBuffer = await fs.readFile(convertedPdfPath);
            outFileName = `${baseName}.pdf`;
          } else {
            outBuffer = inputBuf;
            outFileName = rawName;
          }
        } else if (action === 'watermark') {
          if (ext === '.pdf') {
            const pdfDoc = await PDFDocument.load(inputBuf, { ignoreEncryption: true });
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const colorRgb = hexToRgb('#ef4444');
            const cleanedText = cleanTextForPdf(watermarkText);
            const fontSize = 42;
            const textWidth = font.widthOfTextAtSize(cleanedText, fontSize);
            const textHeight = font.heightAtSize(fontSize);
            const rad = (45 * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const dx = (textWidth / 2) * cos - (textHeight / 2) * sin;
            const dy = (textWidth / 2) * sin + (textHeight / 2) * cos;

            const pages = pdfDoc.getPages();
            for (const page of pages) {
              const { width, height } = page.getSize();
              page.drawText(cleanedText, {
                x: width / 2 - dx,
                y: height / 2 - dy,
                size: fontSize,
                font,
                color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
                opacity: 0.3,
                rotate: degrees(45),
              });
            }
            outBuffer = await pdfDoc.save();
            outFileName = `${baseName}-znak-wodny.pdf`;
          } else {
            outBuffer = inputBuf;
            outFileName = rawName;
          }
        } else if (action === 'sanitize') {
          if (ext === '.pdf') {
            const pdfDoc = await PDFDocument.load(inputBuf, { ignoreEncryption: true });
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setKeywords([]);
            pdfDoc.setProducer('Sanitized');
            pdfDoc.setCreator('Sanitized');

            const catalog = pdfDoc.catalog;
            catalog.delete(PDFName.of('Metadata'));
            catalog.delete(PDFName.of('PieceInfo'));
            catalog.delete(PDFName.of('Names'));
            catalog.delete(PDFName.of('OpenAction'));
            catalog.delete(PDFName.of('AA'));

            for (const p of pdfDoc.getPages()) {
              p.node.delete(PDFName.of('Annots'));
              p.node.delete(PDFName.of('PieceInfo'));
              p.node.delete(PDFName.of('AA'));
            }

            const rawSanitized = await pdfDoc.save();
            const qpdfCheck = await checkCliTool('qpdf');
            if (qpdfCheck.available) {
              const sanitizeInPath = path.join(tempDir, `san_in_${i}.pdf`);
              const sanitizeOutPath = path.join(tempDir, `san_out_${i}.pdf`);
              await fs.writeFile(sanitizeInPath, Buffer.from(rawSanitized));
              await runCliCommand('qpdf', ['--linearize', sanitizeInPath, sanitizeOutPath]);
              outBuffer = await fs.readFile(sanitizeOutPath);
            } else {
              outBuffer = Buffer.from(rawSanitized);
            }
            outFileName = `${baseName}-oczyszczony.pdf`;
          } else {
            outBuffer = inputBuf;
            outFileName = rawName;
          }
        } else {
          outBuffer = inputBuf;
          outFileName = rawName;
        }

        zip.file(outFileName, outBuffer);
        successCount++;
        results.push({ name: rawName, success: true, outName: outFileName });
      } catch (fileErr: any) {
        console.error(`Błąd przetwarzania pliku ${rawName}:`, fileErr);
        errorCount++;
        results.push({ name: rawName, success: false, error: fileErr.message });
      }
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="docuforge-batch-${action}.zip"`,
        'X-Total-Files': String(files.length),
        'X-Success-Count': String(successCount),
        'X-Error-Count': String(errorCount),
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/batch/process:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas przetwarzania wsadowego.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
