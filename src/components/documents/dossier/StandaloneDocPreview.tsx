import React from 'react';
import { Download, Printer } from 'lucide-react';
import { printHtmlDoc } from '../../../lib/printHtmlDoc';

export const StandaloneDocPreview: React.FC<{
  docTitle: string;
  docFilename: string;
  docHtml: string;
  onExportExcel?: () => void;
}> = ({ docTitle, docFilename, docHtml, onExportExcel }) => (
  <div className="flex flex-col h-full overflow-hidden font-app">
    <div className="p-3.5 sm:p-4 border-b border-line/60 bg-surface/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
      <div>
        <span className="text-[10px] uppercase font-bold text-ink-faint tracking-wider block mb-0.5">XEM TRƯỚC VĂN BẢN</span>
        <h2 className="font-bold text-sm sm:text-base text-accent tracking-tight">{docTitle}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onExportExcel && (
          <button
            type="button"
            onClick={onExportExcel}
            className="flex items-center space-x-1.5 bg-accent hover:opacity-90 text-accent-ink font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-accent/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Lưu dạng Excel (.xlsx)</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => printHtmlDoc(docHtml, docFilename)}
          className="flex items-center space-x-1.5 bg-neg hover:opacity-90 text-accent-ink font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>In / Xuất PDF</span>
        </button>
      </div>
    </div>
    <div className="flex-1 bg-surface/30 p-2 overflow-auto">
      <iframe
        title={docTitle}
        srcDoc={docHtml}
        sandbox=""
        className="w-full h-full min-h-[600px] bg-white rounded-lg border border-line/50"
      />
    </div>
  </div>
);
