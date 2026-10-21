import type { LoanProgressInput } from '../../types/loanProgress';

const STAGE_COLORS: Record<LoanProgressInput['Stage'], string> = {
  'Mới nhận hồ sơ': 'bg-panel-muted text-ink-muted border-line',
  'Thu thập hồ sơ': 'bg-panel-muted text-ink-muted border-line',
  'Đã gửi định giá': 'bg-accent-soft text-accent border-accent/25',
  'Đang lập tờ trình': 'bg-accent-soft text-accent border-accent/25',
  'Đã trình ký': 'bg-accent-soft text-accent border-accent/25',
  'Đã trình HO': 'bg-accent-soft text-accent border-accent/25',
  'Chờ phê duyệt': 'bg-warn-soft text-warn border-warn/25',
  'Đã có phê duyệt': 'bg-pos-soft text-pos border-pos/25',
  'Đang công chứng': 'bg-accent-soft text-accent border-accent/25',
  'Chờ giải ngân': 'bg-warn-soft text-warn border-warn/25',
  'Đã giải ngân': 'bg-pos-soft text-pos border-pos/25',
};

export function ProgressStageBadge({ stage }: { stage: LoanProgressInput['Stage'] }) {
  return <span className={`inline-flex items-center rounded-[var(--r-control)] border px-2 py-1 text-[11px] font-semibold ${STAGE_COLORS[stage]}`}>
    {stage}
  </span>;
}
