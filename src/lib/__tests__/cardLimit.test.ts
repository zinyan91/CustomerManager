import { describe, it, expect } from 'vitest';
import { checkCardLimit, checkCollateralCapacity, clusterExposure, cardGrantedLimit } from '../creditLimit';
import { cardProductCap, isSavingsPassbook, CARD_STK_LTV_PERCENT } from '../collateralMath';
import type { Collateral, CreditCard, LoanContract } from '../../types';

const HOM_NAY = '2026-08-06';

const ts = (over: Partial<Collateral>): Collateral => ({
  Id: 1,
  CustomerId: 1,
  AssetCode: 'TS-01',
  AssetType: 'Loại 1',
  AppraisedValue: 1_000_000_000,
  AppraisalDate: '2026-02-01',
  AppraisalTenorMonths: 12,
  ...over,
} as unknown as Collateral);

const vay = (over: Partial<LoanContract>): LoanContract => ({
  Id: 100,
  CustomerId: 1,
  ContractNumber: 'HD01/GNN-01',
  LoanMethod: 'Cho vay từng lần',
  ContractAmount: 0,
  LoanAmount: 0,
  CurrentBalance: 0,
  ...over,
} as unknown as LoanContract);

const the = (over: Partial<CreditCard>): CreditCard => ({
  Id: 500,
  CustomerId: 1,
  CardNumber: '4532••••1234',
  CreditLimit: 0,
  ...over,
} as unknown as CreditCard);

describe('isSavingsPassbook', () => {
  it('nhận cả sổ cùng hệ thống lẫn STK khác', () => {
    expect(isSavingsPassbook('Sổ tiết kiệm')).toBe(true);
    expect(isSavingsPassbook('STK khác')).toBe(true);
    expect(isSavingsPassbook('Loại 1')).toBe(false);
    expect(isSavingsPassbook(null)).toBe(false);
  });
});

describe('cardProductCap — thẻ trên sổ luôn 90%, không theo bảng LTV', () => {
  it('sổ cùng hệ thống LTV 100% vẫn bị kẹp về 90% khi mở thẻ', () => {
    const so = ts({ AssetType: 'Sổ tiết kiệm', AppraisedValue: 500_000_000 });
    expect(cardProductCap(so, HOM_NAY)).toBe(450_000_000);
    expect(CARD_STK_LTV_PERCENT).toBe(90);
  });

  it('tài sản không phải sổ thì không có trần sản phẩm', () => {
    expect(cardProductCap(ts({ AssetType: 'Loại 1' }), HOM_NAY)).toBeNull();
  });

  it('sổ hết hiệu lực định giá thì trần bằng 0, không phải 90%', () => {
    const so = ts({ AssetType: 'Sổ tiết kiệm', AppraisalDate: '2024-01-01', AppraisalTenorMonths: 12 });
    expect(cardProductCap(so, HOM_NAY)).toBe(0);
  });
});

describe('thẻ được tính vào rủi ro của cụm', () => {
  it('clusterExposure cộng hạn mức cấp của thẻ, không cộng dư nợ thẻ', () => {
    const cards = [the({ CreditLimit: 200_000_000, CurrentBalance: 5_000_000 })];
    expect(clusterExposure([], undefined, cards)).toBe(200_000_000);
  });

  it('thẻ trên tài sản đang thế chấp làm cụm vượt trần', () => {
    const nha = ts({ Id: 7, AssetType: 'Loại 1', AppraisedValue: 1_000_000_000 });
    const khoanVay = vay({ CollateralId: 7, CurrentBalance: 700_000_000 });
    const cards = [the({ CollateralId: 7, CreditLimit: 200_000_000 })];

    const khongThe = checkCollateralCapacity([khoanVay], [nha], undefined, HOM_NAY);
    expect(khongThe[0].capacity).toBe(800_000_000);
    expect(khongThe[0].granted).toBe(700_000_000);
    expect(khongThe[0].exceeded).toBe(false);

    const coThe = checkCollateralCapacity([khoanVay], [nha], undefined, HOM_NAY, cards);
    expect(coThe[0].granted).toBe(900_000_000);
    expect(coThe[0].exceeded).toBe(true);
    expect(coThe[0].excessAmount).toBe(100_000_000);
    expect(coThe[0].cardNumbers).toEqual(['4532••••1234']);
  });

  it('thẻ không gắn tài sản thì không vào cụm nào', () => {
    const so = ts({ Id: 9, AssetType: 'Sổ tiết kiệm', AppraisedValue: 100_000_000 });
    const cards = [the({ CollateralId: null, CreditLimit: 50_000_000 })];
    expect(checkCollateralCapacity([], [so], undefined, HOM_NAY, cards)).toEqual([]);
  });
});

describe('checkCardLimit — ba trường hợp mở thẻ', () => {
  it('TH1 thẻ tín chấp không TSBĐ: không chặn theo LTV', () => {
    const kq = checkCardLimit(300_000_000, null, [], [], [], undefined, HOM_NAY);
    expect(kq.blocker).toBe('no_collateral');
    expect(kq.exceeded).toBe(false);
  });

  it('TH2 tài sản đang thế chấp: trần là phần còn trống của cụm', () => {
    const nha = ts({ Id: 7, AssetType: 'Loại 1', AppraisedValue: 1_000_000_000 });
    const khoanVay = vay({ CollateralId: 7, CurrentBalance: 700_000_000 });

    const kq = checkCardLimit(200_000_000, nha, [khoanVay], [], [nha], undefined, HOM_NAY);
    expect(kq.clusterCapacity).toBe(800_000_000);
    expect(kq.clusterUsed).toBe(700_000_000);
    expect(kq.maxAllowed).toBe(100_000_000);
    expect(kq.exceeded).toBe(true);
    expect(kq.excessAmount).toBe(100_000_000);
    expect(kq.blocker).toBe('cluster_exceeded');
  });

  it('TH2 xin đúng phần còn trống thì qua', () => {
    const nha = ts({ Id: 7, AssetType: 'Loại 1', AppraisedValue: 1_000_000_000 });
    const khoanVay = vay({ CollateralId: 7, CurrentBalance: 700_000_000 });

    const kq = checkCardLimit(100_000_000, nha, [khoanVay], [], [nha], undefined, HOM_NAY);
    expect(kq.exceeded).toBe(false);
    expect(kq.blocker).toBe('none');
  });

  it('TH3 sổ chưa cầm cố gì: trần đúng 90% mệnh giá', () => {
    const so = ts({ Id: 9, AssetType: 'Sổ tiết kiệm', AppraisedValue: 500_000_000 });
    const kq = checkCardLimit(450_000_000, so, [], [], [so], undefined, HOM_NAY);
    expect(kq.productCap).toBe(450_000_000);
    expect(kq.maxAllowed).toBe(450_000_000);
    expect(kq.exceeded).toBe(false);
  });

  it('TH3 xin quá 90% thì chặn và nêu đúng lý do là trần sản phẩm', () => {
    const so = ts({ Id: 9, AssetType: 'Sổ tiết kiệm', AppraisedValue: 500_000_000 });
    const kq = checkCardLimit(460_000_000, so, [], [], [so], undefined, HOM_NAY);
    expect(kq.exceeded).toBe(true);
    expect(kq.blocker).toBe('product_cap_exceeded');
    expect(kq.excessAmount).toBe(10_000_000);
  });

  it('TH3 sổ đã đỡ khoản vay thì hai trần cùng áp, lấy cái chặt hơn', () => {
    const so = ts({ Id: 9, AssetType: 'Sổ tiết kiệm', AppraisedValue: 500_000_000 });
    const khoanVay = vay({ CollateralId: 9, CurrentBalance: 300_000_000 });

    const kq = checkCardLimit(250_000_000, so, [khoanVay], [], [so], undefined, HOM_NAY);
    expect(kq.clusterCapacity).toBe(500_000_000);
    expect(kq.clusterUsed).toBe(300_000_000);
    expect(kq.clusterHeadroom).toBe(200_000_000);
    expect(kq.productCap).toBe(450_000_000);
    expect(kq.maxAllowed).toBe(200_000_000);
    expect(kq.blocker).toBe('cluster_exceeded');
  });

  it('thẻ khác đang dùng chung tài sản cũng chiếm chỗ', () => {
    const nha = ts({ Id: 7, AssetType: 'Loại 1', AppraisedValue: 1_000_000_000 });
    const theCu = the({ Id: 501, CollateralId: 7, CreditLimit: 300_000_000 });

    const kq = checkCardLimit(600_000_000, nha, [], [theCu], [nha], undefined, HOM_NAY);
    expect(kq.clusterUsed).toBe(300_000_000);
    expect(kq.maxAllowed).toBe(500_000_000);
    expect(kq.exceeded).toBe(true);
  });

  it('định giá hết hiệu lực thì không cấp được đồng nào', () => {
    const nha = ts({ Id: 7, AppraisalDate: '2024-01-01', AppraisalTenorMonths: 12 });
    const kq = checkCardLimit(100_000_000, nha, [], [], [nha], undefined, HOM_NAY);
    expect(kq.maxAllowed).toBe(0);
    expect(kq.blocker).toBe('appraisal_unusable');
    expect(kq.exceeded).toBe(true);
  });

  it('tài sản Hạn chế nhận TS cho LTV 0 nên thẻ không cấp được', () => {
    const han = ts({ Id: 7, AssetType: 'Hạn chế nhận TS', AppraisedValue: 1_000_000_000 });
    const kq = checkCardLimit(1_000_000, han, [], [], [han], undefined, HOM_NAY);
    expect(kq.clusterCapacity).toBe(0);
    expect(kq.maxAllowed).toBe(0);
    expect(kq.exceeded).toBe(true);
  });
});

describe('cardGrantedLimit', () => {
  it('đọc hạn mức từ CreditLimit', () => {
    expect(cardGrantedLimit(the({ CreditLimit: 200_000_000 }))).toBe(200_000_000);
  });

  it('hạn mức 0 là giá trị thật, không phải thiếu dữ liệu', () => {
    expect(cardGrantedLimit(the({ CreditLimit: 0 }))).toBe(0);
  });

  it('chưa khai hạn mức thì bằng 0', () => {
    expect(cardGrantedLimit(the({ CreditLimit: undefined }))).toBe(0);
  });
});
