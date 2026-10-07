import { Check, X } from 'lucide-react';
import { PROGRESS_STEPS, type CustomerProgress } from '../../lib/customerProgress';

interface CustomerProgressCellProps {
  /** null: chưa nạp xong hoặc lỗi, không phải "chưa có". */
  progress: CustomerProgress | null;
  error?: string | null;
}

/** Ba hàng: Hợp đồng tín dụng, Quản lý khoản vay, Tài sản bảo đảm. Đã có thì dấu tích xanh, chưa có thì dấu chéo đỏ. */
export function CustomerProgressCell({ progress, error = null }: CustomerProgressCellProps) {
  if (!progress) {
    return (
      <span className={`text-xs ${error ? 'text-neg' : 'text-ink-faint'}`} title={error ?? undefined}>
        {error ? 'Không nạp được' : '…'}
      </span>
    );
  }
  return (
    <ul className="space-y-0.5 text-xs leading-snug" aria-label="Tiến độ hồ sơ">
      {PROGRESS_STEPS.map((step) => {
        const done = progress[step.key];
        return (
          <li key={step.key} className={`flex items-center gap-1.5 whitespace-nowrap font-medium ${done ? 'text-pos' : 'text-neg'}`}>
            {done ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            <span>{step.label}</span>
            <span className="sr-only">{done ? ': đã có' : ': chưa có'}</span>
          </li>
        );
      })}
    </ul>
  );
}
