import { useCallback, useState } from 'react';
import { topLevelNames, type UploadFailure, type UploadItem, type UploadProgress } from '../lib/uploadItems';
import { uploadItemsToDrive } from '../lib/drive/driveUpload';
import type { DriveContext } from '../lib/drive/driveTypes';

export interface UploadSummary {
  uploaded: number;
  failed: UploadFailure[];
  names: string[];
}

/** Đích tải lên là kho Google Drive: thư mục gốc của kho và đường dẫn đang có để tránh trùng tên. */
export interface DriveUploadTarget {
  ctx: DriveContext;
  rootId: string;
  existingPaths: readonly string[];
  /** Mã các thư mục đang có (đường dẫn → mã). */
  folderIds?: ReadonlyMap<string, string>;
}

/** Trạng thái một lần upload nhiều tệp/folder: tiến độ, kết quả, lỗi từng tệp. */
export function useArchiveUpload(drive: DriveUploadTarget | null, onDone: () => void | Promise<void>) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (items: UploadItem[], targetFolder: string) => {
      if (items.length === 0) return;
      if (!drive) {
        setError('Chưa có kho lưu trữ để tải lên.');
        return;
      }
      setRunning(true);
      setError(null);
      setSummary(null);
      let uploadedCount = 0;
      try {
        const res = await uploadItemsToDrive(drive.ctx, drive.rootId, targetFolder, items, drive.existingPaths, setProgress, drive.folderIds);
        uploadedCount = res.uploaded.length;
        setSummary({ uploaded: uploadedCount, failed: res.failed, names: topLevelNames(items) });
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

  const dismiss = useCallback(() => {
    setSummary(null);
    setError(null);
  }, []);

  return { running, progress, summary, error, upload, dismiss };
}
