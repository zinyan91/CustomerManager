import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DispatchDocument } from '../types/dispatch';
import type { StorageRepo } from '../types/storageRepo';
import { useAuth } from '../context/AuthContext';
import { listStorageRepos } from '../lib/api/storageReposApi';
import { listDriveFiles } from '../lib/drive/driveClient';
import { entriesToDocuments } from '../lib/drive/driveDocuments';
import { describeDriveError } from '../lib/drive/driveErrors';
import { driveContext } from '../lib/drive/driveToken';
import { buildRepoEntries, listingOf } from '../lib/drive/driveTree';
import type { DriveEntry } from '../lib/drive/driveTypes';
import { classifyArchiveError, type ArchiveStatus } from '../lib/archiveStatus';
import { reposForScope, type StorageScope } from '../lib/storageRepos';

/**
 * Nạp Kho lưu trữ: các repo tài khoản được thấy (Kho chung, Văn thư cho admin, kho cá nhân),
 * chọn được repo, kèm cây tệp. Mọi lỗi được phân loại thành `status`, không để danh sách rỗng im lặng.
 * `scope` chọn nhóm kho của màn (Kho lưu trữ hoặc kho Văn thư/Biểu mẫu trong tab Văn thư).
 */
export function useArchive(scope: StorageScope = 'storage') {
  const { role, user } = useAuth();
  const userId = user?.id ?? null;

  const [allRepos, setAllRepos] = useState<StorageRepo[]>([]);
  const [metaStatus, setMetaStatus] = useState<ArchiveStatus>({ kind: 'loading' });
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);

  const [documents, setDocuments] = useState<DispatchDocument[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [driveEntries, setDriveEntries] = useState<DriveEntry[]>([]);
  const [driveWrite, setDriveWrite] = useState(false);
  const [fileStatus, setFileStatus] = useState<ArchiveStatus>({ kind: 'loading' });

  const reloadRepos = useCallback(async () => {
    setMetaStatus({ kind: 'loading' });
    try {
      setAllRepos(await listStorageRepos());
      setMetaStatus({ kind: 'ready' });
    } catch (err) {
      setMetaStatus(classifyArchiveError(err));
    }
  }, []);

  useEffect(() => {
    void reloadRepos();
  }, [reloadRepos]);

  const candidates = useMemo(() => reposForScope(allRepos, role, userId, scope), [allRepos, role, userId, scope]);

  const selectedRepo = useMemo(
    () => candidates.find((r) => r.id === selectedRepoId) ?? candidates[0] ?? null,
    [candidates, selectedRepoId]
  );

  // RepoId là ID thư mục gốc của kho trong Shared Drive
  const driveRoot = selectedRepo?.repoId ?? null;

  const reload = useCallback(async () => {
    if (!driveRoot) {
      setDriveEntries([]);
      setDriveWrite(false);
      setDocuments([]);
      setFolders([]);
      return;
    }
    setFileStatus({ kind: 'loading' });
    try {
      const files = await listDriveFiles(driveContext);
      if (!files.some((f) => f.id === driveRoot)) {
        throw new Error('Không tìm thấy thư mục gốc của kho trong Shared Drive. Kiểm tra lại ID thư mục và việc tài khoản dịch vụ là thành viên của Shared Drive.');
      }
      const entries = buildRepoEntries(files, driveRoot);
      const access = await driveContext.getAccess();
      setDriveEntries(entries);
      setDriveWrite(access.access === 'write');
      setDocuments(entriesToDocuments(entries, driveRoot, new Date().toISOString()));
      setFolders(listingOf(entries).folders);
      setFileStatus({ kind: 'ready' });
    } catch (err) {
      setDriveEntries([]);
      setDriveWrite(false);
      setDocuments([]);
      setFolders([]);
      setFileStatus({ kind: 'error', message: describeDriveError(err, 'Nạp kho lưu trữ') });
    }
  }, [driveRoot]);

  useEffect(() => {
    if (metaStatus.kind === 'ready') void reload();
  }, [metaStatus.kind, reload]);

  const status: ArchiveStatus = useMemo(() => {
    if (metaStatus.kind !== 'ready') return metaStatus;
    if (!selectedRepo) return { kind: 'no_repo' };
    return fileStatus;
  }, [metaStatus, selectedRepo, fileStatus]);

  return {
    /** Mọi repo mà tài khoản được thấy (dùng cho màn quản lý repo). */
    allRepos,
    /** Repo dùng được trong màn hiện tại. */
    repos: candidates,
    selectedRepo,
    /** ID thư mục gốc của kho đang chọn; null khi chưa có kho. */
    driveRoot,
    /** Mọi thư mục và tệp của kho Drive đang chọn, kèm mã Drive. */
    driveEntries,
    /** Token hiện có quyền ghi vào Shared Drive (người chỉ được đọc thì không). */
    driveWrite,
    selectRepo: setSelectedRepoId,
    documents,
    setDocuments,
    folders,
    status,
    reload,
    reloadRepos,
  };
}
