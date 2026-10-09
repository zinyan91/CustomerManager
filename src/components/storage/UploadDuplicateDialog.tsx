import { useState } from 'react';
import { defaultChoice, type DuplicateChoice, type DuplicateMatch } from '../../lib/drive/driveDuplicates';
import { formatBytes } from '../../lib/formatBytes';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';

interface UploadDuplicateDialogProps {
  matches: readonly DuplicateMatch[];
  /** Tổng số tệp trong đợt tải lên (kể cả tệp không trùng). */
  total: number;
  onConfirm: (choices: ReadonlyMap<number, DuplicateChoice>) => void;
  onCancel: () => void;
}

const when = (value: number | string) => {
  const t = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(t) && t > 0 ? new Date(t).toLocaleDateString('vi-VN') : '';
};

const btn = 'px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer';

/**
 * Hỏi cách xử lý các tệp trùng tên với tệp đã có trong thư mục đích: bỏ qua, giữ cả hai (tệp mới tự đổi tên thêm hậu tố), hoặc
 * ghi đè nội dung tệp cũ (Drive giữ bản cũ trong lịch sử phiên bản; không có với tệp Google Docs, Sheets, Slides).
 * Chỉ so tên và dung lượng, chưa so nội dung, nên "cùng dung lượng" chỉ là gợi ý.
 */
export function UploadDuplicateDialog({ matches, total, onConfirm, onCancel }: UploadDuplicateDialogProps) {
  const [choices, setChoices] = useState<Map<number, DuplicateChoice>>(() => new Map(matches.map((m) => [m.index, defaultChoice(m)])));
  const [applyAll, setApplyAll] = useState(false);

  const choiceOf = (m: DuplicateMatch) => choices.get(m.index) ?? defaultChoice(m);
  const confirm = () => {
    const first = choiceOf(matches[0]);
    onConfirm(applyAll ? new Map(matches.map((m) => [m.index, first] as const)) : choices);
  };
  const others = total - matches.length;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {matches.length} tệp trùng tên trong thư mục này
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 sm:p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {matches.map((m) => {
            const name = `dup-${m.index}`;
            return (
              <fieldset key={m.index} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-slate-100 break-all">{m.path}</legend>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>Trong kho: {formatBytes(m.existing.size)} {when(m.existing.modifiedTime) && `· sửa ${when(m.existing.modifiedTime)}`}</span>
                  <span>Tệp mới: {formatBytes(m.newSize)} {when(m.newModified) && `· sửa ${when(m.newModified)}`}</span>
                  <span className={`px-2 py-0.5 rounded-full border ${m.sameSize ? 'border-slate-300 dark:border-slate-600' : 'border-amber-300 text-amber-800 dark:text-amber-300'}`}>
                    {m.sameSize ? 'Cùng dung lượng' : 'Khác dung lượng'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-800 dark:text-slate-100">
                  {(['skip', 'keep', 'over'] as const).filter((value) => value !== 'over' || m.canOverwrite).map((value) => (
                    <label key={value} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={name}
                        checked={choiceOf(m) === value}
                        onChange={() => setChoices((prev) => new Map(prev).set(m.index, value))}
                      />
                      {value === 'skip' ? 'Bỏ qua' : value === 'keep' ? 'Giữ cả hai (tệp mới đổi tên)' : 'Ghi đè'}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
          {others > 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{others} tệp còn lại không trùng sẽ được tải lên bình thường.</p>}
        </div>
        <DialogFooter>
          <label className="mr-auto inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
            Áp dụng lựa chọn của tệp đầu tiên cho tất cả
          </label>
          <button type="button" onClick={onCancel} className={btn}>
            Hủy tải lên
          </button>
          <button type="button" onClick={confirm} className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 cursor-pointer">
            Tiếp tục
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
