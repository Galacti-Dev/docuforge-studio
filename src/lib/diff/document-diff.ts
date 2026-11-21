import fs from 'node:fs/promises';
import path from 'node:path';
import * as Diff from 'diff';
import mammoth from 'mammoth';
import { runCliCommand, checkCliTool } from '@/lib/server/cli-tools';

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface DiffResult {
  fileAName: string;
  fileBName: string;
  fileASize: number;
  fileBSize: number;
  similarityPercentage: number;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  diffParts: DiffPart[];
  lineDiffParts: DiffPart[];
  textA: string;
  textB: string;
}

/**
 * Ekstrahuje czysty tekst z pliku PDF, DOCX lub tekstowego.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  tempDir: string
): Promise<string> {
  const lowerName = filename.toLowerCase();

  // 1. PDF via pdftotext
  if (lowerName.endsWith('.pdf')) {
    const pdftotext = await checkCliTool('pdftotext');
    if (pdftotext.available && pdftotext.path) {
      const tempPdf = path.join(tempDir, `extract-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
      await fs.writeFile(tempPdf, buffer);
      try {
        const out = await runCliCommand(pdftotext.path, ['-layout', tempPdf, '-']);
        return out.stdout.trim();
      } finally {
        await fs.unlink(tempPdf).catch(() => {});
      }
    }
  }

  // 2. DOCX via mammoth
  if (lowerName.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  // 3. Plain text / Markdown fallback
  return buffer.toString('utf-8').trim();
}

/**
 * Oblicza różnice między dwoma tekstami i wyznacza wskaźniki podobieństwa.
 */
export function computeDocumentDiff(
  textA: string,
  textB: string,
  fileAName: string = 'Oryginał',
  fileBName: string = 'Wersja Zmodyfikowana',
  fileASize: number = 0,
  fileBSize: number = 0
): DiffResult {
  const wordDiffs = Diff.diffWords(textA, textB);
  const lineDiffs = Diff.diffLines(textA, textB);

  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  for (const part of wordDiffs) {
    const words = part.value.trim().split(/\s+/).filter(Boolean).length;
    if (part.added) {
      addedCount += words;
    } else if (part.removed) {
      removedCount += words;
    } else {
      unchangedCount += words;
    }
  }

  const totalWordsA = unchangedCount + removedCount;
  const totalWordsB = unchangedCount + addedCount;
  const denominator = Math.max(1, (totalWordsA + totalWordsB) / 2);
  const similarityPercentage = Math.max(
    0,
    Math.min(100, Math.round((unchangedCount / denominator) * 100))
  );

  return {
    fileAName,
    fileBName,
    fileASize,
    fileBSize,
    similarityPercentage,
    addedCount,
    removedCount,
    unchangedCount,
    diffParts: wordDiffs.map((d) => ({
      value: d.value,
      added: d.added,
      removed: d.removed,
    })),
    lineDiffParts: lineDiffs.map((d) => ({
      value: d.value,
      added: d.added,
      removed: d.removed,
    })),
    textA,
    textB,
  };
}
