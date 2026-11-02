import { describe, expect, it } from 'vitest';
import { activeKpiCampaign, calculateKpiCampaign, createKpiCampaignInputs } from '../kpiCampaign';
import { KPI_CAMPAIGN_3175, KPI_CAMPAIGNS } from '../kpiCampaigns';
import type { KpiCampaignInputs, KpiRatingId } from '../../types/kpiCampaign';
import type { KpiForecastRank } from '../../types/kpiForecast';

function inputs(rank: KpiForecastRank, rating: KpiRatingId = 'hoanThanh'): KpiCampaignInputs {
  return { ...createKpiCampaignInputs(), rank, rating, tenureMonths: 24 };
}

/** RBO1 đạt đúng kế hoạch ở mọi chỉ tiêu, doanh số phí ghi vào Hoạt động tín dụng. */
function rbo1OnPlan(rating: KpiRatingId): KpiCampaignInputs {
  const value = inputs('RBO1', rating);
  value.actuals.netLoan = 1200;
  value.actuals.netDeposit = 900;
  value.actuals.netCasa = 140;
  value.actuals.managedLoan = 40000;
  value.actuals.cards = 3;
  value.actuals.activeCustomers = 18;
  value.fees.creditActivity = 17;
  return value;
}

describe('KPI theo đợt — Thông báo 3175/2026/TB-TGĐ', () => {
  it.each([
    ['RBO1', 428], ['RBO2', 460], ['RBO3', 599], ['RBO4', 659], ['RBO5', 823], ['RBO6', 1035],
    ['CSO1', 617], ['CSO2', 740], ['CSO3', 886],
  ] as const)('tổng điểm kế hoạch %s khớp phụ lục: %s', (rank, total) => {
    expect(calculateKpiCampaign(KPI_CAMPAIGN_3175, inputs(rank)).planPoints).toBeCloseTo(total, 9);
  });

  it('PFC hiển thị đúng tên chức danh trong thông báo', () => {
    expect(KPI_CAMPAIGN_3175.rankLabels.CSO1).toBe('PFC1');
    expect(KPI_CAMPAIGN_3175.rankLabels.RBO6).toBe('RBO6');
  });

  it('hệ số chỉ nhân vào điểm thực hiện, không đổi kế hoạch', () => {
    const result = calculateKpiCampaign(KPI_CAMPAIGN_3175, rbo1OnPlan('tot'));
    const row = (id: string) => result.rows.find(item => item.id === id)!;
    expect(row('netLoan').plan).toBe(1200);
    expect(row('netLoan').planPoints).toBe(41);
    expect(row('netLoan').coefficient).toBe(1.5);
    expect(row('netLoan').actualPoints).toBeCloseTo(40.8, 9);
    expect(row('netLoan').campaignPoints).toBeCloseTo(61.2, 9);
    expect(row('netCasa').campaignPoints).toBeCloseTo(34.3, 9);
    expect(row('netDeposit').campaignPoints).toBeCloseTo(28.8, 9);
    expect(row('managedLoan').coefficient).toBe(1);
    expect(result.basePoints).toBeCloseTo(462.06, 9);
    expect(result.campaignPoints).toBeCloseTo(524.3, 9);
  });

  it('Hoàn thành tốt: cộng đủ điểm khi dưới 20% kế hoạch và dưới trần 140%', () => {
    const result = calculateKpiCampaign(KPI_CAMPAIGN_3175, rbo1OnPlan('tot'));
    expect(result.recognizedExtra).toBeCloseTo(62.24, 9);
    expect(result.completion).toBeCloseTo(524.3 / 428, 12);
    expect(result.recognizedPoints).toBeCloseTo(524.3, 9);
  });

  it('Hoàn thành: không giới hạn phần cộng nhưng ghi nhận tối đa 120%', () => {
    expect(calculateKpiCampaign(KPI_CAMPAIGN_3175, rbo1OnPlan('hoanThanh')).completion).toBeCloseTo(1.2, 12);
  });

  it('Không hoàn thành: trần 100% nhưng không kéo thấp hơn mức tính theo QĐ 1799', () => {
    const result = calculateKpiCampaign(KPI_CAMPAIGN_3175, rbo1OnPlan('khongHoanThanh'));
    expect(result.baseCompletion).toBeCloseTo(462.06 / 428, 12);
    expect(result.completion).toBeCloseTo(462.06 / 428, 12);
  });

  it('Hoàn thành xuất sắc: phần cộng thêm không vượt 20% điểm kế hoạch', () => {
    const value = inputs('RBO1', 'xuatSac');
    value.actuals.netCasa = 2000;
    value.actuals.managedLoan = 40000;
    const result = calculateKpiCampaign(KPI_CAMPAIGN_3175, value);
    expect(result.basePoints).toBeCloseTo(298, 9);
    expect(result.campaignPoints).toBeCloseTo(690, 9);
    expect(result.recognizedExtra).toBeCloseTo(85.6, 9);
    expect(result.completion).toBeCloseTo(383.6 / 428, 12);
  });

  it('cùng số liệu nhưng xếp loại Hoàn thành thì ghi nhận tới trần 120%', () => {
    const value = inputs('RBO1', 'hoanThanh');
    value.actuals.netCasa = 2000;
    value.actuals.managedLoan = 40000;
    expect(calculateKpiCampaign(KPI_CAMPAIGN_3175, value).completion).toBeCloseTo(1.2, 12);
  });

  it('PFC nhân hệ số huy động CKH và CASA', () => {
    const value = inputs('CSO1', 'tot');
    value.actuals.netDeposit = 6400;
    value.actuals.netCasa = 150;
    const result = calculateKpiCampaign(KPI_CAMPAIGN_3175, value);
    const row = (id: string) => result.rows.find(item => item.id === id)!;
    expect(row('netDeposit').campaignPoints).toBeCloseTo(6400 * 16 / 1000 * 2, 9);
    expect(row('netCasa').campaignPoints).toBeCloseTo(150 * 49 / 1000 * 5, 9);
    expect(result.rows.some(item => item.id === 'netLoan')).toBe(false);
  });

  it('thưởng tính trên điểm được ghi nhận sau hệ số', () => {
    const result = calculateKpiCampaign(KPI_CAMPAIGN_3175, rbo1OnPlan('tot'));
    const tier1 = result.bonusTiers.find(tier => tier.id === 'tier1')!;
    const tier2 = result.bonusTiers.find(tier => tier.id === 'tier2')!;
    expect(tier1.points).toBeCloseTo(85.6, 9);
    expect(tier2.points).toBeCloseTo(524.3 - 428 * 1.2, 9);
    expect(result.bonus).toBeCloseTo(result.bonusTiers.reduce((sum, tier) => sum + tier.amount, 0), 6);
  });

  it('báo lỗi rõ khi đợt thiếu bộ chỉ tiêu cho cấp bậc', () => {
    const campaign = { ...KPI_CAMPAIGN_3175, policy: {} };
    expect(() => calculateKpiCampaign(campaign, inputs('RBO1'))).toThrow('không có bộ chỉ tiêu cho RBO1');
  });
});

describe('chọn đợt theo ngày', () => {
  it('lấy đợt đang hiệu lực', () => {
    expect(activeKpiCampaign(KPI_CAMPAIGNS, '2026-11-15')?.id).toBe('3175-2026');
  });

  it('ngoài mọi đợt thì lấy đợt kết thúc gần nhất', () => {
    expect(activeKpiCampaign(KPI_CAMPAIGNS, '2027-02-01')?.id).toBe('3175-2026');
  });

  it('không có đợt nào thì trả null', () => {
    expect(activeKpiCampaign([], '2026-11-15')).toBeNull();
  });
});
