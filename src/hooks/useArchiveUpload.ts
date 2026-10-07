import { useCallback, useState } from 'react';
import type { HfConfig } from '../types/huggingface';
import type { UploadItem } from '../lib/uploadItems';
import { topLevelNames } from '../lib/uploadItems';
import { isHfConfigComplete } from '../lib/huggingface/hfConfigApi';
import { uploadItemsToHf, type UploadFailure, type UploadProgress } from '../lib/huggingface/hfWrite';

export interface UploadSummary {
  uploaded: number;
  failed: UploadFailure[];
  names: string[];
}

/** Trạng thái một lần upload nhiều tệp/folder: tiến độ, kết quả, lỗi từng tệp. */
export function useArchiveUpload(config: HfConfig | null, onDone: () => void | Promise<void>) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (items: UploadItem[], targetFolder: string) => {
      if (items.length === 0) return;
      if (!isHfConfigComplete(config)) {
        setError('Chưa có kho lưu trữ để tải lên.');
        return;
      }
      setRunning(true);
      setError(null);
      setSummary(null);
      let uploadedCount = 0;
      try {
        const res = await uploadItemsToHf({ repoId: config.repoId, token: config.token }, targetFolder, items, setProgress);
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
    [config, onDone]
  );

  const dismiss = useCallback(() => {
    setSummary(null);
    setError(null);
  }, []);

  return { running, progress, summary, error, upload, dismiss };
}
