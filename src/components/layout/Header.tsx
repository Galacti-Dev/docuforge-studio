'use client';

import React from 'react';
import { FileText, Search, ShieldCheck, Menu, UploadCloud } from 'lucide-react';

interface HeaderProps {
  onOpenSearch: () => void;
  onToggleMobileMenu?: () => void;
  activeToolName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onToggleMobileMenu,
  activeToolName,
}) => {
  return (
    <header className="h-16 border-b border-[#2e2e2e] bg-[#1f1f1f] px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      <div className="flex items-center space-x-3 md:space-x-4">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-[#9ca3af] hover:text-[#f1f1f1] hover:bg-[#262626] transition-colors"
            aria-label="Otwórz menu nawigacji"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#3b82f6] flex items-center justify-center font-bold text-white shadow-sm shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight tracking-tight text-[#f1f1f1]">
              DocuForge Studio
            </h1>
            <p className="text-[11px] text-[#9ca3af]">Lokalne i prywatne przetwarzanie</p>
          </div>
        </div>

        {activeToolName && (
          <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-[#2e2e2e]">
            <span className="text-xs text-[#9ca3af]">Moduł:</span>
            <span className="text-xs font-semibold text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-0.5 rounded-lg border border-[#3b82f6]/20">
              {activeToolName}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2.5">
        {/* Quick File Open Shortcut Button */}
        <button
          onClick={() => {
            const input = document.getElementById('global-file-input') as HTMLInputElement | null;
            if (input) input.click();
          }}
          className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#262626] border border-[#2e2e2e] text-xs text-[#9ca3af] hover:text-[#f1f1f1] transition-all group"
          title="Otwórz plik (Ctrl+O)"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[#9ca3af] group-hover:text-[#10b981]" />
          <span>Wczytaj</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-[#1f1f1f] border border-[#333333] rounded-md font-mono text-[#9ca3af]">
            Ctrl+O
          </kbd>
        </button>

        {/* Quick Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#262626] border border-[#2e2e2e] text-xs text-[#9ca3af] hover:text-[#f1f1f1] transition-all group"
          title="Szybkie wyszukiwanie (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-[#9ca3af] group-hover:text-[#3b82f6]" />
          <span className="hidden sm:inline">Szukaj narzędzia...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-[#1f1f1f] border border-[#333333] rounded-md font-mono text-[#9ca3af]">
            Ctrl+K
          </kbd>
        </button>

        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2e2e2e] text-xs text-[#9ca3af]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
          <span>Lokalne 100% • Max 100 MB</span>
        </div>
      </div>
    </header>
  );
};
