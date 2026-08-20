import { useNavigate } from 'react-router';
import { UserCog } from 'lucide-react';
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { useCustomerContext } from '../hooks/useCustomerContext';
import { fmtMoney } from '../lib/utils';
import { ROUTE_OF } from '../lib/routes';
import { BTN_SECONDARY, DEBT_GROUP_COLOR, PANEL, RADIUS_PILL, SECTION_LABEL } from '../lib/uiClasses';

export function CustomerContextBar() {
  const customerId = useSelectedCustomerId();
  const { customer, summary, loading, error } = useCustomerContext(customerId);
  const navigate = useNavigate();

  if (customerId === null) return null;

  const khach = loading ? null : customer;
  const tomTat = loading ? null : summary;
  const nhom = tomTat?.debtGroup ?? 1;

  return (
    <div data-testid="thanh-ngu-canh" className={`${PANEL} px-4 py-2.5 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2`}>
      <div className="min-w-0">
        <div className={SECTION_LABEL}>Khách hàng</div>
        <div className="text-sm font-semibold text-ink truncate">
          {khach?.FullName ?? (loading ? '…' : '—')}
        </div>
      </div>

      <div className="text-xs text-ink-muted">
        CIF <span className="font-mono text-ink">{khach?.CifKh ?? '—'}</span>
        {' · '}
        <span className="font-mono text-ink">{khach?.Phone || '—'}</span>
      </div>

      <div>
        <div className={SECTION_LABEL}>Dư nợ</div>
        <div className="text-sm font-semibold text-pos tabular-nums">
          {tomTat ? fmtMoney(tomTat.outstanding) : '…'}
        </div>
      </div>

      <div>
        <div className={SECTION_LABEL}>Hạn mức khả dụng</div>
        <div className="text-sm font-semibold text-ink tabular-nums">
          {tomTat ? fmtMoney(tomTat.available) : '…'}
        </div>
      </div>

      {tomTat && (
        <span className={`${RADIUS_PILL} ${DEBT_GROUP_COLOR[nhom]} text-surface px-2.5 py-0.5 text-[11px] font-semibold`}>
          Nhóm {nhom}
          {tomTat.maxOverdueDays > 0 && ` · quá hạn ${tomTat.maxOverdueDays} ngày`}
        </span>
      )}

      {error && <span className="text-xs text-neg font-semibold">{error}</span>}

      <button
        type="button"
        onClick={() => navigate(ROUTE_OF.customers)}
        className={`${BTN_SECONDARY} ml-auto text-xs py-1.5 px-3 inline-flex items-center gap-1.5`}
      >
        <UserCog className="w-3.5 h-3.5" />
        Đổi khách hàng
      </button>
    </div>
  );
}
