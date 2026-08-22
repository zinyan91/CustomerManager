import React from 'react';
import { KunnHdtdSection } from './kunn/KunnHdtdSection';
import { KunnAmountSection } from './kunn/KunnAmountSection';
import { KunnRateSection, type KunnRateProps, type KunnAdjustmentProps } from './kunn/KunnRateSection';
import { KunnRepaymentSection } from './kunn/KunnRepaymentSection';
import { KunnCollateralSection } from './kunn/KunnCollateralSection';
import { FileText, X, Plus, Save, Trash2 } from 'lucide-react';
import type { LimitGroupStatus } from '../../lib/creditLimit';
import type { KunnIssue } from '../../lib/creditContract';
import type {
  LoanContract, CreditContract, Customer, Collateral,
} from '../../types';

export type { KunnRateProps, KunnAdjustmentProps };

export interface KunnLimitProps {
  formLimitStatus: LimitGroupStatus | undefined;
  kunnIssues: KunnIssue[];
  formGrantedLimit: number;
  totalExistingKunnBalance: number;
  availableBeforeThisKunn: number;
  remainingHmtdLimit: number;
}

export interface KunnAmountProps {
  formLoanAmount: string;
  setFormLoanAmount: (v: string) => void;
  formMonthlyPrincipal: string;
  setFormMonthlyPrincipal: (v: string) => void;
  suggestedMonthlyPrincipal: number;
}

export interface KunnFormProps {
  selectedContract: LoanContract | null;
  foundCustomer: Customer | null;
  setShowForm: (v: boolean) => void;

  form: Partial<LoanContract>;
  setForm: React.Dispatch<React.SetStateAction<Partial<LoanContract>>>;
  handleSaveContract: (e: React.FormEvent, forceInsert?: boolean) => void;
  handleDeleteContract: (e: React.MouseEvent, contractId: number, contractNumber: string) => void;
  loading: boolean;

  creditContracts: CreditContract[];
  selectableCreditContracts: CreditContract[];
  applyCreditContractToForm: (cc: CreditContract, keepKunnNumber?: boolean) => void;
  formCreditContract: CreditContract | null;

  formKunnNumber: string;
  setFormKunnNumber: (v: string) => void;

  limit: KunnLimitProps;
  amount: KunnAmountProps;
  rate: KunnRateProps;
  adjustment: KunnAdjustmentProps;
  showNotify: (type: 'success' | 'error', message: string) => void;

  graceOptions: number[];
  selectedCollaterals: Collateral[];
  maxAllowedLoanLtv: number;
}

export const KunnForm: React.FC<KunnFormProps> = ({
  selectedContract, foundCustomer, setShowForm,
  form, setForm, handleSaveContract, handleDeleteContract, loading,
  creditContracts, selectableCreditContracts, applyCreditContractToForm, formCreditContract,
  formKunnNumber, setFormKunnNumber,
  limit,
  amount,
  rate,
  adjustment,
  showNotify,
  graceOptions, selectedCollaterals, maxAllowedLoanLtv,
}) => {
  return (
    <div className="rounded-2xl p-4 sm:p-5 space-y-4 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card animate-in fade-in duration-150 font-app">
      <div className="flex items-center justify-between pb-3 border-b border-line/60">
        <h3 className="font-bold flex items-center space-x-2.5 text-sm text-accent">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent">
            <FileText className="w-4 h-4" />
          </div>
          <span className="tracking-tight uppercase">
            {selectedContract ? `THÔNG TIN GIẤY NHẬN NỢ: ${selectedContract.ContractNumber}` : 'GIẢI NGÂN KUNN MỚI'}
          </span>
        </h3>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="p-1 rounded-lg border border-line/60 text-ink-faint hover:text-ink hover:bg-surface cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSaveContract} className="space-y-5">
        <KunnHdtdSection
          selectedContract={selectedContract}
          foundCustomer={foundCustomer}
          form={form}
          setForm={setForm}
          creditContracts={creditContracts}
          selectableCreditContracts={selectableCreditContracts}
          applyCreditContractToForm={applyCreditContractToForm}
          formCreditContract={formCreditContract}
          formKunnNumber={formKunnNumber}
          setFormKunnNumber={setFormKunnNumber}
          formLimitStatus={limit.formLimitStatus}
          formGrantedLimit={limit.formGrantedLimit}
          totalExistingKunnBalance={limit.totalExistingKunnBalance}
          availableBeforeThisKunn={limit.availableBeforeThisKunn}
        />
        <KunnAmountSection
          form={form}
          setForm={setForm}
          formLimitStatus={limit.formLimitStatus}
          totalExistingKunnBalance={limit.totalExistingKunnBalance}
          remainingHmtdLimit={limit.remainingHmtdLimit}
          formLoanAmount={amount.formLoanAmount}
          setFormLoanAmount={amount.setFormLoanAmount}
          kunnIssues={limit.kunnIssues}
        />
        <KunnRateSection
          rate={rate}
          adjustment={adjustment}
          showNotify={showNotify}
        />
        <KunnRepaymentSection
          form={form}
          setForm={setForm}
          graceOptions={graceOptions}
          monthlyPrincipal={amount.formMonthlyPrincipal}
          setMonthlyPrincipal={amount.setFormMonthlyPrincipal}
          suggestedMonthlyPrincipal={amount.suggestedMonthlyPrincipal}
        />
        <KunnCollateralSection
          selectedCollaterals={selectedCollaterals}
          maxAllowedLoanLtv={maxAllowedLoanLtv}
        />

        <div className="flex items-center space-x-6 pt-1">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.IsSettled ?? false}
              onChange={e => setForm(f => ({ ...f, IsSettled: e.target.checked }))}
              className="w-4 h-4 rounded text-accent"
            />
            <span className="font-semibold text-xs text-ink">Hợp đồng đã tất toán</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.IsRestructured ?? false}
              onChange={e => setForm(f => ({ ...f, IsRestructured: e.target.checked }))}
              className="w-4 h-4 rounded text-accent"
            />
            <span className="font-semibold text-xs text-ink">Hợp đồng đã tái cơ cấu nợ</span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3 border-t border-line/60">
          <button
            type="button"
            onClick={(e) => handleSaveContract(e, true)}
            disabled={loading}
            className="w-full sm:flex-1 bg-accent hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold py-2.5 px-4 rounded-xl transition-all text-xs flex items-center justify-center space-x-2 shadow-md shadow-accent/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Đang lưu...' : 'THÊM MỚI KUNN'}</span>
          </button>
          {selectedContract && (
            <>
              <button
                type="button"
                onClick={(e) => handleSaveContract(e, false)}
                disabled={loading}
                className="w-full sm:flex-1 bg-accent hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold py-2.5 px-4 rounded-xl transition-all text-xs flex items-center justify-center space-x-2 shadow-md shadow-accent/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Đang lưu...' : 'CẬP NHẬT KUNN NÀY'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteContract(e, selectedContract.Id, selectedContract.ContractNumber)}
                disabled={loading}
                className="w-full sm:w-auto bg-neg hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold py-2.5 px-4 rounded-xl transition-all text-xs flex items-center justify-center space-x-2 shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>XOÁ KUNN</span>
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
