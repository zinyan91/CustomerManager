import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { BusinessPlan, BusinessPlanDebt, CreditContract } from '../../types';
import type { BusinessPlanResult } from '../../lib/businessPlan';
import { UI } from '../../lib/uiClasses';
import { fmtMoney } from '../../lib/utils';
import { DateInput } from '../DateInput';
import { Block, CountField, MoneyField, PercentField, ReadOnlyRow } from './fields';
import type { MoneyUnit } from './units';

interface Props {
  draft: BusinessPlan;
  debts: BusinessPlanDebt[];
  result: BusinessPlanResult;
  unit: MoneyUnit;
  creditContracts: CreditContract[];
  onChange: <K extends keyof BusinessPlan>(field: K, value: BusinessPlan[K]) => void;
  onDebtsChange: (debts: BusinessPlanDebt[]) => void;
}

const BASIS_FIELDS: { field: keyof BusinessPlan; label: string }[] = [
  { field: 'BasisRevenue', label: 'Doanh thu' },
  { field: 'BasisCogs', label: 'Tổng chi phí' },
  { field: 'BasisStaff', label: 'Chi phí nhân công' },
  { field: 'BasisPremises', label: 'Chi phí thuê mặt bằng' },
  { field: 'BasisUtilities', label: 'Chi phí điện nước' },
  { field: 'BasisInterest', label: 'Chi phí lãi vay' },
  { field: 'BasisDepreciation', label: 'Chi phí khấu hao' },
  { field: 'BasisOther', label: 'Chi phí khác' },
  { field: 'BasisTax', label: 'Thuế' },
  { field: 'BasisProfit', label: 'Lợi nhuận' },
];

export const BusinessPlanForm: React.FC<Props> = ({
  draft, debts, result, unit, creditContracts, onChange, onDebtsChange,
}) => {
  const money = (label: string, field: keyof BusinessPlan, hint?: string) => (
    <MoneyField
      label={label}
      unit={unit}
      hint={hint}
      value={Number(draft[field] ?? 0)}
      onChange={v => onChange(field, v as BusinessPlan[typeof field])}
    />
  );

  const percent = (label: string, field: keyof BusinessPlan, hint?: string) => (
    <PercentField
      label={label}
      hint={hint}
      value={Number(draft[field] ?? 0)}
      onChange={v => onChange(field, v as BusinessPlan[typeof field])}
    />
  );

  const setDebt = (index: number, patch: Partial<BusinessPlanDebt>) => {
    onDebtsChange(debts.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addDebt = () => {
    onDebtsChange([...debts, {
      Id: -Date.now(), PlanId: draft.Id, Label: '', Principal: 0,
      RateAnnualPercent: 0, Scope: 'both', SortOrder: debts.length,
    }]);
  };

  return (
    <div className="space-y-3">
      <Block title="Thông tin chung">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="block">
            <span className={`block mb-1 text-[11px] ${UI.labelStyle}`}>Loại hồ sơ</span>
            <select value={draft.PlanKind}
              onChange={e => onChange('PlanKind', e.target.value as BusinessPlan['PlanKind'])}
              className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle}`}>
              <option value="limit">Cấp hạn mức tín dụng</option>
              <option value="each_time">Cho vay từng lần</option>
            </select>
          </label>
          <label className="block">
            <span className={`block mb-1 text-[11px] ${UI.labelStyle}`}>Hợp đồng tín dụng</span>
            <select value={draft.CreditContractId ?? ''}
              onChange={e => onChange('CreditContractId', e.target.value ? parseInt(e.target.value, 10) : null)}
              className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle}`}>
              <option value="">— Chưa gắn —</option>
              {creditContracts.map(c => (
                <option key={c.Id} value={c.Id}>{c.HdtdNumber}</option>
              ))}
            </select>
          </label>
          <CountField label="Năm thực hiện" value={draft.ActualYear}
            onChange={v => onChange('ActualYear', v)} />
          <CountField label="Năm kế hoạch" value={draft.PlanYear}
            onChange={v => onChange('PlanYear', v)} />
          <label className="block">
            <span className={`block mb-1 text-[11px] ${UI.labelStyle}`}>Thời điểm bảng cân đối</span>
            <DateInput value={draft.BalanceSheetDate}
              onChange={v => onChange('BalanceSheetDate', v)}
              className={`w-full rounded-md p-2 text-xs border font-mono ${UI.inputStyle}`} />
          </label>
        </div>
      </Block>

      <Block title="Bảng cân đối">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Tài sản</div>
            {money('Tiền, tương đương tiền', 'Cash')}
            {money('Hàng tồn kho', 'Inventory')}
            {money('Các khoản phải thu', 'Receivables')}
            {money('Tài sản ngắn hạn khác', 'OtherCurrentAssets')}
            {money('Các khoản phải thu dài hạn', 'LongTermReceivables')}
            {money('Tài sản cố định', 'FixedAssets')}
            {money('Tài sản dài hạn khác', 'OtherLongTermAssets')}
          </div>
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Nguồn vốn</div>
            {money('Nợ ngắn hạn', 'ShortTermDebt')}
            {money('Nợ ngắn hạn khác', 'OtherShortTermDebt')}
            {money('Nợ dài hạn', 'LongTermDebt')}
            {money('Nợ dài hạn khác', 'OtherLongTermDebt')}
            <div className={`${UI.sectionBoxBg} rounded-md border p-2.5 mt-3`}>
              <ReadOnlyRow label="Tài sản ngắn hạn" value={fmtMoney(result.balance.currentAssets)} />
              <ReadOnlyRow label="Tài sản dài hạn" value={fmtMoney(result.balance.longTermAssets)} />
              <ReadOnlyRow label="Tổng tài sản" value={fmtMoney(result.balance.totalAssets)} strong />
              <ReadOnlyRow label="Nợ phải trả" value={fmtMoney(result.balance.totalLiabilities)} />
              <ReadOnlyRow label="Vốn tự có" value={fmtMoney(result.balance.ownEquity)} strong
                tone={result.balance.ownEquity < 0 ? 'neg' : undefined} />
            </div>
          </div>
        </div>
      </Block>

      <Block title="Kết quả kinh doanh">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Kỳ thực hiện {draft.ActualYear || ''}
            </div>
            {money('Doanh thu thuần cả năm', 'ActualRevenueAnnual')}
            {percent('Tỷ lệ giá vốn trên doanh thu', 'ActualCogsRatioPercent')}
            {money('Khấu hao cả năm', 'ActualDepreciationAnnual')}
            {money('Thuế khoán cả năm', 'ActualTaxAnnual')}
            {money('Chi phí nhân công / tháng', 'ActualStaffMonthly')}
            {money('Chi phí thuê mặt bằng / tháng', 'ActualPremisesMonthly')}
            {money('Chi phí điện nước / tháng', 'ActualUtilitiesMonthly')}
            {money('Chi phí khác / tháng', 'ActualOtherMonthly')}
          </div>
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Năm kế hoạch {draft.PlanYear || ''}
            </div>
            {money('Doanh thu thuần cả năm', 'PlanRevenueAnnual')}
            {percent('Tỷ lệ giá vốn trên doanh thu', 'PlanCogsRatioPercent')}
            {money('Khấu hao cả năm', 'PlanDepreciationAnnual')}
            {money('Thuế khoán cả năm', 'PlanTaxAnnual')}
            {money('Chi phí nhân công / tháng', 'PlanStaffMonthly')}
            {money('Chi phí thuê mặt bằng / tháng', 'PlanPremisesMonthly')}
            {money('Chi phí điện nước / tháng', 'PlanUtilitiesMonthly')}
            {money('Chi phí khác / tháng', 'PlanOtherMonthly')}
          </div>
        </div>
      </Block>

      <Block
        title="Dư nợ và lãi vay"
        aside={
          <button type="button" onClick={addDebt}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-accent/30 text-accent text-[11px] font-semibold hover:bg-accent-soft">
            <Plus className="w-3 h-3" /> Thêm khoản
          </button>
        }
      >
        {debts.length === 0 ? (
          <div className="text-[11px] text-ink-faint py-2">Chưa khai khoản vay nào — chi phí lãi vay bằng 0.</div>
        ) : (
          <div className="space-y-2">
            {debts.map((d, i) => (
              <div key={d.Id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-4">
                  <span className={`block mb-1 text-[11px] ${UI.labelStyle}`}>Khoản vay</span>
                  <input type="text" value={d.Label}
                    onChange={e => setDebt(i, { Label: e.target.value })}
                    placeholder="VB_HM hiện hữu, TCTD khác…"
                    className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle}`} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <MoneyField label="Dư nợ" unit={unit} value={d.Principal}
                    onChange={v => setDebt(i, { Principal: v })} />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <PercentField label="Lãi suất năm" value={d.RateAnnualPercent}
                    onChange={v => setDebt(i, { RateAnnualPercent: v })} />
                </div>
                <div className="col-span-10 md:col-span-2">
                  <span className={`block mb-1 text-[11px] ${UI.labelStyle}`}>Áp dụng</span>
                  <select value={d.Scope}
                    onChange={e => setDebt(i, { Scope: e.target.value as BusinessPlanDebt['Scope'] })}
                    className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle}`}>
                    <option value="both">Cả hai kỳ</option>
                    <option value="plan">Chỉ kỳ kế hoạch</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-end">
                  <button type="button" onClick={() => onDebtsChange(debts.filter((_, j) => j !== i))}
                    className="p-2 rounded-md border border-neg/30 text-neg hover:bg-neg-soft">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Block>

      {draft.PlanKind === 'limit' ? (
        <Block title="Đề nghị cấp hạn mức">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {money('Hạn mức đề nghị — kỳ thực hiện', 'RequestedLimitActual')}
            {money('Hạn mức đề nghị — năm kế hoạch', 'RequestedLimitPlan')}
          </div>
        </Block>
      ) : (
        <>
          <Block title="Thu chi hộ gia đình">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {money('Thu nhập khác / tháng', 'OtherIncomeMonthly')}
              {money('Chi phí sinh hoạt / tháng', 'LivingExpenseMonthly')}
              {money('Nghĩa vụ nợ đang trả / tháng', 'ExistingDebtPaymentMonthly')}
              {percent('Trần DTI', 'MaxDtiPercent')}
            </div>
          </Block>

          <Block title="Phương án vay">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {money('Tổng chi phí phương án', 'ProjectCost')}
              {money('Vốn tự có tham gia', 'OwnFunds')}
              <CountField label="Kỳ hạn vay" suffix="tháng" value={draft.TenorMonths}
                onChange={v => onChange('TenorMonths', v)} />
              {percent('Lãi suất năm', 'RateAnnualPercent')}
            </div>
          </Block>
        </>
      )}

      <Block title="Cơ sở xác định — in ra phụ lục kết quả kinh doanh">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BASIS_FIELDS.map(({ field, label }) => (
            <label key={field} className="block">
              <span className={`block mb-1 text-[11px] ${UI.labelStyle}`}>{label}</span>
              <textarea rows={2} value={(draft[field] as string) || ''}
                onChange={e => onChange(field, e.target.value as BusinessPlan[typeof field])}
                placeholder="Bỏ trống thì phụ lục tự ghi tỷ trọng trên doanh thu"
                className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle}`} />
            </label>
          ))}
        </div>
      </Block>
    </div>
  );
};
