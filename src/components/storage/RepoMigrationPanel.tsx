import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { StorageRepo } from '../../types/storageRepo';
import { useRepoMigration } from '../../hooks/useRepoMigration';
import { formatBytes } from '../../types/huggingface';
import { ConfigCard } from './ConfigCard';
import { MigrationFileTable } from './MigrationFileTable';
import { MigrationStats } from './MigrationStats';

interface RepoMigrationPanelProps {
  repo: StorageRepo;
  hfToken: string;
  onDone: () => void | Promise<void>;
  onClose: () => void;
}

const BTN = 'px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer';
const PRIMARY = 'px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 disabled:opacity-50 cursor-pointer';
const MAX_DETAILS = 10;

/**
 * Chuyển một repo Hugging Face sang Google Drive, hiện ngay trên trang cấu hình. Mở ra là tự đọc nguồn và hiện kế hoạch (chưa ghi gì);
 * bấm Chuyển ngay mới chép. Hiện từng tệp với trạng thái, các tệp đang truyền, tốc độ tải xuống và tải lên. Rời trang thì dừng
 * (các tệp đã chép được giữ lại, chạy lại chép tiếp).
 */
export function RepoMigrationPanel({ repo, hfToken, onDone, onClose }: RepoMigrationPanelProps) {
  const m = useRepoMigration(repo, hfToken, onDone);
  const running = m.phase === 'running' || m.phase === 'switching';
  const busy = m.phase === 'planning' || running;
  const showStats = m.summary !== null && m.phase !== 'planning' && m.phase !== 'error';
  const activeFiles = m.files.filter((f) => f.state === 'downloading' || f.state === 'uploading');
  const canStart = (m.phase === 'ready' || m.phase === 'stopped') && (m.summary?.oversize ?? 0) === 0;

  // Đóng tab hay tải lại giữa lúc đang chép thì trình duyệt hỏi lại
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [running]);

  return (
    <ConfigCard title={`Chuyển ${repo.name} sang Google Drive`}>
      <div className="space-y-4 text-sm text-slate-800 dark:text-slate-200">
        {m.phase === 'planning' && (
          <p className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang đọc repo nguồn...</p>
        )}

        {m.summary && m.phase !== 'error' && (
          <ul aria-label="Kế hoạch chuyển" className="space-y-1">
            <li>{m.summary.files} tệp, {formatBytes(m.summary.bytes)}, {m.summary.folders} thư mục</li>
            {m.summary.placeholders > 0 && <li>Bỏ qua {m.summary.placeholders} tệp giữ chỗ thư mục trống (.keep)</li>}
            {m.summary.destExists && <li>Thư mục đích đã có; các tệp đã đủ dung lượng sẽ không chép lại</li>}
            {m.summary.oversize > 0 && <li role="alert" className="text-rose-700 dark:text-rose-300">{m.summary.oversize} tệp quá lớn, công cụ không chuyển được</li>}
          </ul>
        )}

        {m.phase === 'done' && m.result && (
          <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
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

        {showStats && m.summary && (
          <>
            <MigrationStats
              summary={m.summary}
              counts={m.counts}
              phase={m.phase}
              transferredBytes={m.transferredBytes}
              speed={m.speed}
              elapsedMs={m.elapsedMs}
              etaMs={m.etaMs}
              active={activeFiles}
            />
            <MigrationFileTable files={m.files} counts={m.counts} />
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          {running ? (
            <button type="button" onClick={m.stop} disabled={m.phase === 'switching'} className={BTN}>Dừng chuyển</button>
          ) : (
            <button type="button" onClick={onClose} disabled={busy} className={BTN}>Đóng</button>
          )}
          {m.phase === 'failed' && <button type="button" onClick={() => void m.start()} className={PRIMARY}>Thử lại tệp lỗi</button>}
          {(m.phase === 'ready' || m.phase === 'stopped' || m.phase === 'planning') && (
            <button type="button" onClick={() => void m.start()} disabled={!canStart} className={PRIMARY}>Chuyển ngay</button>
          )}
        </div>
      </div>
    </ConfigCard>
  );
}
