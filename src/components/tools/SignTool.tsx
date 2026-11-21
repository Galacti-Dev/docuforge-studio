'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PenTool,
  Upload,
  Undo2,
  Trash2,
  Sliders,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

interface SignToolProps {
  initialFile?: File | null;
}

export const SignTool: React.FC<SignToolProps> = ({ initialFile }) => {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [strokesHistory, setStrokesHistory] = useState<Stroke[]>([]);
  const [penColor, setPenColor] = useState<string>('#000000');
  const [penWidth, setPenWidth] = useState<number>(3);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);

  // Uploaded signature image
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);

  // Position & Page settings (PDF points, origin bottom-left: 595 x 842 pt for A4)
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [posX, setPosX] = useState<number>(390);
  const [posY, setPosY] = useState<number>(50);
  const [sigWidth, setSigWidth] = useState<number>(150);
  const [sigHeight, setSigHeight] = useState<number>(55);
  const [presetPos, setPresetPos] = useState<'bottom-right' | 'bottom-left' | 'bottom-center' | 'custom'>('bottom-right');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');

  // Re-draw canvas whenever strokes history changes
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesHistory) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [strokesHistory]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentStroke([{ x, y }]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(x, y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentStroke((prev) => [...prev, { x, y }]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      setStrokesHistory((prev) => [
        ...prev,
        { points: currentStroke, color: penColor, width: penWidth },
      ]);
      setHasDrawn(true);
    }
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    setStrokesHistory((prev) => {
      const next = prev.slice(0, -1);
      if (next.length === 0) setHasDrawn(false);
      return next;
    });
  };

  const handleClear = () => {
    setStrokesHistory([]);
    setCurrentStroke([]);
    setHasDrawn(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handlePresetPosition = (preset: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'custom') => {
    setPresetPos(preset);
    if (preset === 'bottom-right') {
      setPosX(390);
      setPosY(50);
      setSigWidth(150);
      setSigHeight(55);
    } else if (preset === 'bottom-left') {
      setPosX(50);
      setPosY(50);
      setSigWidth(150);
      setSigHeight(55);
    } else if (preset === 'bottom-center') {
      setPosX(220);
      setPosY(50);
      setSigWidth(150);
      setSigHeight(55);
    }
  };

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    if (!imgFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImageBase64(reader.result as string);
    };
    reader.readAsDataURL(imgFile);
  };

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

  const handleSignDocument = async () => {
    if (!file) {
      setError('Wybierz lub wgraj plik PDF');
      return;
    }

    let signatureDataUrl = '';
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        setError('Narysuj podpis na polu podpisu przed zatwierdzeniem');
        return;
      }
      signatureDataUrl = canvas.toDataURL('image/png');
    } else {
      if (!uploadedImageBase64) {
        setError('Wgraj plik graficzny podpisu (PNG lub JPG)');
        return;
      }
      signatureDataUrl = uploadedImageBase64;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pageNumber', pageNumber.toString());
      formData.append('signatureImage', signatureDataUrl);
      formData.append('x', posX.toString());
      formData.append('y', posY.toString());
      formData.append('width', sigWidth.toString());
      formData.append('height', sigHeight.toString());

      const res = await fetch('/api/pdf/sign', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Błąd serwera (Status: ${res.status})`);
      }

      const blob = await res.blob();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}-podpisany.pdf`;

      setResultBlob(blob);
      setResultFileName(outName);
      downloadBlob(blob, outName);
    } catch (err: any) {
      setError(err.message || 'Wystąpił nieoczekiwany błąd podczas podpisywania dokumentu');
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
                {file ? `Rozmiar: ${formatFileSize(file.size)}` : 'Wybierz dokument do podpisania z dysku lub użyj próbki'}
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

      {/* Mode Switcher */}
      <div className="flex space-x-2 border-b border-[#2e2e2e] pb-3">
        <button
          type="button"
          onClick={() => setMode('draw')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            mode === 'draw'
              ? 'bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/20'
              : 'bg-[#1f1f1f] text-[#9ca3af] hover:text-[#f1f1f1] border border-[#2e2e2e]'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Odręczny Podpis (Canvas)</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            mode === 'upload'
              ? 'bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/20'
              : 'bg-[#1f1f1f] text-[#9ca3af] hover:text-[#f1f1f1] border border-[#2e2e2e]'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Wgraj Obraz Podpisu (PNG/JPG)</span>
        </button>
      </div>

      {/* Main Grid: Controls + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Signature Input & Placement Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Signature Canvas Pad */}
          {mode === 'draw' ? (
            <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#f1f1f1] flex items-center space-x-2">
                  <PenTool className="w-4 h-4 text-[#3b82f6]" />
                  <span>Złóż odręczny podpis</span>
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={strokesHistory.length === 0}
                    className="p-1.5 rounded-lg bg-[#141414] border border-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1] disabled:opacity-40 transition-colors"
                    title="Cofnij ostatnie pociągnięcie"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={!hasDrawn && strokesHistory.length === 0}
                    className="p-1.5 rounded-lg bg-[#141414] border border-[#2e2e2e] text-[#ef4444] hover:bg-[#ef4444]/10 disabled:opacity-40 transition-colors"
                    title="Wyczyść całe pole podpisu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Canvas Area */}
              <div className="border-2 border-dashed border-[#333333] hover:border-[#3b82f6]/50 rounded-xl overflow-hidden bg-white/95 touch-none relative transition-colors">
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={180}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  className="w-full h-[180px] cursor-crosshair block"
                />
                {!hasDrawn && strokesHistory.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-xs font-medium">
                    Narysuj swój podpis tutaj za pomocą myszy lub dotyku
                  </div>
                )}
              </div>

              {/* Pen Settings */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-[#9ca3af]">Kolor tuszu:</span>
                  {[
                    { color: '#000000', label: 'Czarny' },
                    { color: '#1d4ed8', label: 'Granat' },
                    { color: '#334155', label: 'Grafit' },
                  ].map((p) => (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => setPenColor(p.color)}
                      style={{ backgroundColor: p.color }}
                      className={`w-6 h-6 rounded-md border transition-transform ${
                        penColor === p.color ? 'border-white scale-110 shadow-md' : 'border-transparent'
                      }`}
                      title={p.label}
                    />
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-[#9ca3af]">Grubość pióra:</span>
                  {[
                    { w: 2, label: 'Cienka' },
                    { w: 3, label: 'Średnia' },
                    { w: 5, label: 'Gruba' },
                  ].map((t) => (
                    <button
                      key={t.w}
                      type="button"
                      onClick={() => setPenWidth(t.w)}
                      className={`px-2 py-0.5 text-xs rounded-lg border transition-all ${
                        penWidth === t.w
                          ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#60a5fa]'
                          : 'bg-[#141414] border-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Upload Image Mode */
            <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-semibold text-[#f1f1f1] flex items-center space-x-2">
                <Upload className="w-4 h-4 text-[#3b82f6]" />
                <span>Wgraj podpis z przezroczystością (PNG lub JPG)</span>
              </h4>

              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#2e2e2e] hover:border-[#3b82f6] rounded-xl cursor-pointer bg-[#141414] transition-all">
                <Upload className="w-8 h-8 text-[#9ca3af] mb-2" />
                <span className="text-xs font-semibold text-[#f1f1f1]">Kliknij, aby wybrać plik graficzny</span>
                <span className="text-[11px] text-[#9ca3af] mt-1">Zalecany przezroczysty PNG</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleUploadSignature}
                />
              </label>

              {uploadedImageBase64 && (
                <div className="p-3 bg-[#141414] rounded-xl border border-[#2e2e2e] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedImageBase64}
                      alt="Wgrany podpis"
                      className="h-12 max-w-[150px] object-contain bg-white/10 rounded p-1"
                    />
                    <span className="text-xs text-[#10b981] font-medium">Podpis wgrany pomyślnie</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedImageBase64(null)}
                  >
                    <Trash2 className="w-4 h-4 text-[#ef4444]" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Placement Controls */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-[#f1f1f1] flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#10b981]" />
              <span>Położenie i strona docelowa</span>
            </h4>

            {/* Target Page & Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#9ca3af] block mb-1 font-medium">
                  Numer strony docelowej:
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2e2e2e] rounded-xl text-xs text-[#f1f1f1]"
                />
              </div>

              <div>
                <label className="text-xs text-[#9ca3af] block mb-1 font-medium">
                  Szablon pozycji:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'bottom-left', label: 'Dół Lewo' },
                    { id: 'bottom-center', label: 'Dół Środek' },
                    { id: 'bottom-right', label: 'Dół Prawo' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetPosition(p.id as any)}
                      className={`py-2 px-1 text-[11px] font-medium rounded-lg border text-center transition-all ${
                        presetPos === p.id
                          ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#60a5fa]'
                          : 'bg-[#141414] border-[#2e2e2e] text-[#9ca3af] hover:text-[#f1f1f1]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Coordinates in PDF points */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-[11px] text-[#9ca3af] block mb-1">Pozycja X (pt od lewej)</label>
                <input
                  type="number"
                  value={posX}
                  onChange={(e) => {
                    setPosX(parseInt(e.target.value, 10) || 0);
                    setPresetPos('custom');
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#2e2e2e] rounded-lg text-xs font-mono text-[#f1f1f1]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#9ca3af] block mb-1">Pozycja Y (pt od dołu)</label>
                <input
                  type="number"
                  value={posY}
                  onChange={(e) => {
                    setPosY(parseInt(e.target.value, 10) || 0);
                    setPresetPos('custom');
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#2e2e2e] rounded-lg text-xs font-mono text-[#f1f1f1]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#9ca3af] block mb-1">Szerokość (pt)</label>
                <input
                  type="number"
                  value={sigWidth}
                  onChange={(e) => setSigWidth(parseInt(e.target.value, 10) || 100)}
                  className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#2e2e2e] rounded-lg text-xs font-mono text-[#f1f1f1]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#9ca3af] block mb-1">Wysokość (pt)</label>
                <input
                  type="number"
                  value={sigHeight}
                  onChange={(e) => setSigHeight(parseInt(e.target.value, 10) || 40)}
                  className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#2e2e2e] rounded-lg text-xs font-mono text-[#f1f1f1]"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!file || isProcessing}
              onClick={handleSignDocument}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Osadzanie podpisu cyfrowego...</span>
                </>
              ) : (
                <>
                  <PenTool className="w-5 h-5 mr-2" />
                  <span>Podpisz Dokument PDF i Pobierz</span>
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
                  Dokument został podpisany pomyślnie ({formatFileSize(resultBlob.size)})!
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

        {/* Right Column: Live Sheet Placement Preview (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 flex flex-col items-center justify-center space-y-4">
            <div className="w-full flex items-center justify-between border-b border-[#2e2e2e] pb-3">
              <span className="text-xs font-semibold text-[#f1f1f1]">Podgląd umiejscowienia</span>
              <Badge variant="blue">Strona {pageNumber}</Badge>
            </div>

            {/* A4 Sheet Simulation */}
            <div className="relative w-full max-w-[280px] aspect-[1/1.414] bg-[#141414] border border-[#333333] rounded-xl shadow-2xl overflow-hidden p-4 select-none">
              {/* Dummy Wireframe */}
              <div className="space-y-2 opacity-25">
                <div className="h-3 bg-gray-600 rounded w-2/3" />
                <div className="h-2 bg-gray-700 rounded w-full" />
                <div className="h-2 bg-gray-700 rounded w-5/6" />
                <div className="h-2 bg-gray-700 rounded w-4/5" />
                <div className="h-16 bg-[#1f1f1f] border border-gray-700 rounded mt-3" />
                <div className="h-2 bg-gray-700 rounded w-full mt-3" />
                <div className="h-2 bg-gray-700 rounded w-3/4" />
                <div className="h-2 bg-gray-700 rounded w-4/5" />
                <div className="h-2 bg-gray-700 rounded w-2/3" />
              </div>

              {/* Placed Signature Box (Calculated relative to 595 x 842 pt A4) */}
              <div
                style={{
                  left: `${Math.max(2, Math.min(80, (posX / 595) * 100))}%`,
                  bottom: `${Math.max(2, Math.min(80, (posY / 842) * 100))}%`,
                  width: `${Math.max(15, Math.min(50, (sigWidth / 595) * 100))}%`,
                  height: `${Math.max(8, Math.min(25, (sigHeight / 842) * 100))}%`,
                }}
                className="absolute border-2 border-dashed border-[#10b981] bg-[#10b981]/15 rounded flex items-center justify-center p-1"
              >
                <span className="text-[9px] font-bold text-[#10b981] truncate">PODPIS</span>
              </div>
            </div>

            <p className="text-[11px] text-[#9ca3af] text-center max-w-xs">
              Koordynaty są przeliczane bezpośrednio na układ współrzędnych PDF (punkt początkowy w lewym dolnym rogu).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
