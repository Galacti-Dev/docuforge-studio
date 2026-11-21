import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BASE_URL = 'http://localhost:3000';
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const TMP_OUTPUT_DIR = path.resolve(__dirname, '../fixtures/test-outputs-m8');

if (!fs.existsSync(TMP_OUTPUT_DIR)) {
  fs.mkdirSync(TMP_OUTPUT_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Rozpoczynam testy E2E modułu M8 (Znaki wodne, Numeracja stron i Podpis PDF)...\n');
  let allPassed = true;

  const samplePath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
  const sampleBuffer = fs.readFileSync(samplePath);

  // 1. Test POST /api/pdf/watermark (center)
  try {
    console.log('1️⃣ Testowanie POST /api/pdf/watermark (Znak wodny na środku, kąt 45°, czerwony, 30% opacity)...');
    const formData = new FormData();
    formData.append('file', new Blob([sampleBuffer], { type: 'application/pdf' }), 'sample-multipage.pdf');
    formData.append('text', 'POUFNE DOKUMENT');
    formData.append('fontSize', '48');
    formData.append('rotation', '45');
    formData.append('color', '#ef4444');
    formData.append('opacity', '0.3');
    formData.append('position', 'center');
    formData.append('pages', 'all');

    const res = await fetch(`${BASE_URL}/api/pdf/watermark`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
    if (res.headers.get('X-Watermarked') !== 'true') throw new Error('Brak nagłówka X-Watermarked');

    const outBuf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(TMP_OUTPUT_DIR, 'watermarked-center.pdf');
    fs.writeFileSync(outPath, outBuf);

    // Verify validity with qpdf
    execSync(`qpdf --check "${outPath}"`);
    console.log(`   ✅ Znak wodny (center) OK! Rozmiar: ${outBuf.length} B. qpdf --check bez błędów.`);
  } catch (err: any) {
    console.error('   ❌ Błąd testu znaku wodnego (center):', err.message);
    allPassed = false;
  }

  // 2. Test POST /api/pdf/watermark (tile grid)
  try {
    console.log('2️⃣ Testowanie POST /api/pdf/watermark (Kafelkowanie po stronach 1-2)...');
    const formData = new FormData();
    formData.append('file', new Blob([sampleBuffer], { type: 'application/pdf' }), 'sample-multipage.pdf');
    formData.append('text', 'KOPIA');
    formData.append('fontSize', '28');
    formData.append('rotation', '30');
    formData.append('color', '#3b82f6');
    formData.append('opacity', '0.2');
    formData.append('position', 'tile');
    formData.append('pages', '1-2');

    const res = await fetch(`${BASE_URL}/api/pdf/watermark`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const outBuf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(TMP_OUTPUT_DIR, 'watermarked-tile.pdf');
    fs.writeFileSync(outPath, outBuf);

    execSync(`qpdf --check "${outPath}"`);
    console.log(`   ✅ Znak wodny (tile) OK! Rozmiar: ${outBuf.length} B. qpdf --check bez błędów.`);
  } catch (err: any) {
    console.error('   ❌ Błąd testu znaku wodnego (tile):', err.message);
    allPassed = false;
  }

  // 3. Test POST /api/pdf/page-numbers
  try {
    console.log('3️⃣ Testowanie POST /api/pdf/page-numbers (Format: "Strona {n} z {total}", dół-środek)...');
    const formData = new FormData();
    formData.append('file', new Blob([sampleBuffer], { type: 'application/pdf' }), 'sample-multipage.pdf');
    formData.append('format', 'Strona {n} z {total}');
    formData.append('position', 'bottom-center');
    formData.append('margin', '30');
    formData.append('startNumber', '1');
    formData.append('fontSize', '10');
    formData.append('color', '#333333');
    formData.append('skipFirstPage', 'false');

    const res = await fetch(`${BASE_URL}/api/pdf/page-numbers`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
    if (res.headers.get('X-Page-Numbered') !== 'true') throw new Error('Brak nagłówka X-Page-Numbered');

    const outBuf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(TMP_OUTPUT_DIR, 'numbered.pdf');
    fs.writeFileSync(outPath, outBuf);

    execSync(`qpdf --check "${outPath}"`);

    // Verify text presence via pdftotext
    const textContent = execSync(`pdftotext "${outPath}" -`).toString();
    if (!textContent.includes('Strona 1 z 5')) {
      throw new Error('Nie znaleziono tekstu "Strona 1 z 5" w wyjściowym PDF!');
    }
    if (!textContent.includes('Strona 5 z 5')) {
      throw new Error('Nie znaleziono tekstu "Strona 5 z 5" w wyjściowym PDF!');
    }

    console.log(`   ✅ Numeracja stron OK! Rozmiar: ${outBuf.length} B. Odnaleziono znaczniki "Strona 1 z 5" i "Strona 5 z 5".`);
  } catch (err: any) {
    console.error('   ❌ Błąd testu numeracji stron:', err.message);
    allPassed = false;
  }

  // 4. Test POST /api/pdf/page-numbers (skipFirstPage: true)
  try {
    console.log('4️⃣ Testowanie POST /api/pdf/page-numbers z pominięciem pierwszej strony (skipFirstPage: true)...');
    const formData = new FormData();
    formData.append('file', new Blob([sampleBuffer], { type: 'application/pdf' }), 'sample-multipage.pdf');
    formData.append('format', '- {n} -');
    formData.append('position', 'bottom-right');
    formData.append('margin', '25');
    formData.append('skipFirstPage', 'true');

    const res = await fetch(`${BASE_URL}/api/pdf/page-numbers`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const outBuf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(TMP_OUTPUT_DIR, 'numbered-skipfirst.pdf');
    fs.writeFileSync(outPath, outBuf);

    execSync(`qpdf --check "${outPath}"`);

    // Verify page 1 does NOT have '- 1 -' but page 2 has '- 2 -'
    const page1Text = execSync(`pdftotext -f 1 -l 1 "${outPath}" -`).toString();
    const page2Text = execSync(`pdftotext -f 2 -l 2 "${outPath}" -`).toString();

    if (/-\s*1\s*-/.test(page1Text)) {
      throw new Error('Strona 1 zawiera numerację, mimo że wybrano pominięcie pierwszej strony!');
    }
    if (!/-\s*2\s*-/.test(page2Text)) {
      throw new Error('Strona 2 nie zawiera oczekiwanego numeru "- 2 -"!');
    }

    console.log(`   ✅ Pominięcie pierwszej strony OK! Strona 1 czysta, strona 2 poprawnie ponumerowana jako "- 2 -".`);
  } catch (err: any) {
    console.error('   ❌ Błąd testu skipFirstPage:', err.message);
    allPassed = false;
  }

  // 5. Test POST /api/pdf/sign (Signature Image / Base64 PNG)
  try {
    console.log('5️⃣ Testowanie POST /api/pdf/sign (Osadzenie podpisu graficznego PNG na stronie 5)...');
    // Read fixture sample-image2.png or create simple base64 PNG
    const pngPath = path.join(FIXTURES_DIR, 'sample-image2.png');
    const pngBuf = fs.readFileSync(pngPath);
    const base64Png = `data:image/png;base64,${pngBuf.toString('base64')}`;

    const formData = new FormData();
    formData.append('file', new Blob([sampleBuffer], { type: 'application/pdf' }), 'sample-multipage.pdf');
    formData.append('pageNumber', '5');
    formData.append('signatureImage', base64Png);
    formData.append('x', '390');
    formData.append('y', '50');
    formData.append('width', '150');
    formData.append('height', '55');

    const res = await fetch(`${BASE_URL}/api/pdf/sign`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
    if (res.headers.get('X-Signed') !== 'true') throw new Error('Brak nagłówka X-Signed');

    const outBuf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(TMP_OUTPUT_DIR, 'signed.pdf');
    fs.writeFileSync(outPath, outBuf);

    execSync(`qpdf --check "${outPath}"`);

    // Verify with pdfinfo that 5 pages remain intact
    const infoOut = execSync(`pdfinfo "${outPath}"`).toString();
    if (!infoOut.includes('Pages:           5')) {
      throw new Error('Liczba stron w podpisanym dokumencie nie zgadza się!');
    }

    console.log(`   ✅ Podpisanie PDF OK! Podpis osadzony na stronie 5, rozmiar pliku: ${outBuf.length} B, qpdf --check bez błędów.`);
  } catch (err: any) {
    console.error('   ❌ Błąd testu podpisu cyfrowego:', err.message);
    allPassed = false;
  }

  console.log('\n======================================================');
  if (allPassed) {
    console.log('🎉 WSZYSTKIE TESTY E2E MODUŁU M8 ZAKOŃCZONE SUKCESEM!');
    process.exit(0);
  } else {
    console.error('💥 NIEKTÓRE TESTY E2E MODUŁU M8 ZAKOŃCZYŁY SIĘ BŁĘDEM!');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Błąd wykonania skryptu testowego M8:', err);
  process.exit(1);
});
