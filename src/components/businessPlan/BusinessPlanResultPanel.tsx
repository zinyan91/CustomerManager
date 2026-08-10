import React from 'react';
import { FileDown, AlertTriangle } from 'lucide-react';
import type { BusinessPlanInput, BusinessPlanResult } from '../../lib/businessPlan';
import { buildBusinessPlanSheets, sheetToXlsx, type ExportContext } from '../../lib/businessPlanExport';
import { downloadBytes } from '../../lib/xlsExport';
import { MIME_XLSX } from '../../lib/xlsxWriter';
import { fmtDecimals, fmtMoney, fmtPercent, todayIso } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { Block, ReadOnlyRow } from './fields';

interface Props {
  input: BusinessPlanInput;
  result: BusinessPlanResult;
  context: ExportContext;
  collateralCapacity: number;
  hasUnsavedChanges: boolean;
}

const BINDING_LABEL: Record<string, string> = {
  need: 'Nhu cầu của phương án',
  capacity: 'Khả năng trả nợ',
  collateral: 'Tài sản bảo đảm',
};

export const BusinessPlanResultPanel: React.FC<Props> = ({
  input, result, context, collateralCapacity, hasUnsavedChanges,
}) => {
  const exportAll = () => {
    const sheets = buildBusinessPlanSheets(input, result, context);
    const stamp = todayIso();
    sheets.forEach(sheet => {
      downloadBytes(
        sheetToXlsx(sheet),
        `${sheet.fileBase}_${context.customerCif || 'KH'}_${stamp}.xlsx`,
        MIME_XLSX
      );
    });
  };

  const period = (title: string, p: typeof result.actual) => (
    <div className={`${UI.sectionBoxBg} rounded-md border p-2.5`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{title}</div>
      <ReadOnlyRow label="Doanh thu / tháng" value={fmtMoney(p.monthly.revenue)} />
      <ReadOnlyRow label="Tổng chi phí / tháng" value={fmtMoney(p.monthly.costs.total)} />
      <ReadOnlyRow label="Trong đó lãi vay / tháng" value={fmtMoney(p.monthly.costs.interest)} />
      <ReadOnlyRow label="Lợi nhuận trước thuế / tháng" value={fmtMoney(p.monthly.profitBeforeTax)}
        tone={p.profitBeforeTax < 0 ? 'neg' : undefined} />
      <ReadOnlyRow label="Lợi nhuận sau thuế / năm" value={fmtMoney(p.profitAfterTax)} strong
        tone={p.profitAfterTax < 0 ? 'neg' : undefined} />
      <ReadOnlyRow label="Tỷ trọng chi phí trên doanh thu" value={fmtPercent(p.costRatios.total)} />
    </div>
  );

  return (
    <Block
      title="Kết quả"
      aside={
        <button type="button" onClick={exportAll}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent text-accent-ink text-[11px] font-bold hover:opacity-90">
          <FileDown className="w-3.5 h-3.5" />
          Xuất {input.kind === 'limit' ? '3' : '2'} phụ lục
        </button>
      }
    >
      {hasUnsavedChanges && (
        <div className="flex items-center gap-1.5 mb-2.5 text-[11px] text-warn">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Phụ lục xuất theo số đang nhập, chưa lưu.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {period(`Kỳ thực hiện ${context.actualYear}`, result.actual)}
        {period(`Năm kế hoạch ${context.planYear}`, result.plan)}
      </div>

      {result.limit && (
        <div className={`${UI.sectionBoxBg} rounded-md border p-2.5 mt-3`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">
            Nhu cầu cấp hạn mức
          </div>
          <ReadOnlyRow label="Tổng nhu cầu vốn bằng tiền" value={fmtMoney(result.limit.actual.cashNeed)} />
          <ReadOnlyRow label="Vòng quay vốn lưu động"
            value={`${fmtDecimals(result.limit.actual.turnover, 1)} vòng`} />
          <ReadOnlyRow label="Nhu cầu vốn lưu động một vòng"
            value={fmtMoney(result.limit.actual.avgWorkingCapitalNeed)} strong />
          <ReadOnlyRow label="Hạn mức đề nghị" value={fmtMoney(result.limit.actual.requested)} strong
            tone={result.limit.actual.exceedsNeed ? 'neg' : 'pos'} />
          {result.limit.actual.exceedsNeed && (
            <div className="mt-1.5 text-[11px] text-neg font-semibold">
              Vượt nhu cầu vốn lưu động một vòng{' '}
              {fmtMoney(result.limit.actual.requested - result.limit.actual.avgWorkingCapitalNeed)}
            </div>
          )}
        </div>
      )}

      {result.eachTime && (
        <div className={`${UI.sectionBoxBg} rounded-md border p-2.5 mt-3`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">
            Số tiền cho vay
          </div>
          <ReadOnlyRow label="Nguồn thu / tháng" value={fmtMoney(result.eachTime.incomeMonthly)} />
          <ReadOnlyRow label="Khả năng trả nợ / tháng"
            value={fmtMoney(result.eachTime.affordablePaymentMonthly)} />
          <ReadOnlyRow label="Nhu cầu của phương án" value={fmtMoney(result.eachTime.needFromBank)} />
          <ReadOnlyRow label="Khả năng vay theo dòng tiền"
            value={fmtMoney(result.eachTime.maxLoanFromCapacity)} />
          <ReadOnlyRow label="Khả năng bảo đảm của TSĐB" value={fmtMoney(collateralCapacity)} />
          <ReadOnlyRow label="Số tiền đề nghị" value={fmtMoney(result.eachTime.recommended)} strong
            tone={result.eachTime.recommended > 0 ? 'pos' : 'neg'} />
          <div className="mt-1.5 text-[11px] text-ink-faint">
            Bị chặn bởi: <strong className="text-ink">{BINDING_LABEL[result.eachTime.binding]}</strong>
          </div>
        </div>
      )}
    </Block>
  );
};
