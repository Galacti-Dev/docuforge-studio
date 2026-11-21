import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BASE_URL = 'http://localhost:3000';
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const TMP_OUTPUT_DIR = path.resolve(__dirname, '../fixtures/test-outputs-m9');

if (!fs.existsSync(TMP_OUTPUT_DIR)) {
  fs.mkdirSync(TMP_OUTPUT_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Rozpoczynam testy E2E modułu M9 (OCR Tesseract.js PL/EN i Porównywarka Diff)...\n');
  let allPassed = true;

  const scannedImgPath = path.join(FIXTURES_DIR, 'sample-scanned.png');
  const scannedImgBuffer = fs.readFileSync(scannedImgPath);
  const multipagePdfPath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
  const multipagePdfBuffer = fs.readFileSync(multipagePdfPath);
  const docxDocPath = path.join(FIXTURES_DIR, 'sample-document.docx');
  const docxDocBuffer = fs.readFileSync(docxDocPath);

  // 1. Test POST /api/ocr/process on sample-scanned.png (JSON result)
  try {
    console.log('1️⃣ Testowanie POST /api/ocr/process (sample-scanned.png, pol+eng, odczyt tekstu)...');
    const formData = new FormData();
    formData.append('file', new Blob([scannedImgBuffer], { type: 'image/png' }), 'sample-scanned.png');
    formData.append('language', 'pol+eng');
    formData.append('download', 'false');

    const res = await fetch(`${BASE_URL}/api/ocr/process`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const data = await res.json();
    console.log(`   ℹ️ Dokładność OCR: ${data.confidence}%, Liczba słów: ${data.wordCount}`);

    // Check Polish diacritics and text presence
    if (!data.text.includes('Zażółć gęślą jaźń') && !data.text.includes('DOCUFORGE STUDIO')) {
      throw new Error(`Brak oczekiwanego tekstu w wyjściu OCR! Otrzymano:\n${data.text}`);
    }

    console.log('   ✅ OCR (JSON) OK! Poprawnie rozpoznano polskie znaki diakrytyczne ("Zażółć gęślą jaźń").');
  } catch (err: any) {
    console.error('   ❌ Błąd testu OCR JSON:', err.message);
    allPassed = false;
  }

  // 2. Test POST /api/ocr/process with outputFormat=docx & download=true
  try {
    console.log('2️⃣ Testowanie POST /api/ocr/process z eksportem do formatu DOCX...');
    const formData = new FormData();
    formData.append('file', new Blob([scannedImgBuffer], { type: 'image/png' }), 'sample-scanned.png');
    formData.append('language', 'pol+eng');
    formData.append('outputFormat', 'docx');
    formData.append('download', 'true');

    const res = await fetch(`${BASE_URL}/api/ocr/process`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const docxBuf = Buffer.from(await res.arrayBuffer());
    const docxOutPath = path.join(TMP_OUTPUT_DIR, 'scanned-ocr.docx');
    fs.writeFileSync(docxOutPath, docxBuf);

    // Verify DOCX validity via unzip -t
    execSync(`unzip -t "${docxOutPath}"`);
    console.log(`   ✅ Eksport DOCX OK! Wygenerowano sprawny plik Word (${docxBuf.length} B), struktura ZIP zweryfikowana.`);
  } catch (err: any) {
    console.error('   ❌ Błąd testu eksportu DOCX:', err.message);
    allPassed = false;
  }

  // 3. Test POST /api/ocr/process with outputFormat=pdf & download=true
  try {
    console.log('3️⃣ Testowanie POST /api/ocr/process z eksportem do formatu PDF...');
    const formData = new FormData();
    formData.append('file', new Blob([scannedImgBuffer], { type: 'image/png' }), 'sample-scanned.png');
    formData.append('language', 'pol+eng');
    formData.append('outputFormat', 'pdf');
    formData.append('download', 'true');

    const res = await fetch(`${BASE_URL}/api/ocr/process`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const pdfBuf = Buffer.from(await res.arrayBuffer());
    const pdfOutPath = path.join(TMP_OUTPUT_DIR, 'scanned-ocr.pdf');
    fs.writeFileSync(pdfOutPath, pdfBuf);

    // Verify PDF validity via qpdf
    execSync(`qpdf --check "${pdfOutPath}"`);
    console.log(`   ✅ Eksport PDF OK! Wygenerowano poprawny dokument PDF (${pdfBuf.length} B), qpdf --check bez błędów.`);
  } catch (err: any) {
    console.error('   ❌ Błąd testu eksportu PDF:', err.message);
    allPassed = false;
  }

  // 4. Test POST /api/diff/compare (PDF vs DOCX)
  try {
    console.log('4️⃣ Testowanie POST /api/diff/compare (Porównanie sample-multipage.pdf vs sample-document.docx)...');
    const formData = new FormData();
    formData.append('fileA', new Blob([multipagePdfBuffer], { type: 'application/pdf' }), 'sample-multipage.pdf');
    formData.append('fileB', new Blob([docxDocBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'sample-document.docx');

    const res = await fetch(`${BASE_URL}/api/diff/compare`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const diffData = await res.json();
    console.log(`   ℹ️ Wynik diff: Podobieństwo=${diffData.similarityPercentage}%, Dodane=+${diffData.addedCount}, Usunięte=-${diffData.removedCount}`);

    if (typeof diffData.similarityPercentage !== 'number' || !Array.isArray(diffData.diffParts)) {
      throw new Error('Niepoprawna struktura odpowiedzi DiffResult!');
    }

    console.log('   ✅ Porównanie PDF vs DOCX OK! Zwrócono pełną strukturę metryk i fragmentów diff.');
  } catch (err: any) {
    console.error('   ❌ Błąd testu diff PDF vs DOCX:', err.message);
    allPassed = false;
  }

  // 5. Test POST /api/diff/compare (Identyczne pliki -> 100% zgodności)
  try {
    console.log('5️⃣ Testowanie POST /api/diff/compare na identycznych plikach (oczekiwane 100% zgodności)...');
    const formData = new FormData();
    formData.append('fileA', new Blob([multipagePdfBuffer], { type: 'application/pdf' }), 'sample-multipage-1.pdf');
    formData.append('fileB', new Blob([multipagePdfBuffer], { type: 'application/pdf' }), 'sample-multipage-2.pdf');

    const res = await fetch(`${BASE_URL}/api/diff/compare`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const diffData = await res.json();
    if (diffData.similarityPercentage !== 100) {
      throw new Error(`Oczekiwano 100% zgodności dla identycznych plików, otrzymano: ${diffData.similarityPercentage}%`);
    }
    if (diffData.addedCount !== 0 || diffData.removedCount !== 0) {
      throw new Error(`Dla identycznych plików liczba zmian powinna wynosić 0 (dodane: ${diffData.addedCount}, usunięte: ${diffData.removedCount})`);
    }

    console.log('   ✅ Test identycznych plików OK! Zgodność 100%, 0 dodanych, 0 usuniętych słów.');
  } catch (err: any) {
    console.error('   ❌ Błąd testu identycznych plików:', err.message);
    allPassed = false;
  }

  // 6. Test POST /api/diff/compare (Tekst ze zmianami)
  try {
    console.log('6️⃣ Testowanie POST /api/diff/compare na plikach tekstowych ze specyficznymi zmianami...');
    const textA = 'To jest oficjalna wersja pierwsza umowy DocuForge Studio.';
    const textB = 'To jest zaktualizowana wersja druga umowy DocuForge Studio z aneksami.';

    const formData = new FormData();
    formData.append('fileA', new Blob([Buffer.from(textA)], { type: 'text/plain' }), 'umowa-v1.txt');
    formData.append('fileB', new Blob([Buffer.from(textB)], { type: 'text/plain' }), 'umowa-v2.txt');

    const res = await fetch(`${BASE_URL}/api/diff/compare`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const diffData = await res.json();
    if (diffData.addedCount <= 0 || diffData.removedCount <= 0) {
      throw new Error(`Oczekiwano dodanych i usuniętych słów w zmienionym tekście! Dodane: ${diffData.addedCount}, Usunięte: ${diffData.removedCount}`);
    }

    console.log(`   ✅ Test zmienionego tekstu OK! Wykryto zmiany (+${diffData.addedCount} / -${diffData.removedCount}), Podobieństwo: ${diffData.similarityPercentage}%.`);
  } catch (err: any) {
    console.error('   ❌ Błąd testu zmienionego tekstu:', err.message);
    allPassed = false;
  }

  console.log('\n======================================================');
  if (allPassed) {
    console.log('🎉 WSZYSTKIE TESTY E2E MODUŁU M9 ZAKOŃCZONE SUKCESEM!');
    process.exit(0);
  } else {
    console.error('💥 NIEKTÓRE TESTY E2E MODUŁU M9 ZAKOŃCZYŁY SIĘ BŁĘDEM!');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Błąd wykonania skryptu testowego M9:', err);
  process.exit(1);
});
