import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, degrees } from 'pdf-lib';
import { PageAction } from '@/types/document';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const actionsStr = formData.get('actions') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do reorganizacji.' },
        { status: 400 }
      );
    }

    if (!actionsStr) {
      return NextResponse.json(
        { error: 'Brak zdefiniowanych akcji reorganizacji stron.' },
        { status: 400 }
      );
    }

    let actions: PageAction[];
    try {
      actions = JSON.parse(actionsStr);
      if (!Array.isArray(actions)) throw new Error();
    } catch {
      return NextResponse.json(
        { error: 'Nieprawidłowy format parametru actions (oczekiwana tablica JSON).' },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    const targetPdf = await PDFDocument.create();

    const totalPages = sourcePdf.getPageCount();

    for (const action of actions) {
      if (action.delete) {
        continue; // Skip deleted page
      }

      if (action.originalIndex < 0 || action.originalIndex >= totalPages) {
        continue; // Invalid index guard
      }

      const duplicateCount = Math.max(1, action.duplicate || 1);

      for (let d = 0; d < duplicateCount; d++) {
        const [copiedPage] = await targetPdf.copyPages(sourcePdf, [action.originalIndex]);

        if (action.rotate && [90, 180, 270].includes(action.rotate)) {
          const currentRot = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentRot + action.rotate) % 360));
        }

        targetPdf.addPage(copiedPage);
      }
    }

    if (targetPdf.getPageCount() === 0) {
      return NextResponse.json(
        { error: 'Wszystkie strony dokumentu zostały usunięte. Dokument wynikowy musi mieć co najmniej 1 stronę.' },
        { status: 422 }
      );
    }

    const organizedBytes = await targetPdf.save();
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    return new NextResponse(Buffer.from(organizedBytes) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}-zreorganizowany.pdf"`,
        'X-Total-Pages': String(targetPdf.getPageCount()),
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/organize:', error);
    return NextResponse.json(
      { error: 'Błąd podczas reorganizacji stron PDF.', details: error.message },
      { status: 500 }
    );
  }
}
