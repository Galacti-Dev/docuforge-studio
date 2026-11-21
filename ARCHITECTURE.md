# Architektura Techniczna – DocuForge Studio

Aplikacja: **DocuForge Studio**  
Lokalizacja: `~/OpenBot/Shared/docuforge-studio/`  
Główny Architekt: `@Pdf Architekt`  
Główny Programista: `@Pdf Developer`  
Inżynier QA / Tester: `@Pdf Tester`  

---

## 1. Założenia Architektoniczne i Stos Technologiczny

### 1.1 Prywatność i Bezpieczeństwo Danych (Local & Private)
1. Wszystkie operacje na dokumentach PDF, DOCX i obrazach odbywają się wyłącznie lokalnie na maszynie użytkownika.
2. Żadne pliki ani metadane nie są wysyłane do zewnętrznych usług chmurowych.
3. Pliki tymczasowe generowane na potrzeby operacji systemowych (np. LibreOffice, Ghostscript, pdftoppm) zapisywane są w wydzielonym katalogu `/tmp/docuforge-studio/[uuid]/` i bezwzględnie usuwane w blokach `try ... finally`.

### 1.2 Stos Technologiczny (Tech Stack)
- **Framework:** Next.js 15 (App Router, Node.js runtime dla Route Handlers).
- **Język:** TypeScript (strict mode, bez `any`).
- **Stylizacja:** Tailwind CSS (zgodny z konfiguracją Dark Mode).
- **Ikony:** `lucide-react`.
- **Biblioteki Manipulacji Dokumentami:**
  - `pdf-lib`: Modyfikacja struktury PDF w pamięci (łączenie, podział, obracanie, znaki wodne, numeracja stron, podpisy graficzne).
  - `pdfjs-dist`: Klientowe i serwerowe renderowanie stron PDF do Canvas/SVG, ekstrakcja tekstu.
  - `mammoth`: Odczyt i ekstrakcja struktury plików `.docx` do HTML oraz czystego tekstu.
  - `docx`: Programistyczne generowanie plików `.docx` (paragrafy, tabele, style).
  - `jszip`: Tworzenie archiwów `.zip` dla wsadowych plików wynikowych (podział PDF, eksport stron do grafik).
  - `tesseract.js`: Silnik OCR dla języka polskiego (`pol`) i angielskiego (`eng`).
  - `diff`: Algorytmy wyliczania różnic tekstowych (character/word/line diff).
  - `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`: Obsługa Drag & Drop dla siatki stron PDF i kolejki plików.

### 1.3 Narzędzia Systemowe Linuxa (CLI Helpers)
Węzły API korzystają z zainstalowanych w systemie narzędzi:
- `/usr/bin/soffice`: LibreOffice headless – bezstratna konwersja DOCX do PDF.
- `/usr/bin/gs`: Ghostscript – zaawansowana kompresja i optymalizacja strumieni PDF.
- `/usr/bin/qpdf`: QPDF – szyfrowanie, linearyzacja i dekrypcja PDF.
- `/usr/bin/pdftoppm`: Poppler utils – wektorowe renderowanie stron PDF do PNG/JPEG w wybranym DPI.

---

## 2. Struktura Katalogów Projektu

```
~/OpenBot/Shared/docuforge-studio/
├── PROGRESS.md                       # Status realizacji kamieni milowych M1–M10
├── ARCHITECTURE.md                   # Niniejsza specyfikacja techniczna
├── package.json                      # Zależności i skrypty
├── tsconfig.json                     # Konfiguracja TypeScript (strict, path aliases @/*)
├── tailwind.config.ts                # Konfiguracja kolorów i geometrii Dark Mode
├── postcss.config.mjs
├── next.config.ts                    # Konfiguracja limitu 100MB, webpack/worker config
├── fixtures/                         # Prawdziwe pliki testowe generowane przez skrypt
│   ├── sample-multipage.pdf
│   ├── sample-images.pdf
│   ├── sample-document.docx
│   ├── sample-image1.jpg
│   ├── sample-image2.png
│   └── sample-scanned.png
├── scripts/
│   ├── generate-fixtures.ts          # Skrypt generujący pliki w fixtures/
│   └── verify-all.ts                 # Skrypt weryfikujący wszystkie endpointy API E2E
├── public/
│   └── pdf.worker.min.mjs            # Worker dla pdfjs-dist
└── src/
    ├── app/
    │   ├── layout.tsx                # Główny layout, czcionki, dark theme wrapper
    │   ├── page.tsx                  # Strona główna – Workspace & Narzędziownik
    │   ├── globals.css               # Definicje kolorów i styli bazowych
    │   └── api/                      # Endpointy API Route Handlers
    │       ├── pdf/
    │       │   ├── merge/route.ts
    │       │   ├── split/route.ts
    │       │   ├── organize/route.ts
    │       │   ├── compress/route.ts
    │       │   ├── protect/route.ts
    │       │   ├── unlock/route.ts
    │       │   ├── metadata/route.ts
    │       │   ├── sanitize/route.ts
    │       │   ├── watermark/route.ts
    │       │   ├── page-numbers/route.ts
    │       │   └── sign/route.ts
    │       ├── convert/
    │       │   ├── docx-to-pdf/route.ts
    │       │   ├── pdf-to-docx/route.ts
    │       │   ├── to-markdown/route.ts
    │       │   ├── to-txt/route.ts
    │       │   ├── pdf-to-images/route.ts
    │       │   └── images-to-pdf/route.ts
    │       ├── ocr/
    │       │   └── process/route.ts
    │       └── diff/
    │           └── compare/route.ts
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx            # Pasek górny, status, skróty
    │   │   ├── Sidebar.tsx           # Pasek boczny z kategoriami narzędzi
    │   │   └── CommandSearch.tsx     # Szybka wyszukiwarka narzędzi (Ctrl+K)
    │   ├── workspace/
    │   │   ├── Workspace.tsx         # Główny kontener roboczy
    │   │   ├── DropZone.tsx          # Uniwersalna strefa Drag & Drop plików
    │   │   ├── BatchQueue.tsx        # Panel kolejki przetwarzania wsadowego
    │   │   └── RecentFiles.tsx       # Ostatnio używane pliki w sesji
    │   ├── viewer/
    │   │   ├── PdfViewer.tsx         # Podgląd PDF (pdfjs-dist + Canvas + Zoom)
    │   │   ├── DocxViewer.tsx        # Podgląd DOCX (mammoth HTML render)
    │   │   └── PageThumbnail.tsx     # Pojedynczy kafelek strony w siatce
    │   ├── tools/                    # Panele konfiguracyjne poszczególnych modułów
    │   │   ├── MergeTool.tsx
    │   │   ├── SplitTool.tsx
    │   │   ├── OrganizeTool.tsx
    │   │   ├── ConvertTool.tsx
    │   │   ├── ImagesTool.tsx
    │   │   ├── CompressTool.tsx
    │   │   ├── SecurityTool.tsx
    │   │   ├── WatermarkTool.tsx
    │   │   ├── PageNumbersTool.tsx
    │   │   ├── SignTool.tsx
    │   │   ├── OcrTool.tsx
    │   │   └── DiffTool.tsx
    │   └── ui/                       # Reużywalne komponenty UI w Dark Mode
    │       ├── Button.tsx
    │       ├── Card.tsx
    │       ├── Input.tsx
    │       ├── Select.tsx
    │       ├── Slider.tsx
    │       ├── Modal.tsx
    │       ├── Badge.tsx
    │       └── Toast.tsx
    ├── lib/
    │   ├── server/
    │   │   ├── cli-tools.ts          # Wywołania soffice, gs, qpdf, pdftoppm + temp cleanup
    │   │   └── file-utils.ts         # Pomocniki operacji na strumieniach i buforach
    │   ├── client/
    │   │   ├── pdf-worker-setup.ts   # Inicjalizacja pdfjsLib.GlobalWorkerOptions
    │   │   └── download-utils.ts     # Zapisywanie pliku Blob w przeglądarce
    │   ├── ocr/
    │   │   └── tesseract-worker.ts   # Konfiguracja i obsługa Tesseract.js
    │   └── diff/
    │       └── document-diff.ts      # Logika wyliczania różnic tekstowych
    └── types/
        ├── document.ts               # Typy dokumentów, stron i miniatur
        ├── tools.ts                  # Typy narzędzi, konfiguracji modułów
        └── api.ts                    # Interfejsy zapytań i odpowiedzi API
```

---

## 3. Style Wizualne i Wytyczne UX (Dark Mode)

### 3.1 Tokeny Kolorystyczne
- **Background Root:** `#141414` – głębokie ciemne tło całej aplikacji.
- **Card / Panel Background:** `#1f1f1f` – tło kart, paneli bocznych i modali.
- **Surface Hover:** `#262626` – tło elementów po najechaniu kursorem.
- **Border / Divider:** `#2e2e2e` – subtelne obramowania paneli i wejść formularzy.
- **Text Primary:** `#f1f1f1` – główny tekst (maksymalny kontrast).
- **Text Secondary / Muted:** `#9ca3af` – etykiety pomocnicze, opisy, metadane.
- **Accent Primary (Action):** `#3b82f6` (Blue 500) – główne przyciski akcji, focus rings, aktywne stany zakładek.
- **Accent Secondary (Success / Ready):** `#10b981` (Emerald 500) – potwierdzenia sukcesu, przyciski pobierania gotowych plików, wysoki stopień kompresji.
- **Accent Warning:** `#f59e0b` (Amber 500) – ostrzeżenia o nadpisaniu, duże pliki.
- **Accent Danger:** `#ef4444` (Red 500) – usuwanie stron, usuwanie zabezpieczeń, błędy walidacji.

### 3.2 Geometria i Typografia
- **Zaokrąglenia:**
  - Panele, karty, modale: `rounded-2xl` (16px).
  - Przyciski, pola edycyjne, kafelki stron: `rounded-xl` (12px).
  - Małe tagi, badge'e: `rounded-lg` (8px).
- **Cienie i Efekty:**
  - Płaski, nowoczesny wygląd (Flat Design) z subtelną krawędzią `border border-[#2e2e2e]`.
  - Brak ciężkich cieni drop-shadow; jedynie miękki blur dla modali (`backdrop-blur-md`).
- **Mikrointerakcje:**
  - `transition-all duration-150 ease-out` na hover/active przycisków i kafelków.

---

## 4. Kontrakty API (Route Handlers) i Modele Danych

Wszystkie endpointy obsługują przesyłanie formularzy `multipart/form-data` i zwracają odpowiedź binarną z odpowiednim `Content-Type` i `Content-Disposition`, bądź odpowiedź JSON w przypadku operacji analitycznych (Diff, OCR tekst, Metadata GET).

### 4.1 `/api/pdf/merge`
- **Metoda:** `POST`
- **Body:** `FormData`
  - `files`: Tablica plików binarnych PDF.
  - `order`: Opcjonalny ciąg JSON reprezentujący kolejność plików i stron:
    `[{"fileIndex": 0, "pages": "all"}, {"fileIndex": 1, "pages": "1-3"}]`
- **Odpowiedź:** `application/pdf` z nagłówkiem `Content-Disposition: attachment; filename="merged.pdf"`.

### 4.2 `/api/pdf/split`
- **Metoda:** `POST`
- **Body:** `FormData`
  - `file`: Plik PDF.
  - `mode`: `"single"` | `"ranges"` | `"fixed"`.
  - `ranges`: np. `"1-3,4-5"` (gdy `mode === "ranges"`).
  - `interval`: Liczba stron (gdy `mode === "fixed"`).
- **Odpowiedź:** `application/pdf` (gdy wynik to 1 plik) lub `application/zip` (paczka wielu plików).

### 4.3 `/api/pdf/organize`
- **Metoda:** `POST`
- **Body:** `FormData`
  - `file`: Plik PDF.
  - `actions`: JSON ze specyfikacją kolejności i transformacji stron:
    ```typescript
    interface PageAction {
      originalIndex: number; // 0-based
      rotate?: 0 | 90 | 180 | 270;
      delete?: boolean;
      duplicate?: number;
    }
    ```
- **Odpowiedź:** `application/pdf` z pobranym plikiem wynikowym.

### 4.4 `/api/convert/docx-to-pdf`
- **Metoda:** `POST`
- **Body:** `FormData` zawierające plik `file` (`.docx`).
- **Mechanizm:** Zapis do `/tmp/docuforge-studio/...`, wywołanie `/usr/bin/soffice --headless --convert-to pdf --outdir <dir> <inputFile>`, odczyt wygenerowanego PDF, sprzątanie plików tymczasowych.
- **Odpowiedź:** `application/pdf`.

### 4.5 `/api/convert/pdf-to-docx`
- **Metoda:** `POST`
- **Body:** `FormData` z plikiem `file` (`.pdf`).
- **Mechanizm:** Ekstrakcja tekstu i bloków za pomocą `pdfjs-dist` / `pdf-lib`, mapowanie na paragrafy i nagłówki biblioteki `docx`, wygenerowanie bufora `docx`.
- **Odpowiedź:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

### 4.6 `/api/convert/pdf-to-images`
- **Metoda:** `POST`
- **Body:** `FormData`:
  - `file`: Plik PDF.
  - `format`: `"png"` | `"jpeg"` | `"webp"`.
  - `dpi`: `72` | `150` | `300`.
- **Mechanizm:** Wywołanie `/usr/bin/pdftoppm -png -r <dpi> ...` w katalogu tymczasowym, spakowanie wygenerowanych plików do ZIP za pomocą `jszip`.
- **Odpowiedź:** `application/zip` (lub `image/png` gdy 1 strona).

### 4.7 `/api/convert/images-to-pdf`
- **Metoda:** `POST`
- **Body:** `FormData` z plikami `images` oraz konfiguracją JSON:
  - `pageSize`: `"A4"` | `"Letter"` | `"Fit"`.
  - `orientation`: `"portrait"` | `"landscape"` | `"auto"`.
  - `margin`: `0` | `10` | `20`.
- **Odpowiedź:** `application/pdf`.

### 4.8 `/api/pdf/compress`
- **Metoda:** `POST`
- **Body:** `FormData` z plikiem `file` i profilem `level`:
  - `"low"`: `-dPDFSETTINGS=/printer` (300 DPI)
  - `"balanced"`: `-dPDFSETTINGS=/ebook` (150 DPI)
  - `"extreme"`: `-dPDFSETTINGS=/screen` (72 DPI)
- **Mechanizm:** Wywołanie Ghostscript `/usr/bin/gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 ...`, opcjonalnie `qpdf --linearize`.
- **Nagłówki odpowiedzi:**
  - `X-Original-Size`: rozmiar przed kompresją w bajtach.
  - `X-Compressed-Size`: rozmiar po kompresji w bajtach.
  - `X-Reduction-Percent`: procent redukcji rozmiaru.
- **Odpowiedź:** `application/pdf`.

### 4.9 `/api/pdf/protect` & `/api/pdf/unlock`
- **Protect:** Przyjmuje plik PDF, `userPassword`, opcjonalnie `ownerPassword`, szyfruje przez `qpdf --encrypt <userPassword> <ownerPassword> 256 ...`.
- **Unlock:** Przyjmuje plik PDF, `password`, odszyfrowuje przez `qpdf --decrypt --password=<password> ...`.

### 4.10 `/api/pdf/watermark`, `/api/pdf/page-numbers`, `/api/pdf/sign`
- **Watermark:** Nanosi tekst o zadanym kącie, kryciu (`opacity`), rozmiarze i kolorze na stronach PDF w `pdf-lib`.
- **Page Numbers:** Generuje i rysuje etykiety numeracji stron ("Strona X z Y") w wybranym narożniku/pozycji.
- **Sign:** Przyjmuje plik PDF, obraz podpisu (base64 PNG) oraz koordynaty (`pageIndex`, `x`, `y`, `width`, `height`), osadza podpis w `pdf-lib`.

### 4.11 `/api/diff/compare`
- **Metoda:** `POST`
- **Body:** `FormData` z plikiem `fileA` i `fileB`.
- **Odpowiedź:** JSON ze strukturą różnic:
  ```typescript
  interface DiffResult {
    fileAName: string;
    fileBName: string;
    addedCount: number;
    removedCount: number;
    unchangedCount: number;
    similarityPercent: number;
    diffParts: Array<{
      value: string;
      added?: boolean;
      removed?: boolean;
    }>;
  }
  ```

### 4.12 `/api/pdf/forms/inspect` & `/api/pdf/forms/fill`
- **Inspect:**
  - **Metoda:** `POST`
  - **Body:** `FormData` z plikiem `file`.
  - **Odpowiedź:** JSON z listą wykrytych pól:
    ```typescript
    interface FormFieldInfo {
      name: string;
      type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'button' | 'unknown';
      value: string | boolean;
      options?: string[];
      readOnly: boolean;
      required: boolean;
    }
    ```
- **Fill:**
  - **Metoda:** `POST`
  - **Body:** `FormData` z plikiem `file`, `data` (JSON ciąg `{ [key: string]: string | boolean }`) oraz `flatten` (`"true"` | `"false"`).
  - **Mechanizm:** `pdf-lib` Form API (`PDFDocument.load(buffer).getForm()`), iteracja i wypełnianie pól, opcjonalnie `form.flatten()`.
  - **Odpowiedź:** Strumień binarny `application/pdf`.

### 4.13 `/api/pdf/annotate` & `/api/pdf/redact`
- **Annotate:**
  - **Metoda:** `POST`
  - **Body:** `FormData` z plikiem `file` i `annotations` (JSON array):
    ```typescript
    interface AnnotationItem {
      pageIndex: number;
      type: 'highlight' | 'rect' | 'arrow' | 'note';
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      opacity: number;
      text?: string;
    }
    ```
  - **Odpowiedź:** `application/pdf` z naniesionymi obiektami wektorowymi `pdf-lib`.
- **Redact (True Redaction RODO/GDPR):**
  - **Metoda:** `POST`
  - **Body:** `FormData` z plikiem `file` oraz `areas` (JSON array: `{ pageIndex, x, y, width, height }`) lub `patterns` (JSON array: reguły maskowania).
  - **Mechanizm:** Trwałe nałożenie czarnego wektora oraz fizyczne zniszczenie warstwy tekstowej pod obszarem redakcji, aby `pdftotext` nie był w stanie wydobyć usuniętych słów.
  - **Odpowiedź:** `application/pdf`.

### 4.14 `/api/pdf/pdfa`, `/api/pdf/attachments/extract`, `/api/pdf/attachments/embed`, `/api/pdf/preflight`
- **PDF/A:**
  - **Metoda:** `POST`
  - **Body:** `FormData` z plikiem `file` i `conformance` (`"1b"` | `"2b"` | `"3b"`).
  - **Mechanizm:** Ghostscript `/usr/bin/gs -dPDFA=... -sColorConversionStrategy=UseDeviceIndependentColor -sOutputICCProfile=default_rgb.icc ...`.
  - **Odpowiedź:** `application/pdf`.
- **Attachments Extract:**
  - **Metoda:** `POST`
  - **Body:** `FormData` z plikiem `file`.
  - **Odpowiedź:** `application/zip` ze wszystkimi wyciągniętymi plikami z `/Names /EmbeddedFiles`.
- **Attachments Embed:**
  - **Metoda:** `POST`
  - **Body:** `FormData` z plikiem `pdf` oraz załączanym plikiem binarnym `attachment`.
  - **Mechanizm:** Tworzenie wpisu `/EmbeddedFiles` w katalogu głównym PDF (PDF/A-3 compliant).
- **Preflight Inspector:**
  - **Metoda:** `POST`
  - **Body:** `FormData` z plikiem `file`.
  - **Odpowiedź:** JSON ze szczegółową analizą techniczną dokumentu (wersja PDF, szyfrowanie, linearyzacja, czcionki, metadane XMP, liczba stron, profil zgodności).

---

## 5. Standardy Kodowania dla @Pdf Developer

1. **Zero Atrap (No Mocks):**
   - Każdy endpoint musi fizycznie przetwarzać plik binarny i zwracać poprawny format.
   - Niedopuszczalne jest zwracanie pustych plików, predefiniowanych tekstów zamiast realnego wyniku, czy fałszywych wskaźników postępu.
2. **Bezpieczne Zarządzanie Zasobami:**
   - Wszelkie operacje dyskowe muszą korzystać z unikalnych katalogów `/tmp/docuforge-studio/[uuid]/`.
   - Zawsze używać `try { ... } finally { await cleanupTempDir(dir); }`.
3. **Płynna Obsługa Błędów:**
   - Jeśli plik PDF jest uszkodzony lub zabezpieczony hasłem, API zwraca kod `422 Unprocessable Entity` lub `401 Unauthorized` ze zrozumiałą polską wiadomością JSON: `{ "error": "Plik jest zabezpieczony hasłem. Odblokuj go najpierw w module Bezpieczeństwo." }`.
4. **Weryfikacja Kompilacji:**
   - Po każdym etapie uruchomić:
     `npm run build && npx tsc --noEmit`.
   - Żadne błędy lintera ani kompilatora TypeScript nie mogą pozostać w kodzie.

---

## 6. Specyfikacja Nowych Modułów M11–M13

### 6.1 M11: Formularze PDF (AcroForms)
- Moduł `src/components/tools/FormsTool.tsx`.
- Obsługa standardowych typów pól formularzy: pola tekstowe, checkboxy, radio group, dropdowny.
- Możliwość importu i eksportu danych formularza do ustrukturyzowanego formatu JSON.
- Opcja trwałego spłaszczania (`flatten()`), która uniemożliwia dalszą edycję wartości pól.

### 6.2 M12: Adnotacje i Bezpieczna Redakcja Trwała
- Moduł `src/components/tools/AnnotateRedactTool.tsx`.
- Wektorowe rysowanie kształtów (zakreślacz, prostokąt, strzałka, notatki tekstowe).
- Trwała redakcja danych wrażliwych RODO/GDPR z fizycznym usunięciem wektorów tekstu/obrazów pod zaznaczonym obszarem (potwierdzona testem `pdftotext`).

### 6.3 M13: PDF/A, Załączniki i Raport Preflight
- Moduł `src/components/tools/PdfaAttachmentsTool.tsx`.
- Konwersja do profilu archiwalnego PDF/A (1b/2b/3b).
- Obsługa załączników w formacie PDF/A-3 (np. faktury ustrukturyzowane XML / KSeF / Factur-X / ZUGFeRD).
- Szczegółowa analiza techniczna struktury pliku (wersja, fonty, profile kolorów, bezpieczeństwo).
