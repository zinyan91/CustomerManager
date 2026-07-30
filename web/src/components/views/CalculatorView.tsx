import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { formatMoneyInput, fmtDate } from '../../lib/utils';
import {
  Calculator, DollarSign, Calendar, RefreshCw, Layers, TrendingUp, CheckCircle, Percent, Download, Printer
} from 'lucide-react';

// Helper: Add months to a YYYY-MM-DD date string, keeping exact day with last-day clamp
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

// Helper: Add days to a YYYY-MM-DD date string
function addDays(dateStr: string, days: number): string {
  if (!dateStr || isNaN(days)) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

// Helper: Calculate difference in days between two YYYY-MM-DD dates
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

// Helper: Beautiful Formatted HTML Excel Exporter (.xls)
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
    const cellsHtml = footerRow.map((c, colIdx) => {
      const isNum = typeof c === 'number';
      const alignClass = colIdx === 0 ? 'text-center text-bold' : isNum ? 'text-right text-bold font-mono' : 'text-center';
      const formatted = isNum ? c.toLocaleString('vi-VN') : c;
      return `<td class="${alignClass}">${formatted}</td>`;
    }).join('');
    footerHtml = `<tfoot><tr class="summary-row">${cellsHtml}</tr></tfoot>`;
  }

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${title.substring(0, 30)}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; margin: 20px; }
        .title { font-size: 16px; font-weight: bold; color: #0284c7; text-align: center; padding: 12px; margin-bottom: 10px; }
        .param-table { border-collapse: collapse; margin-bottom: 16px; width: 100%; }
        .param-table td { padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 11px; }
        .param-label { font-weight: bold; background-color: #f1f5f9; color: #334155; width: 20%; }
        .param-val { font-weight: bold; color: #0f172a; width: 30%; }
        .data-table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        .data-table th { background-color: #0284c7; color: #ffffff; font-weight: bold; padding: 8px 10px; border: 1px solid #0369a1; text-align: center; font-size: 11px; }
        .data-table td { padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 11px; }
        .row-even { background-color: #ffffff; }
        .row-odd { background-color: #f8fafc; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }
        .font-mono { font-family: 'Consolas', 'Courier New', monospace; }
        .summary-row { background-color: #e0f2fe; font-weight: bold; border-top: 2px solid #0284c7; border-bottom: 2px double #0284c7; }
        .summary-row td { padding: 8px 10px; }
      </style>
    </head>
    <body>
      <div class="title">${title}</div>
      ${params.length > 0 ? `<table class="param-table">${paramRowsHtml}</table>` : ''}
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
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const CalculatorView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'term_loan' | 'stk_single' | 'stk_multi'>('term_loan');

  // ──────────────────────────────────────────────────────────────────────────
  // TOOL 1: TÍNH KHOẢN VAY TỪNG LẦN (LỊCH TRẢ NỢ DỰ KIẾN)
  // ──────────────────────────────────────────────────────────────────────────
  const [loanStartDate, setLoanStartDate] = useState('2026-04-01');
  const [loanTenorYears, setLoanTenorYears] = useState<number | ''>(1);
  const [loanAmountInput, setLoanAmountInput] = useState('500.000.000');
  const [gracePeriodMonths, setGracePeriodMonths] = useState<number>(0);
  
  // Rate mode for Tool 1
  const [termRateMode, setTermRateMode] = useState<'pref' | 'normal'>('pref');
  const [termPrefRate, setTermPrefRate] = useState('7.5');     // Lãi suất ưu đãi %/năm
  const [termPrefMonths, setTermPrefMonths] = useState('6');    // Thời gian ưu đãi (tháng)
  const [termBaseRate, setTermBaseRate] = useState('8.5');     // Lãi suất cơ sở %/năm
  const [termMarginRate, setTermMarginRate] = useState('3.5');   // Biên độ %/năm

  // Derived loan tenor months & end date
  const loanTenorMonths = typeof loanTenorYears === 'number' && loanTenorYears > 0 ? loanTenorYears * 12 : 12;
  const loanEndDate = addMonths(loanStartDate, loanTenorMonths);

  // Derived Interest Rates Calculation
  const prefVal = parseFloat(termPrefRate) || 0;
  const baseVal = parseFloat(termBaseRate) || 0;
  const marginVal = parseFloat(termMarginRate) || 0;

  const postPrefRate = prefVal + marginVal;  // Lãi suất sau ưu đãi = LSUD + Biên độ
  const normalRate = baseVal + marginVal;    // Lãi suất thông thường = LSCS + Biên độ

  const numLoanAmount = parseFloat(loanAmountInput.replace(/\D/g, '')) || 0;
  const numPrefMonths = parseInt(termPrefMonths, 10) || 0;

  const numPrefRateDec = prefVal / 100;
  const numPostPrefRateDec = postPrefRate / 100;
  const numNormalRateDec = normalRate / 100;

  // Calculate schedule rows
  const scheduleRows: {
    period: number;
    dueDate: string;
    openingBalance: number;
    principal: number;
    interest: number;
    totalPayment: number;
    closingBalance: number;
  }[] = [];

  let currentBal = numLoanAmount;
  const activePayMonths = Math.max(1, loanTenorMonths - gracePeriodMonths);
  const equalPrincipalPerMonth = Math.round(numLoanAmount / activePayMonths);

  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let maxPaymentRow = { period: 0, amount: 0 };

  if (numLoanAmount > 0 && loanTenorMonths > 0) {
    for (let i = 1; i <= loanTenorMonths; i++) {
      const dueDate = i === 1 ? loanStartDate : addMonths(loanStartDate, i - 1);
      const opening = currentBal;

      // Principal payment logic (Grace period = 0 principal)
      let principal = 0;
      if (i > gracePeriodMonths) {
        principal = (i === loanTenorMonths) ? opening : equalPrincipalPerMonth;
      }

      // Interest calculation based on rate mode and month index
      let applicableRateDec = numNormalRateDec;
      if (termRateMode === 'pref') {
        applicableRateDec = i <= numPrefMonths ? numPrefRateDec : numPostPrefRateDec;
      }

      const interest = Math.round(opening * applicableRateDec * (30 / 365));

      const totalPay = principal + interest;
      const closing = Math.max(0, opening - principal);

      if (totalPay > maxPaymentRow.amount) {
        maxPaymentRow = { period: i, amount: totalPay };
      }

      totalPrincipalPaid += principal;
      totalInterestPaid += interest;

      scheduleRows.push({
        period: i,
        dueDate,
        openingBalance: opening,
        principal,
        interest,
        totalPayment: totalPay,
        closingBalance: closing
      });

      currentBal = closing;
    }
  }

  // ── EXPORT EXCEL TOOL 1 ──
  const handleExportTermLoanExcel = () => {
    const params = [
      { label: 'Số tiền vay:', value: `${numLoanAmount.toLocaleString('vi-VN')} VNĐ` },
      { label: 'Ngày bắt đầu vay:', value: fmtDate(loanStartDate) },
      { label: 'Thời hạn vay:', value: `${loanTenorMonths} tháng (${loanTenorYears} năm)` },
      { label: 'Ngày kết thúc vay:', value: fmtDate(loanEndDate) },
      { label: 'Ân hạn gốc:', value: `${gracePeriodMonths} tháng` },
      { label: 'Cấu trúc lãi suất:', value: termRateMode === 'pref' ? `Ưu đãi ${termPrefRate}% (${termPrefMonths}T), Sau ưu đãi ${postPrefRate.toFixed(2)}%` : `Thông thường ${normalRate.toFixed(2)}% (LSCS ${termBaseRate}% + Biên ${termMarginRate}%)` },
    ];

    const headers = [
      'KỲ TRẢ NỢ', 'NGÀY TRẢ NỢ', 'DƯ NỢ ĐẦU KỲ (VNĐ)', 'TIỀN GỐC (VNĐ)',
      'TIỀN LÃI (VNĐ)', 'TỔNG TRẢ (GỐC + LÃI)', 'DƯ NỢ CUỐI KỲ (VNĐ)'
    ];

    const rows = scheduleRows.map(r => [
      `Kỳ #${r.period}`,
      fmtDate(r.dueDate),
      r.openingBalance,
      r.principal,
      r.interest,
      r.totalPayment,
      r.closingBalance
    ]);

    const footerRow = [
      'TỔNG CỘNG', '', numLoanAmount, totalPrincipalPaid, totalInterestPaid,
      totalPrincipalPaid + totalInterestPaid, 0
    ];

    exportToExcelHTML(
      `Lich_Tra_No_Du_Kien_${loanStartDate}`,
      'BẢNG DỰ KIẾN LỊCH TRẢ NỢ KHOẢN VAY TỪNG LẦN',
      params,
      headers,
      rows,
      footerRow
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TOOL 2: VAY CẦM CỐ SỔ TIẾT KIỆM (1 KỲ)
  // ──────────────────────────────────────────────────────────────────────────
  const [stkDepositAmount, setStkDepositAmount] = useState('500.000.000');
  const [stkDepositDate, setStkDepositDate] = useState('2026-01-15');
  const [stkTenorVal, setStkTenorVal] = useState<number>(6);
  const [stkTenorUnit, setStkTenorUnit] = useState<'day' | 'month' | 'year'>('month');
  const [stkDepositRate, setStkDepositRate] = useState('6.5'); // %/năm

  // Pledge Loan Inputs
  const [stkPledgeRatio, setStkPledgeRatio] = useState('90'); // %
  const [stkLoanAmountInput, setStkLoanAmountInput] = useState('450.000.000');
  const [stkLoanRate, setStkLoanRate] = useState('7.5'); // %/năm
  const [stkDisbursementDate, setStkDisbursementDate] = useState('2026-01-15');

  // Auto calculate STK Expiry Date
  let stkExpiryDate = '';
  if (stkDepositDate) {
    if (stkTenorUnit === 'day') stkExpiryDate = addDays(stkDepositDate, stkTenorVal);
    else if (stkTenorUnit === 'month') stkExpiryDate = addMonths(stkDepositDate, stkTenorVal);
    else if (stkTenorUnit === 'year') stkExpiryDate = addMonths(stkDepositDate, stkTenorVal * 12);
  }

  const stkDepositDays = diffDays(stkDepositDate, stkExpiryDate);
  const numStkDepositAmount = parseFloat(stkDepositAmount.replace(/\D/g, '')) || 0;
  const numStkDepositRate = (parseFloat(stkDepositRate) || 0) / 100;

  // Lãi sổ nhận
  const stkInterestEarned = Math.round(numStkDepositAmount * numStkDepositRate * (stkDepositDays / 365));

  // Auto-sync loan amount when pledge ratio changes
  const handlePledgeRatioChange = (ratioStr: string) => {
    setStkPledgeRatio(ratioStr);
    const r = parseFloat(ratioStr) || 0;
    if (numStkDepositAmount > 0 && r > 0) {
      const calcLoan = Math.round(numStkDepositAmount * (r / 100));
      setStkLoanAmountInput(calcLoan.toLocaleString('vi-VN'));
    }
  };

  const numStkLoanAmount = parseFloat(stkLoanAmountInput.replace(/\D/g, '')) || 0;
  const numStkLoanRate = (parseFloat(stkLoanRate) || 0) / 100;
  const stkLoanDueDate = stkExpiryDate; // Mặc định đáo hạn vay = đáo hạn sổ
  const stkLoanDays = diffDays(stkDisbursementDate, stkLoanDueDate);

  // Lãi vay cầm cố
  const stkLoanInterestCost = Math.round(numStkLoanAmount * numStkLoanRate * (stkLoanDays / 365));
  const stkNetDifference = stkInterestEarned - stkLoanInterestCost;
  const stkTotalLoanPay = numStkLoanAmount + stkLoanInterestCost;

  // ── EXPORT EXCEL TOOL 2 ──
  const handleExportStkSingleExcel = () => {
    const params = [
      { label: 'Giá trị sổ tiết kiệm:', value: `${numStkDepositAmount.toLocaleString('vi-VN')} VNĐ` },
      { label: 'Tỉ lệ cầm cố:', value: `${stkPledgeRatio}%` },
      { label: 'Ngày gửi sổ:', value: fmtDate(stkDepositDate) },
      { label: 'Số tiền vay cầm cố:', value: `${numStkLoanAmount.toLocaleString('vi-VN')} VNĐ` },
      { label: 'Kỳ hạn sổ:', value: `${stkTenorVal} ${stkTenorUnit === 'day' ? 'ngày' : stkTenorUnit === 'month' ? 'tháng' : 'năm'}` },
      { label: 'Lãi suất vay:', value: `${stkLoanRate} %/năm` },
      { label: 'Ngày đáo hạn sổ/vay:', value: fmtDate(stkExpiryDate) },
      { label: 'Lãi vay phải trả:', value: `${stkLoanInterestCost.toLocaleString('vi-VN')} VNĐ` },
      { label: 'Lãi suất sổ:', value: `${stkDepositRate} %/năm` },
      { label: 'Chênh lệch (Lãi sổ - Lãi vay):', value: `${stkNetDifference >= 0 ? '+' : ''}${stkNetDifference.toLocaleString('vi-VN')} VNĐ` },
    ];

    const headers = ['MỤC NGHĨA VỤ TÀI CHÍNH', 'THÔNG TIN SỔ TIẾT KIỆM', 'THÔNG TIN KHOẢN VAY CẦM CỐ', 'KẾT QUẢ / CHÊNH LỆCH'];
    const rows = [
      ['Số tiền gốc', `${numStkDepositAmount.toLocaleString('vi-VN')} VNĐ`, `${numStkLoanAmount.toLocaleString('vi-VN')} VNĐ`, '—'],
      ['Số ngày thực tế', `${stkDepositDays} ngày`, `${stkLoanDays} ngày`, '—'],
      ['Lãi suất (%/năm)', `${stkDepositRate}%`, `${stkLoanRate}%`, '—'],
      ['Tiền lãi (Dự kiến / Phải trả)', `+${stkInterestEarned.toLocaleString('vi-VN')} VNĐ`, `-${stkLoanInterestCost.toLocaleString('vi-VN')} VNĐ`, `${stkNetDifference >= 0 ? '+' : ''}${stkNetDifference.toLocaleString('vi-VN')} VNĐ`],
      ['Tổng thanh toán khi đáo hạn', `${(numStkDepositAmount + stkInterestEarned).toLocaleString('vi-VN')} VNĐ`, `${stkTotalLoanPay.toLocaleString('vi-VN')} VNĐ`, '—']
    ];

    exportToExcelHTML(
      `Bang_Tinh_Cam_Co_STK_${stkDepositDate}`,
      'BẢNG TÍNH LÃI VAY CẦM CỐ SỔ TIẾT KIỆM (1 KỲ)',
      params,
      headers,
      rows
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TOOL 3: VAY CẦM CỐ STK TÁI TỤC NHIỀU KỲ
  // ──────────────────────────────────────────────────────────────────────────
  const [multiCyclesCount, setMultiCyclesCount] = useState<number>(4);
  const [multiRolloverOption, setMultiRolloverOption] = useState<'compound' | 'principal_only'>('compound');

  const multiCycleRows: {
    cycleNumber: number;
    startDate: string;
    expiryDate: string;
    depositOpening: number;
    depositInterest: number;
    depositClosing: number;
    loanAmount: number;
    loanInterest: number;
    netProfit: number;
    cumulativeNetProfit: number;
  }[] = [];

  let currentDeposit = numStkDepositAmount;
  let cumNetProfit = 0;
  let cycleStart = stkDepositDate;

  if (numStkDepositAmount > 0 && multiCyclesCount > 0) {
    for (let c = 1; c <= multiCyclesCount; c++) {
      let cycleEnd = '';
      if (stkTenorUnit === 'day') cycleEnd = addDays(cycleStart, stkTenorVal);
      else if (stkTenorUnit === 'month') cycleEnd = addMonths(cycleStart, stkTenorVal);
      else if (stkTenorUnit === 'year') cycleEnd = addMonths(cycleStart, stkTenorVal * 12);

      const daysInCycle = diffDays(cycleStart, cycleEnd);
      const cycleDepInterest = Math.round(currentDeposit * numStkDepositRate * (daysInCycle / 365));

      const cycleRatio = parseFloat(stkPledgeRatio) || 90;
      const cycleLoanAmt = Math.round(currentDeposit * (cycleRatio / 100));
      const cycleLoanInterest = Math.round(cycleLoanAmt * numStkLoanRate * (daysInCycle / 365));

      const cycleNet = cycleDepInterest - cycleLoanInterest;
      cumNetProfit += cycleNet;

      const depositClosing = multiRolloverOption === 'compound' ? currentDeposit + cycleDepInterest : currentDeposit;

      multiCycleRows.push({
        cycleNumber: c,
        startDate: cycleStart,
        expiryDate: cycleEnd,
        depositOpening: currentDeposit,
        depositInterest: cycleDepInterest,
        depositClosing,
        loanAmount: cycleLoanAmt,
        loanInterest: cycleLoanInterest,
        netProfit: cycleNet,
        cumulativeNetProfit: cumNetProfit
      });

      currentDeposit = depositClosing;
      cycleStart = cycleEnd;
    }
  }

  // ── EXPORT EXCEL TOOL 3 ──
  const handleExportStkMultiExcel = () => {
    const params = [
      { label: 'Gốc sổ ban đầu:', value: `${numStkDepositAmount.toLocaleString('vi-VN')} VNĐ` },
      { label: 'Số kỳ tái tục:', value: `${multiCyclesCount} kỳ` },
      { label: 'Kỳ hạn mỗi kỳ:', value: `${stkTenorVal} ${stkTenorUnit === 'day' ? 'ngày' : stkTenorUnit === 'month' ? 'tháng' : 'năm'}` },
      { label: 'Phương thức tái tục:', value: multiRolloverOption === 'compound' ? 'Tái tục Gốc + Lãi (Lãi nhập gốc)' : 'Chỉ tái tục Gốc (Lãi rút ra)' },
      { label: 'Lãi suất sổ / Lãi suất vay:', value: `${stkDepositRate}% / ${stkLoanRate}%` },
      { label: 'Tỷ lệ cầm cố:', value: `${stkPledgeRatio}%` },
    ];

    const headers = [
      'KỲ TÁI TỤC', 'NGÀY BẮT ĐẦU', 'NGÀY ĐÁO HẠN', 'GỐC SỔ ĐẦU KỲ (VNĐ)',
      'LÃI SỔ NHẬN (VNĐ)', 'SỐ TIỀN VAY CẦM CỐ (VNĐ)', 'LÃI VAY PHẢI TRẢ (VNĐ)',
      'CHÊNH LỆCH KỲ NÀY (VNĐ)', 'CHÊNH LỆCH TÍCH LŨY (VNĐ)'
    ];

    const rows = multiCycleRows.map(r => [
      `Kỳ #${r.cycleNumber}`,
      fmtDate(r.startDate),
      fmtDate(r.expiryDate),
      r.depositOpening,
      r.depositInterest,
      r.loanAmount,
      r.loanInterest,
      r.netProfit,
      r.cumulativeNetProfit
    ]);

    const totalDepInt = multiCycleRows.reduce((sum, r) => sum + r.depositInterest, 0);
    const totalLoanInt = multiCycleRows.reduce((sum, r) => sum + r.loanInterest, 0);

    const footerRow = [
      `TỔNG CỘNG (${multiCycleRows.length} KỲ)`, '', '', '', totalDepInt, '', totalLoanInt, '', cumNetProfit
    ];

    exportToExcelHTML(
      `Bang_Tai_Tuc_STK_${stkDepositDate}`,
      'BẢNG DỰ PHÓNG LÃI TÁI TỤC SỔ TIẾT KIỆM & VAY CẦM CỐ NHIỀU KỲ',
      params,
      headers,
      rows,
      footerRow
    );
  };

  const formatMoney = (val: number) => val.toLocaleString('vi-VN') + ' VNĐ';

  // Dynamic Theme Classes
  const containerCardBg = isLight
    ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
    : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl';

  const sectionBoxBg = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-900'
    : 'bg-slate-950 border-slate-800 text-slate-100';

  const inputStyle = isLight
    ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
    : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-sky-500';

  const readonlyStyle = isLight
    ? 'bg-slate-100 border-slate-200 text-slate-800 font-bold cursor-default'
    : 'bg-slate-900 border-slate-800 text-slate-200 font-bold cursor-default';

  const tableHeaderStyle = isLight
    ? 'bg-slate-100 text-slate-700 border-slate-200 font-bold'
    : 'bg-slate-950 text-slate-400 border-slate-800 font-bold';

  return (
    <div className="space-y-4 text-xs max-w-7xl mx-auto pb-10 transition-colors duration-200 print:p-0 print:max-w-none">
      {/* CSS PRINT MEDIA STYLING */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; font-size: 10px !important; }
          .print\\:hidden { display: none !important; }
          aside, header { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; font-size: 10px !important; }
          th, td { border: 1px solid #64748b !important; padding: 4px 6px !important; }
          th { background-color: #f1f5f9 !important; color: black !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}</style>

      {/* ── HEADER TITLE ── */}
      <div className={`${containerCardBg} p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 print:hidden`}>
        <div>
          <h2 className="text-base font-bold uppercase tracking-tight flex items-center space-x-2 text-sky-500">
            <Calculator className="w-5 h-5" />
            <span>CÔNG CỤ & BẢNG TÍNH LÃI VAY TIỆN ÍCH</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tính toán lịch trả nợ vay từng lần & Bảng tính vay cầm cố sổ tiết kiệm (1 kỳ / tái tục nhiều kỳ)
          </p>
        </div>

        {/* Tab Navigation */}
        <div className={`flex items-center space-x-1 border rounded-xl p-1 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
          <button
            onClick={() => setActiveTab('term_loan')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'term_loan' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Vay Từng Lần</span>
          </button>
          <button
            onClick={() => setActiveTab('stk_single')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'stk_single' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>2. Cầm Cố STK (1 Kỳ)</span>
          </button>
          <button
            onClick={() => setActiveTab('stk_multi')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'stk_multi' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>3. Cầm Cố STK Tái Tục</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: TÍNH KHOẢN VAY TỪNG LẦN (LỊCH TRẢ NỢ DỰ KIẾN) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'term_loan' && (
        <div className="space-y-4">
          {/* Form Input Box */}
          <div className={`${containerCardBg} rounded-2xl p-5 border space-y-4 print:border-none print:p-0`}>
            <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <Calendar className="w-4 h-4" />
              <span>KHUNG NHẬP LIỆU THÔNG TIN KHOẢN VAY TỪNG LẦN</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-medium mb-1">Ngày vay (bắt đầu)</label>
                <input
                  type="date"
                  value={loanStartDate}
                  onChange={e => setLoanStartDate(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Thời hạn vay (Năm)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={loanTenorYears}
                  onChange={e => setLoanTenorYears(parseInt(e.target.value) || '')}
                  placeholder="1, 2, 5 năm..."
                  className={`w-full rounded-xl p-2.5 font-bold border ${inputStyle}`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Thời hạn vay (Tháng)</label>
                <input
                  type="text"
                  readOnly
                  value={`${loanTenorMonths} tháng`}
                  className={`w-full rounded-xl p-2.5 border ${readonlyStyle}`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Ngày kết thúc vay</label>
                <input
                  type="date"
                  readOnly
                  value={loanEndDate}
                  className={`w-full rounded-xl p-2.5 border font-mono ${readonlyStyle}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="md:col-span-2">
                <label className="block font-medium mb-1">Số tiền vay (VNĐ) *</label>
                <input
                  type="text"
                  value={loanAmountInput}
                  onChange={e => setLoanAmountInput(formatMoneyInput(e.target.value))}
                  placeholder="500.000.000"
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm border ${inputStyle}`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium mb-1">Thời gian ân hạn gốc (Tháng)</label>
                <input
                  type="number"
                  min={0}
                  max={loanTenorMonths - 1}
                  value={gracePeriodMonths}
                  onChange={e => setGracePeriodMonths(parseInt(e.target.value) || 0)}
                  placeholder="0, 3, 6 tháng..."
                  className={`w-full rounded-xl p-2.5 font-bold border ${inputStyle}`}
                />
              </div>
            </div>

            {/* Interest Rate Options with Margin Rate */}
            <div className={`p-4 rounded-xl border space-y-3 ${sectionBoxBg}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[11px]">
                  CẤU TRÚC LÃI SUẤT ÁP DỤNG & BIÊN ĐỘ
                </div>
                <div className="flex items-center space-x-4 text-xs font-semibold">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="termRateMode"
                      checked={termRateMode === 'pref'}
                      onChange={() => setTermRateMode('pref')}
                      className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
                    />
                    <span>1. Lãi suất ưu đãi & Sau ưu đãi</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="termRateMode"
                      checked={termRateMode === 'normal'}
                      onChange={() => setTermRateMode('normal')}
                      className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
                    />
                    <span>2. Lãi suất thông thường (LSCS + Biên độ)</span>
                  </label>
                </div>
              </div>

              {termRateMode === 'pref' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium mb-1 text-slate-400">Lãi suất ưu đãi (LSUD) %/năm</label>
                      <input
                        type="number"
                        step="0.1"
                        value={termPrefRate}
                        onChange={e => setTermPrefRate(e.target.value)}
                        className={`w-full rounded-xl p-2 font-mono font-bold text-rose-500 border ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-slate-400">Thời gian ưu đãi (Tháng)</label>
                      <input
                        type="number"
                        min={1}
                        value={termPrefMonths}
                        onChange={e => setTermPrefMonths(e.target.value)}
                        className={`w-full rounded-xl p-2 font-bold border ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-slate-400">Biên độ cộng thêm %/năm</label>
                      <input
                        type="number"
                        step="0.1"
                        value={termMarginRate}
                        onChange={e => setTermMarginRate(e.target.value)}
                        className={`w-full rounded-xl p-2 font-mono font-bold text-amber-500 border ${inputStyle}`}
                      />
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between font-semibold ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                    <span className="text-slate-400">Lãi suất sau ưu đãi (LSUD + Biên độ):</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{postPrefRate.toFixed(2)} %/năm</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1 text-slate-400">Lãi suất cơ sở (LSCS) %/năm</label>
                      <input
                        type="number"
                        step="0.1"
                        value={termBaseRate}
                        onChange={e => setTermBaseRate(e.target.value)}
                        className={`w-full rounded-xl p-2 font-mono font-bold text-sky-500 border ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-slate-400">Biên độ cộng thêm %/năm</label>
                      <input
                        type="number"
                        step="0.1"
                        value={termMarginRate}
                        onChange={e => setTermMarginRate(e.target.value)}
                        className={`w-full rounded-xl p-2 font-mono font-bold text-amber-500 border ${inputStyle}`}
                      />
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between font-semibold ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                    <span className="text-slate-400">Lãi suất thông thường (LSCS + Biên độ):</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">{normalRate.toFixed(2)} %/năm</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── KPI TỔNG KẾT KHOẢN VAY ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            <div className={`${containerCardBg} p-4 rounded-2xl border shadow-sm`}>
              <div className="text-[11px] font-bold text-slate-400 uppercase">TỔNG GỐC TRẢ</div>
              <div className="text-xl font-extrabold text-sky-600 dark:text-sky-400 font-mono mt-1">
                {formatMoney(totalPrincipalPaid)}
              </div>
            </div>

            <div className={`${containerCardBg} p-4 rounded-2xl border shadow-sm`}>
              <div className="text-[11px] font-bold text-slate-400 uppercase">TỔNG LÃI TRẢ (DỰ KIẾN)</div>
              <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1">
                {formatMoney(totalInterestPaid)}
              </div>
            </div>

            <div className={`${containerCardBg} p-4 rounded-2xl border shadow-sm`}>
              <div className="text-[11px] font-bold text-slate-400 uppercase">KỲ CÓ SỐ TRẢ NỢ CAO NHẤT</div>
              <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
                {formatMoney(maxPaymentRow.amount)}
              </div>
            </div>

            <div className={`${containerCardBg} p-4 rounded-2xl border shadow-sm`}>
              <div className="text-[11px] font-bold text-slate-400 uppercase">TỔNG GỐC + LÃI PHẢI TRẢ</div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {formatMoney(totalPrincipalPaid + totalInterestPaid)}
              </div>
            </div>
          </div>

          {/* ── BẢNG LINH ĐỘNG LỊCH TRẢ NỢ CHI TIẾT ── */}
          <div className={`${containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
            <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
              <span className="font-bold text-xs uppercase flex items-center space-x-2">
                <Layers className="w-4 h-4 text-sky-500" />
                <span>BẢNG CHI TIẾT LỊCH TRẢ NỢ DỰ KIẾN ({scheduleRows.length} KỲ TRẢ NỢ)</span>
              </span>

              {/* Export Buttons */}
              <div className="flex items-center space-x-2 print:hidden">
                <button
                  type="button"
                  onClick={handleExportTermLoanExcel}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  title="Xuất định dạng chuẩn Excel (.xls) có màu sắc, đường viền và căn chỉnh đẹp"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Excel Đẹp (.xls)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  title="In hoặc Lưu bảng chi tiết ra PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / Xuất PDF</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className={`sticky top-0 ${tableHeaderStyle}`}>
                  <tr>
                    <th className="p-3 text-center">KỲ TRẢ NỢ</th>
                    <th className="p-3">NGÀY TRẢ NỢ</th>
                    <th className="p-3 text-right">DƯ NỢ ĐẦU KỲ</th>
                    <th className="p-3 text-right">TIỀN GỐC</th>
                    <th className="p-3 text-right">TIỀN LÃI</th>
                    <th className="p-3 text-right">TỔNG TRẢ (GỐC + LÃI)</th>
                    <th className="p-3 text-right">DƯ NỢ CUỐI KỲ</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                  {scheduleRows.map((r) => (
                    <tr key={r.period} className={`transition-colors ${isLight ? 'hover:bg-sky-50/50' : 'hover:bg-slate-800/40'}`}>
                      <td className="p-3 text-center font-bold font-mono">#{r.period}</td>
                      <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-300">{fmtDate(r.dueDate)}</td>
                      <td className="p-3 text-right font-mono font-semibold">{r.openingBalance.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-sky-600 dark:text-sky-400">{r.principal.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{r.interest.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{r.totalPayment.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{r.closingBalance.toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className={`border-t sticky bottom-0 font-bold ${tableHeaderStyle}`}>
                  <tr>
                    <td className="p-3 text-center" colSpan={3}>TỔNG CỘNG TOÀN BỘ KỲ VAY</td>
                    <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono">{totalPrincipalPaid.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-mono">{totalInterestPaid.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">{(totalPrincipalPaid + totalInterestPaid).toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right font-mono">0</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: BẢNG TÍNH LÃI VAY CẦM CỐ SỔ TIẾT KIỆM (1 KỲ) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'stk_single' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Thông tin Sổ tiết kiệm */}
            <div className={`${containerCardBg} rounded-2xl p-5 border space-y-4`}>
              <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                <Percent className="w-4 h-4" />
                <span>1. THÔNG TIN SỔ TIẾT KIỆM (STK)</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-medium mb-1">Giá trị Sổ tiết kiệm (VNĐ) *</label>
                  <input
                    type="text"
                    value={stkDepositAmount}
                    onChange={e => {
                      const val = formatMoneyInput(e.target.value);
                      setStkDepositAmount(val);
                      // Recalculate loan amount
                      const numVal = parseFloat(val.replace(/\D/g, '')) || 0;
                      const ratio = parseFloat(stkPledgeRatio) || 90;
                      if (numVal > 0) setStkLoanAmountInput(Math.round(numVal * ratio / 100).toLocaleString('vi-VN'));
                    }}
                    placeholder="500.000.000"
                    className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 border ${inputStyle}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Ngày gửi sổ</label>
                    <input
                      type="date"
                      value={stkDepositDate}
                      onChange={e => {
                        setStkDepositDate(e.target.value);
                        setStkDisbursementDate(e.target.value);
                      }}
                      className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Lãi suất sổ (%/năm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={stkDepositRate}
                      onChange={e => setStkDepositRate(e.target.value)}
                      placeholder="6.5"
                      className={`w-full rounded-xl p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 border ${inputStyle}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Kỳ hạn gửi</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={1}
                        value={stkTenorVal}
                        onChange={e => setStkTenorVal(parseInt(e.target.value) || 1)}
                        className={`w-20 rounded-xl p-2.5 font-bold border ${inputStyle}`}
                      />
                      <select
                        value={stkTenorUnit}
                        onChange={e => setStkTenorUnit(e.target.value as any)}
                        className={`flex-1 rounded-xl p-2.5 font-bold border ${inputStyle}`}
                      >
                        <option value="day">Ngày</option>
                        <option value="month">Tháng</option>
                        <option value="year">Năm</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Ngày đáo hạn sổ (tự động)</label>
                    <input
                      type="date"
                      readOnly
                      value={stkExpiryDate}
                      className={`w-full rounded-xl p-2.5 font-mono border ${readonlyStyle}`}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-xl border grid grid-cols-2 gap-2 text-xs ${sectionBoxBg}`}>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Số ngày gửi thực tế:</span>
                    <strong className="font-mono text-sky-600 dark:text-sky-400">{stkDepositDays} ngày</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Lãi sổ nhận dự kiến:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatMoney(stkInterestEarned)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Thông tin Vay cầm cố */}
            <div className={`${containerCardBg} rounded-2xl p-5 border space-y-4`}>
              <div className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                <DollarSign className="w-4 h-4" />
                <span>2. THÔNG TIN VAY CẦM CỐ KHẢO SÁT</span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Tỉ lệ cầm cố (%)</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={stkPledgeRatio}
                      onChange={e => handlePledgeRatioChange(e.target.value)}
                      className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Số tiền vay (VNĐ) *</label>
                    <input
                      type="text"
                      value={stkLoanAmountInput}
                      onChange={e => setStkLoanAmountInput(formatMoneyInput(e.target.value))}
                      placeholder="450.000.000"
                      className={`w-full rounded-xl p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 border ${inputStyle}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Ngày giải ngân vay</label>
                    <input
                      type="date"
                      value={stkDisbursementDate}
                      onChange={e => setStkDisbursementDate(e.target.value)}
                      className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Lãi suất vay cầm cố (%/năm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={stkLoanRate}
                      onChange={e => setStkLoanRate(e.target.value)}
                      placeholder="7.5"
                      className={`w-full rounded-xl p-2.5 font-mono font-bold text-rose-500 border ${inputStyle}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Ngày đáo hạn vay</label>
                    <input
                      type="date"
                      readOnly
                      value={stkLoanDueDate}
                      className={`w-full rounded-xl p-2.5 font-mono border ${readonlyStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Số ngày vay thực tế</label>
                    <input
                      type="text"
                      readOnly
                      value={`${stkLoanDays} ngày`}
                      className={`w-full rounded-xl p-2.5 border ${readonlyStyle}`}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-xl border grid grid-cols-2 gap-2 text-xs ${sectionBoxBg}`}>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tiền lãi vay phải trả:</span>
                    <strong className="font-mono text-rose-600 dark:text-rose-400">{formatMoney(stkLoanInterestCost)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tổng trả vay (Gốc + Lãi):</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatMoney(stkTotalLoanPay)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: TỔNG KẾT KẾT QUẢ CẦM CỐ (1 KỲ) */}
          <div className={`${containerCardBg} rounded-2xl p-5 border shadow-xl space-y-4`}>
            <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-2.5 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>3. BẢNG TỔNG KẾT NGHĨA VỤ TÀI CHÍNH & CHÊNH LỆCH LÃI SỔ VỚI LÃI VAY</span>
              </div>

              {/* Export Buttons Tool 2 */}
              <div className="flex items-center space-x-2 print:hidden">
                <button
                  type="button"
                  onClick={handleExportStkSingleExcel}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  title="Xuất bảng tính cầm cố STK 1 kỳ ra Excel (.xls)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Excel Đẹp (.xls)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  title="In hoặc Lưu bảng tính ra PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / Xuất PDF</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl border ${sectionBoxBg}`}>
                <div className="text-[11px] font-bold text-slate-400 uppercase">TIỀN LÃI SỔ NHẬN</div>
                <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  +{formatMoney(stkInterestEarned)}
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${sectionBoxBg}`}>
                <div className="text-[11px] font-bold text-slate-400 uppercase">TIỀN LÃI VAY PHẢI TRẢ</div>
                <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1">
                  -{formatMoney(stkLoanInterestCost)}
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${stkNetDifference >= 0 ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'}`}>
                <div className="text-[11px] font-bold uppercase text-slate-500">CHÊNH LỆCH (LÃI SỔ - LÃI VAY)</div>
                <div className={`text-lg font-extrabold font-mono mt-1 ${stkNetDifference >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {stkNetDifference >= 0 ? '+' : ''}{formatMoney(stkNetDifference)}
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${sectionBoxBg}`}>
                <div className="text-[11px] font-bold text-slate-400 uppercase">TỔNG TRẢ KHOẢN VAY CẦM CỐ</div>
                <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400 font-mono mt-1">
                  {formatMoney(stkTotalLoanPay)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: BẢNG TÍNH LÃI VAY CẦM CỐ STK TÁI TỤC (NHIỀU KỲ) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'stk_multi' && (
        <div className="space-y-4">
          <div className={`${containerCardBg} rounded-2xl p-5 border space-y-4`}>
            <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-4 h-4" />
              <span>CẤU HÌNH TÁI TỤC NHIỀU KỲ CHO SỔ TIẾT KIỆM & KHOẢN VAY CẦM CỐ</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium mb-1">Số kỳ tái tục muốn tính</label>
                <select
                  value={multiCyclesCount}
                  onChange={e => setMultiCyclesCount(parseInt(e.target.value) || 2)}
                  className={`w-full rounded-xl p-2.5 font-bold ${inputStyle}`}
                >
                  {[2, 3, 4, 6, 8, 12].map(n => (
                    <option key={n} value={n}>{n} kỳ tái tục</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Phương thức tái tục STK</label>
                <select
                  value={multiRolloverOption}
                  onChange={e => setMultiRolloverOption(e.target.value as any)}
                  className={`w-full rounded-xl p-2.5 font-bold ${inputStyle}`}
                >
                  <option value="compound">Tái tục Gốc + Lãi (Lãi nhập gốc)</option>
                  <option value="principal_only">Chỉ tái tục Gốc (Lãi rút ra)</option>
                </select>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${sectionBoxBg}`}>
                <div>
                  <span className="text-[11px] text-slate-400 block">Kỳ hạn mỗi kỳ:</span>
                  <strong className="font-bold text-sky-600 dark:text-sky-400">{stkTenorVal} {stkTenorUnit === 'day' ? 'Ngày' : stkTenorUnit === 'month' ? 'Tháng' : 'Năm'}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Tỉ lệ cầm cố:</span>
                  <strong className="font-bold text-emerald-600 dark:text-emerald-400">{stkPledgeRatio}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Bảng Chi Tiết Tái Tục Nhiều Kỳ */}
          <div className={`${containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
            <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
              <span className="font-bold text-xs uppercase flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-sky-500" />
                <span>BẢNG CHI TIẾT DỰ PHÓNG LÃI TÁI TỤC & VAY CẦM CỐ QUA {multiCycleRows.length} KỲ</span>
              </span>

              {/* Export Buttons Tool 3 */}
              <div className="flex items-center space-x-2 print:hidden">
                <button
                  type="button"
                  onClick={handleExportStkMultiExcel}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  title="Xuất bảng tái tục nhiều kỳ ra Excel (.xls)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Excel Đẹp (.xls)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  title="In hoặc Lưu bảng tái tục nhiều kỳ ra PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / Xuất PDF</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className={`sticky top-0 ${tableHeaderStyle}`}>
                  <tr>
                    <th className="p-3 text-center">KỲ TÁI TỤC</th>
                    <th className="p-3">NGÀY BẮT ĐẦU</th>
                    <th className="p-3">NGÀY ĐÁO HẠN</th>
                    <th className="p-3 text-right">GỐC SỔ ĐẦU KỲ</th>
                    <th className="p-3 text-right">LÃI SỔ NHẬN</th>
                    <th className="p-3 text-right">SỐ TIỀN VAY CẦM CỐ</th>
                    <th className="p-3 text-right">LÃI VAY PHẢI TRẢ</th>
                    <th className="p-3 text-right">CHÊNH LỆCH KỲ NÀY</th>
                    <th className="p-3 text-right">CHÊNH LỆCH TÍCH LŨY</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                  {multiCycleRows.map((r) => (
                    <tr key={r.cycleNumber} className={`transition-colors ${isLight ? 'hover:bg-sky-50/50' : 'hover:bg-slate-800/40'}`}>
                      <td className="p-3 text-center font-bold font-mono">Kỳ #{r.cycleNumber}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{fmtDate(r.startDate)}</td>
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-200">{fmtDate(r.expiryDate)}</td>
                      <td className="p-3 text-right font-mono font-semibold">{r.depositOpening.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+{r.depositInterest.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-sky-600 dark:text-sky-400">{r.loanAmount.toLocaleString('vi-VN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">-{r.loanInterest.toLocaleString('vi-VN')}</td>
                      <td className={`p-3 text-right font-mono font-bold ${r.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {r.netProfit >= 0 ? '+' : ''}{r.netProfit.toLocaleString('vi-VN')}
                      </td>
                      <td className={`p-3 text-right font-mono font-extrabold ${r.cumulativeNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {r.cumulativeNetProfit >= 0 ? '+' : ''}{r.cumulativeNetProfit.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className={`border-t sticky bottom-0 font-bold ${tableHeaderStyle}`}>
                  <tr>
                    <td className="p-3 text-center" colSpan={4}>TỔNG CỘNG QUA {multiCycleRows.length} KỲ TÁI TỤC</td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                      +{multiCycleRows.reduce((sum, r) => sum + r.depositInterest, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono">—</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-mono">
                      -{multiCycleRows.reduce((sum, r) => sum + r.loanInterest, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3 text-right font-mono">—</td>
                    <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      +{cumNetProfit.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
