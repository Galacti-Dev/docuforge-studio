import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku PDF do operacji na metadanych.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    const action = formData.get('action') as string || (formData.has('title') ? 'update' : 'read');

    // READ ACTION
    if (action === 'read') {
      const metadata = {
        title: pdfDoc.getTitle() || '',
        author: pdfDoc.getAuthor() || '',
        subject: pdfDoc.getSubject() || '',
        keywords: pdfDoc.getKeywords() || '',
        producer: pdfDoc.getProducer() || '',
        creator: pdfDoc.getCreator() || '',
        creationDate: pdfDoc.getCreationDate()?.toISOString() || null,
        modificationDate: pdfDoc.getModificationDate()?.toISOString() || null,
        pageCount: pdfDoc.getPageCount(),
      };

      return NextResponse.json({ metadata });
    }

    // UPDATE ACTION
    const title = formData.get('title') as string | null;
    const author = formData.get('author') as string | null;
    const subject = formData.get('subject') as string | null;
    const keywordsRaw = formData.get('keywords') as string | null;
    const producer = formData.get('producer') as string | null;
    const creator = formData.get('creator') as string | null;

    if (title !== null) pdfDoc.setTitle(title);
    if (author !== null) pdfDoc.setAuthor(author);
    if (subject !== null) pdfDoc.setSubject(subject);
    if (keywordsRaw !== null) {
      const kwList = keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean);
      pdfDoc.setKeywords(kwList);
    }
    if (producer !== null) pdfDoc.setProducer(producer);
    if (creator !== null) pdfDoc.setCreator(creator);
    pdfDoc.setModificationDate(new Date());

    const pdfBytes = await pdfDoc.save();
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    return new NextResponse(Buffer.from(pdfBytes) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}-metadane.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/pdf/metadata:', error);
    return NextResponse.json(
      { error: 'Błąd podczas przetwarzania metadanych PDF.', details: error.message },
      { status: 500 }
    );
  }
}