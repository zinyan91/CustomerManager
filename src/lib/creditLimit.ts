import type { LoanContract, Collateral } from '../types';
import { getMasterHdtdNumber } from './utils';
import { maxLoanFromCollateral } from './collateralMath';

/**
 * Tính tổng mức cấp tín dụng của một khách hàng.
 *
 * Nghiệp vụ có ba tầng: Phê duyệt HMTD -> HĐTD -> KUNN. Ba trường hợp:
 *
 *   TH1  Một số HĐTD, nhiều KUNN
 *        Các KUNN cùng tiền tố số hợp đồng. Mức cấp chỉ tính MỘT lần,
 *        lấy giá trị lớn nhất trong nhóm.
 *
 *   TH2  Khác số HĐTD, CÙNG một HMTD
 *        Các HĐTD mang cùng CreditLimitCode. Hạn mức chung chỉ tính MỘT
 *        lần, mức cấp riêng của từng hợp đồng KHÔNG được cộng thêm.
 *
 *   TH3  Khác số HĐTD, khác HMTD
 *        Mỗi hợp đồng một hạn mức riêng, cộng lại.
 *
 * Bỏ trống CreditLimitCode thì hợp đồng được xử lý như TH1/TH3 — giữ
 * nguyên hành vi trước khi có tầng hạn mức.
 */

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
      // TH2 — hạn mức dùng chung, chỉ tính một lần cho cả mã
      const existing = sharedMap.get(code);
      // Hạn mức được duyệt là nguồn chuẩn; nếu chưa khai thì tạm lấy mức
      // cấp lớn nhất trong nhóm để không tính thiếu.
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

    // TH1 / TH3 — gom theo số HĐTD gốc, mức cấp lấy một lần
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

/* ------------------------------------------------------------------ */
/* Chốt kiểm soát: tổng mức cấp so với khả năng bảo đảm của tài sản     */
/* ------------------------------------------------------------------ */

export interface CollateralCapacityCheck {
  /** Các tài sản cùng bảo đảm cho nhóm hợp đồng này */
  collateralIds: number[];
  assetCodes: string[];
  capacity: number;      // TỔNG hạn mức cho vay tối đa của cả nhóm tài sản
  granted: number;       // Tổng mức cấp của nhóm hợp đồng, đã gom theo HĐTD và HMTD
  exceeded: boolean;
  excessAmount: number;
  contractNumbers: string[];
}

/** Tách chuỗi "1,5,12" thành [1,5,12]. */
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

/**
 * Đối chiếu tổng mức cấp với tổng khả năng bảo đảm, theo CỤM LIÊN THÔNG
 * giữa hợp đồng và tài sản.
 *
 * Vì sao phải xét theo cụm thay vì từng tài sản:
 *   - Một hợp đồng thường được bảo đảm bằng NHIỀU tài sản cộng lại. So
 *     mức cấp với từng tài sản riêng lẻ sẽ báo động giả hàng loạt.
 *   - Một tài sản có thể bảo đảm cho nhiều hợp đồng. Nếu xét riêng từng
 *     tài sản thì sức bảo đảm của nó bị tính lặp.
 *
 * Cụm liên thông = tập hợp đồng và tài sản nối với nhau qua quan hệ thế
 * chấp. Trong mỗi cụm, so TỔNG mức cấp với TỔNG hạn mức tối đa.
 *
 * Mức cấp trong cụm được tính bằng computeCreditLimit nên các KUNN cùng
 * một HĐTD (TH1) và các HĐTD cùng mã HMTD (TH2) đều chỉ tính MỘT lần.
 */
export function checkCollateralCapacity(
  contracts: LoanContract[],
  collaterals: Collateral[]
): CollateralCapacityCheck[] {
  const collateralById = new Map(collaterals.map(c => [c.Id, c]));

  // Gộp cụm bằng union-find. Hợp đồng đánh khoá 'c<index>', tài sản 't<id>'.
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
    if (colIds.length === 0) return; // Không có TSĐB thì không thuộc phạm vi chốt này
    const key = `c${i}`;
    find(key);
    for (const id of colIds) union(key, `t${id}`);
    linkedContracts.push({ key, contract: c, colIds });
  });

  // Gom theo gốc cụm
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
