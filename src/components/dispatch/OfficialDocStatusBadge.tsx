import type { OfficialDocStatus } from '../../types/officialDoc';
import { statusLabel } from '../../lib/officialDoc/status';

const STYLES: Record<OfficialDocStatus, string> = {
  active: 'border-emerald-600/40 text-emerald-800 dark:text-emerald-300',
  upcoming: 'border-amber-600/40 text-amber-800 dark:text-amber-300',
  expired: 'border-slate-400/60 text-slate-500 dark:text-slate-400',
};

export function OfficialDocStatusBadge({ status }: { status: OfficialDocStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium whitespace-nowrap ${STYLES[status]}`}>
      {statusLabel(status)}
    </span>
  );
}
