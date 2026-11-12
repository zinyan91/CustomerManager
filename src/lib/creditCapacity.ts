import type { Collateral } from '../types';
import type { CreditContractSummary } from './creditContract';
import { totalUsableCapacity } from './collateralMath';
import type { CollateralUsage } from './collateralUsage';

export interface CustomerCreditCapacity {
  capacity: number;
  used: number;
  remaining: number;
}

type SummaryForCapacity = Pick<CreditContractSummary,
  'contract' | 'revolving' | 'outstanding' | 'headroom' | 'expired' | 'renewedBy'>;

/**
 * Phần khả năng bảo đảm một HĐTD đang chiếm. Hạn mức quay vòng còn hiệu lực giữ trọn mức cấp vì rút lại được;
 * vay từng lần chỉ giữ dư nợ cộng phần chưa giải ngân, trả gốc tới đâu tài sản trống ra tới đó.
 */
export function hdtdCapacityUse(s: SummaryForCapacity): number {
  if (s.contract.IsClosed) return 0;
  const stillDrawable = !s.expired && !s.renewedBy;
  if (s.revolving) return stillDrawable ? Math.max(0, s.contract.ContractAmount || 0) : s.outstanding;
  return s.outstanding + (stillDrawable ? s.headroom : 0);
}

export function customerCreditCapacity(
  summaries: SummaryForCapacity[],
  collaterals: Collateral[],
  usageOf: (collateralId: number) => CollateralUsage,
  today: string,
): CustomerCreditCapacity {
  const capacity = totalUsableCapacity(collaterals.filter(c => usageOf(c.Id) !== 'released'), today);
  const used = summaries.reduce((sum, s) => sum + hdtdCapacityUse(s), 0);
  return { capacity, used, remaining: Math.max(0, capacity - used) };
}
