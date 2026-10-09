import type { UploadFileEvent } from './drive/driveUpload';
import type { ZipProgress } from './folderZip';

export type TransferStatus = 'wait' | 'run' | 'done' | 'skipped' | 'failed' | 'cancelled';
export type TransferTab = 'all' | 'run' | 'done' | 'bad';

export interface TransferRow {
  id: string;
  dir: 'up' | 'down';
  name: string;
  dest: string;
  size: number;
  /** 0 đến 100; chỉ có ý nghĩa khi `known`. */
  pct: number;
  /** Có đo được tiến độ theo byte. Tải lên từng tệp chưa đo được: đang tải thì chỉ biết là đang chạy. */
  known: boolean;
  status: TransferStatus;
  /** Ghi chú một dòng: lỗi, lý do bỏ qua, tiến độ tệp. */
  note: string;
  /** Tốc độ hiện tại (byte/giây); 0 khi chưa biết hoặc không đang chạy. */
  speed: number;
}

/** Một tệp của đợt tải lên kèm tốc độ đo được. */
export type UploadRowInput = UploadFileEvent & { speed?: number };

export interface ZipState {
  phase: 'choosing' | 'downloading' | 'saving' | 'cancelling' | null;
  fileName: string;
  progress: ZipProgress | null;
  error: string | null;
  message: string | null;
}

const dirOf = (path: string) => path.split('/').slice(0, -1).join('/');

/** Các dòng của bảng truyền tệp: từng tệp của đợt tải lên, tệp bỏ qua vì trùng, và lần tải thư mục về (ZIP) nếu có. */
export function buildTransferRows(args: { uploads: readonly UploadRowInput[]; skipped?: readonly string[]; zip?: ZipState | null; zipSpeed?: number }): TransferRow[] {
  const rows: TransferRow[] = [];

  for (const f of args.uploads) {
    rows.push({
      id: `up:${f.path}`,
      dir: 'up',
      name: f.path,
      dest: dirOf(f.path) || 'Gốc kho',
      size: f.size,
      pct: f.state === 'done' ? 100 : f.state === 'run' && f.loaded !== undefined && f.size > 0 ? Math.min(100, Math.round((f.loaded / f.size) * 100)) : 0,
      known: f.state === 'done' || f.state === 'wait' || (f.state === 'run' && f.loaded !== undefined),
      status: f.state,
      note: f.state === 'cancelled' ? 'Đã hủy' : (f.error ?? ''),
      speed: f.state === 'run' ? (f.speed ?? 0) : 0,
    });
  }
  for (const path of args.skipped ?? []) {
    rows.push({ id: `skip:${path}`, dir: 'up', name: path, dest: dirOf(path) || 'Gốc kho', size: 0, pct: 100, known: true, status: 'skipped', note: 'Trùng với tệp đã có trong kho', speed: 0 });
  }

  const zip = args.zip;
  if (zip && (zip.phase || zip.error || zip.message) && zip.fileName) {
    const p = zip.progress;
    const pct = p && p.totalBytes > 0 ? Math.min(100, Math.round((p.loadedBytes / p.totalBytes) * 100)) : 0;
    const status: TransferStatus = zip.phase ? (zip.phase === 'choosing' ? 'wait' : 'run') : zip.error ? 'failed' : 'done';
    rows.push({
      id: 'down:zip',
      dir: 'down',
      name: zip.fileName,
      dest: 'Máy của tôi',
      size: p?.totalBytes ?? 0,
      pct: status === 'done' ? 100 : pct,
      known: status !== 'wait',
      status,
      note:
        zip.phase === 'choosing'
          ? 'Chọn nơi lưu...'
          : zip.phase === 'saving'
            ? 'Đang lưu...'
            : zip.phase === 'cancelling'
              ? 'Đang hủy...'
              : zip.phase && p
                ? `${p.completed}/${p.total} tệp${p.currentName ? ` · ${p.currentName}` : ''}`
                : zip.error ?? '',
      speed: status === 'run' ? (args.zipSpeed ?? 0) : 0,
    });
  }
  return rows;
}

export const tabOf = (row: TransferRow): Exclude<TransferTab, 'all'> =>
  row.status === 'wait' || row.status === 'run' ? 'run' : row.status === 'done' ? 'done' : 'bad';

export function filterRows(rows: readonly TransferRow[], tab: TransferTab): TransferRow[] {
  return tab === 'all' ? [...rows] : rows.filter((r) => tabOf(r) === tab);
}

export function countByTab(rows: readonly TransferRow[]): Record<TransferTab, number> {
  const counts: Record<TransferTab, number> = { all: rows.length, run: 0, done: 0, bad: 0 };
  for (const r of rows) counts[tabOf(r)] += 1;
  return counts;
}

/** Tổng số tệp và dung lượng đã biết của các dòng đang hiện, cùng số dòng đang truyền. */
export function totalsOf(rows: readonly TransferRow[]): { count: number; bytes: number; active: number } {
  return { count: rows.length, bytes: rows.reduce((n, r) => n + r.size, 0), active: rows.filter((r) => r.status === 'run').length };
}
