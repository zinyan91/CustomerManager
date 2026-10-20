import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DispatchDocument } from '../types/dispatch';
import type { StorageRepo } from '../types/storageRepo';
import { useAuth } from '../context/AuthContext';
import { listStorageRepos } from '../lib/api/storageReposApi';
import { listDriveFiles } from '../lib/drive/driveClient';
import { entriesToDocuments } from '../lib/drive/driveDocuments';
import { describeDriveError } from '../lib/drive/driveErrors';
import { readCachedEntries, writeCachedEntries } from '../lib/drive/driveEntriesCache';
import { driveContext } from '../lib/drive/driveToken';
import { buildRepoEntries, listingOf } from '../lib/drive/driveTree';
import type { DriveEntry } from '../lib/drive/driveTypes';
import { classifyArchiveError, type ArchiveStatus } from '../lib/archiveStatus';
import { reposForScope, type StorageScope } from '../lib/storageRepos';
import { runWithTimeout } from '../lib/asyncTimeout';

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
  // Danh sách đang hiện có thể là bản đã lưu trong máy; `refreshing` bật trong lúc lấy bản mới từ Drive
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  // Kho đang hiện danh sách (từ bản đã lưu hoặc từ Drive) và số thứ tự lần nạp mới nhất, để bỏ kết quả của lần nạp đã bị thay thế
  const shownRoot = useRef<string | null>(null);
  const loadSeq = useRef(0);

  const reloadRepos = useCallback(async () => {
    setMetaStatus({ kind: 'loading' });
    try {
      setAllRepos(await runWithTimeout(signal => listStorageRepos(signal), 20_000, 'Kết nối danh sách kho lưu trữ phản hồi quá chậm. Thử tải lại kho.'));
      setMetaStatus({ kind: 'ready' });
    } catch (err) {
      setMetaStatus(classifyArchiveError(err));
    }
  }, []);

  useEffect(() => {
    void reloadRepos();
  }, [reloadRepos]);

  // Xin quyền Drive (Edge Function) song song với việc nạp danh sách kho, thay vì đợi xong mới xin
  useEffect(() => {
    Promise.resolve(driveContext.getAccess()).catch(() => {
      // Lỗi sẽ được báo khi nạp danh sách tệp ở bước sau
    });
  }, []);

  const candidates = useMemo(() => reposForScope(allRepos, role, userId, scope), [allRepos, role, userId, scope]);

  const selectedRepo = useMemo(
    () => candidates.find((r) => r.id === selectedRepoId) ?? candidates[0] ?? null,
    [candidates, selectedRepoId]
  );

  // RepoId là ID thư mục gốc của kho trong Shared Drive
  const driveRoot = selectedRepo?.repoId ?? null;

  const show = useCallback((root: string, entries: DriveEntry[], write: boolean) => {
    setDriveEntries(entries);
    setDriveWrite(write);
    setDocuments(entriesToDocuments(entries, root, new Date().toISOString()));
    setFolders(listingOf(entries).folders);
  }, []);

  /**
   * Nạp kho. Lần đầu mở một kho mà trong máy có bản đã lưu thì hiện ngay bản đó rồi lấy bản mới từ Drive ở phía sau
   * (không chờ liệt kê cả Shared Drive). Lấy bản mới lỗi thì giữ danh sách đang hiện và báo lỗi riêng, không xóa trắng.
   */
  const reload = useCallback(async () => {
    const seq = ++loadSeq.current;
    if (!driveRoot) {
      shownRoot.current = null;
      setDriveEntries([]);
      setDriveWrite(false);
      setDocuments([]);
      setFolders([]);
      setRefreshing(false);
      return;
    }
    if (shownRoot.current !== driveRoot) {
      const cached = userId ? readCachedEntries(userId, driveRoot) : null;
      if (cached) {
        show(driveRoot, cached.entries, cached.write);
        setLoadedAt(cached.savedAt);
        shownRoot.current = driveRoot;
        setFileStatus({ kind: 'ready' });
      } else {
        setFileStatus({ kind: 'loading' });
      }
    }
    setRefreshing(true);
    setRefreshError(null);
    try {
      const [files, access] = await runWithTimeout(
        signal => Promise.all([listDriveFiles(driveContext, signal), driveContext.getAccess()]),
        60_000,
        'Kết nối danh sách tệp Google Drive phản hồi quá chậm. Thử tải lại kho.',
      );
      if (seq !== loadSeq.current) return;
      if (!files.some((f) => f.id === driveRoot)) {
        throw new Error('Không tìm thấy thư mục gốc của kho trong Shared Drive. Kiểm tra lại ID thư mục và việc tài khoản dịch vụ là thành viên của Shared Drive.');
      }
      const entries = buildRepoEntries(files, driveRoot);
      const write = access.access === 'write';
      const now = Date.now();
      show(driveRoot, entries, write);
      if (userId) writeCachedEntries(userId, driveRoot, { entries, write }, now);
      shownRoot.current = driveRoot;
      setLoadedAt(now);
      setFileStatus({ kind: 'ready' });
    } catch (err) {
      if (seq !== loadSeq.current) return;
      const message = describeDriveError(err, 'Nạp kho lưu trữ');
      if (shownRoot.current === driveRoot) {
        setRefreshError(message);
      } else {
        setDriveEntries([]);
        setDriveWrite(false);
        setDocuments([]);
        setFolders([]);
        setFileStatus({ kind: 'error', message });
      }
    } finally {
      if (seq === loadSeq.current) setRefreshing(false);
    }
  }, [driveRoot, userId, show]);

  useEffect(() => {
    if (metaStatus.kind === 'ready') void reload();
  }, [metaStatus.kind, reload]);

  const status: ArchiveStatus = useMemo(() => {
    if (metaStatus.kind !== 'ready') return metaStatus;
    if (!selectedRepo) return { kind: 'no_repo' };
    return fileStatus;
  }, [metaStatus, selectedRepo, fileStatus]);

  const refresh = useCallback(
    () => metaStatus.kind === 'ready' ? reload() : reloadRepos(),
    [metaStatus.kind, reload, reloadRepos],
  );

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
    reload: refresh,
    reloadRepos,
    /** Đang lấy bản mới từ Drive (danh sách đang hiện có thể là bản đã lưu trong máy). */
    refreshing,
    /** Lấy bản mới không được; danh sách đang hiện vẫn là bản cũ. */
    refreshError,
    /** Lúc lấy được danh sách đang hiện (mili giây). */
    loadedAt,
  };
}
