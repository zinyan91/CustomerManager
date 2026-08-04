import React, { useState } from 'react';
import { RefreshCw, Download, Printer, Plus, Trash2 } from 'lucide-react';
import type { ThemeStyles } from '../../lib/themeStyles';
import { DateInput } from '../DateInput';
import { fmtDate } from '../../lib/utils';
import { buildLoanSchedule, postPromoRateAnnual } from '../../lib/calcMath';
import type { PrepaymentMode, PrepaymentPlanItem } from '../../lib/calcMath';
import { ScheduleCustomerExport } from './ScheduleCustomerExport';
import { buildCustomerScheduleDocHtml } from '../../lib/scheduleDocHtml';
import { printHtmlDoc } from '../../lib/printHtmlDoc';

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

interface PrepaymentRow {
  id: number;
  periodStr: string;
  amountStr: string;
  mode: PrepaymentMode;
}

let prepaymentIdSeq = 0;
function nextPrepaymentId(): number {
  prepaymentIdSeq += 1;
  return prepaymentIdSeq;
}

function parseNumOrNull(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (s === '') return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
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

  const [promoMonthsStr, setPromoMonthsStr] = useState('0');
  const [postPromoBaseRateStr, setPostPromoBaseRateStr] = useState('');
  const [marginStr, setMarginStr] = useState('');

  const [prepayments, setPrepayments] = useState<PrepaymentRow[]>([]);

  const loanAmt = parseFloat(loanAmountStr.replace(/\D/g, '')) || 0;
  const rateAnnual = parseFloat(interestRateStr) || 0;

  const promoMonths = parseNumOrNull(promoMonthsStr);
  const postPromoBaseRate = parseNumOrNull(postPromoBaseRateStr);
  const marginAnnual = parseNumOrNull(marginStr);

  const hasPromo = promoMonths !== null && promoMonths > 0;
  const postRate = postPromoRateAnnual({
    promoRateAnnual: rateAnnual,
    postPromoBaseRateAnnual: postPromoBaseRate,
    marginAnnual,
  });

  const prepaymentPlan: PrepaymentPlanItem[] = React.useMemo(
    () => prepayments
      .map(p => ({
        period: parseInt(p.periodStr, 10),
        amount: parseFloat(p.amountStr.replace(/\D/g, '')),
        mode: p.mode,
      }))
      .filter(p => Number.isFinite(p.period) && p.period >= 1 && p.period <= tenorMonths
        && Number.isFinite(p.amount) && p.amount > 0),
    [prepayments, tenorMonths]
  );

  const scheduleRows = React.useMemo(
    () => buildLoanSchedule({
      loanAmount: loanAmt,
      promoRateAnnual: rateAnnual,
      tenorMonths,
      disbursementDate,
      repayMethod,
      principalGraceMonths,
      promoMonths,
      postPromoBaseRateAnnual: postPromoBaseRate,
      marginAnnual,
      prepayments: prepaymentPlan,
    }),
    [loanAmt, rateAnnual, tenorMonths, disbursementDate, repayMethod, principalGraceMonths,
      promoMonths, postPromoBaseRate, marginAnnual, prepaymentPlan]
  );

  const addPrepayment = () => {
    setPrepayments(prev => [
      ...prev,
      { id: nextPrepaymentId(), periodStr: String(Math.min(tenorMonths, prev.length + 1)), amountStr: '', mode: 'reduce_monthly' },
    ]);
  };

  const updatePrepayment = (id: number, patch: Partial<PrepaymentRow>) => {
    setPrepayments(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePrepayment = (id: number) => {
    setPrepayments(prev => prev.filter(p => p.id !== id));
  };

  const totalPrincipalSum = scheduleRows.reduce((a, r) => a + r.principal, 0);
  const totalInterestSum = scheduleRows.reduce((a, r) => a + r.interest, 0);
  const totalObligationSum = totalPrincipalSum + totalInterestSum;

  const loanInfoPairs = [
    { label: 'Số tiền vay:', value: `${loanAmt.toLocaleString('vi-VN')} VNĐ` },
    {
      label: hasPromo ? 'Lãi suất ưu đãi:' : 'Lãi suất áp dụng:',
      value: hasPromo ? `${rateAnnual}%/năm trong ${promoMonths} tháng đầu` : `${rateAnnual}%/năm`,
    },
    ...(hasPromo
      ? [{
        label: 'Lãi suất sau ưu đãi:',
        value: `${postRate.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%/năm`
          + (postPromoBaseRate !== null || marginAnnual !== null
            ? ` (cơ sở ${(postPromoBaseRate === null ? rateAnnual : postPromoBaseRate).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`
              + ` + biên độ ${(marginAnnual === null ? 0 : marginAnnual).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%)`
            : ''),
      }]
      : []),
    { label: 'Thời hạn vay:', value: `${tenorMonths} tháng` },
    { label: 'Ân hạn gốc:', value: `${principalGraceMonths} tháng` },
    { label: 'Ngày giải ngân:', value: fmtDate(disbursementDate) },
    { label: 'Phương thức trả gốc:', value: repayMethod === 'bullet' ? 'Gốc trả cuối kỳ' : 'Gốc trả đều hàng tháng' },
    ...(prepaymentPlan.length > 0
      ? [{
        label: 'Trả nợ trước hạn:',
        value: prepaymentPlan
          .map(p => `Kỳ ${p.period}: ${p.amount.toLocaleString('vi-VN')}đ`)
          .join('; '),
      }]
      : []),
  ];

  const handleExportExcel = () => {
    if (scheduleRows.length === 0) return;
    const headers = ['Kỳ', 'Ngày Bắt Đầu', 'Ngày Đến Hạn', 'Số Ngày', 'LS Áp Dụng (%/năm)', 'Dư Nợ Đầu Kỳ', 'Gốc Trả', 'Lãi Thường', 'Tổng Trả Trong Kỳ', 'Dư Nợ Cuối Kỳ'];
    const rows = scheduleRows.map(r => [
      `Kỳ ${r.period}`,
      fmtDate(r.startDate),
      fmtDate(r.dueDate),
      r.days,
      r.rateAnnual.toLocaleString('vi-VN', { maximumFractionDigits: 2 }),
      r.beginningBalance,
      r.principal,
      r.interest,
      r.totalPayment,
      r.endingBalance,
    ]);
    const footer = ['TỔNG CỘNG', '', '', '', '', '', totalPrincipalSum, totalInterestSum, totalObligationSum, 0];
    exportToExcelHTML('Lich_Thu_No_Vay', 'BẢNG CHI TIẾT LỊCH THU NỢ DỰ KIẾN KHOẢN VAY', loanInfoPairs, headers, rows, footer);
  };

  const handlePrintSchedule = () => {
    if (scheduleRows.length === 0) return;
    const html = buildCustomerScheduleDocHtml({
      rows: scheduleRows,
      info: loanInfoPairs,
      totals: { principal: totalPrincipalSum, interest: totalInterestSum, total: totalObligationSum },
      title: 'Bảng lịch thu nợ dự kiến',
      subtitle: '(Bản nội bộ phục vụ thẩm định khoản vay)',
      showSignature: false,
      noteText: '',
    });
    printHtmlDoc(html, 'Bảng lịch thu nợ dự kiến');
  };

  return (
    <div className="space-y-4">

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
            <label className={`block mb-1 ${styles.labelStyle}`}>
              {hasPromo ? 'Lãi suất ưu đãi (%/năm) *' : 'Lãi suất vay (%/năm) *'}
            </label>
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

        <div className="p-3.5 rounded-xl border border-sky-300 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-950/20 space-y-3">
          <div className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider flex items-center justify-between gap-2 border-b pb-1.5 border-sky-200 dark:border-sky-900/40">
            <span>🎁 LÃI SUẤT ƯU ĐÃI VÀ LÃI SUẤT SAU ƯU ĐÃI</span>
            {hasPromo && (
              <span className="normal-case font-mono">
                Kỳ 1–{promoMonths}: {rateAnnual.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%/năm → từ kỳ {(promoMonths as number) + 1}: {postRate.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%/năm
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block mb-1 font-bold text-sky-800 dark:text-sky-300 text-xs">Số tháng ưu đãi</label>
              <input
                type="number"
                min={0}
                max={tenorMonths}
                value={promoMonthsStr}
                onChange={e => setPromoMonthsStr(e.target.value)}
                className={`w-full rounded-xl p-2 font-mono font-bold ${styles.inputStyle}`}
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-sky-800 dark:text-sky-300 text-xs">LS cơ sở sau ưu đãi (%/năm)</label>
              <input
                type="text"
                value={postPromoBaseRateStr}
                onChange={e => setPostPromoBaseRateStr(e.target.value)}
                placeholder="VD: 8.5"
                className={`w-full rounded-xl p-2 font-mono font-bold ${styles.inputStyle}`}
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-sky-800 dark:text-sky-300 text-xs">Biên độ (%/năm)</label>
              <input
                type="text"
                value={marginStr}
                onChange={e => setMarginStr(e.target.value)}
                placeholder="VD: 3.5"
                className={`w-full rounded-xl p-2 font-mono font-bold ${styles.inputStyle}`}
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-sky-800 dark:text-sky-300 text-xs">LS sau ưu đãi (%/năm)</label>
              <div className={`w-full rounded-xl p-2 font-mono font-bold text-sky-600 dark:text-sky-400 border border-dashed ${isLight ? 'border-sky-300 bg-white/60' : 'border-sky-800 bg-slate-950/40'}`}>
                {hasPromo
                  ? `${postRate.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%/năm`
                  : 'Không áp dụng'}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-sky-700/80 dark:text-sky-400/80 leading-relaxed">
            Số tháng ưu đãi = 0 thì toàn bộ kỳ hạn dùng một lãi suất. LS sau ưu đãi = LS cơ sở + biên độ; để trống LS cơ sở thì lấy lãi suất ưu đãi làm cơ sở.
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 space-y-3">
          <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between gap-2 border-b pb-1.5 border-amber-200 dark:border-amber-900/40">
            <span>⚡ TRẢ NỢ TRƯỚC HẠN NHIỀU KỲ (TÍNH LẠI GỐC LÃI TỰ ĐỘNG)</span>
            <button
              type="button"
              onClick={addPrepayment}
              className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg normal-case"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm lần trả trước hạn</span>
            </button>
          </div>

          {prepayments.length === 0 ? (
            <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
              Chưa khai lần trả trước hạn nào. Bấm “Thêm lần trả trước hạn” để khai một hoặc nhiều lần ở các kỳ khác nhau.
            </div>
          ) : (
            <div className="space-y-2">
              {prepayments.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-bold text-amber-800 dark:text-amber-300 text-[11px]">Lần {idx + 1} — Kỳ số</label>
                    <input
                      type="number"
                      min={1}
                      max={tenorMonths}
                      value={p.periodStr}
                      onChange={e => updatePrepayment(p.id, { periodStr: e.target.value })}
                      className={`w-full rounded-xl p-2 font-mono font-bold ${styles.inputStyle}`}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block mb-1 font-bold text-amber-800 dark:text-amber-300 text-[11px]">Số tiền trả trước hạn (VNĐ)</label>
                    <input
                      type="text"
                      value={p.amountStr}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '');
                        updatePrepayment(p.id, { amountStr: digits ? Number(digits).toLocaleString('vi-VN') : '' });
                      }}
                      placeholder="Nhập số tiền..."
                      className={`w-full rounded-xl p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 ${styles.inputStyle}`}
                    />
                  </div>
                  <div className="md:col-span-5">
                    <label className="block mb-1 font-bold text-amber-800 dark:text-amber-300 text-[11px]">Phương án xử lý sau lần trả này</label>
                    <select
                      value={p.mode}
                      onChange={e => updatePrepayment(p.id, { mode: e.target.value as PrepaymentMode })}
                      className={`w-full rounded-xl p-2 font-bold ${styles.inputStyle}`}
                    >
                      <option value="reduce_monthly">Giảm số tiền gốc trả hàng tháng các kỳ còn lại</option>
                      <option value="shorten_tenor">Rút ngắn thời hạn vay (kết thúc khoản vay sớm)</option>
                    </select>
                  </div>
                  <div className="md:col-span-1 flex md:justify-end">
                    <button
                      type="button"
                      onClick={() => removePrepayment(p.id)}
                      title="Xoá lần trả trước hạn này"
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                Nhiều lần khai ở cùng một kỳ sẽ được cộng dồn. Số tiền vượt dư nợ còn lại tự động cắt về đúng dư nợ.
              </div>
            </div>
          )}
        </div>
      </div>

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
              <span>Xuất Excel (.xls)</span>
            </button>
            <button
              type="button"
              onClick={handlePrintSchedule}
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
                <th className="p-3 whitespace-nowrap text-center">NGÀY BẮT ĐẦU</th>
                <th className="p-3 whitespace-nowrap text-center">NGÀY ĐẾN HẠN</th>
                <th className="p-3 text-center whitespace-nowrap">SỐ NGÀY</th>
                <th className="p-3 text-center whitespace-nowrap">LS ÁP DỤNG</th>
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
                  <td className="p-3 text-center font-mono">{fmtDate(r.startDate)}</td>
                  <td className="p-3 text-center font-mono font-bold">{fmtDate(r.dueDate)}</td>
                  <td className="p-3 text-center font-mono">{r.days}d</td>
                  <td className="p-3 text-center font-mono">{r.rateAnnual.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%</td>
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
                <td colSpan={6} className="p-3 text-center">TỔNG CỘNG LỊCH THU NỢ</td>
                <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono">{totalPrincipalSum.toLocaleString('vi-VN')}</td>
                <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-mono">{totalInterestSum.toLocaleString('vi-VN')}</td>
                <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">{totalObligationSum.toLocaleString('vi-VN')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <ScheduleCustomerExport
        styles={styles}
        isLight={isLight}
        rows={scheduleRows}
        info={loanInfoPairs}
        totals={{ principal: totalPrincipalSum, interest: totalInterestSum, total: totalObligationSum }}
      />
    </div>
  );
};
