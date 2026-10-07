import { useMemo, useState, type FormEvent } from 'react';
import { Folder } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';

interface DriveMoveDialogProps {
  /** Mọi thư mục của kho (đường dẫn từ gốc kho). */
  folders: readonly string[];
  /** Các mục đang di chuyển: thư mục trong số đó và thư mục con của chúng không được chọn làm đích. */
  moving: readonly string[];
  onSubmit: (destPath: string) => Promise<string | null>;
  onClose: () => void;
}

const lower = (s: string) => s.toLowerCase();

/** Hộp thoại chọn thư mục đích để di chuyển. "Gốc" là thư mục gốc của kho. */
export function DriveMoveDialog({ folders, moving, onSubmit, onClose }: DriveMoveDialogProps) {
  const [dest, setDest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const choices = useMemo(() => {
    const blocked = moving.map(lower);
    return [...folders]
      .filter((f) => !blocked.some((b) => lower(f) === b || lower(f).startsWith(`${b}/`)))
      .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [folders, moving]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (dest === null) return;
    setSaving(true);
    setError(null);
    const failure = await onSubmit(dest);
    setSaving(false);
    if (failure) setError(failure);
    else onClose();
  };

  const option = (path: string, label: string, depth: number) => (
    <label
      key={path || '__root'}
      style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
      className="flex items-center gap-2 py-1.5 pr-3 rounded-md text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
    >
      <input type="radio" name="drive-move-dest" checked={dest === path} onChange={() => setDest(path)} aria-label={label} />
      <Folder className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <span className="truncate">{label}</span>
    </label>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent size="md" aria-describedby={undefined}>
        <form onSubmit={submit} aria-label="Di chuyển">
          <DialogHeader>
            <DialogTitle>{moving.length > 1 ? `Di chuyển ${moving.length} mục` : 'Di chuyển'}</DialogTitle>
          </DialogHeader>
          <div className="p-4 sm:p-5 space-y-2">
            <div className="max-h-72 overflow-y-auto custom-scrollbar" role="radiogroup" aria-label="Thư mục đích">
              {option('', 'Gốc', 0)}
              {choices.map((f) => option(f, f.split('/').pop() ?? f, f.split('/').length))}
            </div>
            {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
          </div>
          <DialogFooter>
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
              Hủy
            </button>
            <button type="submit" disabled={saving || dest === null} className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 disabled:opacity-50 cursor-pointer">
              Di chuyển vào đây
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
