import { useMemo, useRef, useState } from 'react';
import {
  Upload, FolderUp, Search, RotateCcw, Database, ChevronRight, Settings,
  File as FileIcon, FileText, FileArchive, Grid2X2, List, Download, Eye, Trash2,
  Sparkles, AlertCircle, Loader2, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserScope } from '../../context/UserScopeContext';
import { useArchive } from '../../hooks/useArchive';
import { useArchiveUpload } from '../../hooks/useArchiveUpload';
import { buildFolderTree } from '../../lib/huggingface/hfClient';
import { deleteFileFromHf } from '../../lib/huggingface/hfWrite';
import { isHfConfigComplete } from '../../lib/huggingface/hfConfigApi';
import { archiveStatusMessage } from '../../lib/huggingface/hfStatus';
import { resolveFileDownloadUrl, joinArchivePath } from '../../lib/dispatch/dispatchStorage';
import { canDeleteInRepo, canUploadToRepo, repoLabel } from '../../lib/storageRepos';
import { itemsFromFileList, type UploadItem } from '../../lib/uploadItems';
import { fmtDate } from '../../lib/utils';
import type { DispatchDocument } from '../../types/dispatch';
import type { FolderTreeNode } from '../../types/huggingface';
import { FolderTreeView } from '../dispatch/FolderTreeView';
import { DispatchPreviewModal } from '../dispatch/DispatchPreviewModal';
import { AiChatDialog } from '../ai/AiChatDialog';
import { StorageSettingsModal } from '../storage/StorageSettingsModal';
import { UploadDropZone } from '../storage/UploadDropZone';
import { UploadStatusPanel } from '../storage/UploadStatusPanel';

const ARCHIVE_EXT = /\.(zip|rar|7z|tar|gz|tgz)$/i;

// webkitdirectory chưa có trong kiểu chuẩn của React nên khai báo qua object
const FOLDER_INPUT_ATTRS = { webkitdirectory: '', directory: '' } as Record<string, string>;

function FileGlyph({ doc }: { doc: DispatchDocument }) {
  if (doc.fileType.includes('pdf')) return <FileText className="w-6 h-6 text-rose-600 dark:text-rose-400" />;
  if (ARCHIVE_EXT.test(doc.fileName)) return <FileArchive className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
  return <FileIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />;
}

export function StorageManagementView() {
  const { role, user, can } = useAuth();
  const userId = user?.id ?? null;
  const { managedUsers } = useUserScope();
  const { auth, allRepos, repos, selectedRepo, selectRepo, config, documents, folders, status, reload, reloadRepos } =
    useArchive('storage');
  const upload = useArchiveUpload(config, reload);

  const [selectedFolder, setSelectedFolder] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DispatchDocument | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiAttachedDoc, setAiAttachedDoc] = useState<DispatchDocument | null>(null);
  const [virtualFolders, setVirtualFolders] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const canConfigure = can('storage.configure');
  const canUpload = canUploadToRepo(role, userId, selectedRepo) && isHfConfigComplete(config);
  const canDelete = canDeleteInRepo(role, userId, selectedRepo);
  const statusMessage = archiveStatusMessage(status, canConfigure);
  const ownerNames = useMemo(() => new Map(managedUsers.map((u) => [u.userId, u.fullName])), [managedUsers]);

  const folderTreeRoot = useMemo<FolderTreeNode>(() => {
    const fileItems = documents.map((d) => ({
      path: d.filePath || joinArchivePath(d.folderPath || 'ca-nhan', d.fileName),
      size: d.fileSize || 0,
    }));
    for (const folder of new Set([...folders, ...virtualFolders])) {
      fileItems.push({ path: `${folder}/.keep`, size: 0 });
    }
    return buildFolderTree(fileItems);
  }, [documents, folders, virtualFolders]);

  const filteredFiles = useMemo(() => {
    let result = documents;
    if (selectedFolder) {
      const target = selectedFolder.replace(/^\/+|\/+$/g, '');
      result = result.filter((d) => {
        const fPath = (d.folderPath || '').replace(/^\/+|\/+$/g, '');
        const fullPath = (d.filePath || '').replace(/^\/+|\/+$/g, '');
        return fPath === target || fullPath.startsWith(target + '/');
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((d) => d.fileName.toLowerCase().includes(q) || d.title.toLowerCase().includes(q));
    }
    return result;
  }, [documents, selectedFolder, searchQuery]);

  const stats = useMemo(() => {
    const totalBytes = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    return { totalFiles: documents.length, totalMb: (totalBytes / 1024 / 1024).toFixed(1) };
  }, [documents]);

  const breadcrumbSegments = useMemo(() => selectedFolder.split('/').filter(Boolean), [selectedFolder]);

  const handleSelectRepo = (id: number) => {
    selectRepo(id);
    setSelectedFolder('');
    setSearchQuery('');
    setVirtualFolders([]);
    upload.dismiss();
    setActionError(null);
  };

  const handleCreateFolder = (parentPath: string, folderName: string) => {
    const newPath = joinArchivePath(parentPath, folderName.trim().replace(/\s+/g, '-'));
    if (!virtualFolders.includes(newPath)) {
      setVirtualFolders((prev) => [...prev, newPath]);
      setSelectedFolder(newPath);
    }
  };

  const targetFolder = selectedFolder || joinArchivePath(config?.folder);

  const startUpload = (items: UploadItem[]) => {
    if (!canUpload) {
      setActionError('Bạn không có quyền tải lên kho này.');
      return;
    }
    setActionError(null);
    void upload.upload(items, targetFolder);
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const items = itemsFromFileList(input.files ?? []);
    input.value = '';
    if (items.length > 0) startUpload(items);
  };

  const handleDeleteFile = async (doc: DispatchDocument) => {
    if (!canDelete || !config || !doc.filePath) {
      setActionError('Bạn không có quyền xóa tệp trong kho này.');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tệp "${doc.fileName}"?`)) return;

    setActionError(null);
    const res = await deleteFileFromHf(config.repoId, doc.filePath, config.token);
    if (!res.success) {
      setActionError(res.error || 'Không xóa được tệp.');
      return;
    }
    await reload();
  };

  const handleDownload = async (doc: DispatchDocument) => {
    setActionError(null);
    try {
      const url = await resolveFileDownloadUrl(doc, config);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể tải tệp tin.');
    }
  };

  const iconBtn =
    'p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800';

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Tiêu đề và thao tác */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Database className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kho lưu trữ</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setAiAttachedDoc(null);
              setIsAiChatOpen(true);
            }}
            className="px-3.5 py-2 rounded-lg border border-teal-600/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Trợ lý AI</span>
          </button>

          {canUpload && (
            <>
              <button
                type="button"
                disabled={upload.running}
                onClick={() => folderInputRef.current?.click()}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <FolderUp className="w-4 h-4" />
                <span>Tải lên thư mục</span>
              </button>
              <button
                type="button"
                disabled={upload.running}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{upload.running ? 'Đang tải lên...' : 'Tải lên tệp'}</span>
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handlePick} aria-label="Chọn tệp để tải lên" />
              <input ref={folderInputRef} type="file" multiple className="hidden" onChange={handlePick} aria-label="Chọn thư mục để tải lên" {...FOLDER_INPUT_ATTRS} />
            </>
          )}
        </div>
      </div>

      <UploadStatusPanel running={upload.running} progress={upload.progress} summary={upload.summary} error={upload.error} onDismiss={upload.dismiss} />

      {(statusMessage || actionError || status.kind === 'loading') && (
        <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-1.5 text-sm">
          {status.kind === 'loading' && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang nạp kho lưu trữ...</span>
            </div>
          )}
          {statusMessage && (
            <div role="alert" className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}
          {actionError && (
            <div role="alert" className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{actionError}</span>
              <button type="button" onClick={() => setActionError(null)} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Cột trái: chọn kho và cây thư mục */}
        <div className="w-72 lg:w-80 shrink-0 flex flex-col bg-slate-50 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Kho</span>
              {canConfigure && (
                <button type="button" onClick={() => setIsSettingsOpen(true)} aria-label="Cấu hình kho lưu trữ" className={iconBtn}>
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>

            {repos.length > 0 ? (
              <div className="space-y-1" role="tablist" aria-label="Chọn kho">
                {repos.map((r) => {
                  const active = r.id === selectedRepo?.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleSelectRepo(r.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {repoLabel(r, userId, r.assignedUserId ? ownerNames.get(r.assignedUserId) : undefined)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chưa có kho nào.</p>
            )}

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{stats.totalFiles} tệp</span>
              <span>{stats.totalMb} MB</span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <FolderTreeView rootNode={folderTreeRoot} selectedPath={selectedFolder} onSelectPath={setSelectedFolder} onCreateFolder={handleCreateFolder} />
          </div>
        </div>

        {/* Cột phải: danh sách tệp, có kéo thả */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50 text-sm">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedFolder('')}
                className={`hover:text-slate-900 dark:hover:text-slate-100 font-medium ${!selectedFolder ? 'text-slate-900 dark:text-slate-100 font-bold' : ''}`}
              >
                Gốc
              </button>
              {breadcrumbSegments.map((seg, idx) => {
                const curPath = breadcrumbSegments.slice(0, idx + 1).join('/');
                const isLast = idx === breadcrumbSegments.length - 1;
                return (
                  <div key={curPath} className="flex items-center gap-1.5 min-w-0">
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <button
                      type="button"
                      onClick={() => setSelectedFolder(curPath)}
                      className={`truncate max-w-[160px] hover:text-slate-900 dark:hover:text-slate-100 ${isLast ? 'text-slate-900 dark:text-slate-100 font-bold' : 'font-medium'}`}
                    >
                      {seg}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tệp tin..."
                  aria-label="Tìm tệp tin"
                  className="w-56 pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-hidden"
                />
              </div>

              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="Dạng bảng"
                  aria-pressed={viewMode === 'list'}
                  className={`p-1.5 ${viewMode === 'list' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Dạng lưới"
                  aria-pressed={viewMode === 'grid'}
                  className={`p-1.5 ${viewMode === 'grid' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Grid2X2 className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFolder('');
                  void reload();
                }}
                aria-label="Làm mới"
                className={iconBtn}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <UploadDropZone disabled={!canUpload || upload.running} onItems={startUpload} className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {filteredFiles.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">Thư mục này chưa có tệp tin nào</h3>
                {canUpload && (
                  <p className="text-sm text-slate-400 max-w-md">Kéo thả tệp, thư mục hoặc tệp nén vào đây, hoặc dùng nút Tải lên ở góc trên.</p>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredFiles.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                          <FileGlyph doc={doc} />
                        </div>
                        <span className="text-xs font-mono text-slate-400">{(doc.fileSize / 1024).toFixed(0)} KB</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="text-left text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mb-1 hover:underline break-all"
                      >
                        {doc.fileName || doc.title}
                      </button>
                      <div className="text-xs text-slate-400 truncate">{doc.folderPath || 'Gốc'}</div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>{fmtDate(doc.updatedAt?.slice(0, 10))}</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setPreviewDoc(doc)} aria-label={`Xem ${doc.fileName}`} className={iconBtn}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDownload(doc)} aria-label={`Tải ${doc.fileName}`} className={iconBtn}>
                          <Download className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button type="button" onClick={() => handleDeleteFile(doc)} aria-label={`Xóa ${doc.fileName}`} className={`${iconBtn} hover:text-rose-600`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="py-3 px-4">Tên tệp</th>
                      <th className="py-3 px-4">Thư mục</th>
                      <th className="py-3 px-4 text-right">Dung lượng</th>
                      <th className="py-3 px-4">Ngày cập nhật</th>
                      <th className="py-3 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredFiles.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          <button type="button" onClick={() => setPreviewDoc(doc)} className="hover:underline text-left break-all">
                            {doc.fileName || doc.title}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">{doc.folderPath || 'Gốc'}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{(doc.fileSize / 1024).toFixed(0)} KB</td>
                        <td className="py-3 px-4 text-slate-500">{fmtDate(doc.updatedAt?.slice(0, 10))}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button type="button" onClick={() => setPreviewDoc(doc)} aria-label={`Xem ${doc.fileName}`} className={iconBtn}>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => handleDownload(doc)} aria-label={`Tải ${doc.fileName}`} className={iconBtn}>
                              <Download className="w-4 h-4" />
                            </button>
                            {canDelete && (
                              <button type="button" onClick={() => handleDeleteFile(doc)} aria-label={`Xóa ${doc.fileName}`} className={`${iconBtn} hover:text-rose-600`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                      <td colSpan={2} className="py-2.5 px-4 text-left">TỔNG CỘNG ({filteredFiles.length} tệp)</td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {(filteredFiles.reduce((sum, d) => sum + (d.fileSize || 0), 0) / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </UploadDropZone>
        </div>
      </div>

      {canConfigure && (
        <StorageSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          auth={auth}
          repos={allRepos}
          onChanged={reloadRepos}
        />
      )}

      <DispatchPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        hfConfig={config}
        onOpenAiChat={(d) => {
          setAiAttachedDoc(d);
          setIsAiChatOpen(true);
        }}
      />

      <AiChatDialog
        isOpen={isAiChatOpen}
        onClose={() => {
          setIsAiChatOpen(false);
          setAiAttachedDoc(null);
        }}
        availableDispatches={documents}
        initialAttachedDoc={aiAttachedDoc}
      />
    </div>
  );
}
