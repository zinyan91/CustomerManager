import React, { useState, useMemo } from 'react';
import { Percent, TrendingDown, Download, FileSpreadsheet, Calculator, Calendar } from 'lucide-react';
import { fmtMoney, fmtDate, formatMoneyInput } from '../../lib/utils';
import type { ThemeStyles } from '../../lib/themeStyles';

interface Tool4Props {
  styles: ThemeStyles;
  isLight: boolean;
}

export const Tool4RateReductionCalc: React.FC<Tool4Props> = ({ isLight }) => {
  const [calcMode, setCalcMode] = useState<'quick' | 'tdh'>('tdh');

  // ──────────────────────────────────────────────────────────────────────────
  // CHẾ ĐỘ 1: TÍNH GIẢM LÃI NGẮN HẠN / NHANH (SHEET 1)
  // ──────────────────────────────────────────────────────────────────────────
  const [qBalanceStr, setQBalanceStr] = useState('1.500.000.000');
  const [qCurrentRateStr, setQCurrentRateStr] = useState('10.25');
  const [qProposedRateStr, setQProposedRateStr] = useState('8.25');
  const [qDaysStr, setQDaysStr] = useState('61'); // 61 ngày cho 2 tháng
  const [qCofStr, setQCofStr] = useState('5.30');

  const qBalance = parseFloat(qBalanceStr.replace(/\D/g, '')) || 0;
  const qCurrentRate = (parseFloat(qCurrentRateStr) || 0) / 100;
  const qProposedRate = (parseFloat(qProposedRateStr) || 0) / 100;
  const qDays = parseInt(qDaysStr, 10) || 61;
  const qCof = (parseFloat(qCofStr) || 0) / 100;

  const qDeltaRate = Math.max(0, qCurrentRate - qProposedRate);
  const qInterestReduced = Math.round(qBalance * qDeltaRate * (qDays / 365));
  const qMarginCurrent = qCurrentRate - qCof;
  const qMarginProposed = qProposedRate - qCof;

  // ──────────────────────────────────────────────────────────────────────────
  // CHẾ ĐỘ 2: TÍNH GIẢM LÃI TRUNG DÀI HẠN (SHEET 2 - GIẢM LS VAY TDH)
  // ──────────────────────────────────────────────────────────────────────────
  const [tdhLoanAmtStr, setTdhLoanAmtStr] = useState('2.000.000.000');
  const [tdhTenorMonths, setTdhTenorMonths] = useState<number>(120); // 10 năm
  const [tdhPrefRateStr, setTdhPrefRateStr] = useState('9.0');
  const [tdhPrefMonths, setTdhPrefMonths] = useState<number>(12);
  const [tdhPostPrefRateStr, setTdhPostPrefRateStr] = useState('12.6');
  
  // Thông số giảm lãi
  const [tdhStartMonth, setTdhStartMonth] = useState<number>(28); // Tháng bắt đầu giảm s
  const [tdhNumMonthsReduce, setTdhNumMonthsReduce] = useState<number>(3); // Số tháng giảm k
  const [tdhProposedRateStr, setTdhProposedRateStr] = useState('9.9'); // LS đề xuất
  const [tdhMinRateStr, setTdhMinRateStr] = useState('9.82'); // Sàn LSCV tối thiểu
  const [tdhMaxReductionStr, setTdhMaxReductionStr] = useState('3.0'); // Trần giảm tối đa %
  const [tdhCofStr, setTdhCofStr] = useState('8.5'); // COF %
  const [tdhStartDate, setTdhStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  const tdhLoanAmt = parseFloat(tdhLoanAmtStr.replace(/\D/g, '')) || 0;
  const tdhPrefRate = (parseFloat(tdhPrefRateStr) || 0) / 100;
  const tdhPostPrefRate = (parseFloat(tdhPostPrefRateStr) || 0) / 100;
  const tdhProposedRate = (parseFloat(tdhProposedRateStr) || 0) / 100;
  const tdhMinRate = (parseFloat(tdhMinRateStr) || 0) / 100;
  const tdhMaxReduction = (parseFloat(tdhMaxReductionStr) || 0) / 100;
  const tdhCof = (parseFloat(tdhCofStr) || 0) / 100;

  // Lịch tính chi tiết 120 tháng (Actual/365)
  const tdhScheduleRows = useMemo(() => {
    if (!tdhLoanAmt || !tdhTenorMonths || !tdhStartDate) return [];

    const monthlyPrincipalStep = tdhLoanAmt / tdhTenorMonths;
    const rows: {
      month: number;
      paymentDateStr: string;
      daysInPeriod: number;
      beginningBalance: number;
      principalPayment: number;
      standardRateAnnual: number;
      reducedRateAnnual: number;
      deltaRateAnnual: number;
      isReduced: boolean;
      interestSaved: number;
      interestOriginal: number;
      interestFinal: number;
      endingBalance: number;
    }[] = [];

    const baseDateParts = tdhStartDate.split('-');
    const baseYear = parseInt(baseDateParts[0], 10);
    const baseMonth = parseInt(baseDateParts[1], 10);
    const baseDay = parseInt(baseDateParts[2], 10);

    const getEdate = (mOffset: number) => {
      return new Date(baseYear, baseMonth - 1 + mOffset, baseDay);
    };

    const formatDateStr = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    let curBalance = tdhLoanAmt;

    for (let m = 1; m <= tdhTenorMonths; m++) {
      const currDate = getEdate(m - 1);
      const prevDate = getEdate(m - 2);

      const diffTime = currDate.getTime() - prevDate.getTime();
      const daysInPeriod = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

      const beginningBalance = Math.max(0, curBalance);
      const principalPayment = beginningBalance > 0 ? Math.min(monthlyPrincipalStep, beginningBalance) : 0;

      // LS quy định kỳ
      const standardRateAnnual = m <= tdhPrefMonths ? tdhPrefRate : tdhPostPrefRate;

      // Kiểm tra có nằm trong thời gian giảm lãi s -> s+k-1 không
      const inReduceWindow = m > tdhPrefMonths && m >= tdhStartMonth && m <= (tdhStartMonth + tdhNumMonthsReduce - 1);

      let reducedRateAnnual = standardRateAnnual;
      if (inReduceWindow) {
        let candidateRate = standardRateAnnual - tdhMaxReduction;
        if (tdhProposedRate > 0) {
          candidateRate = Math.min(tdhProposedRate, candidateRate);
        }
        reducedRateAnnual = Math.max(tdhMinRate, candidateRate);
      }

      const deltaRateAnnual = Math.max(0, standardRateAnnual - reducedRateAnnual);
      const isReduced = deltaRateAnnual > 0.00001;

      const interestSaved = Math.round(beginningBalance * deltaRateAnnual * (daysInPeriod / 365));
      const interestOriginal = Math.round(beginningBalance * standardRateAnnual * (daysInPeriod / 365));
      const interestFinal = Math.round(beginningBalance * reducedRateAnnual * (daysInPeriod / 365));
      const endingBalance = Math.max(0, beginningBalance - principalPayment);

      rows.push({
        month: m,
        paymentDateStr: formatDateStr(currDate),
        daysInPeriod,
        beginningBalance,
        principalPayment,
        standardRateAnnual,
        reducedRateAnnual,
        deltaRateAnnual,
        isReduced,
        interestSaved,
        interestOriginal,
        interestFinal,
        endingBalance,
      });

      curBalance = endingBalance;
    }

    return rows;
  }, [
    tdhLoanAmt, tdhTenorMonths, tdhPrefRate, tdhPrefMonths, tdhPostPrefRate,
    tdhStartMonth, tdhNumMonthsReduce, tdhProposedRate, tdhMinRate, tdhMaxReduction, tdhStartDate
  ]);

  const totalInterestSaved = useMemo(() => {
    return tdhScheduleRows.reduce((sum, r) => sum + r.interestSaved, 0);
  }, [tdhScheduleRows]);

  const totalOriginalInterest = useMemo(() => {
    return tdhScheduleRows.reduce((sum, r) => sum + r.interestOriginal, 0);
  }, [tdhScheduleRows]);

  const totalFinalInterest = useMemo(() => {
    return tdhScheduleRows.reduce((sum, r) => sum + r.interestFinal, 0);
  }, [tdhScheduleRows]);

  // Xuất file Excel / HTML
  const handleExportExcel = () => {
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
        <td style="text-align:center;">${fmtDate(r.paymentDateStr)}</td>
        <td style="text-align:center;">${r.daysInPeriod}</td>
        <td style="text-align:right;">${r.beginningBalance.toLocaleString('vi-VN')}</td>
        <td style="text-align:right;">${r.principalPayment.toLocaleString('vi-VN')}</td>
        <td style="text-align:center;">${(r.standardRateAnnual * 100).toFixed(2)}%</td>
        <td style="text-align:center;font-weight:bold;color:${r.isReduced ? '#16a34a' : '#000'};">${(r.reducedRateAnnual * 100).toFixed(2)}%</td>
        <td style="text-align:center;color:#dc2626;">${(r.deltaRateAnnual * 100).toFixed(2)}%</td>
        <td style="text-align:right;font-weight:bold;color:#16a34a;">${r.interestSaved.toLocaleString('vi-VN')}</td>
        <td style="text-align:right;">${r.interestOriginal.toLocaleString('vi-VN')}</td>
        <td style="text-align:right;font-weight:bold;">${r.interestFinal.toLocaleString('vi-VN')}</td>
        <td style="text-align:right;">${r.endingBalance.toLocaleString('vi-VN')}</td>
      </tr>
    `).join('');

    const footerHtml = `
      <tr style="background-color:#e0f2fe;font-weight:bold;">
        <td colspan="8" style="text-align:right;color:#0369a1;">TỔNG TIỀN GIẢM LÃI DỰ KIẾN:</td>
        <td style="text-align:right;color:#16a34a;font-size:14px;">${totalInterestSaved.toLocaleString('vi-VN')} VNĐ</td>
        <td style="text-align:right;">${totalOriginalInterest.toLocaleString('vi-VN')} VNĐ</td>
        <td style="text-align:right;color:#0369a1;">${totalFinalInterest.toLocaleString('vi-VN')} VNĐ</td>
        <td></td>
      </tr>
    `;

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <style>
          td, th { border: 1px solid #cbd5e1; padding: 6px; font-family: Arial, sans-serif; font-size: 11pt; }
        </style>
      </head>
      <body>
        <h2>BẢNG TÍNH GIẢM LÃI SUẤT VAY TRUNG DÀI HẠN (ACTUAL/365)</h2>
        <p><strong>Số tiền vay:</strong> ${tdhLoanAmt.toLocaleString('vi-VN')} VNĐ | <strong>Thời hạn:</strong> ${tdhTenorMonths} tháng</p>
        <p><strong>Lãi suất ưu đãi:</strong> ${(tdhPrefRate * 100).toFixed(2)}% (${tdhPrefMonths} tháng) | <strong>LS Sau ưu đãi:</strong> ${(tdhPostPrefRate * 100).toFixed(2)}%</p>
        <p><strong>Mức giảm đề xuất:</strong> ${(tdhProposedRate * 100).toFixed(2)}% | <strong>Áp dụng từ tháng:</strong> ${tdhStartMonth} (${tdhNumMonthsReduce} tháng)</p>
        <table>
          <thead>${headerHtml}</thead>
          <tbody>${bodyHtml}</tbody>
          <tfoot>${footerHtml}</tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BANG_TINH_GIAM_LAI_SUAT_VAY_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const cardBg = isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100';

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3`}>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center space-x-2">
            <TrendingDown className="w-5 h-5 text-emerald-500" />
            <span>CÔNG CỤ TÍNH GIẢM LÃI SUẤT VAY (CHUẨN GIẢM LS VAY.XLSX)</span>
          </h2>
        </div>

        {/* Sub-tab Switcher */}
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
            1. Vay Trung Dài Hạn (TDH)
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
            2. Vay Ngắn Hạn / Nhanh
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CHẾ ĐỘ 1: GIẢM LÃI TRUNG DÀI HẠN (TDH) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {calcMode === 'tdh' && (
        <div className="space-y-4">
          {/* Input Panel */}
          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-4`}>
            <div className="font-bold text-xs text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Calculator className="w-4 h-4" />
              <span>THÔNG SỐ KHOẢN VAY & ĐỀ XUẤT GIẢM LÃI SUẤT (SHEET 2 TDH)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Cột 1: Thông số khoản vay */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Số tiền vay (P) *</label>
                  <input
                    type="text"
                    value={tdhLoanAmtStr}
                    onChange={e => setTdhLoanAmtStr(formatMoneyInput(e.target.value))}
                    className="w-full p-2 rounded-xl border text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Số tháng vay (n) *</label>
                  <input
                    type="number"
                    min={1}
                    value={tdhTenorMonths}
                    onChange={e => setTdhTenorMonths(parseInt(e.target.value, 10) || 12)}
                    className="w-full p-2 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày giải ngân / Kỳ 1 *</label>
                  <input
                    type="date"
                    value={tdhStartDate}
                    onChange={e => setTdhStartDate(e.target.value)}
                    className="w-full p-2 rounded-xl border text-xs font-mono bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Cột 2: Cấu trúc lãi suất gốc */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">LS Ưu đãi (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhPrefRateStr}
                    onChange={e => setTdhPrefRateStr(e.target.value)}
                    className="w-full p-2 rounded-xl border text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Số tháng ưu đãi</label>
                  <input
                    type="number"
                    min={0}
                    value={tdhPrefMonths}
                    onChange={e => setTdhPrefMonths(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 rounded-xl border text-xs font-mono bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">LS Sau ưu đãi (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhPostPrefRateStr}
                    onChange={e => setTdhPostPrefRateStr(e.target.value)}
                    className="w-full p-2 rounded-xl border text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Cột 3: Phương án giảm lãi đề xuất */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">LS Đề xuất giảm (%/năm) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhProposedRateStr}
                    onChange={e => setTdhProposedRateStr(e.target.value)}
                    placeholder="9.9"
                    className="w-full p-2 rounded-xl border text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Tháng bắt đầu giảm (s) *</label>
                  <input
                    type="number"
                    min={1}
                    value={tdhStartMonth}
                    onChange={e => setTdhStartMonth(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2 rounded-xl border text-xs font-mono font-bold text-purple-600 dark:text-purple-400 bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Số tháng áp dụng (k) *</label>
                  <input
                    type="number"
                    min={1}
                    value={tdhNumMonthsReduce}
                    onChange={e => setTdhNumMonthsReduce(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2 rounded-xl border text-xs font-mono font-bold text-purple-600 dark:text-purple-400 bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Cột 4: Khống chế trần sàn & COF */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">LSCV Tối thiểu / Sàn (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhMinRateStr}
                    onChange={e => setTdhMinRateStr(e.target.value)}
                    className="w-full p-2 rounded-xl border text-xs font-mono bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">LS Giảm tối đa / Trần (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tdhMaxReductionStr}
                    onChange={e => setTdhMaxReductionStr(e.target.value)}
                    className="w-full p-2 rounded-xl border text-xs font-mono bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Chi phí vốn COF (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tdhCofStr}
                    onChange={e => setTdhCofStr(e.target.value)}
                    className="w-full p-2 rounded-xl border text-xs font-mono bg-transparent border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Result KPI Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${cardBg} rounded-2xl p-4 border shadow-sm flex items-center justify-between`}>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TỔNG TIỀN GIẢM LÃI DỰ KIẾN</div>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {fmtMoney(totalInterestSaved)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Áp dụng trong {tdhNumMonthsReduce} kỳ (Tháng {tdhStartMonth} $\rightarrow$ {tdhStartMonth + tdhNumMonthsReduce - 1})
                </div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>

            <div className={`${cardBg} rounded-2xl p-4 border shadow-sm flex items-center justify-between`}>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">LÃI BAN ĐẦU vs SAU GIẢM</div>
                <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400 mt-1 font-mono">
                  {fmtMoney(totalOriginalInterest)} $\rightarrow$ {fmtMoney(totalFinalInterest)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tiết kiệm: <strong className="text-emerald-600 dark:text-emerald-400">-{((totalInterestSaved / (totalOriginalInterest || 1)) * 100).toFixed(1)}%</strong> chi phí lãi
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
                  +{((tdhProposedRate - tdhCof) * 100).toFixed(2)} %/năm
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  LS đề xuất { (tdhProposedRate * 100).toFixed(2) }% - COF { (tdhCof * 100).toFixed(2) }%
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-sky-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  BẢNG LỊCH TRẢ NỢ VÀ TIỀN GIẢM LÃI CHI TIẾT KỲ HẠN ({tdhScheduleRows.length} KỲ - ACTUAL/365)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>XUẤT EXCEL (EXCEL .XLS)</span>
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
                      <td className="p-2 text-sky-600 dark:text-sky-400">{fmtDate(r.paymentDateStr)}</td>
                      <td className="p-2 text-center">{r.daysInPeriod}</td>
                      <td className="p-2 text-right">{fmtMoney(r.beginningBalance)}</td>
                      <td className="p-2 text-right">{fmtMoney(r.principalPayment)}</td>
                      <td className="p-2 text-center">{(r.standardRateAnnual * 100).toFixed(2)}%</td>
                      <td className={`p-2 text-center font-bold ${r.isReduced ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {(r.reducedRateAnnual * 100).toFixed(2)}%
                      </td>
                      <td className="p-2 text-center text-rose-500 font-bold">
                        {r.isReduced ? `-${(r.deltaRateAnnual * 100).toFixed(2)}%` : '0%'}
                      </td>
                      <td className="p-2 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        {r.isReduced ? fmtMoney(r.interestSaved) : '0 VNĐ'}
                      </td>
                      <td className="p-2 text-right text-slate-500">{fmtMoney(r.interestOriginal)}</td>
                      <td className="p-2 text-right font-bold text-sky-600 dark:text-sky-400">{fmtMoney(r.interestFinal)}</td>
                      <td className="p-2 text-right">{fmtMoney(r.endingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CHẾ ĐỘ 2: GIẢM LÃI NGẮN HẠN / NHANH (SHEET 1) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {calcMode === 'quick' && (
        <div className="space-y-4">
          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-4`}>
            <div className="font-bold text-xs text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Percent className="w-4 h-4" />
              <span>BẢNG TÍNH GIẢM LÃI SUẤT NGẮN HẠN / NHANH (ACTUAL/365)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Số dư khoản vay (VND) *</label>
                <input
                  type="text"
                  value={qBalanceStr}
                  onChange={e => setQBalanceStr(formatMoneyInput(e.target.value))}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-transparent border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">LSCV quy định (%/năm) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={qCurrentRateStr}
                  onChange={e => setQCurrentRateStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-transparent border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">LS Đề xuất giảm (%/năm) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={qProposedRateStr}
                  onChange={e => setQProposedRateStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-transparent border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Số ngày áp dụng (Actual/365) *</label>
                <input
                  type="number"
                  min={1}
                  value={qDaysStr}
                  onChange={e => setQDaysStr(e.target.value)}
                  placeholder="61"
                  className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold bg-transparent border-slate-200 dark:border-slate-800"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">💡 Mặc định 61 ngày (cho 2 tháng). Có thể điều chỉnh theo ngày thực tế phê duyệt.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Chi phí vốn COF (%/năm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={qCofStr}
                  onChange={e => setQCofStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-mono bg-transparent border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Chênh lệch ΔLS (%/năm)</label>
                <div className="p-2.5 rounded-xl border font-mono font-extrabold text-xs text-rose-600 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                  -{(qDeltaRate * 100).toFixed(2)} %/năm
                </div>
              </div>
            </div>

            {/* Quick Result Summary */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  👉 TIỀN GIẢM LÃI DỰ KIẾN:
                </span>
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {fmtMoney(qInterestReduced)}
                </span>
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>• Tiền giảm lãi = Số dư × (LSCV quy định - LS đề xuất) × Số ngày/365</div>
                <div>• Margin hiện tại: <strong>{(qMarginCurrent * 100).toFixed(2)}%</strong> $\rightarrow$ Margin đề xuất: <strong>{(qMarginProposed * 100).toFixed(2)}%</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
