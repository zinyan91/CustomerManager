import type {
  B01aStatement,
  B01bStatement,
  B02Statement,
  FinancialLineItem,
  FinancialRatios,
} from '../types/corporateFinancial';

function getItemVal(items: FinancialLineItem[], code: string, period: 'currentPeriod' | 'previousPeriod'): number {
  const it = items.find(i => i.code === code);
  return it ? Number(it[period] || 0) : 0;
}

function setItemVal(items: FinancialLineItem[], code: string, period: 'currentPeriod' | 'previousPeriod', val: number) {
  const it = items.find(i => i.code === code);
  if (it) {
    it[period] = val;
  }
}

export function computeB01a(statement: B01aStatement): B01aStatement {
  const cloned: B01aStatement = JSON.parse(JSON.stringify(statement));
  const periods: ('currentPeriod' | 'previousPeriod')[] = ['currentPeriod', 'previousPeriod'];

  periods.forEach(p => {
    // 130 = 131 + 132 + 133 + 134 (134 is negative)
    const pt = getItemVal(cloned.items, '131', p) +
      getItemVal(cloned.items, '132', p) +
      getItemVal(cloned.items, '133', p) +
      getItemVal(cloned.items, '134', p);
    setItemVal(cloned.items, '130', p, pt);

    // 140 = 141 + 142 (142 is negative)
    const htk = getItemVal(cloned.items, '141', p) + getItemVal(cloned.items, '142', p);
    setItemVal(cloned.items, '140', p, htk);

    // 100 = 110 + 120 + 130 + 140 + 150
    const tsnh = getItemVal(cloned.items, '110', p) +
      getItemVal(cloned.items, '120', p) +
      pt +
      htk +
      getItemVal(cloned.items, '150', p);
    setItemVal(cloned.items, '100', p, tsnh);

    // 220 = 221 + 222 (222 is negative)
    const tscd = getItemVal(cloned.items, '221', p) + getItemVal(cloned.items, '222', p);
    setItemVal(cloned.items, '220', p, tscd);

    // 200 = 210 + 220 + 230 + 240 + 250 + 260
    const tsdh = getItemVal(cloned.items, '210', p) +
      tscd +
      getItemVal(cloned.items, '230', p) +
      getItemVal(cloned.items, '240', p) +
      getItemVal(cloned.items, '250', p) +
      getItemVal(cloned.items, '260', p);
    setItemVal(cloned.items, '200', p, tsdh);

    // 270 = 100 + 200 (TỔNG CỘNG TÀI SẢN)
    setItemVal(cloned.items, '270', p, tsnh + tsdh);

    // 310 = 311 + 312 + 313 + 314 + 315 + 316
    const noNganHan = getItemVal(cloned.items, '311', p) +
      getItemVal(cloned.items, '312', p) +
      getItemVal(cloned.items, '313', p) +
      getItemVal(cloned.items, '314', p) +
      getItemVal(cloned.items, '315', p) +
      getItemVal(cloned.items, '316', p);
    setItemVal(cloned.items, '310', p, noNganHan);

    // 330 = 331 + 332
    const noDaiHan = getItemVal(cloned.items, '331', p) + getItemVal(cloned.items, '332', p);
    setItemVal(cloned.items, '330', p, noDaiHan);

    // 300 = 310 + 330 (C. NỢ PHẢI TRẢ)
    const tongNo = noNganHan + noDaiHan;
    setItemVal(cloned.items, '300', p, tongNo);

    // 400 = 411 + 412 + 413 + 414 + 415 + 416 + 417 (414 is negative)
    const vcsh = getItemVal(cloned.items, '411', p) +
      getItemVal(cloned.items, '412', p) +
      getItemVal(cloned.items, '413', p) +
      getItemVal(cloned.items, '414', p) +
      getItemVal(cloned.items, '415', p) +
      getItemVal(cloned.items, '416', p) +
      getItemVal(cloned.items, '417', p);
    setItemVal(cloned.items, '400', p, vcsh);

    // 440 = 300 + 400 (TỔNG CỘNG NGUỒN VỐN)
    setItemVal(cloned.items, '440', p, tongNo + vcsh);
  });

  return cloned;
}

export function computeB02(statement: B02Statement): B02Statement {
  const cloned: B02Statement = JSON.parse(JSON.stringify(statement));
  const periods: ('currentPeriod' | 'previousPeriod')[] = ['currentPeriod', 'previousPeriod'];

  periods.forEach(p => {
    // 10 = 01 - 02 (Doanh thu thuần)
    const dt = getItemVal(cloned.items, '01', p);
    const giamTru = Math.abs(getItemVal(cloned.items, '02', p));
    const dtThuan = dt - giamTru;
    setItemVal(cloned.items, '10', p, dtThuan);

    // 20 = 10 - 11 (Lợi nhuận gộp)
    const giaVon = getItemVal(cloned.items, '11', p);
    const lnGop = dtThuan - giaVon;
    setItemVal(cloned.items, '20', p, lnGop);

    // 30 = 20 + 21 - 22 - 24 (Lợi nhuận thuần từ HĐKD)
    const dtTaiChinh = getItemVal(cloned.items, '21', p);
    const cpTaiChinh = getItemVal(cloned.items, '22', p);
    const cpQlBanHang = getItemVal(cloned.items, '24', p);
    const lnThuan = lnGop + dtTaiChinh - cpTaiChinh - cpQlBanHang;
    setItemVal(cloned.items, '30', p, lnThuan);

    // 40 = 31 - 32 (Lợi nhuận khác)
    const thuNhapKhac = getItemVal(cloned.items, '31', p);
    const cpKhac = getItemVal(cloned.items, '32', p);
    const lnKhac = thuNhapKhac - cpKhac;
    setItemVal(cloned.items, '40', p, lnKhac);

    // 50 = 30 + 40 (Tổng lợi nhuận trước thuế)
    const lntt = lnThuan + lnKhac;
    setItemVal(cloned.items, '50', p, lntt);

    // 60 = 50 - 51 (Lợi nhuận sau thuế TNDN)
    const thue = getItemVal(cloned.items, '51', p);
    const lnst = lntt - thue;
    setItemVal(cloned.items, '60', p, lnst);
  });

  return cloned;
}

export function computeB01b(statement: B01bStatement): B01bStatement {
  const cloned: B01bStatement = JSON.parse(JSON.stringify(statement));
  const periods: ('currentPeriod' | 'previousPeriod')[] = ['currentPeriod', 'previousPeriod'];

  periods.forEach(p => {
    // 130 = 131 + 132 + 133 + 134
    const pt = getItemVal(cloned.items, '131', p) +
      getItemVal(cloned.items, '132', p) +
      getItemVal(cloned.items, '133', p) +
      getItemVal(cloned.items, '134', p);
    setItemVal(cloned.items, '130', p, pt);

    // 140 = 141 + 142
    const htk = getItemVal(cloned.items, '141', p) + getItemVal(cloned.items, '142', p);
    setItemVal(cloned.items, '140', p, htk);

    // 150 = 151 + 152 + 153
    const tscd = getItemVal(cloned.items, '151', p) +
      getItemVal(cloned.items, '152', p) +
      getItemVal(cloned.items, '153', p);
    setItemVal(cloned.items, '150', p, tscd);

    // 200 = 110 + 120 + 130 + 140 + 150 + 160 (TỔNG TÀI SẢN)
    const tongTS = getItemVal(cloned.items, '110', p) +
      getItemVal(cloned.items, '120', p) +
      pt +
      htk +
      tscd +
      getItemVal(cloned.items, '160', p);
    setItemVal(cloned.items, '200', p, tongTS);

    // 300 = 310 + 320 + 330 + 340 + 350 + 360 (NỢ PHẢI TRẢ)
    const tongNo = getItemVal(cloned.items, '310', p) +
      getItemVal(cloned.items, '320', p) +
      getItemVal(cloned.items, '330', p) +
      getItemVal(cloned.items, '340', p) +
      getItemVal(cloned.items, '350', p) +
      getItemVal(cloned.items, '360', p);
    setItemVal(cloned.items, '300', p, tongNo);

    // 400 = 410 + 420 + 430 + 440 (VỐN CHỦ SỞ HỮU)
    const vcsh = getItemVal(cloned.items, '410', p) +
      getItemVal(cloned.items, '420', p) +
      getItemVal(cloned.items, '430', p) +
      getItemVal(cloned.items, '440', p);
    setItemVal(cloned.items, '400', p, vcsh);

    // 500 = 300 + 400 (TỔNG NGUỒN VỐN)
    setItemVal(cloned.items, '500', p, tongNo + vcsh);
  });

  return cloned;
}

export function checkB01aBalance(statement: B01aStatement): {
  isBalancedCurrent: boolean;
  diffCurrent: number;
  isBalancedPrevious: boolean;
  diffPrevious: number;
} {
  const tsCurrent = getItemVal(statement.items, '270', 'currentPeriod');
  const nvCurrent = getItemVal(statement.items, '440', 'currentPeriod');
  const diffCurrent = Math.round(tsCurrent - nvCurrent);

  const tsPrevious = getItemVal(statement.items, '270', 'previousPeriod');
  const nvPrevious = getItemVal(statement.items, '440', 'previousPeriod');
  const diffPrevious = Math.round(tsPrevious - nvPrevious);

  return {
    isBalancedCurrent: diffCurrent === 0,
    diffCurrent,
    isBalancedPrevious: diffPrevious === 0,
    diffPrevious,
  };
}

export function computeFinancialRatios(
  b01a: B01aStatement,
  b02: B02Statement
): FinancialRatios {
  const current = computeB01a(b01a);
  const pnl = computeB02(b02);

  const tsnh = getItemVal(current.items, '100', 'currentPeriod');
  const htk = getItemVal(current.items, '140', 'currentPeriod');
  const tien = getItemVal(current.items, '110', 'currentPeriod');
  const tongTS = getItemVal(current.items, '270', 'currentPeriod');
  const noNganHan = getItemVal(current.items, '310', 'currentPeriod');
  const tongNo = getItemVal(current.items, '300', 'currentPeriod');
  const vcsh = getItemVal(current.items, '400', 'currentPeriod');

  const dtThuan = getItemVal(pnl.items, '10', 'currentPeriod');
  const giaVon = getItemVal(pnl.items, '11', 'currentPeriod');
  const lnGop = getItemVal(pnl.items, '20', 'currentPeriod');
  const lnThuan = getItemVal(pnl.items, '30', 'currentPeriod');
  const lnst = getItemVal(pnl.items, '60', 'currentPeriod');

  // Ratios
  const currentRatio = noNganHan > 0 ? tsnh / noNganHan : 0;
  const quickRatio = noNganHan > 0 ? (tsnh - htk) / noNganHan : 0;
  const cashRatio = noNganHan > 0 ? tien / noNganHan : 0;
  const debtToAssets = tongTS > 0 ? (tongNo / tongTS) * 100 : 0;
  const debtToEquity = vcsh > 0 ? (tongNo / vcsh) * 100 : 0;
  const inventoryTurnover = htk > 0 ? giaVon / htk : 0;
  const grossMargin = dtThuan > 0 ? (lnGop / dtThuan) * 100 : 0;
  const operatingMargin = dtThuan > 0 ? (lnThuan / dtThuan) * 100 : 0;
  const netProfitMargin = dtThuan > 0 ? (lnst / dtThuan) * 100 : 0;
  const roa = tongTS > 0 ? (lnst / tongTS) * 100 : 0;
  const roe = vcsh > 0 ? (lnst / vcsh) * 100 : 0;

  return {
    currentRatio: Number(currentRatio.toFixed(2)),
    quickRatio: Number(quickRatio.toFixed(2)),
    cashRatio: Number(cashRatio.toFixed(2)),
    debtToAssets: Number(debtToAssets.toFixed(1)),
    debtToEquity: Number(debtToEquity.toFixed(1)),
    inventoryTurnover: Number(inventoryTurnover.toFixed(1)),
    grossMargin: Number(grossMargin.toFixed(1)),
    operatingMargin: Number(operatingMargin.toFixed(1)),
    netProfitMargin: Number(netProfitMargin.toFixed(1)),
    roa: Number(roa.toFixed(1)),
    roe: Number(roe.toFixed(1)),
  };
}
