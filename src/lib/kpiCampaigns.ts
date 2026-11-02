import type { KpiCampaign, KpiRating } from '../types/kpiCampaign';

/** Xếp loại theo QĐ 1799/2026 và mức cộng điểm tối đa theo Thông báo 3175/2026/TB-TGĐ. */
const RATINGS_3175: readonly KpiRating[] = [
  { id: 'xuatSac', label: 'Hoàn thành xuất sắc', extraCapRatio: 0.2, maxCompletion: 1.4 },
  { id: 'tot', label: 'Hoàn thành tốt', extraCapRatio: 0.2, maxCompletion: 1.4 },
  { id: 'hoanThanh', label: 'Hoàn thành', extraCapRatio: null, maxCompletion: 1.2 },
  { id: 'canCoGang', label: 'Cần cố gắng', extraCapRatio: null, maxCompletion: 1.2 },
  { id: 'khongHoanThanh', label: 'Không hoàn thành', extraCapRatio: null, maxCompletion: 1 },
  { id: 'yeuKem', label: 'Yếu kém', extraCapRatio: null, maxCompletion: 1 },
];

const RBO_TARGETS = {
  RBO1: { netLoan: 1200, netDeposit: 900, netCasa: 140, managedLoan: 40000, fees: 17, cards: 3, activeCustomers: 18 },
  RBO2: { netLoan: 1300, netDeposit: 1000, netCasa: 160, managedLoan: 43100, fees: 18, cards: 3, activeCustomers: 20 },
  RBO3: { netLoan: 1700, netDeposit: 1300, netCasa: 210, managedLoan: 56000, fees: 24, cards: 3, activeCustomers: 26 },
  RBO4: { netLoan: 1900, netDeposit: 1400, netCasa: 230, managedLoan: 61600, fees: 26, cards: 4, activeCustomers: 29 },
  RBO5: { netLoan: 2200, netDeposit: 1600, netCasa: 260, managedLoan: 71000, fees: 38, cards: 4, activeCustomers: 34 },
  RBO6: { netLoan: 3000, netDeposit: 2000, netCasa: 310, managedLoan: 85000, fees: 50, cards: 5, activeCustomers: 41 },
};

const PFC_TARGETS = {
  CSO1: { netDeposit: 6400, netCasa: 150, managedDeposit: 410000, fees: 19, cards: 2, activeCustomers: 20 },
  CSO2: { netDeposit: 8300, netCasa: 180, managedDeposit: 451800, fees: 25, cards: 3, activeCustomers: 25 },
  CSO3: { netDeposit: 10800, netCasa: 200, managedDeposit: 496000, fees: 32, cards: 4, activeCustomers: 34 },
};

/** Thông báo 3175/2026/TB-TGĐ ngày 30/10/2026 — Bứt phá điểm thưởng, tháng 11 và 12/2026. */
export const KPI_CAMPAIGN_3175: KpiCampaign = {
  id: '3175-2026',
  name: 'Bứt phá điểm thưởng',
  documentNumber: '3175/2026/TB-TGĐ',
  effectiveFrom: '2026-11-01',
  effectiveTo: '2026-12-31',
  ranks: ['RBO1', 'RBO2', 'RBO3', 'RBO4', 'RBO5', 'RBO6', 'CSO1', 'CSO2', 'CSO3'],
  rankLabels: {
    RBO1: 'RBO1', RBO2: 'RBO2', RBO3: 'RBO3', RBO4: 'RBO4', RBO5: 'RBO5', RBO6: 'RBO6',
    CSO1: 'PFC1', CSO2: 'PFC2', CSO3: 'PFC3',
  },
  policy: {
    RBO1: { targets: RBO_TARGETS.RBO1, points: { netLoan: 41, netDeposit: 14, netCasa: 7, managedLoan: 200, fees: 136, cards: 12, activeCustomers: 18 } },
    RBO2: { targets: RBO_TARGETS.RBO2, points: { netLoan: 44, netDeposit: 16, netCasa: 8, managedLoan: 216, fees: 144, cards: 12, activeCustomers: 20 } },
    RBO3: { targets: RBO_TARGETS.RBO3, points: { netLoan: 58, netDeposit: 21, netCasa: 10, managedLoan: 280, fees: 192, cards: 12, activeCustomers: 26 } },
    RBO4: { targets: RBO_TARGETS.RBO4, points: { netLoan: 65, netDeposit: 22, netCasa: 11, managedLoan: 308, fees: 208, cards: 16, activeCustomers: 29 } },
    RBO5: { targets: RBO_TARGETS.RBO5, points: { netLoan: 75, netDeposit: 26, netCasa: 13, managedLoan: 355, fees: 304, cards: 16, activeCustomers: 34 } },
    RBO6: { targets: RBO_TARGETS.RBO6, points: { netLoan: 102, netDeposit: 32, netCasa: 15, managedLoan: 425, fees: 400, cards: 20, activeCustomers: 41 } },
    CSO1: { targets: PFC_TARGETS.CSO1, points: { netDeposit: 102, netCasa: 7, managedDeposit: 328, fees: 152, cards: 8, activeCustomers: 20 } },
    CSO2: { targets: PFC_TARGETS.CSO2, points: { netDeposit: 133, netCasa: 9, managedDeposit: 361, fees: 200, cards: 12, activeCustomers: 25 } },
    CSO3: { targets: PFC_TARGETS.CSO3, points: { netDeposit: 173, netCasa: 10, managedDeposit: 397, fees: 256, cards: 16, activeCustomers: 34 } },
  },
  coefficients: { netLoan: 1.5, netCasa: 5, netDeposit: 2 },
  ratings: RATINGS_3175,
};

export const KPI_CAMPAIGNS: readonly KpiCampaign[] = [KPI_CAMPAIGN_3175];
