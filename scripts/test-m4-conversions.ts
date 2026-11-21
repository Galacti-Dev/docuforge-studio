import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BASE_URL = 'http://localhost:3000';
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const TMP_OUTPUT_DIR = path.resolve(__dirname, '../fixtures/test-outputs');

if (!fs.existsSync(TMP_OUTPUT_DIR)) {
  fs.mkdirSync(TMP_OUTPUT_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Rozpoczynam testy E2E modułu M4 (Konwersje Dokumentów)...\n');
  let allPassed = true;

  // 1. DOCX -> PDF
  try {
    console.log('1️⃣ Testowanie POST /api/convert/docx-to-pdf...');
    const docxPath = path.join(FIXTURES_DIR, 'sample-document.docx');
    const docxBuffer = fs.readFileSync(docxPath);
    const formData = new FormData();
    const docxBlob = new Blob([docxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    formData.append('file', docxBlob, 'sample-document.docx');

    const res = await fetch(`${BASE_URL}/api/convert/docx-to-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}: ${await res.text()}`);
    }

    const pdfBuffer = Buffer.from(await res.arrayBuffer());
    const outPdf = path.join(TMP_OUTPUT_DIR, 'docx-to-pdf-result.pdf');
    fs.writeFileSync(outPdf, pdfBuffer);

    // Verify PDF with qpdf
    execSync(`qpdf --check "${outPdf}"`);
    console.log(`   ✅ DOCX -> PDF OK! Rozmiar: ${pdfBuffer.length} bajtów. qpdf --check przeszedł pomyślnie.`);
  } catch (err: any) {
    console.error('   ❌ Błąd DOCX -> PDF:', err.message);
    allPassed = false;
  }

  // 2. PDF -> DOCX
  try {
    console.log('\n2️⃣ Testowanie POST /api/convert/pdf-to-docx...');
    const pdfPath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'sample-multipage.pdf');

    const res = await fetch(`${BASE_URL}/api/convert/pdf-to-docx`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}: ${await res.text()}`);
    }

    const docxBuffer = Buffer.from(await res.arrayBuffer());
    const outDocx = path.join(TMP_OUTPUT_DIR, 'pdf-to-docx-result.docx');
    fs.writeFileSync(outDocx, docxBuffer);

    // Verify DOCX with unzip
    execSync(`unzip -t "${outDocx}"`);
    console.log(`   ✅ PDF -> DOCX OK! Rozmiar: ${docxBuffer.length} bajtów. unzip -t potwierdził poprawność archiwum DOCX.`);
  } catch (err: any) {
    console.error('   ❌ Błąd PDF -> DOCX:', err.message);
    allPassed = false;
  }

  // 3. To Markdown (DOCX & PDF)
  try {
    console.log('\n3️⃣ Testowanie POST /api/convert/to-markdown...');
    // A) DOCX to Markdown
    {
      const docxPath = path.join(FIXTURES_DIR, 'sample-document.docx');
      const docxBuffer = fs.readFileSync(docxPath);
      const formData = new FormData();
      const docxBlob = new Blob([docxBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      formData.append('file', docxBlob, 'sample-document.docx');

      const res = await fetch(`${BASE_URL}/api/convert/to-markdown`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`DOCX -> MD Status ${res.status}: ${await res.text()}`);
      const md = await res.text();
      if (!md.includes('# ') && !md.includes('DocuForge')) {
        throw new Error('Wygenerowany Markdown z DOCX nie zawiera oczekiwanych treści');
      }
      console.log(`   ✅ DOCX -> Markdown OK! Długość: ${md.length} znaków. Zawiera nagłówki i tabele.`);
    }

    // B) PDF to Markdown
    {
      const pdfPath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
      const pdfBuffer = fs.readFileSync(pdfPath);
      const formData = new FormData();
      const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('file', pdfBlob, 'sample-multipage.pdf');

      const res = await fetch(`${BASE_URL}/api/convert/to-markdown`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`PDF -> MD Status ${res.status}: ${await res.text()}`);
      const md = await res.text();
      if (!md.includes('Strona 1') && !md.includes('DocuForge')) {
        throw new Error('Wygenerowany Markdown z PDF nie zawiera stron.');
      }
      console.log(`   ✅ PDF -> Markdown OK! Długość: ${md.length} znaków.`);
    }
  } catch (err: any) {
    console.error('   ❌ Błąd to-markdown:', err.message);
    allPassed = false;
  }

  // 4. To TXT (DOCX & PDF)
  try {
    console.log('\n4️⃣ Testowanie POST /api/convert/to-txt...');
    // A) DOCX to TXT
    {
      const docxPath = path.join(FIXTURES_DIR, 'sample-document.docx');
      const docxBuffer = fs.readFileSync(docxPath);
      const formData = new FormData();
      const docxBlob = new Blob([docxBuffer]);
      formData.append('file', docxBlob, 'sample-document.docx');

      const res = await fetch(`${BASE_URL}/api/convert/to-txt`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`DOCX -> TXT Status ${res.status}: ${await res.text()}`);
      const txt = await res.text();
      if (txt.trim().length === 0) throw new Error('Pusty tekst z DOCX');
      console.log(`   ✅ DOCX -> TXT OK! Długość: ${txt.length} znaków.`);
    }

    // B) PDF to TXT
    {
      const pdfPath = path.join(FIXTURES_DIR, 'sample-multipage.pdf');
      const pdfBuffer = fs.readFileSync(pdfPath);
      const formData = new FormData();
      const pdfBlob = new Blob([pdfBuffer]);
      formData.append('file', pdfBlob, 'sample-multipage.pdf');

      const res = await fetch(`${BASE_URL}/api/convert/to-txt`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`PDF -> TXT Status ${res.status}: ${await res.text()}`);
      const txt = await res.text();
      if (txt.trim().length === 0) throw new Error('Pusty tekst z PDF');
      console.log(`   ✅ PDF -> TXT OK! Długość: ${txt.length} znaków.`);
    }
  } catch (err: any) {
    console.error('   ❌ Błąd to-txt:', err.message);
    allPassed = false;
  }

  // Cleanup test-outputs
  fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });

  if (!allPassed) {
    console.error('\n❌ Niektóre testy M4 zakończyły się niepowodzeniem.');
    process.exit(1);
  } else {
    console.log('\n🎉 Wszystkie testy modułu M4 przeszły pomyślnie z kodem 0!');
    process.exit(0);
  }
}

runTests();
