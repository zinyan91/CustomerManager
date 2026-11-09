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
  loans: Pick<LoanContract, 'CollateralId' | 'CollateralIds' | 'IsSettled'>[];
  creditContracts: Pick<CreditContract, 'CollateralIds' | 'IsClosed' | 'ContractStartDate' | 'ContractEndDate'>[];
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

  for (const loan of sources.loans) mark(parseCollateralIds(loan), !isKunnSettled(loan));
  for (const cc of sources.creditContracts) {
    const life = hdtdLifecycle(cc, sources.today);
    mark(parseCollateralIds(cc), life !== 'closed' && life !== 'expired');
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
