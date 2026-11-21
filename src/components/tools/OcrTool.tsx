'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Languages,
  Sparkles,
  FileCode,
  FileBox,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';

interface OcrToolProps {
  initialFile?: File | null;
}

export const OcrTool: React.FC<OcrToolProps> = ({ initialFile }) => {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [language, setLanguage] = useState<'pol' | 'eng' | 'pol+eng'>('pol+eng');
  const [outputFormat, setOutputFormat] = useState<'txt' | 'docx' | 'pdf'>('txt');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [extractedText, setExtractedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const handleLoadSample = async (sampleName: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/fixtures/${sampleName}`);
      if (!res.ok) throw new Error('Nie udało się pobrać pliku testowego');
      const blob = await res.blob();
      const loadedFile = new File([blob], sampleName, { type: blob.type || 'image/png' });
      setFile(loadedFile);
      setExtractedText('');
      setConfidence(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRunOcr = async () => {
    if (!file) {
      setError('Wybierz plik ze skanem lub dokumentem do analizy OCR');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(15);

    // Simulate progress ticks
    const interval = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 12 : p));
    }, 400);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);
      formData.append('download', 'false');

      const res = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setProgress(100);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Błąd serwera (Status: ${res.status})`);
      }

      const data = await res.json();
      setExtractedText(data.text || '');
      setConfidence(data.confidence ?? null);
      setWordCount(data.wordCount ?? 0);
      setCharCount(data.charCount ?? 0);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || 'Wystąpił nieoczekiwany błąd podczas rozpoznawania OCR');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Błąd kopiowania:', err);
    }
  };

  const handleDownloadFile = async () => {
    if (!file || !extractedText) return;
    setIsDownloading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);
      formData.append('outputFormat', outputFormat);
      formData.append('download', 'true');

      const res = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Błąd generowania pliku do pobrania');

      const blob = await res.blob();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}-ocr.${outputFormat}`;
      downloadBlob(blob, outName);
    } catch (err: any) {
      setError(err.message || 'Błąd pobierania pliku');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload / Selection */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f1f1f1]">
                {file ? file.name : 'Nie wybrano pliku'}
              </h3>
              <p className="text-xs text-[#9ca3af]">
                {file ? `Rozmiar: ${formatFileSize(file.size)}` : 'Wybierz skan graficzny (PNG/JPG) lub wielostronicowy PDF'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) {
                    setFile(selected);
                    setExtractedText('');
                    setConfidence(null);
                    setError(null);
                  }
                }}
              />
              <span className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-medium rounded-xl bg-[#262626] hover:bg-[#333333] text-[#f1f1f1] border border-[#333333] transition-colors">
                Wybierz plik z dysku
              </span>
            </label>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleLoadSample('sample-scanned.png')}
            >
              sample-scanned.png (Skan PL/EN)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleLoadSample('sample-multipage.pdf')}
            >
              sample-multipage.pdf
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Settings & Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settings (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Language Selection */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-[#f1f1f1] flex items-center space-x-2">
              <Languages className="w-4 h-4 text-[#3b82f6]" />
              <span>Język tekstu</span>
            </h4>

            <div className="space-y-2">
              {[
                { id: 'pol+eng', label: 'Polski + Angielski (Autodetekcja)', desc: 'Zalecany dla dokumentów z polskimi znakami' },
                { id: 'pol', label: 'Tylko Język Polski (pol)', desc: 'Maksymalna czułość polskich znaków diakrytycznych' },
                { id: 'eng', label: 'Tylko Język Angielski (eng)', desc: 'Dla dokumentów w języku angielskim' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id as any)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    language === lang.id
                      ? 'bg-[#3b82f6]/15 border-[#3b82f6] text-[#f1f1f1]'
                      : 'bg-[#141414] border-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1]'
                  }`}
                >
                  <div className="text-xs font-semibold">{lang.label}</div>
                  <div className="text-[11px] text-[#9ca3af] mt-0.5">{lang.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Output Format */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-[#f1f1f1] flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-[#10b981]" />
              <span>Format eksportu</span>
            </h4>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'txt', label: '.TXT', desc: 'Czysty tekst' },
                { id: 'docx', label: '.DOCX', desc: 'Word' },
                { id: 'pdf', label: '.PDF', desc: 'Dokument' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setOutputFormat(fmt.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    outputFormat === fmt.id
                      ? 'bg-[#10b981]/20 border-[#10b981] text-[#34d399]'
                      : 'bg-[#141414] border-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1]'
                  }`}
                >
                  <div className="text-xs font-bold">{fmt.label}</div>
                  <div className="text-[10px] text-[#9ca3af]">{fmt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Trigger */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!file || isProcessing}
            onClick={handleRunOcr}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>Rozpoznawanie tekstu ({progress}%)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                <span>Uruchom Silnik OCR</span>
              </>
            )}
          </Button>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#9ca3af]">
                <span>Przetwarzanie Tesseract.js...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-[#2e2e2e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3b82f6] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-4 flex items-center space-x-3 text-[#ef4444]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}
        </div>

        {/* Right Column: Extracted Text Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4 flex flex-col h-full min-h-[500px]">
            {/* Header with Stats & Copy */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2e2e2e] pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#3b82f6]" />
                <span className="text-sm font-semibold text-[#f1f1f1]">Wyekstrahowany tekst</span>
                {confidence !== null && (
                  <Badge variant={confidence > 80 ? 'emerald' : 'amber'}>
                    Dokładność: {confidence}%
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {extractedText && (
                  <span className="text-xs text-[#9ca3af] hidden sm:inline">
                    Słowa: {wordCount} • Znaki: {charCount}
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!extractedText}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-[#10b981]" />
                      <span className="text-[#10b981]">Skopiowano!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      <span>Kopiuj</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!extractedText || isDownloading}
                  onClick={handleDownloadFile}
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  <span>Pobierz .{outputFormat.toUpperCase()}</span>
                </Button>
              </div>
            </div>

            {/* Editable Text Area */}
            <div className="flex-1 relative">
              <textarea
                value={extractedText}
                onChange={(e) => {
                  setExtractedText(e.target.value);
                  setWordCount(e.target.value.trim().split(/\s+/).filter(Boolean).length);
                  setCharCount(e.target.value.length);
                }}
                placeholder="Wyekstrahowany tekst pojawi się tutaj po uruchomieniu silnika OCR. Możesz go dowolnie edytować przed pobraniem..."
                className="w-full h-full min-h-[400px] p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl text-xs md:text-sm font-mono text-[#f1f1f1] leading-relaxed resize-none focus:outline-none focus:border-[#3b82f6]"
              />
            </div>

            {/* Footer Status */}
            <div className="flex items-center justify-between text-xs text-[#9ca3af] pt-1">
              <span>Lokalny model Tesseract.js (bez wysyłania danych do chmury)</span>
              {extractedText && (
                <span className="text-[#10b981] flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tekst gotowy do eksportu</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
