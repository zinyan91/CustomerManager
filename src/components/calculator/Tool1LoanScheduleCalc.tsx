import React, { useState } from 'react';
import { RefreshCw, Download, Printer, Plus, Trash2 } from 'lucide-react';
import type { UiClasses } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { fmtDate, fmtMoney, fmtNumber, fmtPercent, formatMoneyInput, parseMoneyInput, todayIso } from '../../lib/utils';
import { addMonths, buildLoanSchedule, postPromoRateAnnual } from '../../lib/calcMath';
import type { PrepaymentMode, PrepaymentPlanItem } from '../../lib/calcMath';
import { buildScheduleDocHtml } from '../../lib/scheduleDocHtml';
import { printHtmlDoc } from '../../lib/printHtmlDoc';
import { downloadBytes } from '../../lib/xlsExport';
import { buildXlsx, MIME_XLSX, type XlsxCell, type XlsxSheet } from '../../lib/xlsxWriter';
import { exportScheduleWithFormulas } from '../../lib/scheduleFormulaExport';

function exportToXlsxFile(
  filename: string,
  title: string,
  params: { label: string; value: string }[],
  headers: string[],
  rows: (string | number)[][],
  footerRow?: (string | number)[]
) {
  const HEADER_FILL = 'DCE6F1';
  const PARAM_LABEL_FILL = 'F1F5F9';
  const FOOTER_FILL = 'E0F2FE';

  const xlsxRows: XlsxCell[][] = [];

  // Title Row
  xlsxRows.push([
    {
      value: title,
      style: { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL }
    }
  ]);

  // Empty Row
  xlsxRows.push([]);

  // Parameter Rows (Pairs of Label + Value)
  for (let i = 0; i < params.length; i += 2) {
    const p1 = params[i];
    const p2 = params[i + 1];
    const rowCells: XlsxCell[] = [];

    if (p1) {
      rowCells.push({ value: p1.label, style: { bold: true, fill: PARAM_LABEL_FILL, align: 'left' } });
      rowCells.push({ value: p1.value, style: { align: 'left' } });
    } else {
      rowCells.push({ value: '' }, { value: '' });
    }

    if (p2) {
      rowCells.push({ value: p2.label, style: { bold: true, fill: PARAM_LABEL_FILL, align: 'left' } });
      rowCells.push({ value: p2.value, style: { align: 'left' } });
    }

    xlsxRows.push(rowCells);
  }

  // Empty Row before table
  xlsxRows.push([]);

  // Table Headers
  xlsxRows.push(
    headers.map(h => ({
      value: h,
      style: {
        bold: true,
        align: 'center' as const,
        vAlign: 'center' as const,
        wrap: true,
        fill: HEADER_FILL,
      },
    }))
  );

  // Table Data Rows
  rows.forEach(r => {
    const rowCells: XlsxCell[] = r.map((c, colIdx) => {
      const isNum = typeof c === 'number';
      return {
        value: c,
        numeric: isNum,
        style: {
          align: colIdx === 0 ? 'center' : isNum ? 'right' : 'center',
          vAlign: 'center' as const,
          numFmt: isNum ? '#,##0' : undefined,
        },
      };
    });
    xlsxRows.push(rowCells);
  });

  // Footer Row
  if (footerRow) {
    xlsxRows.push(
      footerRow.map((c, colIdx) => {
        const isNum = typeof c === 'number';
        return {
          value: isNum ? c : (c || ''),
          numeric: isNum,
          style: {
            bold: true,
            align: colIdx === 0 ? 'center' : isNum ? 'right' : 'center',
            vAlign: 'center' as const,
            fill: FOOTER_FILL,
            numFmt: isNum ? '#,##0' : undefined,
          },
        };
      })
    );
  }

  const sheet: XlsxSheet = {
    name: 'Lịch thu nợ',
    rows: xlsxRows,
    colWidths: [10, 14, 14, 10, 18, 20, 20, 20, 22, 20],
  };

  const bytes = buildXlsx(sheet);
  downloadBytes(bytes, `${filename}_${todayIso()}.xlsx`, MIME_XLSX);
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
    { label: 'Số tiền vay:', value: fmtMoney(loanAmt) },
    {
      label: hasPromo ? 'Lãi suất ưu đãi:' : 'Lãi suất áp dụng:',
      value: hasPromo ? `${fmtPercent(rateAnnual > 1 ? rateAnnual / 100 : rateAnnual)}/năm trong ${promoMonths} tháng đầu` : `${fmtPercent(rateAnnual > 1 ? rateAnnual / 100 : rateAnnual)}/năm`,
    },
    ...(hasPromo
      ? [{
        label: 'Lãi suất sau ưu đãi:',
        value: `${fmtPercent(postRate > 1 ? postRate / 100 : postRate)}/năm`
          + (postPromoRateOverride === null && (baseRateAnnual !== null || marginAnnual !== null)
            ? ` (cơ sở ${fmtPercent((baseRateAnnual === null ? rateAnnual : baseRateAnnual) > 1 ? (baseRateAnnual === null ? rateAnnual : baseRateAnnual) / 100 : (baseRateAnnual === null ? rateAnnual : baseRateAnnual))}`
            + ` + biên độ ${fmtPercent((marginAnnual === null ? 0 : marginAnnual) > 1 ? (marginAnnual === null ? 0 : marginAnnual) / 100 : (marginAnnual === null ? 0 : marginAnnual))})`
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
          .map(p => `Kỳ ${p.period}: ${fmtMoney(p.amount)}`)
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
      fmtPercent(r.rateAnnual > 1 ? r.rateAnnual / 100 : r.rateAnnual),
      r.beginningBalance,
      r.principal,
      r.interest,
      r.totalPayment,
      r.endingBalance,
    ]);
    const footer = ['TỔNG CỘNG', '', '', '', '', '', totalPrincipalSum, totalInterestSum, totalObligationSum, 0];
    exportToXlsxFile('Lich_Thu_No_Vay', 'BẢNG CHI TIẾT LỊCH THU NỢ DỰ KIẾN KHOẢN VAY', loanInfoPairs, headers, rows, footer);
  };

  const handleExportExcelWithFormulas = () => {
    if (scheduleRows.length === 0) return;
    exportScheduleWithFormulas({
      loanAmount: loanAmt,
      tenorMonths: tenorMonths,
      annualRate: rateAnnual,
      repayMethod: repayMethod,
      disbursementDateStr: disbursementDate,
      scheduleRows,
    });
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
              onChange={e => setLoanAmountStr(formatMoneyInput(e.target.value))}
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
                Kỳ 1–{promoMonths}: {fmtPercent(rateAnnual > 1 ? rateAnnual / 100 : rateAnnual)}/năm → từ kỳ {(promoMonths as number) + 1}: {fmtPercent(postRate > 1 ? postRate / 100 : postRate)}/năm
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
                placeholder={hasPromo ? `${fmtPercent(postRate > 1 ? postRate / 100 : postRate)} (cơ sở + biên độ)` : 'Không áp dụng'}
                className={`w-full rounded-md p-2 font-mono font-bold text-accent ${styles.inputStyle}`}
              />
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-md border border-warn/30  bg-warn-soft  space-y-3">
          <div className="text-xs font-bold text-warn tracking-tight flex items-center justify-between gap-2 border-b pb-1.5 border-warn/30 ">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-warn"></span>
              <span>💵 KẾ HOẠCH TRẢ NỢ TRƯỚC HẠN (TÙY CHỌN NHIỀU KỲ)</span>
            </div>
            <button
              type="button"
              onClick={addPrepayment}
              className="px-3 py-1.5 rounded-lg bg-warn text-white text-xs font-bold flex items-center space-x-1.5 hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Thêm kỳ trả trước hạn</span>
            </button>
          </div>

          {prepayments.length === 0 ? (
            <div className="text-xs text-ink-faint italic py-1">
              Chưa thiết lập lần trả trước hạn nào. Bấm <strong>"Thêm kỳ trả trước hạn"</strong> nếu khách hàng muốn trả bớt gốc ở một hoặc nhiều kỳ bất kỳ.
            </div>
          ) : (
            <div className="space-y-2.5">
              {prepayments.map(p => (
                <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end p-2.5 rounded bg-panel border border-warn/30">
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-bold text-warn text-[11px]">Kỳ trả nợ</label>
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
                      onChange={e => updatePrepayment(p.id, { amountStr: formatMoneyInput(e.target.value) })}
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

      {/* Schedule Table Preview */}
      <div className={`p-4 rounded-xl shadow-xs border ${styles.containerCardBg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-line">
          <div>
            <h3 className="text-sm font-bold text-ink">BẢNG TÍNH LỊCH THU NỢ DỰ KIẾN ({scheduleRows.length} KỲ)</h3>
            <p className="text-xs text-ink-faint">
              Công thức Actual/365 chuẩn NHNN: Tiền lãi = Dư nợ × Lãi suất × Số ngày thực tế / 365
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-lg border border-accent/30 text-accent hover:bg-accent-soft text-xs font-bold flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>XUẤT EXCEL</span>
            </button>
            <button
              onClick={handleExportExcelWithFormulas}
              className="px-3 py-1.5 rounded-lg border border-accent/30 text-accent hover:bg-accent-soft text-xs font-bold flex items-center space-x-1.5"
              title="Xuất bảng tính giữ nguyên các công thức tính lãi, gốc, tổng thu từng kỳ để kiểm toán"
            >
              <Download className="w-4 h-4" />
              <span>XUẤT EXCEL (KÈM CÔNG THỨC)</span>
            </button>
            <button
              onClick={handlePrintSchedule}
              className="px-3 py-1.5 rounded-lg bg-accent text-accent-ink hover:opacity-90 text-xs font-bold flex items-center space-x-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>IN / LƯU PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] border border-line rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className={`sticky top-0 z-10 ${styles.tableHeaderStyle}`}>
              <tr>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center w-12">KỲ</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center">NGÀY BẮT ĐẦU</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center">NGÀY ĐẾN HẠN</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center w-14">SỐ NGÀY</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center">LS ÁP DỤNG</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">DƯ NỢ ĐẦU KỲ</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">GỐC TRẢ</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">LÃI THƯỜNG</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">TỔNG TRẢ TRONG KỲ</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">DƯ NỢ CUỐI KỲ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
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
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-center font-mono">{fmtPercent(r.rateAnnual > 1 ? r.rateAnnual / 100 : r.rateAnnual)}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono">{fmtNumber(r.beginningBalance)}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono font-bold text-accent">
                    {fmtNumber(r.principal)}
                    {r.prepayment > 0 && (
                      <span className="block text-[10px] text-warn">
                        (+{fmtNumber(r.prepayment)}đ)
                      </span>
                    )}
                  </td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono font-bold text-warn">{fmtNumber(r.interest)}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono font-bold text-pos">{fmtNumber(r.totalPayment)}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono">{fmtNumber(r.endingBalance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className={`border-t sticky bottom-0 font-bold ${styles.tableHeaderStyle}`}>
              <tr>
                <td colSpan={6} className="px-[var(--row-px)] py-[var(--row-py)] text-center">TỔNG CỘNG LỊCH THU NỢ</td>
                <td className="px-[var(--row-px)] py-[var(--row-py)] text-right text-accent font-mono">{fmtNumber(totalPrincipalSum)}</td>
                <td className="px-[var(--row-px)] py-[var(--row-py)] text-right text-warn font-mono">{fmtNumber(totalInterestSum)}</td>
                <td className="px-[var(--row-px)] py-[var(--row-py)] text-right text-pos font-mono text-sm">{fmtNumber(totalObligationSum)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
