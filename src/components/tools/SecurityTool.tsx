'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  Sliders,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { formatFileSize, downloadBlob } from '@/lib/client/download-utils';

export type SecurityTab = 'protect' | 'unlock' | 'metadata' | 'sanitize';

interface SecurityToolProps {
  initialTab?: SecurityTab;
  initialFile?: File | null;
}

export const SecurityTool: React.FC<SecurityToolProps> = ({
  initialTab = 'protect',
  initialFile,
}) => {
  const [activeTab, setActiveTab] = useState<SecurityTab>(initialTab);
  const [file, setFile] = useState<File | null>(initialFile || null);

  // Protect State
  const [userPassword, setUserPassword] = useState<string>('');
  const [ownerPassword, setOwnerPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Unlock State
  const [unlockPassword, setUnlockPassword] = useState<string>('');
  const [showUnlockPassword, setShowUnlockPassword] = useState<boolean>(false);

  // Metadata State
  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [keywords, setKeywords] = useState<string>('');
  const [creator, setCreator] = useState<string>('DocuForge Studio');
  const [producer, setProducer] = useState<string>('DocuForge Studio');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);

  // Global Tool State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialFile && initialFile.name.toLowerCase().endsWith('.pdf')) {
      setFile(initialFile);
    }
  }, [initialFile]);

  // Read metadata automatically when file changes
  useEffect(() => {
    if (file && activeTab === 'metadata') {
      loadMetadata(file);
    }
  }, [file, activeTab]);

  const loadMetadata = async (targetFile: File) => {
    setIsLoadingMetadata(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', targetFile);
      formData.append('action', 'read');

      const res = await fetch('/api/pdf/metadata', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Nie udało się odczytać metadanych.');
      const data = await res.json();
      if (data.metadata) {
        setTitle(data.metadata.title || '');
        setAuthor(data.metadata.author || '');
        setSubject(data.metadata.subject || '');
        setKeywords(data.metadata.keywords || '');
        setCreator(data.metadata.creator || 'DocuForge Studio');
        setProducer(data.metadata.producer || 'DocuForge Studio');
      }
    } catch (err: any) {
      console.warn('Błąd odczytu metadanych:', err);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setErrorMessage(null);
      setSuccessInfo(null);
    }
  };

  const handleLoadSample = async (sampleName: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    try {
      const res = await fetch(`/api/fixtures/${sampleName}`);
      if (!res.ok) throw new Error('Nie udało się wczytać próbki PDF.');
      const blob = await res.blob();
      const sampleFile = new File([blob], sampleName, { type: 'application/pdf' });
      setFile(sampleFile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Błąd wczytywania próbki.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Password strength calculator
  const calculateStrength = (pwd: string) => {
    if (!pwd) return { label: 'Brak hasła', score: 0, color: 'bg-[#2e2e2e]' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { label: 'Słabe', score: 25, color: 'bg-[#ef4444]' };
    if (score <= 3) return { label: 'Średnie', score: 50, color: 'bg-[#f59e0b]' };
    if (score <= 4) return { label: 'Silne', score: 75, color: 'bg-[#3b82f6]' };
    return { label: 'Bardzo silne', score: 100, color: 'bg-[#10b981]' };
  };

  const strength = calculateStrength(userPassword);

  // ACTION: Protect
  const handleProtect = async () => {
    if (!file) {
      setErrorMessage('Wybierz plik PDF do zaszyfrowania.');
      return;
    }
    if (!userPassword.trim()) {
      setErrorMessage('Podaj hasło otwarcia dokumentu.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userPassword', userPassword.trim());
      if (ownerPassword.trim()) {
        formData.append('ownerPassword', ownerPassword.trim());
      }
      formData.append('keyLength', '256');

      const res = await fetch('/api/pdf/protect', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Błąd podczas szyfrowania pliku PDF.');
      }

      const blob = await res.blob();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}-zabezpieczony.pdf`;
      downloadBlob(blob, downloadName);

      setSuccessInfo(`Plik został zaszyfrowany kluczem AES-256 i pobrany: ${downloadName}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Wystąpił błąd podczas szyfrowania.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ACTION: Unlock
  const handleUnlock = async () => {
    if (!file) {
      setErrorMessage('Wybierz plik PDF do odblokowania.');
      return;
    }
    if (!unlockPassword.trim()) {
      setErrorMessage('Podaj hasło dokumentu.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', unlockPassword.trim());

      const res = await fetch('/api/pdf/unlock', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Nieprawidłowe hasło lub plik nie jest zaszyfrowany.');
      }

      const blob = await res.blob();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}-odblokowany.pdf`;
      downloadBlob(blob, downloadName);

      setSuccessInfo(`Hasło zostało pomyślnie usunięte! Pobrano plik: ${downloadName}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Błąd podczas usuwania hasła.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ACTION: Save Metadata
  const handleSaveMetadata = async () => {
    if (!file) {
      setErrorMessage('Wybierz plik PDF.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'update');
      formData.append('title', title);
      formData.append('author', author);
      formData.append('subject', subject);
      formData.append('keywords', keywords);
      formData.append('creator', creator);
      formData.append('producer', producer);

      const res = await fetch('/api/pdf/metadata', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Błąd podczas zapisywania metadanych.');

      const blob = await res.blob();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}-metadane.pdf`;
      downloadBlob(blob, downloadName);

      setSuccessInfo(`Zaktualizowano metadane dokumentu! Pobrano plik: ${downloadName}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Błąd zapisu metadanych.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ACTION: Sanitize
  const handleSanitize = async () => {
    if (!file) {
      setErrorMessage('Wybierz plik PDF do sanityzacji.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/pdf/sanitize', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Błąd podczas sanityzacji dokumentu.');
      }

      const blob = await res.blob();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}-oczyszczony.pdf`;
      downloadBlob(blob, downloadName);

      setSuccessInfo(`Dokument został pomyślnie oczyszczony ze wszystkich ukrytych danych i pobrany: ${downloadName}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Wystąpił błąd podczas sanityzacji.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-2">
        <div className="flex items-center space-x-2">
          <Badge variant="blue">Moduł M7</Badge>
          <h3 className="text-lg font-bold text-[#f1f1f1]">
            Bezpieczeństwo i Metadane PDF
          </h3>
        </div>
        <p className="text-xs text-[#9ca3af]">
          Szyfrowanie dokumentów silnym kluczem AES-256, bezstratne odblokowywanie, zaawansowana edycja pól metadanych oraz pełna sanityzacja ze skasowaniem śladów cyfrowych.
        </p>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => {
            setActiveTab('protect');
            setErrorMessage(null);
            setSuccessInfo(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'protect'
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
              : 'border-[#2e2e2e] bg-[#1f1f1f] text-[#9ca3af] hover:border-[#3b82f6]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs">Szyfrowanie i Hasło</span>
            <Lock className="w-3.5 h-3.5 text-[#3b82f6]" />
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            Zabezpiecz dokument hasłem z algorytmem AES-256 bit.
          </p>
        </button>

        <button
          onClick={() => {
            setActiveTab('unlock');
            setErrorMessage(null);
            setSuccessInfo(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'unlock'
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
              : 'border-[#2e2e2e] bg-[#1f1f1f] text-[#9ca3af] hover:border-[#3b82f6]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs">Odblokowanie PDF</span>
            <Unlock className="w-3.5 h-3.5 text-[#10b981]" />
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            Usuń hasło i ograniczenia po podaniu poprawnego klucza.
          </p>
        </button>

        <button
          onClick={() => {
            setActiveTab('metadata');
            setErrorMessage(null);
            setSuccessInfo(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'metadata'
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
              : 'border-[#2e2e2e] bg-[#1f1f1f] text-[#9ca3af] hover:border-[#3b82f6]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs">Edycja Metadanych</span>
            <Sliders className="w-3.5 h-3.5 text-[#f59e0b]" />
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            Modyfikuj pola Tytuł, Autor, Temat, Słowa kluczowe.
          </p>
        </button>

        <button
          onClick={() => {
            setActiveTab('sanitize');
            setErrorMessage(null);
            setSuccessInfo(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'sanitize'
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
              : 'border-[#2e2e2e] bg-[#1f1f1f] text-[#9ca3af] hover:border-[#3b82f6]/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs">Sanityzacja</span>
            <Trash2 className="w-3.5 h-3.5 text-[#ef4444]" />
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            Usuń ukryte załączniki, XMP, skrypty i historię.
          </p>
        </button>
      </div>

      {/* Main Action Container */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-6 space-y-6">
        {/* File Picker Bar */}
        <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#f1f1f1] truncate">
                {file ? file.name : 'Nie wybrano pliku PDF'}
              </p>
              <p className="text-[11px] text-[#9ca3af]">
                {file ? `Rozmiar: ${formatFileSize(file.size)}` : 'Wybierz dokument do operacji zabezpieczeń'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#262626] hover:bg-[#2e2e2e] text-[#f1f1f1] border border-[#2e2e2e] text-xs font-medium rounded-xl transition-all">
                <span>{file ? 'Zmień plik' : 'Wybierz plik'}</span>
              </span>
            </label>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleLoadSample('sample-multipage.pdf')}
              disabled={isProcessing}
            >
              <span>Wczytaj sample-multipage.pdf</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleLoadSample('sample-images.pdf')}
              disabled={isProcessing}
            >
              <span>Wczytaj sample-images.pdf</span>
            </Button>
          </div>
        </div>

        {/* TAB 1: SZYFROWANIE (PROTECT) */}
        {activeTab === 'protect' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#f1f1f1] flex items-center justify-between">
                  <span>Hasło otwarcia dokumentu (User Password) *</span>
                  <span className="text-[10px] text-[#9ca3af]">Wymagane do otwarcia pliku</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Wpisz silne hasło zabezpieczające..."
                    className="pr-10 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#f1f1f1]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Meter */}
                {userPassword && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#9ca3af]">Siła hasła:</span>
                      <span className="font-semibold text-[#f1f1f1]">{strength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#f1f1f1] flex items-center justify-between">
                  <span>Hasło uprawnień / właściciela (Owner Password - opcjonalne)</span>
                  <span className="text-[10px] text-[#9ca3af]">Domyślnie równe hasłu otwarcia</span>
                </label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="Opcjonalne hasło administracyjne..."
                  className="text-xs font-mono"
                />
              </div>

              <div className="p-3 bg-[#1f1f1f] rounded-lg border border-[#2e2e2e] flex items-center justify-between text-xs text-[#9ca3af]">
                <span>Standard szyfrowania:</span>
                <Badge variant="blue">AES-256 Bit (QPDF Crypt)</Badge>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="emerald"
                size="lg"
                disabled={!file || !userPassword.trim() || isProcessing}
                onClick={handleProtect}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Szyfrowanie dokumentu...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Zaszyfruj i pobierz PDF</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: ODBLOKOWANIE (UNLOCK) */}
        {activeTab === 'unlock' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-3">
              <label className="text-xs font-semibold text-[#f1f1f1] block">
                Podaj hasło do usunięcia zabezpieczeń:
              </label>
              <div className="relative">
                <Input
                  type={showUnlockPassword ? 'text' : 'password'}
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Wpisz hasło do odblokowania PDF..."
                  className="pr-10 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#f1f1f1]"
                >
                  {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#9ca3af]">
                Po podaniu poprawnego hasła, plik wynikowy zostanie trwale odszyfrowany i będzie można go otwierać w dowolnej przeglądarce bez podawania hasła.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="emerald"
                size="lg"
                disabled={!file || !unlockPassword.trim() || isProcessing}
                onClick={handleUnlock}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Odblokowywanie...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Usuń hasło i pobierz PDF</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: EDYCJA METADANYCH (METADATA) */}
        {activeTab === 'metadata' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#f1f1f1]">
                  Pola informacyjne dokumentu (DocumentInfo):
                </span>
                {file && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isLoadingMetadata}
                    onClick={() => loadMetadata(file)}
                  >
                    <span>Odśwież z pliku</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#9ca3af]">Tytuł (Title):</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Tytuł dokumentu..."
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#9ca3af]">Autor (Author):</label>
                  <Input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Imię i nazwisko autora lub organizacja..."
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#9ca3af]">Temat (Subject):</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Krótki opis tematyki..."
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#9ca3af]">Słowa kluczowe (Keywords):</label>
                  <Input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="słowo1, słowo2, raport, pdf..."
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#9ca3af]">Program tworzący (Creator):</label>
                  <Input
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                    placeholder="Aplikacja tworząca..."
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#9ca3af]">Generator PDF (Producer):</label>
                  <Input
                    value={producer}
                    onChange={(e) => setProducer(e.target.value)}
                    placeholder="Silnik PDF..."
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="emerald"
                size="lg"
                disabled={!file || isProcessing}
                onClick={handleSaveMetadata}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Zapisywanie metadanych...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Zapisz metadane i pobierz PDF</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* TAB 4: SANITYZACJA (SANITIZE) */}
        {activeTab === 'sanitize' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#ef4444]/30 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-[#ef4444]">
                <Shield className="w-4 h-4" />
                <span className="font-semibold text-xs">Bezpieczna Sanityzacja Dokumentu</span>
              </div>
              <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                Sanityzacja usuwa z pliku wszystkie ukryte i potencjalnie niebezpieczne dane, pozostawiając jedynie widoczną treść dokumentu.
              </p>

              <div className="space-y-1.5 pt-1">
                {[
                  'Wyczyszczenie pól metadanych (Tytuł, Autor, Temat, Program)',
                  'Trwałe usunięcie strumieni metadanych XMP oraz PieceInfo',
                  'Skasowanie ukrytych załączników i plików wbudowanych (Names)',
                  'Usunięcie komentarzy, adnotacji i linków ze wszystkich stron',
                  'Wyczyszczenie skryptów JavaScript i akcji automatycznych (OpenAction, AA)',
                  'Linearyzacja struktury PDF w celu eliminacji historii zmian',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs text-[#f1f1f1]">
                    <Check className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="emerald"
                size="lg"
                disabled={!file || isProcessing}
                onClick={handleSanitize}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Czyszczenie dokumentu...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1 text-[#ef4444]" />
                    <span>Wyczyść dane (Sanityzacja)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Status Alerts */}
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
      </div>
    </div>
  );
};