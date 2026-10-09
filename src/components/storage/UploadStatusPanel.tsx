import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import type { UploadProgress } from '../../lib/uploadItems';
import type { UploadSummary } from '../../hooks/useArchiveUpload';

interface UploadStatusPanelProps {
  running: boolean;
  progress: UploadProgress | null;
  summary: UploadSummary | null;
  error: string | null;
  onDismiss: () => void;
}

const MAX_SHOWN_FAILURES = 5;

export function UploadStatusPanel({ running, progress, summary, error, onDismiss }: UploadStatusPanelProps) {
  if (!running && !summary && !error) return null;

  const done = progress ? progress.uploadedFiles + progress.failedFiles : 0;
  const percent = progress && progress.totalFiles > 0 ? Math.round((done / progress.totalFiles) * 100) : 0;

  return (
    <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-sm">
      {running && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              Đang tải lên {done}/{progress?.totalFiles ?? '…'} tệp
              {progress && progress.batchCount > 1 ? ` (đợt ${Math.min(progress.batchIndex + 1, progress.batchCount)}/${progress.batchCount})` : ''}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-slate-800 dark:bg-slate-200 transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {!running && error && (
        <div role="alert" className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={onDismiss} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!running && summary && (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-slate-800 dark:text-slate-100">
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${summary.failed.length === 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className="flex-1">
              {summary.uploaded === 0 && (summary.skipped?.length ?? 0) > 0 && summary.failed.length === 0 ? (
                'Không có tệp nào được tải lên.'
              ) : (
                <>
                  Đã tải lên {summary.uploaded} tệp
                  {summary.names.length > 0 && summary.names.length <= 3 ? `: ${summary.names.join(', ')}` : ''}
                  {summary.failed.length > 0 ? `, ${summary.failed.length} tệp lỗi.` : '.'}
                </>
              )}
              {(summary.skipped?.length ?? 0) > 0 ? ` Đã bỏ qua ${summary.skipped!.length} tệp trùng tên.` : ''}
            </span>
            <button type="button" onClick={onDismiss} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          {summary.failed.length > 0 && (
            <ul role="alert" className="pl-6 space-y-0.5 text-rose-700 dark:text-rose-300">
              {summary.failed.slice(0, MAX_SHOWN_FAILURES).map((f) => (
                <li key={f.path} className="break-all">
                  {f.path}: {f.error}
                </li>
              ))}
              {summary.failed.length > MAX_SHOWN_FAILURES && <li>và {summary.failed.length - MAX_SHOWN_FAILURES} tệp lỗi khác.</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
