import { useCallback, useMemo, useState } from 'react';
import type { PastePlan } from '../lib/storageClipboard';
import { describeDriveError } from '../lib/drive/driveErrors';
import {
  copyFilesInto, createFolderAt, DriveOpError, folderIdMap, indexEntries, moveInto, renameAt, trashPaths,
} from '../lib/drive/driveOps';
import type { DriveContext, DriveEntry } from '../lib/drive/driveTypes';

export interface DriveOpsTarget {
  ctx: DriveContext;
  rootId: string;
  entries: readonly DriveEntry[];
}

export interface CopyProgress {
  done: number;
  total: number;
}

/**
 * Thao tác ghi lên một kho Google Drive: thư mục mới, đổi tên, di chuyển, xóa vào thùng rác, sao chép phía Google.
 * Mỗi hàm trả thông điệp lỗi tiếng Việt, hoặc null khi xong; nơi gọi quyết định hiện lỗi ở đâu. Xong thì nạp lại danh sách.
 */
export function useDriveOps(target: DriveOpsTarget | null, onDone: () => void | Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [copyProgress, setCopyProgress] = useState<CopyProgress | null>(null);
  const index = useMemo(() => indexEntries(target?.entries ?? []), [target?.entries]);

  const run = useCallback(
    async (what: string, job: (t: DriveOpsTarget) => Promise<string | null>): Promise<string | null> => {
      if (!target) return 'Chưa có kho Google Drive để thao tác.';
      setBusy(true);
      let failure: string | null;
      // Lỗi kiểm tra đầu vào xảy ra trước mọi lần ghi nên danh sách vẫn đúng; lỗi từ Google có thể đã làm được một phần
      let wrote = true;
      try {
        failure = await job(target);
      } catch (err) {
        wrote = !(err instanceof DriveOpError);
        failure = err instanceof DriveOpError ? err.message : describeDriveError(err, what);
      } finally {
        setBusy(false);
        setCopyProgress(null);
      }
      if (wrote) {
        try {
          await onDone();
        } catch (err) {
          return failure ?? `${what} đã chạy nhưng chưa nạp lại được danh sách: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
      return failure;
    },
    [target, onDone]
  );

  const createFolder = useCallback(
    (parentPath: string, name: string) =>
      run('Tạo thư mục', async (t) => {
        await createFolderAt(t.ctx, index, t.rootId, parentPath, name);
        return null;
      }),
    [run, index]
  );

  const rename = useCallback(
    (path: string, newName: string) =>
      run('Đổi tên', async (t) => {
        await renameAt(t.ctx, index, path, newName);
        return null;
      }),
    [run, index]
  );

  const move = useCallback(
    (paths: readonly string[], destPath: string) =>
      run('Di chuyển', async (t) => {
        await moveInto(t.ctx, index, t.rootId, paths, destPath);
        return null;
      }),
    [run, index]
  );

  const trash = useCallback(
    (paths: readonly string[]) =>
      run('Xóa', async (t) => {
        await trashPaths(t.ctx, index, paths);
        return null;
      }),
    [run, index]
  );

  const copyPlan = useCallback(
    (plan: PastePlan, destFolder: string) =>
      run('Sao chép', async (t) => {
        const res = await copyFilesInto(
          t.ctx, t.rootId, destFolder, plan.files, describeDriveError, (done, total) => setCopyProgress({ done, total }), folderIdMap(t.entries),
        );
        if (res.failed.length === 0) return null;
        const first = res.failed[0];
        return `Sao chép được ${res.copied.length}/${plan.files.length} tệp. Lỗi ở "${first.path}": ${first.error}`;
      }),
    [run]
  );

  return { busy, copyProgress, createFolder, rename, move, trash, copyPlan };
}
