import { useCallback, useEffect, useRef, useState } from 'react';
import { chooseSinkMode, type FolderZipPlan } from '../lib/dispatch/folderZipPlan';
import { downloadFolderZip, isAbortError, type ZipProgress } from '../lib/huggingface/hfFolderZip';
import { hasNativeSavePicker, openZipSink } from '../lib/zipSink';

export type ZipPhase = 'choosing' | 'downloading' | 'saving' | 'cancelling' | null;

interface ActiveRun {
  controller: AbortController;
  committing: boolean;
  cancelledByUser: boolean;
}

export const MSG_TOO_LARGE =
  'Trình duyệt này không hỗ trợ tải thư mục lớn (trên 500 MB). Hãy dùng Chrome hoặc Edge, hoặc tải từng thư mục con.';

/** Trạng thái một lần tải thư mục về dạng ZIP: chọn nơi lưu, tiến độ, hủy, kết quả. */
export function useFolderZipDownload() {
  const activeRef = useRef<ActiveRun | null>(null);
  const mountedRef = useRef(true);
  const [phase, setPhase] = useState<ZipPhase>(null);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState<ZipProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeRef.current?.controller.abort();
      activeRef.current = null;
    };
  }, []);

  /** Gọi ĐỒNG BỘ trong sự kiện click: hộp "Lưu thành" cần user activation. */
  const start = useCallback((plan: FolderZipPlan, target: { repoId: string; token: string }) => {
    if (activeRef.current) return;

    const mode = chooseSinkMode(hasNativeSavePicker(), plan.totalBytes);
    setError(null);
    setMessage(null);
    if (mode === 'too_large') {
      setError(MSG_TOO_LARGE);
      return;
    }

    const run: ActiveRun = { controller: new AbortController(), committing: false, cancelledByUser: false };
    activeRef.current = run;
    const current = () => mountedRef.current && activeRef.current === run;
    setPhase('choosing');
    setFileName(plan.fileName);
    setProgress(null);

    void (async () => {
      let started = false;
      try {
        const sink = await openZipSink(mode, plan.fileName);
        if (!current() || run.controller.signal.aborted) {
          await sink.abort().catch(() => undefined);
          return;
        }
        started = true;
        setPhase('downloading');

        let lastAt = 0;
        await downloadFolderZip({
          plan,
          repoId: target.repoId,
          token: target.token,
          writable: sink,
          signal: run.controller.signal,
          onCommitting: () => {
            run.committing = true;
            if (current()) setPhase('saving');
          },
          onProgress: (next) => {
            if (!current()) return;
            // Chunk mạng về nhanh hơn nhịp cập nhật giao diện hữu ích
            const now = performance.now();
            if (next.completed === next.total || next.loadedBytes === 0 || now - lastAt >= 100) {
              lastAt = now;
              setProgress(next);
            }
          },
        });
        if (current()) setMessage(`Đã tải xong ${plan.fileName}.`);
      } catch (reason) {
        if (!current()) return;
        if (isAbortError(reason) || run.controller.signal.aborted) {
          // Đóng hộp "Lưu thành" trước khi tải là hành vi bình thường, không báo gì
          if (started || run.cancelledByUser) setMessage('Đã hủy tải thư mục.');
        } else {
          setError(reason instanceof Error ? reason.message : 'Không tải được thư mục. Vui lòng thử lại.');
        }
      } finally {
        if (current()) {
          activeRef.current = null;
          setPhase(null);
          setProgress(null);
        }
      }
    })();
  }, []);

  const cancel = useCallback(() => {
    const run = activeRef.current;
    if (!run || run.committing || run.controller.signal.aborted) return;
    run.cancelledByUser = true;
    setPhase('cancelling');
    run.controller.abort();
  }, []);

  const dismiss = useCallback(() => {
    setError(null);
    setMessage(null);
  }, []);

  return { start, cancel, dismiss, isBusy: phase !== null, phase, fileName, progress, error, message };
}
