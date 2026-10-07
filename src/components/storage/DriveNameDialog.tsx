import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';

interface DriveNameDialogProps {
  title: string;
  label: string;
  initialValue?: string;
  submitLabel: string;
  /** Trả thông điệp lỗi (hiện ngay trong hộp thoại) hoặc null khi xong. */
  onSubmit: (value: string) => Promise<string | null>;
  onClose: () => void;
}

const field =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100';

/** Hộp thoại nhập một tên: dùng cho thư mục mới và đổi tên. Mở bằng cách gắn vào cây; đóng bằng gỡ khỏi cây. */
export function DriveNameDialog({ title, label, initialValue = '', submitLabel, onSubmit, onClose }: DriveNameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const failure = await onSubmit(value);
    setSaving(false);
    if (failure) setError(failure);
    else onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent size="sm" aria-describedby={undefined}>
        <form onSubmit={submit} aria-label={title}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="p-4 sm:p-5 space-y-2">
            <label htmlFor="drive-name-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <input
              id="drive-name-input"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className={field}
            />
            {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
          </div>
          <DialogFooter>
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
              Hủy
            </button>
            <button type="submit" disabled={saving || !value.trim()} className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 disabled:opacity-50 cursor-pointer">
              {submitLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
