import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Nie przesłano żadnych plików PDF do połączenia.' },
        { status: 400 }
      );
    }

    if (files.length === 1) {
      // If only 1 file is sent, return it directly or copy
      const buffer = await files[0].arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="merged.pdf"',
        },
      });
    }

    // Optional ordering JSON: number[] or { fileIndex: number }[]
    const orderStr = formData.get('order') as string | null;
    let orderedFiles = files;
    if (orderStr) {
      try {
        const order = JSON.parse(orderStr);
        if (Array.isArray(order)) {
          if (typeof order[0] === 'number') {
            orderedFiles = order.map((idx: number) => files[idx]).filter(Boolean);
          } else if (order[0]?.fileIndex !== undefined) {
            orderedFiles = order.map((item: { fileIndex: number }) => files[item.fileIndex]).filter(Boolean);
          }
        }
      } catch {
        // Use default order
      }
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of orderedFiles) {
      const fileBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    }

    const mergedPdfBytes = await mergedPdf.save();

    return new NextResponse(Buffer.from(mergedPdfBytes) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="merged.pdf"',
        'X-Merged-Count': String(orderedFiles.length),
        'X-Total-Pages': String(mergedPdf.getPageCount()),
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/merge:', error);
    return NextResponse.json(
      { error: 'Błąd podczas scalania plików PDF.', details: error.message },
      { status: 500 }
    );
  }
}
