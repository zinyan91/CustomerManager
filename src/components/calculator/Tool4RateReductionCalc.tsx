import React, { useState, useMemo } from 'react';
import { Percent, TrendingDown, Download, FileSpreadsheet, Calculator, Calendar, Plus, Trash2 } from 'lucide-react';
import { fmtMoney, fmtDate, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import {
  calcRateReductionForLoan,
  sumInterestReduced,
  buildRateReductionSchedule,
  summarizeRateReduction,
} from '../../lib/rateReduction';
import type { ThemeStyles } from '../../lib/themeStyles';

interface Tool4Props {
  styles: ThemeStyles;
  isLight: boolean;
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

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

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

export const Tool4RateReductionCalc: React.FC<Tool4Props> = ({ isLight }) => {
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
  const [tdhStartDate, setTdhStartDate] = useState(() => new Date().toISOString().split('T')[0]);

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

  const downloadXls = (html: string, fileName: string) => {
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const xlsShell = (title: string, subtitle: string, tableHtml: string) => `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8"/>
      <style>
        td, th { border: 1px solid #cbd5e1; padding: 6px; font-family: Arial, sans-serif; font-size: 11pt; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <p>${subtitle}</p>
      ${tableHtml}
      <p style="font-size:10pt;color:#475569;">
        Tiền giảm lãi = Số dư × (LSCV theo quy định − LS đề xuất) × Số ngày / 365 (Actual/365).
      </p>
    </body>
    </html>
  `;

  const handleExportTdh = () => {
    const headerHtml = `
      <tr style="background-color:#0284c7;color:#ffffff;font-weight:bold;text-align:center;">
        <th>Kỳ (Tháng)</th>
        <th>Ngày thanh toán</th>
        <th>Số ngày thực tế</th>
        <th>Dư nợ đầu kỳ (VND)</th>
        <th>Gốc trả kỳ (VND)</th>
        <th>LS quy định (%/năm)</th>
        <th>LS giảm chốt (%/năm)</th>
        <th>Chênh lệch ΔLS (%)</th>
        <th>Tiền giảm lãi kỳ (VND)</th>
        <th>Lãi chưa giảm (VND)</th>
        <th>Lãi sau giảm (VND)</th>
        <th>Dư nợ cuối kỳ (VND)</th>
      </tr>
    `;

    const bodyHtml = tdhScheduleRows.map(r => `
      <tr style="${r.isReduced ? 'background-color:#f0fdf4;' : ''}">
        <td style="text-align:center;font-weight:bold;">${r.month}</td>
        <td style="text-align:center;">${fmtDate(r.paymentDate)}</td>
        <td style="text-align:center;">${r.daysInPeriod}</td>
        <td style="text-align:right;">${r.beginningBalance.toLocaleString('vi-VN')}</td>
        <td style="text-align:right;">${r.principalPayment.toLocaleString('vi-VN')}</td>
        <td style="text-align:center;">${pct(r.standardRateAnnual)}</td>
        <td style="text-align:center;font-weight:bold;color:${r.isReduced ? '#16a34a' : '#000'};">${pct(r.reducedRateAnnual)}</td>
        <td style="text-align:center;color:#dc2626;">${pct(r.deltaRateAnnual)}</td>
        <td style="text-align:right;font-weight:bold;color:#16a34a;">${r.interestReduced.toLocaleString('vi-VN')}</td>
        <td style="text-align:right;">${r.interestOriginal.toLocaleString('vi-VN')}</td>
        <td style="text-align:right;font-weight:bold;">${r.interestFinal.toLocaleString('vi-VN')}</td>
        <td style="text-align:right;">${r.endingBalance.toLocaleString('vi-VN')}</td>
      </tr>
    `).join('');

    const footerHtml = `
      <tr style="background-color:#e0f2fe;font-weight:bold;">
        <td colspan="4" style="text-align:right;color:#0369a1;">TỔNG</td>
        <td style="text-align:right;">${tdhSummary.totalPrincipal.toLocaleString('vi-VN')}</td>
        <td colspan="3" style="text-align:right;color:#0369a1;">TỔNG TIỀN GIẢM LÃI DỰ KIẾN:</td>
        <td style="text-align:right;color:#16a34a;">${tdhSummary.totalInterestReduced.toLocaleString('vi-VN')}</td>
        <td style="text-align:right;">${tdhSummary.totalInterestOriginal.toLocaleString('vi-VN')}</td>
        <td style="text-align:right;color:#0369a1;">${tdhSummary.totalInterestFinal.toLocaleString('vi-VN')}</td>
        <td></td>
      </tr>
    `;

    const subtitle = [
      `<strong>Số tiền vay:</strong> ${tdhLoanAmt.toLocaleString('vi-VN')} VNĐ`,
      `<strong>Thời hạn:</strong> ${tdhTenorMonths} tháng`,
      `<strong>LS ưu đãi:</strong> ${pct(tdhPrefRate)} (${tdhPrefMonths} tháng)`,
      `<strong>LS sau ưu đãi:</strong> ${pct(tdhPostPrefRate)}`,
      `<strong>Áp dụng giảm:</strong> tháng ${tdhStartMonth} → ${tdhStartMonth + tdhNumMonthsReduce - 1}`,
    ].join(' | ');

    downloadXls(
      xlsShell(
        'BẢNG TÍNH GIẢM LÃI SUẤT VAY TRUNG DÀI HẠN (GỐC ĐỀU, ACTUAL/365)',
        subtitle,
        `<table><thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody><tfoot>${footerHtml}</tfoot></table>`
      ),
      `BANG_TINH_GIAM_LAI_TDH_${new Date().toISOString().split('T')[0]}.xls`
    );
  };

  const handleExportQuick = () => {
    const headerHtml = `
      <tr style="background-color:#0284c7;color:#ffffff;font-weight:bold;text-align:center;">
        <th>STT</th>
        <th>Khoản vay</th>
        <th>Tài khoản vay</th>
        <th>Thời hạn khoản vay</th>
        <th>Số dư (VND)</th>
        <th>HSRR</th>
        <th>LSCV theo quy định (%/năm)</th>
        <th>LS đề xuất (%/năm)</th>
        <th>Chênh lệch LS (%/năm)</th>
        <th>Thời hạn áp dụng</th>
        <th>Số ngày áp dụng (Actual/365)</th>
        <th>Tiền giảm lãi dự kiến (VND)</th>
        <th>COF (%/năm)</th>
        <th>Margin (%/năm)</th>
        <th>Margin đề xuất (%/năm)</th>
      </tr>
    `;

    const bodyHtml = quickResults.map((q, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${q.row.name}</td>
        <td style="text-align:center;">${q.row.account}</td>
        <td style="text-align:center;">${q.row.tenorLabel}</td>
        <td style="text-align:right;">${q.balance.toLocaleString('vi-VN')}</td>
        <td style="text-align:center;">${q.row.riskCoefficientStr}</td>
        <td style="text-align:center;">${q.row.standardRateStr}</td>
        <td style="text-align:center;">${q.row.proposedRateStr}</td>
        <td style="text-align:center;color:#dc2626;">${pct(q.result.deltaRateAnnual)}</td>
        <td style="text-align:center;">${q.row.applyLabel}</td>
        <td style="text-align:center;">${q.row.daysStr}</td>
        <td style="text-align:right;font-weight:bold;color:#16a34a;">${q.result.interestReduced.toLocaleString('vi-VN')}</td>
        <td style="text-align:center;">${q.row.cofStr}</td>
        <td style="text-align:center;">${q.result.marginCurrentAnnual === null ? '—' : pct(q.result.marginCurrentAnnual)}</td>
        <td style="text-align:center;">${q.result.marginProposedAnnual === null ? '—' : pct(q.result.marginProposedAnnual)}</td>
      </tr>
    `).join('');

    const footerHtml = `
      <tr style="background-color:#e0f2fe;font-weight:bold;">
        <td colspan="4" style="text-align:right;color:#0369a1;">Tổng</td>
        <td style="text-align:right;">${quickTotalBalance.toLocaleString('vi-VN')}</td>
        <td colspan="6"></td>
        <td style="text-align:right;color:#16a34a;">${quickTotalReduced.toLocaleString('vi-VN')}</td>
        <td colspan="3"></td>
      </tr>
    `;

    downloadXls(
      xlsShell(
        'BẢNG TÍNH GIẢM LÃI SUẤT VAY (NGẮN HẠN / HẠN MỨC)',
        `<strong>Số khoản vay:</strong> ${quickResults.length} | <strong>Tổng số dư:</strong> ${quickTotalBalance.toLocaleString('vi-VN')} VNĐ`,
        `<table><thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody><tfoot>${footerHtml}</tfoot></table>`
      ),
      `BANG_TINH_GIAM_LAI_NGAN_HAN_${new Date().toISOString().split('T')[0]}.xls`
    );
  };

  const cardBg = isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100';
  const inputCls = 'w-full p-2 rounded-xl border text-xs font-mono bg-transparent border-slate-200 dark:border-slate-800';
  const cellInputCls = 'w-full p-1.5 rounded-lg border text-[11px] font-mono bg-transparent border-slate-200 dark:border-slate-800';
  const labelCls = 'block text-[11px] font-bold text-slate-500 mb-1';

  return (
    <div className="space-y-5">

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3`}>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center space-x-2">
            <TrendingDown className="w-5 h-5 text-emerald-500" />
            <span>CÔNG CỤ TÍNH GIẢM LÃI SUẤT VAY (ACTUAL/365)</span>
          </h2>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setCalcMode('tdh')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              calcMode === 'tdh'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            1. Vay Trung Dài Hạn (Gốc Đều)
          </button>
          <button
            type="button"
            onClick={() => setCalcMode('quick')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              calcMode === 'quick'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            2. Ngắn Hạn / Hạn Mức (Nhiều Khoản)
          </button>
        </div>
      </div>

      {calcMode === 'tdh' && (
        <div className="space-y-4">
          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-4`}>
            <div className="font-bold text-xs text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Calculator className="w-4 h-4" />
              <span>THÔNG SỐ KHOẢN VAY &amp; ĐỀ XUẤT GIẢM LÃI SUẤT</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2.5">
                <div>
                  <label className={labelCls}>Số tiền vay (P) *</label>
                  <input
                    type="text"
                    value={tdhLoanAmtStr}
                    onChange={e => setTdhLoanAmtStr(formatMoneyInput(e.target.value))}
                    className={`${inputCls} font-bold text-sky-600 dark:text-sky-400`}
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

              <div className="space-y-2.5">
                <div>
                  <label className={labelCls}>LS ưu đãi (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhPrefRateStr}
                    onChange={e => setTdhPrefRateStr(e.target.value)}
                    className={`${inputCls} font-bold text-emerald-600 dark:text-emerald-400`}
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
                    className={`${inputCls} font-bold text-amber-600 dark:text-amber-400`}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className={labelCls}>LS đề xuất giảm (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhProposedRateStr}
                    onChange={e => setTdhProposedRateStr(e.target.value)}
                    placeholder="9.9"
                    className={`${inputCls} font-bold text-rose-600 dark:text-rose-400`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tháng bắt đầu giảm (s) *</label>
                  <input
                    type="number"
                    min={1}
                    value={tdhStartMonth}
                    onChange={e => setTdhStartMonth(parseInt(e.target.value, 10) || 1)}
                    className={`${inputCls} font-bold text-purple-600 dark:text-purple-400`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Số tháng giảm (k) *</label>
                  <input
                    type="number"
                    min={0}
                    value={tdhNumMonthsReduce}
                    onChange={e => setTdhNumMonthsReduce(parseInt(e.target.value, 10) || 0)}
                    className={`${inputCls} font-bold text-purple-600 dark:text-purple-400`}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
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

            <div className="text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-2">
              LS giảm chốt = min(LS quy định, max(sàn LSCV, max(LS quy định − trần giảm, LS đề xuất))).
              Kỳ ưu đãi không được giảm thêm.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${cardBg} rounded-2xl p-4 border shadow-sm flex items-center justify-between`}>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TỔNG TIỀN GIẢM LÃI DỰ KIẾN</div>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {fmtMoney(tdhSummary.totalInterestReduced)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {tdhSummary.reducedPeriodCount > 0
                    ? `Áp dụng ${tdhSummary.reducedPeriodCount} kỳ (tháng ${tdhStartMonth} → ${tdhStartMonth + tdhNumMonthsReduce - 1})`
                    : 'Chưa có kỳ nào được giảm'}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>

            <div className={`${cardBg} rounded-2xl p-4 border shadow-sm flex items-center justify-between`}>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">LÃI BAN ĐẦU vs SAU GIẢM</div>
                <div className="text-sm font-extrabold text-sky-600 dark:text-sky-400 mt-1 font-mono">
                  {fmtMoney(tdhSummary.totalInterestOriginal)} → {fmtMoney(tdhSummary.totalInterestFinal)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tiết kiệm:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    -{(tdhSummary.savingRatio * 100).toFixed(2)}%
                  </strong>{' '}
                  chi phí lãi toàn kỳ
                </div>
              </div>
              <div className="p-3 bg-sky-50 dark:bg-sky-950/60 rounded-xl text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                <Percent className="w-6 h-6" />
              </div>
            </div>

            <div className={`${cardBg} rounded-2xl p-4 border shadow-sm flex items-center justify-between`}>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MARGIN SAU GIẢM vs COF</div>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  {effectiveReducedRate === null
                    ? '—'
                    : `${((effectiveReducedRate - tdhCof) * 100).toFixed(2)} %/năm`}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {effectiveReducedRate === null
                    ? 'Chưa áp dụng giảm lãi suất'
                    : `LS giảm chốt ${pct(effectiveReducedRate)} − COF ${pct(tdhCof)}`}
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
            </div>
          </div>

          {effectiveReducedRate !== null && effectiveReducedRate - tdhCof < 0 && (
            <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
              ⚠ LS giảm chốt {pct(effectiveReducedRate)} thấp hơn chi phí vốn COF {pct(tdhCof)} — margin âm, cần cấp có thẩm quyền phê duyệt.
            </div>
          )}

          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-sky-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  LỊCH TRẢ NỢ VÀ TIỀN GIẢM LÃI CHI TIẾT ({tdhScheduleRows.length} KỲ — ACTUAL/365)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleExportTdh}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>XUẤT EXCEL</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2 text-center">KỲ</th>
                    <th className="p-2">NGÀY TRẢ NỢ</th>
                    <th className="p-2 text-center">SỐ NGÀY</th>
                    <th className="p-2 text-right">DƯ NỢ ĐẦU KỲ</th>
                    <th className="p-2 text-right">GỐC TRẢ KỲ</th>
                    <th className="p-2 text-center">LS QUY ĐỊNH</th>
                    <th className="p-2 text-center">LS GIẢM CHỐT</th>
                    <th className="p-2 text-center">ΔLS GIẢM</th>
                    <th className="p-2 text-right font-extrabold text-emerald-600 dark:text-emerald-400">TIỀN GIẢM LÃI KỲ</th>
                    <th className="p-2 text-right">LÃI CHƯA GIẢM</th>
                    <th className="p-2 text-right">LÃI SAU GIẢM</th>
                    <th className="p-2 text-right">DƯ NỢ CUỐI KỲ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {tdhScheduleRows.map(r => (
                    <tr
                      key={r.month}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        r.isReduced ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold' : ''
                      }`}
                    >
                      <td className="p-2 text-center font-bold">{r.month}</td>
                      <td className="p-2 text-sky-600 dark:text-sky-400">{fmtDate(r.paymentDate)}</td>
                      <td className="p-2 text-center">{r.daysInPeriod}</td>
                      <td className="p-2 text-right">{fmtMoney(r.beginningBalance)}</td>
                      <td className="p-2 text-right">{fmtMoney(r.principalPayment)}</td>
                      <td className="p-2 text-center">{pct(r.standardRateAnnual)}</td>
                      <td className={`p-2 text-center font-bold ${r.isReduced ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {pct(r.reducedRateAnnual)}
                      </td>
                      <td className="p-2 text-center text-rose-500 font-bold">
                        {r.isReduced ? `-${pct(r.deltaRateAnnual)}` : '0%'}
                      </td>
                      <td className="p-2 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        {r.isReduced ? fmtMoney(r.interestReduced) : '0 VNĐ'}
                      </td>
                      <td className="p-2 text-right text-slate-500">{fmtMoney(r.interestOriginal)}</td>
                      <td className="p-2 text-right font-bold text-sky-600 dark:text-sky-400">{fmtMoney(r.interestFinal)}</td>
                      <td className="p-2 text-right">{fmtMoney(r.endingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-sky-50 dark:bg-sky-950/40 font-bold border-t-2 border-sky-200 dark:border-sky-800">
                  <tr>
                    <td className="p-2 text-center" colSpan={4}>TỔNG</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(tdhSummary.totalPrincipal)}</td>
                    <td className="p-2" colSpan={3} />
                    <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {fmtMoney(tdhSummary.totalInterestReduced)}
                    </td>
                    <td className="p-2 text-right font-mono">{fmtMoney(tdhSummary.totalInterestOriginal)}</td>
                    <td className="p-2 text-right font-mono text-sky-600 dark:text-sky-400">
                      {fmtMoney(tdhSummary.totalInterestFinal)}
                    </td>
                    <td className="p-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {calcMode === 'quick' && (
        <div className="space-y-4">
          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Percent className="w-4 h-4 text-sky-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  BẢNG TÍNH GIẢM LÃI SUẤT NGẮN HẠN / HẠN MỨC ({quickResults.length} KHOẢN — ACTUAL/365)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addQuickRow}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>THÊM KHOẢN VAY</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportQuick}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>XUẤT EXCEL</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse min-w-[1180px]">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2 text-center">STT</th>
                    <th className="p-2 min-w-[170px]">KHOẢN VAY</th>
                    <th className="p-2 min-w-[100px]">TÀI KHOẢN VAY</th>
                    <th className="p-2 min-w-[90px]">THỜI HẠN</th>
                    <th className="p-2 min-w-[130px] text-right">SỐ DƯ (VND)</th>
                    <th className="p-2 min-w-[60px] text-center">HSRR</th>
                    <th className="p-2 min-w-[80px] text-center">LSCV QUY ĐỊNH</th>
                    <th className="p-2 min-w-[80px] text-center">LS ĐỀ XUẤT</th>
                    <th className="p-2 text-center">ΔLS</th>
                    <th className="p-2 min-w-[90px]">THỜI HẠN ÁP DỤNG</th>
                    <th className="p-2 min-w-[70px] text-center">SỐ NGÀY</th>
                    <th className="p-2 min-w-[70px] text-center">COF</th>
                    <th className="p-2 text-center">MARGIN → ĐỀ XUẤT</th>
                    <th className="p-2 min-w-[130px] text-right font-extrabold text-emerald-600 dark:text-emerald-400">TIỀN GIẢM LÃI</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {quickResults.map((q, idx) => (
                    <tr key={q.row.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-2 text-center font-bold">{idx + 1}</td>
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
                          className={`${cellInputCls} text-right font-bold text-sky-600 dark:text-sky-400`}
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
                          className={`${cellInputCls} text-center font-bold text-amber-600 dark:text-amber-400`}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={q.row.proposedRateStr}
                          onChange={e => updateQuickRow(q.row.key, { proposedRateStr: e.target.value })}
                          className={`${cellInputCls} text-center font-bold text-emerald-600 dark:text-emerald-400`}
                        />
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{pct(q.result.deltaRateAnnual)}
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
                      <td className="p-2 text-center font-mono">
                        {q.result.marginCurrentAnnual === null || q.result.marginProposedAnnual === null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className={q.result.marginProposedAnnual < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                            {pct(q.result.marginCurrentAnnual)} → {pct(q.result.marginProposedAnnual)}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {fmtMoney(q.result.interestReduced)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeQuickRow(q.row.key)}
                          disabled={quickResults.length <= 1}
                          className="text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-sky-50 dark:bg-sky-950/40 font-bold border-t-2 border-sky-200 dark:border-sky-800">
                  <tr>
                    <td className="p-2 text-center" colSpan={4}>TỔNG</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(quickTotalBalance)}</td>
                    <td className="p-2" colSpan={8} />
                    <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {fmtMoney(quickTotalReduced)}
                    </td>
                    <td className="p-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                TỔNG TIỀN GIẢM LÃI DỰ KIẾN
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {fmtMoney(quickTotalReduced)}
              </span>
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 space-y-1">
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
