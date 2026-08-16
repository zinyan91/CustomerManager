import { Customer, LoanContract, CreditContract, Collateral } from '../types';

export interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

export function parseAnyDate(v?: string | null): ParsedDate | null {
  if (!v) return null;
  const str = String(v).trim().split('T')[0].split(' ')[0];
  if (!str || str === '—') return null;

  let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const n1 = parseInt(match[1], 10);
    const n2 = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (n1 > 12 && n2 <= 12) {
      return { year, month: n2, day: n1 };
    }
    if (n2 > 12 && n1 <= 12) {
      return { year, month: n1, day: n2 };
    }
    if (n1 <= 12 && n2 <= 12) {
      return { year, month: n2, day: n1 };
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    };
  }
  return null;
}

export function daysUntil(targetStr?: string | null, todayStr?: string): number | null {
  const target = parseAnyDate(targetStr);
  if (!target) return null;

  const base = todayStr ? parseAnyDate(todayStr) : null;
  const now = base
    ? Date.UTC(base.year, base.month - 1, base.day)
    : (() => {
        const d = new Date();
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      })();
  const to = Date.UTC(target.year, target.month - 1, target.day);
  return Math.round((to - now) / 86400000);
}

export interface MonthlyDueInfo {
  dueDateIso: string;
  dueDateStr: string;
  daysLeft: number;
}

export function monthlyDueInfo(
  dateStr?: string | null,
  todayStr?: string
): MonthlyDueInfo | null {
  const origin = parseAnyDate(dateStr);
  if (!origin) return null;

  const base = todayStr ? parseAnyDate(todayStr) : null;
  const now = base
    ? new Date(base.year, base.month - 1, base.day)
    : (() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      })();

  const clampedDueIn = (year: number, monthIdx: number): Date => {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    return new Date(year, monthIdx, Math.min(origin.day, daysInMonth));
  };

  // Kỳ trả nợ của tháng hiện tại (không tự ý nhảy sang tháng sau khi quá hạn)
  const due = clampedDueIn(now.getFullYear(), now.getMonth());

  const yyyy = due.getFullYear();
  const mm = String(due.getMonth() + 1).padStart(2, '0');
  const dd = String(due.getDate()).padStart(2, '0');
  const dueDateIso = `${yyyy}-${mm}-${dd}`;

  return {
    dueDateIso,
    dueDateStr: `${dd}/${mm}/${yyyy}`,
    daysLeft: daysUntil(dueDateIso, todayStr) ?? 0,
  };
}

export type AutoDebtGroup = 1 | 2 | 3 | 4 | 5;

export interface DebtGroupClassification {
  group: AutoDebtGroup;
  groupLabel: string;
  badgeBg: string;
  badgeColor: string;
  statusText: string;
  isUrgent: boolean;
  subType: 'before_5_days' | 'due_today' | 'overdue_1_9' | 'overdue_10_90' | 'overdue_bad';
}

/**
 * Phân loại nhóm nợ tự động theo chuẩn nghiệp vụ tín dụng:
 * 1. Trước 5 ngày tới hạn: daysLeft > 0 && daysLeft <= 5 (Nhóm 1)
 * 2. Ngày tới hạn: daysLeft === 0 (Nhóm 1)
 * 3. Sau ngày tới hạn < 10 ngày: daysLeft < 0 && daysLeft >= -9 (Quá hạn 1-9 ngày, VẪN là Nhóm 1)
 * 4. Từ ngày 10 trở đi: Chuyển sang Nhóm 2 (10-90 ngày) và loại khỏi Nhóm 1.
 * 5. Từ ngày 91 trở đi: Nhóm 3 (91-180 ngày), Nhóm 4 (181-360 ngày), Nhóm 5 (> 360 ngày).
 */
export function classifyDueDebtGroup(daysLeft: number): DebtGroupClassification {
  if (daysLeft > 5) {
    return {
      group: 1,
      groupLabel: 'Nhóm 1 - Chưa đến hạn',
      badgeBg: '#F1F5F9',
      badgeColor: '#64748B',
      statusText: `Còn ${daysLeft} ngày`,
      isUrgent: false,
      subType: 'before_5_days',
    };
  }
  if (daysLeft > 0) {
    return {
      group: 1,
      groupLabel: 'Nhóm 1 - Sắp đến hạn',
      badgeBg: '#EFF6FF',
      badgeColor: '#2563EB',
      statusText: `Trước hạn: Còn ${daysLeft}N`,
      isUrgent: true,
      subType: 'before_5_days',
    };
  }
  if (daysLeft === 0) {
    return {
      group: 1,
      groupLabel: 'Nhóm 1 - Đến hạn hôm nay',
      badgeBg: '#FEF3C7',
      badgeColor: '#D97706',
      statusText: 'Đến hạn hôm nay',
      isUrgent: true,
      subType: 'due_today',
    };
  }

  // Quá hạn (daysLeft < 0)
  const overdueDays = Math.abs(daysLeft);

  if (overdueDays < 10) {
    // 1 - 9 ngày: Vẫn là Nhóm 1
    return {
      group: 1,
      groupLabel: 'Nhóm 1 (Quá hạn < 10N)',
      badgeBg: '#FEE2E2',
      badgeColor: '#DC2626',
      statusText: `Quá hạn ${overdueDays}N (Nhóm 1)`,
      isUrgent: true,
      subType: 'overdue_1_9',
    };
  }
  if (overdueDays <= 90) {
    // 10 - 90 ngày: Nhóm 2
    return {
      group: 2,
      groupLabel: 'Nhóm 2 (Nợ cần chú ý 10-90N)',
      badgeBg: '#FFEDD5',
      badgeColor: '#C2410C',
      statusText: `Quá hạn ${overdueDays}N (Nhóm 2)`,
      isUrgent: true,
      subType: 'overdue_10_90',
    };
  }
  if (overdueDays <= 180) {
    // 91 - 180 ngày: Nhóm 3
    return {
      group: 3,
      groupLabel: 'Nhóm 3 (Nợ dưới tiêu chuẩn)',
      badgeBg: '#FCE7F3',
      badgeColor: '#BE185D',
      statusText: `Quá hạn ${overdueDays}N (Nhóm 3)`,
      isUrgent: true,
      subType: 'overdue_bad',
    };
  }
  if (overdueDays <= 360) {
    // 181 - 360 ngày: Nhóm 4
    return {
      group: 4,
      groupLabel: 'Nhóm 4 (Nợ nghi ngờ)',
      badgeBg: '#F3E8FF',
      badgeColor: '#7E22CE',
      statusText: `Quá hạn ${overdueDays}N (Nhóm 4)`,
      isUrgent: true,
      subType: 'overdue_bad',
    };
  }
  // > 360 ngày: Nhóm 5
  return {
    group: 5,
    groupLabel: 'Nhóm 5 (Mất vốn)',
    badgeBg: '#7F1D1D',
    badgeColor: '#FFFFFF',
    statusText: `Quá hạn ${overdueDays}N (Nhóm 5)`,
    isUrgent: true,
    subType: 'overdue_bad',
  };
}

export function computeDueDashboard(
  contracts: LoanContract[],
  collaterals: Collateral[],
  customerMap: Map<string | number, Customer>
) {
  const activeContracts = contracts.filter((c) => !c.IsSettled);

  // 1. Đến hạn trả nợ trong tháng (Định kỳ):
  // Chỉ lấy: Trước 5 ngày tới hạn (daysLeft <= 5 && daysLeft > 0) + Đến hạn hôm nay (daysLeft === 0) + Quá hạn (daysLeft < 0)
  // Bỏ hoàn toàn các khoản cách xa > 5 ngày trong tương lai.
  const allMonthlyDueList = activeContracts
    .map((c) => {
      const cus = customerMap.get(c.CustomerId) || customerMap.get(String(c.CustomerId));
      const dateField =
        c.RepaymentStartDate ||
        c.DisbursementDate ||
        c.ContractStartDate ||
        (c as any).FirstRepaymentDate ||
        (c as any).CreatedAt;
      const dueInfo = monthlyDueInfo(dateField);
      const classification = dueInfo ? classifyDueDebtGroup(dueInfo.daysLeft) : null;
      return { contract: c, customer: cus, dueInfo, classification };
    })
    .filter((item) => item.dueInfo && item.dueInfo.daysLeft <= 5)
    .sort((a, b) => (a.dueInfo?.daysLeft ?? 0) - (b.dueInfo?.daysLeft ?? 0));

  // Nhóm 1: Trước 5 ngày, hôm nay, và quá hạn < 10 ngày (1 - 9 ngày)
  const dueMonthGroup1List = allMonthlyDueList.filter(
    (item) => item.classification?.group === 1
  );

  // Nhóm 2: Quá hạn từ 10 - 90 ngày (bỏ ra khỏi Nhóm 1)
  const dueMonthGroup2List = allMonthlyDueList.filter(
    (item) => item.classification?.group === 2
  );

  // Nhóm 3-5: Quá hạn > 90 ngày
  const dueMonthBadDebtList = allMonthlyDueList.filter(
    (item) => item.classification && item.classification.group >= 3
  );

  // 2. KUNN đáo hạn - daysLeft <= 10 (hoặc quá hạn)
  const dueKunnList = activeContracts
    .map((c) => {
      const cus = customerMap.get(c.CustomerId) || customerMap.get(String(c.CustomerId));
      const daysLeft = daysUntil(c.KunnDueDate || c.ContractEndDate);
      return { contract: c, customer: cus, daysLeft };
    })
    .filter((item) => item.daysLeft !== null && item.daysLeft <= 10)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  // 3. HMTD đến hạn tái cấp - daysLeft <= 45
  const dueHmtdList = activeContracts
    .filter((c) => c.LoanMethod === 'Hạn mức tín dụng' || c.LoanMethod?.includes('Hạn mức'))
    .map((c) => {
      const cus = customerMap.get(c.CustomerId) || customerMap.get(String(c.CustomerId));
      const endDateStr = c.ContractEndDate || c.HdtdDueDate || '';
      const daysLeft = daysUntil(endDateStr);
      return { contract: c, customer: cus, endDateStr, daysLeft };
    })
    .filter((item) => item.daysLeft !== null && item.daysLeft <= 45)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  // 4. TSBD đến hạn định giá lại - daysLeft <= 30
  const dueCollateralList = collaterals
    .map((col) => {
      const cus = customerMap.get(col.CustomerId) || customerMap.get(String(col.CustomerId));
      const expiryStr = col.AppraisalExpiryDate || col.AppraisalDate || '';
      const daysLeft = daysUntil(expiryStr);
      return { collateral: col, customer: cus, expiryStr, daysLeft };
    })
    .filter((item) => item.daysLeft !== null && item.daysLeft <= 30)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  return {
    dueInMonthList: allMonthlyDueList,
    dueMonthGroup1List,
    dueMonthGroup2List,
    dueMonthBadDebtList,
    dueKunnList,
    dueHmtdList,
    dueCollateralList,
    totalDueAlerts: dueMonthGroup1List.length + dueMonthGroup2List.length + dueKunnList.length,
  };
}
