import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Upload, Search, RotateCcw,
  Database, ChevronRight, Settings, File as FileIcon, FileText,
  Grid2X2, List, Download, Eye, Trash2, Shield, Lock, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getHfConfig,
  buildFolderTree,
  uploadFileToHf,
  deleteFileFromHf,
} from '../../lib/huggingface/hfClient';
import {
  resolveFileDownloadUrl,
  getDispatches,
} from '../../lib/dispatch/dispatchStorage';
import type { DispatchDocument } from '../../types/dispatch';
import type { HfConfig, FolderTreeNode } from '../../types/huggingface';
import { FolderTreeView } from '../dispatch/FolderTreeView';
import { HfConfigModal } from '../dispatch/HfConfigModal';
import { DispatchPreviewModal } from '../dispatch/DispatchPreviewModal';
import { AiChatDialog } from '../ai/AiChatDialog';

export function StorageManagementView() {
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState<DispatchDocument[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [isHfConfigOpen, setIsHfConfigOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DispatchDocument | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiAttachedDoc, setAiAttachedDoc] = useState<DispatchDocument | null>(null);
  const [hfConfig, setHfConfig] = useState<HfConfig>(() => getHfConfig());
  const [virtualFolders, setVirtualFolders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Nạp danh sách tệp
  const loadFiles = useCallback(async () => {
    const list = await getDispatches();
    setDocuments(list);
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Xây dựng cây thư mục từ tệp tin và các thư mục ảo
  const folderTreeRoot = useMemo<FolderTreeNode>(() => {
    const fileItems = documents.map((d) => ({
      path: d.filePath || `${d.folderPath || 'ca-nhan'}/${d.fileName}`,
      size: d.fileSize || 0,
    }));

    for (const vf of virtualFolders) {
      fileItems.push({
        path: `${vf}/.keep`,
        size: 0,
      });
    }

    return buildFolderTree(fileItems);
  }, [documents, virtualFolders]);

  // Xử lý tạo thư mục mới
  const handleCreateFolder = (parentPath: string, folderName: string) => {
    const cleanParent = parentPath.replace(/^\/+|\/+$/g, '');
    const cleanName = folderName.trim().replace(/\s+/g, '-');
    const newPath = cleanParent ? `${cleanParent}/${cleanName}` : cleanName;

    if (!virtualFolders.includes(newPath)) {
      setVirtualFolders((prev) => [...prev, newPath]);
      setSelectedFolder(newPath);
    }
  };

  // Lọc tệp theo thư mục và tìm kiếm
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
      result = result.filter(
        (d) =>
          d.fileName.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          (d.note && d.note.toLowerCase().includes(q))
      );
    }

    return result;
  }, [documents, selectedFolder, searchQuery]);

  // Thống kê dung lượng kho
  const stats = useMemo(() => {
    const totalFiles = documents.length;
    const totalBytes = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    const totalMb = (totalBytes / 1024 / 1024).toFixed(1);
    return { totalFiles, totalMb };
  }, [documents]);

  // Xử lý tải tệp cá nhân lên thư mục hiện tại (Cả Admin và User đều được upload)
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const targetFolder = selectedFolder || 'ca-nhan';
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const filePath = `${targetFolder}/${file.name}`;

      let fileUrl = '';
      let storageProvider: 'huggingface' | 'local' = 'local';

      if (hfConfig.token && hfConfig.repoId) {
        try {
          const hfRes = await uploadFileToHf(hfConfig.repoId, filePath, file, hfConfig.token);
          if (hfRes.success && hfRes.url) {
            fileUrl = hfRes.url;
            storageProvider = 'huggingface';
          }
        } catch (err) {
          console.warn('Lỗi upload HF, lưu đệm cục bộ:', err);
        }
      }

      const newDoc: DispatchDocument = {
        id: fileId,
        documentNumber: '',
        title: file.name,
        documentType: 'khac',
        issuer: 'Tải lên cá nhân',
        documentDate: new Date().toISOString().split('T')[0],
        receivedDate: new Date().toISOString().split('T')[0],
        customerId: null,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        fileUrl,
        filePath,
        folderPath: targetFolder,
        storageProvider,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const current = await getDispatches();
      const updated = [newDoc, ...current];
      localStorage.setItem('cm_dispatches_v1', JSON.stringify(updated));
      await loadFiles();
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Xóa tệp (Chỉ Admin mới có quyền)
  const handleDeleteFile = async (doc: DispatchDocument) => {
    if (!isAdmin) {
      alert('Chỉ Quản trị viên (Admin) mới có quyền xóa tệp khỏi kho lưu trữ.');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa tệp "${doc.fileName}" khỏi repo?`)) return;

    if (doc.storageProvider === 'huggingface' && doc.filePath && hfConfig.token && hfConfig.repoId) {
      await deleteFileFromHf(hfConfig.repoId, doc.filePath, hfConfig.token);
    }

    const current = await getDispatches();
    const updated = current.filter((d) => d.id !== doc.id);
    localStorage.setItem('cm_dispatches_v1', JSON.stringify(updated));
    await loadFiles();
  };

  // Tải file xuống máy
  const handleDownload = async (doc: DispatchDocument) => {
    try {
      const url = await resolveFileDownloadUrl(doc);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert('Không thể tải tệp tin.');
    }
  };

  const breadcrumbSegments = useMemo(() => {
    if (!selectedFolder) return [];
    return selectedFolder.split('/').filter(Boolean);
  }, [selectedFolder]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* 1. Header kho lưu trữ */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Kho Lưu Trữ Tệp Cá Nhân & Hugging Face
              </h1>
              {isAdmin ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Quyền Admin (Toàn quyền Repo)
                </span>
              ) : (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Quyền Người dùng (Upload & Download)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lưu trữ tài liệu cá nhân, sao lưu dữ liệu qua Hugging Face Dataset repo
            </p>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAiAttachedDoc(null);
              setIsAiChatOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg border border-teal-600/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trợ lý AI</span>
          </button>

          {/* Nút Tải lên tệp cá nhân */}
          <label className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Đang tải lên...' : 'Tải lên tệp'}</span>
            <input
              type="file"
              disabled={isUploading}
              onChange={handleDirectFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 2. Bố cục 2 cột toàn màn hình: Cột Cây thư mục (280px) & Cột Explorer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Cột trái: Cây thư mục */}
        <div className="w-64 sm:w-72 shrink-0 flex flex-col bg-slate-50 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Card trạng thái Repo */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>Dataset Repo</span>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setIsHfConfigOpen(true)}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Cấu hình Token & Repo (Chỉ dành cho Admin)"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span
                  className="text-slate-400 cursor-not-allowed p-1"
                  title="Chỉ Admin mới có quyền cấu hình repo"
                >
                  <Lock className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
              {hfConfig.repoId ? hfConfig.repoId : 'Chưa cấu hình HF repo'}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>{stats.totalFiles} tệp</span>
              <span>{stats.totalMb} MB</span>
            </div>
          </div>

          {/* Cây thư mục FolderTreeView */}
          <div className="flex-1 overflow-hidden">
            <FolderTreeView
              rootNode={folderTreeRoot}
              selectedPath={selectedFolder}
              onSelectPath={(p) => setSelectedFolder(p)}
              onCreateFolder={handleCreateFolder}
            />
          </div>
        </div>

        {/* Cột phải: Explorer Toolbar & Danh sách tệp tin */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          {/* Breadcrumb & Toolbar */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedFolder('')}
                className={`hover:text-slate-900 dark:hover:text-slate-100 font-medium ${
                  !selectedFolder ? 'text-slate-900 dark:text-slate-100 font-bold' : ''
                }`}
              >
                Gốc
              </button>
              {breadcrumbSegments.map((seg, idx) => {
                const curPath = breadcrumbSegments.slice(0, idx + 1).join('/');
                const isLast = idx === breadcrumbSegments.length - 1;
                return (
                  <div key={curPath} className="flex items-center gap-1.5 min-w-0">
                    <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <button
                      type="button"
                      onClick={() => setSelectedFolder(curPath)}
                      className={`truncate max-w-[130px] hover:text-slate-900 dark:hover:text-slate-100 ${
                        isLast ? 'text-slate-900 dark:text-slate-100 font-bold' : 'font-medium'
                      }`}
                    >
                      {seg}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Toolbar bên phải */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tệp tin..."
                  className="w-48 pl-8 pr-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              {/* View mode toggle */}
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1 ${
                    viewMode === 'list'
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Dạng bảng"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1 ${
                    viewMode === 'grid'
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Dạng lưới"
                >
                  <Grid2X2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFolder('');
                }}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Làm mới"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Vùng hiển thị tệp tin */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {filteredFiles.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thư mục này hiện chưa có tệp tin nào
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-3">
                  Chọn nút &quot;Tải lên tệp&quot; ở góc trên để lưu trữ tệp cá nhân vào thư mục này.
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
                {filteredFiles.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-2xs flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {doc.fileType.includes('pdf') ? (
                            <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                          ) : (
                            <FileIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {(doc.fileSize / 1024).toFixed(0)} KB
                        </span>
                      </div>

                      <h4
                        className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mb-1 cursor-pointer hover:underline"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        {doc.fileName || doc.title}
                      </h4>
                      <div className="text-[10px] text-slate-400 truncate">
                        {doc.folderPath || 'Gốc'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{doc.documentDate || 'N/A'}</span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Xem trước"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Tải về máy"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(doc)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Xóa tệp (Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Dạng bảng danh sách */
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Tên tệp</th>
                      <th className="py-2.5 px-3">Thư mục</th>
                      <th className="py-2.5 px-3 text-right">Dung lượng</th>
                      <th className="py-2.5 px-3">Ngày cập nhật</th>
                      <th className="py-2.5 px-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredFiles.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="hover:underline text-left"
                          >
                            {doc.fileName || doc.title}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {doc.folderPath || 'Gốc'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {(doc.fileSize / 1024).toFixed(0)} KB
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {doc.documentDate || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Xem trước"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(doc)}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Tải về"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(doc)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Xóa tệp (Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                      <td colSpan={2} className="py-2 px-3 text-left">
                        TỔNG CỘNG ({filteredFiles.length} tệp)
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {(
                          filteredFiles.reduce((sum, d) => sum + (d.fileSize || 0), 0) /
                          1024 /
                          1024
                        ).toFixed(2)}{' '}
                        MB
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Cấu hình HF (Chỉ Admin mới mở được) */}
      {isAdmin && (
        <HfConfigModal
          isOpen={isHfConfigOpen}
          onClose={() => setIsHfConfigOpen(false)}
          onConfigSaved={(cfg) => setHfConfig(cfg)}
        />
      )}

      {/* Modal Xem trước file */}
      <DispatchPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        onOpenAiChat={(d) => {
          setAiAttachedDoc(d);
          setIsAiChatOpen(true);
        }}
      />

      {/* Tab Chat AI Dài Bên Phải */}
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
