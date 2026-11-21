'use client';

import React, { useState, useEffect } from 'react';
import {
  Minimize2,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Zap,
  Printer,
  BookOpen,
  Smartphone,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';

export type CompressionLevel = 'low' | 'balanced' | 'extreme';

interface CompressToolProps {
  initialFile?: File | null;
}

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  fileName: string;
}

export const CompressTool: React.FC<CompressToolProps> = ({ initialFile }) => {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [level, setLevel] = useState<CompressionLevel>('balanced');
  const [linearize, setLinearize] = useState<boolean>(true);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [stats, setStats] = useState<CompressionStats | null>(null);

  useEffect(() => {
    if (initialFile && initialFile.name.toLowerCase().endsWith('.pdf')) {
      setFile(initialFile);
    }
  }, [initialFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
      setSuccessInfo(null);
      setStats(null);
    }
  };

  const handleLoadSample = async (sampleName: string) => {
    setIsCompressing(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    setStats(null);
    try {
      const res = await fetch(`/api/fixtures/${sampleName}`);
      if (!res.ok) throw new Error('Nie udało się wczytać próbki testowej PDF.');
      const blob = await res.blob();
      const sampleFile = new File([blob], sampleName, { type: 'application/pdf' });
      setFile(sampleFile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Błąd pobierania próbki.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCompress = async () => {
    if (!file) {
      setErrorMessage('Wybierz plik PDF do kompresji.');
      return;
    }

    setIsCompressing(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    setStats(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('level', level);
      formData.append('linearize', String(linearize));

      const res = await fetch('/api/pdf/compress', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errDesc = 'Błąd serwera podczas kompresji pliku PDF.';
        try {
          const errJson = await res.json();
          errDesc = errJson.error || errJson.details || errDesc;
        } catch {
          // ignore
        }
        throw new Error(errDesc);
      }

      const origSize = parseInt(res.headers.get('X-Original-Size') || String(file.size), 10);
      const compSize = parseInt(res.headers.get('X-Compressed-Size') || '0', 10);
      const redPercent = parseInt(res.headers.get('X-Reduction-Percent') || '0', 10);

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}-skompresowany.pdf`;

      const blob = await res.blob();
      downloadBlob(blob, downloadName);

      setStats({
        originalSize: origSize,
        compressedSize: compSize || blob.size,
        reductionPercent: redPercent,
        fileName: downloadName,
      });

      setSuccessInfo(`Kompresja zakończona pomyślnie! Pobrano plik: ${downloadName}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Wystąpił nieoczekiwany błąd podczas optymalizacji PDF.');
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-2">
        <div className="flex items-center space-x-2">
          <Badge variant="blue">Moduł M6</Badge>
          <h3 className="text-lg font-bold text-[#f1f1f1]">
            Kompresja i Optymalizacja PDF
          </h3>
        </div>
        <p className="text-xs text-[#9ca3af]">
          Zaawansowane profile optymalizacji Ghostscript z redukcją rozdzielczości obrazów i linearyzacją strumieni QPDF dla błyskawicznego ładowania w sieci.
        </p>
      </div>

      {/* Main Container */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-6">
        {/* File Picker */}
        <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#f1f1f1] truncate">
                {file ? file.name : 'Nie wybrano pliku PDF'}
              </p>
              <p className="text-[11px] text-[#9ca3af]">
                {file ? `Rozmiar źródłowy: ${formatFileSize(file.size)}` : 'Wskaż dokument PDF do optymalizacji'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#262626] hover:bg-[#2e2e2e] text-[#f1f1f1] border border-[#2e2e2e] text-xs font-medium rounded-xl transition-all">
                <span>{file ? 'Zmień plik' : 'Wybierz plik'}</span>
              </span>
            </label>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleLoadSample('sample-images.pdf')}
              disabled={isCompressing}
            >
              <span>Wczytaj sample-images.pdf</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleLoadSample('sample-multipage.pdf')}
              disabled={isCompressing}
            >
              <span>Wczytaj sample-multipage.pdf</span>
            </Button>
          </div>
        </div>

        {/* Compression Profile Selector Cards */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#f1f1f1] uppercase tracking-wider block">
            Wybierz profil kompresji Ghostscript:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Low */}
            <div
              onClick={() => setLevel('low')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                level === 'low'
                  ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white ring-1 ring-[#3b82f6]'
                  : 'border-[#2e2e2e] bg-[#141414] text-[#9ca3af] hover:border-[#3b82f6]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Printer className="w-4 h-4 text-[#3b82f6]" />
                  <span className="font-semibold text-xs text-[#f1f1f1]">Lekka kompresja</span>
                </div>
                <Badge variant={level === 'low' ? 'blue' : 'gray'}>300 DPI</Badge>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed mb-2">
                Profil <code>/printer</code>. Minimalna utrata jakości, pełna ostrość grafik i wektorów.
              </p>
              <span className="text-[10px] text-[#3b82f6] block font-medium">
                Zalecane: oficjalne dokumenty, certyfikaty i wydruki.
              </span>
            </div>

            {/* Balanced */}
            <div
              onClick={() => setLevel('balanced')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                level === 'balanced'
                  ? 'border-[#10b981] bg-[#10b981]/10 text-white ring-1 ring-[#10b981]'
                  : 'border-[#2e2e2e] bg-[#141414] text-[#9ca3af] hover:border-[#10b981]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-[#10b981]" />
                  <span className="font-semibold text-xs text-[#f1f1f1]">Zbalansowana</span>
                </div>
                <Badge variant={level === 'balanced' ? 'emerald' : 'gray'}>Zalecany</Badge>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed mb-2">
                Profil <code>/ebook</code> (150 DPI). Optymalny kompromis między czytelnością a rozmiarem.
              </p>
              <span className="text-[10px] text-[#10b981] block font-medium">
                Zalecane: prezentacje, raporty, e-booki i codzienna praca.
              </span>
            </div>

            {/* Extreme */}
            <div
              onClick={() => setLevel('extreme')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                level === 'extreme'
                  ? 'border-[#f59e0b] bg-[#f59e0b]/10 text-white ring-1 ring-[#f59e0b]'
                  : 'border-[#2e2e2e] bg-[#141414] text-[#9ca3af] hover:border-[#f59e0b]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-[#f59e0b]" />
                  <span className="font-semibold text-xs text-[#f1f1f1]">Maksymalna</span>
                </div>
                <Badge variant={level === 'extreme' ? 'amber' : 'gray'}>72 DPI</Badge>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed mb-2">
                Profil <code>/screen</code>. Agresywna kompresja grafik rastrowych pod limity e-mail.
              </p>
              <span className="text-[10px] text-[#f59e0b] block font-medium">
                Zalecane: załączniki pocztowe, podgląd na telefonie, archiwum.
              </span>
            </div>
          </div>
        </div>

        {/* Linearization Checkbox */}
        <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#3b82f6]" />
              <label htmlFor="linearize" className="text-xs font-semibold text-[#f1f1f1] cursor-pointer">
                Linearyzacja QPDF (Fast Web View)
              </label>
            </div>
            <p className="text-[11px] text-[#9ca3af]">
              Przeorganizowuje strukturę PDF, aby przeglądarki internetowe mogły wyświetlać pierwszą stronę natychmiast bez czekania na pobranie całego pliku.
            </p>
          </div>
          <input
            type="checkbox"
            id="linearize"
            checked={linearize}
            onChange={(e) => setLinearize(e.target.checked)}
            className="w-4 h-4 rounded bg-[#1f1f1f] border-[#2e2e2e] text-[#3b82f6] focus:ring-0 cursor-pointer"
          />
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="p-3 bg-[#ef4444]/15 border border-[#ef4444]/30 rounded-xl text-xs text-[#ef4444] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successInfo && (
          <div className="p-3 bg-[#10b981]/15 border border-[#10b981]/30 rounded-xl text-xs text-[#10b981] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <Button
            variant="emerald"
            size="lg"
            disabled={!file || isCompressing}
            onClick={handleCompress}
          >
            {isCompressing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Optymalizacja dokumentu...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Kompresuj i pobierz PDF</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Visual Size Comparison Box */}
      {stats && (
        <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-[#10b981]" />
              <h4 className="text-sm font-semibold text-[#f1f1f1]">
                Wyniki redukcji rozmiaru
              </h4>
            </div>
            <Badge variant="emerald">
              Zaoszczędzono {stats.reductionPercent}%
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl">
              <span className="text-[11px] text-[#9ca3af] block mb-1">Przed kompresją</span>
              <span className="text-lg font-bold text-[#f1f1f1] font-mono">
                {formatFileSize(stats.originalSize)}
              </span>
            </div>

            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl">
              <span className="text-[11px] text-[#9ca3af] block mb-1">Po optymalizacji</span>
              <span className="text-lg font-bold text-[#10b981] font-mono">
                {formatFileSize(stats.compressedSize)}
              </span>
            </div>

            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl">
              <span className="text-[11px] text-[#9ca3af] block mb-1">Zaoszczędzona przestrzeń</span>
              <span className="text-lg font-bold text-[#3b82f6] font-mono">
                {stats.originalSize > stats.compressedSize
                  ? `-${formatFileSize(stats.originalSize - stats.compressedSize)}`
                  : 'Zoptymalizowano strukturę'}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] text-[#9ca3af]">
              <span>Rozmiar wyjściowy ({Math.max(1, 100 - stats.reductionPercent)}%)</span>
              <span>100% oryginału</span>
            </div>
            <div className="w-full h-3 bg-[#141414] border border-[#2e2e2e] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#3b82f6] to-[#10b981] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, 100 - stats.reductionPercent)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};