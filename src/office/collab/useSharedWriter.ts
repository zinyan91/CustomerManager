import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConflictError,
  getSharedWriter,
  listOps,
  restoreVersion,
  saveSharedWriter,
  saveVersion,
  subscribeOps,
  type SharedOp,
  type SharedWriter,
} from './collabApi';

export type WriterSyncStatus = 'idle' | 'saved' | 'saving' | 'conflict' | 'failed';

export interface UseSharedWriterOptions {
  /** Mã văn bản chung; null là nháp riêng (hook không làm gì). */
  id: string | null;
  /** Số thứ tự của bản đã nạp. */
  initialSeq: number;
  /** Mã người dùng đang mở, để nhận ra thao tác do chính mình lưu. */
  userId: string;
  canWrite: boolean;
  /** Tên và nội dung đang soạn, đọc vào lúc lưu. */
  snapshot: () => { title: string; content: object };
  /** Thay nội dung đang soạn bằng bản mới nhất trên hệ thống. */
  onLoaded: (doc: SharedWriter) => void;
  /** Người khác chỉ đổi tên. */
  onTitle: (title: string) => void;
  /** Chờ bao lâu sau lần sửa cuối thì lưu. */
  delayMs?: number;
}

const DEFAULT_DELAY_MS = 1500;
const messageOf = (caught: unknown) => (caught instanceof Error ? caught.message : String(caught));

/**
 * Văn bản chung, sửa lần lượt: lưu cả khối kèm số thứ tự đang giữ. Máy chủ từ chối khi người khác đã lưu trước (xung đột),
 * lúc đó dừng tự lưu và giữ nguyên phần đang soạn cho tới khi người dùng chọn tải bản mới. Không tự ghi đè, không tự hợp nhất.
 */
export function useSharedWriter(options: UseSharedWriterOptions) {
  const { id, initialSeq } = options;
  const latest = useRef(options);
  latest.current = options;

  const [status, setStatus] = useState<WriterSyncStatus>(id ? 'saved' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [seq, setSeq] = useState(initialSeq);

  const baseSeq = useRef(initialSeq);
  const dirty = useRef(false);
  const conflict = useRef(false);
  const inflight = useRef<Promise<void> | null>(null);
  const reloading = useRef<Promise<void> | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const adopt = (next: number) => {
    baseSeq.current = next;
    setSeq(next);
  };

  const reload = useCallback(async (): Promise<void> => {
    if (!id) return;
    if (reloading.current) return reloading.current;
    const run = (async () => {
      try {
        const doc = await getSharedWriter(id);
        dirty.current = false;
        conflict.current = false;
        window.clearTimeout(timer.current);
        adopt(doc.lastSeq);
        latest.current.onLoaded(doc);
        setError(null);
        setStatus('saved');
      } catch (caught) {
        setError(messageOf(caught));
        setStatus('failed');
      } finally {
        reloading.current = null;
      }
    })();
    reloading.current = run;
    return run;
  }, [id]);

  const save = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    if (!id || !latest.current.canWrite || conflict.current) return;
    if (inflight.current) return inflight.current;
    if (!dirty.current) return;
    const run = (async () => {
      dirty.current = false;
      setStatus('saving');
      const { title, content } = latest.current.snapshot();
      let again = false;
      try {
        adopt(await saveSharedWriter(id, baseSeq.current, title, content));
        setError(null);
        again = dirty.current;
        setStatus(again ? 'saving' : 'saved');
      } catch (caught) {
        dirty.current = true;
        if (caught instanceof ConflictError) {
          conflict.current = true;
          setStatus('conflict');
        } else {
          setError(messageOf(caught));
          setStatus('failed');
        }
      } finally {
        inflight.current = null;
      }
      if (again) timer.current = window.setTimeout(() => void save(), latest.current.delayMs ?? DEFAULT_DELAY_MS);
    })();
    inflight.current = run;
    return run;
  }, [id]);

  /** Người dùng vừa sửa tên hoặc nội dung. */
  const edited = useCallback(() => {
    if (!id || !latest.current.canWrite) return;
    dirty.current = true;
    window.clearTimeout(timer.current);
    if (conflict.current) return;
    timer.current = window.setTimeout(() => void save(), latest.current.delayMs ?? DEFAULT_DELAY_MS);
  }, [id, save]);

  const onRemote = useCallback(
    (op: SharedOp) => {
      if (op.seq <= baseSeq.current) return;
      if (inflight.current && op.userId === latest.current.userId) return;
      if (op.seq === baseSeq.current + 1 && op.summary.kind === 'rename' && typeof op.summary.title === 'string') {
        adopt(op.seq);
        latest.current.onTitle(op.summary.title);
        return;
      }
      if (!dirty.current && !inflight.current && !conflict.current) void reload();
      else {
        conflict.current = true;
        setStatus('conflict');
      }
    },
    [reload],
  );

  useEffect(() => {
    if (!id) return;
    let disposed = false;
    const catchUp = async () => {
      try {
        const missed = await listOps(id, baseSeq.current);
        if (!disposed && missed.length > 0) onRemote(missed[missed.length - 1]);
      } catch (caught) {
        if (!disposed) setError(messageOf(caught));
      }
    };
    const unsubscribe = subscribeOps(id, onRemote, (state) => {
      if (state === 'SUBSCRIBED') void catchUp();
    });
    const onHide = () => {
      if (document.visibilityState === 'hidden') void save();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      disposed = true;
      unsubscribe();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      void save();
    };
  }, [id, onRemote, save]);

  /** Lưu mọi thứ đang chờ; ném lỗi nếu còn xung đột hoặc lưu hỏng, để không ghi mốc trên bản chưa lưu. */
  const settle = useCallback(async () => {
    await save();
    if (conflict.current) throw new Error('Người khác đã lưu bản mới hơn. Hãy tải bản mới nhất trước.');
    if (dirty.current) throw new Error('Chưa lưu được thay đổi hiện tại lên hệ thống.');
  }, [save]);

  const saveMilestone = useCallback(
    async (label: string): Promise<void> => {
      if (!id) return;
      await settle();
      await saveVersion(id, baseSeq.current, label, latest.current.snapshot().content);
    },
    [id, settle],
  );

  /** Khôi phục một mốc: lưu bản hiện tại thành mốc an toàn trước, rồi tải bản vừa khôi phục. */
  const restore = useCallback(
    async (versionId: number, safetyLabel: string): Promise<void> => {
      if (!id) return;
      await settle();
      await saveVersion(id, baseSeq.current, safetyLabel, latest.current.snapshot().content);
      await restoreVersion(id, versionId);
      await reload();
    },
    [id, settle, reload],
  );

  return { status, error, seq, edited, flush: save, reload, saveMilestone, restore };
}
