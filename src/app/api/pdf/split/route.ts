import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

// Helper to parse page range strings, e.g. "1-3,5,8-10" (1-based page numbers)
function parseRanges(rangeStr: string, totalPages: number): number[][] {
  const parts = rangeStr.split(',').map((s) => s.trim()).filter(Boolean);
  const result: number[][] = [];

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => parseInt(s.trim(), 10));
      if (!isNaN(startStr) && !isNaN(endStr)) {
        const start = Math.max(1, Math.min(startStr, totalPages));
        const end = Math.max(start, Math.min(endStr, totalPages));
        const group: number[] = [];
        for (let p = start; p <= end; p++) {
          group.push(p - 1); // 0-based
        }
        if (group.length > 0) result.push(group);
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        result.push([pageNum - 1]); // 0-based
      }
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'single'; // 'single' | 'ranges' | 'fixed'
    const rangesStr = formData.get('ranges') as string | null;
    const intervalStr = formData.get('interval') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do podziału.' },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    if (totalPages === 0) {
      return NextResponse.json(
        { error: 'Przesłany dokument PDF nie zawiera żadnych stron.' },
        { status: 400 }
      );
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');

    // Case 1: Extract specific range into a single PDF if only 1 range requested
    if (mode === 'ranges' && rangesStr) {
      const pageGroups = parseRanges(rangesStr, totalPages);
      if (pageGroups.length === 0) {
        return NextResponse.json(
          { error: 'Podano nieprawidłowy zakres stron.' },
          { status: 400 }
        );
      }

      // If only one range was specified (e.g. "2-4"), return single PDF directly
      if (pageGroups.length === 1) {
        const targetPdf = await PDFDocument.create();
        const copied = await targetPdf.copyPages(sourcePdf, pageGroups[0]);
        for (const p of copied) targetPdf.addPage(p);
        const pdfBytes = await targetPdf.save();

        return new NextResponse(Buffer.from(pdfBytes) as unknown as BodyInit, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${baseName}-zakres.pdf"`,
            'X-Extracted-Pages': String(pageGroups[0].length),
          },
        });
      }

      // If multiple ranges specified, pack each range into a ZIP
      const zip = new JSZip();
      for (let i = 0; i < pageGroups.length; i++) {
        const targetPdf = await PDFDocument.create();
        const copied = await targetPdf.copyPages(sourcePdf, pageGroups[i]);
        for (const p of copied) targetPdf.addPage(p);
        const pdfBytes = await targetPdf.save();
        zip.file(`${baseName}-zakres-${i + 1}.pdf`, pdfBytes);
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      return new NextResponse(Buffer.from(zipBuffer) as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${baseName}-podzielone.zip"`,
        },
      });
    }

    // Case 2: Split every N pages ('fixed')
    if (mode === 'fixed') {
      const interval = Math.max(1, parseInt(intervalStr || '1', 10));
      const zip = new JSZip();
      let partIndex = 1;

      for (let i = 0; i < totalPages; i += interval) {
        const pageIndices: number[] = [];
        for (let j = i; j < Math.min(i + interval, totalPages); j++) {
          pageIndices.push(j);
        }

        const targetPdf = await PDFDocument.create();
        const copied = await targetPdf.copyPages(sourcePdf, pageIndices);
        for (const p of copied) targetPdf.addPage(p);
        const pdfBytes = await targetPdf.save();

        zip.file(`${baseName}-czesc-${partIndex}.pdf`, pdfBytes);
        partIndex++;
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      return new NextResponse(Buffer.from(zipBuffer) as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${baseName}-podzielone.zip"`,
        },
      });
    }

    // Case 3: 'single' mode (every single page to separate PDF in a ZIP)
    const zip = new JSZip();
    for (let i = 0; i < totalPages; i++) {
      const targetPdf = await PDFDocument.create();
      const [copied] = await targetPdf.copyPages(sourcePdf, [i]);
      targetPdf.addPage(copied);
      const pdfBytes = await targetPdf.save();
      const pageFormatted = String(i + 1).padStart(String(totalPages).length, '0');
      zip.file(`${baseName}-strona-${pageFormatted}.pdf`, pdfBytes);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return new NextResponse(Buffer.from(zipBuffer) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${baseName}-strony.zip"`,
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/split:', error);
    return NextResponse.json(
      { error: 'Błąd podczas dzielenia pliku PDF.', details: error.message },
      { status: 500 }
    );
  }
}
