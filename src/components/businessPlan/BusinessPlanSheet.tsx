import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type {
  BusinessPlanInput, BusinessPlanResult, PeriodDrivers, BalanceSheetInput, DebtItem,
} from '../../lib/businessPlan';
import { planDriversOf } from '../../lib/businessPlan';
import { fmtDecimals } from '../../lib/utils';
import { UNIT_LABEL, type MoneyUnit } from './units';
import {
  Panel, MoneyCell, PercentCell, TextCell, OutCell, RatioCell, PercentOutCell,
  LabelCell, SttCell, GroupRow, HEAD, CELL, OUT_CELL,
} from './sheetCells';

interface Props {
  input: BusinessPlanInput;
  result: BusinessPlanResult;
  unit: MoneyUnit;
  onChange: (patch: Partial<BusinessPlanInput>) => void;
}

const MONTHS = 12;

export const BusinessPlanSheet: React.FC<Props> = ({ input, result, unit, onChange }) => {
  const plan = planDriversOf(input);
  const u = UNIT_LABEL[unit];

  const setActual = (key: keyof PeriodDrivers, value: number) =>
    onChange({ actual: { ...input.actual, [key]: value } });

  const setOverride = (key: keyof PeriodDrivers, value: number) =>
    onChange({ planOverrides: { ...input.planOverrides, [key]: value } });

  const setBalance = (key: keyof BalanceSheetInput, value: number) =>
    onChange({ balanceSheet: { ...input.balanceSheet, [key]: value } });

  const setDebt = (i: number, patch: Partial<DebtItem>) =>
    onChange({ debts: input.debts.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  const changeOf = (a: number, p: number) => (a === 0 ? 0 : (p - a) / a);

  const driverRow = (
    stt: number, label: string, key: keyof PeriodDrivers, perMonth = false
  ) => {
    const factor = perMonth ? MONTHS : 1;
    return (
      <tr key={key}>
        <SttCell>{stt}</SttCell>
        <LabelCell>{label}</LabelCell>
        <td className={`${CELL} text-center text-[10px] text-ink-faint`}>{u}</td>
        <MoneyCell value={input.actual[key]} unit={unit} onChange={v => setActual(key, v)} />
        <MoneyCell value={plan[key]} unit={unit} onChange={v => setOverride(key, v)} muted />
        <PercentOutCell value={changeOf(input.actual[key] * factor, plan[key] * factor)} />
      </tr>
    );
  };

  const computedRow = (stt: number | string, label: string, a: number, p: number, bold = false) => (
    <tr>
      <SttCell bold={bold}>{stt}</SttCell>
      <LabelCell bold={bold}>{label}</LabelCell>
      <td className={`${CELL} text-center text-[10px] text-ink-faint`}>{u}</td>
      <OutCell value={a} unit={unit} bold={bold} />
      <OutCell value={p} unit={unit} bold={bold} />
      <PercentOutCell value={changeOf(a, p)} />
    </tr>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
      <div className="space-y-3">
        <Panel title="Phương án kết quả kinh doanh & nhu cầu cấp tín dụng">
          <table className="w-full text-xs border-collapse table-fixed">
            <colgroup>
              <col className="w-10" />
              <col />
              <col className="w-12" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr>
                <th className={HEAD}>STT</th>
                <th className={HEAD}>Khoảng mục</th>
                <th className={HEAD}>Đvt</th>
                <th className={HEAD}>Kỳ thực hiện {input.actualYear}</th>
                <th className={HEAD}>Năm kế hoạch {input.planYear}</th>
                <th className={HEAD}>Tăng/giảm</th>
              </tr>
            </thead>
            <tbody>
              <GroupRow ky="b" title="Phương án kết quả kinh doanh" span={5} />
              {driverRow(1, 'Doanh thu thuần (DTT)', 'revenueAnnual')}
              {driverRow(2, 'Giá vốn hàng bán', 'cogsAnnual')}
              {driverRow(3, 'Khấu hao', 'depreciationAnnual')}
              {computedRow(4, 'Lãi vay (các khoản vay tài trợ cho SXKD)',
                result.actual.costs.interest, result.plan.costs.interest)}
              {computedRow(5, 'Lợi nhuận trước thuế (LNTT)',
                result.actual.profitBeforeTax, result.plan.profitBeforeTax, true)}
              {driverRow(6, 'Thuế (nếu có)', 'taxAnnual')}
              {computedRow(7, 'Lợi nhuận sau thuế (LNST)',
                result.actual.profitAfterTax, result.plan.profitAfterTax, true)}
              {computedRow(8, 'Tài sản lưu động',
                result.actual.currentAssets, result.plan.currentAssets)}

              {result.limit && <GroupRow ky="c" title="Tính toán nhu cầu cấp tín dụng" span={5} />}
              {result.limit && (
                <tr>
                  <SttCell>1</SttCell>
                  <LabelCell>Tổng nhu cầu vốn bằng tiền <span className="text-ink-faint">(c1 = b1 − b3 − b4 − b5)</span></LabelCell>
                  <td className={`${CELL} text-center text-[10px] text-ink-faint`}>{u}</td>
                  <OutCell value={result.limit.actual.cashNeed} unit={unit} />
                  <OutCell value={result.limit.plan.cashNeed} unit={unit} />
                  <td className={CELL} />
                </tr>
              )}
              {result.limit && (
                <tr>
                  <SttCell>2</SttCell>
                  <LabelCell>Vòng quay vốn lưu động <span className="text-ink-faint">(c2 = b1 / b8)</span></LabelCell>
                  <td className={`${CELL} text-center text-[10px] text-ink-faint`}>vòng</td>
                  <RatioCell value={result.limit.actual.turnover} />
                  <RatioCell value={result.limit.plan.turnover} />
                  <td className={CELL} />
                </tr>
              )}
              {result.limit && (
                <tr>
                  <SttCell bold>3</SttCell>
                  <LabelCell bold>Nhu cầu vốn lưu động bình quân 1 vòng <span className="font-normal text-ink-faint">(c3 = c1/c2)</span></LabelCell>
                  <td className={`${CELL} text-center text-[10px] text-ink-faint`}>{u}</td>
                  <OutCell value={result.limit.actual.avgWorkingCapitalNeed} unit={unit} bold />
                  <OutCell value={result.limit.plan.avgWorkingCapitalNeed} unit={unit} bold />
                  <td className={CELL} />
                </tr>
              )}
              {result.limit && (
                <tr>
                  <SttCell bold>→</SttCell>
                  <LabelCell bold>Đề nghị cấp HMTD tại Vietbank</LabelCell>
                  <td className={`${CELL} text-center text-[10px] text-ink-faint`}>{u}</td>
                  <MoneyCell value={input.requestedLimitActual} unit={unit}
                    onChange={v => onChange({ requestedLimitActual: v })} />
                  <MoneyCell value={input.requestedLimitPlan} unit={unit}
                    onChange={v => onChange({ requestedLimitPlan: v })} />
                  <td className={CELL} />
                </tr>
              )}
            </tbody>
          </table>
          {result.limit?.actual.exceedsNeed && (
            <div className="px-3 py-2 text-[11px] text-neg font-semibold border-t border-line">
              Hạn mức đề nghị vượt nhu cầu vốn lưu động một vòng.
            </div>
          )}
        </Panel>

        <Panel title="Bảng cân đối">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className={`${HEAD} w-10`}>STT</th>
                <th className={HEAD}>Tài sản</th>
                <th className={`${HEAD} w-28`}>Giá trị</th>
                <th className={HEAD}>Nguồn vốn</th>
                <th className={`${HEAD} w-28`}>Giá trị</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <SttCell>1</SttCell>
                <LabelCell bold>Tài sản ngắn hạn</LabelCell>
                <OutCell value={result.balance.currentAssets} unit={unit} bold />
                <LabelCell bold>Nợ phải trả</LabelCell>
                <OutCell value={result.balance.totalLiabilities} unit={unit} bold />
              </tr>
              <tr>
                <SttCell>2</SttCell>
                <LabelCell italic>Tiền, tương đương tiền</LabelCell>
                <MoneyCell value={input.balanceSheet.cash} unit={unit} onChange={v => setBalance('cash', v)} />
                <LabelCell italic>Nợ ngắn hạn</LabelCell>
                <MoneyCell value={input.balanceSheet.shortTermDebt} unit={unit} onChange={v => setBalance('shortTermDebt', v)} />
              </tr>
              <tr>
                <SttCell>3</SttCell>
                <LabelCell italic>Hàng tồn kho</LabelCell>
                <MoneyCell value={input.balanceSheet.inventory} unit={unit} onChange={v => setBalance('inventory', v)} />
                <LabelCell italic>…</LabelCell>
                <MoneyCell value={input.balanceSheet.otherShortTermDebt} unit={unit} onChange={v => setBalance('otherShortTermDebt', v)} />
              </tr>
              <tr>
                <SttCell>4</SttCell>
                <LabelCell italic>Các khoản phải thu</LabelCell>
                <MoneyCell value={input.balanceSheet.receivables} unit={unit} onChange={v => setBalance('receivables', v)} />
                <LabelCell italic>Nợ dài hạn</LabelCell>
                <MoneyCell value={input.balanceSheet.longTermDebt} unit={unit} onChange={v => setBalance('longTermDebt', v)} />
              </tr>
              <tr>
                <SttCell>5</SttCell>
                <LabelCell italic>Tài sản ngắn hạn khác</LabelCell>
                <MoneyCell value={input.balanceSheet.otherCurrentAssets} unit={unit} onChange={v => setBalance('otherCurrentAssets', v)} />
                <LabelCell italic>…</LabelCell>
                <MoneyCell value={input.balanceSheet.otherLongTermDebt} unit={unit} onChange={v => setBalance('otherLongTermDebt', v)} />
              </tr>
              <tr>
                <SttCell>6</SttCell>
                <LabelCell bold>Tài sản dài hạn</LabelCell>
                <OutCell value={result.balance.longTermAssets} unit={unit} bold />
                <LabelCell bold>Vốn tự có</LabelCell>
                <OutCell value={result.balance.ownEquity} unit={unit} bold
                  tone={result.balance.ownEquity < 0 ? 'neg' : undefined} />
              </tr>
              <tr>
                <SttCell>7</SttCell>
                <LabelCell italic>Các khoản phải thu dài hạn</LabelCell>
                <MoneyCell value={input.balanceSheet.longTermReceivables} unit={unit} onChange={v => setBalance('longTermReceivables', v)} />
                <LabelCell italic>Vốn góp</LabelCell>
                <td className={OUT_CELL}>—</td>
              </tr>
              <tr>
                <SttCell>8</SttCell>
                <LabelCell italic>Tài sản cố định</LabelCell>
                <MoneyCell value={input.balanceSheet.fixedAssets} unit={unit} onChange={v => setBalance('fixedAssets', v)} />
                <LabelCell italic>Nguồn kinh phí &amp; quỹ khác</LabelCell>
                <td className={OUT_CELL}>—</td>
              </tr>
              <tr>
                <SttCell>9</SttCell>
                <LabelCell italic>Tài sản dài hạn khác</LabelCell>
                <MoneyCell value={input.balanceSheet.otherLongTermAssets} unit={unit} onChange={v => setBalance('otherLongTermAssets', v)} />
                <LabelCell italic>…</LabelCell>
                <td className={OUT_CELL}>—</td>
              </tr>
              <tr>
                <SttCell bold>10</SttCell>
                <LabelCell bold>Tổng tài sản</LabelCell>
                <OutCell value={result.balance.totalAssets} unit={unit} bold />
                <LabelCell bold>Tổng nguồn vốn</LabelCell>
                <OutCell value={result.balance.totalCapital} unit={unit} bold />
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="space-y-3">
        <Panel title="Tiêu chí / tháng">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className={HEAD}>Chỉ tiêu</th>
                <th className={`${HEAD} w-24`}>Kỳ thực hiện</th>
                <th className={`${HEAD} w-24`}>Kỳ kế hoạch</th>
                <th className={`${HEAD} w-16`}>%/DT</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Doanh thu', result.actual.monthly.revenue, result.plan.monthly.revenue, 1],
                ['Giá vốn', result.actual.monthly.costs.cogs, result.plan.monthly.costs.cogs, result.actual.costRatios.cogs],
                ['Khấu hao', result.actual.monthly.costs.depreciation, result.plan.monthly.costs.depreciation, result.actual.costRatios.depreciation],
                ['Lãi vay', result.actual.monthly.costs.interest, result.plan.monthly.costs.interest, result.actual.costRatios.interest],
                ['Tổng chi phí', result.actual.monthly.costs.total, result.plan.monthly.costs.total, result.actual.costRatios.total],
                ['LN trước thuế', result.actual.monthly.profitBeforeTax, result.plan.monthly.profitBeforeTax, 0],
                ['LN sau thuế', result.actual.monthly.profitAfterTax, result.plan.monthly.profitAfterTax, 0],
                ['Tài sản lưu động', result.actual.monthly.currentAssets, result.plan.monthly.currentAssets, 0],
              ] as [string, number, number, number][]).map(([name, a, p]) => (
                <tr key={name}>
                  <LabelCell>{name}</LabelCell>
                  <OutCell value={a} unit={unit} />
                  <OutCell value={p} unit={unit} />
                  <td className={OUT_CELL}>
                    {result.actual.revenueAnnual > 0
                      ? `${fmtDecimals(a / result.actual.monthly.revenue * 100, 1, '0')}%`
                      : '0%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel
          title="Dư nợ & lãi vay"
          aside={
            <button type="button"
              onClick={() => onChange({
                debts: [...input.debts, { label: '', principal: 0, rateAnnualPercent: 0, scope: 'both' }],
              })}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-accent/30 text-accent text-[11px] font-semibold hover:bg-accent-soft">
              <Plus className="w-3 h-3" /> Thêm
            </button>
          }
        >
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className={HEAD}>Tại</th>
                <th className={`${HEAD} w-24`}>Số tiền vay</th>
                <th className={`${HEAD} w-16`}>Lãi suất</th>
                <th className={`${HEAD} w-20`}>Áp dụng</th>
                <th className={`${HEAD} w-24`}>Lãi/năm</th>
                <th className={`${HEAD} w-8`}></th>
              </tr>
            </thead>
            <tbody>
              {input.debts.length === 0 ? (
                <tr>
                  <td className={`${CELL} text-[11px] text-ink-faint`} colSpan={6}>
                    Chưa khai khoản vay nào — chi phí lãi vay bằng 0.
                  </td>
                </tr>
              ) : input.debts.map((d, i) => (
                <tr key={i}>
                  <TextCell value={d.label} onChange={v => setDebt(i, { label: v })}
                    placeholder="VB_HM hiện hữu…" />
                  <MoneyCell value={d.principal} unit={unit} onChange={v => setDebt(i, { principal: v })} />
                  <PercentCell value={d.rateAnnualPercent} onChange={v => setDebt(i, { rateAnnualPercent: v })} />
                  <td className={CELL}>
                    <select value={d.scope}
                      onChange={e => setDebt(i, { scope: e.target.value as DebtItem['scope'] })}
                      className="w-full bg-transparent text-[11px] outline-none text-ink">
                      <option value="both">Cả hai kỳ</option>
                      <option value="plan">Cấp mới</option>
                    </select>
                  </td>
                  <OutCell value={d.principal * d.rateAnnualPercent / 100} unit={unit} />
                  <td className={`${CELL} text-center`}>
                    <button type="button"
                      onClick={() => onChange({ debts: input.debts.filter((_, j) => j !== i) })}
                      className="text-neg hover:opacity-70">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Chi phí">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className={HEAD}>Chi phí</th>
                <th className={`${HEAD} w-24`}>Giá/tháng</th>
                <th className={`${HEAD} w-24`}>Giá/năm</th>
                <th className={`${HEAD} w-16`}>%/DT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <LabelCell>Giá vốn bán hàng</LabelCell>
                <OutCell value={result.actual.monthly.costs.cogs} unit={unit} />
                <OutCell value={result.actual.costs.cogs} unit={unit} />
                <PercentOutCell value={result.actual.costRatios.cogs} />
              </tr>
              {([
                ['Nhân viên', 'staffMonthly', result.actual.costs.staff, result.actual.costRatios.staff],
                ['Mặt bằng', 'premisesMonthly', result.actual.costs.premises, result.actual.costRatios.premises],
                ['Điện nước', 'utilitiesMonthly', result.actual.costs.utilities, result.actual.costRatios.utilities],
                ['Chi phí khác', 'otherMonthly', result.actual.costs.other, result.actual.costRatios.other],
              ] as [string, keyof PeriodDrivers, number, number][]).map(([name, key, year, ratio]) => (
                <tr key={key}>
                  <LabelCell>{name}</LabelCell>
                  <MoneyCell value={input.actual[key]} unit={unit} onChange={v => setActual(key, v)} />
                  <OutCell value={year} unit={unit} />
                  <PercentOutCell value={ratio} />
                </tr>
              ))}
              <tr>
                <LabelCell>Lãi vay</LabelCell>
                <OutCell value={result.actual.monthly.costs.interest} unit={unit} />
                <OutCell value={result.actual.costs.interest} unit={unit} />
                <PercentOutCell value={result.actual.costRatios.interest} />
              </tr>
              <tr>
                <LabelCell>Khấu hao</LabelCell>
                <OutCell value={result.actual.monthly.costs.depreciation} unit={unit} />
                <OutCell value={result.actual.costs.depreciation} unit={unit} />
                <PercentOutCell value={result.actual.costRatios.depreciation} />
              </tr>
              <tr>
                <LabelCell bold>Tổng</LabelCell>
                <OutCell value={result.actual.monthly.costs.total} unit={unit} bold />
                <OutCell value={result.actual.costs.total} unit={unit} bold />
                <PercentOutCell value={result.actual.costRatios.total} />
              </tr>
            </tbody>
          </table>
        </Panel>

        {result.eachTime && (
          <Panel title="Cho vay từng lần">
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr>
                  <LabelCell>Tổng chi phí phương án</LabelCell>
                  <MoneyCell value={input.eachTime.projectCost} unit={unit}
                    onChange={v => onChange({ eachTime: { ...input.eachTime, projectCost: v } })} />
                  <LabelCell>Vốn tự có tham gia</LabelCell>
                  <MoneyCell value={input.eachTime.ownFunds} unit={unit}
                    onChange={v => onChange({ eachTime: { ...input.eachTime, ownFunds: v } })} />
                </tr>
                <tr>
                  <LabelCell>Kỳ hạn vay (tháng)</LabelCell>
                  <MoneyCell value={input.eachTime.tenorMonths} unit="vnd"
                    onChange={v => onChange({ eachTime: { ...input.eachTime, tenorMonths: v } })} />
                  <LabelCell>Lãi suất năm</LabelCell>
                  <PercentCell value={input.eachTime.rateAnnualPercent}
                    onChange={v => onChange({ eachTime: { ...input.eachTime, rateAnnualPercent: v } })} />
                </tr>
                <tr>
                  <LabelCell>Thu nhập khác / tháng</LabelCell>
                  <MoneyCell value={input.household.otherIncomeMonthly} unit={unit}
                    onChange={v => onChange({ household: { ...input.household, otherIncomeMonthly: v } })} />
                  <LabelCell>Chi phí sinh hoạt / tháng</LabelCell>
                  <MoneyCell value={input.household.livingExpenseMonthly} unit={unit}
                    onChange={v => onChange({ household: { ...input.household, livingExpenseMonthly: v } })} />
                </tr>
                <tr>
                  <LabelCell>Nghĩa vụ nợ đang trả / tháng</LabelCell>
                  <MoneyCell value={input.household.existingDebtPaymentMonthly} unit={unit}
                    onChange={v => onChange({ household: { ...input.household, existingDebtPaymentMonthly: v } })} />
                  <LabelCell>Trần DTI</LabelCell>
                  <PercentCell value={input.household.maxDtiPercent}
                    onChange={v => onChange({ household: { ...input.household, maxDtiPercent: v } })} />
                </tr>
                <tr>
                  <LabelCell>Khả năng bảo đảm của TSĐB</LabelCell>
                  <MoneyCell value={input.eachTime.collateralCapacity} unit={unit}
                    onChange={v => onChange({ eachTime: { ...input.eachTime, collateralCapacity: v } })} />
                  <LabelCell>Khả năng trả nợ / tháng</LabelCell>
                  <OutCell value={result.eachTime.affordablePaymentMonthly} unit={unit} />
                </tr>
                <tr>
                  <LabelCell>Nhu cầu của phương án</LabelCell>
                  <OutCell value={result.eachTime.needFromBank} unit={unit} />
                  <LabelCell>Khả năng vay theo dòng tiền</LabelCell>
                  <OutCell value={result.eachTime.maxLoanFromCapacity} unit={unit} />
                </tr>
                <tr>
                  <LabelCell bold colSpan={3}>Số tiền đề nghị cho vay</LabelCell>
                  <OutCell value={result.eachTime.recommended} unit={unit} bold
                    tone={result.eachTime.recommended > 0 ? 'pos' : 'neg'} />
                </tr>
              </tbody>
            </table>
            <div className="px-3 py-2 text-[11px] text-ink-faint border-t border-line">
              Bị chặn bởi:{' '}
              <strong className="text-ink">
                {result.eachTime.binding === 'need' ? 'Nhu cầu của phương án'
                  : result.eachTime.binding === 'capacity' ? 'Khả năng trả nợ'
                    : 'Tài sản bảo đảm'}
              </strong>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
};
