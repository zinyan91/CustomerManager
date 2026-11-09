import type { Collateral, CreditContract, LoanContract, MortgageContract } from '../types';
import { appraisalStatus, type AppraisalStatus } from './collateralMath';
import { hdtdLifecycle, isKunnSettled } from './creditContract';
import { parseCollateralIds } from './creditLimit';

/**
 * - `securing`: đang bảo đảm cho KUNN chưa tất toán, HĐTD còn hiệu lực hoặc HĐTC chưa giải chấp.
 * - `released`: từng gắn khoản vay/hợp đồng, nay không còn nghĩa vụ nào (khách đã tất toán, lấy tài sản về).
 * - `unlinked`: chưa gắn khoản vay nào (tài sản mới nhập, đang chuẩn bị hồ sơ).
 */
export type CollateralUsage = 'securing' | 'released' | 'unlinked';

export interface CollateralUsageSources {
  loans: (Partial<Pick<LoanContract, 'CollateralId' | 'CollateralIds' | 'CreditContractId'>> & Pick<LoanContract, 'IsSettled'>)[];
  creditContracts: (Partial<Pick<CreditContract, 'Id'>> & Pick<CreditContract, 'CollateralIds' | 'IsClosed' | 'ContractStartDate' | 'ContractEndDate'>)[];
  mortgages: Pick<MortgageContract, 'CollateralIds' | 'IsReleased'>[];
  today: string;
}

export function buildCollateralUsage(sources: CollateralUsageSources): (collateralId: number) => CollateralUsage {
  const securing = new Set<number>();
  const linked = new Set<number>();
  const mark = (ids: number[], active: boolean) => {
    for (const id of ids) {
      linked.add(id);
      if (active) securing.add(id);
    }
  };

  const hdtdWithOpenKunn = new Set<number>();
  for (const loan of sources.loans) {
    const open = !isKunnSettled(loan);
    mark(parseCollateralIds(loan), open);
    if (open && loan.CreditContractId) hdtdWithOpenKunn.add(loan.CreditContractId);
  }
  for (const cc of sources.creditContracts) {
    const life = hdtdLifecycle(cc, sources.today);
    // HĐTD hết hiệu lực mà KUNN còn dư nợ thì vẫn còn, tài sản vẫn bảo đảm cho dư nợ đó
    const stillBinding = life !== 'closed' && (life !== 'expired' || (cc.Id !== undefined && hdtdWithOpenKunn.has(cc.Id)));
    mark(parseCollateralIds(cc), stillBinding);
  }
  for (const m of sources.mortgages) mark(m.CollateralIds, !m.IsReleased);

  return (id) => (securing.has(id) ? 'securing' : linked.has(id) ? 'released' : 'unlinked');
}

/** Trạng thái định giá hiển thị: tài sản đã tất toán không còn cảnh báo hết hạn định giá. */
export type DisplayAppraisalStatus = AppraisalStatus | 'released';

export function displayAppraisalStatus(
  c: Pick<Collateral, 'Id' | 'AppraisalDate' | 'AppraisalTenorMonths'>,
  usageOf: (collateralId: number) => CollateralUsage,
  todayStr?: string
): DisplayAppraisalStatus {
  return usageOf(c.Id) === 'released' ? 'released' : appraisalStatus(c, todayStr);
}
