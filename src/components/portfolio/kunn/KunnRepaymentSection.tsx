import React from 'react';
import { PRINCIPAL_REPAY_OPTIONS, INTEREST_REPAY_OPTIONS } from '../../../lib/loanProductRules';
import { isBulletPrincipal } from '../../../lib/loanMath';
import { formatMoneyInput, fmtMoney } from '../../../lib/utils';
import type { LoanContract } from '../../../types';
import { UI } from '../../../lib/uiClasses';
import {
  isRevolvingCredit,
  isPrincipalRepaymentLocked,
  isInterestRepaymentLocked,
} from '../../../lib/kunnFormRules';

export interface KunnRepaymentSectionProps {
  form: Partial<LoanContract>;
  setForm: React.Dispatch<React.SetStateAction<Partial<LoanContract>>>;
  graceOptions: number[];
  monthlyPrincipal: string;
  setMonthlyPrincipal: (v: string) => void;
  suggestedMonthlyPrincipal: number;
}

export const KunnRepaymentSection: React.FC<KunnRepaymentSectionProps> = ({
  form,
  setForm,
  graceOptions,
  monthlyPrincipal,
  setMonthlyPrincipal,
  suggestedMonthlyPrincipal,
}) => (
  <div className={`rounded-md p-4 space-y-3 border ${UI.sectionBoxBg}`}>
    <div className="text-[11px] font-bold text-pos uppercase tracking-wider">
      PHƯƠNG THỨC TRẢ NỢ {isRevolvingCredit(form.LoanMethod) ? '' : '& ÂN HẠN'}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>Cách thức trả gốc</label>
        <select value={form.PrincipalRepaymentMethod || 'Gốc trả cuối kỳ'}
          disabled={isPrincipalRepaymentLocked(form.LoanMethod)}
          onChange={e => setForm(f => ({ ...f, PrincipalRepaymentMethod: e.target.value }))}
          className={`w-full rounded-md p-2.5 text-xs font-semibold ${UI.inputStyle} ${isPrincipalRepaymentLocked(form.LoanMethod) ? 'opacity-80 cursor-not-allowed bg-panel-muted font-bold text-accent' : ''}`}>
          {PRINCIPAL_REPAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>Cách thức trả lãi</label>
        <select value={form.InterestRepaymentMethod || 'Trả hàng tháng theo dư nợ thực tế'}
          disabled={isInterestRepaymentLocked(form.LoanMethod)}
          onChange={e => setForm(f => ({ ...f, InterestRepaymentMethod: e.target.value }))}
          className={`w-full rounded-md p-2.5 text-xs font-semibold ${UI.inputStyle} ${isInterestRepaymentLocked(form.LoanMethod) ? 'opacity-80 cursor-not-allowed bg-panel-muted font-bold text-accent' : ''}`}>
          {INTEREST_REPAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>

    {!isBulletPrincipal(form) && (
      <div className="pt-1 border-t border-line">
        <label className={`block mb-1 ${UI.labelStyle}`}>Gốc mỗi kỳ theo GNN</label>
        <input type="text" value={monthlyPrincipal}
          onChange={e => setMonthlyPrincipal(formatMoneyInput(e.target.value))}
          placeholder={suggestedMonthlyPrincipal > 0 ? formatMoneyInput(String(suggestedMonthlyPrincipal)) : ''}
          className={`w-full rounded-md p-2.5 text-sm font-mono font-bold ${UI.inputStyle}`} />
        <div className="mt-1 text-[10px] text-ink-faint">
          {suggestedMonthlyPrincipal > 0
            ? `Để trống: hệ thống tính ${fmtMoney(suggestedMonthlyPrincipal)}. Chỉ khai khi GNN ghi số khác.`
            : 'Để trống: hệ thống tự tính từ số tiền vay và số kỳ trả gốc.'}
        </div>
      </div>
    )}

    {graceOptions.length > 0 && (
      <div className="grid grid-cols-2 gap-4 pt-1 border-t border-line">
        <div>
          <label className={`block mb-1 ${UI.labelStyle}`}>Ân hạn gốc (tháng)</label>
          <select value={form.PrincipalGracePeriodMonths ?? 0}
            onChange={e => setForm(f => ({ ...f, PrincipalGracePeriodMonths: parseInt(e.target.value) || 0 }))}
            className={`w-full rounded-md p-2.5 text-xs ${UI.inputStyle}`}>
            <option value={0}>Không ân hạn</option>
            {graceOptions.map(g => (
              <option key={g} value={g}>{g} tháng</option>
            ))}
          </select>
        </div>
        <div>
          <label className={`block mb-1 ${UI.labelStyle}`}>Ân hạn lãi (tháng)</label>
          <input type="number" min={0} value={form.InterestGracePeriodMonths ?? 0}
            onChange={e => setForm(f => ({ ...f, InterestGracePeriodMonths: parseInt(e.target.value) || 0 }))}
            className={`w-full rounded-md p-2.5 text-xs ${UI.inputStyle}`} />
        </div>
      </div>
    )}
  </div>

);
