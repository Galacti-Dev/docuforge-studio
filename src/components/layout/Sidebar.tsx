'use client';

import React from 'react';
import {
  Layers,
  RefreshCw,
  Image as ImageIcon,
  Minimize2,
  Shield,
  FileSpreadsheet,
  GitCompare,
  Search,
  Eye,
  FileBox,
  Sparkles,
  Hash,
  PenTool,
  FileSearch,
  X,
} from 'lucide-react';

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: 'organize' | 'convert' | 'graphics' | 'optimize' | 'security' | 'advanced';
  icon: React.ElementType;
  badge: string;
}

export const TOOLS_LIST: ToolItem[] = [
  // Organize
  { id: 'viewer', name: 'Podgląd Dokumentu', description: 'Uniwersalna przeglądarka PDF & DOCX', category: 'organize', icon: Eye, badge: 'M2' },
  { id: 'merge', name: 'Łączenie PDF', description: 'Scalanie wielu dokumentów w jeden plik', category: 'organize', icon: Layers, badge: 'M3' },
  { id: 'split', name: 'Podział PDF', description: 'Wycinanie stron, zakresy i paczki ZIP', category: 'organize', icon: FileBox, badge: 'M3' },
  { id: 'organize', name: 'Reorganizacja Stron', description: 'Obracanie, usuwanie i zmiana kolejności DnD', category: 'organize', icon: Layers, badge: 'M3' },
  // Convert
  { id: 'docx-to-pdf', name: 'DOCX -> PDF', description: 'Konwersja LibreOffice z zachowaniem stylów', category: 'convert', icon: RefreshCw, badge: 'M4' },
  { id: 'pdf-to-docx', name: 'PDF -> DOCX', description: 'Ekstrakcja tekstu i struktury do pliku Word', category: 'convert', icon: RefreshCw, badge: 'M4' },
  { id: 'to-markdown', name: 'Eksport do Markdown', description: 'Konwersja dokumentu na format .md i .txt', category: 'convert', icon: RefreshCw, badge: 'M4' },
  { id: 'to-txt', name: 'Eksport do TXT', description: 'Czysta ekstrakcja tekstu UTF-8 bez formatowania', category: 'convert', icon: RefreshCw, badge: 'M4' },
  // Graphics
  { id: 'pdf-to-images', name: 'PDF -> Obrazy', description: 'Eksport stron do PNG/JPG/WebP w wybranym DPI', category: 'graphics', icon: ImageIcon, badge: 'M5' },
  { id: 'images-to-pdf', name: 'Obrazy -> PDF', description: 'Tworzenie dokumentu PDF z wielu grafik', category: 'graphics', icon: ImageIcon, badge: 'M5' },
  // Optimize
  { id: 'compress', name: 'Kompresja PDF', description: '3 profile kompresji Ghostscript (Lekka, Zrównoważona, Maksymalna)', category: 'optimize', icon: Minimize2, badge: 'M6' },
  // Security
  { id: 'protect', name: 'Szyfrowanie i Hasło', description: 'Zabezpieczanie dokumentu PDF hasłem AES-256', category: 'security', icon: Shield, badge: 'M7' },
  { id: 'unlock', name: 'Odblokowanie PDF', description: 'Usuwanie zabezpieczeń po podaniu hasła', category: 'security', icon: Shield, badge: 'M7' },
  { id: 'metadata', name: 'Metadane i Sanityzacja', description: 'Edycja pól dokumentu oraz czyszczenie ukrytych danych', category: 'security', icon: Shield, badge: 'M7' },
  // Advanced
  { id: 'watermark', name: 'Znak Wodny', description: 'Dodawanie tekstowych znaków wodnych z rotacją', category: 'advanced', icon: Sparkles, badge: 'M8' },
  { id: 'page-numbers', name: 'Numeracja Stron', description: 'Automatyczne stopki z szablonem Strona X z Y', category: 'advanced', icon: Hash, badge: 'M8' },
  { id: 'sign', name: 'Podpis Cyfrowy / Canvas', description: 'Rysowanie odręcznego podpisu na Canvasie', category: 'advanced', icon: PenTool, badge: 'M8' },
  { id: 'ocr', name: 'OCR Skanów (PL/EN)', description: 'Rozpoznawanie tekstu Tesseract z paskiem postępu', category: 'advanced', icon: FileSearch, badge: 'M9' },
  { id: 'diff', name: 'Porównywarka Diff', description: 'Wizualne podświetlanie różnic PDF vs PDF / DOCX', category: 'advanced', icon: GitCompare, badge: 'M9' },
  { id: 'batch', name: 'Kolejka Wsadowa Batch', description: 'Masowe przetwarzanie do 20 plików i eksport do ZIP', category: 'advanced', icon: FileBox, badge: 'M10' },
];

interface SidebarProps {
  activeToolId: string;
  onSelectTool: (toolId: string) => void;
  onOpenSearch: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeToolId,
  onSelectTool,
  onOpenSearch,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const categories: Array<{ id: ToolItem['category']; label: string; icon: React.ElementType }> = [
    { id: 'organize', label: 'Organizacja PDF', icon: Layers },
    { id: 'convert', label: 'Konwersje Dokumentów', icon: RefreshCw },
    { id: 'graphics', label: 'Grafika i Obrazy', icon: ImageIcon },
    { id: 'optimize', label: 'Kompresja', icon: Minimize2 },
    { id: 'security', label: 'Bezpieczeństwo', icon: Shield },
    { id: 'advanced', label: 'Zaawansowane, OCR & Batch', icon: GitCompare },
  ];

  const handleToolClick = (id: string) => {
    onSelectTool(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-64 border-r border-[#2e2e2e] bg-[#1f1f1f] flex flex-col h-full md:h-[calc(100vh-4rem)] select-none shrink-0 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-[#2e2e2e] flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onOpenSearch();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#141414] hover:bg-[#262626] border border-[#2e2e2e] text-xs text-[#9ca3af] hover:text-[#f1f1f1] transition-all group"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-[#9ca3af] group-hover:text-[#3b82f6]" />
              <span>Wyszukaj moduł</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-[#1f1f1f] border border-[#333333] rounded font-mono text-[#9ca3af]">
              Ctrl+K
            </kbd>
          </button>

          {/* Mobile close button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-2 rounded-xl text-[#9ca3af] hover:text-[#f1f1f1] hover:bg-[#262626]"
              aria-label="Zamknij menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {categories.map((cat) => {
            const categoryTools = TOOLS_LIST.filter((t) => t.category === cat.id);
            return (
              <div key={cat.id} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                  {cat.label}
                </div>
                <div className="space-y-0.5">
                  {categoryTools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeToolId === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => handleToolClick(tool.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-[#3b82f6] text-white shadow-sm'
                            : 'text-[#9ca3af] hover:text-[#f1f1f1] hover:bg-[#262626]'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#3b82f6]'}`} />
                          <span className="truncate">{tool.name}</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ml-1 ${
                            isActive ? 'bg-white/20 text-white' : 'bg-[#141414] text-[#9ca3af]'
                          }`}
                        >
                          {tool.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-[#2e2e2e] bg-[#181818] text-[11px] text-[#9ca3af] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
            <span>Silnik aktywny</span>
          </span>
          <span className="font-mono text-[10px]">v1.0.0 M10</span>
        </div>
      </aside>
    </>
  );
};
