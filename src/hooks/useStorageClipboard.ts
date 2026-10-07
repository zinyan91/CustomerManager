import { useCallback, useState } from 'react';
import type { DispatchDocument } from '../types/dispatch';
import { fetchPasteItems, hfBlobFetcher } from '../lib/huggingface/hfCopy';
import {
  buildClip, planPaste, topKey, type ClipTop, type PastePlan, type StorageClip,
} from '../lib/storageClipboard';
import type { UploadItem } from '../lib/uploadItems';
import type { StorageProviderId } from '../types/storageRepo';

type DocLike = Pick<DispatchDocument, 'filePath' | 'fileSize' | 'updatedAt'>;

export interface PasteArgs {
  destRepoId: string;
  destFolder: string;
  destDocs: readonly Pick<DispatchDocument, 'filePath'>[];
  token: string;
  /** Tải các tệp đã lấy về lên repo đích; chính là hàm tải lên của màn Kho. */
  upload: (items: UploadItem[], targetFolder: string) => Promise<void>;
  /** Kho đích là Google Drive: tệp nguồn Drive được Google sao chép tại chỗ, không tải về trình duyệt. Trả thông điệp lỗi hoặc null. */
  serverCopy?: (plan: PastePlan, destFolder: string) => Promise<string | null>;
}

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Chọn mục, sao chép và dán trong Kho lưu trữ. Mục đã sao chép giữ lại khi đổi sang kho khác để dán chéo kho. */
export function useStorageClipboard() {
  const [selected, setSelected] = useState<Map<string, ClipTop>>(new Map());
  const [clip, setClip] = useState<StorageClip | null>(null);
  const [fetching, setFetching] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((top: ClipTop) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const key = topKey(top);
      if (next.has(key)) next.delete(key);
      else next.set(key, top);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Map()), []);
  const dismissError = useCallback(() => setError(null), []);
  const clearClip = useCallback(() => setClip(null), []);

  /** Sao chép các mục vào bộ nhớ tạm của Kho. Trả true khi thành công. */
  const copy = useCallback((repoId: string, docs: readonly DocLike[], tops: readonly ClipTop[], provider: StorageProviderId = 'huggingface'): boolean => {
    setError(null);
    try {
      setClip(buildClip(repoId, docs, tops, provider));
      return true;
    } catch (err) {
      setError(message(err, 'Không sao chép được.'));
      return false;
    }
  }, []);

  /** Dán mục đã sao chép vào thư mục đích: tải tệp nguồn về rồi tải lên. Trả số tệp đã gửi đi tải lên, 0 khi lỗi. */
  const paste = useCallback(async (args: PasteArgs): Promise<number> => {
    if (!clip) return 0;
    setError(null);
    try {
      if (args.serverCopy && clip.provider === 'drive') {
        const plan = planPaste(clip, args.destRepoId, args.destFolder, args.destDocs, { serverSide: true });
        const failure = await args.serverCopy(plan, args.destFolder);
        if (failure) {
          setError(failure);
          return 0;
        }
        return plan.files.length;
      }
      const plan = planPaste(clip, args.destRepoId, args.destFolder, args.destDocs);
      setFetching({ done: 0, total: plan.files.length });
      // Nạp trễ: lớp Drive kéo theo máy khách Supabase
      const fetchBlob =
        clip.provider === 'drive'
          ? await import('../lib/drive/driveToken').then(async ({ driveContext }) => (await import('../lib/drive/driveDocuments')).driveBlobFetcher(driveContext))
          : hfBlobFetcher(clip.repoId, args.token);
      const items = await fetchPasteItems(plan, fetchBlob, (done, total) => setFetching({ done, total }));
      setFetching(null);
      await args.upload(items, args.destFolder);
      return items.length;
    } catch (err) {
      setFetching(null);
      setError(message(err, 'Không dán được.'));
      return 0;
    }
  }, [clip]);

  return { selected, clip, fetching, error, toggle, clearSelection, copy, paste, dismissError, clearClip };
}
