import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile, computeDocumentDiff } from '@/lib/diff/document-diff';
import { createTempDir, cleanupTempDir } from '@/lib/server/cli-tools';

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const fileA = formData.get('fileA') as File | null;
    const fileB = formData.get('fileB') as File | null;

    if (!fileA || !fileB) {
      return NextResponse.json(
        { error: 'Do porównania wymagane są dwa pliki (fileA i fileB).' },
        { status: 400 }
      );
    }

    tempDir = await createTempDir('diff');

    const [bufferA, bufferB] = await Promise.all([
      fileA.arrayBuffer().then((ab) => Buffer.from(ab)),
      fileB.arrayBuffer().then((ab) => Buffer.from(ab)),
    ]);

    const [textA, textB] = await Promise.all([
      extractTextFromFile(bufferA, fileA.name, tempDir),
      extractTextFromFile(bufferB, fileB.name, tempDir),
    ]);

    const diffResult = computeDocumentDiff(
      textA,
      textB,
      fileA.name,
      fileB.name,
      fileA.size,
      fileB.size
    );

    return NextResponse.json(diffResult);
  } catch (error: any) {
    console.error('Błąd w /api/diff/compare:', error);
    return NextResponse.json(
      { error: 'Błąd podczas porównywania dokumentów.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
