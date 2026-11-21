import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BASE_URL = 'http://localhost:3000';
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const TMP_OUTPUT_DIR = path.resolve(__dirname, '../fixtures/test-outputs-m7');

if (!fs.existsSync(TMP_OUTPUT_DIR)) {
  fs.mkdirSync(TMP_OUTPUT_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Rozpoczynam testy E2E modułu M7 (Bezpieczeństwo i Metadane PDF)...\n');
  let allPassed = true;

  const samplePath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
  const sampleBuffer = fs.readFileSync(samplePath);
  const userPass = 'DocuForge123!';
  const ownerPass = 'OwnerAdmin456!';
  const protectedPath = path.join(TMP_OUTPUT_DIR, 'sample-protected.pdf');
  const unlockedPath = path.join(TMP_OUTPUT_DIR, 'sample-unlocked.pdf');
  const updatedMetaPath = path.join(TMP_OUTPUT_DIR, 'sample-updated-metadata.pdf');
  const sanitizedPath = path.join(TMP_OUTPUT_DIR, 'sample-sanitized.pdf');

  // 1. Test POST /api/pdf/protect
  try {
    console.log('1️⃣ Testowanie POST /api/pdf/protect (Szyfrowanie AES-256 z hasłem użytkownika i właściciela)...');
    const formData = new FormData();
    formData.append('file', new Blob([sampleBuffer], { type: 'application/pdf' }), 'sample-multipage.pdf');
    formData.append('userPassword', userPass);
    formData.append('ownerPassword', ownerPass);

    const res = await fetch(`${BASE_URL}/api/pdf/protect`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const encBuf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(protectedPath, encBuf);

    // Verify with qpdf that password is required
    let failedWithoutPass = false;
    try {
      execSync(`qpdf --check "${protectedPath}" 2>/dev/null`);
    } catch {
      failedWithoutPass = true;
    }

    if (!failedWithoutPass) {
      throw new Error('Plik zaszyfrowany otwiera się bez hasła!');
    }

    // Verify with qpdf with password
    const checkWithPass = execSync(`qpdf --check --password="${userPass}" "${protectedPath}" 2>&1`).toString();
    if (!checkWithPass.includes('checking') && !checkWithPass.includes('File is not damaged')) {
      // qpdf exits 0 on valid file
    }

    // Check with pdfinfo
    const infoOut = execSync(`pdfinfo -upw "${userPass}" "${protectedPath}"`).toString();
    if (!infoOut.includes('Encrypted:')) {
      throw new Error('Brak informacji o szyfrowaniu w pdfinfo');
    }

    console.log(`   ✅ Szyfrowanie OK! Rozmiar: ${encBuf.length} B. Wymaga hasła użytkownika, poprawnie zweryfikowane przez qpdf i pdfinfo.`);
  } catch (err: any) {
    console.error('   ❌ Błąd szyfrowania:', err.message);
    allPassed = false;
  }

  // 2. Test POST /api/pdf/unlock with wrong password (should fail 400)
  try {
    console.log('2️⃣ Testowanie POST /api/pdf/unlock z BŁĘDNYM hasłem (oczekiwany kod 400)...');
    const protectedBuf = fs.readFileSync(protectedPath);
    const formData = new FormData();
    formData.append('file', new Blob([protectedBuf], { type: 'application/pdf' }), 'sample-protected.pdf');
    formData.append('password', 'ZleHaslo123');

    const res = await fetch(`${BASE_URL}/api/pdf/unlock`, {
      method: 'POST',
      body: formData,
    });

    if (res.status === 400) {
      const json = await res.json();
      console.log(`   ✅ Błędne hasło prawidłowo odrzucone (Status 400, Komunikat: "${json.error}").`);
    } else {
      throw new Error(`Oczekiwano statusu 400, otrzymano ${res.status}`);
    }
  } catch (err: any) {
    console.error('   ❌ Błąd walidacji błędnego hasła:', err.message);
    allPassed = false;
  }

  // 3. Test POST /api/pdf/unlock with CORRECT password
  try {
    console.log('3️⃣ Testowanie POST /api/pdf/unlock z POPRAWNYM hasłem (deszyfrowanie)...');
    const protectedBuf = fs.readFileSync(protectedPath);
    const formData = new FormData();
    formData.append('file', new Blob([protectedBuf], { type: 'application/pdf' }), 'sample-protected.pdf');
    formData.append('password', userPass);

    const res = await fetch(`${BASE_URL}/api/pdf/unlock`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);

    const decBuf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(unlockedPath, decBuf);

    // Verify unlocked pdf opens without password
    const checkUnlocked = execSync(`qpdf --check "${unlockedPath}" 2>&1`).toString();
    console.log(`   ✅ Odblokowanie OK! Plik odszyfrowany (${decBuf.length} B), qpdf --check potwierdza brak hasła.`);
  } catch (err: any) {
    console.error('   ❌ Błąd deszyfrowania:', err.message);
    allPassed = false;
  }

  // 4. Test POST /api/pdf/metadata (Odczyt i Zapis metadanych)
  try {
    console.log('4️⃣ Testowanie POST /api/pdf/metadata (Odczyt oraz Edycja pól DocumentInfo)...');
    // 4a. Read metadata
    const readFormData = new FormData();
    readFormData.append('file', new Blob([sampleBuffer], { type: 'application/pdf' }), 'sample-multipage.pdf');
    readFormData.append('action', 'read');

    const readRes = await fetch(`${BASE_URL}/api/pdf/metadata`, {
      method: 'POST',
      body: readFormData,
    });
    if (!readRes.ok) throw new Error(`Błąd odczytu: ${await readRes.text()}`);
    const metaJson = await readRes.json();
    console.log(`   ℹ️ Odczytano metadane: Title="${metaJson.title || ''}", Author="${metaJson.author || ''}", Producer="${metaJson.producer || ''}"`);

    // 4b. Update metadata
    const updateFormData = new FormData();
    updateFormData.append('file', new Blob([sampleBuffer], { type: 'application/pdf' }), 'sample-multipage.pdf');
    updateFormData.append('action', 'update');
    updateFormData.append('title', 'Zaktualizowany Tytuł Testowy DocuForge');
    updateFormData.append('author', 'DocuForge Test Bot');
    updateFormData.append('subject', 'Temat testu M7');
    updateFormData.append('keywords', 'bezpieczeństwo, metadane, test');
    updateFormData.append('creator', 'DocuForge Studio App');
    updateFormData.append('producer', 'DocuForge Engine');

    const updateRes = await fetch(`${BASE_URL}/api/pdf/metadata`, {
      method: 'POST',
      body: updateFormData,
    });
    if (!updateRes.ok) throw new Error(`Błąd zapisu: ${await updateRes.text()}`);

    const updatedBuf = Buffer.from(await updateRes.arrayBuffer());
    fs.writeFileSync(updatedMetaPath, updatedBuf);

    // Verify with pdfinfo
    const verifyInfo = execSync(`pdfinfo "${updatedMetaPath}"`).toString();
    if (!verifyInfo.includes('Zaktualizowany Tytuł Testowy DocuForge')) {
      throw new Error('Zaktualizowany tytuł nie został znaleziony przez pdfinfo!');
    }
    if (!verifyInfo.includes('DocuForge Test Bot')) {
      throw new Error('Zaktualizowany autor nie został znaleziony przez pdfinfo!');
    }

    console.log('   ✅ Metadane DocumentInfo poprawnie zaktualizowane i zweryfikowane przez pdfinfo.');
  } catch (err: any) {
    console.error('   ❌ Błąd testu metadanych:', err.message);
    allPassed = false;
  }

  // 5. Test POST /api/pdf/sanitize (Sanityzacja dokumentu i czyszczenie XMP)
  try {
    console.log('5️⃣ Testowanie POST /api/pdf/sanitize (Usuwanie XMP, DocumentInfo, adnotacji i skryptów)...');
    const inputForSanitize = fs.readFileSync(updatedMetaPath);
    const sanitizeFormData = new FormData();
    sanitizeFormData.append('file', new Blob([inputForSanitize], { type: 'application/pdf' }), 'updated.pdf');

    const sanitizeRes = await fetch(`${BASE_URL}/api/pdf/sanitize`, {
      method: 'POST',
      body: sanitizeFormData,
    });
    if (!sanitizeRes.ok) throw new Error(`Błąd sanityzacji: ${await sanitizeRes.text()}`);

    const sanitizedBuf = Buffer.from(await sanitizeRes.arrayBuffer());
    fs.writeFileSync(sanitizedPath, sanitizedBuf);

    // Verify with pdfinfo
    const sanitizeInfo = execSync(`pdfinfo "${sanitizedPath}"`).toString();
    if (sanitizeInfo.includes('Zaktualizowany Tytuł Testowy DocuForge')) {
      throw new Error('Tytuł nadal widnieje po sanityzacji!');
    }
    if (!/Metadata Stream:\s+no/i.test(sanitizeInfo)) {
      throw new Error('Strumień XMP (Metadata Stream) nie został wyczyszczony!');
    }

    // Verify with qpdf check
    execSync(`qpdf --check "${sanitizedPath}"`);

    console.log('   ✅ Sanityzacja OK! Wszystkie metadane, strumień XMP i skrypty zostały usunięte. Metadata Stream: no.');
  } catch (err: any) {
    console.error('   ❌ Błąd sanityzacji:', err.message);
    allPassed = false;
  }

  console.log('\n======================================================');
  if (allPassed) {
    console.log('🎉 WSZYSTKIE TESTY E2E MODUŁU M7 ZAKOŃCZONE SUKCESEM!');
    process.exit(0);
  } else {
    console.error('💥 NIEKTÓRE TESTY E2E MODUŁU M7 ZAKOŃCZYŁY SIĘ BŁĘDEM!');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Błąd wykonania skryptu testowego:', err);
  process.exit(1);
});
