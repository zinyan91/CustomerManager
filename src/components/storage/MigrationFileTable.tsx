import { useMemo, useState } from 'react';
import { formatBytes } from '../../types/huggingface';
import type { FileState } from '../../lib/drive/driveMigration';
import type { FileStatus, MigrationCounts } from '../../hooks/useRepoMigration';

const STATE_LABELS: Record<FileState, string> = {
  pending: 'Chờ',
  downloading: 'Đang tải xuống',
  uploading: 'Đang tải lên',
  done: 'Xong',
  skipped: 'Đã có sẵn',
  failed: 'Lỗi',
};

type Filter = 'all' | 'active' | 'done' | 'failed';
const MAX_ROWS = 300;

const matches = (f: FileStatus, filter: Filter) =>
  filter === 'all' ||
  (filter === 'active' && (f.state === 'downloading' || f.state === 'uploading')) ||
  (filter === 'done' && (f.state === 'done' || f.state === 'skipped')) ||
  (filter === 'failed' && f.state === 'failed');

function progressOf(f: FileStatus): string {
  if (f.state === 'done' || f.state === 'skipped') return '100%';
  if (f.state === 'downloading') return `${Math.min(100, Math.round((f.downloaded / Math.max(f.size, 1)) * 100))}%`;
  if (f.state === 'uploading') return `${Math.min(100, Math.round((f.uploaded / Math.max(f.size, 1)) * 100))}%`;
  return '—';
}

interface MigrationFileTableProps {
  files: FileStatus[];
  counts: MigrationCounts;
  className?: string;
}

/** Danh sách mọi tệp của repo kèm trạng thái và tiến độ; lọc theo trạng thái. Cao hết khung chứa khi khung có chiều cao. */
export function MigrationFileTable({ files, counts, className = '' }: MigrationFileTableProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const tabs: Array<{ id: Filter; label: string; n: number }> = [
    { id: 'all', label: 'Tất cả', n: counts.total },
    { id: 'active', label: 'Đang chạy', n: counts.active },
    { id: 'done', label: 'Đã xong', n: counts.done + counts.skipped },
    { id: 'failed', label: 'Lỗi', n: counts.failed },
  ];
  const shown = useMemo(() => files.filter((f) => matches(f, filter)), [files, filter]);

  return (
    <section aria-label="Danh sách tệp" className={`flex flex-col gap-2 ${className}`}>
      <div role="tablist" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-1.5 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${
              filter === t.id
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.label} ({t.n})
          </button>
        ))}
      </div>

      <div className="max-h-[50vh] overflow-auto border-y border-slate-200 dark:border-slate-800">
        <table aria-label="Tệp của repo" className="w-full text-left text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <tr>
              <th className="py-2 px-3 font-semibold">Tệp</th>
              <th className="py-2 px-3 font-semibold text-right whitespace-nowrap">Dung lượng</th>
              <th className="py-2 px-3 font-semibold whitespace-nowrap">Trạng thái</th>
              <th className="py-2 px-3 font-semibold text-right whitespace-nowrap">Tiến độ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 px-3 text-center text-slate-500">Không có tệp nào.</td>
              </tr>
            )}
            {shown.slice(0, MAX_ROWS).map((f) => (
              <tr key={f.rel}>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100 break-all">{f.rel}</td>
                <td className="py-2 px-3 text-right whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-400">{formatBytes(f.size)}</td>
                <td className="py-2 px-3">
                  <span className={f.state === 'failed' ? 'text-rose-700 dark:text-rose-300 font-medium' : 'text-slate-700 dark:text-slate-300'}>{STATE_LABELS[f.state]}</span>
                  {f.state === 'failed' && f.error && <div className="text-xs text-rose-700 dark:text-rose-300 break-words">{f.error}</div>}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{progressOf(f)}</td>
              </tr>
            ))}
            {shown.length > MAX_ROWS && (
              <tr>
                <td colSpan={4} className="py-2 px-3 text-center text-slate-500">và {shown.length - MAX_ROWS} tệp khác</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
