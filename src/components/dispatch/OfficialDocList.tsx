import { Eye, Download, Pencil, Trash2, FileText, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Loader2 } from 'lucide-react';
import type { OfficialDoc } from '../../types/officialDoc';
import { computeStatus } from '../../lib/officialDoc/status';
import { PAGE_SIZE } from '../../lib/officialDoc/docQuery';
import { ariaSort, type DocSort, type DocSortKey } from '../../lib/officialDoc/docSort';
import { fmtDate, todayIso } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { OfficialDocStatusBadge } from './OfficialDocStatusBadge';

interface OfficialDocListProps {
  docs: OfficialDoc[];
  loading: boolean;
  total: number;
  page: number;
  pageCount: number;
  sort: DocSort;
  onSort: (key: DocSortKey) => void;
  onPageChange: (page: number) => void;
  onOpen: (doc: OfficialDoc) => void;
  onDownload: (doc: OfficialDoc) => void;
  /** Id văn bản đang tải tệp, để khóa nút trong lúc chờ. */
  downloadingId?: string | null;
  onEdit?: (doc: OfficialDoc) => void;
  onDelete?: (doc: OfficialDoc) => void;
}

const SORT_OPTIONS: Array<{ key: DocSortKey; label: string }> = [
  { key: 'issuedDate', label: 'Ngày ban hành' },
  { key: 'effectiveFrom', label: 'Ngày hiệu lực' },
  { key: 'effectiveTo', label: 'Ngày hết hiệu lực' },
  { key: 'docNumber', label: 'Số hiệu' },
  { key: 'title', label: 'Tiêu đề' },
];

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
  sort,
  onSort,
  onPageChange,
  onOpen,
  onDownload,
  downloadingId = null,
  onEdit,
  onDelete,
}: OfficialDocListProps) {
  const today = todayIso();
  const isMobile = useIsMobile();
  const firstRow = (page - 1) * PAGE_SIZE;

  const rowActions = (doc: OfficialDoc, compact: boolean) => {
    const btn = compact ? `${iconBtn} !p-2.5` : iconBtn;
    return (
            <div className={`flex items-center ${compact ? 'justify-end gap-1' : 'justify-center gap-0.5'}`}>
              <button type="button" onClick={() => onOpen(doc)} title="Xem văn bản" aria-label={`Xem văn bản ${doc.docNumber}`} className={btn}>
                <Eye className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDownload(doc)}
                disabled={doc.files.length === 0 || downloadingId === doc.id}
                title={doc.files.length === 0 ? 'Chưa có tệp để tải' : doc.files.length > 1 ? `Tải ${doc.files.length} tệp (ZIP)` : 'Tải về'}
                aria-label={`Tải về văn bản ${doc.docNumber}`}
                className={`${btn} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Download className="w-4 h-4" />
              </button>
              {onEdit && (
                <button type="button" onClick={() => onEdit(doc)} title="Sửa văn bản" aria-label={`Sửa văn bản ${doc.docNumber}`} className={btn}>
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button type="button" onClick={() => onDelete(doc)} title="Xóa văn bản này" aria-label={`Xóa văn bản ${doc.docNumber}`} className={btn}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
    );
  };

  const statusOf = (doc: OfficialDoc) => computeStatus(doc.effectiveFrom, doc.effectiveTo, today);

  const mobileCards = (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {docs.map((doc) => (
        <li key={doc.id} className="px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100 break-all">{doc.docNumber}</span>
            <span className="shrink-0">
              <OfficialDocStatusBadge status={statusOf(doc)} />
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{doc.title}</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-slate-500">Ban hành</dt>
              <dd className="text-slate-900 dark:text-slate-100">{fmtDate(doc.issuedDate)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Hiệu lực</dt>
              <dd className="text-slate-900 dark:text-slate-100">{fmtDate(doc.effectiveFrom)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Hết hiệu lực</dt>
              <dd className="text-slate-900 dark:text-slate-100">{fmtDate(doc.effectiveTo) || '—'}</dd>
            </div>
          </dl>
          <div className="mt-1.5">{rowActions(doc, true)}</div>
        </li>
      ))}
    </ul>
  );

  const mobileSortBar = (
    <div className="px-3 py-2 flex items-center gap-2 text-sm border-b border-slate-200 dark:border-slate-800">
      <label htmlFor="doc-sort-key" className="text-slate-500 shrink-0">Sắp xếp</label>
      <select
        id="doc-sort-key"
        value={sort.key}
        onChange={(e) => {
          const key = e.target.value as DocSortKey;
          if (key !== sort.key) onSort(key);
        }}
        className="flex-1 min-w-0 px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onSort(sort.key)}
        aria-label={sort.dir === 'asc' ? 'Đang tăng dần, bấm để giảm dần' : 'Đang giảm dần, bấm để tăng dần'}
        className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
      >
        {sort.dir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
    </div>
  );

  const emptyState = (
    <div className="py-10 text-center text-slate-500 dark:text-slate-400">
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
    </div>
  );

  const sortHeader = (key: DocSortKey, label: string, className: string) => {
    const active = sort.key === key;
    const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
    const centered = className.includes('text-center');
    return (
      <th className={className} aria-sort={ariaSort(sort, key)}>
        <button
          type="button"
          onClick={() => onSort(key)}
          className={`inline-flex items-center gap-1 font-semibold cursor-pointer hover:text-slate-950 dark:hover:text-white ${centered ? 'justify-center w-full' : ''}`}
        >
          <span>{label}</span>
          <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? '' : 'opacity-40'}`} />
        </button>
      </th>
    );
  };

  return (
    <div>
      {isMobile ? (
        <>
          {mobileSortBar}
          {docs.length === 0 ? emptyState : mobileCards}
        </>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 font-semibold">
              <th className={`${th} w-12 text-center`}>STT</th>
              {sortHeader('docNumber', 'Số hiệu', `${th} min-w-[11rem] whitespace-nowrap`)}
              {sortHeader('title', 'Tiêu đề', `${th} min-w-[260px]`)}
              {sortHeader('issuedDate', 'Ban hành', `${th} w-28 whitespace-nowrap text-center`)}
              {sortHeader('effectiveFrom', 'Hiệu lực', `${th} w-28 whitespace-nowrap text-center`)}
              {sortHeader('effectiveTo', 'Hết hiệu lực', `${th} w-28 whitespace-nowrap text-center`)}
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
                    {rowActions(doc, false)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

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
