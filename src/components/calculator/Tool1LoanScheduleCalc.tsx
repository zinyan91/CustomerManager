import React, { useState } from 'react';
import { RefreshCw, Download, Printer, Plus, Trash2 } from 'lucide-react';
import type { UiClasses } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { fmtDate, parseMoneyInput, todayIso } from '../../lib/utils';
import { addMonths, buildLoanSchedule, postPromoRateAnnual } from '../../lib/calcMath';
import type { PrepaymentMode, PrepaymentPlanItem } from '../../lib/calcMath';
import { buildScheduleDocHtml } from '../../lib/scheduleDocHtml';
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
  a.download = `${filename}_${todayIso()}.xls`;
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
  styles: UiClasses;
}

export const Tool1LoanScheduleCalc: React.FC<Tool1LoanScheduleCalcProps> = ({ styles }) => {
  const [loanAmountStr, setLoanAmountStr] = useState('500.000.000');
  const [interestRateStr, setInterestRateStr] = useState('8.5');
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [disbursementDate, setDisbursementDate] = useState(() => todayIso());
  const [firstPaymentDate, setFirstPaymentDate] = useState('');
  const [repayMethod, setRepayMethod] = useState<'equal_principal' | 'bullet'>('equal_principal');
  const [principalGraceMonths, setPrincipalGraceMonths] = useState<number>(0);

  const [promoMonthsStr, setPromoMonthsStr] = useState('0');
  const [baseRateStr, setBaseRateStr] = useState('');
  const [marginStr, setMarginStr] = useState('');
  const [postPromoRateStr, setPostPromoRateStr] = useState('');

  const [prepayments, setPrepayments] = useState<PrepaymentRow[]>([]);

  const loanAmt = parseMoneyInput(loanAmountStr);
  const rateAnnual = parseFloat(interestRateStr) || 0;

  const promoMonths = parseNumOrNull(promoMonthsStr);
  const baseRateAnnual = parseNumOrNull(baseRateStr);
  const marginAnnual = parseNumOrNull(marginStr);
  const postPromoRateOverride = parseNumOrNull(postPromoRateStr);

  const hasPromo = promoMonths !== null && promoMonths > 0;
  const postRate = postPromoRateAnnual({
    promoRateAnnual: rateAnnual,
    baseRateAnnual,
    marginAnnual,
    postPromoRateOverride,
  });

  const prepaymentPlan: PrepaymentPlanItem[] = React.useMemo(
    () => prepayments
      .map(p => ({
        period: parseInt(p.periodStr, 10),
        amount: parseMoneyInput(p.amountStr),
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
      firstPaymentDate,
      repayMethod,
      principalGraceMonths,
      promoMonths,
      baseRateAnnual,
      marginAnnual,
      postPromoRateOverride,
      prepayments: prepaymentPlan,
    }),
    [loanAmt, rateAnnual, tenorMonths, disbursementDate, firstPaymentDate, repayMethod,
      principalGraceMonths, promoMonths, baseRateAnnual, marginAnnual, postPromoRateOverride,
      prepaymentPlan]
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

  const defaultFirstPaymentDate = addMonths(disbursementDate, 1);
  const effectiveFirstPaymentDate = scheduleRows.length > 0
    ? scheduleRows[0].dueDate
    : defaultFirstPaymentDate;

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
          + (postPromoRateOverride === null && (baseRateAnnual !== null || marginAnnual !== null)
            ? ` (cơ sở ${(baseRateAnnual === null ? rateAnnual : baseRateAnnual).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`
              + ` + biên độ ${(marginAnnual === null ? 0 : marginAnnual).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%)`
            : ''),
      }]
      : []),
    { label: 'Thời hạn vay:', value: `${tenorMonths} tháng` },
    { label: 'Ân hạn gốc:', value: `${principalGraceMonths} tháng` },
    { label: 'Ngày giải ngân:', value: fmtDate(disbursementDate) },
    { label: 'Ngày bắt đầu trả nợ:', value: fmtDate(effectiveFirstPaymentDate) },
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
    const html = buildScheduleDocHtml({
      rows: scheduleRows,
      info: loanInfoPairs,
      totals: { principal: totalPrincipalSum, interest: totalInterestSum, total: totalObligationSum },
      title: 'Bảng lịch thu nợ dự kiến',
    });
    printHtmlDoc(html, 'Bảng lịch thu nợ dự kiến');
  };

  return (
    <div className="space-y-4">

      <div className={`${styles.containerCardBg} rounded-lg p-5 border space-y-4`}>
        <div className="text-xs font-bold text-accent tracking-tight flex items-center space-x-2 border-b pb-2 border-line">
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
              className={`w-full rounded-md p-2.5 font-mono font-bold text-accent ${styles.inputStyle}`}
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
              className={`w-full rounded-md p-2.5 font-mono font-bold ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày giải ngân *</label>
            <DateInput
              value={disbursementDate}
              onChange={val => setDisbursementDate(val)}
              className={`w-full rounded-md p-2.5 ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày bắt đầu trả nợ</label>
            <DateInput
              value={firstPaymentDate}
              onChange={val => setFirstPaymentDate(val)}
              className={`w-full rounded-md p-2.5 ${styles.inputStyle}`}
            />
            <div className="mt-1 text-[11px] text-ink-faint">
              {effectiveFirstPaymentDate === firstPaymentDate.trim() && firstPaymentDate.trim()
                ? `Kỳ 1 đến hạn ${fmtDate(effectiveFirstPaymentDate)}`
                : `Để trống: kỳ 1 đến hạn ${fmtDate(defaultFirstPaymentDate)}`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-line">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Phương thức trả gốc *</label>
            <select
              value={repayMethod}
              onChange={e => setRepayMethod(e.target.value as any)}
              className={`w-full rounded-md p-2.5 font-bold ${styles.inputStyle}`}
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
              className={`w-full rounded-md p-2.5 ${styles.inputStyle}`}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-md border border-accent/30  bg-accent-soft  space-y-3">
          <div className="text-xs font-bold text-accent tracking-tight flex items-center justify-between gap-2 border-b pb-1.5 border-accent/30 ">
            <span>🎁 LÃI SUẤT ƯU ĐÃI VÀ LÃI SUẤT SAU ƯU ĐÃI</span>
            {hasPromo && (
              <span className="normal-case font-mono">
                Kỳ 1–{promoMonths}: {rateAnnual.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%/năm → từ kỳ {(promoMonths as number) + 1}: {postRate.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%/năm
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block mb-1 font-bold text-accent  text-xs">LS ưu đãi (%/năm) *</label>
              <input
                type="text"
                value={interestRateStr}
                onChange={e => setInterestRateStr(e.target.value)}
                className={`w-full rounded-md p-2 font-mono font-bold ${styles.inputStyle}`}
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-accent  text-xs">Số tháng ưu đãi</label>
              <input
                type="number"
                min={0}
                max={tenorMonths}
                value={promoMonthsStr}
                onChange={e => setPromoMonthsStr(e.target.value)}
                className={`w-full rounded-md p-2 font-mono font-bold ${styles.inputStyle}`}
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-accent  text-xs">LS cơ sở (%/năm)</label>
              <input
                type="text"
                value={baseRateStr}
                onChange={e => setBaseRateStr(e.target.value)}
                placeholder="VD: 9.9"
                className={`w-full rounded-md p-2 font-mono font-bold ${styles.inputStyle}`}
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-accent  text-xs">Biên độ (%/năm)</label>
              <input
                type="text"
                value={marginStr}
                onChange={e => setMarginStr(e.target.value)}
                placeholder="VD: 3.5"
                className={`w-full rounded-md p-2 font-mono font-bold ${styles.inputStyle}`}
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-accent  text-xs">LS sau ưu đãi (%/năm)</label>
              <input
                type="text"
                value={postPromoRateStr}
                onChange={e => setPostPromoRateStr(e.target.value)}
                placeholder={hasPromo ? `${postRate.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} (cơ sở + biên độ)` : 'Không áp dụng'}
                className={`w-full rounded-md p-2 font-mono font-bold text-accent ${styles.inputStyle}`}
              />
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-md border border-warn/30  bg-warn-soft  space-y-3">
          <div className="text-xs font-bold text-warn tracking-tight flex items-center justify-between gap-2 border-b pb-1.5 border-warn/30 ">
            <span>TRẢ NỢ TRƯỚC HẠN NHIỀU KỲ</span>
            <button
              type="button"
              onClick={addPrepayment}
              className="flex items-center space-x-1 bg-accent hover:opacity-90 text-accent-ink font-bold text-[11px] px-2.5 py-1 rounded-lg normal-case"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm</span>
            </button>
          </div>

          {prepayments.length === 0 ? (
            <div className="text-[11px] text-warn">
              Chưa khai lần trả trước hạn nào. Bấm “Thêm lần trả trước hạn” để khai một hoặc nhiều lần ở các kỳ khác nhau.
            </div>
          ) : (
            <div className="space-y-2">
              {prepayments.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-bold text-warn text-[11px]">Lần {idx + 1} — Kỳ số</label>
                    <input
                      type="number"
                      min={1}
                      max={tenorMonths}
                      value={p.periodStr}
                      onChange={e => updatePrepayment(p.id, { periodStr: e.target.value })}
                      className={`w-full rounded-md p-2 font-mono font-bold ${styles.inputStyle}`}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block mb-1 font-bold text-warn text-[11px]">Số tiền trả trước hạn (VNĐ)</label>
                    <input
                      type="text"
                      value={p.amountStr}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '');
                        updatePrepayment(p.id, { amountStr: digits ? Number(digits).toLocaleString('vi-VN') : '' });
                      }}
                      placeholder="Nhập số tiền..."
                      className={`w-full rounded-md p-2 font-mono font-bold text-pos ${styles.inputStyle}`}
                    />
                  </div>
                  <div className="md:col-span-5">
                    <label className="block mb-1 font-bold text-warn text-[11px]">Phương án xử lý sau lần trả này</label>
                    <select
                      value={p.mode}
                      onChange={e => updatePrepayment(p.id, { mode: e.target.value as PrepaymentMode })}
                      className={`w-full rounded-md p-2 font-bold ${styles.inputStyle}`}
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
                      className="p-2 rounded-md text-neg hover:bg-neg-soft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${styles.containerCardBg} rounded-lg overflow-hidden border`}>
        <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 ${'bg-panel-muted border-line'}`}>
          <span className="font-bold text-xs uppercase flex items-center space-x-2">
            <span>BẢNG LỊCH THU NỢ DỰ KIẾN ({scheduleRows.length} KỲ)</span>
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 font-bold text-xs px-3 py-1.5 rounded-md border border-line text-ink-muted hover:border-accent hover:text-accent"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel (.xls)</span>
            </button>
            <button
              type="button"
              onClick={handlePrintSchedule}
              className="flex items-center space-x-1.5 font-bold text-xs px-3 py-1.5 rounded-md border border-line text-ink-muted hover:border-accent hover:text-accent"
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
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center whitespace-nowrap">KỲ</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap text-center">NGÀY BẮT ĐẦU</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap text-center">NGÀY ĐẾN HẠN</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center whitespace-nowrap">SỐ NGÀY</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center whitespace-nowrap">LS ÁP DỤNG</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right whitespace-nowrap">DƯ NỢ ĐẦU KỲ</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right whitespace-nowrap text-accent">GỐC TRẢ</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right whitespace-nowrap text-warn">LÃI THƯỜNG</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right whitespace-nowrap text-pos">TỔNG TRẢ TRONG KỲ</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right whitespace-nowrap">DƯ NỢ CUỐI KỲ</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${'divide-line'}`}>
              {scheduleRows.map(r => (
                <tr key={r.period} className={`${styles.tableRowHover} ${r.prepayment > 0 ? 'bg-warn-soft  font-bold border-l-2 border-warn' : ''}`}>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-center font-bold font-mono">
                    #{r.period}
                    {r.prepayment > 0 && (
                      <span className="block text-[10px] text-warn font-normal">Trả trước hạn</span>
                    )}
                  </td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-center font-mono">{fmtDate(r.startDate)}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-center font-mono font-bold">{fmtDate(r.dueDate)}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-center font-mono">{r.days}d</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-center font-mono">{r.rateAnnual.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono">{r.beginningBalance.toLocaleString('vi-VN')}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono font-bold text-accent">
                    {r.principal.toLocaleString('vi-VN')}
                    {r.prepayment > 0 && (
                      <span className="block text-[10px] text-warn">
                        (+{r.prepayment.toLocaleString('vi-VN')}đ)
                      </span>
                    )}
                  </td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono font-bold text-warn">{r.interest.toLocaleString('vi-VN')}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono font-bold text-pos">{r.totalPayment.toLocaleString('vi-VN')}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono">{r.endingBalance.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className={`border-t sticky bottom-0 font-bold ${styles.tableHeaderStyle}`}>
              <tr>
                <td colSpan={6} className="px-[var(--row-px)] py-[var(--row-py)] text-center">TỔNG CỘNG LỊCH THU NỢ</td>
                <td className="px-[var(--row-px)] py-[var(--row-py)] text-right text-accent font-mono">{totalPrincipalSum.toLocaleString('vi-VN')}</td>
                <td className="px-[var(--row-px)] py-[var(--row-py)] text-right text-warn font-mono">{totalInterestSum.toLocaleString('vi-VN')}</td>
                <td className="px-[var(--row-px)] py-[var(--row-py)] text-right text-pos font-mono text-sm">{totalObligationSum.toLocaleString('vi-VN')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
