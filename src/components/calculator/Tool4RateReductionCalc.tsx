import React, { useState, useMemo } from 'react';
import { Percent, TrendingDown, Download, FileSpreadsheet, Calculator, Calendar, Plus, Trash2 } from 'lucide-react';
import { fmtMoney, fmtNumber, fmtDate, fmtPercent, formatMoneyInput, parseMoneyInput, todayIso } from '../../lib/utils';
import {
  calcRateReductionForLoan,
  sumInterestReduced,
  buildRateReductionSchedule,
  summarizeRateReduction,
} from '../../lib/rateReduction';
import type { UiClasses } from '../../lib/uiClasses';
import { UI } from '../../lib/uiClasses';
import { downloadBytes } from '../../lib/xlsExport';
import { buildXlsx, MIME_XLSX, type XlsxCell, type XlsxSheet } from '../../lib/xlsxWriter';

interface Tool4Props {
  styles: UiClasses;
}

interface QuickLoanRow {
  key: number;
  name: string;
  account: string;
  tenorLabel: string;
  balanceStr: string;
  riskCoefficientStr: string;
  standardRateStr: string;
  proposedRateStr: string;
  applyLabel: string;
  daysStr: string;
  cofStr: string;
}

const newQuickRow = (key: number): QuickLoanRow => ({
  key,
  name: 'Hạn mức <Bổ sung vốn kinh doanh>',
  account: '',
  tenorLabel: '5 tháng',
  balanceStr: '1.500.000.000',
  riskCoefficientStr: '0.75',
  standardRateStr: '10.25',
  proposedRateStr: '8.25',
  applyLabel: '2 tháng',
  daysStr: '61',
  cofStr: '5.30',
});

export const Tool4RateReductionCalc: React.FC<Tool4Props> = () => {
  const [calcMode, setCalcMode] = useState<'quick' | 'tdh'>('tdh');

  const [quickRows, setQuickRows] = useState<QuickLoanRow[]>([newQuickRow(1)]);
  const [nextKey, setNextKey] = useState(2);

  const updateQuickRow = (key: number, patch: Partial<QuickLoanRow>) => {
    setQuickRows(rows => rows.map(r => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addQuickRow = () => {
    setQuickRows(rows => [...rows, newQuickRow(nextKey)]);
    setNextKey(k => k + 1);
  };

  const removeQuickRow = (key: number) => {
    setQuickRows(rows => (rows.length > 1 ? rows.filter(r => r.key !== key) : rows));
  };

  const quickResults = useMemo(() => quickRows.map(row => {
    const cofRaw = row.cofStr.trim();
    const cofParsed = cofRaw === '' ? null : parseFloat(cofRaw);
    return {
      row,
      balance: parseMoneyInput(row.balanceStr),
      result: calcRateReductionForLoan({
        balance: parseMoneyInput(row.balanceStr),
        standardRateAnnual: (parseFloat(row.standardRateStr) || 0) / 100,
        proposedRateAnnual: (parseFloat(row.proposedRateStr) || 0) / 100,
        days: parseInt(row.daysStr, 10) || 0,
        cofAnnual: cofParsed === null || isNaN(cofParsed) ? null : cofParsed / 100,
      }),
    };
  }), [quickRows]);

  const quickTotalReduced = useMemo(
    () => sumInterestReduced(quickResults.map(q => q.result)),
    [quickResults]
  );
  const quickTotalBalance = useMemo(
    () => quickResults.reduce((s, q) => s + q.balance, 0),
    [quickResults]
  );

  const [tdhLoanAmtStr, setTdhLoanAmtStr] = useState('2.000.000.000');
  const [tdhTenorMonths, setTdhTenorMonths] = useState<number>(120);
  const [tdhPrefRateStr, setTdhPrefRateStr] = useState('9.0');
  const [tdhPrefMonths, setTdhPrefMonths] = useState<number>(12);
  const [tdhPostPrefRateStr, setTdhPostPrefRateStr] = useState('12.6');
  const [tdhStartMonth, setTdhStartMonth] = useState<number>(28);
  const [tdhNumMonthsReduce, setTdhNumMonthsReduce] = useState<number>(3);
  const [tdhProposedRateStr, setTdhProposedRateStr] = useState('9.9');
  const [tdhMinRateStr, setTdhMinRateStr] = useState('9.82');
  const [tdhMaxReductionStr, setTdhMaxReductionStr] = useState('3.0');
  const [tdhCofStr, setTdhCofStr] = useState('8.5');
  const [tdhStartDate, setTdhStartDate] = useState(() => todayIso());

  const tdhLoanAmt = parseMoneyInput(tdhLoanAmtStr);
  const tdhPrefRate = (parseFloat(tdhPrefRateStr) || 0) / 100;
  const tdhPostPrefRate = (parseFloat(tdhPostPrefRateStr) || 0) / 100;
  const tdhProposedRate = (parseFloat(tdhProposedRateStr) || 0) / 100;
  const tdhMinRate = (parseFloat(tdhMinRateStr) || 0) / 100;
  const tdhMaxReduction = (parseFloat(tdhMaxReductionStr) || 0) / 100;
  const tdhCof = (parseFloat(tdhCofStr) || 0) / 100;

  const tdhScheduleRows = useMemo(() => buildRateReductionSchedule({
    loanAmount: tdhLoanAmt,
    tenorMonths: tdhTenorMonths,
    firstPaymentDate: tdhStartDate,
    preferentialRateAnnual: tdhPrefRate,
    preferentialMonths: tdhPrefMonths,
    postPreferentialRateAnnual: tdhPostPrefRate,
    reductionStartMonth: tdhStartMonth,
    reductionMonths: tdhNumMonthsReduce,
    proposedRateAnnual: tdhProposedRate,
    minRateAnnual: tdhMinRate,
    maxReductionAnnual: tdhMaxReduction,
  }), [
    tdhLoanAmt, tdhTenorMonths, tdhStartDate, tdhPrefRate, tdhPrefMonths, tdhPostPrefRate,
    tdhStartMonth, tdhNumMonthsReduce, tdhProposedRate, tdhMinRate, tdhMaxReduction,
  ]);

  const tdhSummary = useMemo(() => summarizeRateReduction(tdhScheduleRows), [tdhScheduleRows]);

  const effectiveReducedRate = useMemo(() => {
    const reduced = tdhScheduleRows.find(r => r.isReduced);
    return reduced ? reduced.reducedRateAnnual : null;
  }, [tdhScheduleRows]);

  const handleExportTdh = () => {
    const HEADER_FILL = 'DCE6F1';
    const HIGHLIGHT_FILL = 'F0FDF4';
    const FOOTER_FILL = 'E0F2FE';

    const xlsxRows: XlsxCell[][] = [];

    // Title Row
    xlsxRows.push([
      {
        value: 'BẢNG TÍNH GIẢM LÃI SUẤT VAY TRUNG DÀI HẠN (GỐC ĐỀU, ACTUAL/365)',
        style: { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL }
      }
    ]);

    // Subtitle
    const subtitleText = [
      `Số tiền vay: ${fmtMoney(tdhLoanAmt)}`,
      `Thời hạn: ${tdhTenorMonths} tháng`,
      `LS ưu đãi: ${fmtPercent(tdhPrefRate)} (${tdhPrefMonths} tháng)`,
      `LS sau ưu đãi: ${fmtPercent(tdhPostPrefRate)}`,
      `Áp dụng giảm: tháng ${tdhStartMonth} → ${tdhStartMonth + tdhNumMonthsReduce - 1}`,
    ].join(' | ');

    xlsxRows.push([{ value: subtitleText, style: { italic: true, align: 'center' } }]);
    xlsxRows.push([]);

    // Headers
    const headers = [
      'Kỳ (Tháng)', 'Ngày thanh toán', 'Số ngày thực tế', 'Dư nợ đầu kỳ (VND)',
      'Gốc trả kỳ (VND)', 'LS quy định (%/năm)', 'LS giảm chốt (%/năm)',
      'Chênh lệch ΔLS (%)', 'Tiền giảm lãi kỳ (VND)', 'Lãi chưa giảm (VND)',
      'Lãi sau giảm (VND)', 'Dư nợ cuối kỳ (VND)'
    ];

    xlsxRows.push(
      headers.map(h => ({
        value: h,
        style: { bold: true, align: 'center' as const, vAlign: 'center' as const, wrap: true, fill: HEADER_FILL }
      }))
    );

    // Data rows
    tdhScheduleRows.forEach(r => {
      const fill = r.isReduced ? HIGHLIGHT_FILL : undefined;
      xlsxRows.push([
        { value: r.month, numeric: true, style: { bold: true, align: 'center', fill } },
        { value: fmtDate(r.paymentDate), style: { align: 'center', fill } },
        { value: r.daysInPeriod, numeric: true, style: { align: 'right', numFmt: '#,##0', fill } },
        { value: r.beginningBalance, numeric: true, style: { align: 'right', numFmt: '#,##0', fill } },
        { value: r.principalPayment, numeric: true, style: { align: 'right', numFmt: '#,##0', fill } },
        { value: r.standardRateAnnual / 100, numeric: true, style: { align: 'right', numFmt: '0.00"%"', fill } },
        { value: r.reducedRateAnnual / 100, numeric: true, style: { bold: true, align: 'right', numFmt: '0.00"%"', fill } },
        { value: r.deltaRateAnnual / 100, numeric: true, style: { align: 'right', numFmt: '0.00"%"', fill } },
        { value: r.interestReduced, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill } },
        { value: r.interestOriginal, numeric: true, style: { align: 'right', numFmt: '#,##0', fill } },
        { value: r.interestFinal, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill } },
        { value: r.endingBalance, numeric: true, style: { align: 'right', numFmt: '#,##0', fill } },
      ]);
    });

    // Footer
    xlsxRows.push([
      { value: 'TỔNG', style: { bold: true, align: 'center', fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: tdhSummary.totalPrincipal, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: 'TỔNG GIẢM LÃI:', style: { bold: true, align: 'right', fill: FOOTER_FILL } },
      { value: tdhSummary.totalInterestReduced, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
      { value: tdhSummary.totalInterestOriginal, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
      { value: tdhSummary.totalInterestFinal, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
    ]);

    const sheet: XlsxSheet = {
      name: 'Giảm lãi trung dài hạn',
      rows: xlsxRows,
      colWidths: [10, 14, 12, 18, 18, 16, 16, 14, 18, 18, 18, 18],
    };

    const bytes = buildXlsx(sheet);
    downloadBytes(bytes, `BANG_TINH_GIAM_LAI_TDH_${todayIso()}.xlsx`, MIME_XLSX);
  };

  const handleExportQuick = () => {
    const HEADER_FILL = 'DCE6F1';
    const FOOTER_FILL = 'E0F2FE';

    const xlsxRows: XlsxCell[][] = [];

    // Title
    xlsxRows.push([
      {
        value: 'BẢNG TÍNH GIẢM LÃI SUẤT VAY (NGẮN HẠN / HẠN MỨC)',
        style: { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL }
      }
    ]);

    // Subtitle
    xlsxRows.push([
      {
        value: `Số khoản vay: ${fmtNumber(quickResults.length)} | Tổng số dư: ${fmtMoney(quickTotalBalance)}`,
        style: { italic: true, align: 'center' }
      }
    ]);
    xlsxRows.push([]);

    // Headers
    const headers = [
      'STT', 'Khoản vay', 'Tài khoản vay', 'Thời hạn khoản vay', 'Số dư (VND)',
      'HSRR', 'LSCV theo quy định (%/năm)', 'LS đề xuất (%/năm)', 'Chênh lệch LS (%/năm)',
      'Thời hạn áp dụng', 'Số ngày áp dụng (Actual/365)', 'Tiền giảm lãi dự kiến (VND)',
      'COF (%/năm)', 'Margin (%/năm)', 'Margin đề xuất (%/năm)'
    ];

    xlsxRows.push(
      headers.map(h => ({
        value: h,
        style: { bold: true, align: 'center' as const, vAlign: 'center' as const, wrap: true, fill: HEADER_FILL }
      }))
    );

    // Data rows
    quickResults.forEach((q, idx) => {
      xlsxRows.push([
        { value: idx + 1, numeric: true, style: { align: 'center' } },
        { value: q.row.name, style: { align: 'left' } },
        { value: q.row.account, style: { align: 'center' } },
        { value: q.row.tenorLabel, style: { align: 'center' } },
        { value: q.balance, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
        { value: q.row.riskCoefficientStr, style: { align: 'center' } },
        { value: q.row.standardRateStr, style: { align: 'center' } },
        { value: q.row.proposedRateStr, style: { align: 'center' } },
        { value: q.result.deltaRateAnnual / 100, numeric: true, style: { align: 'right', numFmt: '0.00"%"' } },
        { value: q.row.applyLabel, style: { align: 'left' } },
        { value: q.row.daysStr, style: { align: 'center' } },
        { value: q.result.interestReduced, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
        { value: q.row.cofStr, style: { align: 'center' } },
        { value: q.result.marginCurrentAnnual === null ? '—' : q.result.marginCurrentAnnual / 100, numeric: q.result.marginCurrentAnnual !== null, style: { align: 'right', numFmt: q.result.marginCurrentAnnual !== null ? '0.00"%"' : undefined } },
        { value: q.result.marginProposedAnnual === null ? '—' : q.result.marginProposedAnnual / 100, numeric: q.result.marginProposedAnnual !== null, style: { align: 'right', numFmt: q.result.marginProposedAnnual !== null ? '0.00"%"' : undefined } },
      ]);
    });

    // Footer
    xlsxRows.push([
      { value: 'TỔNG', style: { bold: true, align: 'center', fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: quickTotalBalance, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: 'TỔNG GIẢM LÃI:', style: { bold: true, align: 'right', fill: FOOTER_FILL } },
      { value: quickTotalReduced, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
      { value: '', style: { fill: FOOTER_FILL } },
    ]);

    const sheet: XlsxSheet = {
      name: 'Giảm lãi ngắn hạn',
      rows: xlsxRows,
      colWidths: [6, 22, 16, 14, 18, 8, 16, 16, 14, 16, 12, 20, 12, 14, 14],
    };

    const bytes = buildXlsx(sheet);
    downloadBytes(bytes, `BANG_TINH_GIAM_LAI_NGAN_HAN_${todayIso()}.xlsx`, MIME_XLSX);
  };

  const cardBg = UI.containerCardBg;
  const inputCls = 'w-full p-2.5 rounded-xl border text-xs font-mono bg-surface/80 border-line/70 focus:border-accent ';
  const cellInputCls = 'w-full p-1.5 rounded-lg border text-[11px] font-mono bg-surface/90 border-line/70 focus:border-accent ';
  const labelCls = 'block text-[11px] font-semibold text-ink-muted mb-1';

  return (
    <div className="space-y-4 font-app">
      {/* Title & Mode Switcher Header Card */}
      <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in duration-150`}>
        <div>
          <h2 className="text-xs font-bold tracking-tight text-accent flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="uppercase tracking-wider">CÔNG CỤ TÍNH GIẢM LÃI SUẤT VAY (ACTUAL/365)</span>
          </h2>
        </div>

        <div className="flex items-center bg-surface p-1 rounded-xl border border-line/70 shadow-2xs">
          <button
            type="button"
            onClick={() => setCalcMode('tdh')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              calcMode === 'tdh'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            1. Vay Trung Dài Hạn (Gốc Đều)
          </button>
          <button
            type="button"
            onClick={() => setCalcMode('quick')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              calcMode === 'quick'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            2. Ngắn Hạn / Hạn Mức (Nhiều Khoản)
          </button>
        </div>
      </div>

      {calcMode === 'tdh' && (
        <div className="space-y-4">
          <div className={`${cardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4`}>
            <div className="font-bold text-xs text-accent tracking-tight flex items-center space-x-2 border-b border-line/60 pb-3">
              <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
                <Calculator className="w-3.5 h-3.5" />
              </div>
              <span className="uppercase tracking-wider text-[11px]">THÔNG SỐ KHOẢN VAY &amp; ĐỀ XUẤT GIẢM LÃI SUẤT</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Số tiền vay (P) *</label>
                  <input
                    type="text"
                    value={tdhLoanAmtStr}
                    onChange={e => setTdhLoanAmtStr(formatMoneyInput(e.target.value))}
                    className={`${inputCls} font-bold text-accent`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Số tháng vay (n) *</label>
                  <input
                    type="number"
                    min={1}
                    value={tdhTenorMonths}
                    onChange={e => setTdhTenorMonths(parseInt(e.target.value, 10) || 12)}
                    className={`${inputCls} font-bold`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Ngày thanh toán kỳ 1 *</label>
                  <input
                    type="date"
                    value={tdhStartDate}
                    onChange={e => setTdhStartDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelCls}>LS ưu đãi (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhPrefRateStr}
                    onChange={e => setTdhPrefRateStr(e.target.value)}
                    className={`${inputCls} font-bold text-pos`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Số tháng ưu đãi</label>
                  <input
                    type="number"
                    min={0}
                    value={tdhPrefMonths}
                    onChange={e => setTdhPrefMonths(parseInt(e.target.value, 10) || 0)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>LS sau ưu đãi (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhPostPrefRateStr}
                    onChange={e => setTdhPostPrefRateStr(e.target.value)}
                    className={`${inputCls} font-bold text-warn`}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelCls}>LS đề xuất giảm (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhProposedRateStr}
                    onChange={e => setTdhProposedRateStr(e.target.value)}
                    placeholder="9.9"
                    className={`${inputCls} font-bold text-neg`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tháng bắt đầu giảm (s) *</label>
                  <input
                    type="number"
                    min={1}
                    value={tdhStartMonth}
                    onChange={e => setTdhStartMonth(parseInt(e.target.value, 10) || 1)}
                    className={`${inputCls} font-bold text-accent`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Số tháng giảm (k) *</label>
                  <input
                    type="number"
                    min={0}
                    value={tdhNumMonthsReduce}
                    onChange={e => setTdhNumMonthsReduce(parseInt(e.target.value, 10) || 0)}
                    className={`${inputCls} font-bold text-accent`}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelCls}>LSCV tối thiểu / sàn (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhMinRateStr}
                    onChange={e => setTdhMinRateStr(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>LS giảm tối đa / trần (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tdhMaxReductionStr}
                    onChange={e => setTdhMaxReductionStr(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Chi phí vốn COF (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhCofStr}
                    onChange={e => setTdhCofStr(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="text-[11px] text-ink-faint border-t border-line/50 pt-2.5">
              LS giảm chốt = min(LS quy định, max(sàn LSCV, max(LS quy định − trần giảm, LS đề xuất))).
              Kỳ ưu đãi không được giảm thêm.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex items-center justify-between`}>
              <div>
                <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">TỔNG TIỀN GIẢM LÃI DỰ KIẾN</div>
                <div className="text-xl font-extrabold text-pos mt-1 font-mono">
                  {fmtMoney(tdhSummary.totalInterestReduced)}
                </div>
                <div className="text-[11px] text-ink-faint mt-1">
                  {tdhSummary.reducedPeriodCount > 0
                    ? `Áp dụng ${tdhSummary.reducedPeriodCount} kỳ (tháng ${tdhStartMonth} → ${tdhStartMonth + tdhNumMonthsReduce - 1})`
                    : 'Chưa có kỳ nào được giảm'}
                </div>
              </div>
              <div className="p-3 bg-pos-soft/40 rounded-xl text-pos border border-pos/30 shadow-2xs shrink-0">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>

            <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex items-center justify-between`}>
              <div>
                <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">LÃI BAN ĐẦU vs SAU GIẢM</div>
                <div className="text-xs sm:text-sm font-extrabold text-accent mt-1 font-mono">
                  {fmtMoney(tdhSummary.totalInterestOriginal)} → {fmtMoney(tdhSummary.totalInterestFinal)}
                </div>
                <div className="text-[11px] text-ink-faint mt-1">
                  Tiết kiệm:{' '}
                  <strong className="text-pos font-mono font-bold">
                    -{(tdhSummary.savingRatio * 100).toFixed(2)}%
                  </strong>{' '}
                  chi phí lãi toàn kỳ
                </div>
              </div>
              <div className="p-3 bg-accent-soft/40 rounded-xl text-accent border border-accent/30 shadow-2xs shrink-0">
                <Percent className="w-6 h-6" />
              </div>
            </div>

            <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex items-center justify-between`}>
              <div>
                <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">MARGIN SAU GIẢM vs COF</div>
                <div className="text-xl font-extrabold text-warn mt-1 font-mono">
                  {effectiveReducedRate === null
                    ? '—'
                    : `${((effectiveReducedRate - tdhCof) * 100).toFixed(2)} %/năm`}
                </div>
                <div className="text-[11px] text-ink-faint mt-1">
                  {effectiveReducedRate === null
                    ? 'Chưa áp dụng giảm lãi suất'
                    : `LS giảm chốt ${fmtPercent(effectiveReducedRate)} − COF ${fmtPercent(tdhCof)}`}
                </div>
              </div>
              <div className="p-3 bg-warn-soft/40 rounded-xl text-warn border border-warn/30 shadow-2xs shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
            </div>
          </div>

          {effectiveReducedRate !== null && effectiveReducedRate - tdhCof < 0 && (
            <div className="rounded-xl border border-neg/30 bg-neg-soft/30 p-3 text-xs font-bold text-neg">
              ⚠ LS giảm chốt {fmtPercent(effectiveReducedRate)} thấp hơn chi phí vốn COF {fmtPercent(tdhCof)} — margin âm, cần cấp có thẩm quyền phê duyệt.
            </div>
          )}

          <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-3.5`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-line/60 pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-xs tracking-tight text-ink uppercase tracking-wider">
                  LỊCH TRẢ NỢ VÀ TIỀN GIẢM LÃI CHI TIẾT ({tdhScheduleRows.length} KỲ — ACTUAL/365)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleExportTdh}
                className="bg-accent hover:opacity-95 text-accent-ink text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-md shadow-accent/25 cursor-pointer transition-all active:scale-98"
              >
                <Download className="w-3.5 h-3.5" />
                <span>XUẤT EXCEL</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px] border border-line/70 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
                  <tr>
                    <th className="px-3 py-2.5 text-center">KỲ</th>
                    <th className="px-3 py-2.5">NGÀY TRẢ NỢ</th>
                    <th className="px-3 py-2.5 text-center">SỐ NGÀY</th>
                    <th className="px-3 py-2.5 text-right">DƯ NỢ ĐẦU KỲ</th>
                    <th className="px-3 py-2.5 text-right">GỐC TRẢ KỲ</th>
                    <th className="px-3 py-2.5 text-center">LS QUY ĐỊNH</th>
                    <th className="px-3 py-2.5 text-center">LS GIẢM CHỐT</th>
                    <th className="px-3 py-2.5 text-center">ΔLS GIẢM</th>
                    <th className="px-3 py-2.5 text-right font-extrabold text-pos">TIỀN GIẢM LÃI KỲ</th>
                    <th className="px-3 py-2.5 text-right">LÃI CHƯA GIẢM</th>
                    <th className="px-3 py-2.5 text-right">LÃI SAU GIẢM</th>
                    <th className="px-3 py-2.5 text-right">DƯ NỢ CUỐI KỲ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40 font-mono">
                  {tdhScheduleRows.map(r => (
                    <tr
                      key={r.month}
                      className={`hover:bg-accent/[0.04] transition-colors ${
                        r.isReduced ? 'bg-pos-soft/30 font-semibold' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center font-bold">{r.month}</td>
                      <td className="px-3 py-2.5 text-accent">{fmtDate(r.paymentDate)}</td>
                      <td className="px-3 py-2.5 text-center text-ink-faint">{r.daysInPeriod}</td>
                      <td className="px-3 py-2.5 text-right text-ink-muted">{fmtMoney(r.beginningBalance)}</td>
                      <td className="px-3 py-2.5 text-right text-ink font-bold">{fmtMoney(r.principalPayment)}</td>
                      <td className="px-3 py-2.5 text-center text-ink-faint">{fmtPercent(r.standardRateAnnual)}</td>
                      <td className={`px-3 py-2.5 text-center font-bold ${r.isReduced ? 'text-pos' : 'text-ink'}`}>
                        {fmtPercent(r.reducedRateAnnual)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-neg font-bold">
                        {r.isReduced ? `-${fmtPercent(r.deltaRateAnnual)}` : '0%'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-pos">
                        {r.isReduced ? fmtMoney(r.interestReduced) : '0 VNĐ'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-faint">{fmtMoney(r.interestOriginal)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-accent">{fmtMoney(r.interestFinal)}</td>
                      <td className="px-3 py-2.5 text-right text-ink-muted">{fmtMoney(r.endingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface/95 backdrop-blur-md font-bold border-t-2 border-line/80 text-ink text-xs">
                  <tr>
                    <td className="px-3 py-2.5 text-center uppercase tracking-wider text-[10px] text-ink-faint" colSpan={4}>TỔNG CỘNG</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmtMoney(tdhSummary.totalPrincipal)}</td>
                    <td className="px-3 py-2.5" colSpan={3} />
                    <td className="px-3 py-2.5 text-right font-mono text-pos font-extrabold">
                      {fmtMoney(tdhSummary.totalInterestReduced)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink-faint">{fmtMoney(tdhSummary.totalInterestOriginal)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-accent">
                      {fmtMoney(tdhSummary.totalInterestFinal)}
                    </td>
                    <td className="px-3 py-2.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {calcMode === 'quick' && (
        <div className="space-y-4">
          <div className={`${cardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-3.5`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-line/60 pb-3">
              <div className="flex items-center space-x-2">
                <Percent className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-xs tracking-tight text-ink uppercase tracking-wider">
                  BẢNG TÍNH GIẢM LÃI SUẤT NGẮN HẠN / HẠN MỨC ({quickResults.length} KHOẢN — ACTUAL/365)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addQuickRow}
                  className="bg-accent hover:opacity-95 text-accent-ink text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-md shadow-accent/25 cursor-pointer transition-all active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>THÊM KHOẢN VAY</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportQuick}
                  className="bg-surface hover:bg-surface-elevated text-ink border border-line/70 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-accent" />
                  <span>XUẤT EXCEL</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-line/70 rounded-xl">
              <table className="w-full text-left text-[11px] border-collapse min-w-[1180px]">
                <thead className="sticky top-0 bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
                  <tr>
                    <th className="px-3 py-2.5 text-center">STT</th>
                    <th className="px-3 py-2.5 min-w-[170px]">KHOẢN VAY</th>
                    <th className="px-3 py-2.5 min-w-[100px]">TÀI KHOẢN VAY</th>
                    <th className="px-3 py-2.5 min-w-[90px]">THỜI HẠN</th>
                    <th className="px-3 py-2.5 min-w-[130px] text-right">SỐ DƯ (VND)</th>
                    <th className="px-3 py-2.5 min-w-[60px] text-center">HSRR</th>
                    <th className="px-3 py-2.5 min-w-[80px] text-center">LSCV QUY ĐỊNH</th>
                    <th className="px-3 py-2.5 min-w-[80px] text-center">LS ĐỀ XUẤT</th>
                    <th className="px-3 py-2.5 text-center">ΔLS</th>
                    <th className="px-3 py-2.5 min-w-[90px]">THỜI HẠN ÁP DỤNG</th>
                    <th className="px-3 py-2.5 min-w-[70px] text-center">SỐ NGÀY</th>
                    <th className="px-3 py-2.5 min-w-[70px] text-center">COF</th>
                    <th className="px-3 py-2.5 text-center">MARGIN → ĐỀ XUẤT</th>
                    <th className="px-3 py-2.5 min-w-[130px] text-right font-extrabold text-pos">TIỀN GIẢM LÃI</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {quickResults.map((q, idx) => (
                    <tr key={q.row.key} className="hover:bg-accent/[0.04] transition-colors">
                      <td className="px-3 py-2.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={q.row.name}
                          onChange={e => updateQuickRow(q.row.key, { name: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={q.row.account}
                          onChange={e => updateQuickRow(q.row.key, { account: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={q.row.tenorLabel}
                          onChange={e => updateQuickRow(q.row.key, { tenorLabel: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={q.row.balanceStr}
                          onChange={e => updateQuickRow(q.row.key, { balanceStr: formatMoneyInput(e.target.value) })}
                          className={`${cellInputCls} text-right font-bold text-accent`}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={q.row.riskCoefficientStr}
                          onChange={e => updateQuickRow(q.row.key, { riskCoefficientStr: e.target.value })}
                          className={`${cellInputCls} text-center`}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={q.row.standardRateStr}
                          onChange={e => updateQuickRow(q.row.key, { standardRateStr: e.target.value })}
                          className={`${cellInputCls} text-center font-bold text-warn`}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={q.row.proposedRateStr}
                          onChange={e => updateQuickRow(q.row.key, { proposedRateStr: e.target.value })}
                          className={`${cellInputCls} text-center font-bold text-pos`}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-neg">
                        -{fmtPercent(q.result.deltaRateAnnual)}
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={q.row.applyLabel}
                          onChange={e => updateQuickRow(q.row.key, { applyLabel: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          min={0}
                          value={q.row.daysStr}
                          onChange={e => updateQuickRow(q.row.key, { daysStr: e.target.value })}
                          className={`${cellInputCls} text-center font-bold`}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={q.row.cofStr}
                          onChange={e => updateQuickRow(q.row.key, { cofStr: e.target.value })}
                          className={`${cellInputCls} text-center`}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono">
                        {q.result.marginCurrentAnnual === null || q.result.marginProposedAnnual === null ? (
                          <span className="text-ink-faint">—</span>
                        ) : (
                          <span className={q.result.marginProposedAnnual < 0 ? 'text-neg font-bold' : 'text-ink'}>
                            {fmtPercent(q.result.marginCurrentAnnual)} → {fmtPercent(q.result.marginProposedAnnual)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-extrabold text-pos">
                        {fmtMoney(q.result.interestReduced)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeQuickRow(q.row.key)}
                          disabled={quickResults.length <= 1}
                          className="p-1.5 rounded-lg text-ink-faint hover:text-neg hover:bg-neg-soft disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface/95 backdrop-blur-md font-bold border-t-2 border-line/80 text-ink text-xs">
                  <tr>
                    <td className="px-3 py-2.5 text-center uppercase tracking-wider text-[10px] text-ink-faint" colSpan={4}>TỔNG CỘNG</td>
                    <td className="px-3 py-2.5 text-right font-mono text-accent">{fmtMoney(quickTotalBalance)}</td>
                    <td className="px-3 py-2.5" colSpan={8} />
                    <td className="px-3 py-2.5 text-right font-mono text-pos text-sm font-extrabold">
                      {fmtMoney(quickTotalReduced)}
                    </td>
                    <td className="px-3 py-2.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-pos-soft/30 border border-pos/35 specular-card shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-pos tracking-tight uppercase">
                TỔNG TIỀN GIẢM LÃI DỰ KIẾN
              </span>
              <span className="text-2xl sm:text-3xl font-black text-pos font-mono tracking-tight">
                {fmtMoney(quickTotalReduced)}
              </span>
            </div>
            <div className="text-[11px] text-ink-muted pt-2 border-t border-pos/25 space-y-1">
              <div>• Tiền giảm lãi = Số dư × (LSCV theo quy định − LS đề xuất) × Số ngày / 365.</div>
              <div>• Số ngày áp dụng nhập theo ngày thực tế phê duyệt (61 ngày ứng với 2 tháng).</div>
              <div>• HSRR chỉ để tham chiếu hồ sơ, không tham gia công thức tính tiền giảm lãi.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
