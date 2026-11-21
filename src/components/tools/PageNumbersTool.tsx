'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Hash,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';

interface PageNumbersToolProps {
  initialFile?: File | null;
}

export const PageNumbersTool: React.FC<PageNumbersToolProps> = ({ initialFile }) => {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [format, setFormat] = useState<string>('Strona {n} z {total}');
  const [position, setPosition] = useState<
    'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left'
  >('bottom-center');
  const [margin, setMargin] = useState<number>(30);
  const [startNumber, setStartNumber] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(10);
  const [color, setColor] = useState<string>('#333333');
  const [skipFirstPage, setSkipFirstPage] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');

  const formatPresets = [
    { label: 'Strona {n} z {total}', value: 'Strona {n} z {total}' },
    { label: '{n} / {total}', value: '{n} / {total}' },
    { label: '- {n} -', value: '- {n} -' },
    { label: 'Strona {n}', value: 'Strona {n}' },
    { label: '{n}', value: '{n}' },
  ];

  const positionPresets = [
    { id: 'top-left', label: 'Góra - Lewo' },
    { id: 'top-center', label: 'Góra - Środek' },
    { id: 'top-right', label: 'Góra - Prawo' },
    { id: 'bottom-left', label: 'Dół - Lewo' },
    { id: 'bottom-center', label: 'Dół - Środek' },
    { id: 'bottom-right', label: 'Dół - Prawo' },
  ];

  const handleLoadSample = async (sampleName: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/fixtures/${sampleName}`);
      if (!res.ok) throw new Error('Nie udało się wczytać pliku testowego');
      const blob = await res.blob();
      const loadedFile = new File([blob], sampleName, { type: 'application/pdf' });
      setFile(loadedFile);
      setResultBlob(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApplyPageNumbers = async () => {
    if (!file) {
      setError('Wybierz lub wgraj plik PDF');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);
      formData.append('position', position);
      formData.append('margin', margin.toString());
      formData.append('startNumber', startNumber.toString());
      formData.append('fontSize', fontSize.toString());
      formData.append('color', color);
      formData.append('skipFirstPage', skipFirstPage ? 'true' : 'false');

      const res = await fetch('/api/pdf/page-numbers', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Błąd serwera (Status: ${res.status})`);
      }

      const blob = await res.blob();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}-ponumerowany.pdf`;

      setResultBlob(blob);
      setResultFileName(outName);
      downloadBlob(blob, outName);
    } catch (err: any) {
      setError(err.message || 'Wystąpił nieoczekiwany błąd podczas dodawania numeracji');
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview label simulation
  const previewLabel = format.replace('{n}', '1').replace('{total}', '5');

  return (
    <div className="space-y-6">
      {/* File Upload / Selection */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f1f1f1]">
                {file ? file.name : 'Nie wybrano pliku PDF'}
              </h3>
              <p className="text-xs text-[#9ca3af]">
                {file ? `Rozmiar: ${formatFileSize(file.size)}` : 'Wybierz plik PDF z dysku lub użyj próbki testowej'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) {
                    setFile(selected);
                    setResultBlob(null);
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
              onClick={() => handleLoadSample('sample-multipage.pdf')}
            >
              sample-multipage.pdf (5 stron)
            </Button>
          </div>
        </div>
      </div>

      {/* Main Controls & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Format Selection */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-[#f1f1f1] flex items-center space-x-2">
              <Hash className="w-4 h-4 text-[#10b981]" />
              <span>Szablon numeracji</span>
            </h4>

            <div>
              <Input
                label="Format numeracji (znaczniki {n} i {total})"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="Strona {n} z {total}"
              />
            </div>

            <div>
              <span className="text-xs text-[#9ca3af] block mb-2 font-medium">Szybkie szablony:</span>
              <div className="flex flex-wrap gap-1.5">
                {formatPresets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormat(p.value)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      format === p.value
                        ? 'bg-[#10b981]/20 border-[#10b981] text-[#34d399]'
                        : 'bg-[#141414] border-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Position Grid */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-[#f1f1f1] flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#3b82f6]" />
              <span>Pozycja numeracji na stronie</span>
            </h4>

            <div className="grid grid-cols-3 gap-2">
              {positionPresets.map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setPosition(pos.id as any)}
                  className={`py-2.5 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                    position === pos.id
                      ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#60a5fa]'
                      : 'bg-[#141414] border-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1]'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>

            {/* Geometry Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <div className="flex justify-between text-xs text-[#9ca3af] mb-1">
                  <span>Margines od krawędzi</span>
                  <span className="font-mono text-[#f1f1f1]">{margin} pt</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="5"
                  value={margin}
                  onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-[#2e2e2e] rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#9ca3af] mb-1">
                  <span>Rozmiar fontu</span>
                  <span className="font-mono text-[#f1f1f1]">{fontSize} pt</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="18"
                  step="1"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-[#2e2e2e] rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#9ca3af] mb-1">
                  <span>Numer początkowy</span>
                  <span className="font-mono text-[#f1f1f1]">{startNumber}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={startNumber}
                  onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-2.5 py-1 bg-[#141414] border border-[#2e2e2e] rounded-lg text-xs text-[#f1f1f1]"
                />
              </div>
            </div>

            {/* Color & Skip first page */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#2e2e2e]">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-[#9ca3af] font-medium">Kolor tekstu:</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-lg bg-transparent border border-[#2e2e2e] cursor-pointer"
                />
                <div className="flex space-x-1.5">
                  {['#333333', '#6b7280', '#000000', '#2563eb'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-md border ${
                        color.toLowerCase() === c.toLowerCase() ? 'border-white scale-110' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipFirstPage}
                  onChange={(e) => setSkipFirstPage(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2e2e2e] bg-[#141414] text-[#10b981] focus:ring-[#10b981]"
                />
                <span className="text-xs text-[#f1f1f1] font-medium">Pomiń stronę tytułową (1 stronę)</span>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!file || isProcessing}
              onClick={handleApplyPageNumbers}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Nanoszenie numeracji stron...</span>
                </>
              ) : (
                <>
                  <Hash className="w-5 h-5 mr-2" />
                  <span>Ponumeruj Strony PDF i Pobierz</span>
                </>
              )}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-4 flex items-center space-x-3 text-[#ef4444]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {resultBlob && (
            <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-[#10b981]">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold">
                  Numeracja została dodana pomyślnie ({formatFileSize(resultBlob.size)})!
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadBlob(resultBlob, resultFileName)}
              >
                <Download className="w-4 h-4 mr-1 text-[#10b981]" />
                <span>Pobierz ponownie</span>
              </Button>
            </div>
          )}
        </div>

        {/* Live Preview Column (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 flex flex-col items-center justify-center space-y-4">
            <div className="w-full flex items-center justify-between border-b border-[#2e2e2e] pb-3">
              <span className="text-xs font-semibold text-[#f1f1f1]">Podgląd ułożenia numeracji</span>
              <Badge variant="emerald">Strona 1 z 5</Badge>
            </div>

            {/* A4 Sheet Simulation */}
            <div className="relative w-full max-w-[280px] aspect-[1/1.414] bg-[#141414] border border-[#333333] rounded-xl shadow-2xl overflow-hidden flex flex-col justify-between p-4 select-none">
              {/* Top Row for top positions */}
              <div className="flex justify-between items-center text-[10px] min-h-[16px]">
                <div className="w-1/3 text-left">
                  {position === 'top-left' && (
                    <span style={{ color, fontSize: `${fontSize}px` }} className="font-mono font-medium">
                      {previewLabel}
                    </span>
                  )}
                </div>
                <div className="w-1/3 text-center">
                  {position === 'top-center' && (
                    <span style={{ color, fontSize: `${fontSize}px` }} className="font-mono font-medium">
                      {previewLabel}
                    </span>
                  )}
                </div>
                <div className="w-1/3 text-right">
                  {position === 'top-right' && (
                    <span style={{ color, fontSize: `${fontSize}px` }} className="font-mono font-medium">
                      {previewLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Wireframe Page Content */}
              <div className="space-y-2 opacity-25 py-4">
                <div className="h-3 bg-gray-600 rounded w-2/3" />
                <div className="h-2 bg-gray-700 rounded w-full" />
                <div className="h-2 bg-gray-700 rounded w-5/6" />
                <div className="h-2 bg-gray-700 rounded w-4/5" />
                <div className="h-14 bg-[#1f1f1f] border border-gray-700 rounded mt-3" />
                <div className="h-2 bg-gray-700 rounded w-full mt-3" />
                <div className="h-2 bg-gray-700 rounded w-3/4" />
              </div>

              {/* Bottom Row for bottom positions */}
              <div className="flex justify-between items-center text-[10px] min-h-[16px]">
                <div className="w-1/3 text-left">
                  {position === 'bottom-left' && (
                    <span style={{ color, fontSize: `${fontSize}px` }} className="font-mono font-medium">
                      {previewLabel}
                    </span>
                  )}
                </div>
                <div className="w-1/3 text-center">
                  {position === 'bottom-center' && (
                    <span style={{ color, fontSize: `${fontSize}px` }} className="font-mono font-medium">
                      {previewLabel}
                    </span>
                  )}
                </div>
                <div className="w-1/3 text-right">
                  {position === 'bottom-right' && (
                    <span style={{ color, fontSize: `${fontSize}px` }} className="font-mono font-medium">
                      {previewLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#9ca3af] text-center max-w-xs">
              {skipFirstPage
                ? 'Strona tytułowa (pierwsza) zostanie pominięta, numeracja rozpocznie się od strony 2.'
                : 'Numeracja zostanie naniesiona na wszystkie strony dokumentu.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
