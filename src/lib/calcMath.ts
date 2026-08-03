/**
 * Công thức tài chính dùng chung cho các Công cụ tính toán (Tool 1-8).
 *
 * Phần helper ngày tháng được dời nguyên văn từ Tool1/2/3 (trước đây bị
 * lặp lại y hệt ở cả ba file) — GIỮ NGUYÊN hành vi để không làm đổi kết
 * quả các công cụ đang dùng.
 *
 * ⚠️ Lưu ý: diffDays ở đây KHÁC getDaysBetween trong loanMath.ts:
 *   - Hai mốc trùng ngày : ở đây trả 0, loanMath trả 1
 *   - Chuỗi ngày hỏng    : ở đây trả 0, loanMath trả 30
 * Với ngày hợp lệ và khác nhau thì hai bên cho kết quả giống nhau.
 */

export function addMonths(dateStr: string, months: number): string {
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

export function diffDays(startDateStr: string, endDateStr: string): number {
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

/**
 * Hệ số giá trị hiện tại của dòng tiền đều (annuity).
 * PV = PMT × [1 - (1+r)^(-n)] / r
 */
export function pvAnnuityFactor(rateMonthly: number, tenorMonths: number): number {
  if (tenorMonths <= 0) return 0;
  if (rateMonthly <= 0) return tenorMonths; // Lãi suất 0: giá trị hiện tại = số kỳ
  return (1 - Math.pow(1 + rateMonthly, -tenorMonths)) / rateMonthly;
}

/**
 * Hệ số trả góp đều hàng tháng (EMI).
 * EMI = P × [r(1+r)^n] / [(1+r)^n - 1]
 * Đây là nghịch đảo của pvAnnuityFactor.
 */
export function emiFactor(rateMonthly: number, tenorMonths: number): number {
  if (tenorMonths <= 0) return 0;
  if (rateMonthly <= 0) return 1 / tenorMonths;
  const pow = Math.pow(1 + rateMonthly, tenorMonths);
  return (rateMonthly * pow) / (pow - 1);
}

/** Tiền trả góp đều hàng tháng, làm tròn về đồng. */
export function emiMonthlyPayment(loanAmount: number, rateMonthly: number, tenorMonths: number): number {
  if (!loanAmount || tenorMonths <= 0) return 0;
  return Math.round(loanAmount * emiFactor(rateMonthly, tenorMonths));
}

/**
 * Khả năng trả nợ hàng tháng theo DTI: lấy giá trị NHỎ HƠN giữa
 * thu nhập ròng khả dụng và trần DTI.
 */
export function dtiMaxMonthlyPayment(
  monthlyIncome: number, livingExpense: number, existingDebt: number, maxDtiPercent: number
): number {
  const netDisposable = Math.max(0, monthlyIncome - livingExpense - existingDebt);
  const dtiLimit = Math.max(0, (monthlyIncome * (maxDtiPercent / 100)) - existingDebt);
  return Math.min(netDisposable, dtiLimit);
}

/**
 * Lãi suất hiệu lực năm (EAR) từ lãi suất danh nghĩa.
 * EAR = (1 + r/m)^m - 1
 */
export function effectiveAnnualRate(nominalRateAnnual: number, compoundingFreq: number): number {
  if (compoundingFreq <= 0) return nominalRateAnnual;
  return Math.pow(1 + nominalRateAnnual / compoundingFreq, compoundingFreq) - 1;
}

/**
 * Quy đổi xấp xỉ lãi suất phẳng sang lãi suất dư nợ giảm dần.
 * r_giảm_dần ≈ (r_phẳng × 2 × n) / (n + 1)
 */
export function flatToReducingApprox(flatRateAnnual: number, tenorMonths: number): number {
  if (tenorMonths <= 0) return 0;
  return (flatRateAnnual * 2 * tenorMonths) / (tenorMonths + 1);
}
