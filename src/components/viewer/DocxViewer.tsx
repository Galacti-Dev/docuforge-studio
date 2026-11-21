'use client';

import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { FileText, Loader2, BookOpen, Layers, AlignLeft, Download } from 'lucide-react';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';
import { Button } from '../ui/Button';

interface DocxViewerProps {
  file: File | ArrayBuffer;
  fileName?: string;
  fileSize?: number;
}

export const DocxViewer: React.FC<DocxViewerProps> = ({
  file,
  fileName = 'Dokument.docx',
  fileSize,
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);
  const [paragraphCount, setParagraphCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMessage(null);

    const parseDocx = async () => {
      try {
        let arrayBuffer: ArrayBuffer;
        if (file instanceof File) {
          arrayBuffer = await file.arrayBuffer();
        } else {
          arrayBuffer = file;
        }

        const options = {
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "table => table.docx-table",
          ],
        };

        const result = await mammoth.convertToHtml({ arrayBuffer }, options);
        if (!isMounted) return;

        setHtmlContent(result.value);

        // Calculate statistics
        const textResult = await mammoth.extractRawText({ arrayBuffer });
        const text = textResult.value || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const paragraphs = text.split('\n\n').filter((p) => p.trim()).length;

        setWordCount(words);
        setParagraphCount(paragraphs);
        setLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Błąd parsowania pliku DOCX:', err);
        setErrorMessage(
          'Nie udało się odczytać dokumentu DOCX. Upewnij się, że plik jest w prawidłowym formacie OpenXML (.docx).'
        );
        setLoading(false);
      }
    };

    parseDocx();

    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleDownload = () => {
    if (file instanceof File) {
      downloadBlob(file, fileName);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl space-y-4">
        <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
        <p className="text-sm text-[#9ca3af]">Parsowanie i renderowanie struktury DOCX...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-8 bg-[#1f1f1f] border border-[#ef4444]/40 rounded-2xl text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="font-semibold text-sm text-[#f1f1f1]">Błąd podglądu DOCX</h4>
        <p className="text-xs text-[#9ca3af] max-w-md mx-auto">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[750px] bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl overflow-hidden select-none">
      {/* Header Toolbar */}
      <div className="h-14 bg-[#1a1a1a] border-b border-[#2e2e2e] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#f1f1f1] truncate max-w-xs">{fileName}</h3>
            {fileSize && (
              <p className="text-[10px] text-[#9ca3af]">{formatFileSize(fileSize)}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center space-x-4 text-xs text-[#9ca3af]">
          <div className="flex items-center space-x-1.5">
            <AlignLeft className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>
              Słowa: <strong className="text-[#f1f1f1]">{wordCount}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-[#10b981]" />
            <span>
              Akapity: <strong className="text-[#f1f1f1]">{paragraphCount}</strong>
            </span>
          </div>
        </div>

        <div>
          {file instanceof File && (
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>Pobierz plik</span>
            </Button>
          )}
        </div>
      </div>

      {/* Styled Document Content */}
      <div className="flex-1 bg-[#141414] overflow-y-auto p-6 md:p-10 flex justify-center">
        <div className="max-w-3xl w-full bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-8 md:p-12 shadow-xl space-y-6 text-[#f1f1f1]">
          {/* Injected HTML with Dark Mode stylesheet */}
          <div
            className="docx-render-container prose prose-invert max-w-none space-y-4 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>

      <style jsx global>{`
        .docx-render-container h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #f1f1f1;
          border-bottom: 1px solid #2e2e2e;
          padding-bottom: 0.5rem;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        .docx-render-container h2 {
          font-size: 1.35rem;
          font-weight: 600;
          color: #3b82f6;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .docx-render-container h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #e5e7eb;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .docx-render-container p {
          color: #d1d5db;
          font-size: 0.925rem;
          line-height: 1.65;
          margin-bottom: 0.85rem;
        }
        .docx-render-container strong {
          color: #ffffff;
          font-weight: 600;
        }
        .docx-render-container ul,
        .docx-render-container ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
          color: #d1d5db;
          font-size: 0.925rem;
        }
        .docx-render-container li {
          margin-bottom: 0.35rem;
        }
        .docx-render-container table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.25rem 0;
          font-size: 0.875rem;
          background: #141414;
          border: 1px solid #2e2e2e;
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .docx-render-container th {
          background: #262626;
          color: #f1f1f1;
          font-weight: 600;
          text-align: left;
          padding: 0.75rem 1rem;
          border: 1px solid #2e2e2e;
        }
        .docx-render-container td {
          padding: 0.75rem 1rem;
          border: 1px solid #2e2e2e;
          color: #d1d5db;
        }
        .docx-render-container tr:hover td {
          background: #1c1c1c;
        }
      `}</style>
    </div>
  );
};
