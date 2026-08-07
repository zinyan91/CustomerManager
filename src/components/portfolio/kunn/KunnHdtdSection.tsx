import React from 'react';
import type { LimitGroupStatus } from '../../../lib/creditLimit';
import type { KunnIssue } from '../../../lib/creditContract';
import { FileText, AlertTriangle, Building2 } from 'lucide-react';
import { fmtMoney, fmtDate } from '../../../lib/utils';
import type { LoanContract, CreditContract, Customer } from '../../../types';

export interface KunnHdtdSectionProps {
  sectionBoxBg: string;
  inputStyle: string;
  labelStyle: string;
  selectedContract: LoanContract | null;
  foundCustomer: Customer | null;
  form: Partial<LoanContract>;
  setForm: React.Dispatch<React.SetStateAction<Partial<LoanContract>>>;
  creditContracts: CreditContract[];
  selectableCreditContracts: CreditContract[];
  applyCreditContractToForm: (cc: CreditContract, keepKunnNumber?: boolean) => void;
  formCreditContract: CreditContract | null;
  formKunnNumber: string;
  setFormKunnNumber: (v: string) => void;
  formLimitStatus: LimitGroupStatus | undefined;
  kunnIssues: KunnIssue[];
  formGrantedLimit: number;
  totalExistingKunnBalance: number;
  availableBeforeThisKunn: number;
}

export const KunnHdtdSection: React.FC<KunnHdtdSectionProps> = ({
  sectionBoxBg,
  inputStyle,
  labelStyle,
  selectedContract,
  foundCustomer,
  form,
  setForm,
  creditContracts,
  selectableCreditContracts,
  applyCreditContractToForm,
  formCreditContract,
  formKunnNumber,
  setFormKunnNumber,
  formLimitStatus,
  kunnIssues,
  formGrantedLimit,
  totalExistingKunnBalance,
  availableBeforeThisKunn,
}) => (
  <div className={`rounded-md p-4 space-y-4 border ${sectionBoxBg}`}>
    <div className="text-[11px] font-bold text-accent uppercase tracking-wider flex items-center space-x-2">
      <FileText className="w-4 h-4" />
      <span>HỢP ĐỒNG TÍN DỤNG CHA & PHÂN LOẠI NỢ</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className={`block mb-1 ${labelStyle}`}>Hợp đồng tín dụng (HĐTD) *</label>
        <select
          value={form.CreditContractId ?? ''}
          onChange={e => {
            const id = parseInt(e.target.value, 10);
            const cc = creditContracts.find(x => x.Id === id);
            if (cc) applyCreditContractToForm(cc, !!selectedContract);
          }}
          className={`w-full rounded-md p-2.5 text-xs font-mono font-bold text-accent ${inputStyle}`}>
          <option value="">— Chọn HĐTD —</option>
          {selectableCreditContracts.map(cc => (
            <option key={cc.Id} value={cc.Id}>{cc.HdtdNumber}</option>
          ))}
        </select>
        {creditContracts.length === 0 && (
          <div className="mt-1 text-[10px] font-semibold text-neg">
            Khách hàng chưa có HĐTD. Tạo ở tab Hợp Đồng Tín Dụng trước.
          </div>
        )}
      </div>
      <div>
        <label className={`block mb-1 ${labelStyle}`}>Số KUNN (GNN) *</label>
        <input type="text" value={formKunnNumber}
          onChange={e => setFormKunnNumber(e.target.value)}
          placeholder="2002/HDTD/9634078/GNN-01"
          className={`w-full rounded-md p-2.5 text-xs font-mono font-bold text-pos ${inputStyle}`} />
      </div>
      <div>
        <label className={`block mb-1 ${labelStyle}`}>Phân loại Nhóm nợ</label>
        <select value={form.DebtGroup ?? 1}
          onChange={e => setForm(f => ({ ...f, DebtGroup: Number(e.target.value) }))}
          className={`w-full rounded-md p-2.5 text-xs font-bold ${inputStyle}`}>
          {[1, 2, 3, 4, 5].map(g => (
            <option key={g} value={g}>
              Nhóm {g} ({g === 1 ? 'Nợ đủ tiêu chuẩn <10 ngày' : g === 2 ? 'Nợ cần chú ý 10-90 ngày' : g === 3 ? 'Nợ dưới tiêu chuẩn 91-180 ngày' : g === 4 ? 'Nợ nghi ngờ 181-360 ngày' : 'Nợ có khả năng mất vốn >360 ngày'})
            </option>
          ))}
        </select>
      </div>
    </div>

    {formCreditContract && (
      <div className={`rounded-md p-3 border text-[11px] ${'bg-panel border-line'
        }`}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono">
          <span className="text-ink-faint">{foundCustomer?.FullName} · CIF {foundCustomer?.CifKh}</span>
          <span>Phương thức: <strong>{formCreditContract.LoanMethod || '—'}</strong></span>
          <span>Mức cấp: <strong className="text-accent">{fmtMoney(formCreditContract.ContractAmount)}</strong></span>
          <span>Hiệu lực đến: <strong className={formLimitStatus?.expired ? 'text-neg' : ''}>
            {fmtDate(formCreditContract.ContractEndDate)}
          </strong></span>
          {formCreditContract.LoanPurposeType && (
            <span className="text-ink-faint">Mục đích: {formCreditContract.LoanPurposeType}</span>
          )}
        </div>
      </div>
    )}

    {kunnIssues.length > 0 && (
      <div className={`p-3 rounded-md border text-[11px] font-semibold space-y-1 ${'bg-warn-soft border-warn/30 text-warn'
        }`}>
        <div className="flex items-center space-x-1.5 uppercase tracking-wide">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Đối chiếu với HĐTD {formCreditContract?.HdtdNumber}</span>
        </div>
        {kunnIssues.map((x, i) => <div key={i}>• {x.message}</div>)}
      </div>
    )}

    {form.LoanMethod === 'Hạn mức tín dụng' && (
      <div className={`p-3 rounded-md border flex flex-wrap items-center justify-between text-xs font-semibold ${'bg-accent-soft border-accent/30 text-accent'
        }`}>
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-accent" />
          <span>TÌNH TRẠNG HẠN MỨC TÍN DỤNG:</span>
        </div>
        <div className="flex items-center space-x-4 font-mono">
          <span>Tổng mức cấp: <strong className="text-accent">{fmtMoney(formGrantedLimit)}</strong></span>
          <span>• Dư nợ KUNN còn hiệu lực: <strong className="text-warn">{fmtMoney(totalExistingKunnBalance)}</strong></span>
          <span>• Khả năng giải ngân còn lại: <strong className={
            formLimitStatus?.expired
              ? 'text-neg line-through'
              : 'text-pos'
          }>{fmtMoney(availableBeforeThisKunn)}</strong></span>
          {(formLimitStatus?.settledKunnCount ?? 0) > 0 && (
            <span className="text-[10px] font-app font-normal text-ink-faint">
              (đã loại {formLimitStatus!.settledKunnCount} KUNN đã tất toán)
            </span>
          )}
        </div>
        {formLimitStatus?.expired && (
          <div className="w-full mt-2 pt-2 border-t border-neg/30  text-[11px] font-bold text-neg">
            ⚠️ HĐTD hết hiệu lực ngày {fmtDate(formLimitStatus.endDate)}
          </div>
        )}
      </div>
    )}
  </div>

);
