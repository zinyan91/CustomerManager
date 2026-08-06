import React from 'react';
import { KunnHdtdSection } from './kunn/KunnHdtdSection';
import { KunnAmountSection } from './kunn/KunnAmountSection';
import { KunnRateSection } from './kunn/KunnRateSection';
import { KunnRepaymentSection } from './kunn/KunnRepaymentSection';
import { KunnCollateralSection } from './kunn/KunnCollateralSection';
import { FileText, X, Plus, Save, Trash2 } from 'lucide-react';
import type { LimitGroupStatus } from '../../lib/creditLimit';
import type { KunnIssue } from '../../lib/creditContract';
import type {
  LoanContract, CreditContract, Customer, Collateral, RateAdjustmentHistoryItem,
} from '../../types';

interface KunnFormProps {
  containerCardBg: string;
  sectionBoxBg: string;
  inputStyle: string;
  readonlyInputStyle: string;
  labelStyle: string;
  tableHeaderStyle: string;

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

  formLimitStatus: LimitGroupStatus | undefined;
  kunnIssues: KunnIssue[];
  formGrantedLimit: number;
  totalExistingKunnBalance: number;
  availableBeforeThisKunn: number;
  remainingHmtdLimit: number;

  formLoanAmount: string;
  setFormLoanAmount: (v: string) => void;

  interestRateMode: 'pref' | 'base';
  setInterestRateMode: (v: 'pref' | 'base') => void;
  ratePreferential: string;
  setRatePreferential: (v: string) => void;
  ratePreferentialMonths: string;
  setRatePreferentialMonths: (v: string) => void;
  rateBase: string;
  setRateBase: (v: string) => void;
  rateMargin: string;
  setRateMargin: (v: string) => void;
  postPrefRate: number;
  normalRate: number;
  surchargeVal: number;
  currentActiveRateDisplay: number;
  rateConditionSurcharge: string;
  setRateConditionSurcharge: (v: string) => void;
  rateFloor: string;
  setRateFloor: (v: string) => void;

  rateHistory: RateAdjustmentHistoryItem[];
  setRateHistory: (v: RateAdjustmentHistoryItem[]) => void;
  newAdjDate: string;
  setNewAdjDate: (v: string) => void;
  newAdjBaseRate: string;
  setNewAdjBaseRate: (v: string) => void;
  newAdjMargin: string;
  setNewAdjMargin: (v: string) => void;
  newAdjPenalty: string;
  setNewAdjPenalty: (v: string) => void;
  newAdjReason: string;
  setNewAdjReason: (v: string) => void;
  showNotify: (type: 'success' | 'error', message: string) => void;

  graceOptions: number[];
  selectedCollaterals: Collateral[];
  maxAllowedLoanLtv: number;
}

export const KunnForm: React.FC<KunnFormProps> = ({
  containerCardBg, sectionBoxBg, inputStyle, readonlyInputStyle, labelStyle, tableHeaderStyle,
  selectedContract, foundCustomer, setShowForm,
  form, setForm, handleSaveContract, handleDeleteContract, loading,
  creditContracts, selectableCreditContracts, applyCreditContractToForm, formCreditContract,
  formKunnNumber, setFormKunnNumber,
  formLimitStatus, kunnIssues, formGrantedLimit, totalExistingKunnBalance, availableBeforeThisKunn, remainingHmtdLimit,
  formLoanAmount, setFormLoanAmount,
  interestRateMode, setInterestRateMode,
  ratePreferential, setRatePreferential, ratePreferentialMonths, setRatePreferentialMonths,
  rateBase, setRateBase, rateMargin, setRateMargin,
  postPrefRate, normalRate, surchargeVal, currentActiveRateDisplay,
  rateConditionSurcharge, setRateConditionSurcharge, rateFloor, setRateFloor,
  rateHistory, setRateHistory,
  newAdjDate, setNewAdjDate, newAdjBaseRate, setNewAdjBaseRate, newAdjMargin, setNewAdjMargin,
  newAdjPenalty, setNewAdjPenalty, newAdjReason, setNewAdjReason, showNotify,
  graceOptions, selectedCollaterals, maxAllowedLoanLtv,
}) => {
  return (
    <div className={`${containerCardBg} rounded-lg p-5 space-y-5 border`}>
      <div className={`flex items-center justify-between pb-3 border-b ${'border-line'}`}>
        <h3 className="font-bold flex items-center space-x-2 text-sm">
          <FileText className="w-4 h-4 text-accent" />
          <span>{selectedContract ? `THÔNG TIN GIẤY NHẬN NỢ: ${selectedContract.ContractNumber}` : 'GIẢI NGÂN KUNN MỚI'}</span>
        </h3>
        <button onClick={() => setShowForm(false)} className="text-ink-faint hover:text-ink-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSaveContract} className="space-y-6">
        <KunnHdtdSection
          sectionBoxBg={sectionBoxBg}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
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
          formLimitStatus={formLimitStatus}
          kunnIssues={kunnIssues}
          formGrantedLimit={formGrantedLimit}
          totalExistingKunnBalance={totalExistingKunnBalance}
          availableBeforeThisKunn={availableBeforeThisKunn}
        />
        <KunnAmountSection
          sectionBoxBg={sectionBoxBg}
          inputStyle={inputStyle}
          readonlyInputStyle={readonlyInputStyle}
          labelStyle={labelStyle}
          form={form}
          setForm={setForm}
          formLimitStatus={formLimitStatus}
          totalExistingKunnBalance={totalExistingKunnBalance}
          remainingHmtdLimit={remainingHmtdLimit}
          formLoanAmount={formLoanAmount}
          setFormLoanAmount={setFormLoanAmount}
        />
        <KunnRateSection
          sectionBoxBg={sectionBoxBg}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          tableHeaderStyle={tableHeaderStyle}
          interestRateMode={interestRateMode}
          setInterestRateMode={setInterestRateMode}
          ratePreferential={ratePreferential}
          setRatePreferential={setRatePreferential}
          ratePreferentialMonths={ratePreferentialMonths}
          setRatePreferentialMonths={setRatePreferentialMonths}
          rateBase={rateBase}
          setRateBase={setRateBase}
          rateMargin={rateMargin}
          setRateMargin={setRateMargin}
          postPrefRate={postPrefRate}
          normalRate={normalRate}
          surchargeVal={surchargeVal}
          currentActiveRateDisplay={currentActiveRateDisplay}
          rateConditionSurcharge={rateConditionSurcharge}
          setRateConditionSurcharge={setRateConditionSurcharge}
          rateFloor={rateFloor}
          setRateFloor={setRateFloor}
          rateHistory={rateHistory}
          setRateHistory={setRateHistory}
          newAdjDate={newAdjDate}
          setNewAdjDate={setNewAdjDate}
          newAdjBaseRate={newAdjBaseRate}
          setNewAdjBaseRate={setNewAdjBaseRate}
          newAdjMargin={newAdjMargin}
          setNewAdjMargin={setNewAdjMargin}
          newAdjPenalty={newAdjPenalty}
          setNewAdjPenalty={setNewAdjPenalty}
          newAdjReason={newAdjReason}
          setNewAdjReason={setNewAdjReason}
          showNotify={showNotify}
        />
        <KunnRepaymentSection
          sectionBoxBg={sectionBoxBg}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          form={form}
          setForm={setForm}
          graceOptions={graceOptions}
        />
        <KunnCollateralSection
          sectionBoxBg={sectionBoxBg}
          selectedCollaterals={selectedCollaterals}
          maxAllowedLoanLtv={maxAllowedLoanLtv}
        />

      <div className="flex items-center space-x-6">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" checked={form.IsSettled ?? false}
            onChange={e => setForm(f => ({ ...f, IsSettled: e.target.checked }))}
            className="w-4 h-4 rounded text-accent" />
          <span className={`font-medium ${'text-ink'}`}>Hợp đồng đã tất toán</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" checked={form.IsRestructured ?? false}
            onChange={e => setForm(f => ({ ...f, IsRestructured: e.target.checked }))}
            className="w-4 h-4 rounded text-accent" />
          <span className={`font-medium ${'text-ink'}`}>Hợp đồng đã tái cơ cấu nợ</span>
        </label>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-3 pt-2">
        <button
          type="button"
          onClick={(e) => handleSaveContract(e, true)}
          disabled={loading}
          className="flex-1 bg-accent hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold py-3 px-4 rounded-md transition-colors  text-xs flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>{loading ? 'Đang lưu...' : 'THÊM MỚI'}</span>
        </button>
        {selectedContract && (
          <>
            <button
              type="button"
              onClick={(e) => handleSaveContract(e, false)}
              disabled={loading}
              className="flex-1 bg-accent hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold py-3 px-4 rounded-md transition-colors  text-xs flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Đang lưu...' : 'CẬP NHẬT KUNN NÀY'}</span>
            </button>
            <button
              type="button"
              onClick={(e) => handleDeleteContract(e, selectedContract.Id, selectedContract.ContractNumber)}
              disabled={loading}
              className="bg-neg hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold py-3 px-4 rounded-md transition-colors  text-xs flex items-center justify-center space-x-2"
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
