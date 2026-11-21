'use client';

import React, { useState, useEffect } from 'react';
import {
  ImageIcon,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Layers,
  Settings,
  Plus,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';

export type ImagesToolTab = 'pdf-to-images' | 'images-to-pdf';

interface ImagesToolProps {
  initialTab?: ImagesToolTab;
  initialFile?: File | null;
}

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

export const ImagesTool: React.FC<ImagesToolProps> = ({
  initialTab = 'pdf-to-images',
  initialFile,
}) => {
  const [activeTab, setActiveTab] = useState<ImagesToolTab>(initialTab);

  // Tab 1: PDF to Images State
  const [pdfFile, setPdfFile] = useState<File | null>(
    initialFile && initialFile.name.toLowerCase().endsWith('.pdf') ? initialFile : null
  );
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [dpi, setDpi] = useState<72 | 150 | 300>(150);
  const [pageRange, setPageRange] = useState<string>('all');
  const [forceZip, setForceZip] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);

  // Tab 2: Images to PDF State
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER' | 'FIT'>('A4');
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [margin, setMargin] = useState<'none' | 'small' | 'normal'>('none');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [imgSuccess, setImgSuccess] = useState<string | null>(null);

  // Sync tab with initialTab
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Sync file with initialFile
  useEffect(() => {
    if (initialFile) {
      if (initialFile.name.toLowerCase().endsWith('.pdf')) {
        setPdfFile(initialFile);
        setActiveTab('pdf-to-images');
      } else if (/\.(jpe?g|png|webp)$/i.test(initialFile.name)) {
        setActiveTab('images-to-pdf');
        const newItem: ImageItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file: initialFile,
          previewUrl: URL.createObjectURL(initialFile),
        };
        setImages((prev) => (prev.some((x) => x.file.name === initialFile.name) ? prev : [...prev, newItem]));
      }
    }
  }, [initialFile]);

  // Handle Tab 1: PDF change
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      setPdfError(null);
      setPdfSuccess(null);
    }
  };

  const handleLoadPdfSample = async (sampleName: string) => {
    setIsExporting(true);
    setPdfError(null);
    setPdfSuccess(null);
    try {
      const res = await fetch(`/api/fixtures/${sampleName}`);
      if (!res.ok) throw new Error('Nie udało się wczytać próbki PDF.');
      const blob = await res.blob();
      const sampleFile = new File([blob], sampleName, { type: 'application/pdf' });
      setPdfFile(sampleFile);
    } catch (err: any) {
      setPdfError(err.message || 'Błąd wczytywania próbki PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Run Tab 1: Export PDF to Images
  const handleExportImages = async () => {
    if (!pdfFile) {
      setPdfError('Wybierz plik PDF do wyeksportowania.');
      return;
    }

    setIsExporting(true);
    setPdfError(null);
    setPdfSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('format', format);
      formData.append('dpi', String(dpi));
      if (pageRange.trim() && pageRange !== 'all') {
        formData.append('pageRange', pageRange.trim());
      }
      if (forceZip) {
        formData.append('zip', 'true');
      }

      const res = await fetch('/api/convert/pdf-to-images', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errDesc = 'Błąd serwera podczas eksportu obrazów.';
        try {
          const errJson = await res.json();
          errDesc = errJson.error || errJson.details || errDesc;
        } catch {
          // ignore
        }
        throw new Error(errDesc);
      }

      const contentType = res.headers.get('Content-Type') || '';
      const isZip = contentType.includes('zip');
      const baseName = pdfFile.name.replace(/\.[^/.]+$/, '');
      const downloadName = isZip ? `${baseName}-obrazy.zip` : `${baseName}-strona-1.${format === 'jpeg' ? 'jpg' : format}`;

      const blob = await res.blob();
      downloadBlob(blob, downloadName);

      setPdfSuccess(`Pomyślnie wyeksportowano obrazy (${downloadName}). Pobieranie rozpoczęte!`);
    } catch (err: any) {
      setPdfError(err.message || 'Wystąpił błąd podczas eksportu obrazów.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Tab 2: Add Images
  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newItems: ImageItem[] = Array.from(e.target.files).map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
      }));
      setImages((prev) => [...prev, ...newItems]);
      setImgError(null);
      setImgSuccess(null);
    }
  };

  const handleLoadSampleImages = async () => {
    setIsGenerating(true);
    setImgError(null);
    setImgSuccess(null);
    try {
      const samples = ['sample-image1.jpg', 'sample-image2.png'];
      const loadedItems: ImageItem[] = [];

      for (const s of samples) {
        const res = await fetch(`/api/fixtures/${s}`);
        if (!res.ok) continue;
        const blob = await res.blob();
        const file = new File([blob], s, { type: blob.type });
        loadedItems.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      setImages((prev) => [...prev, ...loadedItems]);
    } catch (err: any) {
      setImgError(err.message || 'Błąd wczytywania próbek obrazów.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  // Run Tab 2: Images to PDF
  const handleImagesToPdf = async () => {
    if (images.length === 0) {
      setImgError('Wgraj co najmniej jeden obraz, aby utworzyć plik PDF.');
      return;
    }

    setIsGenerating(true);
    setImgError(null);
    setImgSuccess(null);

    try {
      const formData = new FormData();
      images.forEach((img) => formData.append('files', img.file));
      formData.append('pageSize', pageSize);
      formData.append('orientation', orientation);
      formData.append('margin', margin);

      const res = await fetch('/api/convert/images-to-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errDesc = 'Błąd podczas tworzenia PDF z obrazów.';
        try {
          const errJson = await res.json();
          errDesc = errJson.error || errJson.details || errDesc;
        } catch {
          // ignore
        }
        throw new Error(errDesc);
      }

      const blob = await res.blob();
      const downloadName = 'obrazy-dokument.pdf';
      downloadBlob(blob, downloadName);

      setImgSuccess(`Plik PDF (${downloadName}) utworzono pomyślnie z ${images.length} grafik!`);
    } catch (err: any) {
      setImgError(err.message || 'Wystąpił nieoczekiwany błąd podczas generowania PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-2">
        <div className="flex items-center space-x-2">
          <Badge variant="blue">Moduł M5</Badge>
          <h3 className="text-lg font-bold text-[#f1f1f1]">
            Konwersje Graficzne (PDF ➔ Obrazy & Obrazy ➔ PDF)
          </h3>
        </div>
        <p className="text-xs text-[#9ca3af]">
          Eksport stron dokumentów do ostrych formatów PNG, JPG, WebP w rozdzielczości do 300 DPI oraz łączenie wielu grafik w wektorowy dokument PDF z doborem formatu i marginesów.
        </p>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab('pdf-to-images')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'pdf-to-images'
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
              : 'border-[#2e2e2e] bg-[#1f1f1f] text-[#9ca3af] hover:border-[#3b82f6]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs">PDF ➔ Obrazy (PNG / JPG / WebP)</span>
            <Badge variant={activeTab === 'pdf-to-images' ? 'blue' : 'gray'}>Poppler</Badge>
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            Eksport pojedynczych stron lub całego dokumentu do plików rastrowych spakowanych w ZIP.
          </p>
        </button>

        <button
          onClick={() => setActiveTab('images-to-pdf')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'images-to-pdf'
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
              : 'border-[#2e2e2e] bg-[#1f1f1f] text-[#9ca3af] hover:border-[#3b82f6]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs">Obrazy ➔ PDF (Scalanie w dokument)</span>
            <Badge variant={activeTab === 'images-to-pdf' ? 'blue' : 'gray'}>pdf-lib</Badge>
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            Połącz zdjęcia i grafiki w jeden plik PDF z wyborem formatu strony (A4/Letter) i marginesów.
          </p>
        </button>
      </div>

      {/* TAB 1: PDF TO IMAGES */}
      {activeTab === 'pdf-to-images' && (
        <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-6">
          {/* File Picker */}
          <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#f1f1f1] truncate">
                  {pdfFile ? pdfFile.name : 'Nie wybrano pliku PDF'}
                </p>
                <p className="text-[11px] text-[#9ca3af]">
                  {pdfFile ? `Rozmiar: ${formatFileSize(pdfFile.size)}` : 'Wybierz dokument PDF z dysku'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfChange}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#262626] hover:bg-[#2e2e2e] text-[#f1f1f1] border border-[#2e2e2e] text-xs font-medium rounded-xl transition-all">
                  <span>{pdfFile ? 'Zmień plik PDF' : 'Wybierz plik PDF'}</span>
                </span>
              </label>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleLoadPdfSample('sample-multipage.pdf')}
                disabled={isExporting}
              >
                <span>Wczytaj sample-multipage.pdf</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleLoadPdfSample('sample-images.pdf')}
                disabled={isExporting}
              >
                <span>Wczytaj sample-images.pdf</span>
              </Button>
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Format */}
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-2">
              <label className="text-xs font-semibold text-[#f1f1f1] block">Format graficzny:</label>
              <div className="flex gap-2">
                {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg uppercase transition-all ${
                      format === fmt
                        ? 'bg-[#3b82f6] text-white'
                        : 'bg-[#1f1f1f] text-[#9ca3af] hover:text-[#f1f1f1]'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#9ca3af]">
                {format === 'png'
                  ? 'PNG: Bezstratna jakość i przezroczystość'
                  : format === 'jpeg'
                  ? 'JPEG: Niewielki rozmiar, optymalny dla zdjęć'
                  : 'WebP: Nowoczesny format o wysokiej kompresji'}
              </p>
            </div>

            {/* DPI */}
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-2">
              <label className="text-xs font-semibold text-[#f1f1f1] block">Rozdzielczość (DPI):</label>
              <div className="flex gap-2">
                {([72, 150, 300] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDpi(d)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      dpi === d
                        ? 'bg-[#3b82f6] text-white'
                        : 'bg-[#1f1f1f] text-[#9ca3af] hover:text-[#f1f1f1]'
                    }`}
                  >
                    {d} DPI
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#9ca3af]">
                {dpi === 72 ? '72 DPI: Ekran / Szybki podgląd' : dpi === 150 ? '150 DPI: Standardowa jakość (E-book)' : '300 DPI: Druk / Maksymalna ostrość'}
              </p>
            </div>

            {/* Page Range */}
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-2">
              <label className="text-xs font-semibold text-[#f1f1f1] block">Zakres stron:</label>
              <Input
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="all lub np. 1-3"
                className="text-xs font-mono py-1.5"
              />
              <p className="text-[10px] text-[#9ca3af]">
                Wpisz &quot;all&quot; dla wszystkich lub np. &quot;1-3&quot;, &quot;2&quot;.
              </p>
            </div>
          </div>

          {/* Force ZIP option */}
          <div className="flex items-center space-x-2 text-xs text-[#9ca3af]">
            <input
              type="checkbox"
              id="forceZip"
              checked={forceZip}
              onChange={(e) => setForceZip(e.target.checked)}
              className="rounded bg-[#141414] border-[#2e2e2e] text-[#3b82f6] focus:ring-0"
            />
            <label htmlFor="forceZip" className="cursor-pointer select-none">
              Zawsze pakuj wynik do archiwum ZIP (nawet dla 1 strony)
            </label>
          </div>

          {/* Status Messages */}
          {pdfError && (
            <div className="p-3 bg-[#ef4444]/15 border border-[#ef4444]/30 rounded-xl text-xs text-[#ef4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pdfError}</span>
            </div>
          )}

          {pdfSuccess && (
            <div className="p-3 bg-[#10b981]/15 border border-[#10b981]/30 rounded-xl text-xs text-[#10b981] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{pdfSuccess}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button
              variant="emerald"
              size="lg"
              disabled={!pdfFile || isExporting}
              onClick={handleExportImages}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Renderowanie stron ({dpi} DPI)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Wyeksportuj i pobierz obrazy</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: IMAGES TO PDF */}
      {activeTab === 'images-to-pdf' && (
        <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-6">
          {/* File Picker Bar */}
          <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#f1f1f1]">
                Kolejka obrazów do scalenia: {images.length} {images.length === 1 ? 'plik' : 'plików'}
              </p>
              <p className="text-[11px] text-[#9ca3af]">
                Obsługiwane formaty: JPG, PNG, WebP (każdy obraz stanie się osobną stroną PDF)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAddImages}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#262626] hover:bg-[#2e2e2e] text-[#f1f1f1] border border-[#2e2e2e] text-xs font-medium rounded-xl transition-all">
                  <Plus className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span>Dodaj obrazy</span>
                </span>
              </label>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadSampleImages}
                disabled={isGenerating}
              >
                <span>Wczytaj próbki (sample-image1 + sample-image2)</span>
              </Button>
            </div>
          </div>

          {/* Images Grid */}
          {images.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                <span>Możesz zmieniać kolejność stron strzałkami lub usuwać pojedyncze obrazy:</span>
                <button
                  onClick={() => setImages([])}
                  className="text-[#ef4444] hover:underline"
                >
                  Wyczyść listę
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#141414] border border-[#2e2e2e] rounded-xl flex flex-col space-y-2 group relative"
                  >
                    <div className="w-full h-36 bg-[#1f1f1f] rounded-lg overflow-hidden flex items-center justify-center border border-[#2e2e2e]/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-semibold text-[#f1f1f1] truncate max-w-[120px]" title={item.file.name}>
                        {idx + 1}. {item.file.name}
                      </span>
                      <span className="text-[10px] text-[#9ca3af] font-mono">
                        {formatFileSize(item.file.size)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#2e2e2e]/60">
                      <div className="flex items-center space-x-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(idx, 'left')}
                          className="p-1 rounded bg-[#1f1f1f] hover:bg-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          title="Przesuń w lewo"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === images.length - 1}
                          onClick={() => handleMoveImage(idx, 'right')}
                          className="p-1 rounded bg-[#1f1f1f] hover:bg-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          title="Przesuń w prawo"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveImage(item.id)}
                        className="p-1 rounded bg-[#1f1f1f] hover:bg-[#ef4444]/20 text-[#ef4444] transition-all"
                        title="Usuń obraz"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-[#2e2e2e] rounded-xl text-center space-y-2">
              <ImageIcon className="w-8 h-8 text-[#6b7280] mx-auto" />
              <p className="text-xs text-[#9ca3af]">Brak dodanych grafik do scalenia.</p>
              <p className="text-[11px] text-[#6b7280]">
                Kliknij &quot;Dodaj obrazy&quot; lub skorzystaj z gotowych próbek testowych powyżej.
              </p>
            </div>
          )}

          {/* PDF Page Setup Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Page Size */}
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-2">
              <label className="text-xs font-semibold text-[#f1f1f1] block">Format strony PDF:</label>
              <div className="flex gap-2">
                {(['A4', 'LETTER', 'FIT'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setPageSize(sz)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      pageSize === sz
                        ? 'bg-[#3b82f6] text-white'
                        : 'bg-[#1f1f1f] text-[#9ca3af] hover:text-[#f1f1f1]'
                    }`}
                  >
                    {sz === 'FIT' ? 'Dopasowany' : sz}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#9ca3af]">
                {pageSize === 'A4' ? 'A4: 210 x 297 mm' : pageSize === 'LETTER' ? 'Letter: format US' : 'Dopasowany: wielkość strony zgodna z pikselami grafiki'}
              </p>
            </div>

            {/* Orientation */}
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-2">
              <label className="text-xs font-semibold text-[#f1f1f1] block">Orientacja strony:</label>
              <div className="flex gap-2">
                {(['auto', 'portrait', 'landscape'] as const).map((ori) => (
                  <button
                    key={ori}
                    onClick={() => setOrientation(ori)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      orientation === ori
                        ? 'bg-[#3b82f6] text-white'
                        : 'bg-[#1f1f1f] text-[#9ca3af] hover:text-[#f1f1f1]'
                    }`}
                  >
                    {ori === 'auto' ? 'Auto' : ori === 'portrait' ? 'Pionowa' : 'Pozioma'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#9ca3af]">
                {orientation === 'auto' ? 'Auto: automatycznie dopasuj orientację do proporcji' : orientation === 'portrait' ? 'Pionowa (pionowy arkusz)' : 'Pozioma (poziomy arkusz)'}
              </p>
            </div>

            {/* Margins */}
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-2">
              <label className="text-xs font-semibold text-[#f1f1f1] block">Marginesy wokół grafiki:</label>
              <div className="flex gap-2">
                {(['none', 'small', 'normal'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMargin(m)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      margin === m
                        ? 'bg-[#3b82f6] text-white'
                        : 'bg-[#1f1f1f] text-[#9ca3af] hover:text-[#f1f1f1]'
                    }`}
                  >
                    {m === 'none' ? 'Brak' : m === 'small' ? '10 mm' : '20 mm'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#9ca3af]">
                {margin === 'none' ? 'Bez marginesu (obraz rozciągnięty do krawędzi)' : margin === 'small' ? 'Wąski margines 10mm' : 'Standardowy margines 20mm'}
              </p>
            </div>
          </div>

          {/* Status Messages */}
          {imgError && (
            <div className="p-3 bg-[#ef4444]/15 border border-[#ef4444]/30 rounded-xl text-xs text-[#ef4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{imgError}</span>
            </div>
          )}

          {imgSuccess && (
            <div className="p-3 bg-[#10b981]/15 border border-[#10b981]/30 rounded-xl text-xs text-[#10b981] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{imgSuccess}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="emerald"
              size="lg"
              disabled={images.length === 0 || isGenerating}
              onClick={handleImagesToPdf}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Tworzenie dokumentu PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Utwórz i pobierz PDF ({images.length})</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};