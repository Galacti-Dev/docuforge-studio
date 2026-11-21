import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BASE_URL = 'http://localhost:3000';
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const TMP_OUTPUT_DIR = path.resolve(__dirname, '../fixtures/test-outputs-m6');

if (!fs.existsSync(TMP_OUTPUT_DIR)) {
  fs.mkdirSync(TMP_OUTPUT_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Rozpoczynam testy E2E modułu M6 (Kompresja i Optymalizacja PDF)...\n');
  let allPassed = true;

  // 1. Test balanced profile on sample-images.pdf
  try {
    console.log('1️⃣ Testowanie POST /api/pdf/compress (sample-images.pdf, profil balanced / 150 DPI)...');
    const pdfPath = path.join(FIXTURES_DIR, 'sample-images.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const origFileSize = pdfBuffer.length;

    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'sample-images.pdf');
    formData.append('level', 'balanced');
    formData.append('linearize', 'true');

    const res = await fetch(`${BASE_URL}/api/pdf/compress`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const origHeader = parseInt(res.headers.get('X-Original-Size') || '0', 10);
    const compHeader = parseInt(res.headers.get('X-Compressed-Size') || '0', 10);
    const redPercent = parseInt(res.headers.get('X-Reduction-Percent') || '0', 10);

    const outBuf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(TMP_OUTPUT_DIR, 'compressed-balanced.pdf');
    fs.writeFileSync(outPath, outBuf);

    // Verify PDF validity with qpdf
    const qpdfCheck = execSync(`qpdf --check "${outPath}"`).toString();
    if (!qpdfCheck.includes('File is linearized')) {
      console.warn('   ⚠️ Ostrzeżenie: plik nie ma flagi linearyzacji');
    }

    console.log(`   ✅ Profil Balanced OK! Rozmiar: ${origFileSize} B -> ${outBuf.length} B (Zaoszczędzono: ${redPercent}%). qpdf --check bez błędów.`);
    if (outBuf.length >= origFileSize) {
      console.warn(`   ⚠️ Uwaga: Rozmiar wyjściowy (${outBuf.length}) nie jest mniejszy niż wejściowy (${origFileSize}).`);
    }
  } catch (err: any) {
    console.error('   ❌ Błąd profilu balanced:', err.message);
    allPassed = false;
  }

  // 2. Test extreme profile on sample-images.pdf
  try {
    console.log('\n2️⃣ Testowanie POST /api/pdf/compress (sample-images.pdf, profil extreme / 72 DPI)...');
    const pdfPath = path.join(FIXTURES_DIR, 'sample-images.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const origFileSize = pdfBuffer.length;

    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'sample-images.pdf');
    formData.append('level', 'extreme');
    formData.append('linearize', 'true');

    const res = await fetch(`${BASE_URL}/api/pdf/compress`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const redPercent = parseInt(res.headers.get('X-Reduction-Percent') || '0', 10);
    const outBuf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(TMP_OUTPUT_DIR, 'compressed-extreme.pdf');
    fs.writeFileSync(outPath, outBuf);

    execSync(`qpdf --check "${outPath}"`);
    console.log(`   ✅ Profil Extreme OK! Rozmiar: ${origFileSize} B -> ${outBuf.length} B (Zaoszczędzono: ${redPercent}%). qpdf --check bez błędów.`);
    if (outBuf.length >= origFileSize) {
      console.error(`   ❌ Błąd: Profil extreme nie zmniejszył rozmiaru pliku.`);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('   ❌ Błąd profilu extreme:', err.message);
    allPassed = false;
  }

  // 3. Test low profile on sample-multipage.pdf
  try {
    console.log('\n3️⃣ Testowanie POST /api/pdf/compress (sample-multipage.pdf, profil low / 300 DPI)...');
    const pdfPath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);

    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'sample-multipage.pdf');
    formData.append('level', 'low');
    formData.append('linearize', 'true');

    const res = await fetch(`${BASE_URL}/api/pdf/compress`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const outBuf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(TMP_OUTPUT_DIR, 'compressed-multipage.pdf');
    fs.writeFileSync(outPath, outBuf);

    execSync(`qpdf --check "${outPath}"`);
    console.log(`   ✅ Profil Low na sample-multipage OK! Rozmiar: ${outBuf.length} B. qpdf --check bez błędów.`);
  } catch (err: any) {
    console.error('   ❌ Błąd profilu low:', err.message);
    allPassed = false;
  }

  // Cleanup test-outputs
  fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });

  if (!allPassed) {
    console.error('\n❌ Niektóre testy modułu M6 zakończyły się niepowodzeniem.');
    process.exit(1);
  } else {
    console.log('\n🎉 Wszystkie testy modułu M6 (Kompresja i Optymalizacja PDF) zakończone pełnym sukcesem (kod 0)!');
    process.exit(0);
  }
}

runTests();
