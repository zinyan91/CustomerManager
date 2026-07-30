import React, { useState } from 'react';
import { RefreshCw, Download, Printer } from 'lucide-react';
import type { ThemeStyles } from '../../lib/themeStyles';
import { DateInput } from '../DateInput';
import { fmtDate } from '../../lib/utils';

function addMonths(dateStr: string, months: number): string {
  if (!dateStr || !months || isNaN(months) || months <= 0) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    let targetY = y + Math.floor((m + months) / 12);
    let targetM = (m + months) % 12;
    if (targetM < 0) { targetM += 12; targetY -= 1; }

    const daysInTargetMonth = new Date(targetY, targetM + 1, 0).getDate();
    const targetD = Math.min(d, daysInTargetMonth);

    const mm = String(targetM + 1).padStart(2, '0');
    const dd = String(targetD).padStart(2, '0');
    return `${targetY}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

function diffDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  try {
    const p1 = startDateStr.split('-');
    const p2 = endDateStr.split('-');
    if (p1.length !== 3 || p2.length !== 3) return 0;
    const d1 = new Date(parseInt(p1[0]), parseInt(p1[1]) - 1, parseInt(p1[2]));
    const d2 = new Date(parseInt(p2[0]), parseInt(p2[1]) - 1, parseInt(p2[2]));
    const diff = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

function exportToExcelHTML(
  filename: string,
  title: string,
  params: { label: string; value: string }[],
  headers: string[],
  rows: (string | number)[][],
  footerRow?: (string | number)[]
) {
  let paramRowsHtml = '';
  for (let i = 0; i < params.length; i += 2) {
    const p1 = params[i];
    const p2 = params[i + 1];
    paramRowsHtml += `
      <tr>
        <td class="param-label">${p1 ? p1.label : ''}</td>
        <td class="param-val">${p1 ? p1.value : ''}</td>
        <td class="param-label">${p2 ? p2.label : ''}</td>
        <td class="param-val">${p2 ? p2.value : ''}</td>
      </tr>
    `;
  }

  const headerHtml = headers.map(h => `<th>${h}</th>`).join('');

  const bodyHtml = rows.map((r, idx) => {
    const bgClass = idx % 2 === 0 ? 'row-even' : 'row-odd';
    const cellsHtml = r.map((c, colIdx) => {
      const isNum = typeof c === 'number';
      const alignClass = colIdx === 0 ? 'text-center text-bold' : isNum ? 'text-right font-mono' : 'text-center';
      const formatted = isNum ? c.toLocaleString('vi-VN') : c;
      return `<td class="${alignClass}">${formatted}</td>`;
    }).join('');
    return `<tr class="${bgClass}">${cellsHtml}</tr>`;
  }).join('');

  let footerHtml = '';
  if (footerRow) {
    const footerCells = footerRow.map((c, colIdx) => {
      const isNum = typeof c === 'number';
      const alignClass = colIdx === 0 ? 'text-center' : isNum ? 'text-right font-mono' : 'text-center';
      const formatted = isNum ? c.toLocaleString('vi-VN') : c;
      return `<td class="${alignClass}">${formatted}</td>`;
    }).join('');
    footerHtml = `<tfoot><tr class="footer-row">${footerCells}</tr></tfoot>`;
  }

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1e293b; background-color: #ffffff; }
        .title { text-align: center; font-size: 16px; font-weight: bold; color: #0284c7; padding: 10px 0; text-transform: uppercase; }
        .param-table { width: 100%; margin-bottom: 15px; border-collapse: collapse; background-color: #f8fafc; border: 1px solid #cbd5e1; }
        .param-table td { padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 11px; }
        .param-label { font-weight: bold; color: #475569; width: 20%; background-color: #f1f5f9; }
        .param-val { color: #0f172a; width: 30%; font-weight: 600; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .data-table th { background-color: #0284c7; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #0369a1; text-align: center; font-size: 11px; }
        .data-table td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 11px; }
        .row-even { background-color: #ffffff; }
        .row-odd { background-color: #f8fafc; }
        .footer-row td { background-color: #e0f2fe; color: #0369a1; font-weight: bold; font-size: 12px; border: 1px solid #7dd3fc; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }
        .font-mono { font-family: 'Courier New', Courier, monospace; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="title">${title}</div>
      <table class="param-table">${paramRowsHtml}</table>
      <table class="data-table">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
        ${footerHtml}
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface Tool1LoanScheduleCalcProps {
  styles: ThemeStyles;
  isLight: boolean;
}

export const Tool1LoanScheduleCalc: React.FC<Tool1LoanScheduleCalcProps> = ({ styles, isLight }) => {
  const [loanAmountStr, setLoanAmountStr] = useState('500.000.000');
  const [interestRateStr, setInterestRateStr] = useState('8.5');
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [disbursementDate, setDisbursementDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [repayMethod, setRepayMethod] = useState<'equal_principal' | 'bullet'>('equal_principal');
  const [principalGraceMonths, setPrincipalGraceMonths] = useState<number>(0);

  // PREPAYMENT (TRẢ NỢ TRƯỚC HẠN) STATE
  const [prepaymentAmountStr, setPrepaymentAmountStr] = useState('0');
  const [prepaymentPeriod, setPrepaymentPeriod] = useState<number>(3);
  const [prepaymentMode, setPrepaymentMode] = useState<'reduce_monthly' | 'shorten_tenor'>('reduce_monthly');

  const loanAmt = parseFloat(loanAmountStr.replace(/\D/g, '')) || 0;
  const rateAnnual = parseFloat(interestRateStr) || 0;
  const rateDecimal = rateAnnual / 100;
  const prepayAmt = parseFloat(prepaymentAmountStr.replace(/\D/g, '')) || 0;

  const scheduleRows = React.useMemo(() => {
    if (!loanAmt || !rateAnnual || !tenorMonths || !disbursementDate) return [];

    const rows: {
      period: number;
      dueDate: string;
      days: number;
      beginningBalance: number;
      principal: number;
      interest: number;
      totalPayment: number;
      endingBalance: number;
      prepayment: number;
    }[] = [];

    let currentBalance = loanAmt;
    let prevDate = disbursementDate;

    const repayPeriods = Math.max(1, tenorMonths - principalGraceMonths);
    let stepPrincipal = repayMethod === 'bullet'
      ? 0
      : Math.ceil((loanAmt / repayPeriods) / 1000) * 1000;

    for (let i = 1; i <= tenorMonths; i++) {
      if (currentBalance <= 0) break;

      const dueDate = addMonths(disbursementDate, i);
      const days = diffDays(prevDate, dueDate);

      let normalPrincipal = 0;
      if (repayMethod === 'bullet') {
        normalPrincipal = (i === tenorMonths) ? currentBalance : 0;
      } else {
        if (i <= principalGraceMonths) {
          normalPrincipal = 0;
        } else if (i === tenorMonths) {
          normalPrincipal = currentBalance;
        } else {
          normalPrincipal = Math.min(currentBalance, stepPrincipal);
        }
      }

      // Prepayment applied at period `prepaymentPeriod`
      let periodPrepay = 0;
      if (prepayAmt > 0 && i === prepaymentPeriod) {
        const remainingAfterNormal = Math.max(0, currentBalance - normalPrincipal);
        periodPrepay = Math.min(remainingAfterNormal, prepayAmt);
      }

      const totalPrincipalInPeriod = Math.min(currentBalance, normalPrincipal + periodPrepay);
      const interest = Math.round(currentBalance * rateDecimal * (days / 365));
      const totalPayment = totalPrincipalInPeriod + interest;
      const endingBalance = Math.max(0, currentBalance - totalPrincipalInPeriod);

      rows.push({
        period: i,
        dueDate,
        days,
        beginningBalance: currentBalance,
        principal: totalPrincipalInPeriod,
        interest,
        totalPayment,
        endingBalance,
        prepayment: periodPrepay,
      });

      // Recalculate remaining monthly principal if `reduce_monthly` mode selected after prepayment
      if (periodPrepay > 0 && prepaymentMode === 'reduce_monthly' && repayMethod !== 'bullet') {
        const remainingPeriods = tenorMonths - i;
        if (remainingPeriods > 0 && endingBalance > 0) {
          stepPrincipal = Math.ceil((endingBalance / remainingPeriods) / 1000) * 1000;
        }
      }

      currentBalance = endingBalance;
      prevDate = dueDate;
    }

    return rows;
  }, [loanAmt, rateAnnual, rateDecimal, tenorMonths, disbursementDate, repayMethod, principalGraceMonths, prepayAmt, prepaymentPeriod, prepaymentMode]);

  const totalPrincipalSum = scheduleRows.reduce((a, r) => a + r.principal, 0);
  const totalInterestSum = scheduleRows.reduce((a, r) => a + r.interest, 0);
  const totalObligationSum = totalPrincipalSum + totalInterestSum;

  const handleExportExcel = () => {
    if (scheduleRows.length === 0) return;
    const params = [
      { label: 'Số tiền vay:', value: `${loanAmt.toLocaleString('vi-VN')} VNĐ` },
      { label: 'Lãi suất áp dụng:', value: `${rateAnnual}%/năm` },
      { label: 'Thời hạn vay:', value: `${tenorMonths} tháng` },
      { label: 'Ân hạn gốc:', value: `${principalGraceMonths} tháng` },
      { label: 'Ngày giải ngân:', value: fmtDate(disbursementDate) },
      { label: 'Phương thức trả gốc:', value: repayMethod === 'bullet' ? 'Gốc trả cuối kỳ' : 'Gốc trả đều hàng tháng' },
    ];
    const headers = ['Kỳ', 'Ngày Đến Hạn', 'Số Ngày', 'Dư Nợ Đầu Kỳ', 'Gốc Trả', 'Lãi Thường', 'Tổng Trả Trong Kỳ', 'Dư Nợ Cuối Kỳ'];
    const rows = scheduleRows.map(r => [
      `Kỳ ${r.period}`,
      fmtDate(r.dueDate),
      r.days,
      r.beginningBalance,
      r.principal,
      r.interest,
      r.totalPayment,
      r.endingBalance,
    ]);
    const footer = ['TỔNG CỘNG', '', '', '', totalPrincipalSum, totalInterestSum, totalObligationSum, 0];
    exportToExcelHTML('Lich_Thu_No_Vay', 'BẢNG CHI TIẾT LỊCH THU NỢ DỰ KIẾN KHOẢN VAY', params, headers, rows, footer);
  };

  return (
    <div className="space-y-4">
      {/* Input Parameters Box */}
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4`}>
        <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-4 h-4" />
          <span>THÔNG SỐ KHOẢN VAY CẦN TÍNH LỊCH</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Số tiền vay (VNĐ) *</label>
            <input
              type="text"
              value={loanAmountStr}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                setLoanAmountStr(digits ? Number(digits).toLocaleString('vi-VN') : '');
              }}
              className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Lãi suất vay (%/năm) *</label>
            <input
              type="text"
              value={interestRateStr}
              onChange={e => setInterestRateStr(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-mono font-bold ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Thời hạn vay (tháng) *</label>
            <input
              type="number"
              min={1}
              max={360}
              value={tenorMonths}
              onChange={e => setTenorMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`w-full rounded-xl p-2.5 font-mono font-bold ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày giải ngân *</label>
            <DateInput
              value={disbursementDate}
              onChange={val => setDisbursementDate(val)}
              className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Phương thức trả gốc *</label>
            <select
              value={repayMethod}
              onChange={e => setRepayMethod(e.target.value as any)}
              className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`}
            >
              <option value="equal_principal">Gốc trả đều hàng tháng (Dư nợ giảm dần)</option>
              <option value="bullet">Gốc trả cuối kỳ (Bullet Payment)</option>
            </select>
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ân hạn gốc (tháng)</label>
            <input
              type="number"
              min={0}
              max={tenorMonths - 1}
              value={principalGraceMonths}
              onChange={e => setPrincipalGraceMonths(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
            />
          </div>
        </div>

        {/* Section: TRẢ NỢ TRƯỚC HẠN (PREPAYMENT) */}
        <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 space-y-3">
          <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-2 border-b pb-1.5 border-amber-200 dark:border-amber-900/40">
            <span>⚡ CẬP NHẬT TRẢ NỢ TRƯỚC HẠN (TÍNH LẠI GỐC LÃI TỰ ĐỘNG)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-bold text-amber-800 dark:text-amber-300 text-xs">Số tiền trả nợ trước hạn (VNĐ)</label>
              <input
                type="text"
                value={prepaymentAmountStr}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setPrepaymentAmountStr(digits ? Number(digits).toLocaleString('vi-VN') : '0');
                }}
                placeholder="Nhập số tiền trả trước hạn..."
                className={`w-full rounded-xl p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 ${styles.inputStyle}`}
              />
            </div>

            <div>
              <label className="block mb-1 font-bold text-amber-800 dark:text-amber-300 text-xs">Trả nợ trước hạn tại Kỳ số</label>
              <input
                type="number"
                min={1}
                max={tenorMonths}
                value={prepaymentPeriod}
                onChange={e => setPrepaymentPeriod(Math.max(1, Math.min(tenorMonths, parseInt(e.target.value, 10) || 1)))}
                className={`w-full rounded-xl p-2 font-mono font-bold ${styles.inputStyle}`}
              />
            </div>

            <div>
              <label className="block mb-1 font-bold text-amber-800 dark:text-amber-300 text-xs">Phương án xử lý sau trả trước hạn</label>
              <select
                value={prepaymentMode}
                onChange={e => setPrepaymentMode(e.target.value as any)}
                className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`}
              >
                <option value="reduce_monthly">Giảm số tiền gốc trả hàng tháng các kỳ còn lại</option>
                <option value="shorten_tenor">Rút ngắn thời hạn vay (kết thúc khoản vay sớm)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Table Box */}
      <div className={`${styles.containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
        <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
          <span className="font-bold text-xs uppercase flex items-center space-x-2">
            <span>BẢNG LỊCH THU NỢ DỰ KIẾN ({scheduleRows.length} KỲ)</span>
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel Đẹp (.xls)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In / Xuất PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 ${styles.tableHeaderStyle}`}>
              <tr>
                <th className="p-3 text-center whitespace-nowrap">KỲ</th>
                <th className="p-3 whitespace-nowrap text-center">NGÀY ĐẾN HẠN</th>
                <th className="p-3 text-center whitespace-nowrap">SỐ NGÀY</th>
                <th className="p-3 text-right whitespace-nowrap">DƯ NỢ ĐẦU KỲ</th>
                <th className="p-3 text-right whitespace-nowrap text-sky-600 dark:text-sky-400">GỐC TRẢ</th>
                <th className="p-3 text-right whitespace-nowrap text-amber-600 dark:text-amber-400">LÃI THƯỜNG</th>
                <th className="p-3 text-right whitespace-nowrap text-emerald-600 dark:text-emerald-400">TỔNG TRẢ TRONG KỲ</th>
                <th className="p-3 text-right whitespace-nowrap">DƯ NỢ CUỐI KỲ</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
              {scheduleRows.map(r => (
                <tr key={r.period} className={`${styles.tableRowHover} ${r.prepayment > 0 ? 'bg-amber-500/10 dark:bg-amber-500/15 font-bold border-l-4 border-amber-500' : ''}`}>
                  <td className="p-3 text-center font-bold font-mono">
                    #{r.period}
                    {r.prepayment > 0 && (
                      <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-normal">⚡ Trả trước hạn</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-mono font-bold">{fmtDate(r.dueDate)}</td>
                  <td className="p-3 text-center font-mono">{r.days}d</td>
                  <td className="p-3 text-right font-mono">{r.beginningBalance.toLocaleString('vi-VN')}</td>
                  <td className="p-3 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                    {r.principal.toLocaleString('vi-VN')}
                    {r.prepayment > 0 && (
                      <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                        (+{r.prepayment.toLocaleString('vi-VN')}đ)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">{r.interest.toLocaleString('vi-VN')}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.totalPayment.toLocaleString('vi-VN')}</td>
                  <td className="p-3 text-right font-mono">{r.endingBalance.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className={`border-t sticky bottom-0 font-bold ${styles.tableHeaderStyle}`}>
              <tr>
                <td colSpan={4} className="p-3 text-center">TỔNG CỘNG LỊCH THU NỢ</td>
                <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono">{totalPrincipalSum.toLocaleString('vi-VN')}</td>
                <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-mono">{totalInterestSum.toLocaleString('vi-VN')}</td>
                <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">{totalObligationSum.toLocaleString('vi-VN')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
