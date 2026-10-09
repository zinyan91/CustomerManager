import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, FolderUp, Search, RotateCcw, Database, ChevronRight, Settings,
  File as FileIcon, FileText, FileArchive, Folder, Grid2X2, List, Download, Eye, Trash2,
  Sparkles, AlertCircle, Loader2, X, Copy, ClipboardPaste, MoreHorizontal, Pencil, FolderPlus, FolderInput,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useUserScope } from '../../context/UserScopeContext';
import { useArchive } from '../../hooks/useArchive';
import { useArchiveUpload, type DriveUploadTarget } from '../../hooks/useArchiveUpload';
import { useDriveOps, type DriveOpsTarget } from '../../hooks/useDriveOps';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useFolderZipDownload, type ZipTarget } from '../../hooks/useFolderZipDownload';
import { useStorageClipboard } from '../../hooks/useStorageClipboard';
import { buildFolderTree, type FolderTreeNode } from '../../lib/folderTree';
import { archiveStatusMessage } from '../../lib/archiveStatus';
import { resolveFileDownloadUrl, joinArchivePath } from '../../lib/dispatch/dispatchStorage';
import { canDeleteInRepo, canUploadToRepo, repoLabel, splitStorageRepos, type StorageScope } from '../../lib/storageRepos';
import { browseFolder } from '../../lib/dispatch/folderBrowse';
import { planFolderZip } from '../../lib/dispatch/folderZipPlan';
import { buildClip, describeClip, planClipZip, topKey, type ClipTop } from '../../lib/storageClipboard';
import { driveContext } from '../../lib/drive/driveToken';
import { driveOpenEntry } from '../../lib/drive/driveZip';
import { folderIdMap } from '../../lib/drive/driveOps';
import { ROUTE_OF } from '../../lib/routes';
import { itemsFromFileList, type UploadItem } from '../../lib/uploadItems';
import { fmtDate } from '../../lib/utils';
import type { DispatchDocument } from '../../types/dispatch';
import { FolderTreeView } from '../dispatch/FolderTreeView';
import { DispatchPreviewModal } from '../dispatch/DispatchPreviewModal';
import { AiChatDialog } from '../ai/AiChatDialog';
import { ItemMenu, type MenuEntry } from '../storage/ItemMenu';
import { UploadDropZone } from '../storage/UploadDropZone';
import { TransferPanel } from '../storage/TransferPanel';
import { UploadDuplicateDialog } from '../storage/UploadDuplicateDialog';
import { DriveNameDialog } from '../storage/DriveNameDialog';
import { DriveMoveDialog } from '../storage/DriveMoveDialog';

const ARCHIVE_EXT = /\.(zip|rar|7z|tar|gz|tgz)$/i;

const barBtn =
  'px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium flex items-center gap-1.5 cursor-pointer';

// webkitdirectory chưa có trong kiểu chuẩn của React nên khai báo qua object
const FOLDER_INPUT_ATTRS = { webkitdirectory: '', directory: '' } as Record<string, string>;

function FileGlyph({ doc }: { doc: DispatchDocument }) {
  if (doc.fileType.includes('pdf')) return <FileText className="w-6 h-6 text-rose-600 dark:text-rose-400" />;
  if (ARCHIVE_EXT.test(doc.fileName)) return <FileArchive className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
  return <FileIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />;
}

interface StorageManagementViewProps {
  /** Kho lưu trữ (mặc định) hoặc kho Văn thư và Biểu mẫu khi nhúng trong tab Văn thư. */
  scope?: StorageScope;
  /** Nhúng trong màn khác: lấp đầy khung chứa và không có trợ lý AI riêng. */
  embedded?: boolean;
}

export function StorageManagementView({ scope = 'storage', embedded = false }: StorageManagementViewProps = {}) {
  const { role, user, can } = useAuth();
  const userId = user?.id ?? null;
  const { managedUsers } = useUserScope();
  const {
    repos, selectedRepo, driveRoot, driveEntries, driveWrite, selectRepo, documents, folders, status, reload, refreshing, refreshError, loadedAt,
  } = useArchive(scope);
  const confirm = useConfirm();
  const driveUploadTarget = useMemo<DriveUploadTarget | null>(
    () =>
      driveRoot
        ? { ctx: driveContext, rootId: driveRoot, existingPaths: (driveEntries ?? []).map((e) => e.path), folderIds: folderIdMap(driveEntries ?? []), entries: driveEntries ?? [] }
        : null,
    [driveRoot, driveEntries]
  );
  const driveOpsTarget = useMemo<DriveOpsTarget | null>(
    () => (driveRoot ? { ctx: driveContext, rootId: driveRoot, entries: driveEntries ?? [] } : null),
    [driveRoot, driveEntries]
  );
  const upload = useArchiveUpload(driveUploadTarget, reload);
  const driveOps = useDriveOps(driveOpsTarget, reload);
  const zipDl = useFolderZipDownload();
  const clipboard = useStorageClipboard();

  const [selectedFolder, setSelectedFolder] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  // Điện thoại: bảng nhiều cột khó đọc nên luôn dùng thẻ; kho và cây thư mục nằm trong một ngăn bật tắt
  const isMobile = useIsMobile();
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DispatchDocument | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiAttachedDoc, setAiAttachedDoc] = useState<DispatchDocument | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; tops: ClipTop[]; pasteInto?: string } | null>(null);
  const [driveDialog, setDriveDialog] = useState<
    { kind: 'create'; parent: string } | { kind: 'rename'; path: string; name: string } | { kind: 'move'; paths: string[] } | null
  >(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const canConfigure = can('storage.configure');
  // Ngoài quyền theo vai trò còn cần token có quyền ghi vào Shared Drive
  const canUpload = canUploadToRepo(role, userId, selectedRepo) && Boolean(driveWrite);
  const canDelete = canDeleteInRepo(role, userId, selectedRepo) && Boolean(driveWrite);
  const canEditDrive = canUpload;
  const zipTarget = useMemo<ZipTarget>(() => ({ openEntry: driveOpenEntry(driveContext) }), []);
  const statusMessage = archiveStatusMessage(status, canConfigure);
  const ownerNames = useMemo(() => new Map(managedUsers.map((u) => [u.userId, u.fullName])), [managedUsers]);
  // Kho của người khác (chỉ Master Admin có) nằm trong ô chọn, không liệt kê hết thành tab
  const { primary: primaryRepos, others: otherRepos } = useMemo(() => splitStorageRepos(repos, userId), [repos, userId]);
  const nameOf = (r: (typeof repos)[number]) => repoLabel(r, userId, r.assignedUserId ? ownerNames.get(r.assignedUserId) : undefined);
  const sortedOthers = useMemo(() => [...otherRepos].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'vi')), [otherRepos, ownerNames]); // eslint-disable-line react-hooks/exhaustive-deps
  const pageTitle = scope === 'dispatch' ? 'Kho Văn thư và Biểu mẫu' : 'Kho lưu trữ';

  const currentFolder = joinArchivePath(selectedFolder);

  const folderTreeRoot = useMemo<FolderTreeNode>(() => {
    const fileItems = documents.map((d) => ({
      path: d.filePath || joinArchivePath(d.folderPath, d.fileName),
      size: d.fileSize || 0,
    }));
    for (const folder of new Set(folders)) {
      if (folder) fileItems.push({ path: `${folder}/.keep`, size: 0 });
    }
    return buildFolderTree(fileItems.filter((i) => i.path));
  }, [documents, folders]);

  const isSearching = searchQuery.trim() !== '';

  // Kiểu trình quản lý tệp: thư mục hiện thành thư mục, tệp chỉ là tệp nằm trực tiếp ở đây.
  // Đang tìm kiếm thì quét toàn kho và trả danh sách phẳng.
  const browse = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.toLowerCase().trim();
      return {
        folders: [],
        files: documents.filter((d) => d.fileName.toLowerCase().includes(q) || d.title.toLowerCase().includes(q)),
      };
    }
    return browseFolder(documents, folders, currentFolder);
  }, [documents, folders, currentFolder, isSearching, searchQuery]);

  const filteredFiles = browse.files;
  const listedFileCount = filteredFiles.length + browse.folders.reduce((n, f) => n + f.fileCount, 0);
  const listedBytes =
    filteredFiles.reduce((sum, d) => sum + (d.fileSize || 0), 0) + browse.folders.reduce((sum, f) => sum + f.totalBytes, 0);
  const openFolder = (entryPath: string) => setSelectedFolder(entryPath);

  // Chọn tất cả: các mục đang hiện ở danh sách (thư mục và tệp)
  const listedTops = useMemo<ClipTop[]>(
    () => [
      ...browse.folders.map((f) => ({ kind: 'folder' as const, path: f.path, name: f.name })),
      ...filteredFiles.map((d) => ({ kind: 'file' as const, path: d.filePath || joinArchivePath(d.folderPath, d.fileName), name: d.fileName })),
    ],
    [browse.folders, filteredFiles]
  );
  const allListedSelected = listedTops.length > 0 && listedTops.every((t) => clipboard.selected.has(topKey(t)));
  const toggleAllListed = () => {
    if (allListedSelected) clipboard.clearSelection();
    else for (const t of listedTops) if (!clipboard.selected.has(topKey(t))) clipboard.toggle(t);
  };
  const { clearSelection } = clipboard;
  useEffect(() => {
    clearSelection();
  }, [selectedRepo?.id, selectedFolder, searchQuery, clearSelection]);

  const stats = useMemo(() => {
    const totalBytes = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    return { totalFiles: documents.length, totalMb: (totalBytes / 1024 / 1024).toFixed(1) };
  }, [documents]);

  const breadcrumbSegments = useMemo(() => selectedFolder.split('/').filter(Boolean), [selectedFolder]);

  const handleSelectRepo = (id: number) => {
    selectRepo(id);
    setSelectedFolder('');
    setSearchQuery('');
    upload.dismiss();
    setActionError(null);
  };

  const targetFolder = currentFolder;

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

  const handleDeleteFile = (doc: DispatchDocument) => handleTrash([topOfDoc(doc)]);

  // Phải chạy đồng bộ trong sự kiện click: hộp "Lưu thành" cần user activation
  const handleDownloadFolder = (folderPath: string) => {
    setActionError(null);
    try {
      const rootLabel = selectedRepo ? repoLabel(selectedRepo, userId) : 'Kho';
      zipDl.start(planFolderZip(documents, folderPath, rootLabel), zipTarget);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không nén được thư mục.');
    }
  };

  const handleDownload = async (doc: DispatchDocument) => {
    setActionError(null);
    try {
      const url = await resolveFileDownloadUrl(doc);
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

  const selectedTops = useMemo(() => [...clipboard.selected.values()], [clipboard.selected]);

  const topOfDoc = (doc: DispatchDocument): ClipTop => ({ kind: 'file', path: doc.filePath || joinArchivePath(doc.folderPath, doc.fileName), name: doc.fileName });
  const topOfFolder = (f: { path: string; name: string }): ClipTop => ({ kind: 'folder', path: f.path, name: f.name });
  // Bấm vào mục đang được chọn thì thao tác áp cho cả nhóm đã chọn; mục khác thì chỉ cho riêng nó
  const actionTops = (top: ClipTop): ClipTop[] => (clipboard.selected.has(topKey(top)) ? selectedTops : [top]);

  const handleCopy = (tops: ClipTop[]) => {
    if (!selectedRepo) return;
    if (clipboard.copy(selectedRepo.repoId, documents, tops)) setActionError(null);
  };

  const handlePaste = async (destFolder: string) => {
    if (!selectedRepo || !clipboard.clip) return;
    if (!canUpload) {
      setActionError('Bạn không có quyền tải lên kho này.');
      return;
    }
    setActionError(null);
    await clipboard.paste({
      destRepoId: selectedRepo.repoId,
      destFolder,
      destDocs: documents,
      serverCopy: (plan, folder) => driveOps.copyPlan(plan, folder),
    });
  };

  // Chọn một thư mục đang mở mà bị đổi tên, di chuyển hay xóa thì quay về gốc, kẻo đứng ở thư mục không còn
  const leaveFolderIfAffected = (paths: readonly string[]) => {
    const cur = selectedFolder.toLowerCase();
    if (paths.some((p) => cur === p.toLowerCase() || cur.startsWith(`${p.toLowerCase()}/`))) setSelectedFolder('');
  };

  const createDriveFolder = async (parent: string, name: string): Promise<string | null> => {
    const failure = await driveOps.createFolder(parent, name);
    if (!failure) setSelectedFolder(joinArchivePath(parent, name.trim()));
    return failure;
  };

  const handleTreeCreateDriveFolder = async (parent: string, name: string) => {
    setActionError(null);
    const failure = await createDriveFolder(parent, name);
    if (failure) setActionError(failure);
  };

  const handleTrash = async (tops: ClipTop[]) => {
    if (!canDelete) {
      setActionError('Bạn không có quyền xóa trong kho này.');
      return;
    }
    const only = tops.length === 1 ? tops[0] : null;
    const question = !only
      ? `Xóa ${tops.length} mục đã chọn?`
      : only.kind === 'folder'
        ? `Xóa thư mục "${only.name}" cùng toàn bộ nội dung bên trong?`
        : `Xóa tệp "${only.name}"?`;
    const ok = await confirm({ title: 'Xóa', message: `${question} Mục bị xóa nằm trong thùng rác của Shared Drive, khôi phục được tại đó.`, confirmText: 'Xóa', tone: 'danger' });
    if (!ok) return;
    setActionError(null);
    const failure = await driveOps.trash(tops.map((t) => t.path));
    if (failure) setActionError(failure);
    else {
      leaveFolderIfAffected(tops.filter((t) => t.kind === 'folder').map((t) => t.path));
      clipboard.clearSelection();
    }
  };

  const renameDriveItem = async (path: string, newName: string): Promise<string | null> => {
    const failure = await driveOps.rename(path, newName);
    if (!failure) {
      leaveFolderIfAffected([path]);
      clipboard.clearSelection();
    }
    return failure;
  };

  const moveDriveItems = async (paths: string[], dest: string): Promise<string | null> => {
    const failure = await driveOps.move(paths, dest);
    if (!failure) {
      leaveFolderIfAffected(paths);
      clipboard.clearSelection();
    }
    return failure;
  };

  // Phải chạy đồng bộ trong sự kiện click: hộp "Lưu thành" cần user activation
  const handleDownloadTops = (tops: ClipTop[]) => {
    if (!selectedRepo) return;
    if (tops.length === 1 && tops[0].kind === 'folder') {
      handleDownloadFolder(tops[0].path);
      return;
    }
    if (tops.length === 1) {
      const doc = documents.find((d) => (d.filePath || joinArchivePath(d.folderPath, d.fileName)) === tops[0].path);
      if (doc) void handleDownload(doc);
      return;
    }
    setActionError(null);
    try {
      const rootLabel = selectedFolder ? selectedFolder.split('/').pop()! : selectedRepo ? repoLabel(selectedRepo, userId) : 'Kho';
      zipDl.start(planClipZip(buildClip(selectedRepo.repoId, documents, tops), rootLabel), zipTarget);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không nén được các mục đã chọn.');
    }
  };

  const openMenu = (e: React.MouseEvent, tops: ClipTop[], pasteInto?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, tops, pasteInto });
  };

  const openMenuAtButton = (e: React.MouseEvent<HTMLButtonElement>, tops: ClipTop[], pasteInto?: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ x: rect.right - 192, y: rect.bottom + 4, tops, pasteInto });
  };

  const menuEntries = (m: NonNullable<typeof menu>): MenuEntry[] => {
    const entries: MenuEntry[] = [];
    if (m.tops.length > 0) {
      entries.push(
        { id: 'copy', label: m.tops.length > 1 ? `Sao chép ${m.tops.length} mục` : 'Sao chép', icon: Copy, onSelect: () => handleCopy(m.tops) },
        {
          id: 'download',
          label: m.tops.length === 1 && m.tops[0].kind === 'file' ? 'Tải về' : 'Tải về (ZIP)',
          icon: Download,
          onSelect: () => handleDownloadTops(m.tops),
          disabled: zipDl.isBusy,
        },
      );
    }
    if (clipboard.clip && canUpload) {
      const where = m.pasteInto ?? currentFolder;
      entries.push({
        id: 'paste',
        label: m.pasteInto !== undefined ? `Dán vào "${m.pasteInto.split('/').pop()}"` : 'Dán vào thư mục này',
        icon: ClipboardPaste,
        onSelect: () => void handlePaste(where),
        disabled: upload.running || driveOps.busy,
      });
    }
    if (canEditDrive) {
      if (m.tops.length === 1) {
        entries.push({
          id: 'rename',
          label: 'Đổi tên',
          icon: Pencil,
          onSelect: () => setDriveDialog({ kind: 'rename', path: m.tops[0].path, name: m.tops[0].name }),
          disabled: driveOps.busy,
        });
      }
      if (m.tops.length > 0) {
        entries.push({ id: 'move', label: 'Di chuyển', icon: FolderInput, onSelect: () => setDriveDialog({ kind: 'move', paths: m.tops.map((t) => t.path) }), disabled: driveOps.busy });
      }
      if (m.pasteInto !== undefined || m.tops.length === 0) {
        entries.push({
          id: 'new-folder',
          label: 'Thư mục mới',
          icon: FolderPlus,
          onSelect: () => setDriveDialog({ kind: 'create', parent: m.pasteInto ?? currentFolder }),
          disabled: driveOps.busy,
        });
      }
    }
    if (canDelete && m.tops.length > 0) {
      entries.push({ id: 'trash', label: 'Xóa', icon: Trash2, onSelect: () => void handleTrash(m.tops), disabled: driveOps.busy });
    }
    return entries;
  };

  const shownError = actionError ?? clipboard.error;
  const dismissShownError = () => {
    setActionError(null);
    clipboard.dismissError();
  };

  return (
    <div className={`flex flex-col ${embedded ? 'h-full min-h-[28rem]' : 'h-[calc(100dvh-3.5rem)]'} overflow-hidden bg-slate-50 dark:bg-slate-950`}>
      {/* Tiêu đề và thao tác */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Database className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{pageTitle}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!embedded && (
          <button
            type="button"
            onClick={() => {
              setIsAiChatOpen((prev) => !prev);
              if (isAiChatOpen) setAiAttachedDoc(null);
            }}
            aria-pressed={isAiChatOpen}
            className={`px-3.5 py-2 rounded-lg border text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
              isAiChatOpen
                ? 'border-teal-600 bg-teal-600 text-white dark:bg-teal-500 dark:border-teal-500 dark:text-slate-900 shadow-2xs'
                : 'border-teal-600/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Trợ lý AI</span>
          </button>
          )}

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

      {upload.pending && (
        <UploadDuplicateDialog matches={upload.pending.matches} total={upload.pending.total} onConfirm={(choices) => void upload.resolveDuplicates(choices)} onCancel={upload.cancelDuplicates} />
      )}

      {(statusMessage || shownError || refreshError || status.kind === 'loading' || (refreshing && status.kind === 'ready')) && (
        <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-1.5 text-sm">
          {status.kind === 'loading' && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang nạp kho lưu trữ...</span>
            </div>
          )}
          {refreshing && status.kind === 'ready' && (
            <div role="status" className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{loadedAt ? `Đang cập nhật danh sách (bản lưu lúc ${new Date(loadedAt).toTimeString().slice(0, 5)})...` : 'Đang cập nhật danh sách...'}</span>
            </div>
          )}
          {refreshError && (
            <div role="alert" className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{`Chưa cập nhật được danh sách, đang hiện bản lưu${loadedAt ? ` lúc ${new Date(loadedAt).toTimeString().slice(0, 5)}` : ''}. ${refreshError}`}</span>
            </div>
          )}
          {statusMessage && (
            <div role="alert" className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}
          {shownError && (
            <div role="alert" className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{shownError}</span>
              <button type="button" onClick={dismissShownError} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {(selectedTops.length > 0 || clipboard.clip) && (
        <div role="toolbar" aria-label="Thao tác với mục đã chọn" className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0 flex flex-wrap items-center gap-2 text-sm">
          {selectedTops.length > 0 && (
            <>
              <span className="font-medium text-slate-800 dark:text-slate-100">Đã chọn {selectedTops.length} mục</span>
              <button type="button" onClick={() => handleCopy(selectedTops)} className={barBtn}>
                <Copy className="w-4 h-4" />
                <span>Sao chép</span>
              </button>
              <button type="button" disabled={zipDl.isBusy} onClick={() => handleDownloadTops(selectedTops)} className={`${barBtn} disabled:opacity-50`}>
                <Download className="w-4 h-4" />
                <span>Tải về</span>
              </button>
              {canEditDrive && (
                <button type="button" disabled={driveOps.busy} onClick={() => setDriveDialog({ kind: 'move', paths: selectedTops.map((t) => t.path) })} className={`${barBtn} disabled:opacity-50`}>
                  <FolderInput className="w-4 h-4" />
                  <span>Di chuyển</span>
                </button>
              )}
              {canDelete && (
                <button type="button" disabled={driveOps.busy} onClick={() => void handleTrash(selectedTops)} className={`${barBtn} disabled:opacity-50 hover:text-rose-700`}>
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa</span>
                </button>
              )}
              <button type="button" onClick={clipboard.clearSelection} className={barBtn}>
                <X className="w-4 h-4" />
                <span>Bỏ chọn</span>
              </button>
            </>
          )}
          {driveOps.copyProgress && (
            <span role="status" className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang sao chép {driveOps.copyProgress.done}/{driveOps.copyProgress.total}
            </span>
          )}
          {clipboard.clip && (
            <span className="ml-auto flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300">Đã sao chép: {describeClip(clipboard.clip)}</span>
              {canUpload && (
                <button type="button" disabled={upload.running || driveOps.busy} onClick={() => void handlePaste(currentFolder)} className={`${barBtn} disabled:opacity-50`}>
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Dán vào thư mục này</span>
                </button>
              )}
              <button type="button" onClick={clipboard.clearClip} aria-label="Bỏ mục đã sao chép" className={iconBtn}>
                <X className="w-4 h-4" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Cột trái: chọn kho và cây thư mục (điện thoại: ngăn bật tắt phía trên danh sách tệp) */}
        <div className={`${isTreeOpen ? 'flex' : 'hidden'} md:flex w-full md:w-60 xl:w-72 2xl:w-80 shrink-0 max-md:max-h-[55%] flex-col bg-slate-50 dark:bg-slate-900/60 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 overflow-hidden`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Kho</span>
              {canConfigure && (
                <a href={`${ROUTE_OF.admin}/storage`} target="_blank" rel="noopener noreferrer" aria-label="Cấu hình kho lưu trữ" className={iconBtn}>
                  <Settings className="w-4 h-4" />
                </a>
              )}
            </div>

            {repos.length > 0 ? (
              <div className="space-y-1" role="tablist" aria-label="Chọn kho">
                {primaryRepos.map((r) => {
                  const active = r.id === selectedRepo?.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => { handleSelectRepo(r.id); setIsTreeOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {nameOf(r)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chưa có kho nào.</p>
            )}

            {sortedOthers.length > 0 && (
              <div className="mt-3">
                <label htmlFor="other-repo" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Kho của người dùng khác</label>
                <select
                  id="other-repo"
                  value={sortedOthers.some((r) => r.id === selectedRepo?.id) ? selectedRepo?.id : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectRepo(Number(e.target.value));
                      setIsTreeOpen(false);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                >
                  <option value="">Chọn người dùng...</option>
                  {sortedOthers.map((r) => (
                    <option key={r.id} value={r.id}>{nameOf(r)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{stats.totalFiles} tệp</span>
              <span>{stats.totalMb} MB</span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <FolderTreeView rootNode={folderTreeRoot} selectedPath={selectedFolder} onSelectPath={(path) => { setSelectedFolder(path); setIsTreeOpen(false); }} onCreateFolder={canEditDrive ? handleTreeCreateDriveFolder : undefined} />
          </div>
        </div>

        {/* Cột phải: danh sách tệp, có kéo thả */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          <div className="px-3 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50 text-sm">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 min-w-0 max-md:w-full">
              <button
                type="button"
                onClick={() => setIsTreeOpen((open) => !open)}
                aria-expanded={isTreeOpen}
                className="md:hidden shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold cursor-pointer"
              >
                <Folder className="w-4 h-4" />
                <span className="truncate max-w-[10rem]">{selectedRepo ? nameOf(selectedRepo) : 'Kho'}</span>
              </button>
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

            <div className="flex flex-wrap items-center gap-2.5 max-md:w-full">
              <div className="relative max-sm:w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tệp tin..."
                  aria-label="Tìm tệp tin"
                  className="w-full sm:w-40 xl:w-56 pl-9 pr-3 py-2 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-hidden"
                />
              </div>

              {!isSearching && (browse.folders.length > 0 || filteredFiles.length > 0) && (
                <button
                  type="button"
                  disabled={zipDl.isBusy}
                  onClick={() => handleDownloadFolder(currentFolder)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải thư mục này (ZIP)</span>
                </button>
              )}

              <div className="hidden md:flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
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

          <UploadDropZone
            disabled={!canUpload || upload.running}
            onItems={startUpload}
            onContextMenu={(e) => {
              if ((clipboard.clip && canUpload) || canEditDrive) openMenu(e, []);
            }}
            className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar"
          >
            {filteredFiles.length === 0 && browse.folders.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isSearching ? 'Không tìm thấy tệp nào khớp' : 'Thư mục này chưa có tệp tin nào'}
                </h3>
                {canUpload && !isSearching && (
                  <p className="text-sm text-slate-400 max-w-md">Kéo thả tệp, thư mục hoặc tệp nén vào đây, hoặc dùng nút Tải lên ở góc trên.</p>
                )}
              </div>
            ) : isMobile || viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {browse.folders.map((f) => (
                  <div
                    key={f.path}
                    onContextMenu={(e) => openMenu(e, actionTops(topOfFolder(f)), f.path)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-2xs flex items-center"
                  >
                    <input
                      type="checkbox"
                      checked={clipboard.selected.has(topKey(topOfFolder(f)))}
                      onChange={() => clipboard.toggle(topOfFolder(f))}
                      aria-label={`Chọn thư mục ${f.name}`}
                      className="w-4 h-4 ml-3 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => openFolder(f.path)}
                      className="flex-1 min-w-0 p-4 flex items-center gap-3 text-left cursor-pointer"
                    >
                      <div className="p-2.5 rounded-lg bg-amber-500/10">
                        <Folder className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{f.name}</div>
                        <div className="text-xs text-slate-500">
                          {f.fileCount} tệp · {(f.totalBytes / 1024 / 1024).toFixed(1)} MB
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                    <button
                      type="button"
                      disabled={zipDl.isBusy || f.fileCount === 0}
                      onClick={() => handleDownloadFolder(f.path)}
                      aria-label={`Tải thư mục ${f.name} (ZIP)`}
                      className={`${iconBtn} disabled:opacity-40`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={(e) => openMenuAtButton(e, actionTops(topOfFolder(f)), f.path)} aria-label={`Thao tác khác với thư mục ${f.name}`} aria-haspopup="menu" className={`${iconBtn} mr-3`}>
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {filteredFiles.map((doc) => (
                  <div
                    key={doc.id}
                    onContextMenu={(e) => openMenu(e, actionTops(topOfDoc(doc)))}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <input
                          type="checkbox"
                          checked={clipboard.selected.has(topKey(topOfDoc(doc)))}
                          onChange={() => clipboard.toggle(topOfDoc(doc))}
                          aria-label={`Chọn ${doc.fileName}`}
                          className="w-4 h-4 cursor-pointer"
                        />
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
                        <button type="button" onClick={(e) => openMenuAtButton(e, actionTops(topOfDoc(doc)))} aria-label={`Thao tác khác với ${doc.fileName}`} aria-haspopup="menu" className={iconBtn}>
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto bg-white dark:bg-slate-900">
                <table className="w-full min-w-[680px] text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="py-3 pl-4 pr-1 w-px">
                        <input
                          type="checkbox"
                          checked={allListedSelected}
                          onChange={toggleAllListed}
                          aria-label="Chọn tất cả mục đang hiện"
                          className="w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 min-w-[14rem]">Tên tệp</th>
                      <th className="py-3 px-4 whitespace-nowrap">Thư mục</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Dung lượng</th>
                      <th className="py-3 px-4 whitespace-nowrap">Ngày cập nhật</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {browse.folders.map((f) => (
                      <tr key={f.path} onContextMenu={(e) => openMenu(e, actionTops(topOfFolder(f)), f.path)} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 pl-4 pr-1">
                          <input
                            type="checkbox"
                            checked={clipboard.selected.has(topKey(topOfFolder(f)))}
                            onChange={() => clipboard.toggle(topOfFolder(f))}
                            aria-label={`Chọn thư mục ${f.name}`}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          <button type="button" onClick={() => openFolder(f.path)} className="flex items-center gap-2 hover:underline text-left cursor-pointer">
                            <Folder className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>{f.name}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">{f.fileCount} tệp</td>
                        <td className="py-3 px-4 text-right font-mono whitespace-nowrap text-slate-600 dark:text-slate-400">{(f.totalBytes / 1024).toFixed(0)} KB</td>
                        <td className="py-3 px-4" />
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              disabled={zipDl.isBusy || f.fileCount === 0}
                              onClick={() => handleDownloadFolder(f.path)}
                              aria-label={`Tải thư mục ${f.name} (ZIP)`}
                              className={`${iconBtn} disabled:opacity-40`}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={(e) => openMenuAtButton(e, actionTops(topOfFolder(f)), f.path)} aria-label={`Thao tác khác với thư mục ${f.name}`} aria-haspopup="menu" className={iconBtn}>
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => openFolder(f.path)} aria-label={`Mở thư mục ${f.name}`} className={iconBtn}>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredFiles.map((doc) => (
                      <tr key={doc.id} onContextMenu={(e) => openMenu(e, actionTops(topOfDoc(doc)))} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 pl-4 pr-1">
                          <input
                            type="checkbox"
                            checked={clipboard.selected.has(topKey(topOfDoc(doc)))}
                            onChange={() => clipboard.toggle(topOfDoc(doc))}
                            aria-label={`Chọn ${doc.fileName}`}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          <button type="button" onClick={() => setPreviewDoc(doc)} className="hover:underline text-left break-all">
                            {doc.fileName || doc.title}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 break-all min-w-[8rem]">{doc.folderPath || 'Gốc'}</td>
                        <td className="py-3 px-4 text-right font-mono whitespace-nowrap text-slate-600 dark:text-slate-400">{(doc.fileSize / 1024).toFixed(0)} KB</td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{fmtDate(doc.updatedAt?.slice(0, 10))}</td>
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
                            <button type="button" onClick={(e) => openMenuAtButton(e, actionTops(topOfDoc(doc)))} aria-label={`Thao tác khác với ${doc.fileName}`} aria-haspopup="menu" className={iconBtn}>
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                      <td colSpan={3} className="py-2.5 px-4 text-left">TỔNG CỘNG ({listedFileCount} tệp)</td>
                      <td className="py-2.5 px-4 text-right font-mono">{(listedBytes / 1024 / 1024).toFixed(2)} MB</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </UploadDropZone>
        </div>

        {/* Cột phải: Sidebar Chat AI (nhúng trong tab Văn thư thì dùng trợ lý của Văn thư) */}
        {!embedded && (
        <AiChatDialog
          isOpen={isAiChatOpen}
          onClose={() => {
            setIsAiChatOpen(false);
            setAiAttachedDoc(null);
          }}
          availableDispatches={documents}
          initialAttachedDoc={aiAttachedDoc}
          mode="sidebar"
        />
        )}
      </div>

      <TransferPanel
        upload={{ running: upload.running, progress: upload.progress, summary: upload.summary, error: upload.error, files: upload.files, onDismiss: upload.dismiss }}
        zip={{ phase: zipDl.phase, fileName: zipDl.fileName, progress: zipDl.progress, error: zipDl.error, message: zipDl.message, onCancel: zipDl.cancel, onDismiss: zipDl.dismiss }}
      />

      {menu && menuEntries(menu).length > 0 && <ItemMenu x={menu.x} y={menu.y} entries={menuEntries(menu)} onClose={closeMenu} />}

      {driveDialog?.kind === 'create' && (
        <DriveNameDialog
          title="Thư mục mới"
          label="Tên thư mục"
          submitLabel="Tạo thư mục"
          onSubmit={(name) => createDriveFolder(driveDialog.parent, name)}
          onClose={() => setDriveDialog(null)}
        />
      )}
      {driveDialog?.kind === 'rename' && (
        <DriveNameDialog
          key={driveDialog.path}
          title="Đổi tên"
          label="Tên mới"
          initialValue={driveDialog.name}
          submitLabel="Lưu tên"
          onSubmit={(name) => renameDriveItem(driveDialog.path, name)}
          onClose={() => setDriveDialog(null)}
        />
      )}
      {driveDialog?.kind === 'move' && (
        <DriveMoveDialog folders={folders} moving={driveDialog.paths} onSubmit={(dest) => moveDriveItems(driveDialog.paths, dest)} onClose={() => setDriveDialog(null)} />
      )}

      <DispatchPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        onOpenAiChat={embedded ? undefined : (d) => {
          setAiAttachedDoc(d);
          setIsAiChatOpen(true);
        }}
      />
    </div>
  );
}
