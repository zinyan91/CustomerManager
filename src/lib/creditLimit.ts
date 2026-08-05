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
  /** Hạn mức còn trống theo dư nợ, CHƯA xét hiệu lực HĐTD. */
  headroom: number;
  /**
   * Số tiền thực sự còn giải ngân được: bằng 0 nếu HĐTD đã hết hiệu lực HOẶC đã
   * bị đóng.
   */
  available: number;
  endDate: string | null;
  expired: boolean;
  /**
   * HĐTD của nhóm đã bị đóng. Đóng hợp đồng là dừng quyền giải ngân, khác với
   * hết hiệu lực theo ngày — hợp đồng còn hạn vẫn đóng được, và ngược lại.
   */
  closed: boolean;
  /** Lý do không giải ngân được, rỗng khi còn giải ngân được. */
  blockReason: string;
  /**
   * Dư nợ của các KUNN đáo hạn SAU ngày hết hiệu lực HĐTD. Phần này mất khả
   * năng quay vòng: khi nó được trả thì hạn mức đã hết hiệu lực, không rút lại
   * được nữa, nên khách buộc phải tất toán — không tất toán được là nguy cơ
   * chuyển nhóm nợ.
   */
  lockedOutstanding: number;
  /**
   * Dư nợ của các KUNN đáo hạn TRƯỚC ngày hết hiệu lực HĐTD. Trả xong vẫn còn
   * thời gian để giải ngân lại.
   */
  redeployableOutstanding: number;
  activeKunnCount: number;
  settledKunnCount: number;
}

export interface LimitGroupOptions {
  getOutstanding?: (c: LoanContract) => number;
  excludeContractId?: number | null;
  grantedOverride?: number | null;
  /** Ngày tham chiếu (YYYY-MM-DD) để xét hiệu lực HĐTD. Bỏ trống thì không xét. */
  today?: string | null;
  /**
   * KUNN thuộc một HĐTD đã bị đóng hay chưa.
   *
   * Cờ `IsClosed` nằm ở bảng `CreditContracts`, hàm này chỉ nhận `LoanContract[]`
   * nên không tự đọc được. Bỏ trống thì không xét đóng hợp đồng — và khi đó hạn
   * mức khả dụng sẽ ra số dương trên cả HĐTD đã đóng.
   */
  isClosed?: (c: LoanContract) => boolean;
}

/**
 * NGUỒN DUY NHẤT tính hạn mức khả dụng.
 *
 * Nhóm theo mã hạn mức dùng chung nếu có, ngược lại theo số HĐTD — cùng cách
 * nhóm với computeCreditLimit để tổng mức cấp của hai hàm luôn khớp nhau.
 *
 * Hạn mức khả dụng phụ thuộc sản phẩm:
 *  - HMTD (tuần hoàn): mức cấp − dư nợ các KUNN còn hiệu lực. Trả nợ hoặc tất
 *    toán KUNN là giải phóng hạn mức, giải ngân tiếp được.
 *  - Cho vay từng lần (không tuần hoàn): mức cấp − tổng số tiền đã nhận nợ,
 *    tính cả KUNN đã tất toán. Đã giải ngân là hết, trả nợ không mở lại hạn mức.
 *
 * Hạn mức chỉ khả dụng khi HĐTD còn hiệu lực VÀ chưa bị đóng. Hết hiệu lực hoặc
 * đã đóng thì available = 0 dù dư nợ đã về 0 (headroom vẫn giữ số trống theo dư nợ
 * để đối chiếu).
 *
 * Cờ đóng hợp đồng phải truyền vào qua options.isClosed: cờ đó nằm ở bảng
 * CreditContracts mà hàm này chỉ nhận LoanContract[]. Bỏ trống thì màn hình sẽ
 * chào hạn mức khả dụng trên cả HĐTD đã đóng — đúng lỗi đã gặp ở hồ sơ NGUYỄN
 * MINH HÙNG ngày 05/08/2026: HĐTD đóng, còn 400 triệu chưa trả, tab Khoản Vay vẫn
 * ghi HMTD còn lại 600 triệu.
 */
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
    // Một KUNN thuộc HĐTD đã đóng là đủ để cả nhóm hết quyền giải ngân: nhóm dùng
    // chung hạn mức thì hạn mức chỉ có một, không rút qua hợp đồng khác được.
    if (options?.isClosed?.(c)) g.closed = true;

    // Mức cấp là thông tin cấp HĐTD nên vẫn ghi nhận cả dòng đang bị loại trừ.
    if (code) {
      const declared = c.CreditLimitAmount ?? 0;
      if (declared > g.declaredGranted) g.declaredGranted = declared;
    }
    if (limitOf(c) > g.granted) g.granted = limitOf(c);

    // Ngày hết hiệu lực cũng là thông tin cấp HĐTD: lấy mốc muộn nhất trong nhóm.
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

    // Hạn mức hết hiệu lực thì không giải ngân được nữa, dù dư nợ đã về 0.
    const today = options?.today ?? null;
    const expired = !!(today && rest.endDate && rest.endDate < today);

    /* Cùng thứ tự ưu tiên lý do chặn với summarizeCreditContracts: đóng hợp đồng
       là quyết định tường minh của banker nên đứng trước hết hiệu lực theo ngày. */
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
