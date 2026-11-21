'use client';

import React, { useState } from 'react';
import { Sparkles, Hash, PenTool } from 'lucide-react';
import { WatermarkTool } from './WatermarkTool';
import { PageNumbersTool } from './PageNumbersTool';
import { SignTool } from './SignTool';

export type StampSignTab = 'watermark' | 'page-numbers' | 'sign';

interface StampSignToolProps {
  initialTab?: StampSignTab;
  initialFile?: File | null;
}

export const StampSignTool: React.FC<StampSignToolProps> = ({
  initialTab = 'watermark',
  initialFile,
}) => {
  const [activeTab, setActiveTab] = useState<StampSignTab>(initialTab);

  return (
    <div className="space-y-6">
      {/* Tab Navigation Bar */}
      <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-2xl p-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('watermark')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'watermark'
              ? 'bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/20'
              : 'text-[#9ca3af] hover:text-[#f1f1f1] hover:bg-[#262626]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Znak Wodny</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('page-numbers')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'page-numbers'
              ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/20'
              : 'text-[#9ca3af] hover:text-[#f1f1f1] hover:bg-[#262626]'
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>Numeracja Stron</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sign')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'sign'
              ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/20'
              : 'text-[#9ca3af] hover:text-[#f1f1f1] hover:bg-[#262626]'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Podpis Cyfrowy (Canvas)</span>
        </button>
      </div>

      {/* Render Active Tool */}
      {activeTab === 'watermark' && <WatermarkTool initialFile={initialFile} />}
      {activeTab === 'page-numbers' && <PageNumbersTool initialFile={initialFile} />}
      {activeTab === 'sign' && <SignTool initialFile={initialFile} />}
    </div>
  );
};
