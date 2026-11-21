# PROGRESS – DocuForge Studio

Aplikacja: **DocuForge Studio**  
Lokalizacja: `~/OpenBot/Shared/docuforge-studio/`  
Główny Architekt: `@Pdf Architekt`  
Główny Programista: `@Pdf Developer`  
Inżynier QA / Tester: `@Pdf Tester`  

---

## 📊 Status Ogólny Projektu

| Kamień Milowy | Moduł | Status | Odpowiedzialny | Weryfikacja Build & TypeCheck | Weryfikacja QA (E2E Fixtures) |
|---|---|:---:|:---:|:---:|:---:|
| **M1** | Architektura, Setup, Limity 100MB & Fixtures | 🟢 Zatwierdzone przez QA | `@Pdf Tester` | [x] Sukces (build 0, tsc 0) | [x] Sukces (qpdf 1.7 OK, docx zip OK, dev 200 OK) |
| **M2** | Core UI, Layout Dark Mode, Reader (PDF & DOCX) | 🟢 Zatwierdzone przez QA | `@Pdf Tester` | [x] Sukces (build 0, tsc 0) | [x] Sukces (Canvas render, zoom/rotacja, docx OK) |
| **M3** | Organizacja stron PDF (Merge, Split, Rotate, DnD) | 🟢 Zatwierdzone przez QA | `@Pdf Tester` | [x] Sukces (build 0, tsc 0) | [x] Sukces (qpdf OK, merge 6p, split 3p/zip, org OK) |
| **M4** | Konwersje Dokumentów (DOCX <-> PDF, MD, TXT) | 🟢 Zatwierdzone przez QA | `@Pdf Tester` | [x] Sukces (build 0, tsc 0) | [x] Sukces (soffice PDF qpdf OK, docx zip OK, MD/TXT OK) |
| **M5** | Konwersje Graficzne (PDF <-> PNG/JPG/WebP + ZIP) | 🟢 Zatwierdzone przez QA | `@Pdf Tester` | [x] Sukces (build 0, tsc 0) | [x] Sukces (ZIP 266KB OK, WebP OK, images->pdf qpdf OK, UI OK) |
| **M6** | Kompresja i Optymalizacja PDF (3 profile GS) | 🟢 Zatwierdzone przez QA | `@Pdf Tester` | [x] Sukces (build 0, tsc 0) | [x] Sukces (GS printer/ebook/screen OK, qpdf linearize OK, UI 7% OK) |
| **M7** | Bezpieczeństwo i Metadane (Szyfrowanie, Sanityzacja) | 🟢 Zatwierdzone przez QA | `@Pdf Tester` | [x] Sukces (build 0, tsc 0) | [x] Sukces (AES-256 OK, unlock 400/200 OK, meta OK, sanitize no-XMP OK, UI OK) |
| **M8** | Znaki wodne, Numeracja stron i Podpis Canvas/PNG | 🟢 Zatwierdzone przez QA | `@Pdf Tester` | [x] Sukces (build 0, tsc 0) | [x] Sukces (watermark qpdf OK, page-num 1-5 OK, sign canvas qpdf OK, UI OK) |
| **M9** | OCR (Tesseract.js PL/EN) i Wizualny Diff dokumentów | 🟢 Zatwierdzone przez QA | `@Pdf Tester` | [x] Sukces (build 0, tsc 0) | [x] Sukces (OCR pol 94% OK, DOCX/PDF zip/qpdf OK, diff 12%/100% OK, UI OK) |
| **M10** | Kolejka wsadowa Batch, Skróty, UX & Audyt E2E | 🟢 Zatwierdzone przez QA | `@Pdf Tester` | [x] Sukces (build 0, tsc 0) | [x] Sukces (10/10 PASSED verify-all.ts, batch ZIP OK, skróty OK, UI OK) |
| **M11** | Interaktywne Formularze PDF (AcroForms: edycja, import/export JSON, flattening) | ⚪ Oczekuje | `@Pdf Developer` | [ ] Do weryfikacji | [ ] Do weryfikacji |
| **M12** | Narzędzia Adnotacji i Bezpieczna Redakcja Trwała (True Redaction RODO, kształty) | ⚪ Oczekuje | `@Pdf Developer` | [ ] Do weryfikacji | [ ] Do weryfikacji |
| **M13** | Archiwizacja PDF/A (1b/2b/3b), Załączniki (Embedded Files) i Preflight Inspector | ⚪ Oczekuje | `@Pdf Developer` | [ ] Do weryfikacji | [ ] Do weryfikacji |

Legenda statusu:
- ⚪ Oczekuje
- 🟡 Do realizacji / W trakcie
- 🔵 Zaimplementowane (oczekuje na testy QA)
- 🟢 Zatwierdzone przez QA `[x]`

---

## 📋 Szczegółowy Zakres i Kryteria Akceptacji Kamieni Milowych

### [x] M1: Architektura, Setup i Pliki Testowe
- **Cel:** Inicjalizacja projektu Next.js 15 (App Router, TypeScript, Tailwind CSS, Lucide Icons, podstawowe biblioteki) oraz przygotowanie skryptu generatora plików testowych.
- **Zadania @Pdf Developer:**
  1. Inicjalizacja Next.js 15 w bieżącym katalogu (`package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`).
  2. Konfiguracja zależności:
     - `pdf-lib`, `pdfjs-dist`, `mammoth`, `docx`, `jszip`, `tesseract.js`, `diff`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `lucide-react`, `clsx`, `tailwind-merge`.
  3. Konfiguracja `next.config.ts`:
     - Obsługa uploadu do 100 MB (`experimental.serverActions.bodySizeLimit = '100mb'`).
     - Konfiguracja reguł webpack / turbopack dla `pdfjs-dist` (obsługa `canvas`, wykluczenie `canvas` w środowisku serwerowym).
  4. Moduł pomocniczy `src/lib/server/cli-tools.ts`:
     - Detekcja i weryfikacja narzędzi systemowych Linuxa (`soffice`, `gs`, `qpdf`, `pdftoppm`).
     - Zarządzanie katalogiem tymczasowym (`/tmp/docuforge-studio/...`) z funkcją automatycznego sprzątania `cleanupTempFiles(paths: string[])`.
  5. Skrypt `scripts/generate-fixtures.ts` uruchamiany przez `npx tsx scripts/generate-fixtures.ts`:
     - Tworzy katalog `fixtures/`.
     - Generuje `sample-multipage.pdf` (min. 5 stron z nagłówkami, akapitami i numeracją).
     - Generuje `sample-images.pdf` (PDF z osadzonymi obrazami rastrowymi).
     - Generuje `sample-document.docx` (sformatowany plik DOCX z tabelą 3x3, nagłówkami H1-H3, listą punktowaną i pogrubieniem).
     - Generuje `sample-image1.jpg` i `sample-image2.png` (obrazy do tworzenia PDF i testów graficznych).
     - Generuje `sample-scanned.png` (obraz z wyrenderowanym polskim i angielskim tekstem do testów OCR).
- **Kryteria Akceptacji M1:**
  - `npm run build` kończy się sukcesem (kod wyjścia 0).
  - `npx tsc --noEmit` nie zwraca żadnych błędów.
  - Uruchomienie `npx tsx scripts/generate-fixtures.ts` tworzy kompletne, otwieralne pliki w `fixtures/` o rozmiarach > 0 bajtów.

---

### [x] M2: Core UI, Layout Dark Mode i Uniwersalny Reader/Podgląd
- **Cel:** Budowa spójnego, minimalistycznego shellu aplikacji w Dark Mode oraz wydajnego komponentu podglądu dokumentów PDF i DOCX.
- **Specyfikacja Stylistyczna:**
  - Tło główne: `#141414` (`bg-[#141414]`).
  - Karty, panele i sidebar: `#1f1f1f` (`bg-[#1f1f1f]`).
  - Obramowania i separatory: `#2e2e2e` (`border-[#2e2e2e]`).
  - Kolor tekstu: podstawowy `#f1f1f1`, przygaszony `#9ca3af`.
  - Akcenty: `#3b82f6` (błękit akcji) oraz `#10b981` (sukces/pobieranie).
  - Promienie zaokrągleń: `rounded-2xl` (panele i karty), `rounded-xl` (przyciski i inputy).
- **Zadania @Pdf Developer:**
  1. `src/components/layout/Sidebar.tsx`:
     - Kategorie: Organizacja, Konwersja, Grafika, Optymalizacja, Bezpieczeństwo, Narzędzia Zaawansowane.
     - Przycisk szybkiego wywołania wyszukiwarki (`Ctrl+K`).
  2. `src/components/layout/CommandSearch.tsx`:
     - Okno modalne wyszukiwarki wszystkich 10 modułów z filtrowaniem na żywo po nazwie i opisie.
  3. `src/components/workspace/DropZone.tsx`:
     - Uniwersalna strefa Drag & Drop z obsługą upuszczania plików `.pdf`, `.docx`, `.png`, `.jpg`, `.webp`.
     - Walidacja typów MIME oraz limitu rozmiaru (100 MB).
  4. `src/components/viewer/PdfViewer.tsx`:
     - Wykorzystanie `pdfjs-dist` (klient) do renderowania stron na elementach `<canvas>`.
     - Nawigacja stronami (poprzednia/następna, skok do strony, miniatury w pasku bocznym podglądu).
     - Zoom (50%, 75%, 100%, 125%, 150%, 200%, dopasuj do szerokości).
  5. `src/components/viewer/DocxViewer.tsx`:
     - Parsowanie pliku DOCX w locie przez `mammoth.convertToHtml` i renderowanie w bezpiecznym kontenerze z zachowaniem stylów tabel i formatowania.
  6. `src/components/workspace/RecentFiles.tsx`:
     - Lista ostatnio otwieranych plików w sesji (zapis metadanych w `localStorage`).
- **Kryteria Akceptacji M2:**
  - Interfejs w pełni w języku polskim, z zachowaniem ścisłej palety barw i geometrii `rounded-2xl` / `rounded-xl`.
  - Wgranie `fixtures/sample-multipage.pdf` wyświetla czytelne strony z działającym zoomem i przełączaniem stron.
  - Wgranie `fixtures/sample-document.docx` wyświetla sformatowany dokument wraz z tabelami.

---

### [x] M3: Organizacja stron PDF – Merge, Split, Organizer
- **Cel:** Narzędzia do łączenia, dzielenia, obracania, usuwania i reorganizacji kolejności stron PDF.
- **Zadania @Pdf Developer:**
  1. API `/api/pdf/merge` (POST):
     - Przyjmuje tablicę plików PDF i kolejność łączenia.
     - Łączy strony za pomocą `pdf-lib` z zachowaniem struktury i formularzy.
     - Zwraca połączony plik PDF.
  2. API `/api/pdf/split` (POST):
     - Tryby:
       - `single`: każda strona jako osobny PDF spakowany do ZIP (`jszip`).
       - `ranges`: zakresy stron (np. `1-3,5,8-10`) wycięte do osobnych plików lub jednego PDF.
       - `fixed`: podział co N stron.
     - Zwraca pojedynczy PDF (jeśli 1 zakres) lub plik ZIP.
  3. API `/api/pdf/organize` (POST):
     - Przyjmuje instrukcje operacji na stronach: `[{ pageIndex: 0, rotate: 90 }, { pageIndex: 1, delete: true }, { pageIndex: 2, duplicate: 2 }]`.
     - Zwraca zreorganizowany plik PDF.
  4. Frontend UI:
     - Widok siatki miniatur stron z `@dnd-kit` umożliwiający intuicyjne przeciąganie i upuszczanie (zmiana kolejności).
     - Przyciski na kafelku każdej strony: Obróć o 90°, Duplikuj, Usuń.
     - Przycisk "Pobierz zreorganizowany PDF".
- **Kryteria Akceptacji M3:**
  - Połączenie dwóch plików PDF generuje poprawny dokument o sumarycznej liczbie stron.
  - Podział wielostronicowego PDF na zakres `2-4` generuje otwieralny PDF z dokładnie 3 stronami.
  - Zmiana kolejności i obrót strony o 90° w UI skutkuje fizycznie obróconą stroną w pobranym pliku.

---

### [x] M4: Konwersje Dokumentów – DOCX <-> PDF, MD, TXT
- **Cel:** Dwukierunkowa konwersja dokumentów tekstowych z zachowaniem stylów i struktur.
- **Zadania @Pdf Developer:**
  1. API `/api/convert/docx-to-pdf` (POST):
     - Przyjmuje plik DOCX.
     - Konwertuje w środowisku Node.js za pomocą LibreOffice headless:
       `soffice --headless --convert-to pdf --outdir /tmp/... /tmp/...input.docx`.
     - Zwraca wygenerowany plik `.pdf`.
  2. API `/api/convert/pdf-to-docx` (POST):
     - Ekstrakcja tekstu, podziałów akapitów i nagłówków z pliku PDF.
     - Generowanie natywnego pliku `.docx` za pomocą biblioteki `docx` (`Paragraph`, `TextRun`, `HeadingLevel`).
     - Zwraca poprawny plik `.docx`.
  3. API `/api/convert/to-markdown` (POST):
     - Konwersja DOCX -> Markdown za pomocą `mammoth` z konwersją nagłówków, list i tabel na składnię GFM.
     - Konwersja PDF -> Markdown z ekstrakcją strukturalną.
     - Zwraca plik `.md` lub tekst JSON z podglądem.
  4. API `/api/convert/to-txt` (POST):
     - Szybka ekstrakcja czystego tekstu UTF-8 z zachowaniem znaków nowej linii.
- **Kryteria Akceptacji M4:**
  - Plik `fixtures/sample-document.docx` konwertuje się do PDF i otwiera bez błędów w przeglądarce.
  - Plik `fixtures/sample-multipage.pdf` konwertuje się do DOCX i daje się otworzyć w LibreOffice / Wordzie.
  - Konwersja do Markdown zachowuje nagłówki i akapity.

---

### [x] M5: Konwersje Graficzne – PDF <-> Obrazy
- **Cel:** Eksport stron PDF do plików rastrowych oraz scalanie obrazów w dokument PDF.
- **Zadania @Pdf Developer:**
  1. API `/api/convert/pdf-to-images` (POST):
     - Parametry: format (`png`, `jpeg`, `webp`), DPI (`72`, `150`, `300`), zakres stron.
     - Wykorzystanie `pdftoppm -png -r <dpi> ...` dla maksymalnej wydajności i wierności wektorowej.
     - Zwraca pojedynczy obraz lub archiwum ZIP zawierające ponumerowane obrazy (`strona-1.png`, `strona-2.png`).
  2. API `/api/convert/images-to-pdf` (POST):
     - Przyjmuje tablicę obrazów (JPG, PNG, WebP) z określoną kolejnością.
     - Opcje: format strony (`A4`, `Letter`, `Dopasowany do obrazu`), orientacja (`Pionowa`, `Pozioma`, `Auto`), marginesy (`Brak`, `Wąskie - 10mm`, `Standardowe - 20mm`).
     - Tworzenie PDF za pomocą `pdf-lib` z osadzaniem `embedJpg` / `embedPng`.
     - Zwraca gotowy plik PDF.
  3. UI:
     - Selektor jakości DPI i formatu wyjściowego.
     - Podgląd siatki dodanych zdjęć z możliwością przeciągania kolejności.
- **Kryteria Akceptacji M5:**
  - Eksport 5-stronicowego PDF przy 150 DPI generuje paczkę ZIP z 5 ostrymi plikami PNG.
  - Połączenie 2 plików JPG w formacie A4 generuje 2-stronicowy plik PDF o wymiarach 595.28 x 841.89 pt.

---

### [x] M6: Kompresja i Optymalizacja PDF
- **Cel:** Zmniejszanie rozmiaru plików PDF z zachowaniem czytelności i kontrolą kompresji.
- **Zadania @Pdf Developer:**
  1. API `/api/pdf/compress` (POST):
     - Profile kompresji:
       - `low` (Lekka kompresja / wysoka jakość): Ghostscript `-dPDFSETTINGS=/printer` (300 DPI, delikatna kompresja obrazów).
       - `balanced` (Zbalansowana / zalecana): Ghostscript `-dPDFSETTINGS=/ebook` (150 DPI, optymalny kompromis).
       - `extreme` (Maksymalna kompresja): Ghostscript `-dPDFSETTINGS=/screen` (72 DPI, agresywna kompresja).
     - Dodatkowa linearyzacja strumieni przez `qpdf --linearize`.
     - Zwraca skompresowany plik wraz z nagłówkami `X-Original-Size` i `X-Compressed-Size`.
  2. UI:
     - Karty wyboru profilu (Lekka, Zbalansowana, Maksymalna) z opisem przeznaczenia.
     - Wizualny wskaźnik redukcji rozmiaru (pasek postępu, etykiety "Zmniejszono o X% / Zaoszczędzono Y MB").
- **Kryteria Akceptacji M6:**
  - Skompresowany plik `fixtures/sample-images.pdf` w profilu `balanced` ma mniejszy rozmiar niż plik wejściowy.
  - Wygenerowany plik otwiera się poprawnie, a tekst pozostaje w pełni wektorowy i czytelny.

---

### [x] M7: Bezpieczeństwo i Metadane
- **Cel:** Ochrona dokumentów hasłem, usuwanie zabezpieczeń, edycja metadanych oraz pełna sanityzacja.
- **Zadania @Pdf Developer:**
  1. API `/api/pdf/protect` (POST):
     - Parametry: hasło użytkownika (otwarcie), opcjonalne hasło właściciela (uprawnienia druku i kopiowania), szyfrowanie 128/256-bit AES za pomocą `qpdf`.
  2. API `/api/pdf/unlock` (POST):
     - Parametry: plik PDF, hasło.
     - Weryfikacja poprawności hasła i wygenerowanie odszyfrowanego pliku bez haseł.
  3. API `/api/pdf/metadata` (GET/POST):
     - GET: odczyt pól (Tytuł, Autor, Temat, Słowa kluczowe, Program tworzący, Data utworzenia/modyfikacji).
     - POST: aktualizacja wybranych pól metadanych w `pdf-lib`.
  4. API `/api/pdf/sanitize` (POST):
     - Usunięcie wszystkich metadanych XMP/DocumentInfo, ukrytych załączników, komentarzy, skryptów JavaScript i historii wersji.
  5. UI:
     - Formularz haseł z podglądem siły hasła.
     - Formularz edycji metadanych z przyciskiem "Wyczyść wszystkie (Sanityzacja)".
- **Kryteria Akceptacji M7:**
  - Zaszyfrowany PDF żąda hasła przy próbie otwarcia w dowolnej przeglądarce PDF.
  - Podanie prawidłowego hasła w `/api/pdf/unlock` zwraca plik, który otwiera się bez promptu o hasło.
  - Sanityzacja zeruje metadane `Author`, `Title`, `Producer` i usuwa metadane XMP.

---

### [x] M8: Znaki wodne, Numeracja stron i Podpis PDF
- **Cel:** Narzędzia do oznaczania praw autorskich, numerowania i składania podpisów.
- **Zadania @Pdf Developer:**
  1. API `/api/pdf/watermark` (POST):
     - Parametry: tekst znaku wodnego, rozmiar fontu, rotacja (-90° do +90°), kolor HEX, przezroczystość (0.1 - 1.0), pozycja (środek, kafelkowanie po całej stronie, nagłówek, stopka).
     - Rysowanie tekstu na warstwie stron za pomocą `pdf-lib`.
  2. API `/api/pdf/page-numbers` (POST):
     - Parametry: szablon formatu (`Strona {n} z {total}`, `{n}/{total}`, `- {n} -`), pozycja (dół-środek, dół-prawo, dół-lewo, góra-prawo), margines od krawędzi, numer strony początkowej.
     - Automatyczne wyliczanie współrzędnych i dodawanie numeracji.
  3. API `/api/pdf/sign` (POST):
     - Parametry: plik PDF, numer strony, obraz podpisu (base64 PNG), współrzędne X, Y oraz szerokość/wysokość w punktach PDF.
     - Osadzenie przezroczystego PNG w dokumencie.
  4. UI:
     - Podgląd na żywo znaku wodnego nałożonego na wybraną stronę.
     - Moduł podpisu:
       - Rysowanie odręczne na elemencie `<canvas>` (z obsługą myszy i dotyku, czyszczeniem i cofaniem).
       - Opcja wgrania gotowego pliku graficznego podpisu.
       - Wizualne przeciąganie ramki podpisu po podglądzie strony PDF przed zatwierdzeniem.
- **Kryteria Akceptacji M8:**
  - Znak wodny pojawia się na wszystkich stronach z wybranym kątem i przezroczystością.
  - Numeracja "Strona 1 z 5" pojawia się precyzyjnie w wybranej pozycji na każdej stronie.
  - Narysowany na canvasie podpis zostaje osadzony w wybranym miejscu na pobranym pliku PDF.

---

### [x] M9: OCR i Porównywarka Dokumentów Diff
- **Cel:** Rozpoznawanie tekstu ze skanów (język polski i angielski) oraz porównywanie wersji dokumentów.
- **Zadania @Pdf Developer:**
  1. Moduł OCR (`src/lib/ocr/tesseract-worker.ts` & `/api/ocr/process`):
     - Obsługa silnika `tesseract.js` z modelami językowymi `pol` i `eng`.
     - Konwersja stron PDF na obrazy, przetwarzanie OCR z raportowaniem postępu (0-100%).
     - Opcje eksportu: czysty tekst `.txt`, dokument `.docx` lub przeszukiwalny PDF z warstwą tekstową.
  2. Moduł Diff Dokumentów (`src/lib/diff/document-diff.ts` & UI):
     - Obsługa porównania PDF vs PDF oraz DOCX vs DOCX.
     - Ekstrakcja czystego tekstu z obu wersji i wyliczenie różnic za pomocą biblioteki `diff` (jsdiff).
     - Tryby wizualizacji różnic w UI:
       - Widok side-by-side (dwie kolumny obok siebie).
       - Widok zunifikowany (unified diff z zielonym tłem dla dodanych słów/zdań i czerwonym tłem z przekreśleniem dla usuniętych).
       - Statystyki: liczba dodanych słów, usuniętych słów, procent podobieństwa.
- **Kryteria Akceptacji M9:**
  - OCR poprawnie odczytuje polskie znaki diakrytyczne (np. "zażółć gęślą jaźń") z pliku `fixtures/sample-scanned.png`.
  - Pasek postępu OCR informuje o aktualnym etapie przetwarzania.
  - Narzędzie Diff wykrywa modyfikacje tekstu między dwoma plikami i podświetla je odpowiednimi kolorami.

---

### [x] M10: Kolejka wsadowa Batch, Dopieszczenie UX i Audyt Końcowy
- **Cel:** Obsługa przetwarzania wielu plików naraz, skróty klawiszowe, responsywność i całościowy audyt systemu.
- **Zadania @Pdf Developer:**
  1. Komponent `BatchQueue.tsx`:
     - Możliwość wgrania do 20 plików naraz.
     - Masowe aplikowanie akcji (np. "Kompresuj wszystkie", "Konwertuj wszystkie DOCX do PDF", "Dodaj znak wodny do wszystkich", "Sanityzuj / Anonimizuj wszystkie").
     - Zbiorcze pobieranie wyników jako archiwum ZIP.
  2. Dopracowanie UX:
     - Globalne skróty klawiszowe: `Ctrl+K` (wyszukiwarka), `Ctrl+O` (dodaj pliki), `Ctrl+Enter` (uruchom operację), `Esc` (zamknij podgląd/modal).
     - Nowoczesny system powiadomień toast (ToastContext) w stylu Dark Mode z obsługą sukcesów, błędów i walidacji limitu 100 MB.
     - Pełna responsywność dla ekranów od 375px do 4K (mobilne menu szufladowe drawer, optymalizacja widoków).
  3. Skrypt weryfikacyjny E2E `scripts/verify-all.ts`:
     - Testuje kolejno wszystkie endpointy API na rzeczywistych plikach z katalogu `fixtures/`.
     - Weryfikuje poprawność nagłówków, kodów 200 oraz rozmiarów plików wynikowych.
     - Raportuje 10/10 modułów ze statusem PASSED.
- **Kryteria Akceptacji M10:**
  - `npm run build` kompiluje się z zerem błędów i ostrzeżeń TypeScript.
  - Wszystkie 10 modułów działa bez atrapek (realne przetwarzanie binarne).
  - Skrypt `verify-all.ts` kończy się sukcesem dla wszystkich modułów (10/10 PASSED).

---

### [ ] M11: Interaktywne Formularze PDF (AcroForms – Inspekcja, Wypełnianie, Eksport/Import JSON i Flattening)
- **Cel:** Pełna obsługa interaktywnych formularzy PDF (AcroForms): inspekcja istniejących pól, edycja i wypełnianie wartości w UI, import/eksport danych do JSON oraz trwałe spłaszczanie (form flattening).
- **Zadania @Pdf Developer:**
  1. API Routes:
     - `POST /api/pdf/forms/inspect`:
       - Przyjmuje plik PDF.
       - Zwraca listę wykrytych pól: `name`, `type` (`text` | `checkbox` | `radio` | `dropdown` | `button`), `value`, `options` (dla dropdown/radio), `readOnly`, `required`.
     - `POST /api/pdf/forms/fill`:
       - Przyjmuje plik PDF, mapę wartości pól `{ [fieldName: string]: string | boolean }` oraz flagę `flatten?: boolean`.
       - Wypełnia pola formularza za pomocą `pdf-lib` Form API (`getTextField`, `getCheckBox`, `getDropdown`, `getRadioGroup`).
       - Opcjonalnie wywołuje `form.flatten()` (zamienia pola interaktywne na statyczny tekst/grafikę w PDF).
       - Zwraca zmodyfikowany/spłaszczony plik PDF jako strumień binarny.
  2. Komponent UI `src/components/tools/FormsTool.tsx`:
     - Zakładka "Wypełnianie Formularza": dynamiczny formularz generowany z wykrytych pól PDF (inputy, checkboxy, selecty).
     - Zakładka "Import / Eksport JSON": pobieranie wypełnionych wartości jako plik `.json` oraz wczytywanie pliku `.json` do automatycznego wypełnienia formularza.
     - Przełącznik "Spłaszcz formularz (zabezpiecz przed dalszą modyfikacją pól)".
     - Integracja w `Workspace.tsx`, `Sidebar.tsx` oraz `CommandSearch.tsx`.
  3. Generator pliku testowego w `scripts/generate-fixtures.ts`:
     - Generowanie `fixtures/sample-form.pdf` zawierającego pola: `imie_nazwisko`, `email`, `zgoda_rodo` (checkbox), `kraj` (dropdown z opcjami PL/EN/DE).
  4. Skrypt testowy `scripts/test-m11-forms.ts`:
     - Test 1: Inspekcja `sample-form.pdf` i weryfikacja wykrycia wszystkich pól.
     - Test 2: Wypełnienie formularza danymi testowymi i weryfikacja zapisu.
     - Test 3: Weryfikacja spłaszczenia `flatten()` (ponowna inspekcja zwraca 0 aktywnych pól).
     - Test 4: Walidacja binarna pliku wynikowego przez `qpdf --check`.
- **Kryteria Akceptacji M11:**
  - `sample-form.pdf` generuje się bezbłędnie i zawiera interaktywne pola.
  - Endpoint `/api/pdf/forms/inspect` poprawnie listuje wszystkie pola i ich typy.
  - Endpoint `/api/pdf/forms/fill` bezbłędnie zapisuje wartości i przy `flatten: true` spłaszcza dokument.
  - `npm run build` i `npx tsc --noEmit` kończą się kodem 0.

---

### [ ] M12: Narzędzia Adnotacji i Bezpieczna Redakcja Trwała (True Redaction RODO/GDPR)
- **Cel:** Wzbogacanie dokumentów o adnotacje wizualne (zakreślacze, kształty, notatki) oraz trwała, nieodwracalna redakcja (usuwanie danych wrażliwych RODO/GDPR z fizycznym niszczeniem warstwy tekstowej).
- **Zadania @Pdf Developer:**
  1. API Routes:
     - `POST /api/pdf/annotate`:
       - Przyjmuje plik PDF oraz listę adnotacji: `{ pageIndex: number, type: 'highlight' | 'rect' | 'arrow' | 'note', x: number, y: number, width: number, height: number, color: string, opacity: number, text?: string }`.
       - Nanosi elementy wektorowe na wskazanych stronach za pomocą `pdf-lib`.
     - `POST /api/pdf/redact`:
       - Przyjmuje plik PDF oraz listę obszarów do zaczernienia: `{ pageIndex: number, x: number, y: number, width: number, height: number }` lub wzorce tekstowe/regexy (np. PESEL, NIP, e-mail).
       - Realizuje **True Redaction**: nanosi nieprzezroczysty czarny prostokąt i fizycznie niszczy/usuwa warstwę tekstową pod redagowanym obszarem, gwarantując, że tekst nie może być skopiowany ani odczytany przez `pdftotext`.
  2. Komponent UI `src/components/tools/AnnotateRedactTool.tsx`:
     - Tryb "Adnotacje i Zakreślanie": narzędzia zakreślacza, prostokąta, strzałki i notatki tekstowej na Canvasie.
     - Tryb "Trwała Redakcja RODO": interaktywne zaznaczanie obszaru ramką lub szybkie maskowanie regułami.
     - Wyraźne ostrzeżenie o nieodwracalnym usunięciu danych przed zastosowaniem redakcji.
     - Integracja w `Workspace.tsx`, `Sidebar.tsx` oraz `CommandSearch.tsx`.
  3. Skrypt testowy `scripts/test-m12-redact.ts`:
     - Test 1: Nanoszenie adnotacji i kształtów (qpdf --check kod 0).
     - Test 2: Nanoszenie trwałej redakcji na wskazany fragment tekstu.
     - Test 3: Weryfikacja bezpieczeństwa – `pdftotext` potwierdza brak zredagowanego tekstu w pliku wynikowym.
- **Kryteria Akceptacji M12:**
  - Nanoszenie adnotacji nie narusza struktury PDF (`qpdf --check` kod 0).
  - Trwała redakcja całkowicie usuwa tekst pod zaczernionym prostokątem (`pdftotext` zwraca brak wystąpień tekstu).
  - `npm run build` i `npx tsc --noEmit` kończą się kodem 0.

---

### [ ] M13: Standard Archiwizacyjny PDF/A, Zarządzanie Załącznikami (Embedded Files) i Raport Preflight
- **Cel:** Obsługa międzynarodowego standardu archiwizacji cyfrowej PDF/A (walidacja i konwersja), zarządzanie załącznikami binarnymi wewnątrz PDF (np. e-faktury KSeF / Factur-X / ZUGFeRD) oraz szczegółowa analiza techniczna struktury dokumentu (Preflight Inspector).
- **Zadania @Pdf Developer:**
  1. API Routes:
     - `POST /api/pdf/pdfa`:
       - Przyjmuje plik PDF oraz docelowy poziom zgodności: `PDF/A-1b`, `PDF/A-2b` lub `PDF/A-3b`.
       - Dokonuje konwersji za pomocą Ghostscript (`-dPDFA=...`, profil barwny sRGB ICC, osadzenie fontów i metadane XMP).
     - `POST /api/pdf/attachments/extract`:
       - Skanuje drzewo `/EmbeddedFiles` w PDF i wyodrębnia wszystkie osadzone pliki binarne (XML, CSV, DOCX, obrazy) do archiwum ZIP.
     - `POST /api/pdf/attachments/embed`:
       - Dołącza plik binarny (np. `faktura-ksef.xml`) do wskazanego PDF w strukturze `/Names /EmbeddedFiles` zgodnie ze standardem PDF/A-3.
     - `POST /api/pdf/preflight`:
       - Przeprowadza pełną inspekcję struktury PDF: wersja PDF (1.3-2.0), status linearyzacji, liczba stron, lista czcionek (Type1, TrueType, osadzona vs nieosadzona), obecność formularzy, podpisów, strumieni XMP, adnotacji oraz status zgodności z PDF/A.
  2. Komponent UI `src/components/tools/PdfaAttachmentsTool.tsx`:
     - Zakładka "Konwersja PDF/A": wybór profilu (1b, 2b, 3b) z opisem przeznaczenia archiwizacyjnego.
     - Zakładka "Załączniki dokumentu": lista wykrytych załączników z możliwością pobrania oraz strefa dodania nowego pliku osadzonego w PDF.
     - Zakładka "Raport Preflight": czytelny panel audytu technicznego z możliwością pobrania raportu JSON.
     - Integracja w `Workspace.tsx`, `Sidebar.tsx` oraz `CommandSearch.tsx`.
  3. Skrypt testowy `scripts/test-m13-pdfa.ts`:
     - Test 1: Konwersja do PDF/A i weryfikacja nagłówków XMP/pdfinfo.
     - Test 2: Osadzenie załącznika XML w PDF i weryfikacja integralności.
     - Test 3: Ekstrakcja załącznika i porównanie sumy kontrolnej SHA-256 z oryginałem.
     - Test 4: Inspekcja Preflight na plikach testowych.
- **Kryteria Akceptacji M13:**
  - Konwertowany plik spełnia wymogi profilu PDF/A (potwierdzone przez `pdfinfo` i metadane XMP).
  - Osadzony załącznik zostaje bezbłędnie wyekstrahowany z identyczną sumą SHA-256.
  - Endpoint `/api/pdf/preflight` zwraca kompletny raport techniczny JSON.
  - `npm run build` i `npx tsc --noEmit` kończą się kodem 0.

---

## 🔄 Dziennik Przekazywania Prac (Handover Log)

| Data i Czas | Od kogo | Do kogo | Zakres przekazania / Komunikat |
|---|---|---|---|
| 2026-11-21 15:25 | `@Pdf Architekt` | `@Pdf Developer` | Utworzono kompletną architekturę techniczną `ARCHITECTURE.md` oraz `PROGRESS.md`. Przekazuję realizację **Kamienia Milowego M1** (Inicjalizacja Next.js 15, konfiguracja limitu 100MB, CLI tools helper oraz skrypt generowania `fixtures/`). |
| 2026-11-21 15:35 | `@Pdf Developer` | `@Pdf Tester` | Zrealizowano kamień milowy M1: setup Next.js 15, TypeScript, Tailwind CSS Dark Mode, limit 100MB, helper cli-tools.ts, wygenerowano zestaw fixtures/ (PDF wielostronicowy, PDF z obrazami, DOCX z tabelą, JPG/PNG, skan do OCR). npm run build i npx tsc --noEmit zakończone kodem 0. Przekazano do testów QA. |
| 2026-11-21 15:38 | `@Pdf Tester` | `@Pdf Developer` | Zatwierdzono kamień milowy M1: weryfikacja binarna fixtures/ pomyślna (qpdf check dla obu PDF-ów bez błędów, DOCX zip 17 plików z word/document.xml, PNG/JPG z prawidłowymi nagłówkami), npx tsc i npm run build kod 0, serwer dev na porcie 3000 odpowiada HTTP 200 z poprawnym HTML i motywem dark mode. Port 3000 zwolniony. Przekazano zadanie M2 do realizacji. |
| 2026-11-21 15:42 | `@Pdf Developer` | `@Pdf Tester` | Zrealizowano kamień milowy M2: layout Dark Mode (#141414, #1f1f1f, #2e2e2e, rounded-2xl/xl), Sidebar z kategoriami narzędzi, CommandSearch (Ctrl+K), uniwersalna strefa DropZone z walidacją 100MB, PdfViewer (pdfjs-dist na Canvasie, zoom, rotacja, miniatury stron), DocxViewer (mammoth z formatowaniem tabel), historia RecentFiles oraz endpoint /api/fixtures/[name]. npm run build i npx tsc --noEmit zakończone kodem 0. Przekazano do testów QA. |
| 2026-11-21 15:48 | `@Pdf Tester` | `@Pdf Developer` | Weryfikacja QA kamienia M2: wykryto błąd krytyczny w podglądzie PDF (DataCloneError: Failed to execute 'postMessage' on 'Worker': ArrayBuffer at index 0 is already detached przy ładowaniu sample-multipage.pdf). Wymagane klonowanie bufora file.slice(0) w PdfViewer.tsx lub przekazywanie obiektu File zamiast detached ArrayBuffer z Workspace.tsx. Podgląd DOCX, wyszukiwarka Ctrl+K, Sidebar oraz layout Dark Mode działają w 100% poprawnie. Zwrot do poprawki. |
| 2026-11-21 15:50 | `@Pdf Developer` | `@Pdf Tester` | Naprawiono błąd DataCloneError w PdfViewer.tsx (zabezpieczono klonowanie bufora przed przekazaniem do Web Workera: Uint8Array(buffer.slice(0)) oraz file.slice(0), niszczenie poprzedniego loadingTask) oraz w Workspace.tsx (przekazywanie obiektu File lub świeżej kopii bufora). npm run build i npx tsc --noEmit zakończone kodem 0. Przekazano do re-testu QA. |
| 2026-11-21 15:52 | `@Pdf Tester` | `@Pdf Developer` | Re-test QA M2 zakończony 100% sukcesem: błąd DataCloneError całkowicie wyeliminowany. sample-multipage.pdf renderuje się na Canvasie (892x1262), działa boczny pasek miniatur (5 stron), nawigacja stronami (przejście na stronę 2), zoom (zwiększenie do 140%), rotacja o 90° (wymiary canvas 1473x1041). Podgląd DOCX sample-document.docx renderuje tabelę 4 wiersze i nagłówki. Konsola przeglądarki czysta (0 błędów). M2 zatwierdzone. Przekazano zadanie M3 (Organizacja stron PDF) do realizacji. |
| 2026-11-21 15:58 | `@Pdf Developer` | `@Pdf Tester` | Zrealizowano kamień milowy M3: pełne API Routes (/api/pdf/merge, /api/pdf/split, /api/pdf/organize) z realnym przetwarzaniem przez pdf-lib i jszip, komponenty UI z obsługą @dnd-kit (MergeTool, SplitTool, OrganizeTool z podglądem rotacji, duplikowaniem i usuwaniem stron) zintegrowane w Workspace. Walidacja E2E przez qpdf --check bez błędów. npm run build i npx tsc --noEmit zakończone kodem 0. Przekazano do testów QA. |
| 2026-11-21 16:01 | `@Pdf Tester` | `@Pdf Developer` | Weryfikacja QA kamienia M3 zakończona 100% sukcesem: /api/pdf/merge połączył sample-multipage (5 stron) i sample-images (1 strona) tworząc 6-stronicowy poprawny PDF (qpdf check 0 błędów). /api/pdf/split wyciął zakres '2-4' do 3-stronicowego PDF oraz 'single' do archiwum ZIP z 5 poprawnymi PDF-ami (unzip -t OK). /api/pdf/organize wykonał rotację o 90°, usunięcie i duplikację stron (5 stron wynikowych, qpdf check OK). Weryfikacja UI we wbudowanej przeglądarce: MergeTool (DnD lista), SplitTool (zakres '1-2'), OrganizeTool (siatka kafelków, obracanie, usuwanie) – pobieranie z UI zwróciło w 100% sprawne pliki binarne. Konsola przeglądarki 0 błędów. Kamień M3 zatwierdzony. Przekazano zadanie M4 do realizacji. |
| 2026-11-21 16:10 | `@Pdf Developer` | `@Pdf Tester` | Zrealizowano kamień milowy M4 (Konwersje Dokumentów): API routes (/api/convert/docx-to-pdf, /api/convert/pdf-to-docx, /api/convert/to-markdown, /api/convert/to-txt) z realnym przetwarzaniem przez LibreOffice headless, Mammoth i Poppler pdftotext, komponent ConvertTool z 4 trybami, podglądem wygenerowanej treści na żywo i kopiowaniem do schowka, integracja w Workspace i Sidebar. Weryfikacja E2E (qpdf --check, unzip -t, testy struktury MD/TXT) zakończona kodem 0. Sprzątanie /tmp/docuforge-studio/ w 100% skuteczne. npm run build i npx tsc --noEmit kod 0. Przekazano do testów QA. |
| 2026-11-21 16:12 | `@Pdf Tester` | `@Pdf Developer` | Weryfikacja QA kamienia M4 zakończona 100% sukcesem: /api/convert/docx-to-pdf skonwertował sample-document.docx przez LibreOffice headless do otwieralnego PDF (37.5 KB, qpdf check 0 błędów). /api/convert/pdf-to-docx przetworzył sample-multipage.pdf do sprawnego archiwum DOCX (8.7 KB, 10 plików, unzip -t kod 0). /api/convert/to-markdown i to-txt wyekstrahowały czysty tekst oraz poprawny format GFM z nagłówkami i tabelami. Weryfikacja w przeglądarce: ConvertTool bezbłędnie obsłużył konwersje, pobrał pliki wynikowe z przeglądarki i wyrenderował podgląd Markdown z tabelami i przyciskiem kopiowania. Konsola przeglądarki 0 błędów. Port 3000 zwolniony. M4 zatwierdzone. Przekazano zadanie M5 do realizacji. |
| 2026-11-21 16:18 | `@Pdf Developer` | `@Pdf Tester` | Zrealizowano kamień milowy M5 (Konwersje Graficzne – PDF <-> Obrazy PNG/JPG/WebP + ZIP): API routes (/api/convert/pdf-to-images, /api/convert/images-to-pdf) z użyciem pdftoppm, ffmpeg oraz pdf-lib, komponent ImagesTool z dwiema zakładkami ('PDF na Obrazy' i 'Obrazy na PDF'), wyborem DPI (72/150/300), formatu wyjściowego (PNG/JPEG/WebP), formatu strony (A4/Letter/Fit), orientacji i marginesów oraz reorganizacją kolejności obrazów ze zmianą położenia i usuwaniem, integracja w Workspace i Sidebar. Weryfikacja E2E (eksport 5 stron do ZIP 266KB, WebP ZIP 42KB, pojedynczy JPEG, scalenie 2 grafik w PDF A4 z qpdf --check) zakończona kodem 0. Sprzątanie /tmp/docuforge-studio/ w 100% skuteczne. npm run build i npx tsc --noEmit kod 0. Przekazano do testów QA. |
| 2026-11-21 16:22 | `@Pdf Tester` | `@Pdf Developer` | Weryfikacja QA kamienia M5 zakończona 100% sukcesem: /api/convert/pdf-to-images wyeksportował 5-stronicowy sample-multipage.pdf do ZIP z 5 ostrymi PNG (266 KB, unzip -t OK), przetestowano format WebP (111 KB) oraz pojedynczy JPEG (57.5 KB). /api/convert/images-to-pdf scalił sample-image1.jpg i sample-image2.png w 2-stronicowy dokument PDF A4 (17 KB, qpdf --check kod 0). Weryfikacja UI we wbudowanej przeglądarce: ImagesTool (obie zakładki) – pobieranie sample-multipage-obrazy.zip (266 KB) oraz obrazy-dokument.pdf (17 KB) zrealizowane bezbłędnie, konsola 0 błędów. Port 3000 zwolniony. M5 zatwierdzone. Przekazano zadanie M6 (Kompresja i Optymalizacja PDF – 3 profile Ghostscript) do realizacji. |
| 2026-11-21 16:29 | `@Pdf Developer` | `@Pdf Tester` | Zrealizowano kamień milowy M6 (Kompresja i Optymalizacja PDF): API route /api/pdf/compress z 3 profilami Ghostscript (low /printer 300 DPI, balanced /ebook 150 DPI, extreme /screen 72 DPI) oraz linearyzacją qpdf dla szybkiego podglądu webowego, nagłówki X-Original-Size, X-Compressed-Size i X-Reduction-Percent, komponent CompressTool w UI z interaktywnymi kartami profili, przełącznikiem linearyzacji i wizualnym paskiem zaoszczędzonej przestrzeni, integracja w Workspace i Sidebar. Weryfikacja E2E (kompresja sample-images.pdf z redukcją rozmiaru, test sample-multipage.pdf, walidacja qpdf --check bez błędów) zakończona kodem 0. Sprzątanie /tmp/docuforge-studio/ w 100% skuteczne. npm run build i npx tsc --noEmit kod 0. Przekazano do testów QA. |
| 2026-11-21 16:32 | `@Pdf Tester` | `@Pdf Developer` | Weryfikacja QA kamienia M6 zakończona 100% sukcesem: /api/pdf/compress przetestowany na 3 profilach Ghostscript (low /printer 300 DPI, balanced /ebook 150 DPI, extreme /screen 72 DPI) oraz z opcją linearyzacji. Potwierdzono fizyczną redukcję rozmiaru sample-images.pdf (z 29.2 KB do 27.1 KB w profilu balanced, 26.8 KB w extreme) oraz obecność nagłówków X-Original-Size, X-Compressed-Size, X-Reduction-Percent. Wszystkie pliki wyjściowe przeszły qpdf --check kodem 0 (potwierdzono flagę 'File is linearized'). Weryfikacja UI w przeglądarce: CompressTool bezbłędnie obsłużył wybór profili, przełącznik linearyzacji QPDF, wyrenderował wskaźniki redukcji (-2.1 KB / 7%) i pobrał sprawny plik sample-images-skompresowany.pdf (27 121 B), 0 błędów w konsoli. Port 3000 zwolniony. M6 zatwierdzone. Przekazano zadanie M7 (Bezpieczeństwo i Metadane – szyfrowanie AES-256, unlock, edycja metadanych, sanityzacja) do realizacji. |
| 2026-11-21 16:40 | `@Pdf Developer` | `@Pdf Tester` | Zrealizowano kamień milowy M7 (Bezpieczeństwo i Metadane): API routes (/api/pdf/protect z szyfrowaniem AES-256 QPDF, /api/pdf/unlock z deszyfrowaniem i walidacją 400 dla błędnego hasła, /api/pdf/metadata do odczytu i zapisu DocumentInfo, /api/pdf/sanitize do całkowitego usuwania XMP, DocumentInfo, adnotacji i skryptów), komponent SecurityTool w UI z 4 zakładkami, miernikiem siły hasła, podglądem metadanych i checklistą sanityzacji, integracja w Workspace i Sidebar. Weryfikacja E2E (testy 1-5 w test-m7-security.ts: szyfrowanie, blokada błędnego hasła, odblokowanie, edycja metadanych, sanityzacja z Metadata Stream: no) zakończona kodem 0. Sprzątanie /tmp/docuforge-studio/ w 100% skuteczne. npm run build i npx tsc --noEmit kod 0. Przekazano do testów QA. |
| 2026-11-21 16:45 | `@Pdf Tester` | `@Pdf Developer` | Weryfikacja QA kamienia M7 zakończona 100% sukcesem: /api/pdf/protect zaszyfrował sample-multipage.pdf algorytmem AES-256 (plik wymaga hasła, qpdf --check bez hasła zgłasza błąd, z hasłem kod 0). /api/pdf/unlock prawidłowo odrzucił błędne hasło (status 400 z JSON error) oraz odszyfrował plik przy poprawnym haśle (plik otwiera się bez hasła, qpdf kod 0). /api/pdf/metadata z powodzeniem odczytał i zaktualizował DocumentInfo (Title i Author zweryfikowane przez pdfinfo). /api/pdf/sanitize skutecznie usunął metadane i strumień XMP (potwierdzone 'Metadata Stream: no'). Weryfikacja UI w przeglądarce: SecurityTool bezbłędnie obsłużył wszystkie 4 moduły (szyfrowanie z miernikiem siły hasła, odblokowywanie, edycję metadanych, sanityzację), pobrał poprawne pliki binarne, 0 błędów w konsoli. Port 3000 zwolniony. M7 zatwierdzone. Przekazano zadanie M8 (Znaki wodne, Numeracja stron i Podpis PDF na Canvasie/PNG) do realizacji. |
| 2026-11-21 16:55 | `@Pdf Developer` | `@Pdf Tester` | Zrealizowano kamień milowy M8 (Znaki wodne, Numeracja stron i Podpis PDF): 3 endpointy API (/api/pdf/watermark ze skalowaniem, kątem i przezroczystością, /api/pdf/page-numbers z szablonem numeracji i pozycjonowaniem, /api/pdf/sign z osadzaniem PNG/JPG w układzie współrzędnych PDF), komponenty UI (WatermarkTool z podglądem na żywo, PageNumbersTool z siatką pozycji i pominięciem 1. strony, SignTool z Canvasem do odręcznego rysowania z cofaniem/czyszczeniem oraz wgrywaniem obrazu, StampSignTool łączący zakładki), integracja w Workspace i Sidebar. Weryfikacja E2E (testy 1-5 w test-m8-stampsign.ts: znak wodny center/tile, numeracja stron, pominięcie strony tytułowej, podpis graficzny z qpdf --check) zakończona kodem 0. Sprzątanie /tmp/docuforge-studio/ w 100% skuteczne. npm run build i npx tsc --noEmit kod 0. Przekazano do testów QA. |
| 2026-11-21 17:15 | `@Pdf Tester` | `@Pdf Developer` | Weryfikacja QA kamienia M8 zakończona 100% sukcesem: API (/api/pdf/watermark, /api/pdf/page-numbers, /api/pdf/sign) przetestowane binarnie w test-m8-stampsign.ts (5/5 PASSED): znak wodny center i kafelkowany ze skalowaniem kąta i przezroczystości (qpdf --check OK), numeracja stron ze znacznikiem 'Strona {n} z {total}' i pominięciem 1. strony (zweryfikowane przez pdftotext), podpis cyfrowy z poprawnym osadzeniem współrzędnych i wymiarów w qpdf. Weryfikacja UI we wbudowanej przeglądarce: StampSignTool (wszystkie 3 zakładki) – nałożono znak wodny (sample-multipage-znak-wodny.pdf, 7.7 KB), wygenerowano numerację stron (sample-multipage-ponumerowany.pdf, 7.2 KB) oraz odręczny podpis narysowany na canvasie z asynchronicznym rejestrowaniem pociągnięć myszy (sample-multipage-podpisany.pdf, 7.1 KB). Wszystkie pobrane pliki przeszły qpdf --check kodem 0 i zachowały 5 stron. Konsola przeglądarki 0 błędów. Port 3000 zwolniony. M8 zatwierdzone. Przekazano zadanie M9 (OCR Tesseract.js PL/EN i Porównywarka Dokumentów Diff ze stylami side-by-side i unified) do realizacji. |
| 2026-11-21 17:23 | `@Pdf Developer` | `@Pdf Tester` | Zrealizowano kamień milowy M9 (OCR Tesseract.js PL/EN i Porównywarka Dokumentów Diff): endpointy API (/api/ocr/process z obsługą silnika Tesseract.js pol/eng/pol+eng, konwersją PDF->PNG przez pdftoppm, podglądem JSON i pobieraniem .txt/.docx/.pdf; /api/diff/compare z ekstrakcją PDF przez pdftotext, DOCX przez mammoth, TXT, wyliczaniem diffWords i diffLines, statystykami dodane/usunięte/bez zmian oraz wskaźnikiem podobieństwa 0-100%), komponenty UI (OcrTool z wyborem języka, formatu wyjściowego, edytowalnym textarea, licznikiem słów i kopiowaniem; DiffTool z dwoma dropzone A i B, kartami metryk podobieństwa, widokiem Side-by-Side i Unified Diff oraz eksportem raportu różnic), integracja w Workspace i Sidebar. Weryfikacja E2E (testy 1-6 w test-m9-ocr-diff.ts: OCR sample-scanned.png trafność 94% z polskimi znakami 'Zażółć gęślą jaźń', eksport DOCX, eksport PDF z qpdf --check, porównanie PDF vs DOCX, identyczny 100%, modyfikacja tekstu) zakończona kodem 0. Sprzątanie /tmp/docuforge-studio/ w 100% skuteczne. npm run build i npx tsc --noEmit kod 0. Przekazano do testów QA. |
| 2026-11-21 17:30 | `@Pdf Tester` | `@Pdf Developer` | Weryfikacja QA kamienia M9 zakończona 100% sukcesem: API (/api/ocr/process i /api/diff/compare) przetestowane binarnie w test-m9-ocr-diff.ts (6/6 PASSED): silnik Tesseract.js rozpoznał tekst ze skanu sample-scanned.png z dokładnością 94% i prawidłowymi polskimi znakami diakrytycznymi ('Zażółć gęślą jaźń'), wygenerowano poprawny plik DOCX (9.8 KB, zip OK) oraz PDF (qpdf --check kod 0), porównywarka diff prawidłowo wyliczyła wskaźniki podobieństwa (12% dla PDF vs DOCX, 100% dla identycznych, 70% dla zmian tekstu). Weryfikacja UI we wbudowanej przeglądarce: OcrTool bezbłędnie przeprowadził OCR, wyrenderował podgląd tekstu z metrykami i pobrał sample-scanned-ocr.docx; DiffTool załadował parę plików testowych, poprawnie zaprezentował widoki Side-by-Side i Unified Diff oraz wyeksportował raport różnic raport-diff.txt. Wszystkie pliki przeszły weryfikację integralności. Konsola przeglądarki 0 błędów. Port 3000 zwolniony. M9 zatwierdzone. Przekazano zadanie M10 (Kolejka wsadowa Batch, Globalne skróty Ctrl+K/Ctrl+O, Dopieszczenie UX i audyt końcowy verify-all.ts) do realizacji. |
| 2026-11-21 17:38 | `@Pdf Developer` | `@Pdf Tester` | Zrealizowano finałowy kamień milowy M10 (Kolejka wsadowa Batch, Skróty, UX i Audyt Końcowy E2E): komponent BatchQueue z masowym wgrywaniem do 20 plików, 4 masowymi akcjami (kompresja, DOCX->PDF, znak wodny, sanityzacja) i eksportem do ZIP; trasa API /api/batch/process z nagłówkami X-Total-Files i X-Success-Count; system powiadomień toast (ToastContext) w stylu Dark Mode z walidacją 100MB; globalne skróty klawiszowe (Ctrl+K, Ctrl+O, Ctrl+Enter, Esc); responsywny drawer nawigacyjny na urządzeniach mobilnych (375px - 4K); master skrypt audytu E2E scripts/verify-all.ts testujący wszystkie 10 modułów (M1-M10) zakończony wynikiem 10/10 PASSED i kodem wyjścia 0. Sprzątanie /tmp/docuforge-studio/ w 100% skuteczne. npm run build i npx tsc --noEmit kod 0. Przekazano do finalnego audytu QA. |
| 2026-11-21 17:45 | `@Pdf Tester` | `@Pdf Architekt` | Finałowy audyt QA kamienia M10 oraz całego systemu DocuForge Studio zakończony 100% sukcesem (10/10 MODUŁÓW ZATWIERDZONYCH [x]). Weryfikacja binarna API /api/batch/process: nagłówki X-Total-Files: 2, X-Success-Count: 2, poprawna paczka ZIP (unzip -t kod 0, qpdf --check bez błędów). Skrypt całościowego audytu scripts/verify-all.ts: 10/10 modułów (M1-M10) ze statusem PASSED i kodem wyjścia 0. Weryfikacja UI we wbudowanej przeglądarce: BatchQueue przetestowany na 3 plikach z akcją dodawania znaku wodnego i pobraniem paczki ZIP (25.5 KB, 3 pliki sprawne); globalne skróty klawiszowe (Ctrl+K otwiera wyszukiwarkę, Esc zamyka, Ctrl+Enter uruchamia przetwarzanie); system powiadomień Toast oraz responsywne menu mobilne. Konsola przeglądarki 0 błędów diagnostycznych. npm run build i npx tsc --noEmit bezbłędne (kod 0, 23 trasy). Środowisko czyste, port 3000 zwolniony. Przekazano kompletny system do finalnego podsumowania przez @Pdf Architekt. |
| 2026-11-21 22:45 | `@Pdf Architekt` | `@Pdf Developer` | Zaplanowano 3 kolejne kamienie milowe (M11: AcroForms, M12: Adnotacje i True Redaction, M13: PDF/A i Preflight) w ARCHITECTURE.md oraz PROGRESS.md. Przekazuję do realizacji **Kamień Milowy M11** (AcroForms: inspekcja pól, wypełnianie, eksport/import JSON, flattening). |
