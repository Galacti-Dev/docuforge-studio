'use client';

import React, { useState } from 'react';
import {
  FileBox,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Settings2,
  Package,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';

interface SplitToolProps {
  initialFile?: File | null;
}

export const SplitTool: React.FC<SplitToolProps> = ({ initialFile }) => {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [mode, setMode] = useState<'single' | 'ranges' | 'fixed'>('ranges');
  const [ranges, setRanges] = useState<string>('2-4');
  const [interval, setInterval] = useState<number>(2);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSuccessInfo(null);
      setErrorMessage(null);
    }
  };

  const handleLoadSample = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/fixtures/sample-multipage.pdf');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'sample-multipage.pdf', { type: 'application/pdf' });
      setFile(sampleFile);
      setSuccessInfo(null);
      setErrorMessage(null);
    } catch (err) {
      console.error('Błąd wczytywania próbki:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (!file) {
      setErrorMessage('Wybierz plik PDF do podziału.');
      return;
    }

    if (mode === 'ranges' && !ranges.trim()) {
      setErrorMessage('Podaj prawidłowy zakres stron (np. "2-4").');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      if (mode === 'ranges') formData.append('ranges', ranges.trim());
      if (mode === 'fixed') formData.append('interval', String(interval));

      const res = await fetch('/api/pdf/split', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Błąd podczas dzielenia pliku PDF.');
      }

      const contentType = res.headers.get('Content-Type') || '';
      const isZip = contentType.includes('zip');
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const downloadName = isZip ? `${baseName}-podzielone.zip` : `${baseName}-zakres.pdf`;

      const blob = await res.blob();
      downloadBlob(blob, downloadName);

      setSuccessInfo(
        isZip
          ? `Dokument podzielono na paczkę archiwum ZIP (${downloadName}). Pobieranie rozpoczęte!`
          : `Wycięto wybrany zakres do pojedynczego pliku PDF (${downloadName}). Pobieranie rozpoczęte!`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Wystąpił błąd podczas podziału.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-2">
        <div className="flex items-center space-x-2">
          <Badge variant="blue">Moduł M3</Badge>
          <h3 className="text-lg font-bold text-[#f1f1f1]">Dzielenie Dokumentu PDF (Split)</h3>
        </div>
        <p className="text-xs text-[#9ca3af]">
          Wyodrębnij konkretne zakresy stron, podziel dokument na pojedyncze kartki lub rozbij na równe części co N stron.
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-6">
        {/* Selected File Section */}
        <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#f1f1f1]">
                {file ? file.name : 'Nie wybrano pliku'}
              </p>
              <p className="text-[11px] text-[#9ca3af]">
                {file ? `Rozmiar: ${formatFileSize(file.size)}` : 'Wgraj PDF lub wczytaj próbkę'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#262626] hover:bg-[#2e2e2e] text-[#f1f1f1] border border-[#2e2e2e] text-xs font-medium rounded-xl transition-all">
                <span>Zmień plik</span>
              </span>
            </label>

            <Button variant="secondary" size="sm" onClick={handleLoadSample} disabled={isProcessing}>
              <span>Wczytaj sample-multipage.pdf</span>
            </Button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-[#f1f1f1] uppercase tracking-wider">
            Wybierz tryb podziału:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              onClick={() => setMode('ranges')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                mode === 'ranges'
                  ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                  : 'border-[#2e2e2e] bg-[#141414] text-[#9ca3af] hover:border-[#3b82f6]/50'
              }`}
            >
              <div className="font-semibold text-xs mb-1">Wybrane zakresy stron</div>
              <p className="text-[11px] leading-relaxed opacity-80">
                Wytnij strony według zakresu, np. 2-4 lub 1-2, 4-5.
              </p>
            </div>

            <div
              onClick={() => setMode('single')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                mode === 'single'
                  ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                  : 'border-[#2e2e2e] bg-[#141414] text-[#9ca3af] hover:border-[#3b82f6]/50'
              }`}
            >
              <div className="font-semibold text-xs mb-1">Każda strona osobno</div>
              <p className="text-[11px] leading-relaxed opacity-80">
                Zapisz każdą stronę jako osobny plik PDF spakowany w ZIP.
              </p>
            </div>

            <div
              onClick={() => setMode('fixed')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                mode === 'fixed'
                  ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                  : 'border-[#2e2e2e] bg-[#141414] text-[#9ca3af] hover:border-[#3b82f6]/50'
              }`}
            >
              <div className="font-semibold text-xs mb-1">Stały przedział stron</div>
              <p className="text-[11px] leading-relaxed opacity-80">
                Podziel dokument co N stron (np. co 2 strony).
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Mode Inputs */}
        {mode === 'ranges' && (
          <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-2">
            <label className="text-xs font-medium text-[#f1f1f1]">
              Zakres stron do wycięcia:
            </label>
            <Input
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              placeholder="np. 2-4 lub 1-3, 5"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-[#9ca3af]">
              Pojedynczy zakres (np. &quot;2-4&quot;) generuje pojedynczy plik PDF. Wiele zakresów (np. &quot;1-2, 4-5&quot;) jest pakowanych do archiwum ZIP.
            </p>
          </div>
        )}

        {mode === 'fixed' && (
          <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-2">
            <label className="text-xs font-medium text-[#f1f1f1]">
              Liczba stron na każdy plik:
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32 bg-[#1f1f1f] border border-[#2e2e2e] rounded-xl px-3 py-2 text-xs font-mono text-[#f1f1f1] outline-none focus:border-[#3b82f6]"
            />
            <p className="text-[11px] text-[#9ca3af]">
              Dokument zostanie podzielony na części po {interval} stron każda i pobrany w ZIP.
            </p>
          </div>
        )}

        {/* Notifications */}
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
            disabled={!file || isProcessing}
            onClick={handleSplit}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Dzielenie dokumentu...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Podziel i pobierz wynik</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
