import { FileText, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { DocProposal } from '../../hooks/useAiDocProposals';
import type { ExtractedDoc } from '../../lib/ai/docExtract';
import type { OfficialDocCategory } from '../../types/officialDoc';
import { OFFICIAL_CATEGORIES } from '../../lib/officialDoc/categories';
import { validateOfficialDoc } from '../../lib/officialDoc/validate';
import { DateInput } from '../DateInput';

interface AiDocProposalCardProps {
  proposal: DocProposal;
  onEdit: (id: string, change: Partial<ExtractedDoc>) => void;
  onRecord: (id: string) => void;
  onDismiss: (id: string) => void;
}

const input =
  'w-full px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100';
const lbl = 'block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5';

/** Thẻ AI đề xuất ghi nhận một văn bản: sửa được các trường, bấm Ghi nhận mới lưu. */
export function AiDocProposalCard({ proposal, onEdit, onRecord, onDismiss }: AiDocProposalCardProps) {
  const { id, attachment, status, fields, error } = proposal;
  const invalid = fields ? validateOfficialDoc({ ...fields, files: [] }) : null;
  const locked = status === 'saving' || status === 'saved';

  return (
    <div className="max-w-3xl mr-auto ml-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-3 text-xs shadow-2xs">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="flex-1 truncate font-semibold text-slate-800 dark:text-slate-200" title={attachment.name}>
          Ghi nhận vào Văn thư: {attachment.name}
        </span>
        {status !== 'saving' && (
          <button type="button" onClick={() => onDismiss(id)} aria-label="Bỏ đề xuất" className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {status === 'reading' && (
        <div role="status" className="flex items-center gap-2 text-slate-500 py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          AI đang đọc tệp để trích các trường...
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="flex items-start gap-1.5 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {fields && (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <div>
              <label className={lbl} htmlFor={`${id}-number`}>Số hiệu</label>
              <input id={`${id}-number`} disabled={locked} value={fields.docNumber} onChange={(e) => onEdit(id, { docNumber: e.target.value })} className={input} />
            </div>
            <div>
              <label className={lbl} htmlFor={`${id}-category`}>Mục</label>
              <select id={`${id}-category`} disabled={locked} value={fields.category} onChange={(e) => onEdit(id, { category: e.target.value as OfficialDocCategory })} className={input}>
                {OFFICIAL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={lbl} htmlFor={`${id}-title`}>Tiêu đề</label>
              <input id={`${id}-title`} disabled={locked} value={fields.title} onChange={(e) => onEdit(id, { title: e.target.value })} className={input} />
            </div>
            <div>
              <label className={lbl} htmlFor={`${id}-issued`}>Ngày ban hành</label>
              <DateInput id={`${id}-issued`} disabled={locked} value={fields.issuedDate} onChange={(iso) => onEdit(id, { issuedDate: iso })} className={input} />
            </div>
            <div>
              <label className={lbl} htmlFor={`${id}-from`}>Ngày hiệu lực</label>
              <DateInput id={`${id}-from`} disabled={locked} value={fields.effectiveFrom} onChange={(iso) => onEdit(id, { effectiveFrom: iso })} className={input} />
            </div>
            <div>
              <label className={lbl} htmlFor={`${id}-to`}>Ngày hết hiệu lực</label>
              <DateInput id={`${id}-to`} disabled={locked} value={fields.effectiveTo ?? ''} onChange={(iso) => onEdit(id, { effectiveTo: iso || null })} className={input} />
            </div>
          </div>

          {error && status !== 'error' && (
            <div role="alert" className="mt-2 flex items-start gap-1.5 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            {status === 'saved' ? (
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã ghi nhận vào Văn thư
              </span>
            ) : (
              <>
                {invalid && <span className="text-amber-700 dark:text-amber-300 mr-auto">{invalid}</span>}
                <button
                  type="button"
                  disabled={Boolean(invalid) || status === 'saving'}
                  onClick={() => onRecord(id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Ghi nhận vào Văn thư
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
