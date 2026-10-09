import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Loader2, X } from 'lucide-react';
import type { UploadProgress } from '../../lib/uploadItems';
import type { UploadFileRow, UploadSummary } from '../../hooks/useArchiveUpload';
import { formatBytes } from '../../lib/formatBytes';

interface UploadStatusPanelProps {
  running: boolean;
  progress: UploadProgress | null;
  summary: UploadSummary | null;
  error: string | null;
  /** Từng tệp của đợt đang tải hoặc vừa tải; không truyền thì không có danh sách chi tiết. */
  files?: UploadFileRow[];
  onDismiss: () => void;
}

const STATE_LABEL: Record<UploadFileRow['state'], string> = { wait: 'Đang chờ', run: 'Đang tải', done: 'Xong', failed: 'Lỗi' };
const STATE_STYLE: Record<UploadFileRow['state'], string> = {
  wait: 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300',
  run: 'border-slate-500 text-slate-800 dark:text-slate-100',
  done: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  failed: 'border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

function FileList({ files }: { files: UploadFileRow[] }) {
  const [open, setOpen] = useState(false);
  if (files.length <= 1) return null;
  const count = (state: UploadFileRow['state']) => files.filter((f) => f.state === state).length;
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Từng tệp ({files.length}: {count('done')} xong, {count('run') + count('wait')} chưa xong, {count('failed')} lỗi)
      </button>
      {open && (
        <ul aria-label="Từng tệp đang tải lên" className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
          {files.map((f) => (
            <li key={f.path} className="flex items-center gap-2 px-2.5 py-1.5">
              <span className="flex-1 min-w-0 break-all">
                {f.path}
                {f.error && <span className="block text-rose-700 dark:text-rose-300">{f.error}</span>}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{formatBytes(f.size)}</span>
              <span className={`shrink-0 px-2 py-0.5 rounded-full border ${STATE_STYLE[f.state]}`}>{STATE_LABEL[f.state]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const MAX_SHOWN_FAILURES = 5;

export function UploadStatusPanel({ running, progress, summary, error, files = [], onDismiss }: UploadStatusPanelProps) {
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
          <FileList files={files} />
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
          {!error && <FileList files={files} />}
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
