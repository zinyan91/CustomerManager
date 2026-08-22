import React from 'react';
import type { LimitGroupStatus } from '../../../lib/creditLimit';
import type { KunnIssue } from '../../../lib/creditContract';
import { addMonthsToDate, parseKunnTenorMonths } from '../../../lib/loanMath';
import { DollarSign } from 'lucide-react';
import { DateInput } from '../../DateInput';
import { formatMoneyInput, fmtMoney } from '../../../lib/utils';
import type { LoanContract } from '../../../types';
import { UI } from '../../../lib/uiClasses';
import { getLoanAmountFieldLabel, isRevolvingTenorSelect } from '../../../lib/kunnFormRules';

export interface KunnAmountSectionProps {
  form: Partial<LoanContract>;
  setForm: React.Dispatch<React.SetStateAction<Partial<LoanContract>>>;
  formLimitStatus: LimitGroupStatus | undefined;
  totalExistingKunnBalance: number;
  remainingHmtdLimit: number;
  formLoanAmount: string;
  setFormLoanAmount: (v: string) => void;
  kunnIssues: KunnIssue[];
}

const issuesFor = (issues: KunnIssue[], field: KunnIssue['field']) =>
  issues.filter(x => x.field === field);

const FieldIssues: React.FC<{ issues: KunnIssue[] }> = ({ issues }) =>
  issues.length === 0 ? null : (
    <div className="mt-1 space-y-0.5">
      {issues.map((x, i) => (
        <div key={i} className="text-[10px] font-semibold text-warn">{x.message}</div>
      ))}
    </div>
  );

export const KunnAmountSection: React.FC<KunnAmountSectionProps> = ({
  form,
  setForm,
  formLimitStatus,
  totalExistingKunnBalance,
  remainingHmtdLimit,
  formLoanAmount,
  setFormLoanAmount,
  kunnIssues,
}) => (
  <div className={`rounded-md p-4 space-y-4 border ${UI.sectionBoxBg}`}>
    <div className="text-[11px] font-bold text-pos uppercase tracking-wider flex items-center space-x-2">
      <DollarSign className="w-4 h-4" />
      <span>THÔNG TIN GIẤY NHẬN NỢ (KUNN) & GIẢI NGÂN LẦN NÀY</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>
          {getLoanAmountFieldLabel(form.LoanMethod)}
        </label>
        <input type="text" value={formLoanAmount}
          onChange={e => setFormLoanAmount(formatMoneyInput(e.target.value))}
          placeholder="650.000.000"
          className={`w-full rounded-md p-2.5 text-sm font-mono font-bold text-pos ${UI.inputStyle}`} />
        <FieldIssues issues={issuesFor(kunnIssues, 'LoanAmount')} />
      </div>
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>
          {formLimitStatus?.revolving === false
            ? 'Đã nhận nợ trên HĐTD này'
            : 'Dư nợ HMTD hiện hữu (KUNN còn hiệu lực)'}
        </label>
        <input type="text" readOnly value={fmtMoney(totalExistingKunnBalance)}
          className={`w-full rounded-md p-2.5 text-sm font-mono font-bold text-warn ${UI.readonlyInputStyle}`} />
      </div>
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>Hạn mức HMTD còn lại</label>
        <input type="text" readOnly value={fmtMoney(remainingHmtdLimit)}
          className={`w-full rounded-md p-2.5 text-sm font-mono font-bold ${remainingHmtdLimit >= 0 ? 'text-accent' : 'text-neg'
            } ${UI.readonlyInputStyle}`} />
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-line">
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>Ngày giải ngân (bắt đầu KUNN)</label>
        <DateInput value={form.DisbursementDate || ''}
          onChange={disDate => {
            const months = parseKunnTenorMonths(form.KunnTenor) || form.LoanTenorMonths || 0;
            const kunnEnd = disDate && months > 0 ? addMonthsToDate(disDate, months) : form.KunnDueDate;
            setForm(f => ({ ...f, DisbursementDate: disDate, KunnDueDate: kunnEnd || f.KunnDueDate }));
          }}
          className={`w-full rounded-md p-2.5 text-xs ${UI.inputStyle}`} />
        <FieldIssues issues={issuesFor(kunnIssues, 'DisbursementDate')} />
      </div>
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>Thời hạn KUNN *</label>
        {isRevolvingTenorSelect(form.LoanMethod) ? (
          <select
            required
            value={form.KunnTenor || ''}
            onChange={e => {
              const val = e.target.value;
              const months = parseKunnTenorMonths(val);
              const kunnEnd = form.DisbursementDate && months > 0 ? addMonthsToDate(form.DisbursementDate, months) : form.KunnDueDate;
              setForm(f => ({ ...f, KunnTenor: val, KunnDueDate: kunnEnd || f.KunnDueDate }));
            }}
            className={`w-full rounded-md p-2.5 text-xs font-bold text-accent ${UI.inputStyle}`}
          >
            <option value="">— Chọn thời hạn —</option>
            {['0 tháng', '3 tháng', '5 tháng', '6 tháng', '9 tháng', '12 tháng'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        ) : (
          <input type="text" required value={form.KunnTenor || ''}
            onChange={e => {
              const val = e.target.value;
              const months = parseKunnTenorMonths(val);
              const kunnEnd = form.DisbursementDate && months > 0 ? addMonthsToDate(form.DisbursementDate, months) : form.KunnDueDate;
              setForm(f => ({ ...f, KunnTenor: val, KunnDueDate: kunnEnd || f.KunnDueDate }));
            }}
            placeholder="5T / 12 tháng..."
            className={`w-full rounded-md p-2.5 text-xs ${UI.inputStyle}`} />
        )}
        <FieldIssues issues={issuesFor(kunnIssues, 'KunnTenor')} />
      </div>
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>
          <span>Ngày kết thúc KUNN</span>
        </label>
        <DateInput readOnly value={form.KunnDueDate || ''}
          className={`w-full rounded-md p-2.5 text-xs font-mono font-bold text-accent border ${UI.readonlyInputStyle}`} />
        <FieldIssues issues={issuesFor(kunnIssues, 'KunnDueDate')} />
      </div>
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>Ngày bắt đầu trả nợ</label>
        <DateInput value={form.RepaymentStartDate || ''}
          onChange={val => setForm(f => ({ ...f, RepaymentStartDate: val }))}
          className={`w-full rounded-md p-2.5 text-xs ${UI.inputStyle}`} />
      </div>
    </div>
  </div>

);
