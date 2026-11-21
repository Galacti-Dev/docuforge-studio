'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  UploadCloud,
  FileText,
  Minimize2,
  RefreshCw,
  Sparkles,
  Shield,
  Trash2,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  FileBox,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';
import { useToast } from '@/context/ToastContext';

export type BatchAction = 'compress' | 'docx-to-pdf' | 'watermark' | 'sanitize';

export interface BatchFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'idle' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}

export const BatchQueue: React.FC = () => {
  const [items, setItems] = useState<BatchFileItem[]>([]);
  const [selectedAction, setSelectedAction] = useState<BatchAction>('compress');
  const [watermarkText, setWatermarkText] = useState<string>('POUFNE');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedZipBlob, setProcessedZipBlob] = useState<Blob | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleAddFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    if (fileArray.length === 0) return;

    if (items.length + fileArray.length > 20) {
      toast.warning('Ograniczenie kolejki', 'Maksymalna liczba plików w jednym zadaniu wsadowym to 20.');
    }

    const availableSlots = 20 - items.length;
    const filesToAdd = fileArray.slice(0, Math.max(0, availableSlots));

    const validNewItems: BatchFileItem[] = [];

    for (const f of filesToAdd) {
      if (f.size > 100 * 1024 * 1024) {
        toast.error('Plik zbyt duży', `Plik "${f.name}" przekracza maksymalny limit 100 MB.`);
        continue;
      }
      validNewItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file: f,
        name: f.name,
        size: f.size,
        status: 'idle',
      });
    }

    if (validNewItems.length > 0) {
      setItems((prev) => [...prev, ...validNewItems]);
      setProcessedZipBlob(null);
      toast.info('Dodano pliki', `Dodano ${validNewItems.length} plików do kolejki wsadowej.`);
    }
  };

  const handleLoadSamples = async () => {
    try {
      const [res1, res2, res3] = await Promise.all([
        fetch('/api/fixtures/sample-multipage.pdf'),
        fetch('/api/fixtures/sample-images.pdf'),
        fetch('/api/fixtures/sample-document.docx'),
      ]);
      const [b1, b2, b3] = await Promise.all([res1.blob(), res2.blob(), res3.blob()]);
      handleAddFiles([
        new File([b1], 'sample-multipage.pdf', { type: 'application/pdf' }),
        new File([b2], 'sample-images.pdf', { type: 'application/pdf' }),
        new File([b3], 'sample-document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      ]);
    } catch (err: any) {
      toast.error('Błąd wczytywania próbek', err.message || 'Nie udało się pobrać plików testowych');
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setProcessedZipBlob(null);
  };

  const handleClearAll = () => {
    setItems([]);
    setProcessedZipBlob(null);
    setProgressPercent(0);
  };

  const handleProcessBatch = async () => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgressPercent(10);
    setProcessedZipBlob(null);

    // Update all items to processing
    setItems((prev) => prev.map((item) => ({ ...item, status: 'processing', errorMessage: undefined })));

    try {
      const formData = new FormData();
      for (const item of items) {
        formData.append('files', item.file);
      }
      formData.append('action', selectedAction);
      if (selectedAction === 'watermark') {
        formData.append('watermarkText', watermarkText);
      }

      setProgressPercent(35);

      const response = await fetch('/api/batch/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Błąd przetwarzania wsadowego' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setProgressPercent(85);
      const zipBlob = await response.blob();
      setProcessedZipBlob(zipBlob);

      // Mark all as success
      setItems((prev) => prev.map((item) => ({ ...item, status: 'success' })));
      setProgressPercent(100);

      toast.success(
        'Przetwarzanie zakończone!',
        `Pomyślnie przetworzono ${items.length} plików. Archiwum ZIP jest gotowe do pobrania.`
      );
    } catch (err: any) {
      console.error('Błąd kolejki wsadowej:', err);
      setItems((prev) => prev.map((item) => ({ ...item, status: 'error', errorMessage: err.message })));
      toast.error('Błąd przetwarzania wsadowego', err.message || 'Wystąpił błąd podczas przetwarzania.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadZip = () => {
    if (!processedZipBlob) return;
    const fileName = `docuforge-batch-${selectedAction}-${Date.now()}.zip`;
    downloadBlob(processedZipBlob, fileName);
    toast.success('Pobrano archiwum', `Pobrano plik ${fileName} (${formatFileSize(processedZipBlob.size)}).`);
  };

  // Keyboard shortcut listener for Ctrl+Enter
  useEffect(() => {
    const handleCustomRun = () => {
      if (items.length > 0 && !isProcessing) {
        handleProcessBatch();
      }
    };
    window.addEventListener('docuforge:run-action', handleCustomRun);
    return () => window.removeEventListener('docuforge:run-action', handleCustomRun);
  }, [items, isProcessing, selectedAction, watermarkText]);

  const actionsConfig: Array<{
    id: BatchAction;
    name: string;
    description: string;
    icon: React.ElementType;
    color: string;
  }> = [
    {
      id: 'compress',
      name: 'Kompresuj wszystkie',
      description: 'Optymalizacja Ghostscript 150 DPI i linearyzacja QPDF',
      icon: Minimize2,
      color: 'text-[#3b82f6]',
    },
    {
      id: 'docx-to-pdf',
      name: 'Konwertuj DOCX -> PDF',
      description: 'Lokalna konwersja LibreOffice do czystego PDF',
      icon: RefreshCw,
      color: 'text-[#f59e0b]',
    },
    {
      id: 'watermark',
      name: 'Dodaj znak wodny',
      description: 'Masowe nanoszenie tekstu pod kątem 45°',
      icon: Sparkles,
      color: 'text-[#ec4899]',
    },
    {
      id: 'sanitize',
      name: 'Sanityzuj i Anonimizuj',
      description: 'Całkowite usunięcie metadanych XMP i skryptów',
      icon: Shield,
      color: 'text-[#10b981]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#f1f1f1] tracking-tight">
                Kolejka Wsadowa (Batch Processing)
              </h2>
              <p className="text-xs text-[#9ca3af] mt-0.5">
                Przetwarzaj do 20 dokumentów naraz z masowym pakowaniem do archiwum ZIP.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleAddFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || items.length >= 20}
            >
              <UploadCloud className="w-4 h-4 text-[#3b82f6]" />
              <span>Dodaj pliki ({items.length}/20)</span>
            </Button>

            <Button
              variant="secondary"
              onClick={handleLoadSamples}
              disabled={isProcessing || items.length >= 20}
            >
              <FileText className="w-4 h-4 text-[#10b981]" />
              <span>Wczytaj próbki testowe (3 pliki)</span>
            </Button>

            {items.length > 0 && (
              <Button
                variant="ghost"
                onClick={handleClearAll}
                disabled={isProcessing}
                className="text-[#9ca3af] hover:text-[#ef4444]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Wyczyść</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Action Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {actionsConfig.map((act) => {
          const Icon = act.icon;
          const isSelected = selectedAction === act.id;
          return (
            <div
              key={act.id}
              onClick={() => {
                if (!isProcessing) setSelectedAction(act.id);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#1f1f1f] border-[#3b82f6] shadow-sm ring-1 ring-[#3b82f6]/30'
                  : 'bg-[#181818] border-[#2e2e2e] hover:border-[#383838] opacity-80 hover:opacity-100'
              } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-[#3b82f6] text-white' : 'bg-[#262626] ' + act.color
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-[#f1f1f1] leading-tight">
                  {act.name}
                </h4>
              </div>
              <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                {act.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Extra settings for watermark if selected */}
      {selectedAction === 'watermark' && (
        <Card className="p-4 bg-[#181818] border-[#2e2e2e]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <label className="text-xs font-semibold text-[#f1f1f1] block mb-1">
                Tekst masowego znaku wodnego
              </label>
              <p className="text-[11px] text-[#9ca3af]">
                Tekst zostanie naniesiony ukośnie (45°) z przezroczystością 30% na wszystkich stronach PDF.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Input
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="np. POUFNE / KOPIA"
                disabled={isProcessing}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Dropzone & Items List */}
      {items.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) handleAddFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2e2e2e] hover:border-[#3b82f6] rounded-2xl p-12 text-center bg-[#1f1f1f]/50 hover:bg-[#1f1f1f] transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#262626] group-hover:bg-[#3b82f6]/10 border border-[#2e2e2e] group-hover:border-[#3b82f6]/30 flex items-center justify-center text-[#9ca3af] group-hover:text-[#3b82f6] mx-auto mb-4 transition-all">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-[#f1f1f1] mb-1">
            Przeciągnij i upuść pliki do kolejki wsadowej
          </h3>
          <p className="text-xs text-[#9ca3af] max-w-md mx-auto mb-4">
            Możesz wgrać do 20 dokumentów jednocześnie (.pdf, .docx, obrazy). Każdy do 100 MB.
          </p>
          <Button variant="secondary" size="sm">
            Wybierz pliki z dysku (Ctrl+O)
          </Button>
        </div>
      ) : (
        <Card className="p-0 overflow-hidden border-[#2e2e2e]">
          <div className="p-4 border-b border-[#2e2e2e] flex items-center justify-between bg-[#1b1b1b]">
            <div className="flex items-center space-x-2">
              <FileBox className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-xs font-semibold text-[#f1f1f1]">
                Pliki w kolejce ({items.length}/20)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-[#9ca3af]">
                Łączny rozmiar: {formatFileSize(items.reduce((acc, i) => acc + i.size, 0))}
              </span>
            </div>
          </div>

          <div className="divide-y divide-[#2e2e2e] max-h-96 overflow-y-auto">
            {items.map((item, idx) => {
              const isPdf = item.name.toLowerCase().endsWith('.pdf');
              const isDocx = item.name.toLowerCase().endsWith('.docx');

              return (
                <div
                  key={item.id}
                  className="p-3.5 flex items-center justify-between hover:bg-[#181818] transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-4">
                    <span className="text-xs font-mono text-[#9ca3af] w-5 text-right shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#262626] flex items-center justify-center shrink-0">
                      <FileText
                        className={`w-4 h-4 ${
                          isPdf ? 'text-[#3b82f6]' : isDocx ? 'text-[#10b981]' : 'text-[#f59e0b]'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#f1f1f1] truncate max-w-sm sm:max-w-md">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-[#9ca3af]">
                        {formatFileSize(item.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {/* Status Badge */}
                    {item.status === 'idle' && (
                      <span className="flex items-center space-x-1.5 text-[11px] text-[#9ca3af] bg-[#141414] px-2.5 py-1 rounded-lg border border-[#2e2e2e]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Oczekuje</span>
                      </span>
                    )}

                    {item.status === 'processing' && (
                      <span className="flex items-center space-x-1.5 text-[11px] text-[#3b82f6] bg-[#3b82f6]/10 px-2.5 py-1 rounded-lg border border-[#3b82f6]/20">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Przetwarzanie...</span>
                      </span>
                    )}

                    {item.status === 'success' && (
                      <span className="flex items-center space-x-1.5 text-[11px] text-[#10b981] bg-[#10b981]/10 px-2.5 py-1 rounded-lg border border-[#10b981]/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sukces</span>
                      </span>
                    )}

                    {item.status === 'error' && (
                      <span className="flex items-center space-x-1.5 text-[11px] text-[#ef4444] bg-[#ef4444]/10 px-2.5 py-1 rounded-lg border border-[#ef4444]/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Błąd</span>
                      </span>
                    )}

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isProcessing}
                      className="text-[#9ca3af] hover:text-[#ef4444] p-1 rounded-md hover:bg-[#262626] transition-colors"
                      title="Usuń z kolejki"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar if processing */}
          {isProcessing && (
            <div className="p-4 bg-[#181818] border-t border-[#2e2e2e] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                <span>Przetwarzanie wsadowe w toku...</span>
                <span className="font-mono text-[#3b82f6]">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-[#141414] rounded-full overflow-hidden border border-[#2e2e2e]">
                <div
                  className="h-full bg-[#3b82f6] transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions Bottom Bar */}
          <div className="p-4 bg-[#1b1b1b] border-t border-[#2e2e2e] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-[#9ca3af]">
                Wybrana akcja:{' '}
                <strong className="text-[#f1f1f1]">
                  {actionsConfig.find((a) => a.id === selectedAction)?.name}
                </strong>
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {processedZipBlob && (
                <Button
                  variant="primary"
                  onClick={handleDownloadZip}
                  className="bg-[#10b981] hover:bg-[#059669] text-white"
                >
                  <Download className="w-4 h-4" />
                  <span>Pobierz paczkę ZIP ({items.length} plików)</span>
                </Button>
              )}

              <Button
                variant="primary"
                onClick={handleProcessBatch}
                disabled={isProcessing || items.length === 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Przetwarzanie...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Uruchom wsadowo (Ctrl+Enter)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
