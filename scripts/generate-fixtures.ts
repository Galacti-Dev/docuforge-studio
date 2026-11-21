import fs from 'node:fs/promises';
import nodeFs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import { execFile, execSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const FIXTURES_DIR = path.resolve(process.cwd(), 'fixtures');

// Helper to create a minimal 1x1 transparent/colored PNG buffer in pure JS
function createMinimalPng(r: number, g: number, b: number): Buffer {
  // 8x8 uncompressed valid PNG
  // We can write a minimal valid PNG
  const width = 64;
  const height = 64;
  const buffer = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buffer[i * 4] = r;
    buffer[i * 4 + 1] = g;
    buffer[i * 4 + 2] = b;
    buffer[i * 4 + 3] = 255;
  }

  // To ensure 100% valid PNG that any parser accepts, we can generate a small BMP or valid PNG,
  // Or better, generate via pdftoppm or minimal raw PNG chunks.
  // Below is a standard valid PNG chunk generator:
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  // Raw image data with scanline filter bytes
  const scanlines: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = 255;
    }
    scanlines.push(row);
  }
  const idatData = zlib.deflateSync(Buffer.concat(scanlines));

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function generateMultipagePdf(): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pagesData = [
    {
      title: 'DocuForge Studio - Dokument Testowy',
      subtitle: 'Kompleksowy test wielostronicowy (Strona 1)',
      body: 'Niniejszy dokument zostal wygenerowany automatycznie na potrzeby walidacji modulu M1 DocuForge Studio. Sprawdza poprawnosc przetwarzania strumieni binarnych, laczenia stron, podzialu oraz konwersji.',
    },
    {
      title: 'Rozdzial 1: Architektura i Bezpieczenstwo',
      subtitle: 'Przetwarzanie lokalne bez wysylania do chmury (Strona 2)',
      body: 'Wszystkie pliki uzytkownika pozostaja wylacznie na maszynie roboczej. Narzedzia systemowe LibreOffice, Ghostscript oraz QPDF sa izolowane w unikalnych katalogach /tmp/docuforge-studio/.',
    },
    {
      title: 'Rozdzial 2: Wydajnosc i Skalowalnosc',
      subtitle: 'Obsluga duzych plikow do 100 MB (Strona 3)',
      body: 'Silnik aplikacji DocuForge Studio pozwala na plynna obsluge dokumentow wielostronicowych, kompresje strumieni wektorowych i rastrowych oraz wielowatkowe przetwarzanie zadan wsadowych.',
    },
    {
      title: 'Rozdzial 3: Standardy i Kompatybilnosc',
      subtitle: 'Formaty PDF, DOCX, Markdown i obrazy (Strona 4)',
      body: 'Pelna zgodnosc ze specyfikacjami PDF 1.4 - 1.7, formatem OpenXML (.docx) oraz standardem CommonMark. Integracja z silnikiem OCR Tesseract wspiera rozpoznawanie znakow diakrytycznych.',
    },
    {
      title: 'Podsumowanie i Weryfikacja',
      subtitle: 'Zatwierdzenie etapu M1 przez QA (Strona 5)',
      body: 'Zestaw plikow testowych w katalogu fixtures/ stanowi baze weryfikacyjna dla wszystkich kolejnych kamieni milowych M2-M10.',
    },
  ];

  for (let i = 0; i < pagesData.length; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const data = pagesData[i];

    // Background header bar
    page.drawRectangle({
      x: 40,
      y: 750,
      width: 515.28,
      height: 40,
      color: rgb(0.12, 0.12, 0.12),
    });

    page.drawText(data.title, {
      x: 50,
      y: 765,
      size: 16,
      font: boldFont,
      color: rgb(0.23, 0.51, 0.96), // #3b82f6
    });

    page.drawText(data.subtitle, {
      x: 50,
      y: 710,
      size: 13,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Content box
    page.drawRectangle({
      x: 40,
      y: 540,
      width: 515.28,
      height: 140,
      color: rgb(0.96, 0.96, 0.97),
      borderColor: rgb(0.85, 0.85, 0.88),
      borderWidth: 1,
    });

    page.drawText(data.body, {
      x: 60,
      y: 630,
      size: 11,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 475,
      lineHeight: 16,
    });

    // Footer
    page.drawText(`DocuForge Studio • Strona ${i + 1} z ${pagesData.length}`, {
      x: 50,
      y: 40,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
  await fs.writeFile(filePath, pdfBytes);
  return filePath;
}

async function generateImagesPdf(samplePngPath: string): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Generate high-resolution test image for realistic compression
  const hiresPngPath = path.join(FIXTURES_DIR, 'temp-hires.png');
  try {
    execSync(`ffmpeg -f lavfi -i testsrc=size=1200x800:rate=1 -frames:v 1 -update 1 "${hiresPngPath}" -y 2>/dev/null`);
  } catch {
    // fallback to samplePngPath if ffmpeg fails
  }

  const pngToUse = nodeFs.existsSync(hiresPngPath) ? hiresPngPath : samplePngPath;
  const pngBytes = await fs.readFile(pngToUse);
  const embeddedPng = await pdfDoc.embedPng(pngBytes);
  if (nodeFs.existsSync(hiresPngPath)) {
    nodeFs.unlinkSync(hiresPngPath);
  }

  const page = pdfDoc.addPage([595.28, 841.89]);
  page.drawText('DocuForge Studio - PDF z osadzonymi obrazami', {
    x: 50,
    y: 780,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText('Dokument z rastrowymi osadzeniami graficznymi do testow kompresji M6.', {
    x: 50,
    y: 755,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawImage(embeddedPng, {
    x: 50,
    y: 100,
    width: 495,
    height: 600,
  });

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(FIXTURES_DIR, 'sample-images.pdf');
  await fs.writeFile(filePath, pdfBytes);
  return filePath;
}

async function generateSampleDocx(): Promise<string> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'Specyfikacja Projektowa – DocuForge Studio',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: 'Dokument testowy dla modulu konwersji DOCX <-> PDF oraz ekstrakcji tekstu.',
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: '1. Parametry Techniczne',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Aplikacja dziala w trybie w pelni lokalnym. ',
              }),
              new TextRun({
                text: 'Krytyczne zasady: zero atrap (NO MOCKS), pelna prywatnosc i obsluga plikow do 100 MB.',
                bold: true,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: '2. Tabela Porownawcza Narzedzi',
            heading: HeadingLevel.HEADING_2,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Modul', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Technologia', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Konwersja DOCX->PDF')] }),
                  new TableCell({ children: [new Paragraph('LibreOffice headless')] }),
                  new TableCell({ children: [new Paragraph('Aktywny')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Kompresja PDF')] }),
                  new TableCell({ children: [new Paragraph('Ghostscript')] }),
                  new TableCell({ children: [new Paragraph('Aktywny')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Szyfrowanie PDF')] }),
                  new TableCell({ children: [new Paragraph('QPDF')] }),
                  new TableCell({ children: [new Paragraph('Aktywny')] }),
                ],
              }),
            ],
          }),
          new Paragraph({
            text: '3. Podsumowanie',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          }),
          new Paragraph({
            text: 'Niniejszy plik DOCX weryfikuje poprawne formatowanie naglowkow, stylow pogrubienia oraz tabel OpenXML.',
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(FIXTURES_DIR, 'sample-document.docx');
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function generateSampleImages(): Promise<{ jpg: string; png: string }> {
  const pngBuf = createMinimalPng(59, 130, 246); // Blue #3b82f6
  const pngPath = path.join(FIXTURES_DIR, 'sample-image2.png');
  await fs.writeFile(pngPath, pngBuf);

  // We can write sample-image1.jpg as well
  // To create a valid JPG file without third party canvas, we can convert the PNG using LibreOffice or write a valid minimal JPEG
  // Or render a 1-page PDF with pdftoppm -jpeg
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 300]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    color: rgb(0.06, 0.72, 0.5), // Emerald #10b981
  });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.drawText('DocuForge Image 1 (JPG Sample)', {
    x: 50,
    y: 150,
    size: 16,
    font,
    color: rgb(1, 1, 1),
  });
  const tempPdfPath = path.join(FIXTURES_DIR, 'temp-img.pdf');
  await fs.writeFile(tempPdfPath, await pdfDoc.save());

  const jpgPrefix = path.join(FIXTURES_DIR, 'temp-jpg');
  await execFileAsync('pdftoppm', ['-jpeg', '-r', '150', tempPdfPath, jpgPrefix]);
  await fs.rename(`${jpgPrefix}-1.jpg`, path.join(FIXTURES_DIR, 'sample-image1.jpg'));
  await fs.unlink(tempPdfPath);

  return {
    jpg: path.join(FIXTURES_DIR, 'sample-image1.jpg'),
    png: pngPath,
  };
}

async function generateOcrScannedImage(): Promise<string> {
  const htmlContent = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<style>
  body {
    background: #ffffff;
    color: #111111;
    font-family: 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif;
    padding: 60px;
    width: 800px;
  }
  h1 { font-size: 28px; margin-bottom: 20px; color: #000000; }
  .section { margin-bottom: 24px; }
  .pl-sample { font-size: 22px; font-weight: bold; color: #1e3a8a; line-height: 1.5; }
  .en-sample { font-size: 16px; color: #374151; margin-top: 10px; }
  .badge { display: inline-block; padding: 6px 12px; background: #e0f2fe; color: #0369a1; border-radius: 6px; font-weight: bold; }
</style>
</head>
<body>
  <h1>DOCUFORGE STUDIO – TEST SILNIKA OCR</h1>
  <div class="section">
    <div class="badge">PRÓBKA TESTOWA DLA JĘZYKA POLSKIEGO I ANGIELSKIEGO</div>
    <p class="pl-sample">Zażółć gęślą jaźń – pchnąć w tę łódź jeża lub ośm skrzyń fig.</p>
    <p class="en-sample">DocuForge Studio delivers local, private, and high-performance document engineering.</p>
    <p class="en-sample">Optical Character Recognition benchmark target: 98% confidence score.</p>
  </div>
</body>
</html>`;

  const tempHtml = path.join(FIXTURES_DIR, 'temp-ocr.html');
  const tempPdf = path.join(FIXTURES_DIR, 'temp-ocr.pdf');
  await fs.writeFile(tempHtml, htmlContent, 'utf-8');

  await execFileAsync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', FIXTURES_DIR, tempHtml]);

  const ocrPrefix = path.join(FIXTURES_DIR, 'temp-ocr-img');
  await execFileAsync('pdftoppm', ['-png', '-r', '200', tempPdf, ocrPrefix]);
  await fs.rename(`${ocrPrefix}-1.png`, path.join(FIXTURES_DIR, 'sample-scanned.png'));

  await fs.unlink(tempHtml).catch(() => {});
  await fs.unlink(tempPdf).catch(() => {});

  return path.join(FIXTURES_DIR, 'sample-scanned.png');
}

async function main() {
  console.log('🚀 Rozpoczynam generowanie zestawu prawdziwych plików testowych w fixtures/...');
  await fs.mkdir(FIXTURES_DIR, { recursive: true });

  console.log('1/5 Generowanie sample-image1.jpg i sample-image2.png...');
  const images = await generateSampleImages();

  console.log('2/5 Generowanie sample-multipage.pdf (5 stron A4)...');
  const multipagePdf = await generateMultipagePdf();

  console.log('3/5 Generowanie sample-images.pdf (PDF z osadzonymi obrazami)...');
  const imagesPdf = await generateImagesPdf(images.png);

  console.log('4/5 Generowanie sample-document.docx (nagłówki, tabela, akapity)...');
  const docxFile = await generateSampleDocx();

  console.log('5/5 Generowanie sample-scanned.png (skan tekstu do OCR)...');
  const scannedImg = await generateOcrScannedImage();

  console.log('✅ Zestaw fixtures został pomyślnie wygenerowany:');
  const files = await fs.readdir(FIXTURES_DIR);
  for (const file of files) {
    const stat = await fs.stat(path.join(FIXTURES_DIR, file));
    console.log(`   - ${file}: ${(stat.size / 1024).toFixed(2)} KB (${stat.size} B)`);
  }
}

main().catch((err) => {
  console.error('❌ Błąd generowania fixtures:', err);
  process.exit(1);
});
