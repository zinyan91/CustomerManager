import { useEffect, useMemo, useState } from 'react';
import { X, Folder, FileText, ChevronRight, Check, Loader2, AlertCircle } from 'lucide-react';
import type { DispatchDocument } from '../../types/dispatch';
import type { OfficialDocFileKind } from '../../types/officialDoc';
import { STORAGE_KIND_LABELS, type StorageRepo } from '../../types/storageRepo';
import type { ArchiveStatus } from '../../lib/huggingface/hfStatus';
import { classifyArchiveError, archiveStatusMessage } from '../../lib/huggingface/hfStatus';
import { listHfTree } from '../../lib/huggingface/hfClient';
import { describeDriveError } from '../../lib/drive/driveErrors';
import { listStorageRepos } from '../../lib/api/storageReposApi';
import { repoKindOfFile, selectableRepos } from '../../lib/officialDoc/docFiles';
import { browseFolder, stripBase } from '../../lib/dispatch/folderBrowse';
import { collectFolders, mergeHfTreeWithDispatches } from '../../lib/dispatch/mergeArchive';
import { joinArchivePath } from '../../lib/archivePath';
import { formatBytes } from '../../types/huggingface';

export interface PickedFile {
  repoId: string;
  path: string;
  name: string;
  /** Chỉ có với tệp Google Drive. */
  fileId?: string;
  nativeMimeType?: string;
}

interface HfFilePickerModalProps {
  /** Loại tệp đang chọn: quyết định kho nào được mở (gốc: kho Văn thư; biểu mẫu: kho Biểu mẫu). */
  fileKind: OfficialDocFileKind;
  /** Tiêu đề phụ, vd: "File văn bản gốc". */
  title: string;
  token: string;
  /** Khóa `${repoId}/${path}` của các tệp đã chọn, để đánh dấu. */
  pickedKeys: Set<string>;
  onPick: (file: PickedFile) => void;
  onClose: () => void;
}

export const pickedKey = (repoId: string, path: string) => `${repoId}/${path}`;

/** Chọn tệp có sẵn trong kho tương ứng với loại tệp để gắn vào văn bản. Không tải tệp lên. */
export function HfFilePickerModal({ fileKind, title, token, pickedKeys, onPick, onClose }: HfFilePickerModalProps) {
  const kindLabel = STORAGE_KIND_LABELS[repoKindOfFile(fileKind)];
  const [repos, setRepos] = useState<StorageRepo[]>([]);
  const [repoIndex, setRepoIndex] = useState(0);
  const [docs, setDocs] = useState<DispatchDocument[]>([]);
  const [emptyFolders, setEmptyFolders] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [status, setStatus] = useState<ArchiveStatus>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    listStorageRepos()
      .then((all) => {
        if (!active) return;
        const list = selectableRepos(all, fileKind);
        setRepos(list);
        setStatus(list.length === 0 ? { kind: 'no_repo' } : { kind: 'loading' });
      })
      .catch((err) => active && setStatus(classifyArchiveError(err)));
    return () => {
      active = false;
    };
  }, [fileKind]);

  const repo = repos[repoIndex] ?? null;

  const isDrive = repo?.provider === 'drive';
  // Kho Drive luôn tính từ thư mục gốc của kho
  const base = repo && !isDrive ? repo.folder : '';

  useEffect(() => {
    if (!repo) return;
    const isDriveRepo = repo.provider === 'drive';
    // Token Hugging Face chỉ cần cho kho Hugging Face; kho Drive đi qua Edge Function drive-token
    if (!isDriveRepo && !token) {
      setStatus({ kind: 'not_configured' });
      return;
    }
    let active = true;
    setStatus({ kind: 'loading' });
    setCurrent(isDriveRepo ? '' : repo.folder);

    const load = isDriveRepo
      ? Promise.all([import('../../lib/drive/driveToken'), import('../../lib/drive/driveClient'), import('../../lib/drive/driveTree'), import('../../lib/drive/driveDocuments')]).then(
          async ([{ driveContext }, { listDriveFiles }, { buildRepoEntries, listingOf }, { entriesToDocuments }]) => {
            const files = await listDriveFiles(driveContext);
            if (!files.some((f) => f.id === repo.repoId)) {
              throw new Error('Không tìm thấy thư mục gốc của kho trong Shared Drive. Kiểm tra lại ID thư mục và việc tài khoản dịch vụ là thành viên của Shared Drive.');
            }
            const entries = buildRepoEntries(files, repo.repoId);
            return { docs: entriesToDocuments(entries, repo.repoId, new Date().toISOString()), folders: listingOf(entries).folders };
          }
        )
      : listHfTree(repo.repoId, repo.folder, token, true).then((tree) => ({
          docs: mergeHfTreeWithDispatches(tree, [], new Date().toISOString(), repo.repoId),
          folders: collectFolders(tree),
        }));

    load
      .then((loaded) => {
        if (!active) return;
        setDocs(loaded.docs);
        setEmptyFolders(loaded.folders);
        setStatus({ kind: 'ready' });
      })
      .catch((err) => {
        if (!active) return;
        setDocs([]);
        setEmptyFolders([]);
        setStatus(isDriveRepo ? { kind: 'error', message: describeDriveError(err, 'Nạp kho lưu trữ') } : classifyArchiveError(err));
      });
    return () => {
      active = false;
    };
  }, [repo, token]);

  const listing = useMemo(() => browseFolder(docs, emptyFolders, current), [docs, emptyFolders, current]);
  const crumbs = (stripBase(current, base) ?? '').split('/').filter(Boolean);
  const message =
    status.kind === 'no_repo'
      ? `Chưa có kho ${kindLabel}. Liên hệ Master Admin để tạo kho ${kindLabel}.`
      : archiveStatusMessage(status, false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60">
      <div role="dialog" aria-label={`Chọn tệp từ kho ${kindLabel}`} className="w-full max-w-3xl h-[80vh] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Chọn từ kho {kindLabel}</h3>
            <p className="text-xs text-slate-500">{title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {repos.length > 1 && (
          <div className="px-5 pt-3 flex gap-1.5" role="tablist" aria-label="Kho">
            {repos.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={i === repoIndex}
                onClick={() => setRepoIndex(i)}
                className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${
                  i === repoIndex
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}

        <div className="px-5 py-2.5 flex items-center flex-wrap gap-1 text-sm text-slate-600 dark:text-slate-300">
          <button type="button" onClick={() => setCurrent(base)} className="hover:underline cursor-pointer">
            Gốc
          </button>
          {crumbs.map((name, i) => (
            <span key={`${name}-${i}`} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button type="button" onClick={() => setCurrent(joinArchivePath(base, ...crumbs.slice(0, i + 1)))} className="hover:underline cursor-pointer">
                {name}
              </button>
            </span>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
          {status.kind === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang nạp kho...
            </div>
          )}
          {message && (
            <div role="alert" className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300 py-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {status.kind === 'ready' && listing.folders.length === 0 && listing.files.length === 0 && (
            <div className="text-sm text-slate-500 py-6">Thư mục trống.</div>
          )}

          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {listing.folders.map((f) => (
              <li key={f.path}>
                <button type="button" onClick={() => setCurrent(f.path)} className="w-full flex items-center gap-2.5 px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <Folder className="w-4 h-4 text-amber-600" />
                  <span className="flex-1 truncate text-slate-900 dark:text-slate-100">{f.name}</span>
                  <span className="text-xs text-slate-400">{f.fileCount} tệp</span>
                </button>
              </li>
            ))}
            {listing.files.map((file) => {
              const path = file.filePath ?? '';
              const picked = pickedKeys.has(pickedKey(repo?.repoId ?? '', path));
              return (
                <li key={path}>
                  <button
                    type="button"
                    disabled={picked || !repo}
                    onClick={() =>
                      repo &&
                      onPick({
                        repoId: repo.repoId,
                        path,
                        name: file.fileName,
                        ...(file.fileId ? { fileId: file.fileId, ...(file.nativeMimeType ? { nativeMimeType: file.nativeMimeType } : {}) } : {}),
                      })
                    }
                    className="w-full flex items-center gap-2.5 px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="flex-1 truncate text-slate-900 dark:text-slate-100">{file.fileName}</span>
                    <span className="text-xs text-slate-400">{formatBytes(file.fileSize)}</span>
                    {picked && <Check className="w-4 h-4 text-emerald-600" aria-label="Đã chọn" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-semibold cursor-pointer">
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
