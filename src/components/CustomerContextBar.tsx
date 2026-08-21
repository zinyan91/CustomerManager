import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { UserCog, UserCheck, ChevronDown } from 'lucide-react';
import { useSelectedCustomerId, useCustomerNavigate } from '../hooks/useSelectedCustomerId';
import { useCustomerContext } from '../hooks/useCustomerContext';
import { fetchCustomersAPI } from '../lib/api';
import { fmtMoney } from '../lib/utils';
import { ROUTE_OF } from '../lib/routes';
import { BTN_SECONDARY, DEBT_GROUP_COLOR, RADIUS_PILL, SECTION_LABEL } from '../lib/uiClasses';
import type { Customer } from '../types';

export function CustomerContextBar() {
  const customerId = useSelectedCustomerId();
  const navigateCustomer = useCustomerNavigate();
  const { customer, summary, loading, error } = useCustomerContext(customerId);
  const navigate = useNavigate();
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchCustomersAPI({}).then(setAllCustomers).catch(() => {});
  }, []);

  if (customerId === null) return null;

  const khach = loading ? null : customer;
  const tomTat = loading ? null : summary;
  const nhom = tomTat?.debtGroup ?? 1;

  return (
    <div
      data-testid="thanh-ngu-canh"
      className="glass-floating-panel specular-card rounded-2xl p-3 sm:px-4 sm:py-2.5 mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 shadow-lg shadow-black/10 animate-in fade-in duration-150"
    >
      {/* Khối danh tính khách hàng */}
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
            {khach?.Phone && (
              <span className="font-mono text-[11px] text-ink-muted hidden sm:inline">
                · {khach.Phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Khối chỉ số dư nợ & Cụm chuyển đổi nhanh tức thì */}
      <div className="flex flex-wrap items-center gap-3.5 sm:gap-5">
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

        {tomTat && (
          <div className="flex items-center gap-1.5">
            <span className={`${RADIUS_PILL} ${DEBT_GROUP_COLOR[nhom]} text-surface px-2.5 py-0.5 text-[11px] font-bold shadow-2xs`}>
              Nhóm {nhom}
              {tomTat.maxOverdueDays > 0 && ` · quá hạn ${tomTat.maxOverdueDays} ngày`}
            </span>
          </div>
        )}

        {error && <span className="text-xs text-neg font-semibold">{error}</span>}

        {/* Dropdown Đổi Khách Hàng Tức Thì — Giữ nguyên màn hình hiện tại */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <select
              aria-label="Chọn đổi khách hàng tức thì"
              value={customerId ?? ''}
              onChange={e => {
                const val = e.target.value;
                if (val === '__all__') {
                  navigate(ROUTE_OF.customers);
                } else if (val) {
                  navigateCustomer(parseInt(val, 10));
                }
              }}
              className="rounded-xl pl-3 pr-7 py-1.5 text-xs font-bold text-ink border border-line/70 bg-surface/90 hover:bg-surface focus:border-accent transition-colors shadow-2xs cursor-pointer max-w-[170px] sm:max-w-[210px] truncate appearance-none"
            >
              <option value="" disabled>— Đổi khách hàng ngay —</option>
              {allCustomers.map(c => (
                <option key={c.Id} value={c.Id}>
                  {c.FullName} ({c.CifKh})
                </option>
              ))}
              <option value="__all__">📂 Quản lý danh sách KH...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-faint absolute right-2.5 pointer-events-none" />
          </div>

          <button
            type="button"
            aria-label="Đổi khách hàng"
            onClick={() => navigate(ROUTE_OF.customers)}
            className={`${BTN_SECONDARY} text-xs py-1.5 px-2.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs hover:bg-surface`}
            title="Mở toàn bộ danh sách khách hàng"
          >
            <UserCog className="w-3.5 h-3.5 text-accent" />
            <span className="hidden md:inline">DS Khách</span>
          </button>
        </div>
      </div>
    </div>
  );
}
