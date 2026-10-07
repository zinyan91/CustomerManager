import { useCallback, useRef, useState } from 'react';
import type { StorageRepo } from '../types/storageRepo';
import { switchRepoToDrive, type SwitchResult } from '../lib/api/storageMigrationApi';
import { fetchHfFileBlob, hfFileUrl, listHfTree } from '../lib/huggingface/hfClient';
import {
  MigrationError, inspectDestination, migrateRepoFilesToDrive, planMigration, type MigrationPlan, type MigrationProgress,
} from '../lib/drive/driveMigration';

export type MigrationPhase = 'idle' | 'planning' | 'planned' | 'running' | 'done' | 'error';

export interface MigrationReport {
  files: number;
  bytes: number;
  folders: number;
  skipped: number;
  oversize: number;
  /** Thư mục đích đã có ở gốc Shared Drive (lần chạy trước bị đứt). */
  destExists: boolean;
  /** Số tệp đã có sẵn ở đích với đúng dung lượng, sẽ không chép lại. */
  alreadyThere: number;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Chuyển một repo Hugging Face sang Google Drive: chạy thử (chỉ đếm, không ghi), rồi chép từng tệp, đối chiếu, đổi repo trong CSDL.
 * Không xóa gì ở Hugging Face. Lỗi giữ nguyên thông điệp kèm chi tiết từng tệp.
 */
export function useRepoMigration(repo: StorageRepo, hfToken: string, onDone: () => void | Promise<void>) {
  const [phase, setPhase] = useState<MigrationPhase>('idle');
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<SwitchResult | null>(null);
  const [error, setError] = useState<{ message: string; details: string[] } | null>(null);
  const plan = useRef<MigrationPlan | null>(null);
  const abort = useRef<AbortController | null>(null);

  const fail = (err: unknown) => {
    setError({ message: message(err), details: err instanceof MigrationError ? err.details : [] });
    setPhase('error');
  };

  const dryRun = useCallback(async () => {
    setPhase('planning');
    setError(null);
    setReport(null);
    try {
      if (!hfToken) throw new Error('Chưa có token Hugging Face để đọc repo nguồn.');
      const { driveContext } = await import('../lib/drive/driveToken');
      const tree = await listHfTree(repo.repoId, repo.folder ?? '', hfToken, true);
      const p = planMigration(tree, repo.folder ?? '');
      const dest = await inspectDestination(driveContext, repo.name);
      plan.current = p;
      setReport({
        files: p.files.length,
        bytes: p.totalBytes,
        folders: p.folders.length,
        skipped: p.skipped.length,
        oversize: p.oversize.length,
        destExists: dest.folderId !== null,
        alreadyThere: p.files.filter((f) => dest.existing.get(f.rel)?.size === f.size).length,
      });
      setPhase('planned');
    } catch (err) {
      fail(err);
    }
  }, [repo, hfToken]);

  const start = useCallback(async () => {
    const p = plan.current;
    if (!p) return;
    const controller = new AbortController();
    abort.current = controller;
    setPhase('running');
    setError(null);
    setProgress(null);
    try {
      const { driveContext } = await import('../lib/drive/driveToken');
      const copied = await migrateRepoFilesToDrive({
        ctx: driveContext,
        repoName: repo.name,
        plan: p,
        fetchSource: (f) => fetchHfFileBlob(hfFileUrl(repo.repoId, f.from), hfToken),
        onProgress: setProgress,
        signal: controller.signal,
      });
      setResult(await switchRepoToDrive(repo.id, copied.destRootId, copied.files));
      setPhase('done');
      try {
        await onDone();
      } catch (err) {
        setError({ message: `Đã chuyển nhưng chưa nạp lại được danh sách: ${message(err)}`, details: [] });
      }
    } catch (err) {
      fail(err);
    } finally {
      abort.current = null;
    }
  }, [repo, hfToken, onDone]);

  const cancel = useCallback(() => abort.current?.abort(), []);

  return { phase, report, progress, result, error, dryRun, start, cancel };
}
