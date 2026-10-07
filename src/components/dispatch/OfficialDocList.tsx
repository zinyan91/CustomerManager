import { Eye, Download, Pencil, Trash2, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { OfficialDoc } from '../../types/officialDoc';
import { computeStatus } from '../../lib/officialDoc/status';
import { PAGE_SIZE } from '../../lib/officialDoc/docQuery';
import { fmtDate, todayIso } from '../../lib/utils';
import { OfficialDocStatusBadge } from './OfficialDocStatusBadge';

interface OfficialDocListProps {
  docs: OfficialDoc[];
  loading: boolean;
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onOpen: (doc: OfficialDoc) => void;
  onDownload: (doc: OfficialDoc) => void;
  /** Id văn bản đang tải tệp, để khóa nút trong lúc chờ. */
  downloadingId?: string | null;
  onEdit?: (doc: OfficialDoc) => void;
  onDelete?: (doc: OfficialDoc) => void;
}

const th = 'px-3 py-2.5 border-r border-slate-300 dark:border-slate-700 text-left';
const td = 'px-3 py-2 border-r border-slate-200 dark:border-slate-800 align-top';
const iconBtn =
  'p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer';

export function OfficialDocList({
  docs,
  loading,
  total,
  page,
  pageCount,
  onPageChange,
  onOpen,
  onDownload,
  downloadingId = null,
  onEdit,
  onDelete,
}: OfficialDocListProps) {
  const today = todayIso();
  const firstRow = (page - 1) * PAGE_SIZE;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 font-semibold">
              <th className={`${th} w-12 text-center`}>STT</th>
              <th className={`${th} min-w-[11rem] whitespace-nowrap`}>Số hiệu</th>
              <th className={`${th} min-w-[260px]`}>Tiêu đề</th>
              <th className={`${th} w-28 whitespace-nowrap text-center`}>Ban hành</th>
              <th className={`${th} w-28 whitespace-nowrap text-center`}>Hiệu lực</th>
              <th className={`${th} w-28 whitespace-nowrap text-center`}>Hết hiệu lực</th>
              <th className={`${th} w-32 whitespace-nowrap text-center`}>Tình trạng</th>
              <th className="w-px whitespace-nowrap px-3 py-2.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {docs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500 dark:text-slate-400">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải văn bản...
                    </span>
                  ) : (
                    <>
                      <FileText className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                      <span>Không có văn bản nào phù hợp.</span>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              docs.map((doc, i) => (
                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className={`${td} text-center text-slate-500 font-mono`}>{firstRow + i + 1}</td>
                  <td className={`${td} font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap`}>{doc.docNumber}</td>
                  <td className={`${td} text-slate-900 dark:text-slate-100`}>
                    {doc.title}
                  </td>
                  <td className={`${td} text-center whitespace-nowrap`}>{fmtDate(doc.issuedDate)}</td>
                  <td className={`${td} text-center whitespace-nowrap`}>{fmtDate(doc.effectiveFrom)}</td>
                  <td className={`${td} text-center whitespace-nowrap`}>{fmtDate(doc.effectiveTo)}</td>
                  <td className={`${td} text-center whitespace-nowrap`}>
                    <OfficialDocStatusBadge status={computeStatus(doc.effectiveFrom, doc.effectiveTo, today)} />
                  </td>
                  <td className="w-px whitespace-nowrap px-3 py-2 align-top">
                    <div className="flex items-center justify-center gap-0.5">
                      <button type="button" onClick={() => onOpen(doc)} title="Xem văn bản" aria-label={`Xem văn bản ${doc.docNumber}`} className={iconBtn}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(doc)}
                        disabled={doc.files.length === 0 || downloadingId === doc.id}
                        title={doc.files.length === 0 ? 'Chưa có tệp để tải' : 'Tải về'}
                        aria-label={`Tải về văn bản ${doc.docNumber}`}
                        className={`${iconBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {onEdit && (
                        <button type="button" onClick={() => onEdit(doc)} title="Sửa văn bản" aria-label={`Sửa văn bản ${doc.docNumber}`} className={iconBtn}>
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button type="button" onClick={() => onDelete(doc)} title="Xóa văn bản này" aria-label={`Xóa văn bản ${doc.docNumber}`} className={iconBtn}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 border-t border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
        <span>{total} văn bản</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            aria-label="Trang trước"
            className={`${iconBtn} disabled:opacity-40`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Trang {page}/{pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount || loading}
            onClick={() => onPageChange(page + 1)}
            aria-label="Trang sau"
            className={`${iconBtn} disabled:opacity-40`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
