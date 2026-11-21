'use client';

import React, { useState } from 'react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Layers,
  Upload,
  GripVertical,
  Trash2,
  Download,
  Loader2,
  FileText,
  Plus,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';

interface MergeFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface SortableFileItemProps {
  item: MergeFileItem;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function SortableFileItem({
  item,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SortableFileItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
        isDragging
          ? 'bg-[#262626] border-[#3b82f6] shadow-xl opacity-90'
          : 'bg-[#141414] border-[#2e2e2e] hover:border-[#3b82f6]/50'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-[#9ca3af] hover:text-[#f1f1f1] cursor-grab active:cursor-grabbing focus:outline-none"
          title="Przeciągnij, aby zmienić kolejność"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <span className="w-6 h-6 rounded-lg bg-[#1f1f1f] border border-[#2e2e2e] text-xs font-mono flex items-center justify-center text-[#9ca3af] shrink-0">
          {index + 1}
        </span>

        <FileText className="w-4 h-4 text-[#3b82f6] shrink-0" />

        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#f1f1f1] truncate max-w-sm">
            {item.name}
          </p>
          <p className="text-[10px] text-[#9ca3af]">{formatFileSize(item.size)}</p>
        </div>
      </div>

      <div className="flex items-center space-x-1 shrink-0">
        <button
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#f1f1f1] hover:bg-[#1f1f1f] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Przesuń w górę"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#f1f1f1] hover:bg-[#1f1f1f] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Przesuń w dół"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg text-[#ef4444] hover:bg-[#ef4444]/15 transition-all ml-1"
          title="Usuń z listy"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export const MergeTool: React.FC = () => {
  const [items, setItems] = useState<MergeFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
        .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
        .map((f) => ({
          id: `${f.name}-${Date.now()}-${Math.random()}`,
          file: f,
          name: f.name,
          size: f.size,
        }));
      setItems((prev) => [...prev, ...newFiles]);
      setSuccessInfo(null);
      setErrorMessage(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      setItems((prev) => arrayMove(prev, index, index - 1));
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < items.length - 1) {
      setItems((prev) => arrayMove(prev, index, index + 1));
    }
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddSampleFiles = async () => {
    setIsProcessing(true);
    try {
      const [res1, res2] = await Promise.all([
        fetch('/api/fixtures/sample-multipage.pdf'),
        fetch('/api/fixtures/sample-images.pdf'),
      ]);
      const [blob1, blob2] = await Promise.all([res1.blob(), res2.blob()]);

      const file1 = new File([blob1], 'sample-multipage.pdf', { type: 'application/pdf' });
      const file2 = new File([blob2], 'sample-images.pdf', { type: 'application/pdf' });

      setItems([
        { id: `s1-${Date.now()}`, file: file1, name: file1.name, size: file1.size },
        { id: `s2-${Date.now()}`, file: file2, name: file2.name, size: file2.size },
      ]);
    } catch (err) {
      console.error('Błąd ładowania próbek:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      setErrorMessage('Wybierz co najmniej 2 pliki PDF do połączenia.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const formData = new FormData();
      items.forEach((item) => {
        formData.append('files', item.file);
      });

      const res = await fetch('/api/pdf/merge', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Błąd podczas scalania PDF.');
      }

      const totalPages = res.headers.get('X-Total-Pages') || 'wielu';
      const blob = await res.blob();
      downloadBlob(blob, 'polaczony-dokument.pdf');
      setSuccessInfo(`Pomyślnie połączono ${items.length} plików PDF (łącznie ${totalPages} stron). Pobieranie rozpoczęte!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Wystąpił błąd podczas łączenia plików.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-2">
        <div className="flex items-center space-x-2">
          <Badge variant="blue">Moduł M3</Badge>
          <h3 className="text-lg font-bold text-[#f1f1f1]">Łączenie Dokumentów PDF (Merge)</h3>
        </div>
        <p className="text-xs text-[#9ca3af]">
          Połącz wiele dokumentów PDF w jeden uporządkowany plik. Możesz zmieniać kolejność plików przeciągając je na liście.
        </p>
      </div>

      {/* Main card */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-6">
        {/* Upload bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2e2e2e]">
          <div className="flex items-center space-x-3">
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold rounded-xl transition-all shadow-sm">
                <Plus className="w-4 h-4" />
                <span>Dodaj pliki PDF</span>
              </span>
            </label>

            <Button variant="secondary" size="sm" onClick={handleAddSampleFiles} disabled={isProcessing}>
              <Layers className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span>Wczytaj próbki (sample-multipage + sample-images)</span>
            </Button>
          </div>

          <div className="text-xs text-[#9ca3af]">
            Liczba plików: <strong className="text-[#f1f1f1]">{items.length}</strong>
          </div>
        </div>

        {/* Sortable List */}
        {items.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-[#2e2e2e] rounded-xl text-center space-y-3">
            <Layers className="w-10 h-10 text-[#3b82f6] mx-auto opacity-80" />
            <p className="text-sm font-medium text-[#f1f1f1]">Brak wybranych plików PDF</p>
            <p className="text-xs text-[#9ca3af]">
              Kliknij &quot;Dodaj pliki PDF&quot; lub skorzystaj z gotowych próbek testowych.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <SortableFileItem
                    key={item.id}
                    item={item}
                    index={index}
                    total={items.length}
                    onRemove={handleRemove}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Notifications */}
        {errorMessage && (
          <div className="p-3 bg-[#ef4444]/15 border border-[#ef4444]/30 rounded-xl text-xs text-[#ef4444]">
            {errorMessage}
          </div>
        )}

        {successInfo && (
          <div className="p-3 bg-[#10b981]/15 border border-[#10b981]/30 rounded-xl text-xs text-[#10b981] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Action Button */}
        {items.length > 0 && (
          <div className="flex justify-end pt-2">
            <Button
              variant="emerald"
              size="lg"
              disabled={items.length < 2 || isProcessing}
              onClick={handleMerge}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Przetwarzanie i łączenie...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Połącz i pobierz PDF ({items.length} pliki)</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
