import { useCallback, useRef, useState } from 'react';
import type { WorkbookData } from '../calc/model/workbook';
import { ConflictError, saveSharedDocument } from './collabApi';

export type SharedSaveState = 'idle' | 'saving' | 'saved' | 'failed' | 'conflict';
export type SharedSaveResult = 'saved' | 'failed' | 'conflict';

export interface SharedPersistenceOptions {
  /** Mã bảng tính chung; null khi đang làm việc trên nháp riêng (hook không làm gì). */
  id: string | null;
  /** Số thứ tự của bản đã tải về. */
  initialSeq: number;
  getTitle: () => string;
  getData: () => WorkbookData;
}

/**
 * Lưu bảng tính chung theo số thứ tự: các lần lưu chạy lần lượt (lần sau dùng số mới do lần trước trả về, nên không tự xung đột
 * với chính mình) và luôn gửi bản mới nhất lúc chạy. Người khác đã lưu trước thì dừng hẳn, không ghi đè; nơi gọi cho người dùng chọn
 * tải lại hay giữ bản của mình.
 */
export function useSharedPersistence({ id, initialSeq, getTitle, getData }: SharedPersistenceOptions) {
  const seq = useRef(initialSeq);
  const conflicted = useRef(false);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const [state, setState] = useState<SharedSaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const latest = useRef({ getTitle, getData });
  latest.current = { getTitle, getData };

  const save = useCallback((): Promise<SharedSaveResult> => {
    if (!id) return Promise.resolve('saved');
    const run = async (): Promise<SharedSaveResult> => {
      if (conflicted.current) return 'conflict';
      setState('saving');
      try {
        seq.current = await saveSharedDocument(id, seq.current, latest.current.getTitle(), latest.current.getData());
        setError(null);
        setState('saved');
        return 'saved';
      } catch (caught) {
        const conflict = caught instanceof ConflictError;
        if (conflict) conflicted.current = true;
        setState(conflict ? 'conflict' : 'failed');
        setError(caught instanceof Error ? caught.message : String(caught));
        return conflict ? 'conflict' : 'failed';
      }
    };
    const next = chain.current.then(run, run);
    chain.current = next;
    return next;
  }, [id]);

  return { save, state, error };
}
