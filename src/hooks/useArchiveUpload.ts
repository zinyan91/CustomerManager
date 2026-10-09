import { useCallback, useState } from 'react';
import { topLevelNames, type UploadFailure, type UploadItem, type UploadProgress } from '../lib/uploadItems';
import { uploadItemsToDrive } from '../lib/drive/driveUpload';
import { applyDuplicateChoices, findDuplicates, type DuplicateChoice, type DuplicateMatch } from '../lib/drive/driveDuplicates';
import type { DriveContext, DriveEntry } from '../lib/drive/driveTypes';

export interface UploadSummary {
  uploaded: number;
  failed: UploadFailure[];
  names: string[];
  /** Đường dẫn các tệp bỏ qua vì trùng tên với tệp đã có (do người dùng chọn). */
  skipped?: string[];
}

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

/** Trạng thái một lần upload nhiều tệp/folder: tiến độ, kết quả, lỗi từng tệp. */
export function useArchiveUpload(drive: DriveUploadTarget | null, onDone: () => void | Promise<void>) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<{ items: UploadItem[]; targetFolder: string; matches: DuplicateMatch[] } | null>(null);

  const run = useCallback(
    async (items: UploadItem[], targetFolder: string, skipped: string[]) => {
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
      setSummary(null);
      let uploadedCount = 0;
      try {
        const res = await uploadItemsToDrive(drive.ctx, drive.rootId, targetFolder, items, drive.existingPaths, setProgress, drive.folderIds);
        uploadedCount = res.uploaded.length;
        setSummary({ uploaded: uploadedCount, failed: res.failed, names: topLevelNames(items), skipped });
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
    [drive, onDone]
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
      const { items, skipped } = applyDuplicateChoices(waiting.items, waiting.matches, choices);
      await run(items, waiting.targetFolder, skipped);
    },
    [waiting, run]
  );

  const cancelDuplicates = useCallback(() => setWaiting(null), []);

  const dismiss = useCallback(() => {
    setSummary(null);
    setError(null);
  }, []);

  const pending: PendingDuplicates | null = waiting ? { matches: waiting.matches, total: waiting.items.length } : null;

  return { running, progress, summary, error, upload, dismiss, pending, resolveDuplicates, cancelDuplicates };
}
