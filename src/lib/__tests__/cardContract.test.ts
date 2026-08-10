import { describe, it, expect } from 'vitest';
import {
  CARD_POLICIES,
  CARD_POLICY_SOURCE,
  CARD_PRODUCTS,
  CARD_TENOR_MONTHS,
  MAX_SUPPLEMENTARY_PER_CONTRACT,
  cardContractGrantedLimit,
  cardPoliciesForCollateralKind,
  activeCardPolicies,
  cardPolicyKeyOf,
  cardPolicyOf,
  normalizePolicyRef,
  cardProductOf,
  checkCardContract,
  findCardContractNumberClash,
  formatCardContractNumber,
  isDebitCard,
  nextCardContractNumber,
  parseCardContractNumber,
  parseCardProducts,
  searchCardPolicies,
  totalCardGrantedLimit,
} from '../cardContract';
import type { CardPolicy } from '../cardContract';
import type { CardContract } from '../../types';

const hd = (o: Partial<CardContract>): CardContract => ({
  Id: 1, CustomerId: 1, CardContractNumber: 'NAT/2026/001', CardHolderSide: 'KH',
  ...o,
} as CardContract);

describe('số hợp đồng thẻ NAT/20XX/YYY', () => {
  it('dựng số theo đúng dạng, số thứ tự ba chữ số', () => {
    expect(formatCardContractNumber(2026, 1)).toBe('NAT/2026/001');
    expect(formatCardContractNumber(2026, 42)).toBe('NAT/2026/042');
    expect(formatCardContractNumber(2026, 123)).toBe('NAT/2026/123');
  });

  it('số thứ tự vượt ba chữ số thì không cắt', () => {
    expect(formatCardContractNumber(2026, 1234)).toBe('NAT/2026/1234');
  });

  it('đọc lại được số đã dựng', () => {
    expect(parseCardContractNumber('NAT/2026/001')).toEqual({ year: 2026, seq: 1 });
    expect(parseCardContractNumber('nat/2026/007')).toEqual({ year: 2026, seq: 7 });
    expect(parseCardContractNumber(' NAT/2026/012 ')).toEqual({ year: 2026, seq: 12 });
  });

  it('từ chối số sai dạng', () => {
    expect(parseCardContractNumber('NAT/26/001')).toBeNull();
    expect(parseCardContractNumber('VB/2026/001')).toBeNull();
    expect(parseCardContractNumber('NAT-2026-001')).toBeNull();
    expect(parseCardContractNumber('')).toBeNull();
    expect(parseCardContractNumber(null)).toBeNull();
  });

  it('lấy MAX rồi cộng 1, không đếm số dòng', () => {
    const existing = [
      hd({ CardContractNumber: 'NAT/2026/001' }),
      hd({ CardContractNumber: 'NAT/2026/003' }),
    ];
    expect(nextCardContractNumber(2026, existing)).toBe('NAT/2026/004');
  });

  it('đếm riêng theo năm — sang năm mới thì về 001', () => {
    const existing = [
      hd({ CardContractNumber: 'NAT/2025/009' }),
      hd({ CardContractNumber: 'NAT/2026/002' }),
    ];
    expect(nextCardContractNumber(2027, existing)).toBe('NAT/2027/001');
    expect(nextCardContractNumber(2026, existing)).toBe('NAT/2026/003');
  });

  it('bỏ qua số sai dạng khi tính số kế tiếp', () => {
    const existing = [hd({ CardContractNumber: 'rác' }), hd({ CardContractNumber: 'NAT/2026/005' })];
    expect(nextCardContractNumber(2026, existing)).toBe('NAT/2026/006');
  });

  it('bắt trùng số theo dạng chuẩn hoá, bỏ qua chính nó', () => {
    const existing = [hd({ Id: 7, CardContractNumber: 'NAT/2026/001' })];
    expect(findCardContractNumberClash('nat/2026/001 ', null, existing)?.Id).toBe(7);
    expect(findCardContractNumberClash('NAT/2026/001', 7, existing)).toBeNull();
    expect(findCardContractNumberClash('NAT/2026/002', null, existing)).toBeNull();
  });
});

describe('loại thẻ', () => {
  it('có đủ năm dòng thẻ tín dụng và thẻ ghi nợ ATM', () => {
    expect(CARD_PRODUCTS.filter(p => p.kind === 'credit')).toHaveLength(5);
    expect(CARD_PRODUCTS.filter(p => p.kind === 'debit')).toHaveLength(1);
  });

  it('tra được thương hiệu của từng dòng thẻ', () => {
    expect(cardProductOf('Vietbank Visa Luxury')?.brand).toBe('Visa');
    expect(cardProductOf('Vietbank Mastercard Happy')?.brand).toBe('Mastercard');
    expect(cardProductOf('Vietbank Napas')?.brand).toBe('Napas');
  });

  it('tách được nhiều loại thẻ trên một hợp đồng', () => {
    const c = hd({ CardProducts: 'Vietbank Visa Luxury;Vietbank Mastercard Happy;Vietbank Napas' });
    expect(parseCardProducts(c)).toHaveLength(3);
  });

  it('thời hạn cố định 60 tháng', () => {
    expect(CARD_TENOR_MONTHS).toBe(60);
  });
});

describe('hạn mức DÙNG CHUNG cho nhiều thương hiệu thẻ', () => {
  it('ba thương hiệu trên một hợp đồng chỉ tiêu tốn hạn mức MỘT lần', () => {
    const c = hd({
      CardProducts: 'Vietbank Visa Luxury;Vietbank Mastercard Happy;Vietbank Napas',
      GrantedLimit: 200_000_000,
    });
    expect(cardContractGrantedLimit(c)).toBe(200_000_000);
  });

  it('KH và vợ/chồng là hai hợp đồng riêng nên hạn mức CỘNG lại', () => {
    const cs = [
      hd({ Id: 1, CardHolderSide: 'KH', CardProducts: 'Vietbank Visa Luxury', GrantedLimit: 200_000_000 }),
      hd({ Id: 2, CardHolderSide: 'KHLQ', CardProducts: 'Vietbank Visa My Style', GrantedLimit: 100_000_000 }),
    ];
    expect(totalCardGrantedLimit(cs)).toBe(300_000_000);
  });

  it('hợp đồng đã đóng không còn tiêu tốn hạn mức', () => {
    const cs = [
      hd({ Id: 1, CardProducts: 'Vietbank Visa Luxury', GrantedLimit: 200_000_000 }),
      hd({ Id: 2, CardProducts: 'Vietbank Napas', GrantedLimit: 500_000_000, IsClosed: true }),
    ];
    expect(totalCardGrantedLimit(cs)).toBe(200_000_000);
  });

  it('THẺ GHI NỢ không có hạn mức tín dụng, không tiêu tốn khả năng bảo đảm', () => {
    const c = hd({ CardProducts: 'Thẻ ghi nợ ATM', GrantedLimit: 50_000_000 });
    expect(isDebitCard(c)).toBe(true);
    expect(cardContractGrantedLimit(c)).toBe(0);
  });

  it('hợp đồng lẫn thẻ tín dụng và ghi nợ thì KHÔNG coi là ghi nợ', () => {
    const c = hd({ CardProducts: 'Vietbank Visa Luxury;Thẻ ghi nợ ATM', GrantedLimit: 100_000_000 });
    expect(isDebitCard(c)).toBe(false);
    expect(cardContractGrantedLimit(c)).toBe(100_000_000);
  });

  it('chưa khai loại thẻ thì không suy là ghi nợ', () => {
    expect(isDebitCard(hd({ CardProducts: null }))).toBe(false);
  });
});

describe('mã chính sách phát hành thẻ', () => {
  it('có đúng 15 mã theo Phụ lục 02 QĐ 1017/2025', () => {
    expect(CARD_POLICIES).toHaveLength(15);
  });

  it('mã không trùng nhau', () => {
    const codes = CARD_POLICIES.map(p => p.code);
    expect(new Set(codes).size).toBe(15);
  });

  it('đã chuẩn hoá TSDB thành TSBD ở cả 15 mã', () => {
    expect(CARD_POLICIES.filter(p => p.code.includes('TSDB'))).toHaveLength(0);
    expect(CARD_POLICIES.filter(p => p.code.includes('TSBD'))).toHaveLength(15);
  });

  it('hai mã nhóm A gắn với TSBĐ, mười ba mã nhóm B không TSBĐ', () => {
    expect(cardPoliciesForCollateralKind('TIEN_GUI').map(p => p.code)).toEqual(['A1_KHCN_TSBD_TIEN GUI']);
    expect(cardPoliciesForCollateralKind('CO_TSBD').map(p => p.code)).toEqual(['A2_KHCN_TSBD_BDS']);
    expect(cardPoliciesForCollateralKind('KHONG_TSBD')).toHaveLength(13);
  });

  it('tra được mã, không phân biệt hoa thường', () => {
    expect(cardPolicyOf('a2_khcn_tsbd_bds')?.group).toBe('KHCN có TSBĐ BĐS');
    expect(cardPolicyOf('không có')).toBeNull();
    expect(cardPolicyOf(null)).toBeNull();
  });

  it('tìm theo mã, theo nhóm và theo đối tượng', () => {
    expect(searchCardPolicies('bảo hiểm').map(p => p.code)).toEqual(['B4_KHCN_KHONG TSBD_NGOAITHUNHAP_BAO HIEM']);
    expect(searchCardPolicies('B13')).toHaveLength(1);
    expect(searchCardPolicies('thu nhập').length).toBeGreaterThan(1);
    expect(searchCardPolicies('')).toHaveLength(15);
  });
});

describe('checkCardContract — chặn trạng thái vô lý', () => {
  const hopLe: Parameters<typeof checkCardContract>[0]['contract'] = {
    CardContractNumber: 'NAT/2026/001',
    CustomerId: 1,
    CardProducts: 'Vietbank Visa Luxury',
    GrantedLimit: 200_000_000,
    PolicyCode: 'B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK',
    CollateralKind: 'KHONG_TSBD',
    CollateralId: null,
  };

  const chay = (o: Partial<typeof hopLe> = {}, sup: { FullName: string; Relation: string }[] = []) =>
    checkCardContract({
      contract: { ...hopLe, ...o },
      supplementaries: sup,
      existing: [],
    });

  it('hồ sơ hợp lệ không có lỗi nào', () => {
    expect(chay()).toEqual([]);
  });

  it('CHẶN số hợp đồng sai dạng', () => {
    expect(chay({ CardContractNumber: 'NAT/26/1' }).some(i => i.field === 'CardContractNumber')).toBe(true);
  });

  it('CHẶN trùng số hợp đồng thẻ', () => {
    const r = checkCardContract({
      contract: hopLe,
      supplementaries: [],
      existing: [{ Id: 9, CardContractNumber: 'NAT/2026/001' } as never],
    });
    expect(r.some(i => i.field === 'CardContractNumber')).toBe(true);
  });

  it('CHẶN chưa chọn loại thẻ', () => {
    expect(chay({ CardProducts: '' }).some(i => i.field === 'CardProducts')).toBe(true);
  });

  it('CHẶN thẻ tín dụng không có hạn mức', () => {
    expect(chay({ GrantedLimit: 0 }).some(i => i.field === 'GrantedLimit')).toBe(true);
  });

  it('CHẶN thẻ ghi nợ mà lại khai hạn mức', () => {
    const r = chay({ CardProducts: 'Thẻ ghi nợ ATM', GrantedLimit: 50_000_000, PolicyCode: '' });
    expect(r.some(i => i.field === 'GrantedLimit')).toBe(true);
  });

  it('thẻ ghi nợ không cần mã chính sách', () => {
    const r = chay({ CardProducts: 'Thẻ ghi nợ ATM', GrantedLimit: 0, PolicyCode: '' });
    expect(r.some(i => i.field === 'PolicyCode')).toBe(false);
  });

  it('CHẶN thẻ tín dụng thiếu mã chính sách', () => {
    expect(chay({ PolicyCode: '' }).some(i => i.field === 'PolicyCode')).toBe(true);
  });

  it('CHẶN mã chính sách không khớp loại TSBĐ — mã A1 mà khai không TSBĐ', () => {
    const r = chay({ PolicyCode: 'A1_KHCN_TSBD_TIEN GUI', CollateralKind: 'KHONG_TSBD' });
    expect(r.some(i => i.field === 'CollateralKind')).toBe(true);
    expect(r.find(i => i.field === 'CollateralKind')?.message).toContain('tiền gửi');
  });

  it('mã A2 kèm TSBĐ thật và có gán tài sản thì hợp lệ', () => {
    const r = chay({ PolicyCode: 'A2_KHCN_TSBD_BDS', CollateralKind: 'CO_TSBD', CollateralId: 5 });
    expect(r).toEqual([]);
  });

  it('CHẶN khoản có TSBĐ mà chưa gán tài sản', () => {
    const r = chay({ PolicyCode: 'A2_KHCN_TSBD_BDS', CollateralKind: 'CO_TSBD', CollateralId: null });
    expect(r.some(i => i.field === 'CollateralId')).toBe(true);
  });

  it('CHẶN quá hai thẻ phụ', () => {
    const sup = [
      { FullName: 'A', Relation: 'Bố/Mẹ' },
      { FullName: 'B', Relation: 'Anh/Chị/Em' },
      { FullName: 'C', Relation: 'Khác' },
    ];
    const r = chay({}, sup);
    expect(r.some(i => i.field === 'supplementaries')).toBe(true);
    expect(MAX_SUPPLEMENTARY_PER_CONTRACT).toBe(2);
  });

  it('đúng hai thẻ phụ khai đủ thì hợp lệ', () => {
    const r = chay({}, [
      { FullName: 'Nguyễn Văn A', Relation: 'Bố/Mẹ' },
      { FullName: 'Nguyễn Thị B', Relation: 'Anh/Chị/Em' },
    ]);
    expect(r).toEqual([]);
  });

  it('CHẶN thẻ phụ thiếu tên hoặc thiếu quan hệ, nêu đúng thẻ phụ thứ mấy', () => {
    const r = chay({}, [{ FullName: '', Relation: '' }]);
    expect(r.filter(i => i.field.startsWith('supplementaries.0'))).toHaveLength(2);
    expect(r.some(i => i.message.includes('Thẻ phụ 1'))).toBe(true);
  });
});

describe('khoá bền của mã chính sách — đổi mã không làm mồ côi hồ sơ cũ', () => {
  it('mọi mã có khoá bền ngắn, không trùng nhau', () => {
    const keys = CARD_POLICIES.map(p => p.key);
    expect(new Set(keys).size).toBe(15);
    expect(keys).toContain('A1');
    expect(keys).toContain('B13');
  });

  it('khoá bền là tiền tố của mã chính thức — dễ đối chiếu bằng mắt', () => {
    for (const p of CARD_POLICIES) {
      expect(p.code.startsWith(p.key + '_')).toBe(true);
    }
  });

  it('tra được bằng KHOÁ BỀN — đây là giá trị lưu xuống CSDL', () => {
    expect(cardPolicyOf('B6')?.code).toBe('B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK');
    expect(cardPolicyOf('b13')?.key).toBe('B13');
  });

  it('vẫn tra được bằng mã chính thức đầy đủ', () => {
    expect(cardPolicyOf('B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK')?.key).toBe('B6');
  });

  it('bỏ qua khác biệt dấu cách quanh gạch dưới — bản gốc khai không nhất quán', () => {
    expect(cardPolicyOf('B6_KHCN_KHONG TSBD_THUNHAP_LUONG QUA VIETBANK')?.key).toBe('B6');
    expect(cardPolicyOf('  b6_khcn_khong tsbd_thunhap_ luong qua vietbank  ')?.key).toBe('B6');
  });

  it('tra được bằng MÃ CŨ qua aliases — hồ sơ khai theo quyết định trước vẫn đọc được', () => {
    const goc = CARD_POLICIES.find(p => p.key === 'B11')!;
    const voiAlias: CardPolicy = { ...goc, aliases: ['B11_KHCN_KHONG TSDB_THUNHAP_HOKINHDOANH'] };
    expect(voiAlias.aliases).toHaveLength(1);
    expect(normalizePolicyRef('B11_KHCN_KHONG TSDB_THUNHAP_HOKINHDOANH'))
      .toBe('b11_khcn_khong tsdb_thunhap_hokinhdoanh');
  });

  it('cardPolicyKeyOf chuẩn hoá mọi cách viết về một khoá — dùng lúc lưu', () => {
    expect(cardPolicyKeyOf('B6')).toBe('B6');
    expect(cardPolicyKeyOf('B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK')).toBe('B6');
    expect(cardPolicyKeyOf('không có mã này')).toBeNull();
  });

  it('activeCardPolicies bỏ mã đã ngưng dùng, cardPolicyOf vẫn tra được nó', () => {
    expect(activeCardPolicies()).toHaveLength(15);
    const ngung: CardPolicy = { ...CARD_POLICIES[0], key: 'X9', code: 'X9_CU', retiredAt: '2025-04-28' };
    expect([ngung].filter(p => !p.retiredAt)).toHaveLength(0);
  });

  it('tìm kiếm nhận cả khoá bền lẫn mã chính thức', () => {
    expect(searchCardPolicies('B13')).toHaveLength(1);
    expect(searchCardPolicies('BXH_SANCK')).toHaveLength(1);
  });

  it('xuất xứ văn bản khai đủ để banker biết dữ liệu có còn mới', () => {
    expect(CARD_POLICY_SOURCE.decision).toBe('1017/2025/QĐ-TGĐ');
    expect(CARD_POLICY_SOURCE.effectiveDate).toBe('2025-04-28');
    expect(CARD_POLICY_SOURCE.revision).toBe('02');
    expect(CARD_POLICY_SOURCE.supersedes).toContain('2630/2024/QĐ-TGĐ');
  });
});
