import type { RepaymentSchedule, RateAdjustmentHistoryItem } from '../types';

/**
 * Logic tính toán lịch trả nợ — tách ra khỏi LoanPortfolioView để test được.
 * Dời nguyên văn, không thay đổi hành vi.
 */

/** Cộng thêm số tháng vào ngày YYYY-MM-DD, giữ nguyên ngày trong tháng (kẹp về cuối tháng nếu tràn). */
export
function addMonthsToDate(dateStr?: string | null, months?: number | null): string {
  if (!dateStr || !months || isNaN(months) || months <= 0) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);

    let targetYear = year;
    let targetMonth = month + Number(months);
    targetYear += Math.floor(targetMonth / 12);
    targetMonth = targetMonth % 12;

    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(day, daysInTargetMonth);

    const d = new Date(targetYear, targetMonth, targetDay);
    if (isNaN(d.getTime())) return '';
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

/** Bóc số tháng từ chuỗi kỳ hạn KUNN, ví dụ "12 tháng" -> 12. */
export
function parseKunnTenorMonths(tenorStr?: string | null): number {
  if (!tenorStr) return 0;
  const match = tenorStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/** Tách YYYY-MM-DD thành {y, m (0-indexed), d}. */
export
function parseDateParts(dStr?: string | null) {
  if (!dStr) return null;
  const parts = dStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; // 0-indexed
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { y, m, d };
}

/** Số ngày thực tế giữa hai mốc. Tối thiểu 1; trả 30 nếu chuỗi ngày không hợp lệ. */
export
function getDaysBetween(d1Str: string, d2Str: string): number {
  const p1 = parseDateParts(d1Str);
  const p2 = parseDateParts(d2Str);
  if (!p1 || !p2) return 30;
  const utc1 = Date.UTC(p1.y, p1.m, p1.d);
  const utc2 = Date.UTC(p2.y, p2.m, p2.d);
  return Math.max(1, Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24)));
}

/** Làm tròn tiền gốc LÊN theo bước chuẩn Core Banking. */
export
function roundPrincipalCore(rawPrincipal: number, roundMode: '1k' | '10k' | '50k' | 'exact' = '1k'): number {
  if (roundMode === 'exact' || !rawPrincipal || rawPrincipal <= 0) return Math.round(rawPrincipal);
  const step = roundMode === '50k' ? 50000 : roundMode === '10k' ? 10000 : 1000;
  return Math.ceil(rawPrincipal / step) * step;
}

/** Sinh lịch trả nợ theo công thức Core Banking (lãi tính trên số ngày thực tế / 365). */
export
function generateSchedule(
  contractId: number,
  loanAmount: number,
  interestRate: number,
  repaymentStartDateStr: string,
  periods: number,
  isBulletPrincipal: boolean = true,
  disbursementDateStr?: string,
  customMonthlyPrincipal?: number,
  principalGraceMonths: number = 0,
  prepaymentAmount: number = 0,
  prepaymentPeriod: number = 0,
  prepaymentMode: 'reduce_monthly' | 'shorten_tenor' = 'reduce_monthly',
  rateHistory?: RateAdjustmentHistoryItem[],
  prefInfo?: { prefRate: number; prefMonths: number; postPrefRate: number }
): Partial<RepaymentSchedule>[] {
  const schedules: Partial<RepaymentSchedule>[] = [];
  let balance = loanAmount;

  const startParts = parseDateParts(repaymentStartDateStr);
  const startYear = startParts ? startParts.y : new Date().getFullYear();
  const startMonth = startParts ? startParts.m : new Date().getMonth();
  const startDay = startParts ? startParts.d : new Date().getDate();

  const defaultAnnualRate = interestRate > 1 ? interestRate / 100 : interestRate;

  // Lịch sử ngày trả nợ kỳ trước (Kỳ 1 bắt đầu tính số ngày thực tế từ Ngày giải ngân)
  let prevDateStr = disbursementDateStr || repaymentStartDateStr;

  // Tiền gốc trả đều hàng tháng (mặc định làm tròn 1.000 VNĐ chuẩn Core Banking Flexcube/T24)
  const remainingRepayPeriods = Math.max(1, periods - principalGraceMonths);
  let defaultMonthlyPrincipal = isBulletPrincipal
    ? 0
    : (customMonthlyPrincipal && customMonthlyPrincipal > 0
        ? customMonthlyPrincipal
        : roundPrincipalCore(loanAmount / remainingRepayPeriods, '1k'));

  const sortedHistory = (rateHistory && rateHistory.length > 0)
    ? [...rateHistory].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    : [];

  for (let i = 1; i <= periods; i++) {
    if (balance <= 0) break;

    // Ngày trả nợ của Kỳ i (Kỳ 1 = RepaymentStartDate, các kỳ sau = +1 tháng, kẹp ngày tháng)
    let dueTotalMonths = startMonth + (i - 1);
    let dueYear = startYear + Math.floor(dueTotalMonths / 12);
    let dueMonthIdx = dueTotalMonths % 12;
    const daysInDueMonth = new Date(dueYear, dueMonthIdx + 1, 0).getDate();
    const dueDay = Math.min(startDay, daysInDueMonth);
    const dueDateStr = `${dueYear}-${String(dueMonthIdx + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

    // Tính số ngày thực tế trong kỳ từ prevDateStr đến dueDateStr
    const days = getDaysBetween(prevDateStr, dueDateStr);

    // XÁC ĐỊNH LÃI SUẤT HIỆU LỰC TẠI KỲ i:
    let activeAnnualRate = defaultAnnualRate;

    if (sortedHistory.length > 0) {
      let activeItem: RateAdjustmentHistoryItem | null = null;
      for (const item of sortedHistory) {
        if (item.effectiveDate <= dueDateStr) {
          activeItem = item;
        } else {
          break;
        }
      }
      if (activeItem && activeItem.ratePercent > 0) {
        activeAnnualRate = activeItem.ratePercent / 100;
      }
    } else if (prefInfo && prefInfo.prefRate > 0) {
      if (i <= prefInfo.prefMonths) {
        activeAnnualRate = prefInfo.prefRate > 1 ? prefInfo.prefRate / 100 : prefInfo.prefRate;
      } else {
        activeAnnualRate = prefInfo.postPrefRate > 1 ? prefInfo.postPrefRate / 100 : prefInfo.postPrefRate;
      }
    }

    let normalPrincipal = 0;
    if (isBulletPrincipal) {
      normalPrincipal = (i === periods) ? balance : 0;
    } else {
      if (i <= principalGraceMonths) {
        normalPrincipal = 0; // Ân hạn gốc: Kỳ i <= số tháng ân hạn -> Gốc = 0
      } else if (i === periods) {
        normalPrincipal = balance; // Kỳ cuối trả hết dư nợ còn lại
      } else {
        normalPrincipal = Math.min(balance, defaultMonthlyPrincipal);
      }
    }

    // Trả nợ trước hạn tại kỳ `prepaymentPeriod`
    let periodPrepay = 0;
    if (prepaymentAmount > 0 && i === prepaymentPeriod) {
      const remainingAfterNormal = Math.max(0, balance - normalPrincipal);
      periodPrepay = Math.min(remainingAfterNormal, prepaymentAmount);
    }

    const totalPrincipalInPeriod = Math.min(balance, normalPrincipal + periodPrepay);

    // Công thức Core Ngân hàng: Lãi = Dư nợ * (Lãi suất hiệu lực kỳ / 365) * Số ngày thực tế trong kỳ
    const interest = Math.round(balance * activeAnnualRate * (days / 365));

    let noteText: string | undefined = undefined;
    if (periodPrepay > 0) {
      noteText = `[TRẢ TRƯỚC HẠN: +${periodPrepay.toLocaleString('vi-VN')}đ]`;
    }

    schedules.push({
      ContractId: contractId,
      PeriodNumber: i,
      DueDate: dueDateStr,
      PrincipalAmount: totalPrincipalInPeriod,
      InterestAmount: interest,
      TotalAmount: totalPrincipalInPeriod + interest,
      IsPaid: false,
      Note: noteText,
    });

    const endingBal = Math.max(0, balance - totalPrincipalInPeriod);

    // Nếu chọn phương án giảm tiền gốc trả hàng tháng sau khi trả trước hạn
    if (periodPrepay > 0 && prepaymentMode === 'reduce_monthly' && !isBulletPrincipal) {
      const remainingPeriods = periods - i;
      if (remainingPeriods > 0 && endingBal > 0) {
        defaultMonthlyPrincipal = roundPrincipalCore(endingBal / remainingPeriods, '1k');
      }
    }

    balance = endingBal;
    prevDateStr = dueDateStr;
  }

  return schedules;
}
