import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { StorageRepo } from '../types/storageRepo';
import { switchRepoToDrive, type SwitchResult } from '../lib/api/storageMigrationApi';
import { fetchHfFileBlob, hfFileUrl, listHfTree } from '../lib/huggingface/hfClient';
import {
  MigrationError, inspectDestination, migrateRepoFilesToDrive, planMigration,
  type FileEvent, type FileState, type MigrationPlan,
} from '../lib/drive/driveMigration';
import { createSpeedMeter, estimateRemainingMs } from '../lib/transferStats';

/**
 * planning: đang đọc nguồn. ready: sẵn sàng. running: đang chép. switching: đổi repo trong hệ thống.
 * stopped: dừng hoặc gặp sự cố, chạy lại được. failed: có tệp lỗi, thử lại được. done: xong. error: không đọc được nguồn.
 */
export type MigrationPhase = 'planning' | 'ready' | 'running' | 'switching' | 'stopped' | 'failed' | 'done' | 'error';

export interface FileStatus {
  rel: string;
  from: string;
  size: number;
  state: FileState;
  downloaded: number;
  uploaded: number;
  error?: string;
}

export interface MigrationSummary {
  files: number;
  bytes: number;
  folders: number;
  /** Tệp giữ chỗ thư mục trống (.keep) bỏ qua. */
  placeholders: number;
  oversize: number;
  /** Thư mục đích đã có ở gốc Shared Drive (lần chạy trước bị đứt). */
  destExists: boolean;
}

export interface MigrationCounts {
  total: number;
  done: number;
  skipped: number;
  failed: number;
  active: number;
  pending: number;
}

const TICK_MS = 300;
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Chuyển một repo Hugging Face sang Google Drive. Mở ra là tự đọc nguồn và lập kế hoạch (không ghi gì); chỉ khi gọi `start` mới chép
 * từng tệp, đối chiếu, rồi đổi repo trong CSDL. Không xóa gì ở Hugging Face. Trạng thái từng tệp và tốc độ được cập nhật theo nhịp
 * cố định chứ không theo từng sự kiện, để giao diện không bị vẽ lại hàng trăm lần mỗi giây.
 */
export function useRepoMigration(repo: StorageRepo, hfToken: string, onDone: () => void | Promise<void>) {
  const [phase, setPhase] = useState<MigrationPhase>('planning');
  const [summary, setSummary] = useState<MigrationSummary | null>(null);
  const [result, setResult] = useState<SwitchResult | null>(null);
  const [error, setError] = useState<{ message: string; details: string[] } | null>(null);
  const [, tick] = useReducer((n: number) => n + 1, 0);

  const plan = useRef<MigrationPlan | null>(null);
  const abort = useRef<AbortController | null>(null);
  const scanning = useRef(false);
  const statuses = useRef(new Map<string, FileStatus>());
  const order = useRef<string[]>([]);
  const downMeter = useRef(createSpeedMeter());
  const upMeter = useRef(createSpeedMeter());
  const startedAt = useRef<number | null>(null);
  const finishedAt = useRef<number | null>(null);

  const apply = useCallback((e: FileEvent) => {
    const st = statuses.current.get(e.rel);
    if (!st) return;
    const real = e.state !== 'skipped';
    if (e.downloaded !== undefined) {
      if (real) downMeter.current.add(e.downloaded - st.downloaded);
      st.downloaded = e.downloaded;
    }
    if (e.uploaded !== undefined) {
      if (real) upMeter.current.add(e.uploaded - st.uploaded);
      st.uploaded = e.uploaded;
    }
    // Tệp đã xong ở lượt trước thì lượt thử lại gặp nó có sẵn vẫn là "xong", không đổi thành "có sẵn"
    if (e.state && !(e.state === 'skipped' && st.state === 'done')) st.state = e.state;
    if (e.state === 'failed') st.error = e.error;
    else if (e.state) st.error = undefined;
  }, []);

  const scan = useCallback(async () => {
    if (scanning.current) return;
    scanning.current = true;
    setPhase('planning');
    setError(null);
    try {
      if (!hfToken) throw new Error('Chưa có token Hugging Face để đọc repo nguồn.');
      const { driveContext } = await import('../lib/drive/driveToken');
      const tree = await listHfTree(repo.repoId, repo.folder ?? '', hfToken, true);
      const p = planMigration(tree, repo.folder ?? '');
      const dest = await inspectDestination(driveContext, repo.name);

      plan.current = p;
      statuses.current = new Map(
        p.files.map((f) => {
          const there = dest.existing.get(f.rel)?.size === f.size;
          const status: FileStatus = { rel: f.rel, from: f.from, size: f.size, state: there ? 'skipped' : 'pending', downloaded: there ? f.size : 0, uploaded: there ? f.size : 0 };
          return [f.rel, status];
        }),
      );
      order.current = p.files.map((f) => f.rel);
      setSummary({ files: p.files.length, bytes: p.totalBytes, folders: p.folders.length, placeholders: p.skipped.length, oversize: p.oversize.length, destExists: dest.folderId !== null });
      setPhase('ready');
    } catch (err) {
      setError({ message: message(err), details: [] });
      setPhase('error');
    } finally {
      scanning.current = false;
    }
  }, [repo, hfToken]);

  useEffect(() => {
    void scan();
  }, [scan]);

  const active = phase === 'running' || phase === 'switching';
  useEffect(() => {
    if (!active) return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [active]);

  const start = useCallback(async () => {
    const p = plan.current;
    if (!p) return;
    const controller = new AbortController();
    abort.current = controller;
    // Tệp lỗi ở lượt trước được chép lại từ đầu
    for (const st of statuses.current.values()) {
      if (st.state === 'failed') Object.assign(st, { state: 'pending', downloaded: 0, uploaded: 0, error: undefined });
    }
    startedAt.current = Date.now();
    finishedAt.current = null;
    setError(null);
    setPhase('running');
    try {
      const copied = await migrateRepoFilesToDrive({
        ctx: (await import('../lib/drive/driveToken')).driveContext,
        repoName: repo.name,
        plan: p,
        fetchSource: (f, c) => fetchHfFileBlob(hfFileUrl(repo.repoId, f.from), hfToken, { onBytes: c.onBytes, signal: c.signal }),
        onFile: apply,
        signal: controller.signal,
      });
      setPhase('switching');
      setResult(await switchRepoToDrive(repo.id, copied.destRootId, copied.files));
      finishedAt.current = Date.now();
      setPhase('done');
      try {
        await onDone();
      } catch (err) {
        setError({ message: `Đã chuyển nhưng chưa nạp lại được danh sách: ${message(err)}`, details: [] });
      }
    } catch (err) {
      finishedAt.current = Date.now();
      if (err instanceof MigrationError) {
        // Chi tiết từng tệp lỗi đã nằm trong bảng; chỉ giữ chi tiết cho lỗi không gắn với một tệp cụ thể
        setError({ message: err.message, details: err.kind === 'files' ? [] : err.details });
        setPhase(err.kind === 'files' ? 'failed' : err.kind === 'oversize' ? 'error' : 'stopped');
      } else {
        setError({ message: message(err), details: [] });
        setPhase('stopped');
      }
    } finally {
      abort.current = null;
    }
  }, [repo, hfToken, onDone, apply]);

  const stop = useCallback(() => abort.current?.abort(), []);

  // Rời trang thì dừng việc đang chép: tệp đã chép được giữ lại và chạy lại chép tiếp
  useEffect(() => () => abort.current?.abort(), []);

  // Tính lúc vẽ từ dữ liệu đang cập nhật tại chỗ
  const files = order.current.map((rel) => statuses.current.get(rel) as FileStatus);
  const counts: MigrationCounts = { total: files.length, done: 0, skipped: 0, failed: 0, active: 0, pending: 0 };
  let transferred = 0;
  let remaining = 0;
  for (const f of files) {
    if (f.state === 'done') counts.done++;
    else if (f.state === 'skipped') counts.skipped++;
    else if (f.state === 'failed') counts.failed++;
    else if (f.state === 'pending') counts.pending++;
    else counts.active++;
    const sent = f.state === 'done' || f.state === 'skipped' ? f.size : Math.min(f.uploaded, f.size);
    transferred += sent;
    if (f.state !== 'done' && f.state !== 'skipped' && f.state !== 'failed') remaining += f.size - sent;
  }
  const speed = { down: active ? downMeter.current.bytesPerSecond() : 0, up: active ? upMeter.current.bytesPerSecond() : 0 };
  const now = Date.now();
  const elapsedMs = startedAt.current === null ? 0 : (finishedAt.current ?? now) - startedAt.current;
  const etaMs = phase === 'running' ? estimateRemainingMs(remaining, speed.up) : null;

  return { phase, summary, files, counts, transferredBytes: transferred, speed, elapsedMs, etaMs, result, error, start, stop };
}
