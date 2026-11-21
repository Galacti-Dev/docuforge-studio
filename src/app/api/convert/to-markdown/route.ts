import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import { createTempDir, cleanupTempDir, runCliCommand } from '@/lib/server/cli-tools';

function htmlToMarkdown(html: string): string {
  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n\n');

  // Bold & Italic
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');

  // Unordered lists
  md = md.replace(/<ul>([\s\S]*?)<\/ul>/gi, (_, listContent) => {
    return (
      '\n' +
      listContent
        .replace(/<li>([\s\S]*?)<\/li>/gi, '- $1\n')
        .replace(/<[^>]+>/g, '')
        .trim() +
      '\n\n'
    );
  });

  // Ordered lists
  md = md.replace(/<ol>([\s\S]*?)<\/ol>/gi, (_, listContent) => {
    let index = 1;
    return (
      '\n' +
      listContent
        .replace(/<li>([\s\S]*?)<\/li>/gi, () => `${index++}. $1\n`)
        .replace(/<[^>]+>/g, '')
        .trim() +
      '\n\n'
    );
  });

  // Tables
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows: string[][] = [];
    const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const rowHtml of rowMatches) {
      const cells: string[] = [];
      const cellMatches = rowHtml.match(/<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi) || [];
      for (const cellHtml of cellMatches) {
        const text = cellHtml.replace(/<[^>]+>/g, '').trim();
        cells.push(text);
      }
      if (cells.length > 0) rows.push(cells);
    }

    if (rows.length === 0) return '';

    const maxCols = Math.max(...rows.map((r) => r.length));
    const normalizedRows = rows.map((r) => {
      while (r.length < maxCols) r.push('');
      return r;
    });

    let tableMd = '\n| ' + normalizedRows[0].join(' | ') + ' |\n';
    tableMd += '| ' + normalizedRows[0].map(() => '---').join(' | ') + ' |\n';

    for (let i = 1; i < normalizedRows.length; i++) {
      tableMd += '| ' + normalizedRows[i].join(' | ') + ' |\n';
    }

    return tableMd + '\n';
  });

  // Paragraphs & breaks
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode basic HTML entities
  md = md
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  return md.trim() + '\n';
}

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku do konwersji na Markdown.' },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    let markdown = '';

    if (ext === '.docx') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { value: html } = await mammoth.convertToHtml({ buffer });
      markdown = htmlToMarkdown(html);
    } else if (ext === '.pdf') {
      tempDir = await createTempDir('pdf2md');
      const inputPath = path.join(tempDir, file.name);
      await fs.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

      const { stdout } = await runCliCommand('/usr/bin/pdftotext', ['-layout', inputPath, '-']);

      // Format plain text into clean Markdown
      const sections = stdout.split('\x0c'); // Split pages
      const mdPages = sections.map((pageText, pIdx) => {
        const lines = pageText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length === 0) return '';

        const title = lines[0];
        const rest = lines.slice(1).join('\n\n');
        return `## Strona ${pIdx + 1}: ${title}\n\n${rest}`;
      });

      markdown = `# ${baseName}\n\n` + mdPages.filter(Boolean).join('\n\n---\n\n');
    } else {
      return NextResponse.json(
        { error: `Nieobsługiwany format (${ext}). Prześlij plik .docx lub .pdf.` },
        { status: 400 }
      );
    }

    return new NextResponse(Buffer.from(markdown, 'utf-8') as unknown as BodyInit, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}.md"`,
      },
    });
  } catch (error: any) {
    console.error('Błąd w /api/convert/to-markdown:', error);
    return NextResponse.json(
      { error: 'Błąd podczas konwersji do formatu Markdown.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
