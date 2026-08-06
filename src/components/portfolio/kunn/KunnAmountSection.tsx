import React from 'react';
import type { LimitGroupStatus } from '../../../lib/creditLimit';
import { addMonthsToDate, parseKunnTenorMonths } from '../../../lib/loanMath';
import { DollarSign } from 'lucide-react';
import { DateInput } from '../../DateInput';
import { formatMoneyInput, fmtMoney } from '../../../lib/utils';
import type { LoanContract } from '../../../types';

export interface KunnAmountSectionProps {
  sectionBoxBg: string;
  inputStyle: string;
  readonlyInputStyle: string;
  labelStyle: string;
  form: Partial<LoanContract>;
  setForm: React.Dispatch<React.SetStateAction<Partial<LoanContract>>>;
  formLimitStatus: LimitGroupStatus | undefined;
  totalExistingKunnBalance: number;
  remainingHmtdLimit: number;
  formLoanAmount: string;
  setFormLoanAmount: (v: string) => void;
}

export const KunnAmountSection: React.FC<KunnAmountSectionProps> = ({
  sectionBoxBg,
  inputStyle,
  readonlyInputStyle,
  labelStyle,
  form,
  setForm,
  formLimitStatus,
  totalExistingKunnBalance,
  remainingHmtdLimit,
  formLoanAmount,
  setFormLoanAmount,
}) => (
  <div className={`rounded-xl p-4 space-y-4 border ${sectionBoxBg}`}>
    <div className="text-[11px] font-bold text-pos uppercase tracking-wider flex items-center space-x-2">
      <DollarSign className="w-4 h-4" />
      <span>THÔNG TIN GIẤY NHẬN NỢ (KUNN) & GIẢI NGÂN LẦN NÀY</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className={`block mb-1 ${labelStyle}`}>
          {form.LoanMethod === 'Hạn mức tín dụng' ? 'Số tiền nhận nợ lần này (KUNN) *' : 'Số tiền giải ngân thực tế (KUNN) *'}
        </label>
        <input type="text" value={formLoanAmount}
          onChange={e => setFormLoanAmount(formatMoneyInput(e.target.value))}
          placeholder="650.000.000"
          className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold text-pos ${inputStyle}`} />
      </div>
      <div>
        <label className={`block mb-1 ${labelStyle}`}>
          {formLimitStatus?.revolving === false
            ? 'Đã nhận nợ trên HĐTD này'
            : 'Dư nợ HMTD hiện hữu (KUNN còn hiệu lực)'}
        </label>
        <input type="text" readOnly value={fmtMoney(totalExistingKunnBalance)}
          className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold text-warn ${readonlyInputStyle}`} />
      </div>
      <div>
        <label className={`block mb-1 ${labelStyle}`}>Hạn mức HMTD còn lại</label>
        <input type="text" readOnly value={fmtMoney(remainingHmtdLimit)}
          className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold ${remainingHmtdLimit >= 0 ? 'text-accent' : 'text-neg'
            } ${readonlyInputStyle}`} />
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-line">
      <div>
        <label className={`block mb-1 ${labelStyle}`}>Ngày giải ngân (bắt đầu KUNN)</label>
        <DateInput value={form.DisbursementDate || ''}
          onChange={disDate => {
            const months = parseKunnTenorMonths(form.KunnTenor) || form.LoanTenorMonths || 0;
            const kunnEnd = disDate && months > 0 ? addMonthsToDate(disDate, months) : form.KunnDueDate;
            setForm(f => ({ ...f, DisbursementDate: disDate, KunnDueDate: kunnEnd || f.KunnDueDate }));
          }}
          className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
      </div>
      <div>
        <label className={`block mb-1 ${labelStyle}`}>Thời hạn KUNN</label>
        {form.LoanMethod === 'Hạn mức tín dụng' ? (
          <select
            value={form.KunnTenor || '6 tháng'}
            onChange={e => {
              const val = e.target.value;
              const months = parseKunnTenorMonths(val);
              const kunnEnd = form.DisbursementDate && months > 0 ? addMonthsToDate(form.DisbursementDate, months) : form.KunnDueDate;
              setForm(f => ({ ...f, KunnTenor: val, KunnDueDate: kunnEnd || f.KunnDueDate }));
            }}
            className={`w-full rounded-xl p-2.5 text-xs font-bold text-accent ${inputStyle}`}
          >
            {['0 tháng', '3 tháng', '5 tháng', '6 tháng', '9 tháng', '12 tháng'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        ) : (
          <input type="text" value={form.KunnTenor || ''}
            onChange={e => {
              const val = e.target.value;
              const months = parseKunnTenorMonths(val);
              const kunnEnd = form.DisbursementDate && months > 0 ? addMonthsToDate(form.DisbursementDate, months) : form.KunnDueDate;
              setForm(f => ({ ...f, KunnTenor: val, KunnDueDate: kunnEnd || f.KunnDueDate }));
            }}
            placeholder="5T / 12 tháng..."
            className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
        )}
      </div>
      <div>
        <label className={`block mb-1 ${labelStyle}`}>
          <span>Ngày kết thúc KUNN</span>
        </label>
        <DateInput readOnly value={form.KunnDueDate || ''}
          className={`w-full rounded-xl p-2.5 text-xs font-mono font-bold text-accent border ${readonlyInputStyle}`} />
      </div>
      <div>
        <label className={`block mb-1 ${labelStyle}`}>Ngày bắt đầu trả nợ</label>
        <DateInput value={form.RepaymentStartDate || ''}
          onChange={val => setForm(f => ({ ...f, RepaymentStartDate: val }))}
          className={`w-full rounded-xl p-2.5 text-xs ${inputStyle}`} />
      </div>
    </div>
  </div>

);
