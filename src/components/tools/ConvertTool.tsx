'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Code,
  FileCode,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';

export type ConvertMode = 'docx-to-pdf' | 'pdf-to-docx' | 'to-markdown' | 'to-txt';

interface ConvertToolProps {
  initialFile?: File | null;
  initialMode?: ConvertMode;
}

export const ConvertTool: React.FC<ConvertToolProps> = ({
  initialFile,
  initialMode = 'docx-to-pdf',
}) => {
  const [mode, setMode] = useState<ConvertMode>(initialMode);
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Sync mode if initialMode prop changes
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Adjust file if initialFile changes or update mode suitability
  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
      const isDocx = initialFile.name.toLowerCase().endsWith('.docx');
      const isPdf = initialFile.name.toLowerCase().endsWith('.pdf');
      if (isDocx && mode === 'pdf-to-docx') {
        setMode('docx-to-pdf');
      } else if (isPdf && mode === 'docx-to-pdf') {
        setMode('pdf-to-docx');
      }
    }
  }, [initialFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSuccessInfo(null);
      setErrorMessage(null);
      setPreviewContent(null);
    }
  };

  const handleLoadSample = async (sampleName: string) => {
    setIsConverting(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    setPreviewContent(null);
    try {
      const res = await fetch(`/api/fixtures/${sampleName}`);
      if (!res.ok) throw new Error('Nie udało się wczytać próbki testowej.');
      const blob = await res.blob();
      const sampleFile = new File([blob], sampleName, { type: blob.type });
      setFile(sampleFile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Błąd pobierania próbki.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setErrorMessage('Wybierz plik przed rozpoczęciem konwersji.');
      return;
    }

    const fileNameLower = file.name.toLowerCase();
    const isDocx = fileNameLower.endsWith('.docx');
    const isPdf = fileNameLower.endsWith('.pdf');

    if (mode === 'docx-to-pdf' && !isDocx) {
      setErrorMessage('Tryb DOCX -> PDF wymaga pliku z rozszerzeniem .docx.');
      return;
    }

    if (mode === 'pdf-to-docx' && !isPdf) {
      setErrorMessage('Tryb PDF -> DOCX wymaga pliku z rozszerzeniem .pdf.');
      return;
    }

    if ((mode === 'to-markdown' || mode === 'to-txt') && !isDocx && !isPdf) {
      setErrorMessage('Konwersja do tekstu/Markdown wymaga pliku .docx lub .pdf.');
      return;
    }

    setIsConverting(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    setPreviewContent(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = `/api/convert/${mode}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errDesc = 'Błąd serwera podczas konwersji.';
        try {
          const errJson = await res.json();
          errDesc = errJson.error || errJson.details || errDesc;
        } catch {
          // fallback
        }
        throw new Error(errDesc);
      }

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      let outputExt = 'pdf';
      if (mode === 'pdf-to-docx') outputExt = 'docx';
      else if (mode === 'to-markdown') outputExt = 'md';
      else if (mode === 'to-txt') outputExt = 'txt';

      const downloadFileName = `${baseName}.${outputExt}`;

      if (mode === 'to-markdown' || mode === 'to-txt') {
        const textData = await res.text();
        setPreviewContent(textData);
        const blob = new Blob([textData], {
          type: mode === 'to-markdown' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8',
        });
        downloadBlob(blob, downloadFileName);
      } else {
        const blob = await res.blob();
        downloadBlob(blob, downloadFileName);
      }

      setSuccessInfo(`Konwersja zakończona sukcesem! Pobrano plik: ${downloadFileName}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Wystąpił nieoczekiwany błąd podczas konwersji.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopyPreview = () => {
    if (!previewContent) return;
    navigator.clipboard.writeText(previewContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getAcceptedExtensions = () => {
    switch (mode) {
      case 'docx-to-pdf':
        return '.docx';
      case 'pdf-to-docx':
        return '.pdf';
      case 'to-markdown':
      case 'to-txt':
        return '.docx,.pdf';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-2">
        <div className="flex items-center space-x-2">
          <Badge variant="blue">Moduł M4</Badge>
          <h3 className="text-lg font-bold text-[#f1f1f1]">
            Konwersje Dokumentów (DOCX, PDF, MD, TXT)
          </h3>
        </div>
        <p className="text-xs text-[#9ca3af]">
          Bezstratna konwersja lokalna za pomocą silnika LibreOffice headless oraz ekstrakcja do formatów Markdown i czystego tekstu UTF-8.
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => {
            setMode('docx-to-pdf');
            setErrorMessage(null);
            setSuccessInfo(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            mode === 'docx-to-pdf'
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
              : 'border-[#2e2e2e] bg-[#1f1f1f] text-[#9ca3af] hover:border-[#3b82f6]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs">DOCX ➔ PDF</span>
            <Badge variant={mode === 'docx-to-pdf' ? 'blue' : 'gray'}>Soffice</Badge>
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            Konwersja Word do PDF z wiernym odwzorowaniem tabel i stylów.
          </p>
        </button>

        <button
          onClick={() => {
            setMode('pdf-to-docx');
            setErrorMessage(null);
            setSuccessInfo(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            mode === 'pdf-to-docx'
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
              : 'border-[#2e2e2e] bg-[#1f1f1f] text-[#9ca3af] hover:border-[#3b82f6]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs">PDF ➔ DOCX</span>
            <Badge variant={mode === 'pdf-to-docx' ? 'blue' : 'gray'}>Writer</Badge>
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            Ekstrakcja tekstu i układu strony z PDF do edytowalnego pliku Word.
          </p>
        </button>

        <button
          onClick={() => {
            setMode('to-markdown');
            setErrorMessage(null);
            setSuccessInfo(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            mode === 'to-markdown'
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
              : 'border-[#2e2e2e] bg-[#1f1f1f] text-[#9ca3af] hover:border-[#3b82f6]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs">Do Markdown (.md)</span>
            <Badge variant={mode === 'to-markdown' ? 'blue' : 'gray'}>GFM</Badge>
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            Eksport nagłówków, list, tabel i formatowania do składni .md.
          </p>
        </button>

        <button
          onClick={() => {
            setMode('to-txt');
            setErrorMessage(null);
            setSuccessInfo(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            mode === 'to-txt'
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
              : 'border-[#2e2e2e] bg-[#1f1f1f] text-[#9ca3af] hover:border-[#3b82f6]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs">Do Tekstu (.txt)</span>
            <Badge variant={mode === 'to-txt' ? 'blue' : 'gray'}>UTF-8</Badge>
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            Szybka ekstrakcja surowego tekstu bez tagów i formatowania.
          </p>
        </button>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-6">
        {/* File Selection Box */}
        <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#f1f1f1] truncate">
                {file ? file.name : 'Nie wybrano pliku źródłowego'}
              </p>
              <p className="text-[11px] text-[#9ca3af]">
                {file
                  ? `Rozmiar: ${formatFileSize(file.size)} • Format: ${file.name.split('.').pop()?.toUpperCase()}`
                  : `Wymagany format: ${getAcceptedExtensions()}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept={getAcceptedExtensions()}
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#262626] hover:bg-[#2e2e2e] text-[#f1f1f1] border border-[#2e2e2e] text-xs font-medium rounded-xl transition-all">
                <span>{file ? 'Zmień plik' : 'Wybierz plik'}</span>
              </span>
            </label>

            {/* Quick Sample Buttons */}
            {(mode === 'docx-to-pdf' || mode === 'to-markdown' || mode === 'to-txt') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleLoadSample('sample-document.docx')}
                disabled={isConverting}
              >
                <span>Wczytaj sample-document.docx</span>
              </Button>
            )}

            {(mode === 'pdf-to-docx' || mode === 'to-markdown' || mode === 'to-txt') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleLoadSample('sample-multipage.pdf')}
                disabled={isConverting}
              >
                <span>Wczytaj sample-multipage.pdf</span>
              </Button>
            )}
          </div>
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
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-[#9ca3af]">
            Silnik: <span className="font-semibold text-[#f1f1f1]">LibreOffice 24.8 / Poppler / Mammoth</span> (100% lokalnie)
          </div>
          <Button
            variant="emerald"
            size="lg"
            disabled={!file || isConverting}
            onClick={handleConvert}
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Trwa konwersja...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Uruchom konwersję i pobierz</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Live Text / Markdown Preview Section */}
      {previewContent && (
        <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-[#3b82f6]" />
              <h4 className="text-sm font-semibold text-[#f1f1f1]">
                Podgląd wygenerowanej treści ({mode === 'to-markdown' ? 'Markdown' : 'Tekst'})
              </h4>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyPreview}>
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Skopiowano</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopiuj do schowka</span>
                </>
              )}
            </Button>
          </div>

          <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl max-h-96 overflow-y-auto font-mono text-xs text-[#d1d5db] whitespace-pre-wrap leading-relaxed select-text">
            {previewContent}
          </div>
        </div>
      )}
    </div>
  );
};