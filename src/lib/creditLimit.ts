import type { LoanContract, Collateral } from '../types';
import { getMasterHdtdNumber, toIsoDate } from './utils';
import { usableCapacity, appraisalStatus, appraisalExpiryDate } from './collateralMath';
import { isRevolvingCredit } from './loanProductRules';

export interface SharedLimitGroup {
  code: string;
  amount: number;
  contractNumbers: string[];
}

export interface StandaloneLimitGroup {
  masterNo: string;
  amount: number;
  contractNumbers: string[];
}

export interface CreditLimitBreakdown {
  total: number;
  shared: SharedLimitGroup[];
  standalone: StandaloneLimitGroup[];
}

function limitOf(c: LoanContract): number {
  return c.ContractAmount || c.LoanAmount || 0;
}

function disbursedOf(c: LoanContract): number {
  return c.LoanAmount ?? c.CurrentBalance ?? 0;
}

export interface LimitGroupStatus {
  key: string;
  isShared: boolean;
  hdtdNumbers: string[];
  revolving: boolean;
  granted: number;
  outstanding: number;
  disbursedCumulative: number;
  used: number;
  headroom: number;
  available: number;
  endDate: string | null;
  expired: boolean;
  closed: boolean;
  blockReason: string;
  lockedOutstanding: number;
  redeployableOutstanding: number;
  activeKunnCount: number;
  settledKunnCount: number;
}

export interface LimitGroupOptions {
  getOutstanding?: (c: LoanContract) => number;
  excludeContractId?: number | null;
  grantedOverride?: number | null;
  today?: string | null;
  isClosed?: (c: LoanContract) => boolean;
}

export function computeLimitGroups(
  contracts: LoanContract[],
  options?: LimitGroupOptions
): LimitGroupStatus[] {
  const outstandingOf = options?.getOutstanding
    ?? ((c: LoanContract) => c.CurrentBalance ?? c.LoanAmount ?? 0);
  const excludeId = options?.excludeContractId ?? null;

  const map = new Map<string, LimitGroupStatus & {
    declaredGranted: number;
    members: { dueDate: string; outstanding: number }[];
  }>();

  for (const c of contracts) {
    const code = (c.CreditLimitCode || '').trim();
    const hdtdNo = getMasterHdtdNumber(c) || c.ContractNumber || '';
    const key = code || hdtdNo;

    let g = map.get(key);
    if (!g) {
      g = {
        key,
        isShared: code !== '',
        hdtdNumbers: [],
        revolving: false,
        granted: 0,
        outstanding: 0,
        disbursedCumulative: 0,
        used: 0,
        headroom: 0,
        available: 0,
        endDate: null,
        expired: false,
        closed: false,
        blockReason: '',
        lockedOutstanding: 0,
        redeployableOutstanding: 0,
        activeKunnCount: 0,
        settledKunnCount: 0,
        declaredGranted: 0,
        members: [],
      };
      map.set(key, g);
    }

    if (!g.hdtdNumbers.includes(hdtdNo)) g.hdtdNumbers.push(hdtdNo);
    if (isRevolvingCredit(c.LoanMethod)) g.revolving = true;
    if (options?.isClosed?.(c)) g.closed = true;

    if (code) {
      const declared = c.CreditLimitAmount ?? 0;
      if (declared > g.declaredGranted) g.declaredGranted = declared;
    }
    if (limitOf(c) > g.granted) g.granted = limitOf(c);

    const end = toIsoDate(c.ContractEndDate) || toIsoDate(c.HdtdDueDate);
    if (end && (!g.endDate || end > g.endDate)) g.endDate = end;

    if (excludeId !== null && c.Id === excludeId) continue;

    if (c.IsSettled) {
      g.settledKunnCount += 1;
    } else {
      const bal = Math.max(0, outstandingOf(c));
      g.activeKunnCount += 1;
      g.outstanding += bal;
      g.members.push({ dueDate: (c.KunnDueDate || '').trim(), outstanding: bal });
    }
    g.disbursedCumulative += Math.max(0, disbursedOf(c));
  }

  const result: LimitGroupStatus[] = [];
  for (const g of map.values()) {
    const { declaredGranted, members, ...rest } = g;
    const granted = options?.grantedOverride && options.grantedOverride > 0
      ? options.grantedOverride
      : (declaredGranted > 0 ? declaredGranted : rest.granted);
    const used = rest.revolving ? rest.outstanding : rest.disbursedCumulative;
    const headroom = Math.max(0, granted - used);

    const today = options?.today ?? null;
    const expired = !!(today && rest.endDate && rest.endDate < today);

    let blockReason = '';
    if (rest.closed) blockReason = 'HĐTD đã đóng';
    else if (expired) blockReason = `HĐTD hết hiệu lực ${rest.endDate}`;
    else if (headroom <= 0) {
      blockReason = rest.revolving
        ? 'Đã dùng hết hạn mức'
        : 'Vay từng lần đã giải ngân, không giải ngân thêm';
    }

    let lockedOutstanding = 0;
    let redeployableOutstanding = 0;
    for (const m of members) {
      if (rest.endDate && m.dueDate && m.dueDate > rest.endDate) lockedOutstanding += m.outstanding;
      else redeployableOutstanding += m.outstanding;
    }

    result.push({
      ...rest,
      granted,
      used,
      headroom,
      expired,
      blockReason,
      lockedOutstanding,
      redeployableOutstanding,
      available: (expired || rest.closed) ? 0 : headroom,
    });
  }
  return result;
}

export function findLimitGroupFor(
  groups: LimitGroupStatus[],
  hdtdNumber: string
): LimitGroupStatus | undefined {
  const target = hdtdNumber.trim().toLowerCase();
  if (!target) return undefined;
  return groups.find(g =>
    g.key.toLowerCase() === target ||
    g.hdtdNumbers.some(n => n.toLowerCase() === target)
  );
}

export function computeCreditLimit(contracts: LoanContract[]): CreditLimitBreakdown {
  const sharedMap = new Map<string, SharedLimitGroup>();
  const standaloneMap = new Map<string, StandaloneLimitGroup>();

  for (const c of contracts) {
    const code = (c.CreditLimitCode || '').trim();

    if (code) {
      const existing = sharedMap.get(code);

      const declared = c.CreditLimitAmount ?? 0;
      if (!existing) {
        sharedMap.set(code, {
          code,
          amount: declared > 0 ? declared : limitOf(c),
          contractNumbers: [c.ContractNumber],
        });
      } else {
        existing.contractNumbers.push(c.ContractNumber);
        const candidate = declared > 0 ? declared : limitOf(c);
        if (candidate > existing.amount) existing.amount = candidate;
      }
      continue;
    }

    const masterNo = getMasterHdtdNumber(c) || c.ContractNumber || '';
    const existing = standaloneMap.get(masterNo);
    if (!existing) {
      standaloneMap.set(masterNo, {
        masterNo,
        amount: limitOf(c),
        contractNumbers: [c.ContractNumber],
      });
    } else {
      existing.contractNumbers.push(c.ContractNumber);
      if (limitOf(c) > existing.amount) existing.amount = limitOf(c);
    }
  }

  const shared = Array.from(sharedMap.values());
  const standalone = Array.from(standaloneMap.values());
  const total =
    shared.reduce((s, g) => s + g.amount, 0) +
    standalone.reduce((s, g) => s + g.amount, 0);

  return { total, shared, standalone };
}

export interface CollateralCapacityCheck {
  collateralIds: number[];
  assetCodes: string[];
  capacity: number;
  granted: number;
  exceeded: boolean;
  excessAmount: number;
  contractNumbers: string[];
  expiredAppraisals: { collateralId: number; assetCode: string; expiryDate: string | null }[];
}

export function parseCollateralIds(c: LoanContract): number[] {
  const ids = new Set<number>();
  if (c.CollateralId) ids.add(c.CollateralId);
  if (c.CollateralIds) {
    for (const part of String(c.CollateralIds).split(',')) {
      const n = parseInt(part.trim(), 10);
      if (!isNaN(n)) ids.add(n);
    }
  }
  return Array.from(ids);
}

export function clusterExposure(
  contracts: LoanContract[],
  getOutstanding?: (c: LoanContract) => number
): number {
  const revolving = contracts.filter(c => isRevolvingCredit(c.LoanMethod));
  const term = contracts.filter(c => !isRevolvingCredit(c.LoanMethod));

  const revolvingExposure = revolving.length > 0 ? computeCreditLimit(revolving).total : 0;

  const outstandingOf = (c: LoanContract) =>
    getOutstanding ? getOutstanding(c) : (c.CurrentBalance ?? c.LoanAmount ?? c.ContractAmount ?? 0);

  const termExposure = term.reduce((sum, c) => sum + Math.max(0, outstandingOf(c)), 0);

  return revolvingExposure + termExposure;
}

export function checkCollateralCapacity(
  contracts: LoanContract[],
  collaterals: Collateral[],
  getOutstanding?: (c: LoanContract) => number,
  todayStr?: string
): CollateralCapacityCheck[] {
  const collateralById = new Map(collaterals.map(c => [c.Id, c]));

  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let root = parent.get(x)!;
    while (root !== parent.get(root)) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const linkedContracts: { key: string; contract: LoanContract; colIds: number[] }[] = [];

  contracts.forEach((c, i) => {
    const colIds = parseCollateralIds(c).filter(id => collateralById.has(id));
    if (colIds.length === 0) return;
    const key = `c${i}`;
    find(key);
    for (const id of colIds) union(key, `t${id}`);
    linkedContracts.push({ key, contract: c, colIds });
  });

  const clusters = new Map<string, { contracts: LoanContract[]; colIds: Set<number> }>();
  for (const { key, contract, colIds } of linkedContracts) {
    const root = find(key);
    if (!clusters.has(root)) clusters.set(root, { contracts: [], colIds: new Set() });
    const cluster = clusters.get(root)!;
    cluster.contracts.push(contract);
    for (const id of colIds) cluster.colIds.add(id);
  }

  const result: CollateralCapacityCheck[] = [];
  for (const cluster of clusters.values()) {
    const cols = Array.from(cluster.colIds).map(id => collateralById.get(id)!);
    const capacity = cols.reduce((sum, col) => sum + usableCapacity(col, todayStr), 0);
    const expiredAppraisals = cols
      .filter(col => appraisalStatus(col, todayStr) === 'expired' || appraisalStatus(col, todayStr) === 'missing')
      .map(col => ({
        collateralId: col.Id,
        assetCode: col.AssetCode || `#${col.Id}`,
        expiryDate: appraisalExpiryDate(col),
      }));
    const granted = clusterExposure(cluster.contracts, getOutstanding);
    const excessAmount = Math.max(0, granted - capacity);

    result.push({
      collateralIds: cols.map(c => c.Id),
      assetCodes: cols.map(c => c.AssetCode || `#${c.Id}`),
      capacity,
      granted,
      exceeded: excessAmount > 0,
      excessAmount,
      contractNumbers: cluster.contracts.map(c => c.ContractNumber),
      expiredAppraisals,
    });
  }

  return result;
}
