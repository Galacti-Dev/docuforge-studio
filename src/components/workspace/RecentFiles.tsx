'use client';

import React, { useState, useEffect } from 'react';
import { History, FileText, Trash2, ArrowUpRight } from 'lucide-react';
import { formatFileSize } from '@/lib/client/download-utils';

export interface RecentFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  timestamp: number;
}

interface RecentFilesProps {
  onSelectRecent?: (item: RecentFileItem) => void;
}

const STORAGE_KEY = 'docuforge_recent_files';

export const RecentFiles: React.FC<RecentFilesProps> = ({ onSelectRecent }) => {
  const [recentFiles, setRecentFiles] = useState<RecentFileItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentFiles(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentFiles([]);
    } catch {
      // Ignore
    }
  };

  if (recentFiles.length === 0) return null;

  return (
    <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-[#3b82f6]" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
            Ostatnio Przetwarzane Pliki
          </h4>
        </div>
        <button
          onClick={clearHistory}
          className="text-[11px] text-[#9ca3af] hover:text-[#ef4444] transition-colors flex items-center gap-1"
          title="Wyczyść historię sesji"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Wyczyść</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {recentFiles.slice(0, 6).map((file) => (
          <div
            key={file.id}
            onClick={() => onSelectRecent?.(file)}
            className="flex items-center justify-between p-3 rounded-xl bg-[#141414] border border-[#2e2e2e] hover:border-[#3b82f6] hover:bg-[#262626] transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <FileText className="w-4 h-4 text-[#3b82f6] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#f1f1f1] truncate group-hover:text-[#3b82f6] transition-colors">
                  {file.name}
                </p>
                <p className="text-[10px] text-[#9ca3af]">
                  {formatFileSize(file.size)} • {new Date(file.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#9ca3af] group-hover:text-[#3b82f6] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
};

export function addFileToRecent(file: { name: string; size: number; type: string }): void {
  try {
    const item: RecentFileItem = {
      id: `${file.name}-${file.size}-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      timestamp: Date.now(),
    };
    const stored = localStorage.getItem(STORAGE_KEY);
    let list: RecentFileItem[] = stored ? JSON.parse(stored) : [];
    list = [item, ...list.filter((x) => x.name !== file.name)].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage errors
  }
}
