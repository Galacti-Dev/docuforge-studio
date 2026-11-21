'use client';

import React, { useState } from 'react';
import {
  FileText,
  X,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  CheckCircle,
  FileBox,
  ImageIcon,
  Minimize2,
  Shield,
  Hash,
  PenTool,
  GitCompare,
} from 'lucide-react';
import { DropZone } from './DropZone';
import { RecentFiles, addFileToRecent, RecentFileItem } from './RecentFiles';
import { PdfViewer } from '../viewer/PdfViewer';
import { DocxViewer } from '../viewer/DocxViewer';
import { MergeTool } from '../tools/MergeTool';
import { SplitTool } from '../tools/SplitTool';
import { OrganizeTool } from '../tools/OrganizeTool';
import { ConvertTool, ConvertMode } from '../tools/ConvertTool';
import { ImagesTool } from '../tools/ImagesTool';
import { CompressTool } from '../tools/CompressTool';
import { SecurityTool, SecurityTab } from '../tools/SecurityTool';
import { StampSignTool, StampSignTab } from '../tools/StampSignTool';
import { OcrTool } from '../tools/OcrTool';
import { DiffTool } from '../tools/DiffTool';
import { BatchQueue } from '../tools/BatchQueue';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatFileSize } from '@/lib/client/download-utils';

interface WorkspaceProps {
  activeToolId: string;
  onSelectTool: (toolId: string) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  activeToolId,
  onSelectTool,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setFileName(file.name);
    setFileSize(file.size);
    const buffer = await file.arrayBuffer();
    setFileBuffer(buffer);
    addFileToRecent({ name: file.name, size: file.size, type: file.type });
  };

  const handleLoadSample = async (sampleName: string) => {
    setIsLoadingSample(true);
    try {
      const response = await fetch(`/api/fixtures/${sampleName}`);
      if (!response.ok) throw new Error('Nie udało się pobrać pliku testowego');
      const blob = await response.blob();
      const file = new File([blob], sampleName, { type: blob.type });
      await handleFileSelect(file);
    } catch (err) {
      console.error('Błąd wczytywania próbki testowej:', err);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileBuffer(null);
    setFileName('');
    setFileSize(0);
  };

  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  const isDocx = fileName.toLowerCase().endsWith('.docx');
  const isImage = /\.(png|jpe?g|webp)$/i.test(fileName);

  // Tool Specific Views
  if (activeToolId === 'merge') {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <MergeTool />
      </div>
    );
  }

  if (activeToolId === 'split') {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <SplitTool initialFile={selectedFile} />
      </div>
    );
  }

  if (activeToolId === 'organize') {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <OrganizeTool initialFile={selectedFile} />
      </div>
    );
  }

  if (
    activeToolId === 'docx-to-pdf' ||
    activeToolId === 'pdf-to-docx' ||
    activeToolId === 'to-markdown' ||
    activeToolId === 'to-txt' ||
    activeToolId === 'convert'
  ) {
    const initialMode: ConvertMode =
      activeToolId === 'pdf-to-docx'
        ? 'pdf-to-docx'
        : activeToolId === 'to-markdown'
        ? 'to-markdown'
        : activeToolId === 'to-txt'
        ? 'to-txt'
        : 'docx-to-pdf';

    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <ConvertTool initialFile={selectedFile} initialMode={initialMode} />
      </div>
    );
  }

  if (activeToolId === 'pdf-to-images' || activeToolId === 'images-to-pdf') {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <ImagesTool
          initialFile={selectedFile}
          initialTab={activeToolId === 'images-to-pdf' ? 'images-to-pdf' : 'pdf-to-images'}
        />
      </div>
    );
  }

  if (activeToolId === 'compress') {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <CompressTool initialFile={selectedFile} />
      </div>
    );
  }

  if (
    activeToolId === 'protect' ||
    activeToolId === 'unlock' ||
    activeToolId === 'metadata' ||
    activeToolId === 'sanitize'
  ) {
    const initialTab: SecurityTab =
      activeToolId === 'unlock'
        ? 'unlock'
        : activeToolId === 'metadata'
        ? 'metadata'
        : activeToolId === 'sanitize'
        ? 'sanitize'
        : 'protect';

    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <SecurityTool initialFile={selectedFile} initialTab={initialTab} />
      </div>
    );
  }

  if (
    activeToolId === 'watermark' ||
    activeToolId === 'page-numbers' ||
    activeToolId === 'sign'
  ) {
    const initialTab: StampSignTab =
      activeToolId === 'page-numbers'
        ? 'page-numbers'
        : activeToolId === 'sign'
        ? 'sign'
        : 'watermark';

    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <StampSignTool initialFile={selectedFile} initialTab={initialTab} />
      </div>
    );
  }

  if (activeToolId === 'ocr') {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <OcrTool initialFile={selectedFile} />
      </div>
    );
  }

  if (activeToolId === 'diff') {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <DiffTool initialFile={selectedFile} />
      </div>
    );
  }

  if (activeToolId === 'batch') {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 select-none">
        <BatchQueue />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 select-none">
      {/* File Action Bar if file is loaded */}
      {selectedFile && fileBuffer && (
        <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm text-[#f1f1f1] truncate max-w-md">
                  {fileName}
                </span>
                <Badge variant={isPdf ? 'blue' : isDocx ? 'emerald' : 'amber'}>
                  {isPdf ? 'PDF' : isDocx ? 'DOCX' : 'GRAFIKA'}
                </Badge>
              </div>
              <p className="text-xs text-[#9ca3af] mt-0.5">
                Rozmiar: {formatFileSize(fileSize)} • Gotowy do operacji
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {isPdf && (
              <>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('organize')}>
                  <Layers className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span>Organizuj strony</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('split')}>
                  <FileBox className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Podziel PDF</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('pdf-to-docx')}>
                  <RefreshCw className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span>Do Word</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('to-markdown')}>
                  <RefreshCw className="w-3.5 h-3.5 text-[#a855f7]" />
                  <span>Do MD</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('pdf-to-images')}>
                  <ImageIcon className="w-3.5 h-3.5 text-[#ec4899]" />
                  <span>Obrazy</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('compress')}>
                  <Minimize2 className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Kompresuj</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('protect')}>
                  <Shield className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span>Zabezpieczenia</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('watermark')}>
                  <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span>Znak wodny</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('page-numbers')}>
                  <Hash className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Numeracja</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('sign')}>
                  <PenTool className="w-3.5 h-3.5 text-[#8b5cf6]" />
                  <span>Podpisz</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('ocr')}>
                  <Sparkles className="w-3.5 h-3.5 text-[#ec4899]" />
                  <span>OCR</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('diff')}>
                  <GitCompare className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span>Porównaj</span>
                </Button>
              </>
            )}
            {isDocx && (
              <>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('docx-to-pdf')}>
                  <RefreshCw className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span>Konwertuj do PDF</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onSelectTool('to-markdown')}>
                  <RefreshCw className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Do Markdown</span>
                </Button>
              </>
            )}
            {isImage && (
              <Button variant="secondary" size="sm" onClick={() => onSelectTool('images-to-pdf')}>
                <ImageIcon className="w-3.5 h-3.5 text-[#3b82f6]" />
                <span>Utwórz PDF z obrazu</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleClearFile}>
              <X className="w-4 h-4 mr-1 text-[#ef4444]" />
              <span>Zamknij</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      {!selectedFile || !fileBuffer ? (
        <div className="space-y-8">
          {/* Hero Banner */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="emerald">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Etap M3 – Organizacja Stron PDF Gotowa</span>
              </Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#f1f1f1]">
              Wgraj lub przeciągnij dokument do analizy i edycji
            </h2>
            <p className="text-xs md:text-sm text-[#9ca3af] leading-relaxed max-w-3xl">
              DocuForge Studio przetwarza pliki w 100% lokalnie w pamięci przeglądarki i procesach systemowych.
              Wybierz plik z dysku lub przetestuj wbudowane pliki demonstracyjne z katalogu fixtures.
            </p>

            {/* Quick Sample Load Buttons */}
            <div className="pt-2">
              <span className="text-xs font-medium text-[#9ca3af] block mb-2">
                Szybkie testowanie na gotowych plikach (Fixtures):
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isLoadingSample}
                  onClick={() => handleLoadSample('sample-multipage.pdf')}
                >
                  <FileText className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span>sample-multipage.pdf (5 stron)</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isLoadingSample}
                  onClick={() => handleLoadSample('sample-document.docx')}
                >
                  <FileText className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>sample-document.docx (Tabela)</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isLoadingSample}
                  onClick={() => handleLoadSample('sample-images.pdf')}
                >
                  <FileText className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span>sample-images.pdf (Z obrazami)</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isLoadingSample}
                  onClick={() => handleLoadSample('sample-scanned.png')}
                >
                  <FileText className="w-3.5 h-3.5 text-[#a855f7]" />
                  <span>sample-scanned.png (Skan OCR)</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <DropZone onFileSelect={handleFileSelect} />

          {/* Recent Files Section */}
          <RecentFiles
            onSelectRecent={(item: RecentFileItem) => {
              handleLoadSample(item.name);
            }}
          />
        </div>
      ) : (
        /* Document Viewers */
        <div className="space-y-6">
          {isPdf && (
            <PdfViewer
              file={selectedFile || fileBuffer}
              fileName={fileName}
              fileSize={fileSize}
            />
          )}

          {isDocx && (
            <DocxViewer
              file={selectedFile || fileBuffer}
              fileName={fileName}
              fileSize={fileSize}
            />
          )}

          {isImage && (
            <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
              <h4 className="text-sm font-semibold text-[#f1f1f1]">Podgląd obrazu</h4>
              <div className="max-w-2xl max-h-[500px] overflow-hidden rounded-xl border border-[#2e2e2e]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt={fileName}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
