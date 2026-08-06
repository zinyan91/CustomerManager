import React from 'react';
import { PRINCIPAL_REPAY_OPTIONS, INTEREST_REPAY_OPTIONS } from '../../../lib/loanProductRules';
import type { LoanContract } from '../../../types';

export interface KunnRepaymentSectionProps {
  sectionBoxBg: string;
  inputStyle: string;
  labelStyle: string;
  form: Partial<LoanContract>;
  setForm: React.Dispatch<React.SetStateAction<Partial<LoanContract>>>;
  graceOptions: number[];
}

export const KunnRepaymentSection: React.FC<KunnRepaymentSectionProps> = ({
  sectionBoxBg,
  inputStyle,
  labelStyle,
  form,
  setForm,
  graceOptions,
}) => (
  <div className={`rounded-xl p-4 space-y-3 border ${sectionBoxBg}`}>
    <div className="text-[11px] font-bold text-pos uppercase tracking-wider">
      PHƯƠNG THỨC TRẢ NỢ {form.LoanMethod === 'Hạn mức tín dụng' ? '' : '& ÂN HẠN'}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={`block mb-1 ${labelStyle}`}>Cách thức trả gốc</label>
        <select value={form.PrincipalRepaymentMethod || 'Gốc trả cuối kỳ'}
          disabled={form.LoanMethod === 'Hạn mức tín dụng'}
          onChange={e => setForm(f => ({ ...f, PrincipalRepaymentMethod: e.target.value }))}
          className={`w-full rounded-xl p-2.5 text-xs font-semibold ${inputStyle} ${form.LoanMethod === 'Hạn mức tín dụng' ? 'opacity-80 cursor-not-allowed bg-panel-muted font-bold text-accent' : ''}`}>
          {PRINCIPAL_REPAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label className={`block mb-1 ${labelStyle}`}>Cách thức trả lãi</label>
        <select value={form.InterestRepaymentMethod || 'Trả hàng tháng theo dư nợ thực tế'}
          disabled={form.LoanMethod === 'Hạn mức tín dụng'}
          onChange={e => setForm(f => ({ ...f, InterestRepaymentMethod: e.target.value }))}
          className={`w-full rounded-xl p-2.5 text-xs font-semibold ${inputStyle} ${form.LoanMethod === 'Hạn mức tín dụng' ? 'opacity-80 cursor-not-allowed bg-panel-muted font-bold text-accent' : ''}`}>
          {INTEREST_REPAY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>

    {graceOptions.length > 0 && (
      <div className="grid grid-cols-2 gap-4 pt-1 border-t border-line">
        <div>
          <label className={`block mb-1 ${labelStyle}`}>Ân hạn gốc (tháng)</label>
          <select value={form.PrincipalGracePeriodMonths ?? 0}
            onChange={e => setForm(f => ({ ...f, PrincipalGracePeriodMonths: parseInt(e.target.value) || 0 }))}
            className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`}>
            <option value={0}>Không ân hạn</option>
            {graceOptions.map(g => (
              <option key={g} value={g}>{g} tháng</option>
            ))}
          </select>
        </div>
        <div>
          <label className={`block mb-1 ${labelStyle}`}>Ân hạn lãi (tháng)</label>
          <input type="number" min={0} value={form.InterestGracePeriodMonths ?? 0}
            onChange={e => setForm(f => ({ ...f, InterestGracePeriodMonths: parseInt(e.target.value) || 0 }))}
            className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
        </div>
      </div>
    )}
  </div>

);
