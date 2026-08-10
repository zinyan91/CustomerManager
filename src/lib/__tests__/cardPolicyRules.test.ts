import { describe, it, expect } from 'vitest';
import {
  CARD_POLICY_RULES,
  CARD_STK_LTV_PERCENT,
  cardLimitFromMatrix,
  cardLimitFromTiers,
  cardPolicyRuleOf,
  checkCardLimitAgainstPolicy,
} from '../cardPolicyRules';
import { CARD_POLICIES } from '../cardContract';

describe('cardLimitFromTiers — bậc số dư tiền gửi', () => {
  const tiers = cardPolicyRuleOf('B1_KHCN_KHONG TSBD_QHVB_TIEN GUI')!.tiers;

  it('bậc cao nhất không có trần trên', () => {
    expect(cardLimitFromTiers(tiers, 5_000_000_000)).toBe(500_000_000);
    expect(cardLimitFromTiers(tiers, 90_000_000_000)).toBe(500_000_000);
  });

  it('BIÊN DƯỚI thuộc bậc của nó', () => {
    expect(cardLimitFromTiers(tiers, 3_000_000_000)).toBe(300_000_000);
    expect(cardLimitFromTiers(tiers, 1_000_000_000)).toBe(100_000_000);
    expect(cardLimitFromTiers(tiers, 100_000_000)).toBe(10_000_000);
  });

  it('BIÊN TRÊN thuộc bậc kế tiếp — "dưới 5 tỷ" không gồm 5 tỷ', () => {
    expect(cardLimitFromTiers(tiers, 4_999_999_999)).toBe(300_000_000);
    expect(cardLimitFromTiers(tiers, 1_999_999_999)).toBe(100_000_000);
  });

  it('dưới sàn 100 triệu thì không được cấp hạn mức nào', () => {
    expect(cardLimitFromTiers(tiers, 99_999_999)).toBe(0);
    expect(cardLimitFromTiers(tiers, 0)).toBe(0);
  });

  it('không có bảng bậc thì trả 0, không ném lỗi', () => {
    expect(cardLimitFromTiers(undefined, 1_000_000_000)).toBe(0);
    expect(cardLimitFromTiers([], 1_000_000_000)).toBe(0);
  });

  it('bảng bậc phủ liên tục, không chồng lấn và không hở', () => {
    const sorted = [...tiers!].sort((a, b) => a.fromAmount - b.fromAmount);
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].toAmount).toBe(sorted[i + 1].fromAmount);
    }
    expect(sorted.at(-1)!.toAmount).toBeNull();
  });
});

describe('checkCardLimitAgainstPolicy — chặn hạn mức vượt trần của mã', () => {
  it('CHẶN thẻ thế chấp BĐS vượt trần 500 triệu', () => {
    const r = checkCardLimitAgainstPolicy('A2_KHCN_TSBD_BDS', 600_000_000);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('500.000.000');
  });

  it('đúng 500 triệu là hợp lệ', () => {
    expect(checkCardLimitAgainstPolicy('A2_KHCN_TSBD_BDS', 500_000_000).ok).toBe(true);
  });

  it('CHẶN dưới sàn 10 triệu', () => {
    const r = checkCardLimitAgainstPolicy('A1_KHCN_TSBD_TIEN GUI', 5_000_000);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('10.000.000');
  });

  it('mã cầm cố tiền gửi KHÔNG có trần trên', () => {
    expect(checkCardLimitAgainstPolicy('A1_KHCN_TSBD_TIEN GUI', 3_000_000_000).ok).toBe(true);
  });

  it('CHẶN vượt trần 200 triệu của mã lương qua ngân hàng khác', () => {
    expect(checkCardLimitAgainstPolicy('B7_KHCN_KHONG TSBD_THUNHAP_ LUONG KHAC', 999_000_000).ok).toBe(false);
  });

  it('hạn mức 0 (thẻ ghi nợ) không bị chặn bởi sàn', () => {
    expect(checkCardLimitAgainstPolicy('A2_KHCN_TSBD_BDS', 0).ok).toBe(true);
  });
});

describe('tính nhất quán giữa hai tệp dữ liệu thẻ', () => {
  it('mọi mã có luật đều tồn tại trong danh mục mã chính sách', () => {
    const codes = new Set(CARD_POLICIES.map(p => p.code));
    for (const r of CARD_POLICY_RULES) {
      expect(codes.has(r.code)).toBe(true);
    }
  });

  it('90% cầm cố tiền gửi khớp hằng số CARD_STK_LTV_PERCENT đang dùng cho thẻ', () => {
    expect(CARD_STK_LTV_PERCENT).toBe(90);
    expect(cardPolicyRuleOf('A1_KHCN_TSBD_TIEN GUI')?.limitRule).toContain('90%');
  });

  it('ĐÃ ĐỌC ĐỦ 15/15 mã của Phụ lục 02', () => {
    expect(CARD_POLICY_RULES).toHaveLength(15);
  });

  it('mọi mã trong danh mục đều có luật hạn mức, không mã nào bị bỏ sót', () => {
    const coLuat = new Set(CARD_POLICY_RULES.map(r => r.code));
    for (const p of CARD_POLICIES) {
      expect(coLuat.has(p.code)).toBe(true);
    }
  });

  it('mọi mã đều khai trần trên — không mã nào để hệ thống cấp vô hạn ngoài A1', () => {
    for (const r of CARD_POLICY_RULES) {
      if (r.code.startsWith('A1_')) continue;
      expect(r.maxLimit).toBeGreaterThan(0);
    }
  });
});

describe('cardLimitFromMatrix — ma trận chức danh × xếp hạng', () => {
  const b3 = cardPolicyRuleOf('B3_KHCN_KHONG TSBD_QHVB_LANH DAO DN VIP')!;

  it('tra đúng ô giao của chức danh và xếp hạng', () => {
    const m = b3.matrix;
    expect(cardLimitFromMatrix(m, 'Thành viên góp vốn/Chủ tịch HĐQT, HĐTV', 'Platinum')).toBe(300_000_000);
    expect(cardLimitFromMatrix(m, 'Tổng Giám đốc/Giám đốc điều hành', 'Bronze')).toBe(50_000_000);
    expect(cardLimitFromMatrix(m, 'Kế toán trưởng/Giám đốc tài chính', 'Gold')).toBe(100_000_000);
  });

  it('không phân biệt hoa thường ở chức danh', () => {
    expect(cardLimitFromMatrix(b3.matrix, 'tổng giám đốc/giám đốc điều hành', 'Gold')).toBe(150_000_000);
  });

  it('chức danh hoặc xếp hạng không có thì trả 0, không ném lỗi', () => {
    expect(cardLimitFromMatrix(b3.matrix, 'Bảo vệ', 'Platinum')).toBe(0);
    expect(cardLimitFromMatrix(b3.matrix, 'Kế toán trưởng/Giám đốc tài chính', 'Vàng')).toBe(0);
    expect(cardLimitFromMatrix(undefined, 'x', 'y')).toBe(0);
  });

  it('mọi hàng khai đủ năm xếp hạng, không hàng nào hở', () => {
    for (const row of b3.matrix!.rows) {
      for (const r of b3.matrix!.ratings) {
        expect(typeof row.byRating[r]).toBe('number');
      }
    }
  });

  it('trần của mã bằng đúng ô lớn nhất trong ma trận', () => {
    const max = Math.max(...b3.matrix!.rows.flatMap(r => Object.values(r.byRating)));
    expect(b3.maxLimit).toBe(max);
  });
});

describe('brackets — nhánh phụ có hệ số khác nhau', () => {
  const b6 = cardPolicyRuleOf('B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK')!;

  it('B6 có hai nhánh, hệ số và trần khác nhau', () => {
    expect(b6.brackets).toHaveLength(2);
    expect(b6.brackets![0].limitRule).toContain('04 ×');
    expect(b6.brackets![0].maxLimit).toBe(200_000_000);
    expect(b6.brackets![1].limitRule).toContain('03 ×');
    expect(b6.brackets![1].maxLimit).toBe(30_000_000);
  });

  it('trần của mã bằng trần nhánh cao nhất', () => {
    const max = Math.max(...b6.brackets!.map(b => b.maxLimit ?? 0));
    expect(b6.maxLimit).toBe(max);
  });
});
