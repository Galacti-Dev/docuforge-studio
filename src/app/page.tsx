'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar, TOOLS_LIST } from '@/components/layout/Sidebar';
import { CommandSearch } from '@/components/layout/CommandSearch';
import { Workspace } from '@/components/workspace/Workspace';
import { ToastProvider, useToast } from '@/context/ToastContext';

function AppContent() {
  const [activeToolId, setActiveToolId] = useState<string>('viewer');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const toast = useToast();

  const activeTool = TOOLS_LIST.find((t) => t.id === activeToolId);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K: Open Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // Ctrl+O / Cmd+O: Trigger File Open Dialog
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        const input = document.getElementById('global-file-input') as HTMLInputElement | null;
        if (input) input.click();
        return;
      }

      // Ctrl+Enter / Cmd+Enter: Run active operation
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('docuforge:run-action'));
        return;
      }

      // Esc: Close Search / Modal / Mobile Menu
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          e.preventDefault();
          setIsSearchOpen(false);
        } else if (isMobileMenuOpen) {
          e.preventDefault();
          setIsMobileMenuOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isMobileMenuOpen]);

  const handleGlobalFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesCount = e.target.files.length;
      if (filesCount > 1) {
        setActiveToolId('batch');
        toast.info(
          'Wczytano pliki wsadowe',
          `Przełączono do kolejki wsadowej (${filesCount} plików).`
        );
      } else {
        toast.info(
          'Wczytano plik',
          `Wybrano plik ${e.target.files[0].name}.`
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-[#f1f1f1] flex flex-col font-sans antialiased selection:bg-[#3b82f6]/30 selection:text-white">
      {/* Hidden Global File Input for Ctrl+O */}
      <input
        id="global-file-input"
        type="file"
        multiple
        accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleGlobalFilesSelected}
      />

      {/* Top Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        activeToolName={activeTool?.name}
      />

      {/* Main Body with Sidebar + Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          activeToolId={activeToolId}
          onSelectTool={(id) => {
            setActiveToolId(id);
            setIsMobileMenuOpen(false);
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Central Workspace */}
        <main className="flex-1 overflow-y-auto bg-[#141414] w-full">
          <Workspace
            activeToolId={activeToolId}
            onSelectTool={(id) => setActiveToolId(id)}
          />
        </main>
      </div>

      {/* Command Search Palette Modal (Ctrl+K) */}
      <CommandSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTool={(id) => {
          setActiveToolId(id);
          setIsSearchOpen(false);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
