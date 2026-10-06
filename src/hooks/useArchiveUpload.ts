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
      try {
        const res = await uploadItemsToHf({ repoId: config.repoId, token: config.token }, targetFolder, items, setProgress);
        setSummary({ uploaded: res.uploaded.length, failed: res.failed, names: topLevelNames(items) });
        if (res.uploaded.length > 0) await onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được lên.');
      } finally {
        setRunning(false);
        setProgress(null);
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
