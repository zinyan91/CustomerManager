import React from 'react';

interface QuizTelemetryStripProps {
  stats: {
    total: number;
    multiAnswer: number;
    unsettled: number;
  };
}

export const QuizTelemetryStrip: React.FC<QuizTelemetryStripProps> = ({ stats }) => {
  return (
    <div data-workspace-metrics className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-app">
      <div data-workspace-panel data-metric-tone="accent" className="rounded-xl p-3.5 sm:p-4 border border-line/70 bg-surface/60 space-y-1 shadow-2xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Tổng ngân hàng câu hỏi</div>
        <div className="font-mono font-bold text-base sm:text-lg text-accent">{stats.total} Câu hỏi</div>
      </div>

      <div data-workspace-panel data-metric-tone="pos" className="rounded-xl p-3.5 sm:p-4 border border-line/70 bg-surface/60 space-y-1 shadow-2xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Câu hỏi nhiều đáp án</div>
        <div className="font-mono font-bold text-base sm:text-lg text-pos">{stats.multiAnswer} Câu hỏi</div>
      </div>

      <div data-workspace-panel data-metric-tone="warn" className="rounded-xl p-3.5 sm:p-4 border border-line/70 bg-surface/60 space-y-1 shadow-2xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Câu chưa chốt đáp án</div>
        <div className="font-mono font-bold text-base sm:text-lg text-warn">{stats.unsettled} Câu hỏi</div>
      </div>
    </div>
  );
};
