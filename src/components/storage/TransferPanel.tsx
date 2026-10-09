import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Loader2, X } from 'lucide-react';
import type { UploadFileRow, UploadSummary } from '../../hooks/useArchiveUpload';
import type { ZipProgress } from '../../lib/folderZip';
import { formatBytes } from '../../lib/formatBytes';
import type { UploadProgress } from '../../lib/uploadItems';
import { createSpeedMeter, type SpeedMeter } from '../../lib/speedMeter';
import { buildTransferRows, countByTab, filterRows, totalsOf, type TransferRow, type TransferStatus, type TransferTab } from '../../lib/transferRows';

interface TransferPanelProps {
  upload: {
    running: boolean;
    progress: UploadProgress | null;
    summary: UploadSummary | null;
    error: string | null;
    files: UploadFileRow[];
    onDismiss: () => void;
    /** Hủy một tệp đang chờ hoặc đang tải. */
    onCancelFile?: (path: string) => void;
    /** Tải lại một tệp lỗi hoặc đã hủy. */
    onRetryFile?: (path: string) => void;
    /** Các đường dẫn còn tải lại được (còn giữ tệp gốc). */
    retryable?: ReadonlySet<string>;
  };
  zip: {
    phase: 'choosing' | 'downloading' | 'saving' | 'cancelling' | null;
    fileName: string;
    progress: ZipProgress | null;
    error: string | null;
    message: string | null;
    onCancel: () => void;
    onDismiss: () => void;
  };
}

const TABS: Array<{ id: TransferTab; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'run', label: 'Đang chạy' },
  { id: 'done', label: 'Hoàn tất' },
  { id: 'bad', label: 'Bỏ qua / Lỗi' },
];

const STATUS_LABEL: Record<TransferStatus, string> = { wait: 'Đang chờ', run: 'Đang chạy', done: 'Hoàn tất', skipped: 'Đã bỏ qua', failed: 'Lỗi', cancelled: 'Đã hủy' };
const STATUS_STYLE: Record<TransferStatus, string> = {
  wait: 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300',
  run: 'border-slate-500 text-slate-800 dark:text-slate-100',
  done: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  skipped: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  failed: 'border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  cancelled: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
};

const actionBtn = 'px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer';

function Bar({ row }: { row: TransferRow }) {
  const colour = row.status === 'done' ? 'bg-emerald-600' : row.status === 'run' || row.status === 'wait' ? 'bg-slate-700 dark:bg-slate-300' : 'bg-slate-300 dark:bg-slate-600';
  return (
    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" role="progressbar" aria-label={`Tiến độ ${row.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.known ? row.pct : undefined}>
      {row.status === 'run' && !row.known ? (
        <div className={`h-full w-1/3 ${colour} animate-pulse`} />
      ) : (
        <div className={`h-full ${colour} transition-[width]`} style={{ width: `${row.status === 'skipped' || row.status === 'failed' || row.status === 'cancelled' ? 100 : row.pct}%` }} />
      )}
    </div>
  );
}

/**
 * Bảng truyền tệp của Kho lưu trữ: từng tệp đang tải lên (chờ, chạy, xong, lỗi, bỏ qua vì trùng) và lần tải thư mục về dạng ZIP,
 * chia tab theo trạng thái. Thông báo kết quả và lỗi chung của đợt nằm ngay dưới bảng. Không hiện gì khi chưa có việc nào.
 */
export function TransferPanel({ upload, zip }: TransferPanelProps) {
  const [tab, setTab] = useState<TransferTab>('all');
  // Tốc độ tải ZIP đo từ số byte đã nén; tệp tải lên đã có tốc độ từ hook
  const [zipSpeed, setZipSpeed] = useState(0);
  const zipMeter = useRef<SpeedMeter>(createSpeedMeter());
  const zipLoaded = zip.progress?.loadedBytes;
  useEffect(() => {
    if (zip.phase !== 'downloading' || zipLoaded === undefined) {
      zipMeter.current = createSpeedMeter();
      setZipSpeed(0);
      return;
    }
    setZipSpeed(zipMeter.current.sample(zipLoaded, Date.now()));
  }, [zip.phase, zipLoaded]);

  const rows = useMemo(
    () => buildTransferRows({ uploads: upload.files, skipped: upload.summary?.skipped, zip, zipSpeed }),
    [upload.files, upload.summary?.skipped, zip, zipSpeed]
  );

  const busy = upload.running || zip.phase !== null;
  const hasMessages = Boolean(upload.error || upload.summary || zip.error || zip.message || zip.phase === 'choosing' || zip.phase === 'saving');
  if (rows.length === 0 && !hasMessages && !upload.running) return null;

  const counts = countByTab(rows);
  const shown = filterRows(rows, tab);
  const totals = totalsOf(rows);
  const uploadDone = upload.progress ? upload.progress.uploadedFiles + upload.progress.failedFiles : 0;

  return (
    <section aria-label="Truyền tệp" className="shrink-0 border-t border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
      <div role="tablist" aria-label="Lọc theo trạng thái" className="flex flex-wrap items-center gap-1 px-4 pt-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 -mb-px border-b-2 cursor-pointer ${tab === t.id ? 'border-slate-800 dark:border-slate-200 font-semibold text-slate-900 dark:text-slate-100' : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            {t.label} ({counts[t.id]})
          </button>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          disabled={busy || rows.length === 0}
          onClick={() => {
            upload.onDismiss();
            zip.onDismiss();
          }}
          className="mb-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
        >
          Xóa danh sách đã xong
        </button>
      </div>

      {upload.running && (
        <div role="status" className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>
            Đang tải lên {uploadDone}/{upload.progress?.totalFiles ?? '…'} tệp
          </span>
        </div>
      )}

      {rows.length > 0 && (
        <ul aria-label="Danh sách truyền tệp" className="max-h-60 overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
          {shown.length === 0 && <li className="px-4 py-3 text-slate-500 dark:text-slate-400">Chưa có tệp nào trong mục này.</li>}
          {shown.map((r) => (
            <li key={r.id} className="grid grid-cols-[1.25rem_minmax(0,2.2fr)_minmax(0,1.3fr)_4.5rem_minmax(5rem,1.2fr)_5rem_5.5rem_7rem] items-center gap-3 px-4 py-2 min-w-[48rem]">
              <span title={r.dir === 'up' ? 'Tải lên' : 'Tải xuống'} className="text-slate-500">
                {r.dir === 'up' ? <ArrowUp className="w-4 h-4" aria-label="Tải lên" /> : <ArrowDown className="w-4 h-4" aria-label="Tải xuống" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900 dark:text-slate-100" title={r.name}>{r.name}</span>
                {r.note && <span className={`block truncate text-xs ${r.status === 'failed' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`} title={r.note}>{r.note}</span>}
              </span>
              <span className="truncate text-xs text-slate-500 dark:text-slate-400" title={r.dest}>{r.dest}</span>
              <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">{r.size > 0 ? formatBytes(r.size) : ''}</span>
              <Bar row={r} />
              <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">{r.speed > 0 ? `${formatBytes(r.speed)}/s` : ''}</span>
              <span className={`text-xs text-center px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
              <span className="flex justify-end gap-1">
                {r.id === 'down:zip' && zip.phase === 'downloading' && (
                  <button type="button" onClick={zip.onCancel} className={actionBtn}>
                    Hủy
                  </button>
                )}
                {r.dir === 'up' && (r.status === 'wait' || r.status === 'run') && upload.onCancelFile && (
                  <button type="button" onClick={() => upload.onCancelFile!(r.name)} aria-label={`Hủy ${r.name}`} className={actionBtn}>
                    Hủy
                  </button>
                )}
                {r.dir === 'up' && (r.status === 'failed' || r.status === 'cancelled') && upload.onRetryFile && upload.retryable?.has(r.name) && (
                  <button type="button" disabled={upload.running} onClick={() => upload.onRetryFile!(r.name)} aria-label={`Thử lại ${r.name}`} className={`${actionBtn} disabled:opacity-50`}>
                    Thử lại
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="px-4 py-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
        {zip.phase === 'choosing' && (
          <div role="status" className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Chọn nơi lưu {zip.fileName}...</span>
          </div>
        )}
        {zip.phase === 'saving' && (
          <div role="status" className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang lưu {zip.fileName}...</span>
          </div>
        )}
        {!upload.running && upload.error && (
          <div role="alert" className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{upload.error}</span>
            <button type="button" onClick={upload.onDismiss} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!upload.running && upload.summary && (
          <div role="status" className="flex items-start gap-2 text-slate-800 dark:text-slate-100">
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${upload.summary.failed.length === 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className="flex-1">
              {upload.summary.uploaded === 0 && (upload.summary.skipped?.length ?? 0) > 0 && upload.summary.failed.length === 0 ? (
                'Không có tệp nào được tải lên.'
              ) : (
                <>
                  Đã tải lên {upload.summary.uploaded} tệp
                  {upload.summary.names.length > 0 && upload.summary.names.length <= 3 ? `: ${upload.summary.names.join(', ')}` : ''}
                  {upload.summary.failed.length > 0 ? `, ${upload.summary.failed.length} tệp lỗi` : ''}
                  {(upload.summary.cancelled ?? 0) > 0 ? `, ${upload.summary.cancelled} tệp đã hủy` : ''}.
                </>
              )}
              {(upload.summary.skipped?.length ?? 0) > 0 ? ` Đã bỏ qua ${upload.summary.skipped!.length} tệp trùng tên.` : ''}
            </span>
            <button type="button" onClick={upload.onDismiss} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!zip.phase && zip.error && (
          <div role="alert" className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{zip.error}</span>
            <button type="button" onClick={zip.onDismiss} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!zip.phase && !zip.error && zip.message && (
          <div role="status" className="flex items-start gap-2 text-slate-800 dark:text-slate-100">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="flex-1">{zip.message}</span>
            <button type="button" onClick={zip.onDismiss} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 px-4 py-1.5 text-xs tabular-nums bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        <span>{totals.count === 0 ? 'Chưa có tệp nào' : `Tổng ${totals.count} tệp${totals.bytes > 0 ? `, ${formatBytes(totals.bytes)}` : ''}`}</span>
        <span>{totals.active > 0 ? `Đang truyền ${totals.active} tệp` : ''}</span>
      </div>
    </section>
  );
}
