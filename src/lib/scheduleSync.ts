import type { RepaymentSchedule } from '../types';

export type NewScheduleRow = Omit<RepaymentSchedule, 'Id'>;

export type UpsertScheduleRow = NewScheduleRow & { Id?: number };

export interface ScheduleReconcileResult {
  toUpsert: UpsertScheduleRow[];
  toDeleteIds: number[];
  blockedPaidPeriods: number[];
  ambiguousPeriods: number[];
}

const so = (v: number | null | undefined): number =>
  v === null || v === undefined || Number.isNaN(v) ? 0 : v;

export function scheduleRowsForContract(
  rawGen: Partial<RepaymentSchedule>[],
  contractId: number
): NewScheduleRow[] {
  return rawGen.map((s, idx) => ({
    ContractId: contractId,
    PeriodNumber: s.PeriodNumber ?? idx + 1,
    DueDate: s.DueDate || '',
    PrincipalAmount: so(s.PrincipalAmount),
    InterestAmount: so(s.InterestAmount),
    TotalAmount: so(s.TotalAmount),
    IsPaid: !!s.IsPaid,
    PaymentDate: s.PaymentDate ?? null,
    ActualPaidAmount: so(s.ActualPaidAmount),
    OverdueDays: so(s.OverdueDays),
    OverdueInterestAmount: so(s.OverdueInterestAmount),
    ActualPaidPrincipal: so(s.ActualPaidPrincipal),
    ActualPaidInterest: so(s.ActualPaidInterest),
    PrepaidPrincipalAmount: so(s.PrepaidPrincipalAmount),
    Note: s.Note ?? null,
  }));
}

export function hasPaymentRecord(row: RepaymentSchedule): boolean {
  return !!row.IsPaid
    || !!row.PaymentDate
    || so(row.ActualPaidAmount) > 0
    || so(row.ActualPaidPrincipal) > 0
    || so(row.ActualPaidInterest) > 0
    || so(row.PrepaidPrincipalAmount) > 0;
}

function groupByPeriod(rows: RepaymentSchedule[]): Map<number, RepaymentSchedule[]> {
  const map = new Map<number, RepaymentSchedule[]>();
  rows.forEach(r => {
    const at = map.get(r.PeriodNumber);
    if (at) at.push(r);
    else map.set(r.PeriodNumber, [r]);
  });
  return map;
}

export function reconcileScheduleRows(
  existing: RepaymentSchedule[],
  generated: NewScheduleRow[]
): ScheduleReconcileResult {
  const theoKy = groupByPeriod(existing);
  const kySinhRa = new Set(generated.map(g => g.PeriodNumber));

  const toUpsert: UpsertScheduleRow[] = [];
  const toDeleteIds: number[] = [];
  const blockedPaidPeriods: number[] = [];
  const ambiguousPeriods: number[] = [];

  for (const moi of generated) {
    const cu = theoKy.get(moi.PeriodNumber) || [];

    if (cu.length === 0) {
      toUpsert.push(moi);
      continue;
    }

    let giu: RepaymentSchedule;
    if (cu.length === 1) {
      giu = cu[0];
    } else {
      const coDauThu = cu.filter(hasPaymentRecord);
      if (coDauThu.length !== 1) {
        ambiguousPeriods.push(moi.PeriodNumber);
        continue;
      }
      giu = coDauThu[0];
      cu.filter(r => r.Id !== giu.Id).forEach(r => toDeleteIds.push(r.Id));
    }

    toUpsert.push({
      ...giu,
      DueDate: moi.DueDate,
      PrincipalAmount: moi.PrincipalAmount,
      InterestAmount: moi.InterestAmount,
      TotalAmount: moi.TotalAmount,
    });
  }

  for (const [ky, rows] of theoKy) {
    if (kySinhRa.has(ky)) continue;
    if (rows.some(hasPaymentRecord)) blockedPaidPeriods.push(ky);
    else rows.forEach(r => toDeleteIds.push(r.Id));
  }

  blockedPaidPeriods.sort((a, b) => a - b);
  ambiguousPeriods.sort((a, b) => a - b);

  return { toUpsert, toDeleteIds, blockedPaidPeriods, ambiguousPeriods };
}
