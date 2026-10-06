import { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import type { OfficialDoc, OfficialDocCategory, OfficialDocFileKind, OfficialDocInput } from '../../types/officialDoc';
import { OFFICIAL_CATEGORIES } from '../../lib/officialDoc/categories';
import { FILE_KINDS, FILE_KIND_LABELS, addDocFile, removeDocFile } from '../../lib/officialDoc/docFiles';
import { validateOfficialDoc } from '../../lib/officialDoc/validate';
import { todayIso } from '../../lib/utils';
import { DateInput } from '../DateInput';
import { HfFilePickerModal, pickedKey } from './HfFilePickerModal';

interface OfficialDocFormProps {
  /** Văn bản đang sửa; null khi tạo mới. */
  doc: OfficialDoc | null;
  defaultCategory: OfficialDocCategory;
  token: string;
  /** Ném lỗi để form hiển thị; trả về bình thường thì form đóng. */
  onSubmit: (input: OfficialDocInput) => Promise<void>;
  onClose: () => void;
}

const control =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm';
const label = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1';

/** Form tạo/sửa văn bản. Mount mới mỗi lần mở để state luôn khởi tạo từ `doc`. */
export function OfficialDocForm({ doc, defaultCategory, token, onSubmit, onClose }: OfficialDocFormProps) {
  const [input, setInput] = useState<OfficialDocInput>(() => {
    if (doc) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = doc;
      return rest;
    }
    const today = todayIso();
    return {
      category: defaultCategory,
      docNumber: '',
      title: '',
      issuedDate: today,
      effectiveFrom: today,
      effectiveTo: null,
      files: [],
    };
  });
  // Ngày hiệu lực đi theo ngày ban hành cho tới khi người dùng tự sửa
  const [effectiveTouched, setEffectiveTouched] = useState(Boolean(doc));
  const [pickerKind, setPickerKind] = useState<OfficialDocFileKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<OfficialDocInput>) => setInput((cur) => ({ ...cur, ...p }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateOfficialDoc(input);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được văn bản.');
      setSubmitting(false);
    }
  };

  // Đánh dấu theo loại đang chọn: cùng một tệp có thể vừa là gốc vừa là biểu mẫu
  const pickedKeys = new Set(input.files.filter((f) => f.kind === pickerKind).map((f) => pickedKey(f.repoId, f.path)));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-slate-900/60">
      <form
        onSubmit={submit}
        role="dialog"
        aria-label={doc ? 'Sửa văn bản' : 'Thêm văn bản'}
        className="w-full max-w-3xl my-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{doc ? 'Sửa văn bản' : 'Thêm văn bản'}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <div>
            <label htmlFor="od-number" className={label}>Số hiệu</label>
            <input id="od-number" value={input.docNumber} onChange={(e) => patch({ docNumber: e.target.value })} className={control} />
          </div>
          <div>
            <label htmlFor="od-category" className={label}>Mục</label>
            <select id="od-category" value={input.category} onChange={(e) => patch({ category: e.target.value as OfficialDocCategory })} className={control}>
              {OFFICIAL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="od-title" className={label}>Tiêu đề</label>
            <input id="od-title" value={input.title} onChange={(e) => patch({ title: e.target.value })} className={control} />
          </div>

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="od-issued" className={label}>Ngày ban hành</label>
              <DateInput
                id="od-issued"
                value={input.issuedDate}
                onChange={(iso) => patch(effectiveTouched ? { issuedDate: iso } : { issuedDate: iso, effectiveFrom: iso })}
                className={control}
              />
            </div>
            <div>
              <label htmlFor="od-from" className={label}>Ngày hiệu lực</label>
              <DateInput
                id="od-from"
                value={input.effectiveFrom}
                onChange={(iso) => {
                  setEffectiveTouched(true);
                  patch({ effectiveFrom: iso });
                }}
                className={control}
              />
            </div>
            <div>
              <label htmlFor="od-to" className={label}>Ngày hết hiệu lực</label>
              <DateInput id="od-to" value={input.effectiveTo ?? ''} onChange={(iso) => patch({ effectiveTo: iso || null })} className={control} />
            </div>
          </div>

          {FILE_KINDS.map((kind) => (
            <div key={kind} className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className={label.replace('mb-1', '')}>{FILE_KIND_LABELS[kind]}</span>
                <button type="button" onClick={() => setPickerKind(kind)} className="inline-flex items-center gap-1 text-sm text-blue-700 dark:text-blue-400 hover:underline cursor-pointer">
                  <Plus className="w-4 h-4" />
                  Chọn từ Kho
                </button>
              </div>
              <ul className="space-y-1">
                {input.files.filter((f) => f.kind === kind).map((f) => (
                  <li key={pickedKey(f.repoId, f.path)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
                    <span className="flex-1 truncate text-slate-900 dark:text-slate-100" title={`${f.repoId}/${f.path}`}>{f.name}</span>
                    <button type="button" onClick={() => patch({ files: removeDocFile(input.files, f) })} aria-label={`Gỡ tệp ${f.name}`} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {error && (
          <div role="alert" className="mx-6 mb-4 flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            Hủy
          </button>
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Lưu văn bản
          </button>
        </div>
      </form>

      {pickerKind && (
        <HfFilePickerModal
          title={FILE_KIND_LABELS[pickerKind]}
          token={token}
          pickedKeys={pickedKeys}
          onPick={(file) => patch({ files: addDocFile(input.files, { kind: pickerKind, ...file }) })}
          onClose={() => setPickerKind(null)}
        />
      )}
    </div>
  );
}
