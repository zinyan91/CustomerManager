import { describe, it, expect } from 'vitest';
import { CARD_FEE_PROFILES, CARD_FEE_GROUPS, searchCardFeeProfiles } from '../cardFeeProfiles';

describe('cardFeeProfiles', () => {
  it('chứa đủ 15 mã phí thẻ và 3 nhóm đối tượng', () => {
    expect(CARD_FEE_PROFILES).toHaveLength(15);
    expect(CARD_FEE_GROUPS).toHaveLength(3);
  });

  it('tìm kiếm theo nhóm khách hàng', () => {
    const res = searchCardFeeProfiles('', 'KH thông thường');
    expect(res).toHaveLength(5);
    expect(res.every(r => r.group === 'KH thông thường')).toBe(true);
  });

  it('tìm kiếm theo loại thẻ', () => {
    const res = searchCardFeeProfiles('', 'ALL', 'Visa Mystyle');
    expect(res).toHaveLength(3);
    expect(res.every(r => r.cardType === 'Visa Mystyle')).toBe(true);
  });

  it('tìm kiếm theo từ khoá mã Product Man hoặc Fee Int Profile', () => {
    const res1 = searchCardFeeProfiles('LUX_PRFL16');
    expect(res1).toHaveLength(1);
    expect(res1[0].cardType).toBe('Visa Luxury');

    const res2 = searchCardFeeProfiles('CBNV');
    expect(res2.length).toBeGreaterThanOrEqual(5);
  });

  it('xử lý chuỗi rỗng và bộ lọc ALL', () => {
    const res = searchCardFeeProfiles('', 'ALL', 'ALL');
    expect(res).toHaveLength(15);
  });
});
