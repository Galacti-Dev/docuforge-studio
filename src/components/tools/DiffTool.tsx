'use client';

import React, { useState } from 'react';
import {
  GitCompare,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Columns,
  List,
  ArrowRight,
  TrendingUp,
  PlusCircle,
  MinusCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';
import { DiffResult, DiffPart } from '@/lib/diff/document-diff';

interface DiffToolProps {
  initialFile?: File | null;
}

export const DiffTool: React.FC<DiffToolProps> = ({ initialFile }) => {
  const [fileA, setFileA] = useState<File | null>(initialFile || null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');

  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);

  const handleLoadSamplePair = async () => {
    try {
      setError(null);
      const [resA, resB] = await Promise.all([
        fetch('/api/fixtures/sample-multipage.pdf'),
        fetch('/api/fixtures/sample-document.docx'),
      ]);

      if (!resA.ok || !resB.ok) throw new Error('Nie udało się pobrać plików testowych');

      const blobA = await resA.blob();
      const blobB = await resB.blob();

      setFileA(new File([blobA], 'sample-multipage.pdf', { type: 'application/pdf' }));
      setFileB(new File([blobB], 'sample-document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
      setDiffResult(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCompare = async () => {
    if (!fileA || !fileB) {
      setError('Wybierz oba pliki (Plik A oraz Plik B) przed rozpoczęciem porównania');
      return;
    }

    setIsComparing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('fileA', fileA);
      formData.append('fileB', fileB);

      const res = await fetch('/api/diff/compare', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Błąd serwera (Status: ${res.status})`);
      }

      const data: DiffResult = await res.json();
      setDiffResult(data);
    } catch (err: any) {
      setError(err.message || 'Wystąpił nieoczekiwany błąd podczas porównywania dokumentów');
    } finally {
      setIsComparing(false);
    }
  };

  const handleExportReport = () => {
    if (!diffResult) return;

    let report = `======================================================\n`;
    report += `RAPORT PORÓWNANIA DOKUMENTÓW (DOCUFORGE DIFF)\n`;
    report += `Data raportu: ${new Date().toLocaleString('pl-PL')}\n`;
    report += `Plik A (Oryginał): ${diffResult.fileAName} (${formatFileSize(diffResult.fileASize)})\n`;
    report += `Plik B (Rewizja):  ${diffResult.fileBName} (${formatFileSize(diffResult.fileBSize)})\n`;
    report += `------------------------------------------------------\n`;
    report += `Wskaźnik podobieństwa: ${diffResult.similarityPercentage}%\n`;
    report += `Dodane słowa:        +${diffResult.addedCount}\n`;
    report += `Usunięte słowa:      -${diffResult.removedCount}\n`;
    report += `Niezmienione słowa:   ${diffResult.unchangedCount}\n`;
    report += `======================================================\n\n`;

    report += `ZUNIFIKOWANY ZAPIS RÓŻNIC (UNIFIED DIFF):\n\n`;
    for (const part of diffResult.diffParts) {
      if (part.added) {
        report += `[+ ${part.value} +] `;
      } else if (part.removed) {
        report += `[- ${part.value} -] `;
      } else {
        report += part.value;
      }
    }

    const blob = new Blob([report], { type: 'text/plain; charset=utf-8' });
    downloadBlob(blob, `raport-diff-${Date.now()}.txt`);
  };

  return (
    <div className="space-y-6">
      {/* File Drop Zones (File A & File B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* File A Box */}
        <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3b82f6]">
              Plik A (Wersja pierwotna / Oryginał)
            </span>
            <Badge variant="blue">{fileA ? fileA.name.split('.').pop()?.toUpperCase() : 'Brak'}</Badge>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-[#f1f1f1] truncate">
                {fileA ? fileA.name : 'Nie wybrano pliku A'}
              </h4>
              <p className="text-xs text-[#9ca3af]">
                {fileA ? formatFileSize(fileA.size) : 'PDF, DOCX, TXT'}
              </p>
            </div>
          </div>

          <label className="block w-full text-center py-2 px-3 bg-[#141414] hover:bg-[#262626] border border-[#2e2e2e] rounded-xl text-xs font-medium text-[#f1f1f1] cursor-pointer transition-colors">
            <span>{fileA ? 'Zmień plik A' : 'Wybierz plik A'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFileA(f);
                  setDiffResult(null);
                  setError(null);
                }
              }}
            />
          </label>
        </div>

        {/* File B Box */}
        <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981]">
              Plik B (Wersja zmodyfikowana / Rewizja)
            </span>
            <Badge variant="emerald">{fileB ? fileB.name.split('.').pop()?.toUpperCase() : 'Brak'}</Badge>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-[#f1f1f1] truncate">
                {fileB ? fileB.name : 'Nie wybrano pliku B'}
              </h4>
              <p className="text-xs text-[#9ca3af]">
                {fileB ? formatFileSize(fileB.size) : 'PDF, DOCX, TXT'}
              </p>
            </div>
          </div>

          <label className="block w-full text-center py-2 px-3 bg-[#141414] hover:bg-[#262626] border border-[#2e2e2e] rounded-xl text-xs font-medium text-[#f1f1f1] cursor-pointer transition-colors">
            <span>{fileB ? 'Zmień plik B' : 'Wybierz plik B'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFileB(f);
                  setDiffResult(null);
                  setError(null);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Action Bar & Quick Samples */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="primary"
            size="md"
            disabled={!fileA || !fileB || isComparing}
            onClick={handleCompare}
          >
            {isComparing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Porównywanie zawartości...</span>
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4 mr-2" />
                <span>Porównaj Dokumenty</span>
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handleLoadSamplePair}
          >
            <span>Wczytaj parę testową (Fixtures)</span>
          </Button>
        </div>

        {diffResult && (
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex bg-[#141414] border border-[#2e2e2e] rounded-xl p-1 space-x-1">
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'side-by-side'
                    ? 'bg-[#3b82f6] text-white shadow'
                    : 'text-[#9ca3af] hover:text-[#f1f1f1]'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'unified'
                    ? 'bg-[#3b82f6] text-white shadow'
                    : 'text-[#9ca3af] hover:text-[#f1f1f1]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Unified Diff</span>
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportReport}
            >
              <Download className="w-4 h-4 mr-1 text-[#10b981]" />
              <span>Eksportuj Raport</span>
            </Button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-4 flex items-center space-x-3 text-[#ef4444]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Metrics Dashboard */}
      {diffResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Similarity Card */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9ca3af]">
              <span>Zgodność treści</span>
              <TrendingUp className="w-4 h-4 text-[#3b82f6]" />
            </div>
            <div className="text-3xl font-extrabold text-[#f1f1f1]">
              {diffResult.similarityPercentage}%
            </div>
            <div className="w-full h-1.5 bg-[#2e2e2e] rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  diffResult.similarityPercentage > 75
                    ? 'bg-[#10b981]'
                    : diffResult.similarityPercentage > 40
                    ? 'bg-[#f59e0b]'
                    : 'bg-[#ef4444]'
                }`}
                style={{ width: `${diffResult.similarityPercentage}%` }}
              />
            </div>
          </div>

          {/* Added Words Card */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9ca3af]">
              <span>Dodane słowa</span>
              <PlusCircle className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className="text-3xl font-extrabold text-[#10b981]">
              +{diffResult.addedCount}
            </div>
            <p className="text-[11px] text-[#9ca3af]">Obecne w pliku B, brak w A</p>
          </div>

          {/* Removed Words Card */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9ca3af]">
              <span>Usunięte słowa</span>
              <MinusCircle className="w-4 h-4 text-[#ef4444]" />
            </div>
            <div className="text-3xl font-extrabold text-[#ef4444]">
              -{diffResult.removedCount}
            </div>
            <p className="text-[11px] text-[#9ca3af]">Obecne w pliku A, brak w B</p>
          </div>

          {/* Unchanged Words Card */}
          <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9ca3af]">
              <span>Niezmienione słowa</span>
              <CheckCircle2 className="w-4 h-4 text-[#9ca3af]" />
            </div>
            <div className="text-3xl font-extrabold text-[#f1f1f1]">
              {diffResult.unchangedCount}
            </div>
            <p className="text-[11px] text-[#9ca3af]">Wspólna treść w obu wersjach</p>
          </div>
        </div>
      )}

      {/* Visual Diff View */}
      {diffResult && (
        <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-3">
            <span className="text-sm font-semibold text-[#f1f1f1]">
              {viewMode === 'side-by-side' ? 'Widok Porównawczy (Side-by-Side)' : 'Widok Zunifikowany (Unified Diff)'}
            </span>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40 inline-block" />
                <span className="text-red-400">Usunięte</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />
                <span className="text-emerald-400">Dodane</span>
              </span>
            </div>
          </div>

          {/* Side by Side Mode */}
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Column */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#3b82f6] px-2 py-1 bg-[#3b82f6]/10 rounded-lg">
                  {diffResult.fileAName} (Oryginał)
                </div>
                <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl text-xs md:text-sm font-mono leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap">
                  {diffResult.diffParts.map((part, idx) => {
                    if (part.added) return null; // don't show added in original
                    if (part.removed) {
                      return (
                        <span
                          key={idx}
                          className="bg-red-500/20 text-red-300 line-through rounded px-1 py-0.5 border border-red-500/30"
                        >
                          {part.value}
                        </span>
                      );
                    }
                    return <span key={idx} className="text-[#f1f1f1]">{part.value}</span>;
                  })}
                </div>
              </div>

              {/* Modified Column */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#10b981] px-2 py-1 bg-[#10b981]/10 rounded-lg">
                  {diffResult.fileBName} (Rewizja)
                </div>
                <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl text-xs md:text-sm font-mono leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap">
                  {diffResult.diffParts.map((part, idx) => {
                    if (part.removed) return null; // don't show removed in modified
                    if (part.added) {
                      return (
                        <span
                          key={idx}
                          className="bg-emerald-500/20 text-emerald-300 font-semibold rounded px-1 py-0.5 border border-emerald-500/30"
                        >
                          {part.value}
                        </span>
                      );
                    }
                    return <span key={idx} className="text-[#f1f1f1]">{part.value}</span>;
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Unified Diff Mode */
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl text-xs md:text-sm font-mono leading-relaxed max-h-[550px] overflow-y-auto whitespace-pre-wrap">
              {diffResult.diffParts.map((part, idx) => {
                if (part.removed) {
                  return (
                    <span
                      key={idx}
                      className="bg-red-500/20 text-red-300 line-through rounded px-1 py-0.5 border border-red-500/30 mr-1"
                    >
                      {part.value}
                    </span>
                  );
                }
                if (part.added) {
                  return (
                    <span
                      key={idx}
                      className="bg-emerald-500/20 text-emerald-300 font-semibold rounded px-1 py-0.5 border border-emerald-500/30 mr-1"
                    >
                      {part.value}
                    </span>
                  );
                }
                return <span key={idx} className="text-[#f1f1f1]">{part.value}</span>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
