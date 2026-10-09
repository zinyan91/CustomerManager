import { useCallback, useRef, useState } from 'react';
import { topLevelNames, type UploadFailure, type UploadItem, type UploadProgress } from '../lib/uploadItems';
import { uploadItemsToDrive, type UploadFileEvent } from '../lib/drive/driveUpload';
import { applyDuplicateChoices, findDuplicates, type DuplicateChoice, type DuplicateMatch } from '../lib/drive/driveDuplicates';
import type { DriveContext, DriveEntry } from '../lib/drive/driveTypes';
import { createSpeedMeter, type SpeedMeter } from '../lib/speedMeter';

export interface UploadSummary {
  uploaded: number;
  failed: UploadFailure[];
  names: string[];
  /** Đường dẫn các tệp bỏ qua vì trùng tên với tệp đã có (do người dùng chọn). */
  skipped?: string[];
  /** Số tệp người dùng đã hủy. */
  cancelled?: number;
}

/** Một dòng trong danh sách từng tệp của đợt tải lên, kèm tốc độ đo được (byte/giây). */
export type UploadFileRow = Omit<UploadFileEvent, 'item'> & { speed?: number };

/** Đợt tải lên đang chờ người dùng quyết định cho các tệp trùng tên. */
export interface PendingDuplicates {
  matches: DuplicateMatch[];
  total: number;
}

/** Đích tải lên là kho Google Drive: thư mục gốc của kho và đường dẫn đang có để tránh trùng tên. */
export interface DriveUploadTarget {
  ctx: DriveContext;
  rootId: string;
  existingPaths: readonly string[];
  /** Mã các thư mục đang có (đường dẫn → mã). */
  folderIds?: ReadonlyMap<string, string>;
  /** Các mục đang có trong kho, để phát hiện tệp trùng tên trước khi tải. Không truyền thì không kiểm tra. */
  entries?: readonly DriveEntry[];
}

/** Những gì cần để tải lại một tệp: tệp gốc, thư mục đích, và mã tệp cũ nếu là ghi đè. */
interface Original {
  item: UploadItem;
  targetFolder: string;
  overwriteId?: string;
}

const lower = (s: string) => s.toLowerCase();

/** Tóm tắt của đợt từ các dòng hiện có (dùng sau khi thử lại, khi kết quả đổi). */
function summarize(rows: readonly UploadFileRow[], names: string[], skipped: string[] | undefined): UploadSummary {
  return {
    uploaded: rows.filter((r) => r.state === 'done').length,
    failed: rows.filter((r) => r.state === 'failed').map((r) => ({ path: r.path, error: r.error ?? '' })),
    names,
    skipped,
    cancelled: rows.filter((r) => r.state === 'cancelled').length,
  };
}

/** Trạng thái một lần upload nhiều tệp/folder: tiến độ, kết quả, lỗi từng tệp, hủy và thử lại từng tệp, ghi đè tệp trùng. */
export function useArchiveUpload(drive: DriveUploadTarget | null, onDone: () => void | Promise<void>) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadFileRow[]>([]);
  const [waiting, setWaiting] = useState<{ items: UploadItem[]; targetFolder: string; matches: DuplicateMatch[] } | null>(null);

  const filesRef = useRef<UploadFileRow[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const originals = useRef(new Map<string, Original>());
  const meters = useRef(new Map<string, SpeedMeter>());
  const lastBatch = useRef<{ names: string[]; skipped: string[] | undefined }>({ names: [], skipped: undefined });

  const updateFiles = useCallback((next: (rows: UploadFileRow[]) => UploadFileRow[]) => {
    filesRef.current = next(filesRef.current);
    setFiles(filesRef.current);
  }, []);

  const resetBatch = useCallback(() => {
    controllers.current.clear();
    originals.current.clear();
    meters.current.clear();
    updateFiles(() => []);
  }, [updateFiles]);

  /**
   * Chạy một đợt. `append` giữ các dòng của đợt trước (thử lại một tệp): chỉ thay dòng của tệp đó và tính lại tóm tắt.
   * `overwrites` là đường dẫn đích viết thường → mã tệp cũ cho các tệp ghi đè.
   */
  const run = useCallback(
    async (items: UploadItem[], targetFolder: string, skipped: string[], overwrites: ReadonlyMap<string, string> = new Map(), append = false) => {
      if (!drive) {
        setError('Chưa có kho lưu trữ để tải lên.');
        return;
      }
      if (items.length === 0) {
        setSummary({ uploaded: 0, failed: [], names: [], skipped });
        return;
      }
      setRunning(true);
      setError(null);
      if (!append) {
        setSummary(null);
        resetBatch();
        lastBatch.current = { names: topLevelNames(items), skipped };
      }
      // Tệp ghi đè phải giữ nguyên đường dẫn, không bị đổi tên tránh trùng
      const existing = overwrites.size > 0 ? drive.existingPaths.filter((p) => !overwrites.has(lower(p))) : drive.existingPaths;

      let uploadedCount = 0;
      try {
        const onFile = (event: UploadFileEvent) => {
          const { item, ...rest } = event;
          if (item) {
            originals.current.set(event.path, { item, targetFolder, overwriteId: overwrites.get(lower(event.path)) });
            // Tạo sẵn tín hiệu hủy ngay khi tệp vào hàng chờ để hủy được cả tệp chưa bắt đầu
            controllers.current.set(event.path, new AbortController());
          }
          let speed = 0;
          if (event.state === 'run' && event.loaded !== undefined) {
            const meter = meters.current.get(event.path) ?? createSpeedMeter();
            meters.current.set(event.path, meter);
            speed = meter.sample(event.loaded, Date.now());
          } else {
            meters.current.delete(event.path);
          }
          updateFiles((rows) => {
            const row = { ...rest, speed };
            return rows.some((r) => r.path === event.path) ? rows.map((r) => (r.path === event.path ? row : r)) : [...rows, row];
          });
        };
        const res = await uploadItemsToDrive(drive.ctx, drive.rootId, targetFolder, items, existing, setProgress, drive.folderIds, onFile, {
          overwrite: overwrites,
          signalFor: (path) => controllers.current.get(path)?.signal,
        });
        uploadedCount = res.uploaded.length;
        setSummary(
          append
            ? summarize(filesRef.current, lastBatch.current.names, lastBatch.current.skipped)
            : { uploaded: uploadedCount, failed: res.failed, names: topLevelNames(items), skipped, cancelled: res.cancelled.length }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được lên.');
      } finally {
        setRunning(false);
        setProgress(null);
      }
      // Nạp lại danh sách chạy sau khi đã mở khóa: liệt kê cả kho có thể chậm, không được giữ nút tải lên chờ nó
      if (uploadedCount > 0) {
        try {
          await onDone();
        } catch (err) {
          setError(`Đã tải lên nhưng chưa nạp lại được danh sách: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    },
    [drive, onDone, resetBatch, updateFiles]
  );

  /** Tải lên; có tệp trùng tên với tệp đã có thì dừng lại chờ `resolveDuplicates` hoặc `cancelDuplicates`. */
  const upload = useCallback(
    async (items: UploadItem[], targetFolder: string) => {
      if (items.length === 0) return;
      const matches = drive?.entries ? findDuplicates(items, targetFolder, drive.entries) : [];
      setError(null);
      if (matches.length > 0) {
        setSummary(null);
        setWaiting({ items, targetFolder, matches });
        return;
      }
      await run(items, targetFolder, []);
    },
    [drive, run]
  );

  const resolveDuplicates = useCallback(
    async (choices: ReadonlyMap<number, DuplicateChoice>) => {
      if (!waiting) return;
      setWaiting(null);
      const { items, skipped, overwrites } = applyDuplicateChoices(waiting.items, waiting.matches, choices);
      await run(items, waiting.targetFolder, skipped, overwrites);
    },
    [waiting, run]
  );

  const cancelDuplicates = useCallback(() => setWaiting(null), []);

  /** Hủy một tệp đang chờ hoặc đang tải. Tệp đang chờ đổi sang "đã hủy" ngay; tệp đang tải dừng ở lần gửi kế tiếp. */
  const cancelFile = useCallback(
    (path: string) => {
      controllers.current.get(path)?.abort();
      updateFiles((rows) => rows.map((r) => (r.path === path && r.state === 'wait' ? { ...r, state: 'cancelled' } : r)));
    },
    [updateFiles]
  );

  /** Tải lại một tệp lỗi hoặc đã hủy, giữ nguyên các dòng khác. Không làm gì khi đang chạy đợt khác. */
  const retryFile = useCallback(
    async (path: string) => {
      const original = originals.current.get(path);
      const row = filesRef.current.find((r) => r.path === path);
      if (running || !original || !row || (row.state !== 'failed' && row.state !== 'cancelled')) return;
      controllers.current.delete(path);
      updateFiles((rows) => rows.filter((r) => r.path !== path));
      const overwrites = original.overwriteId ? new Map([[lower(path), original.overwriteId]]) : new Map<string, string>();
      await run([original.item], original.targetFolder, [], overwrites, true);
    },
    [running, run, updateFiles]
  );

  const dismiss = useCallback(() => {
    setSummary(null);
    setError(null);
    resetBatch();
  }, [resetBatch]);

  const pending: PendingDuplicates | null = waiting ? { matches: waiting.matches, total: waiting.items.length } : null;
  // Tệp lỗi hoặc đã hủy còn giữ tệp gốc để tải lại (mất khi tải lại trang)
  const retryable = new Set(files.filter((f) => (f.state === 'failed' || f.state === 'cancelled') && originals.current.has(f.path)).map((f) => f.path));

  return { running, progress, summary, error, files, upload, dismiss, pending, resolveDuplicates, cancelDuplicates, cancelFile, retryFile, retryable };
}
