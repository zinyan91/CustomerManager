import { useLocation } from 'react-router';
import { UserCheck } from 'lucide-react';
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { useCustomerContext } from '../hooks/useCustomerContext';
import { fmtMoney } from '../lib/utils';
import { DEBT_GROUP_COLOR, RADIUS_PILL, SECTION_LABEL } from '../lib/uiClasses';

export function CustomerContextBar() {
  const customerId = useSelectedCustomerId();
  const { customer, summary, loading, error } = useCustomerContext(customerId);
  const { pathname } = useLocation();
  const isLoanPage = /^\/customers\/\d+\/loans(?:\/|$)/.test(pathname);

  if (customerId === null) return null;

  const khach = loading ? null : customer;
  const tomTat = loading ? null : summary;
  const nhom = tomTat?.debtGroup ?? 1;

  return (
    <div
      data-testid="thanh-ngu-canh"
      data-workspace-panel
      className="glass-floating-panel specular-card rounded-2xl p-3 sm:px-4 sm:py-2.5 mb-5 workspace-customer-context flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 shadow-lg shadow-black/10 animate-in fade-in duration-150"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-accent-soft border border-accent/30 text-accent font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
          <UserCheck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className={SECTION_LABEL}>Khách hàng đang chọn</div>
          <div className="text-xs sm:text-sm font-bold text-ink truncate flex items-center gap-2">
            <span>{khach?.FullName ?? (loading ? '…' : '—')}</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-surface border border-line text-accent font-semibold">
              CIF: {khach?.CifKh ?? '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3.5 sm:gap-5">
        {!isLoanPage && (
          <>
            <div>
              <div className={SECTION_LABEL}>Dư nợ hiện hành</div>
              <div className="text-xs sm:text-sm font-bold text-pos tabular-nums">
                {tomTat ? fmtMoney(tomTat.outstanding) : '…'}
              </div>
            </div>

            <div>
              <div className={SECTION_LABEL}>Hạn mức khả dụng</div>
              <div className="text-xs sm:text-sm font-bold text-ink tabular-nums">
                {tomTat ? fmtMoney(tomTat.available) : '…'}
              </div>
            </div>
          </>
        )}

        {tomTat && (
          <div className="flex items-center gap-1.5">
            <span className={`${RADIUS_PILL} ${DEBT_GROUP_COLOR[nhom]} text-surface px-2.5 py-0.5 text-[11px] font-bold shadow-2xs`}>
              Nhóm {nhom}
              {tomTat.maxOverdueDays > 0 && ` · quá hạn ${tomTat.maxOverdueDays} ngày`}
            </span>
          </div>
        )}

        {error && <span role="alert" className="text-xs text-neg font-semibold">{error}</span>}
      </div>
    </div>
  );
}
