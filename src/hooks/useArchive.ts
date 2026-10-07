import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DispatchDocument } from '../types/dispatch';
import type { HfAuth } from '../types/huggingface';
import type { StorageRepo } from '../types/storageRepo';
import { useAuth } from '../context/AuthContext';
import { fetchHfAuth } from '../lib/huggingface/hfConfigApi';
import { listHfTree } from '../lib/huggingface/hfClient';
import { listStorageRepos } from '../lib/api/storageReposApi';
import { mergeHfTreeWithDispatches, collectFolders } from '../lib/dispatch/mergeArchive';
import { classifyArchiveError, type ArchiveStatus } from '../lib/huggingface/hfStatus';
import { reposForScope, toHfConfig, type StorageScope } from '../lib/storageRepos';

/**
 * Nạp Kho lưu trữ: các repo tài khoản được thấy (Kho chung, Văn thư cho admin, kho cá nhân),
 * chọn được repo, kèm cây tệp. Mọi lỗi được phân loại thành `status`, không để danh sách rỗng im lặng.
 * `scope` chọn nhóm kho của màn (Kho lưu trữ hoặc kho Văn thư/Biểu mẫu trong tab Văn thư).
 */
export function useArchive(scope: StorageScope = 'storage') {
  const { role, user } = useAuth();
  const userId = user?.id ?? null;

  const [auth, setAuth] = useState<HfAuth | null>(null);
  const [allRepos, setAllRepos] = useState<StorageRepo[]>([]);
  const [metaStatus, setMetaStatus] = useState<ArchiveStatus>({ kind: 'loading' });
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);

  const [documents, setDocuments] = useState<DispatchDocument[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [fileStatus, setFileStatus] = useState<ArchiveStatus>({ kind: 'loading' });

  const reloadRepos = useCallback(async () => {
    setMetaStatus({ kind: 'loading' });
    try {
      const [a, repos] = await Promise.all([fetchHfAuth(), listStorageRepos()]);
      setAuth(a);
      setAllRepos(repos);
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

  const config = useMemo(
    () => (auth && selectedRepo ? toHfConfig(auth.token, selectedRepo) : null),
    [auth, selectedRepo]
  );

  const repoId = config?.repoId;
  const folder = config?.folder;
  const token = config?.token;

  const reload = useCallback(async () => {
    if (!repoId || !token) {
      setDocuments([]);
      setFolders([]);
      return;
    }
    setFileStatus({ kind: 'loading' });
    try {
      const tree = await listHfTree(repoId, folder ?? '', token, true);
      setDocuments(mergeHfTreeWithDispatches(tree, [], new Date().toISOString(), repoId));
      setFolders(collectFolders(tree));
      setFileStatus({ kind: 'ready' });
    } catch (err) {
      setDocuments([]);
      setFolders([]);
      setFileStatus(classifyArchiveError(err));
    }
  }, [repoId, folder, token]);

  useEffect(() => {
    if (metaStatus.kind === 'ready') void reload();
  }, [metaStatus.kind, reload]);

  const status: ArchiveStatus = useMemo(() => {
    if (metaStatus.kind !== 'ready') return metaStatus;
    if (!auth) return { kind: 'not_configured' };
    if (!selectedRepo) return { kind: 'no_repo' };
    return fileStatus;
  }, [metaStatus, auth, selectedRepo, fileStatus]);

  return {
    auth,
    /** Mọi repo mà tài khoản được thấy (dùng cho màn quản lý repo). */
    allRepos,
    /** Repo dùng được trong màn hiện tại. */
    repos: candidates,
    selectedRepo,
    selectRepo: setSelectedRepoId,
    config,
    documents,
    setDocuments,
    folders,
    status,
    reload,
    reloadRepos,
  };
}
