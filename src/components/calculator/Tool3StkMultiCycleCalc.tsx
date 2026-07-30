import React, { useState, useMemo } from 'react';
import { TrendingUp, Download } from 'lucide-react';
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

interface Tool3StkMultiCycleCalcProps {
  styles: ThemeStyles;
  isLight: boolean;
}

export const Tool3StkMultiCycleCalc: React.FC<Tool3StkMultiCycleCalcProps> = ({ styles, isLight }) => {
  const [stkAmountStr, setStkAmountStr] = useState('300.000.000');
  const [stkRateStr, setStkRateStr] = useState('6.0');
  const [cycleMonths, setCycleMonths] = useState<number>(6);
  const [totalCycles, setTotalCycles] = useState<number>(4);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rolloverType, setRolloverType] = useState<'compound' | 'simple'>('compound');

  const stkAmt = parseFloat(stkAmountStr.replace(/\D/g, '')) || 0;
  const stkRateAnnual = parseFloat(stkRateStr) || 0;

  const cycleRows = useMemo(() => {
    if (!stkAmt || !stkRateAnnual || !cycleMonths || !startDate) return [];

    const rows: {
      cycle: number;
      startDate: string;
      endDate: string;
      days: number;
      beginningBalance: number;
      interestEarned: number;
      endingBalance: number;
    }[] = [];

    let currentBalance = stkAmt;
    let currStart = startDate;

    for (let c = 1; c <= totalCycles; c++) {
      const currEnd = addMonths(currStart, cycleMonths);
      const days = diffDays(currStart, currEnd);
      const interestEarned = Math.round(currentBalance * (stkRateAnnual / 100) * (days / 365));
      const endingBalance = rolloverType === 'compound'
        ? currentBalance + interestEarned
        : currentBalance;

      rows.push({
        cycle: c,
        startDate: currStart,
        endDate: currEnd,
        days,
        beginningBalance: currentBalance,
        interestEarned,
        endingBalance: rolloverType === 'compound' ? endingBalance : currentBalance + interestEarned,
      });

      currStart = currEnd;
      if (rolloverType === 'compound') {
        currentBalance = endingBalance;
      }
    }

    return rows;
  }, [stkAmt, stkRateAnnual, cycleMonths, totalCycles, startDate, rolloverType]);

  const totalInterestEarned = cycleRows.reduce((a, r) => a + r.interestEarned, 0);

  const handleExportExcel = () => {
    if (cycleRows.length === 0) return;
    const params = [
      { label: 'Gốc STK ban đầu:', value: `${stkAmt.toLocaleString('vi-VN')} VNĐ` },
      { label: 'Lãi suất STK:', value: `${stkRateAnnual}%/năm` },
      { label: 'Kỳ hạn 1 vòng:', value: `${cycleMonths} tháng` },
      { label: 'Số chu kỳ tái tục:', value: `${totalCycles} chu kỳ` },
      { label: 'Ngày bắt đầu gửi:', value: fmtDate(startDate) },
      { label: 'Phương thức quay vòng:', value: rolloverType === 'compound' ? 'Nhập gốc tái tục (Lãi kép)' : 'Rút lãi, quay gốc (Lãi đơn)' },
    ];
    const headers = ['Vòng', 'Ngày Bắt Đầu', 'Ngày Đáo Hạn', 'Số Ngày', 'Gốc Vòng Vay', 'Lãi Sinh Ra', 'Giá Trị Cuối Vòng'];
    const rows = cycleRows.map(r => [
      `Vòng ${r.cycle}`,
      fmtDate(r.startDate),
      fmtDate(r.endDate),
      r.days,
      r.beginningBalance,
      r.interestEarned,
      r.endingBalance,
    ]);
    const footer = ['TỔNG CỘNG', '', '', '', stkAmt, totalInterestEarned, stkAmt + totalInterestEarned];
    exportToExcelHTML('Du_Phong_Tai_Tuc_STK', 'BẢNG DỰ PHỎNG TÁI TỤC SỔ TIẾT KIỆM NHIỀU KỲ', params, headers, rows, footer);
  };

  return (
    <div className="space-y-4">
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4`}>
        <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-slate-800">
          <TrendingUp className="w-4 h-4" />
          <span>THÔNG SỐ DỰ PHỎNG TÁI TỤC STK NHIỀU VÒNG</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Gốc STK ban đầu (VNĐ) *</label>
            <input
              type="text"
              value={stkAmountStr}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                setStkAmountStr(digits ? Number(digits).toLocaleString('vi-VN') : '');
              }}
              className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Lãi suất STK (%/năm) *</label>
            <input
              type="text"
              value={stkRateStr}
              onChange={e => setStkRateStr(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-mono font-bold ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Kỳ hạn 1 vòng (Tháng) *</label>
            <input
              type="number"
              min={1}
              max={60}
              value={cycleMonths}
              onChange={e => setCycleMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`w-full rounded-xl p-2.5 font-mono font-bold ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Số chu kỳ tái tục dự phỏng *</label>
            <input
              type="number"
              min={1}
              max={20}
              value={totalCycles}
              onChange={e => setTotalCycles(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`w-full rounded-xl p-2.5 font-mono font-bold ${styles.inputStyle}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Phương thức quay vòng STK *</label>
            <select
              value={rolloverType}
              onChange={e => setRolloverType(e.target.value as any)}
              className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`}
            >
              <option value="compound">Nhập gốc tái tục (Lãi nhập gốc - Lãi kép)</option>
              <option value="simple">Rút lãi hàng kỳ, chỉ quay vòng gốc ban đầu (Lãi đơn)</option>
            </select>
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày bắt đầu gửi *</label>
            <DateInput
              value={startDate}
              onChange={val => setStartDate(val)}
              className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
            />
          </div>
        </div>
      </div>

      {/* Cycle Results Table */}
      <div className={`${styles.containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
        <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
          <span className="font-bold text-xs uppercase flex items-center space-x-2">
            <span>BẢNG DỰ PHỎNG CÁC CHU KỲ TÁI TỤC ({cycleRows.length} CHU KỲ)</span>
          </span>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel Đẹp (.xls)</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={styles.tableHeaderStyle}>
              <tr>
                <th className="p-3 text-center whitespace-nowrap">VÒNG TÁI TỤC</th>
                <th className="p-3 text-center whitespace-nowrap">NGÀY BẮT ĐẦU</th>
                <th className="p-3 text-center whitespace-nowrap">NGÀY ĐÁO HẠN</th>
                <th className="p-3 text-center whitespace-nowrap">SỐ NGÀY</th>
                <th className="p-3 text-right whitespace-nowrap">GỐC VÒNG VAY</th>
                <th className="p-3 text-right whitespace-nowrap text-amber-600 dark:text-amber-400">LÃI SINH RA</th>
                <th className="p-3 text-right whitespace-nowrap text-emerald-600 dark:text-emerald-400">GIÁ TRỊ CUỐI VÒNG</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
              {cycleRows.map(r => (
                <tr key={r.cycle} className={styles.tableRowHover}>
                  <td className="p-3 text-center font-bold font-mono">Vòng #{r.cycle}</td>
                  <td className="p-3 text-center font-mono">{fmtDate(r.startDate)}</td>
                  <td className="p-3 text-center font-mono font-bold">{fmtDate(r.endDate)}</td>
                  <td className="p-3 text-center font-mono">{r.days}d</td>
                  <td className="p-3 text-right font-mono">{r.beginningBalance.toLocaleString('vi-VN')}</td>
                  <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">+{r.interestEarned.toLocaleString('vi-VN')}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.endingBalance.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className={`border-t font-bold ${styles.tableHeaderStyle}`}>
              <tr>
                <td colSpan={5} className="p-3 text-center">TỔNG CỘNG LÃI TÍCH LŨY DỰ PHỎNG</td>
                <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-mono text-sm">+{totalInterestEarned.toLocaleString('vi-VN')} VNĐ</td>
                <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">{(stkAmt + totalInterestEarned).toLocaleString('vi-VN')} VNĐ</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
