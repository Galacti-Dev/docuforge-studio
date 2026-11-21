'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sliders,
  RotateCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';

interface WatermarkToolProps {
  initialFile?: File | null;
}

export const WatermarkTool: React.FC<WatermarkToolProps> = ({ initialFile }) => {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [text, setText] = useState<string>('POUFNE');
  const [fontSize, setFontSize] = useState<number>(48);
  const [rotation, setRotation] = useState<number>(45);
  const [color, setColor] = useState<string>('#ef4444');
  const [opacity, setOpacity] = useState<number>(0.3);
  const [position, setPosition] = useState<'center' | 'tile' | 'header' | 'footer'>('center');
  const [pages, setPages] = useState<string>('all');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');

  const quickPresets = ['POUFNE', 'KOPIA', 'PROJEKT', 'PILNE', 'WERSJA ROBOCZA', 'DO WGLĄDU'];
  const quickColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6b7280', '#000000'];

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

  const handleApplyWatermark = async () => {
    if (!file) {
      setError('Wybierz lub wgraj plik PDF');
      return;
    }
    if (!text.trim()) {
      setError('Wprowadź tekst znaku wodnego');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('text', text);
      formData.append('fontSize', fontSize.toString());
      formData.append('rotation', rotation.toString());
      formData.append('color', color);
      formData.append('opacity', opacity.toString());
      formData.append('position', position);
      formData.append('pages', pages);

      const res = await fetch('/api/pdf/watermark', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Błąd serwera (Status: ${res.status})`);
      }

      const blob = await res.blob();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}-znak-wodny.pdf`;

      setResultBlob(blob);
      setResultFileName(outName);
      downloadBlob(blob, outName);
    } catch (err: any) {
      setError(err.message || 'Wystąpił nieoczekiwany błąd podczas nakładania znaku wodnego');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload / Selection */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
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
              sample-multipage.pdf
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleLoadSample('sample-images.pdf')}
            >
              sample-images.pdf
            </Button>
          </div>
        </div>
      </div>

      {/* Main Controls & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Watermark Text & Presets */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-[#f1f1f1] flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#3b82f6]" />
              <span>Tekst znaku wodnego</span>
            </h4>

            <div>
              <Input
                label="Treść znaku"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="np. POUFNE, KOPIA, WERSJA ROBOCZA"
              />
            </div>

            <div>
              <span className="text-xs text-[#9ca3af] block mb-2 font-medium">Szybkie szablony:</span>
              <div className="flex flex-wrap gap-1.5">
                {quickPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setText(preset)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      text === preset
                        ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#60a5fa]'
                        : 'bg-[#141414] border-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Style & Geometry Controls */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-[#f1f1f1] flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#10b981]" />
              <span>Parametry wizualne i orientacja</span>
            </h4>

            {/* Position */}
            <div>
              <label className="text-xs text-[#9ca3af] block mb-2 font-medium">Położenie:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'center', label: 'Środek' },
                  { id: 'tile', label: 'Kafelkowanie' },
                  { id: 'header', label: 'Nagłówek' },
                  { id: 'footer', label: 'Stopka' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.id as any)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                      position === pos.id
                        ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#60a5fa]'
                        : 'bg-[#141414] border-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1]'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Size, Rotation, Opacity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <div className="flex justify-between text-xs text-[#9ca3af] mb-1">
                  <span>Rozmiar fontu</span>
                  <span className="font-mono text-[#f1f1f1]">{fontSize} pt</span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="96"
                  step="2"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-[#2e2e2e] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#9ca3af] mb-1">
                  <span>Kąt obrotu</span>
                  <span className="font-mono text-[#f1f1f1]">{rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="5"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-[#2e2e2e] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#9ca3af] mb-1">
                  <span>Przezroczystość</span>
                  <span className="font-mono text-[#f1f1f1]">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#2e2e2e] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
                />
              </div>
            </div>

            {/* Color Swatches */}
            <div className="pt-2">
              <label className="text-xs text-[#9ca3af] block mb-2 font-medium">Kolor znaku:</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg bg-transparent border border-[#2e2e2e] cursor-pointer"
                />
                <div className="flex space-x-2">
                  {quickColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-lg border transition-transform ${
                        color.toLowerCase() === c.toLowerCase()
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-transparent hover:scale-105'
                      }`}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Target Pages */}
            <div className="pt-2">
              <Input
                label="Strony docelowe ('all' lub zakres np. '1-3', '1,3,5')"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="all"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!file || isProcessing}
              onClick={handleApplyWatermark}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Nakładanie znaku wodnego...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  <span>Zastosuj Znak Wodny i Pobierz</span>
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
                  Znak wodny został nałożony pomyślnie ({formatFileSize(resultBlob.size)})!
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
              <span className="text-xs font-semibold text-[#f1f1f1]">Podgląd wizualny na żywo</span>
              <Badge variant="blue">Format A4</Badge>
            </div>

            {/* A4 Sheet Simulation */}
            <div className="relative w-full max-w-[280px] aspect-[1/1.414] bg-[#141414] border border-[#333333] rounded-xl shadow-2xl overflow-hidden flex flex-col justify-between p-4 select-none">
              {/* Dummy page content wireframe */}
              <div className="space-y-2 opacity-25">
                <div className="h-3 bg-gray-600 rounded w-3/4" />
                <div className="h-2 bg-gray-700 rounded w-full" />
                <div className="h-2 bg-gray-700 rounded w-5/6" />
                <div className="h-2 bg-gray-700 rounded w-4/5" />
                <div className="h-16 bg-[#1f1f1f] border border-gray-700 rounded mt-3" />
                <div className="h-2 bg-gray-700 rounded w-full mt-3" />
                <div className="h-2 bg-gray-700 rounded w-2/3" />
              </div>

              {/* Watermark Rendering Overlay */}
              {position === 'center' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <span
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      fontSize: `${Math.max(12, fontSize * 0.45)}px`,
                      color: color,
                      opacity: opacity,
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {text || 'POUFNE'}
                  </span>
                </div>
              )}

              {position === 'tile' && (
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-2 items-center justify-items-center pointer-events-none p-2 overflow-hidden">
                  {[...Array(6)].map((_, idx) => (
                    <span
                      key={idx}
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        fontSize: `${Math.max(9, fontSize * 0.25)}px`,
                        color: color,
                        opacity: opacity,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {text || 'POUFNE'}
                    </span>
                  ))}
                </div>
              )}

              {position === 'header' && (
                <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
                  <span
                    style={{
                      fontSize: `${Math.max(10, fontSize * 0.3)}px`,
                      color: color,
                      opacity: opacity,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {text || 'POUFNE'}
                  </span>
                </div>
              )}

              {position === 'footer' && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
                  <span
                    style={{
                      fontSize: `${Math.max(10, fontSize * 0.3)}px`,
                      color: color,
                      opacity: opacity,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {text || 'POUFNE'}
                  </span>
                </div>
              )}

              {/* Bottom footer wireframe */}
              <div className="flex justify-between items-center opacity-25 pt-4">
                <div className="h-1.5 bg-gray-700 rounded w-16" />
                <div className="h-1.5 bg-gray-700 rounded w-8" />
              </div>
            </div>

            <p className="text-[11px] text-[#9ca3af] text-center max-w-xs">
              Pozycja i kąt są skalowane automatycznie do rzeczywistych wymiarów punktów PDF (72 DPI).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
