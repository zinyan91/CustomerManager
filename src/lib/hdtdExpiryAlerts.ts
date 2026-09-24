import type { CreditContract, LoanContract } from '../types';
import { hdtdLifecycle } from './creditContract';
import { daysUntil, getMasterHdtdNumber, toIsoDate } from './utils';

export const HDTD_EXPIRY_ALERT_DAYS = 45;

export interface HdtdExpiryItem {
  key: string;
  hdtdId: number | null;
  masterNo: string;
  contract: LoanContract;
  endDateStr: string;
  daysLeft: number | null;
}

type HdtdDates = Pick<CreditContract, 'Id' | 'CustomerId' | 'ContractStartDate' | 'ContractEndDate'>;

function isNewerThan(candidate: HdtdDates, old: HdtdDates): boolean {
  const start = toIsoDate(candidate.ContractStartDate);
  const oldStart = toIsoDate(old.ContractStartDate);
  if (start && oldStart) return start > oldStart;
  const end = toIsoDate(candidate.ContractEndDate);
  const oldEnd = toIsoDate(old.ContractEndDate);
  return !!end && !!oldEnd && end > oldEnd;
}

export function findRenewingHdtd(
  old: HdtdDates,
  creditContracts: CreditContract[],
  today: string
): CreditContract | undefined {
  return creditContracts.find(c => {
    if (c.Id === old.Id || c.CustomerId !== old.CustomerId) return false;
    const state = hdtdLifecycle(c, today);
    return (state === 'active' || state === 'expiring_soon') && isNewerThan(c, old);
  });
}

function isRevolvingKunn(c: LoanContract): boolean {
  return c.LoanMethod === 'Hạn mức tín dụng' || !!c.LoanMethod?.includes('Hạn mức');
}

export function buildHdtdExpiryList(
  activeKunns: LoanContract[],
  creditContracts: CreditContract[],
  today: string,
  windowDays: number = HDTD_EXPIRY_ALERT_DAYS
): HdtdExpiryItem[] {
  const byId = new Map(creditContracts.map(cc => [cc.Id, cc]));
  const byCustomerNumber = new Map(creditContracts.map(cc => [`${cc.CustomerId}|${cc.HdtdNumber}`, cc]));
  const rows = new Map<string, HdtdExpiryItem>();

  for (const c of activeKunns) {
    if (!isRevolvingKunn(c)) continue;

    const prefix = getMasterHdtdNumber(c);
    const parent = (c.CreditContractId ? byId.get(c.CreditContractId) : undefined)
      || byCustomerNumber.get(`${c.CustomerId}|${prefix}`);
    const dates: HdtdDates = parent ?? {
      Id: -1, CustomerId: c.CustomerId,
      ContractStartDate: c.ContractStartDate, ContractEndDate: c.ContractEndDate,
    };
    if (findRenewingHdtd(dates, creditContracts, today)) continue;

    const endDateStr = toIsoDate(dates.ContractEndDate) || '';
    const key = parent ? `hdtd:${parent.Id}` : `kh:${c.CustomerId}|${prefix}`;
    const current = rows.get(key);
    if (!current || (c.ContractAmount ?? 0) > (current.contract.ContractAmount ?? 0)) {
      rows.set(key, {
        key,
        hdtdId: parent?.Id ?? null,
        masterNo: parent?.HdtdNumber || prefix,
        contract: c,
        endDateStr,
        daysLeft: daysUntil(endDateStr, today),
      });
    }
  }

  return [...rows.values()]
    .filter(r => r.daysLeft !== null && r.daysLeft <= windowDays)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
}
