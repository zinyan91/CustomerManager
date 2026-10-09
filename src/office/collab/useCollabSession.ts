import { useCallback, useEffect, useRef, useState } from 'react';
import type { CalcController } from '../calc/controller';
import type { WorkbookData } from '../calc/model/workbook';
import { appendOp, listOps, renameDocument, restoreVersion, saveSnapshot, saveVersion, subscribeOps, type SharedOp } from './collabApi';
import { summarizePatch } from './summary';
import { SyncEngine } from './sync';

export type CollabStatus = 'saved' | 'saving' | 'failed';

export interface CollabSessionOptions {
  /** Mã bảng tính chung; null khi đang làm việc trên nháp riêng (hook không làm gì). */
  id: string | null;
  controller: CalcController;
  /** Bản hiện hành lúc mở và số thứ tự của nó. */
  initialData: WorkbookData | null;
  initialSeq: number;
  /** Có quyền sửa: người xem vẫn nhận thay đổi của người khác nhưng không gửi gì. */
  canWrite: boolean;
  /** Có người khôi phục cả bảng tính (thao tác "reset"): màn phải tải lại từ đầu. */
  onReset: () => void;
  /** Người khác đổi tên bảng tính. */
  onTitle?: (title: string) => void;
}

const DEBOUNCE_MS = 300;
const SNAPSHOT_EVERY = 100;
const MAX_RETRIES = 3;
const BATCH = 1000;

const newClientId = (): string => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
const isReset = (op: SharedOp): boolean => op.patch.some((p) => (p as { t: string }).t === 'reset');

/**
 * Nối bộ điều khiển bảng tính với bảng tính chung: gửi thay đổi của người dùng (gộp trong 300 ms) và áp thay đổi của người khác
 * nhận qua Realtime, tải bù khi thiếu hoặc khi nối lại. Mọi quy tắc thứ tự và hợp nhất nằm ở `SyncEngine`; hook chỉ lo mạng và thời gian.
 */
export function useCollabSession({ id, controller, initialData, initialSeq, canWrite, onReset, onTitle }: CollabSessionOptions) {
  const [status, setStatus] = useState<CollabStatus>('saved');
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  /** Số thứ tự đã áp: đổi mỗi khi có thao tác mới (của mình hoặc người khác), để nhật ký biết mà nạp lại. */
  const [seq, setSeq] = useState(initialSeq);
  const flushRef = useRef<() => Promise<boolean>>(async () => true);
  const resetRef = useRef(onReset);
  resetRef.current = onReset;
  const titleRef = useRef(onTitle);
  titleRef.current = onTitle;
  const engineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    if (!id || !initialData) return;
    const engine = new SyncEngine(initialData, initialSeq, newClientId());
    engineRef.current = engine;
    let disposed = false;
    let debounce: number | undefined;
    let retry: number | undefined;
    let pumping: Promise<void> | null = null;
    let failures = 0;
    let lastSnapshot = initialSeq;
    let lastVersion = controller.wb.version;
    const problem = (caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught));
    const refresh = () => {
      controller.applyRemote(engine.local);
      lastVersion = controller.wb.version;
    };
    const noteSeq = () => setSeq(engine.seq);

    /**
     * Ghi nhận thay đổi của người dùng chưa vào engine và gửi đi. Phải gọi trước mọi lần áp thay đổi từ xa, nếu không bị ghi đè;
     * nó hủy bộ đếm gộp nên tự gửi luôn, nếu không phần vừa thu thập sẽ nằm chờ.
     */
    const capture = (): boolean => {
      window.clearTimeout(debounce);
      const queued = canWrite && engine.edited(controller.wb.toData());
      if (queued) {
        failures = 0;
        void pump();
      }
      return queued;
    };

    const takeSnapshot = () => {
      if (!canWrite || engine.seq - lastSnapshot < SNAPSHOT_EVERY) return;
      lastSnapshot = engine.seq;
      // Chỉ để lần mở sau phát lại ít thao tác hơn; ghi hỏng thì chỉ chậm hơn chứ không sai, nên không báo lỗi cho người dùng.
      void saveSnapshot(id, engine.seq, engine.serverData).catch(() => {});
    };

    const receive = (op: SharedOp): boolean => {
      if (op.seq > engine.seq && isReset(op) && op.clientId !== engine.clientId) {
        resetRef.current();
        return false;
      }
      const renamed = (op.summary as { kind?: unknown; title?: unknown }).kind === 'rename' ? (op.summary as { title?: unknown }).title : undefined;
      if (op.seq > engine.seq && typeof renamed === 'string') titleRef.current?.(renamed);
      return engine.receive(op);
    };

    const catchUp = async () => {
      try {
        for (;;) {
          const before = engine.seq;
          const ops = await listOps(id, before);
          if (disposed) return;
          capture();
          let changed = false;
          for (const op of ops) changed = receive(op) || changed;
          if (changed) refresh();
          noteSeq();
          if (ops.length < BATCH || engine.seq === before) break;
        }
      } catch (caught) {
        problem(caught);
      }
    };

    const pump = (): Promise<void> => {
      if (pumping) return pumping;
      pumping = (async () => {
        try {
          for (let patch = engine.takeOutgoing(); patch && !disposed; patch = engine.takeOutgoing()) {
            setStatus('saving');
            try {
              const assigned = await appendOp(id, engine.clientId, patch, summarizePatch(patch));
              failures = 0;
              if (engine.acknowledged(assigned)) refresh();
              noteSeq();
              takeSnapshot();
              if (engine.missingFrom !== null) void catchUp();
            } catch (caught) {
              engine.sendFailed();
              failures += 1;
              setStatus('failed');
              problem(caught);
              if (failures <= MAX_RETRIES) retry = window.setTimeout(() => void pump(), 2000 * failures);
              return;
            }
          }
          if (!disposed && engine.pendingCount === 0) {
            setStatus('saved');
            setError(null);
          }
        } finally {
          pumping = null;
        }
      })();
      return pumping;
    };

    const unsubscribeController = controller.subscribe(() => {
      if (controller.wb.version === lastVersion) return;
      lastVersion = controller.wb.version;
      if (!canWrite) return;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        capture();
      }, DEBOUNCE_MS);
    });

    const stopRealtime = subscribeOps(
      id,
      (op) => {
        capture();
        if (receive(op)) refresh();
        noteSeq();
        if (engine.missingFrom !== null) void catchUp();
      },
      (state) => {
        if (state === 'SUBSCRIBED') {
          setLive(true);
          void catchUp();
        } else if (state === 'CLOSED' || state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
          setLive(false);
        }
      },
    );

    flushRef.current = async () => {
      capture();
      await pump();
      return engine.pendingCount === 0;
    };

    return () => {
      capture();
      disposed = true;
      window.clearTimeout(debounce);
      window.clearTimeout(retry);
      unsubscribeController();
      stopRealtime();
      flushRef.current = async () => true;
      engineRef.current = null;
    };
    // Một phiên cho mỗi bảng tính được mở: màn dựng lại khi mở bảng tính khác.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, controller]);

  /** Gửi hết những gì đang chờ rồi trả true nếu máy chủ đã nhận đủ. */
  const flush = useCallback(() => flushRef.current(), []);

  /** Bản máy chủ hiện tại sau khi gửi hết thay đổi của mình: cơ sở cho mốc và khôi phục. */
  const settled = useCallback(async () => {
    const engine = engineRef.current;
    if (!id || !engine) throw new Error('Phiên cùng sửa chưa sẵn sàng.');
    if (!(await flushRef.current())) throw new Error('Còn thay đổi chưa gửi được lên hệ thống, hãy thử lại sau.');
    return { seq: engine.seq, data: engine.serverData };
  }, [id]);

  /** Lưu mốc của bản hiện tại. */
  const saveMilestone = useCallback(
    async (label: string) => {
      const { seq: at, data } = await settled();
      await saveVersion(id!, at, label, data);
    },
    [id, settled],
  );

  /** Khôi phục một mốc; trước đó tự lưu bản hiện tại thành mốc để quay lại được. Sau khi xong màn tải lại. */
  const restore = useCallback(
    async (versionId: number, safetyLabel: string) => {
      const { seq: at, data } = await settled();
      await saveVersion(id!, at, safetyLabel, data);
      await restoreVersion(id!, versionId);
      resetRef.current();
    },
    [id, settled],
  );

  /** Đổi tên bảng tính chung. */
  const rename = useCallback(async (title: string) => {
    await renameDocument(id!, title);
  }, [id]);

  return { status, error, live, seq, flush, saveMilestone, restore, rename };
}
