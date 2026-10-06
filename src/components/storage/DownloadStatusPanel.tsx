import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import type { ZipPhase } from '../../hooks/useFolderZipDownload';
import type { ZipProgress } from '../../lib/huggingface/hfFolderZip';

interface DownloadStatusPanelProps {
  phase: ZipPhase;
  fileName: string;
  progress: ZipProgress | null;
  error: string | null;
  message: string | null;
  onCancel: () => void;
  onDismiss: () => void;
}

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

export function DownloadStatusPanel({ phase, fileName, progress, error, message, onCancel, onDismiss }: DownloadStatusPanelProps) {
  if (!phase && !error && !message) return null;

  const percent = progress && progress.totalBytes > 0 ? Math.min(100, Math.round((progress.loadedBytes / progress.totalBytes) * 100)) : 0;

  return (
    <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-sm">
      {phase === 'choosing' && (
        <div role="status" className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Chọn nơi lưu {fileName}...</span>
        </div>
      )}

      {(phase === 'downloading' || phase === 'cancelling') && (
        <div role="status" className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span className="flex-1 min-w-0 truncate">
              {phase === 'cancelling' ? 'Đang hủy...' : `Đang nén ${fileName}`}
              {progress && phase === 'downloading'
                ? `: ${progress.completed}/${progress.total} tệp (${mb(progress.loadedBytes)}/${mb(progress.totalBytes)} MB)`
                : ''}
            </span>
            {phase === 'downloading' && (
              <button
                type="button"
                onClick={onCancel}
                className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
            )}
          </div>
          {progress?.currentName && phase === 'downloading' && (
            <div className="text-xs text-slate-500 truncate pl-6">{progress.currentName}</div>
          )}
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-slate-800 dark:bg-slate-200 transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {phase === 'saving' && (
        <div role="status" className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang lưu {fileName}...</span>
        </div>
      )}

      {!phase && error && (
        <div role="alert" className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={onDismiss} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!phase && !error && message && (
        <div role="status" className="flex items-start gap-2 text-slate-800 dark:text-slate-100">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span className="flex-1">{message}</span>
          <button type="button" onClick={onDismiss} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
