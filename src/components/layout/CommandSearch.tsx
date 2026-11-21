'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { TOOLS_LIST, ToolItem } from './Sidebar';

interface CommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (toolId: string) => void;
}

export const CommandSearch: React.FC<CommandSearchProps> = ({
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTools = TOOLS_LIST.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase()) ||
      t.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Arrow navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredTools.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredTools.length) % (filteredTools.length || 1));
    } else if (e.key === 'Enter' && filteredTools[selectedIndex]) {
      e.preventDefault();
      onSelectTool(filteredTools[selectedIndex].id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in fade-in-0 zoom-in-95 duration-100">
        <div className="flex items-center px-4 border-b border-[#2e2e2e] bg-[#1a1a1a]">
          <Search className="w-5 h-5 text-[#9ca3af] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Szukaj narzędzia (np. 'podział', 'docx', 'kompresja', 'ocr')..."
            className="w-full h-14 bg-transparent text-[#f1f1f1] placeholder-[#6b7280] text-sm outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9ca3af] hover:text-[#f1f1f1] hover:bg-[#262626] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredTools.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9ca3af]">
              Nie znaleziono narzędzia dla zapytania: &quot;{query}&quot;
            </div>
          ) : (
            filteredTools.map((tool, idx) => {
              const Icon = tool.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={tool.id}
                  onClick={() => {
                    onSelectTool(tool.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'bg-[#3b82f6] text-white' : 'hover:bg-[#262626] text-[#f1f1f1]'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#141414] text-[#3b82f6]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-medium text-xs truncate">{tool.name}</div>
                      <div
                        className={`text-[11px] truncate ${
                          isSelected ? 'text-white/80' : 'text-[#9ca3af]'
                        }`}
                      >
                        {tool.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#141414] text-[#9ca3af]'
                      }`}
                    >
                      {tool.badge}
                    </span>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#2e2e2e] bg-[#171717] flex items-center justify-between text-[11px] text-[#9ca3af]">
          <span>Użyj strzałek ↑ ↓ do nawigacji, Enter aby wybrać</span>
          <span>Esc aby zamknąć</span>
        </div>
      </div>
    </div>
  );
};
