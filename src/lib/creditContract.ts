import type { CreditContract, LoanContract } from '../types';
import { isRevolvingCredit } from './loanProductRules';
import { kunnPrincipal } from './loanMath';
import { getMasterHdtdNumber } from './utils';

export const GNN_SEPARATOR = '/GNN-';

export function nextKunnNumber(hdtdNumber: string, existingKunnNumbers: string[]): string {
  const hdtd = (hdtdNumber || '').trim();
  if (!hdtd) return '';

  const prefix = (hdtd + GNN_SEPARATOR).toLowerCase();
  let maxIndex = 0;

  for (const raw of existingKunnNumbers) {
    const no = (raw || '').trim();
    if (!no) continue;

    const lower = no.toLowerCase();
    if (lower.startsWith(prefix)) {
      const tail = no.slice(hdtd.length + GNN_SEPARATOR.length);
      const n = parseInt(tail, 10);
      if (!isNaN(n) && n > maxIndex) maxIndex = n;
      continue;
    }

    if (lower === hdtd.toLowerCase() && maxIndex < 1) maxIndex = 1;
  }

  return `${hdtd}${GNN_SEPARATOR}${String(maxIndex + 1).padStart(2, '0')}`;
}

export function normalizeKunnNumber(kunnNumber?: string | null): string {
  return (kunnNumber || '').trim().toLowerCase();
}

export function findKunnNumberClash(
  candidate: string,
  existing: Array<Pick<LoanContract, 'Id' | 'ContractNumber'>>,
  selfId?: number | null
): number | null {
  const want = normalizeKunnNumber(candidate);
  if (!want) return null;

  for (const row of existing) {
    if (selfId !== null && selfId !== undefined && row.Id === selfId) continue;
    if (normalizeKunnNumber(row.ContractNumber) === want) return row.Id;
  }
  return null;
}

export function kunnSequenceOf(kunnNumber?: string | null): number {
  if (!kunnNumber) return 0;
  const idx = kunnNumber.lastIndexOf(GNN_SEPARATOR);
  if (idx < 0) return 0;
  const n = parseInt(kunnNumber.slice(idx + GNN_SEPARATOR.length), 10);
  return isNaN(n) ? 0 : n;
}

export type KunnIssueLevel = 'block' | 'warn';

export interface KunnIssue {
  level: KunnIssueLevel;
  field: 'KunnDueDate' | 'DisbursementDate' | 'LoanAmount' | 'KunnTenor';
  message: string;
}

function toIso(d?: string | null): string {
  return (d || '').trim();
}

function fmt(d: string): string {
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}

export type HdtdLifecycle =
  | 'closed'
  | 'expired'
  | 'not_yet_effective'
  | 'expiring_soon'
  | 'active';

export const HDTD_LIFECYCLE_LABEL: Record<HdtdLifecycle, string> = {
  closed: 'ĐÃ ĐÓNG',
  expired: 'HẾT HIỆU LỰC',
  not_yet_effective: 'CHƯA HIỆU LỰC',
  expiring_soon: 'SẮP HẾT HẠN',
  active: 'ĐANG HIỆU LỰC',
};

export const HDTD_EXPIRING_SOON_DAYS = 30;

export function hdtdLifecycle(
  contract: Pick<CreditContract, 'ContractStartDate' | 'ContractEndDate' | 'IsClosed'>,
  today: string,
  expiringSoonDays: number = HDTD_EXPIRING_SOON_DAYS
): HdtdLifecycle {
  if (contract.IsClosed) return 'closed';

  const now = toIso(today);
  const start = toIso(contract.ContractStartDate);
  const end = toIso(contract.ContractEndDate);

  if (now && end && end < now) return 'expired';
  if (now && start && start > now) return 'not_yet_effective';

  if (now && end) {
    const days = (new Date(end).getTime() - new Date(now).getTime()) / 86400000;
    if (days <= expiringSoonDays) return 'expiring_soon';
  }

  return 'active';
}

export function computeRemainingTenorMonths(
  disbursementDate?: string | null,
  maturityDate?: string | null
): number {
  const disb = toIso(disbursementDate);
  const end = toIso(maturityDate);
  if (!disb || !end || disb >= end) return 0;

  const d1 = new Date(disb + 'T00:00:00Z');
  const d2 = new Date(end + 'T00:00:00Z');
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

  const yDiff = d2.getUTCFullYear() - d1.getUTCFullYear();
  const mDiff = d2.getUTCMonth() - d1.getUTCMonth();
  let totalMonths = yDiff * 12 + mDiff;

  if (d2.getUTCDate() > d1.getUTCDate()) {
    totalMonths += 1;
  }

  return Math.max(1, totalMonths);
}

export function checkKunnAgainstContract(
  kunn: Pick<LoanContract, 'DisbursementDate' | 'KunnDueDate' | 'LoanAmount'>,
  contract?: Pick<CreditContract, 'HdtdNumber' | 'ContractStartDate' | 'ContractEndDate' | 'IsClosed'> | null
): KunnIssue[] {
  if (!contract) return [];

  const issues: KunnIssue[] = [];
  const start = toIso(contract.ContractStartDate);
  const end = toIso(contract.ContractEndDate);
  const disb = toIso(kunn.DisbursementDate);

  if (start && disb && disb < start) {
    issues.push({
      level: 'warn',
      field: 'DisbursementDate',
      message: `Giải ngân ${fmt(disb)} TRƯỚC ngày HĐTD có hiệu lực ${fmt(start)}`,
    });
  }

  if (end && disb && disb > end) {
    issues.push({
      level: 'warn',
      field: 'DisbursementDate',
      message: `Giải ngân ${fmt(disb)} SAU ngày hết hiệu lực HĐTD ${fmt(end)}`,
    });
  }

  if (contract.IsClosed) {
    issues.push({
      level: 'warn',
      field: 'DisbursementDate',
      message: `HĐTD ${contract.HdtdNumber} đã đóng`,
    });
  }

  return issues;
}

export type KunnRevolvingState = 'redeployable' | 'locked' | 'unknown';

export interface KunnRevolvingStatus {
  state: KunnRevolvingState;
  daysOfHeadroom: number;
  message: string;
}

export function kunnRevolvingStatus(
  kunn: Pick<LoanContract, 'KunnDueDate'>,
  contract?: Pick<CreditContract, 'ContractEndDate'> | null
): KunnRevolvingStatus {
  const end = toIso(contract?.ContractEndDate);
  const due = toIso(kunn.KunnDueDate);

  if (!end || !due) {
    return { state: 'unknown', daysOfHeadroom: 0, message: '' };
  }

  const days = Math.round(
    (Date.parse(end + 'T00:00:00Z') - Date.parse(due + 'T00:00:00Z')) / 86400000
  );

  if (days >= 0) {
    return {
      state: 'redeployable',
      daysOfHeadroom: days,
      message: `KUNN đáo hạn ${fmt(due)}, HĐTD còn hiệu lực tới ${fmt(end)} — sau khi tất toán còn ${days} ngày để giải ngân lại`,
    };
  }

  return {
    state: 'locked',
    daysOfHeadroom: days,
    message: `KUNN đáo hạn ${fmt(due)}, SAU ngày hết hiệu lực HĐTD ${fmt(end)} — không giải ngân lại được. Khoản này phải tất toán, không tất toán đúng hạn là nguy cơ chuyển nhóm nợ`,
  };
}

export function isKunnSettled(kunn: Pick<LoanContract, 'IsSettled'>): boolean {
  return kunn.IsSettled === true;
}

export function isKunnOfClosedHdtd(
  kunn: Pick<LoanContract, 'CreditContractId'>,
  creditContracts: Pick<CreditContract, 'Id' | 'IsClosed'>[]
): boolean {
  if (kunn.CreditContractId === null || kunn.CreditContractId === undefined) return false;
  return creditContracts.some(cc => cc.Id === kunn.CreditContractId && cc.IsClosed === true);
}

export function hdtdEffectiveDatesOf(
  kunn: Pick<LoanContract, 'CreditContractId'>,
  creditContracts: Pick<CreditContract, 'Id' | 'ContractStartDate' | 'ContractEndDate'>[]
): { startDate: string | null; endDate: string | null } | null {
  if (kunn.CreditContractId === null || kunn.CreditContractId === undefined) return null;
  const cc = creditContracts.find(x => x.Id === kunn.CreditContractId);
  if (!cc) return null;
  return {
    startDate: toIso(cc.ContractStartDate) || null,
    endDate: toIso(cc.ContractEndDate) || null,
  };
}

export interface CloseCreditContractCheck {
  allowed: boolean;
  unsettledKunnNumbers: string[];
}

export function canCloseCreditContract(
  contract: Pick<CreditContract, 'Id'>,
  kunns: Pick<LoanContract, 'CreditContractId' | 'ContractNumber' | 'IsSettled'>[]
): CloseCreditContractCheck {
  const unsettledKunnNumbers = kunns
    .filter(k => k.CreditContractId === contract.Id && !isKunnSettled(k))
    .map(k => (k.ContractNumber || '').trim())
    .filter(Boolean);

  return { allowed: unsettledKunnNumbers.length === 0, unsettledKunnNumbers };
}

export interface CreditContractSummary {
  contract: CreditContract;
  kunnCount: number;
  activeKunnCount: number;
  settledKunnCount: number;
  outstanding: number;
  disbursedCumulative: number;
  revolving: boolean;
  headroom: number;
  available: number;
  canDisburse: boolean;
  blockReason: string;
  expired: boolean;
  notYetEffective: boolean;
  isEmpty: boolean;
}

export function totalsOfCreditContracts(
  summaries: CreditContractSummary[],
  hdtdNumber?: string | null
): { granted: number; outstanding: number; available: number } {
  const wanted = (hdtdNumber || '').trim().toLowerCase();
  const scoped = wanted
    ? summaries.filter(s => (s.contract.HdtdNumber || '').trim().toLowerCase() === wanted)
    : summaries;

  const granted = scoped.reduce((sum, s) => sum + (s.contract.ContractAmount || 0), 0);
  const outstanding = scoped.reduce((sum, s) => sum + s.outstanding, 0);
  const available = scoped.reduce((sum, s) => sum + s.available, 0);
  return { granted, outstanding, available };
}

export function summarizeCreditContracts(
  contracts: CreditContract[],
  kunns: LoanContract[],
  options?: { getOutstanding?: (c: LoanContract) => number; today?: string | null }
): CreditContractSummary[] {
  const outstandingOf = options?.getOutstanding
    ?? ((c: LoanContract) => c.CurrentBalance ?? c.LoanAmount ?? 0);
  const today = options?.today ?? null;

  return contracts.map(cc => {
    const own = kunns.filter(k => k.CreditContractId === cc.Id);
    const active = own.filter(k => !isKunnSettled(k));
    const end = toIso(cc.ContractEndDate);

    const outstanding = active.reduce((s, k) => s + Math.max(0, outstandingOf(k)), 0);
    const disbursedCumulative = own.reduce((s, k) => s + kunnPrincipal(k), 0);

    const granted = cc.ContractAmount || 0;
    const revolving = isRevolvingCredit(cc.LoanMethod);
    const headroom = Math.max(0, granted - (revolving ? outstanding : disbursedCumulative));
    const start = toIso(cc.ContractStartDate);
    const expired = !!(today && end && end < today);
    const notYetEffective = !!(today && start && start > today);
    const available = (expired || notYetEffective || cc.IsClosed) ? 0 : headroom;

    let blockReason = '';
    if (cc.IsClosed) blockReason = 'HĐTD đã đóng';
    else if (expired) blockReason = `HĐTD hết hiệu lực ${fmt(end)}`;
    else if (notYetEffective) blockReason = `HĐTD có hiệu lực từ ${fmt(start)}`;
    else if (headroom <= 0) {
      blockReason = revolving
        ? 'Đã dùng hết hạn mức'
        : 'Vay từng lần đã giải ngân, không giải ngân thêm';
    }

    return {
      contract: cc,
      kunnCount: own.length,
      activeKunnCount: active.length,
      settledKunnCount: own.length - active.length,
      outstanding,
      disbursedCumulative,
      revolving,
      headroom,
      available,
      canDisburse: available > 0,
      blockReason,
      expired,
      notYetEffective,
      isEmpty: active.length === 0,
    };
  });
}

export function resolveMasterHdtdNumber(
  kunn: LoanContract | null | undefined,
  creditContracts: CreditContract[]
): string {
  if (!kunn) return '';

  if (kunn.CreditContractId !== null && kunn.CreditContractId !== undefined) {
    const linked = creditContracts.find(cc => cc.Id === kunn.CreditContractId);
    const no = (linked?.HdtdNumber || '').trim();
    if (no) return no;
  }

  return getMasterHdtdNumber(kunn);
}
