'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '@/context/ToastContext';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  maxSizeBytes?: number; // Defaults to 100MB
  acceptedExtensions?: string[];
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  maxSizeBytes = 100 * 1024 * 1024, // 100 MB
  acceptedExtensions = ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp'],
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const validateAndHandleFile = (file: File) => {
    setErrorMessage(null);

    // Size validation
    if (file.size > maxSizeBytes) {
      const msg = `Plik przekracza maksymalny limit 100 MB (rozmiar: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`;
      setErrorMessage(msg);
      toast.error('Plik zbyt duży', msg);
      return;
    }

    // Extension validation
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedExtensions.includes(ext)) {
      const msg = `Niedozwolony format pliku (${ext}). Obsługiwane rozszerzenia: ${acceptedExtensions.join(', ')}.`;
      setErrorMessage(msg);
      toast.error('Niedozwolony format', msg);
      return;
    }

    onFileSelect(file);
    toast.success('Wczytano plik', `Pomyślnie załadowano ${file.name}.`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-[#181818] border-[#2e2e2e]'
            : isDragOver
            ? 'border-[#3b82f6] bg-[#3b82f6]/10 scale-[0.99]'
            : 'border-[#2e2e2e] bg-[#1f1f1f] hover:border-[#3b82f6] hover:bg-[#262626]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedExtensions.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
            isDragOver ? 'bg-[#3b82f6] text-white scale-110' : 'bg-[#141414] border border-[#2e2e2e] text-[#3b82f6]'
          }`}
        >
          <UploadCloud className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-base text-[#f1f1f1]">
            Przeciągnij i upuść plik tutaj
          </h3>
          <p className="text-xs text-[#9ca3af]">
            lub kliknij, aby wybrać z dysku (PDF, DOCX, PNG, JPG, WebP)
          </p>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-[#9ca3af] bg-[#141414] px-3 py-1 rounded-xl border border-[#2e2e2e]">
          <span>Maksymalny rozmiar pliku: 100 MB</span>
          <span>•</span>
          <span className="text-[#10b981]">100% lokalne przetwarzanie</span>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center space-x-2 p-3 bg-[#ef4444]/15 border border-[#ef4444]/30 rounded-xl text-xs text-[#ef4444]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
