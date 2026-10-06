import { Eye, Download, Sparkles, Trash2, FileText } from 'lucide-react';
import type { DispatchDocument } from '../../types/dispatch';
import { DISPATCH_TYPE_LABELS } from '../../types/dispatch';

interface DispatchTableProps {
  documents: DispatchDocument[];
  onPreview: (doc: DispatchDocument) => void;
  onDownload: (doc: DispatchDocument) => void;
  onAiSummary: (doc: DispatchDocument) => void;
  onDelete: (id: string) => void;
}

export function DispatchTable({
  documents,
  onPreview,
  onDownload,
  onAiSummary,
  onDelete,
}: DispatchTableProps) {
  // Tính tổng dung lượng (MB)
  const totalSizeBytes = documents.reduce((acc, d) => acc + (d.fileSize || 0), 0);
  const totalSizeMb = (totalSizeBytes / 1024 / 1024).toFixed(2);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 font-semibold select-none">
            <th className="w-12 px-3 py-2.5 text-center border-r border-slate-300 dark:border-slate-700">STT</th>
            <th className="w-32 px-3 py-2.5 border-r border-slate-300 dark:border-slate-700">Số ký hiệu</th>
            <th className="w-24 px-3 py-2.5 text-center border-r border-slate-300 dark:border-slate-700">Ngày ký</th>
            <th className="min-w-[260px] px-3 py-2.5 border-r border-slate-300 dark:border-slate-700">Trích yếu nội dung</th>
            <th className="w-32 px-3 py-2.5 border-r border-slate-300 dark:border-slate-700">Loại văn bản</th>
            <th className="w-36 px-3 py-2.5 border-r border-slate-300 dark:border-slate-700">Cơ quan ban hành</th>
            <th className="w-36 px-3 py-2.5 border-r border-slate-300 dark:border-slate-700">Khách hàng</th>
            <th className="w-24 px-3 py-2.5 text-right border-r border-slate-300 dark:border-slate-700">Dung lượng</th>
            <th className="w-28 px-3 py-2.5 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {documents.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400">
                <FileText className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <span>Không tìm thấy văn thư hoặc hồ sơ nào phù hợp bộ lọc.</span>
              </td>
            </tr>
          ) : (
            documents.map((doc, index) => (
              <tr
                key={doc.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
              >
                {/* STT */}
                <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 font-mono">
                  {index + 1}
                </td>

                {/* Số ký hiệu */}
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-mono font-medium text-slate-900 dark:text-slate-100">
                  {doc.documentNumber || '—'}
                </td>

                {/* Ngày văn bản */}
                <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 font-mono">
                  {doc.documentDate || '—'}
                </td>

                {/* Trích yếu nội dung */}
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800">
                  <div
                    onClick={() => onPreview(doc)}
                    className="font-medium text-slate-900 dark:text-slate-100 hover:text-teal-700 dark:hover:text-teal-400 cursor-pointer line-clamp-2 leading-relaxed"
                    title={doc.title}
                  >
                    {doc.title}
                  </div>
                  {doc.aiSummary && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 italic">
                      AI: {doc.aiSummary}
                    </div>
                  )}
                </td>

                {/* Loại văn bản */}
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {DISPATCH_TYPE_LABELS[doc.documentType] || doc.documentType}
                  </span>
                </td>

                {/* Cơ quan ban hành */}
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  {doc.issuer || '—'}
                </td>

                {/* Khách hàng liên quan */}
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  {doc.customerName || (doc.customerId ? `KH #${doc.customerId}` : '—')}
                </td>

                {/* Dung lượng */}
                <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                  {formatFileSize(doc.fileSize)}
                </td>

                {/* Thao tác */}
                <td className="px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onPreview(doc)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                      title="Xem trước văn bản"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownload(doc)}
                      className="p-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                      title="Tải tệp xuống"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onAiSummary(doc)}
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                      title="Hỏi AI về văn bản này"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                      title="Xóa văn bản này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>

        {/* Dòng TỔNG CỘNG bắt buộc theo AGENTS.md */}
        <tfoot>
          <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
            <td colSpan={7} className="px-3 py-2 text-right border-r border-slate-300 dark:border-slate-700 uppercase tracking-wider">
              TỔNG CỘNG ({documents.length} văn thư)
            </td>
            <td className="px-3 py-2 text-right font-mono border-r border-slate-300 dark:border-slate-700">
              {totalSizeMb} MB
            </td>
            <td className="px-3 py-2 text-center text-slate-400">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
