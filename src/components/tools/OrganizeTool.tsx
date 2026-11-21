'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PDFDocument } from 'pdf-lib';
import {
  Layers,
  RotateCw,
  Copy,
  Trash2,
  RefreshCw,
  Download,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  Undo2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PageAction } from '@/types/document';
import { downloadBlob, formatFileSize } from '@/lib/client/download-utils';

interface OrganizePageItem {
  id: string;
  originalIndex: number; // 0-based
  displayNumber: number; // 1-based original
  rotation: number; // 0, 90, 180, 270
  isDeleted: boolean;
}

interface SortablePageCardProps {
  item: OrganizePageItem;
  currentIndex: number;
  onRotate: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDeleteToggle: (id: string) => void;
}

function SortablePageCard({
  item,
  currentIndex,
  onRotate,
  onDuplicate,
  onDeleteToggle,
}: SortablePageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex flex-col p-3 rounded-2xl border transition-all ${
        item.isDeleted
          ? 'bg-[#181818] border-[#ef4444]/30 opacity-50'
          : isDragging
          ? 'bg-[#262626] border-[#3b82f6] shadow-2xl scale-105'
          : 'bg-[#141414] border-[#2e2e2e] hover:border-[#3b82f6]/50'
      }`}
    >
      {/* Top Header Card Bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2e2e2e]">
        <div className="flex items-center space-x-1.5">
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-[#9ca3af] hover:text-[#f1f1f1] cursor-grab active:cursor-grabbing focus:outline-none"
            title="Przeciągnij stronę"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold text-[#f1f1f1]">
            Poz. {currentIndex + 1}
          </span>
        </div>

        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#9ca3af] font-mono">
          Oryg. {item.displayNumber}
        </span>
      </div>

      {/* Visual Page Canvas Representation */}
      <div className="w-full aspect-[1/1.414] bg-[#1c1c1c] rounded-xl border border-[#2e2e2e] flex flex-col items-center justify-center relative overflow-hidden my-1 shadow-inner">
        <div
          style={{ transform: `rotate(${item.rotation}deg)` }}
          className="transition-transform duration-200 flex flex-col items-center justify-center p-4 text-center"
        >
          <FileText className="w-10 h-10 text-[#3b82f6] mb-2 opacity-80" />
          <span className="text-xs font-bold text-[#f1f1f1]">
            Strona {item.displayNumber}
          </span>
          {item.rotation > 0 && (
            <span className="text-[10px] text-[#3b82f6] font-mono mt-1">
              +{item.rotation}°
            </span>
          )}
        </div>

        {item.isDeleted && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-xs font-bold text-[#ef4444] bg-[#ef4444]/15 px-2 py-1 rounded border border-[#ef4444]/30">
              DO USUNIĘCIA
            </span>
          </div>
        )}
      </div>

      {/* Card Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-[#2e2e2e] mt-1">
        <button
          onClick={() => onRotate(item.id)}
          disabled={item.isDeleted}
          className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#3b82f6] hover:bg-[#1f1f1f] transition-all disabled:opacity-30"
          title="Obróć o 90° w prawo"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onDuplicate(item.id)}
          disabled={item.isDeleted}
          className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#10b981] hover:bg-[#1f1f1f] transition-all disabled:opacity-30"
          title="Duplikuj tę stronę"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onDeleteToggle(item.id)}
          className={`p-1.5 rounded-lg transition-all ${
            item.isDeleted
              ? 'text-[#10b981] hover:bg-[#10b981]/15'
              : 'text-[#ef4444] hover:bg-[#ef4444]/15'
          }`}
          title={item.isDeleted ? 'Przywróć stronę' : 'Usuń stronę'}
        >
          {item.isDeleted ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

interface OrganizeToolProps {
  initialFile?: File | null;
}

export const OrganizeTool: React.FC<OrganizeToolProps> = ({ initialFile }) => {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [pages, setPages] = useState<OrganizePageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Parse page count when file changes
  useEffect(() => {
    if (!file) return;

    const parsePdf = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();

        const newPages: OrganizePageItem[] = Array.from({ length: count }).map((_, idx) => ({
          id: `page-${idx}-${Date.now()}-${Math.random()}`,
          originalIndex: idx,
          displayNumber: idx + 1,
          rotation: 0,
          isDeleted: false,
        }));

        setPages(newPages);
        setErrorMessage(null);
        setSuccessInfo(null);
      } catch (err: any) {
        console.error('Błąd parsowania PDF w OrganizeTool:', err);
        setErrorMessage('Nie udało się wczytać struktury stron z pliku PDF.');
      }
    };

    parsePdf();
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleLoadSample = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/fixtures/sample-multipage.pdf');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'sample-multipage.pdf', { type: 'application/pdf' });
      setFile(sampleFile);
    } catch (err) {
      console.error('Błąd wczytywania próbki:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPages((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleRotate = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleDuplicate = (id: string) => {
    setPages((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      if (index === -1) return prev;
      const original = prev[index];
      const clone: OrganizePageItem = {
        ...original,
        id: `clone-${original.originalIndex}-${Date.now()}-${Math.random()}`,
      };
      const copy = [...prev];
      copy.splice(index + 1, 0, clone);
      return copy;
    });
  };

  const handleDeleteToggle = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isDeleted: !p.isDeleted } : p))
    );
  };

  const handleRotateAll = () => {
    setPages((prev) => prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 })));
  };

  const handleReverseAll = () => {
    setPages((prev) => [...prev].reverse());
  };

  const handleReset = () => {
    if (file) {
      // Re-trigger parse
      setFile(new File([file], file.name, { type: file.type }));
    }
  };

  const handleOrganizeSubmit = async () => {
    if (!file) return;

    const activePages = pages.filter((p) => !p.isDeleted);
    if (activePages.length === 0) {
      setErrorMessage('Wszystkie strony zostały oznaczone jako usunięte. Dokument musi zawierać min. 1 stronę.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const actions: PageAction[] = pages
        .filter((p) => !p.isDeleted)
        .map((p) => ({
          originalIndex: p.originalIndex,
          rotate: (p.rotation as 0 | 90 | 180 | 270) || undefined,
        }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('actions', JSON.stringify(actions));

      const res = await fetch('/api/pdf/organize', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Błąd reorganizacji stron PDF.');
      }

      const totalPagesResult = res.headers.get('X-Total-Pages') || String(activePages.length);
      const blob = await res.blob();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      downloadBlob(blob, `${baseName}-zreorganizowany.pdf`);

      setSuccessInfo(`Pomyślnie zapisano zreorganizowany plik PDF (${totalPagesResult} stron). Pobieranie rozpoczęte!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Wystąpił błąd podczas reorganizacji stron.');
    } finally {
      setIsProcessing(false);
    }
  };

  const activeCount = pages.filter((p) => !p.isDeleted).length;
  const deletedCount = pages.filter((p) => p.isDeleted).length;
  const rotatedCount = pages.filter((p) => p.rotation > 0 && !p.isDeleted).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-2">
        <div className="flex items-center space-x-2">
          <Badge variant="blue">Moduł M3</Badge>
          <h3 className="text-lg font-bold text-[#f1f1f1]">
            Wizualny Organizer Stron PDF (Reorganize & Rotate)
          </h3>
        </div>
        <p className="text-xs text-[#9ca3af]">
          Przeciągaj kafelki stron, aby zmienić ich kolejność. Obracaj, duplikuj i usuwaj konkretne kartki z natychmiastowym podglądem.
        </p>
      </div>

      {/* Main card */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-6">
        {/* File and Quick Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2e2e2e]">
          <div className="flex items-center space-x-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold rounded-xl transition-all shadow-sm">
                <span>Wybierz inny PDF</span>
              </span>
            </label>

            <Button variant="secondary" size="sm" onClick={handleLoadSample} disabled={isProcessing}>
              <span>Wczytaj sample-multipage.pdf</span>
            </Button>
          </div>

          {pages.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button variant="secondary" size="sm" onClick={handleRotateAll}>
                <RotateCw className="w-3.5 h-3.5 text-[#3b82f6]" />
                <span>Obróć wszystkie o 90°</span>
              </Button>

              <Button variant="secondary" size="sm" onClick={handleReverseAll}>
                <RefreshCw className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Odwróć kolejność</span>
              </Button>

              <Button variant="secondary" size="sm" onClick={handleReset}>
                <Undo2 className="w-3.5 h-3.5" />
                <span>Resetuj</span>
              </Button>
            </div>
          )}
        </div>

        {/* Stats summary */}
        {pages.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#9ca3af] bg-[#141414] p-3 rounded-xl border border-[#2e2e2e]">
            <span>
              Wynikowe strony: <strong className="text-[#10b981]">{activeCount}</strong>
            </span>
            <span>•</span>
            <span>
              Obrócone: <strong className="text-[#3b82f6]">{rotatedCount}</strong>
            </span>
            <span>•</span>
            <span>
              Oznaczone do usunięcia: <strong className="text-[#ef4444]">{deletedCount}</strong>
            </span>
          </div>
        )}

        {/* Grid of Pages with DnD */}
        {pages.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-[#2e2e2e] rounded-xl text-center space-y-3">
            <Layers className="w-10 h-10 text-[#3b82f6] mx-auto opacity-80" />
            <p className="text-sm font-medium text-[#f1f1f1]">Brak wczytanego dokumentu PDF</p>
            <p className="text-xs text-[#9ca3af]">
              Wybierz plik PDF z dysku lub kliknij &quot;Wczytaj sample-multipage.pdf&quot;, aby otworzyć organizer stron.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pages} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {pages.map((item, index) => (
                  <SortablePageCard
                    key={item.id}
                    item={item}
                    currentIndex={index}
                    onRotate={handleRotate}
                    onDuplicate={handleDuplicate}
                    onDeleteToggle={handleDeleteToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
        {pages.length > 0 && (
          <div className="flex justify-end pt-2">
            <Button
              variant="emerald"
              size="lg"
              disabled={activeCount === 0 || isProcessing}
              onClick={handleOrganizeSubmit}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Zapisywanie reorganizacji...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Pobierz zreorganizowany PDF ({activeCount} stron)</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
