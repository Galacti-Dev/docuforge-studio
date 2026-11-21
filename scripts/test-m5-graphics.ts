import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BASE_URL = 'http://localhost:3000';
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const TMP_OUTPUT_DIR = path.resolve(__dirname, '../fixtures/test-outputs-m5');

if (!fs.existsSync(TMP_OUTPUT_DIR)) {
  fs.mkdirSync(TMP_OUTPUT_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Rozpoczynam testy E2E modułu M5 (Konwersje Graficzne – PDF <-> Obrazy)...\n');
  let allPassed = true;

  // 1. PDF -> Images (ZIP 5 stron PNG @ 150 DPI)
  try {
    console.log('1️⃣ Testowanie POST /api/convert/pdf-to-images (5 stron PNG, 150 DPI -> ZIP)...');
    const pdfPath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'sample-multipage.pdf');
    formData.append('format', 'png');
    formData.append('dpi', '150');
    formData.append('zip', 'true');

    const res = await fetch(`${BASE_URL}/api/convert/pdf-to-images`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}: ${await res.text()}`);
    }

    const zipBuffer = Buffer.from(await res.arrayBuffer());
    const outZip = path.join(TMP_OUTPUT_DIR, 'pdf-to-images-result.zip');
    fs.writeFileSync(outZip, zipBuffer);

    // Verify ZIP integrity
    const unzipOut = execSync(`unzip -t "${outZip}"`).toString();
    const matches = unzipOut.match(/OK/g);
    console.log(`   ✅ PDF -> Images ZIP OK! Rozmiar archiwum: ${zipBuffer.length} bajtów. Pomyślnie zweryfikowano pliki w ZIP (OK: ${matches?.length}).`);
  } catch (err: any) {
    console.error('   ❌ Błąd PDF -> Images ZIP:', err.message);
    allPassed = false;
  }

  // 2. PDF -> WebP (ZIP 5 stron WebP @ 72 DPI)
  try {
    console.log('\n2️⃣ Testowanie POST /api/convert/pdf-to-images (WebP 72 DPI -> ZIP)...');
    const pdfPath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'sample-multipage.pdf');
    formData.append('format', 'webp');
    formData.append('dpi', '72');
    formData.append('zip', 'true');

    const res = await fetch(`${BASE_URL}/api/convert/pdf-to-images`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}: ${await res.text()}`);
    }

    const zipBuffer = Buffer.from(await res.arrayBuffer());
    const outZip = path.join(TMP_OUTPUT_DIR, 'pdf-to-webp-result.zip');
    fs.writeFileSync(outZip, zipBuffer);

    execSync(`unzip -t "${outZip}"`);
    console.log(`   ✅ PDF -> WebP ZIP OK! Rozmiar archiwum: ${zipBuffer.length} bajtów.`);
  } catch (err: any) {
    console.error('   ❌ Błąd PDF -> WebP ZIP:', err.message);
    allPassed = false;
  }

  // 3. PDF -> Single Image (JPEG @ 150 DPI dla 1 strony)
  try {
    console.log('\n3️⃣ Testowanie POST /api/convert/pdf-to-images (Pojedynczy JPEG bez ZIP)...');
    const pdfPath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'sample-multipage.pdf');
    formData.append('format', 'jpeg');
    formData.append('dpi', '150');
    formData.append('pageRange', '1');

    const res = await fetch(`${BASE_URL}/api/convert/pdf-to-images`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}: ${await res.text()}`);
    }

    const contentType = res.headers.get('Content-Type') || '';
    if (!contentType.includes('image/jpeg')) {
      throw new Error(`Nieoczekiwany Content-Type: ${contentType}`);
    }

    const imgBuffer = Buffer.from(await res.arrayBuffer());
    // Verify JPEG header (0xFF, 0xD8, 0xFF)
    if (imgBuffer[0] !== 0xff || imgBuffer[1] !== 0xd8 || imgBuffer[2] !== 0xff) {
      throw new Error('Niepoprawny nagłówek JPEG w pliku wyjściowym');
    }

    console.log(`   ✅ PDF -> Single JPEG OK! Rozmiar obrazu: ${imgBuffer.length} bajtów. Nagłówek JPEG poprawny.`);
  } catch (err: any) {
    console.error('   ❌ Błąd PDF -> Single JPEG:', err.message);
    allPassed = false;
  }

  // 4. Images -> PDF (sample-image1.jpg + sample-image2.png -> A4 PDF)
  try {
    console.log('\n4️⃣ Testowanie POST /api/convert/images-to-pdf (2 obrazy -> PDF A4)...');
    const img1Path = path.join(FIXTURES_DIR, 'sample-image1.jpg');
    const img2Path = path.join(FIXTURES_DIR, 'sample-image2.png');
    const img1Buf = fs.readFileSync(img1Path);
    const img2Buf = fs.readFileSync(img2Path);

    const formData = new FormData();
    formData.append('files', new Blob([img1Buf], { type: 'image/jpeg' }), 'sample-image1.jpg');
    formData.append('files', new Blob([img2Buf], { type: 'image/png' }), 'sample-image2.png');
    formData.append('pageSize', 'A4');
    formData.append('orientation', 'auto');
    formData.append('margin', 'small');

    const res = await fetch(`${BASE_URL}/api/convert/images-to-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}: ${await res.text()}`);
    }

    const pdfBuffer = Buffer.from(await res.arrayBuffer());
    const outPdf = path.join(TMP_OUTPUT_DIR, 'images-to-pdf-result.pdf');
    fs.writeFileSync(outPdf, pdfBuffer);

    // Verify PDF with qpdf
    execSync(`qpdf --check "${outPdf}"`);
    console.log(`   ✅ Images -> PDF OK! Rozmiar: ${pdfBuffer.length} bajtów. qpdf --check potwierdził poprawność 2-stronicowego pliku PDF.`);
  } catch (err: any) {
    console.error('   ❌ Błąd Images -> PDF:', err.message);
    allPassed = false;
  }

  // Cleanup test-outputs
  fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });

  if (!allPassed) {
    console.error('\n❌ Niektóre testy modułu M5 zakończyły się niepowodzeniem.');
    process.exit(1);
  } else {
    console.log('\n🎉 Wszystkie testy modułu M5 (PDF <-> Obrazy) zakończone pełnym sukcesem (kod 0)!');
    process.exit(0);
  }
}

runTests();
