import React, { useRef, useState } from 'react';
import { Upload, Loader2, AlertTriangle } from 'lucide-react';
import { BTN_SECONDARY, SECTION_LABEL } from '../../lib/uiClasses';
import { parseQuizImportFile } from '../../lib/quizBank';
import type { QuizImportReport } from '../../lib/api';

interface QuizImportPanelProps {
  onImport: (rows: unknown[]) => Promise<QuizImportReport>;
  onImported: () => void;
  onError: (message: string) => void;
}

export const QuizImportPanel: React.FC<QuizImportPanelProps> = ({
  onImport, onImported, onError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState<QuizImportReport | null>(null);
  const [parseSkipped, setParseSkipped] = useState<{ at: number; reason: string }[]>([]);

  const handleFile = async (file: File) => {
    setBusy(true);
    setReport(null);
    setParseSkipped([]);
    setFileName(file.name);
    try {
      const { rows, skipped } = parseQuizImportFile(await file.text());
      setParseSkipped(skipped);
      if (rows.length === 0) {
        onError('Không đọc được câu nào hợp lệ trong tệp.');
        return;
      }
      setReport(await onImport(rows));
      onImported();
    } catch (err: any) {
      onError(err?.message || 'Không nạp được tệp.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2.5 font-app">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          aria-label="Tệp JSON câu hỏi"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`${BTN_SECONDARY} px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50`}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-accent" />}
          {busy ? 'Đang nạp…' : 'Nạp thêm'}
        </button>
      </div>

      {parseSkipped.length > 0 && (
        <div className="text-xs border border-line/70 rounded-xl p-3.5 bg-surface/60 space-y-1 shadow-2xs">
          <div className="font-semibold text-ink">
            {parseSkipped.length} dòng trong tệp không đọc được
          </div>
          <ul className="list-disc pl-4 text-ink-muted space-y-0.5 text-[11px]">
            {parseSkipped.slice(0, 10).map(s => (
              <li key={s.at}>Dòng {s.at}: {s.reason}</li>
            ))}
          </ul>
          {parseSkipped.length > 10 && (
            <div className="text-ink-faint text-[11px]">…và {parseSkipped.length - 10} dòng nữa.</div>
          )}
        </div>
      )}

      {report && (
        <div className="text-xs border border-line/70 rounded-xl p-3.5 bg-surface/60 space-y-2 shadow-2xs">
          <div className="font-bold text-ink">
            {fileName}: đã nạp <span className="text-pos font-mono">{report.da_nap}</span> câu
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-ink-muted text-[11px]">
            <span>bỏ {report.trung_trong_ngan_hang.length} câu đã có trong ngân hàng</span>
            <span>bỏ {report.trung_trong_file.length} câu tệp tự trùng</span>
            <span>bỏ {report.khong_hop_le.length} câu không hợp lệ</span>
          </div>

          {report.lech_dap_an.length > 0 && (
            <div className="text-neg space-y-1 text-[11px] pt-1 border-t border-line/50">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {report.lech_dap_an.length} câu trùng nội dung nhưng ĐÁP ÁN KHÁC bản đang có — đã bỏ, không ghi đè:
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {report.lech_dap_an.slice(0, 10).map(c => (
                  <li key={`${c.id_co_san}-${c.cau}`}>
                    #{c.id_co_san} đang là <strong>{c.dap_an_co_san.join(', ') || '(trống)'}</strong>,
                    tệp ghi <strong>{c.dap_an_trong_file.join(', ') || '(trống)'}</strong> — {c.cau}
                  </li>
                ))}
              </ul>
              {report.lech_dap_an.length > 10 && (
                <div>…và {report.lech_dap_an.length - 10} câu nữa.</div>
              )}
            </div>
          )}

          {report.khong_hop_le.length > 0 && (
            <details className="pt-1 border-t border-line/50">
              <summary className={`${SECTION_LABEL} cursor-pointer hover:text-accent transition-colors`}>
                Xem {report.khong_hop_le.length} câu không hợp lệ
              </summary>
              <ul className="list-disc pl-4 pt-1 text-ink-muted space-y-0.5 text-[11px]">
                {report.khong_hop_le.slice(0, 20).map((c, i) => (
                  <li key={i}>{c.ly_do} — {c.cau}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
