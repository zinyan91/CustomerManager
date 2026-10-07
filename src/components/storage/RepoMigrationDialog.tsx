import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { StorageRepo } from '../../types/storageRepo';
import { useRepoMigration } from '../../hooks/useRepoMigration';
import { formatBytes } from '../../types/huggingface';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';

interface RepoMigrationDialogProps {
  repo: StorageRepo;
  hfToken: string;
  onDone: () => void | Promise<void>;
  onClose: () => void;
}

const BTN = 'px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer';
const PRIMARY = 'px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 disabled:opacity-50 cursor-pointer';
const MAX_DETAILS = 10;

/** Chuyển một repo Hugging Face sang Google Drive: chạy thử, chép, đối chiếu, đổi repo. Chỉ Master Admin (trang cấu hình). */
export function RepoMigrationDialog({ repo, hfToken, onDone, onClose }: RepoMigrationDialogProps) {
  const m = useRepoMigration(repo, hfToken, onDone);
  const busy = m.phase === 'planning' || m.phase === 'running';
  const percent = m.progress && m.progress.total > 0 ? Math.round((m.progress.done / m.progress.total) * 100) : 0;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent size="lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Chuyển {repo.name} sang Google Drive</DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-3 text-sm text-slate-800 dark:text-slate-200 overflow-y-auto">
          {m.phase === 'idle' && <p>Bấm Chạy thử để đếm tệp và dung lượng. Chạy thử không ghi gì.</p>}

          {m.phase === 'planning' && (
            <p className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang đọc repo nguồn...</p>
          )}

          {m.report && (m.phase === 'planned' || m.phase === 'running') && (
            <ul className="space-y-1" aria-label="Kết quả chạy thử">
              <li>{m.report.files} tệp, {formatBytes(m.report.bytes)}, {m.report.folders} thư mục</li>
              {m.report.skipped > 0 && <li>Bỏ qua {m.report.skipped} tệp giữ chỗ thư mục trống (.keep)</li>}
              {m.report.destExists && <li>Thư mục đích đã có; {m.report.alreadyThere} tệp đã đủ dung lượng sẽ không chép lại</li>}
              {m.report.oversize > 0 && (
                <li role="alert" className="text-rose-700 dark:text-rose-300">{m.report.oversize} tệp quá lớn, công cụ không chuyển được</li>
              )}
            </ul>
          )}

          {m.phase === 'running' && (
            <div role="status" className="space-y-1.5">
              <div className="h-2 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-slate-900 dark:bg-slate-100" style={{ width: `${percent}%` }} />
              </div>
              <p>
                {m.progress ? `${m.progress.done}/${m.progress.total} tệp, ${formatBytes(m.progress.bytesDone)}/${formatBytes(m.progress.bytesTotal)}` : 'Đang bắt đầu...'}
              </p>
            </div>
          )}

          {m.phase === 'done' && m.result && (
            <div role="status" className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Đã chuyển sang Google Drive. {m.result.documents} văn bản được trỏ lại bằng mã tệp Drive
                {m.result.filesUnmapped > 0 ? `; ${m.result.filesUnmapped} tệp của văn bản không có trong repo cũ nên giữ nguyên` : ''}.
                Dữ liệu trên Hugging Face không bị xóa.
              </span>
            </div>
          )}

          {m.error && (
            <div role="alert" className="space-y-1 text-rose-700 dark:text-rose-300">
              <p className="flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{m.error.message}</span></p>
              {m.error.details.length > 0 && (
                <ul className="pl-6 list-disc break-all text-xs">
                  {m.error.details.slice(0, MAX_DETAILS).map((d) => <li key={d}>{d}</li>)}
                  {m.error.details.length > MAX_DETAILS && <li>và {m.error.details.length - MAX_DETAILS} mục khác</li>}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {m.phase === 'running' ? (
            <button type="button" onClick={m.cancel} className={BTN}>Dừng</button>
          ) : (
            <button type="button" onClick={onClose} disabled={busy} className={BTN}>{m.phase === 'done' ? 'Đóng' : 'Hủy'}</button>
          )}
          {m.phase !== 'done' && (
            <button type="button" onClick={() => void m.dryRun()} disabled={busy} className={BTN}>Chạy thử</button>
          )}
          {m.phase === 'planned' && (
            <button type="button" onClick={() => void m.start()} disabled={!m.report || m.report.oversize > 0} className={PRIMARY}>Bắt đầu chuyển</button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
