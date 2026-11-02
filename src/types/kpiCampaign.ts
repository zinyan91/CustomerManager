import type {
  KpiForecastBonusTier,
  KpiForecastFeeRow,
  KpiForecastInputs,
  KpiForecastMetricId,
  KpiForecastRank,
  KpiForecastRow,
  RankPolicy,
} from './kpiForecast';

export type KpiRatingId = 'xuatSac' | 'tot' | 'hoanThanh' | 'canCoGang' | 'khongHoanThanh' | 'yeuKem';

export interface KpiRating {
  id: KpiRatingId;
  label: string;
  /** Phần điểm cộng thêm nhờ hệ số tối đa, theo tỷ lệ điểm kế hoạch; null là không giới hạn riêng. */
  extraCapRatio: number | null;
  /** Tỷ lệ hoàn thành KPIs tối đa được ghi nhận sau khi cộng điểm. */
  maxCompletion: number;
}

export interface KpiCampaign {
  id: string;
  name: string;
  documentNumber: string;
  effectiveFrom: string;
  effectiveTo: string;
  ranks: readonly KpiForecastRank[];
  rankLabels: Record<KpiForecastRank, string>;
  policy: Partial<Record<KpiForecastRank, RankPolicy>>;
  /** Hệ số nhân vào điểm thực hiện; chỉ tiêu vắng mặt giữ hệ số 1. */
  coefficients: Partial<Record<KpiForecastMetricId, number>>;
  ratings: readonly KpiRating[];
}

export interface KpiCampaignInputs extends KpiForecastInputs {
  rating: KpiRatingId;
}

export interface KpiCampaignRow extends KpiForecastRow {
  coefficient: number;
  campaignPoints: number;
}

export interface KpiCampaignResult {
  rows: KpiCampaignRow[];
  feeRows: KpiForecastFeeRow[];
  feeActual: number;
  planPoints: number;
  /** Điểm thực hiện tính theo QĐ 1799, chưa nhân hệ số. */
  basePoints: number;
  /** Điểm thực hiện sau khi nhân hệ số của đợt. */
  campaignPoints: number;
  /** Điểm cộng thêm được ghi nhận sau giới hạn theo xếp loại. */
  recognizedExtra: number;
  baseCompletion: number;
  completion: number;
  recognizedPoints: number;
  growthCompletion: number;
  bonusTiers: KpiForecastBonusTier[];
  bonus: number;
}
