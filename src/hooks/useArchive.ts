import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DispatchDocument } from '../types/dispatch';
import type { HfAuth } from '../types/huggingface';
import type { StorageRepo } from '../types/storageRepo';
import { useAuth } from '../context/AuthContext';
import { fetchHfAuth } from '../lib/huggingface/hfConfigApi';
import { listHfTree } from '../lib/huggingface/hfClient';
import { listStorageRepos } from '../lib/api/storageReposApi';
import { listDispatches } from '../lib/dispatch/dispatchStorage';
import { mergeHfTreeWithDispatches, collectFolders } from '../lib/dispatch/mergeArchive';
import { classifyArchiveError, type ArchiveStatus } from '../lib/huggingface/hfStatus';
import { dispatchRepoOf, reposForStorage, toHfConfig } from '../lib/storageRepos';

export type ArchiveMode = 'storage' | 'dispatch';

/**
 * Nạp kho lưu trữ dùng chung cho hai màn:
 * - 'storage': các repo user được thấy (Kho chung, kho cá nhân), chọn được repo;
 * - 'dispatch': repo Văn thư duy nhất, kèm metadata từ bảng Dispatches.
 * Mọi lỗi được phân loại thành `status`, không để danh sách rỗng im lặng.
 */
export function useArchive(mode: ArchiveMode) {
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

  const candidates = useMemo(() => {
    if (mode === 'dispatch') {
      const r = dispatchRepoOf(allRepos);
      return r ? [r] : [];
    }
    return reposForStorage(allRepos, role, userId);
  }, [mode, allRepos, role, userId]);

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
      const [tree, dispatches] = await Promise.all([
        listHfTree(repoId, folder ?? '', token, true),
        mode === 'dispatch' ? listDispatches(repoId) : Promise.resolve([] as DispatchDocument[]),
      ]);
      setDocuments(mergeHfTreeWithDispatches(tree, dispatches, new Date().toISOString(), repoId));
      setFolders(collectFolders(tree));
      setFileStatus({ kind: 'ready' });
    } catch (err) {
      setDocuments([]);
      setFolders([]);
      setFileStatus(classifyArchiveError(err));
    }
  }, [mode, repoId, folder, token]);

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
