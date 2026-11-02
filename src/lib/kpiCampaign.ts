import type { KpiCampaign, KpiCampaignInputs, KpiCampaignResult, KpiCampaignRow } from '../types/kpiCampaign';
import { calculateKpiForecast, createKpiForecastInputs, kpiBonusTiers } from './kpiForecast';

export function createKpiCampaignInputs(): KpiCampaignInputs {
  return { ...createKpiForecastInputs(), rating: 'hoanThanh' };
}

/** Đợt đang hiệu lực vào ngày `today` (yyyy-mm-dd); ngoài mọi đợt thì lấy đợt kết thúc gần nhất. */
export function activeKpiCampaign(campaigns: readonly KpiCampaign[], today: string): KpiCampaign | null {
  const running = campaigns.filter(c => c.effectiveFrom <= today && today <= c.effectiveTo);
  const pool = running.length > 0 ? running : campaigns;
  return pool.reduce<KpiCampaign | null>((best, c) => (!best || c.effectiveTo > best.effectiveTo ? c : best), null);
}

/**
 * Điểm thực hiện theo từng chỉ tiêu nhân hệ số của đợt; phần cộng thêm bị giới hạn theo xếp loại,
 * và tỷ lệ ghi nhận không bao giờ thấp hơn tỷ lệ tính theo QĐ 1799.
 */
export function calculateKpiCampaign(campaign: KpiCampaign, inputs: KpiCampaignInputs): KpiCampaignResult {
  const policy = campaign.policy[inputs.rank];
  if (!policy) throw new Error(`Đợt ${campaign.documentNumber} không có bộ chỉ tiêu cho ${inputs.rank}`);
  const rating = campaign.ratings.find(item => item.id === inputs.rating);
  if (!rating) throw new Error(`Đợt ${campaign.documentNumber} không có xếp loại ${inputs.rating}`);

  const base = calculateKpiForecast(inputs, policy);
  const rows: KpiCampaignRow[] = base.rows.map(row => {
    const coefficient = campaign.coefficients[row.id] ?? 1;
    return { ...row, coefficient, campaignPoints: row.actualPoints * coefficient };
  });
  const campaignPoints = rows.reduce((sum, row) => sum + row.campaignPoints, 0);
  const extra = campaignPoints - base.actualPoints;
  const recognizedExtra = rating.extraCapRatio === null ? extra : Math.min(extra, base.planPoints * rating.extraCapRatio);
  const withExtra = base.planPoints === 0 ? 0 : (base.actualPoints + recognizedExtra) / base.planPoints;
  const completion = Math.max(base.completion, Math.min(rating.maxCompletion, withExtra));
  const recognizedPoints = completion * base.planPoints;
  const bonusTiers = kpiBonusTiers(base.planPoints, recognizedPoints, base.growthCompletion);

  return {
    rows,
    feeRows: base.feeRows,
    feeActual: base.feeActual,
    planPoints: base.planPoints,
    basePoints: base.actualPoints,
    campaignPoints,
    recognizedExtra,
    baseCompletion: base.completion,
    completion,
    recognizedPoints,
    growthCompletion: base.growthCompletion,
    bonusTiers,
    bonus: bonusTiers.reduce((sum, tier) => sum + tier.amount, 0),
  };
}
