'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  FileText,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { initPdfWorker } from '@/lib/client/pdf-worker-setup';
import { formatFileSize } from '@/lib/client/download-utils';

interface PdfViewerProps {
  file: File | ArrayBuffer | Uint8Array | string;
  fileName?: string;
  fileSize?: number;
  onPageCountChange?: (count: number) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  fileName = 'Dokument.pdf',
  fileSize,
  onPageCountChange,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const loadingTaskRef = useRef<any>(null);

  // Initialize and load PDF document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMessage(null);

    const loadDocument = async () => {
      try {
        const pdfjsLib = initPdfWorker();

        let data: Uint8Array | string;
        if (file instanceof File) {
          const buffer = await file.arrayBuffer();
          data = new Uint8Array(buffer.slice(0));
        } else if (file instanceof ArrayBuffer) {
          data = new Uint8Array(file.slice(0));
        } else if (file instanceof Uint8Array) {
          data = new Uint8Array(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
        } else {
          data = file; // URL or string
        }

        if (loadingTaskRef.current) {
          try {
            loadingTaskRef.current.destroy();
          } catch {}
        }

        const loadingTask = pdfjsLib.getDocument(
          typeof data === 'string' ? data : { data }
        );
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;

        if (!isMounted) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        onPageCountChange?.(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Błąd wczytywania PDF w PdfViewer:', err);
        setErrorMessage(
          err.message?.includes('Password')
            ? 'Dokument jest chroniony hasłem. Użyj modułu Bezpieczeństwo, aby go odblokować.'
            : 'Nie udało się wczytać pliku PDF. Upewnij się, że plik nie jest uszkodzony.'
        );
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {}
      }
    };
  }, [file, onPageCountChange]);

  // Render current page onto main Canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale, rotation });

        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Błąd renderowania strony PDF:', err);
        }
      }
    },
    [pdfDoc, scale, rotation]
  );

  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, rotation, renderPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(3.0, Math.round((s + 0.2) * 10) / 10));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(0.4, Math.round((s - 0.2) * 10) / 10));
  };

  const handleFitWidth = () => {
    if (containerRef.current && pdfDoc) {
      const containerWidth = containerRef.current.clientWidth - (showThumbnails ? 240 : 80);
      // Average page width is ~595pt
      const newScale = Math.max(0.5, Math.min(2.0, (containerWidth - 60) / 595));
      setScale(Math.round(newScale * 10) / 10);
    }
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl space-y-4">
        <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
        <p className="text-sm text-[#9ca3af]">Wczytywanie i renderowanie dokumentu PDF...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-8 bg-[#1f1f1f] border border-[#ef4444]/40 rounded-2xl text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="font-semibold text-sm text-[#f1f1f1]">Błąd podglądu</h4>
        <p className="text-xs text-[#9ca3af] max-w-md mx-auto">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-[750px] bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl overflow-hidden select-none"
    >
      {/* Viewer Toolbar */}
      <div className="h-14 bg-[#1a1a1a] border-b border-[#2e2e2e] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowThumbnails((s) => !s)}
            className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#f1f1f1] hover:bg-[#262626] transition-colors"
            title={showThumbnails ? 'Ukryj miniatury stron' : 'Pokaż miniatury stron'}
          >
            {showThumbnails ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>

          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#3b82f6]" />
            <span className="text-xs font-medium text-[#f1f1f1] truncate max-w-[200px]">
              {fileName}
            </span>
            {fileSize && (
              <span className="text-[10px] text-[#9ca3af]">
                ({formatFileSize(fileSize)})
              </span>
            )}
          </div>
        </div>

        {/* Page navigation */}
        <div className="flex items-center space-x-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            title="Poprzednia strona"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <div className="flex items-center space-x-1 px-2 text-xs text-[#f1f1f1]">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= totalPages) setCurrentPage(val);
              }}
              className="w-12 h-7 bg-[#141414] border border-[#2e2e2e] rounded-lg text-center text-xs text-[#f1f1f1] outline-none focus:border-[#3b82f6]"
            />
            <span className="text-[#9ca3af]">/ {totalPages}</span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            title="Następna strona"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Zoom and rotate controls */}
        <div className="flex items-center space-x-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.4}
            title="Pomniejsz"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>

          <span className="text-xs font-mono text-[#9ca3af] px-1 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 3.0}
            title="Powiększ"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleFitWidth}
            title="Dopasuj do szerokości"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRotate}
            title="Obróć o 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <div className="w-48 bg-[#171717] border-r border-[#2e2e2e] overflow-y-auto p-3 space-y-3 shrink-0">
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider px-1">
              Strony ({totalPages})
            </div>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isSelected = pageNum === currentPage;
              return (
                <div
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`flex flex-col items-center p-2 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                      : 'border-[#2e2e2e] bg-[#141414] hover:border-[#3b82f6]/50'
                  }`}
                >
                  <div className="w-full aspect-[1/1.414] bg-[#222222] rounded flex items-center justify-center text-xs font-medium text-[#9ca3af] mb-1.5 shadow-sm">
                    {pageNum}
                  </div>
                  <span className="text-[10px] text-[#9ca3af]">Strona {pageNum}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Canvas Render Area */}
        <div className="flex-1 bg-[#141414] overflow-auto p-8 flex items-center justify-center">
          <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white">
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>
      </div>
    </div>
  );
};
