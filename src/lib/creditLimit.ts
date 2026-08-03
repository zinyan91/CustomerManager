import type { LoanContract, Collateral } from '../types';
import { getMasterHdtdNumber } from './utils';
import { maxLoanFromCollateral } from './collateralMath';

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

export function checkCollateralCapacity(
  contracts: LoanContract[],
  collaterals: Collateral[]
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
    const capacity = cols.reduce((sum, col) => sum + maxLoanFromCollateral(col), 0);
    const granted = computeCreditLimit(cluster.contracts).total;
    const excessAmount = Math.max(0, granted - capacity);

    result.push({
      collateralIds: cols.map(c => c.Id),
      assetCodes: cols.map(c => c.AssetCode || `#${c.Id}`),
      capacity,
      granted,
      exceeded: excessAmount > 0,
      excessAmount,
      contractNumbers: cluster.contracts.map(c => c.ContractNumber),
    });
  }

  return result;
}
