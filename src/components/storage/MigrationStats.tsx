import { formatBytes } from '../../types/huggingface';
import { formatDuration } from '../../lib/transferStats';
import type { FileStatus, MigrationCounts, MigrationPhase, MigrationSummary } from '../../hooks/useRepoMigration';

interface MigrationStatsProps {
  summary: MigrationSummary;
  counts: MigrationCounts;
  phase: MigrationPhase;
  transferredBytes: number;
  speed: { down: number; up: number };
  elapsedMs: number;
  etaMs: number | null;
  active: FileStatus[];
}

const percentOf = (done: number, total: number) => (total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 100);
const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const dirName = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="pl-3 py-0.5 border-l-2 border-slate-200 dark:border-slate-700">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{value}</div>
    </div>
  );
}

/** Tổng quan việc chuyển: số tệp, dung lượng, tốc độ tải xuống và tải lên, thời gian; kèm các tệp đang được truyền. */
export function MigrationStats({ summary, counts, phase, transferredBytes, speed, elapsedMs, etaMs, active }: MigrationStatsProps) {
  const started = elapsedMs > 0 || phase === 'running' || phase === 'switching';
  const running = phase === 'running' || phase === 'switching';
  const percent = percentOf(transferredBytes, summary.bytes);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-3">
        <Cell label="Tệp" value={`${counts.done + counts.skipped}/${counts.total}`} />
        <Cell label="Dung lượng" value={`${formatBytes(transferredBytes)} / ${formatBytes(summary.bytes)}`} />
        <Cell label="Tải xuống" value={running ? `${formatBytes(speed.down)}/s` : '—'} />
        <Cell label="Tải lên" value={running ? `${formatBytes(speed.up)}/s` : '—'} />
        <Cell label="Đã chạy" value={started ? formatDuration(elapsedMs) : '—'} />
        <Cell label="Còn lại" value={phase === 'running' ? formatDuration(etaMs) : '—'} />
      </div>

      <div className="space-y-1">
        <div role="progressbar" aria-label="Tiến độ chuyển" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2.5 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-slate-900 dark:bg-slate-100" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-4 text-xs text-slate-600 dark:text-slate-400">
          <span>{percent}%</span>
          {counts.done > 0 && <span>Xong {counts.done}</span>}
          {counts.skipped > 0 && <span>Đã có sẵn {counts.skipped}</span>}
          {counts.failed > 0 && <span className="text-rose-700 dark:text-rose-300">Lỗi {counts.failed}</span>}
        </div>
      </div>

      {active.length > 0 && (
        <section aria-label="Tệp đang chuyển" className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Đang chuyển ({active.length})</h3>
          <ul className="space-y-2">
            {active.map((f) => {
              const downloading = f.state === 'downloading';
              const doneBytes = downloading ? f.downloaded : f.uploaded;
              const pct = percentOf(doneBytes, f.size);
              return (
                <li key={f.rel} className="pl-3 py-0.5 border-l-2 border-slate-300 dark:border-slate-600 space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{baseName(f.rel)}</div>
                      {dirName(f.rel) && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{dirName(f.rel)}</div>}
                    </div>
                    <div className="shrink-0 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                      {downloading ? 'Đang tải xuống' : 'Đang tải lên'} {pct}% · {formatBytes(doneBytes)}/{formatBytes(f.size)}
                    </div>
                  </div>
                  <div className="h-1.5 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-slate-600 dark:bg-slate-300" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
