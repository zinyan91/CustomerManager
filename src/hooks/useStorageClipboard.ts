import { useCallback, useState } from 'react';
import type { DispatchDocument } from '../types/dispatch';
import {
  buildClip, planPaste, topKey, type ClipTop, type PastePlan, type StorageClip,
} from '../lib/storageClipboard';

type DocLike = Pick<DispatchDocument, 'filePath' | 'fileSize' | 'updatedAt'>;

export interface PasteArgs {
  destRepoId: string;
  destFolder: string;
  destDocs: readonly Pick<DispatchDocument, 'filePath'>[];
  /** Google sao chép tại chỗ giữa các kho, tệp không đi qua trình duyệt. Trả thông điệp lỗi hoặc null. */
  serverCopy: (plan: PastePlan, destFolder: string) => Promise<string | null>;
}

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Chọn mục, sao chép và dán trong Kho lưu trữ. Mục đã sao chép giữ lại khi đổi sang kho khác để dán chéo kho. */
export function useStorageClipboard() {
  const [selected, setSelected] = useState<Map<string, ClipTop>>(new Map());
  const [clip, setClip] = useState<StorageClip | null>(null);
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
  const copy = useCallback((repoId: string, docs: readonly DocLike[], tops: readonly ClipTop[]): boolean => {
    setError(null);
    try {
      setClip(buildClip(repoId, docs, tops));
      return true;
    } catch (err) {
      setError(message(err, 'Không sao chép được.'));
      return false;
    }
  }, []);

  /** Dán mục đã sao chép vào thư mục đích. Trả số tệp đã dán, 0 khi lỗi. */
  const paste = useCallback(async (args: PasteArgs): Promise<number> => {
    if (!clip) return 0;
    setError(null);
    try {
      const plan = planPaste(clip, args.destRepoId, args.destFolder, args.destDocs);
      const failure = await args.serverCopy(plan, args.destFolder);
      if (failure) {
        setError(failure);
        return 0;
      }
      return plan.files.length;
    } catch (err) {
      setError(message(err, 'Không dán được.'));
      return 0;
    }
  }, [clip]);

  return { selected, clip, error, toggle, clearSelection, copy, paste, dismissError, clearClip };
}
