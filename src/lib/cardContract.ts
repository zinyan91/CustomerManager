import type { CardContract, CardSupplementaryHolder } from '../types';

export const CARD_TENOR_MONTHS = 60;

export type CardBrand = 'Mastercard' | 'Visa' | 'Napas';
export type CardKind = 'credit' | 'debit';

export interface CardProduct {
  name: string;
  brand: CardBrand;
  kind: CardKind;
}

export const CARD_PRODUCTS: CardProduct[] = [
  { name: 'Vietbank Mastercard Lifecare', brand: 'Mastercard', kind: 'credit' },
  { name: 'Vietbank Mastercard Happy', brand: 'Mastercard', kind: 'credit' },
  { name: 'Vietbank Visa Luxury', brand: 'Visa', kind: 'credit' },
  { name: 'Vietbank Visa My Style', brand: 'Visa', kind: 'credit' },
  { name: 'Vietbank Napas', brand: 'Napas', kind: 'credit' },
  { name: 'Thẻ ghi nợ ATM', brand: 'Napas', kind: 'debit' },
];

export function cardProductOf(name?: string | null): CardProduct | null {
  const n = (name || '').trim().toLowerCase();
  if (!n) return null;
  return CARD_PRODUCTS.find(p => p.name.toLowerCase() === n) ?? null;
}

export function isDebitCard(contract: Pick<CardContract, 'CardProducts'>): boolean {
  const products = parseCardProducts(contract);
  if (products.length === 0) return false;
  return products.every(p => cardProductOf(p)?.kind === 'debit');
}

export function parseCardProducts(contract: Pick<CardContract, 'CardProducts'>): string[] {
  if (!contract.CardProducts) return [];
  return contract.CardProducts.split(';').map(s => s.trim()).filter(Boolean);
}

export type CardHolderSide = 'KH' | 'KHLQ';

export const CARD_HOLDER_SIDES: { value: CardHolderSide; label: string }[] = [
  { value: 'KH', label: 'Khách hàng' },
  { value: 'KHLQ', label: 'Khách hàng liên quan (vợ/chồng)' },
];

export type CardCollateralKind = 'KHONG_TSBD' | 'TIEN_GUI' | 'CO_TSBD';

export const CARD_COLLATERAL_KINDS: { value: CardCollateralKind; label: string }[] = [
  { value: 'KHONG_TSBD', label: 'Không có TSBĐ' },
  { value: 'TIEN_GUI', label: 'TSBĐ bằng tiền gửi tại Vietbank' },
  { value: 'CO_TSBD', label: 'Khoản cấp tín dụng có TSBĐ (BĐS, xe…)' },
];

export const SUPPLEMENTARY_RELATIONS = ['Bố/Mẹ', 'Anh/Chị/Em', 'Khác'];

export const MAX_SUPPLEMENTARY_PER_CONTRACT = 2;

export const CARD_POLICY_SOURCE = {
  decision: '1017/2025/QĐ-TGĐ',
  issuedDate: '2025-04-26',
  effectiveDate: '2025-04-28',
  revision: '02',
  supersedes: ['2630/2024/QĐ-TGĐ', '3296/2024/QĐ-TGĐ'],
  annex: 'Phụ lục 02 — Quy định về tiêu chí đánh giá, điều kiện riêng và hạn mức thẻ tín dụng',
};

export interface CardPolicy {
  key: string;
  code: string;
  group: string;
  subject: string;
  collateralKind: CardCollateralKind;
  aliases?: string[];
  retiredAt?: string;
  supersededByKey?: string;
}

export function normalizePolicyRef(v?: string | null): string {
  return (v || '')
    .trim()
    .toLowerCase()
    .replace(/\s*_\s*/g, '_')
    .replace(/\s+/g, ' ');
}

export const CARD_POLICIES: CardPolicy[] = [
  {
    key: 'A1',
    code: 'A1_KHCN_TSBD_TIEN GUI',
    group: 'KHCN có TSBĐ tiền gửi',
    subject: 'KHCN cầm cố tiền gửi có kỳ hạn mở tại Vietbank',
    collateralKind: 'TIEN_GUI',
  },
  {
    key: 'A2',
    code: 'A2_KHCN_TSBD_BDS',
    group: 'KHCN có TSBĐ BĐS',
    subject: 'KHCN thế chấp bất động sản (BĐS)',
    collateralKind: 'CO_TSBD',
  },
  {
    key: 'B1',
    code: 'B1_KHCN_KHONG TSBD_QHVB_TIEN GUI',
    group: 'KHCN căn cứ vào quan hệ với Vietbank',
    subject: 'KHCN đang có quan hệ tiền gửi tại Vietbank',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B2',
    code: 'B2_KHCN_KHONG TSBD_QHVB_TIN DUNG',
    group: 'KHCN căn cứ vào quan hệ với Vietbank',
    subject: 'KHCN đang có quan hệ tín dụng tại Vietbank',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B3',
    code: 'B3_KHCN_KHONG TSBD_QHVB_LANH DAO DN VIP',
    group: 'KHCN căn cứ vào quan hệ với Vietbank',
    subject: 'KHCN là thành viên góp vốn/Ban lãnh đạo/Chủ doanh nghiệp có xếp hạng KHDN tốt tại Vietbank',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B4',
    code: 'B4_KHCN_KHONG TSBD_NGOAITHUNHAP_BAO HIEM',
    group: 'KHCN căn cứ vào quan hệ với Vietbank',
    subject: 'KHCN tham gia các sản phẩm bảo hiểm của Vietbank',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B5',
    code: 'B5_KHCN_KHONG TSBD_QHVB_LANH DAO VIETBANK GIOI THIEU',
    group: 'KHCN căn cứ vào quan hệ với Vietbank',
    subject: 'KHCN do lãnh đạo Vietbank giới thiệu',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B6',
    code: 'B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK',
    group: 'KHCN căn cứ theo thu nhập',
    subject: 'KHCN nhận lương qua tài khoản mở tại Vietbank',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B7',
    code: 'B7_KHCN_KHONG TSBD_THUNHAP_ LUONG KHAC',
    group: 'KHCN căn cứ theo thu nhập',
    subject: 'KHCN nhận lương qua tài khoản mở tại Ngân hàng khác',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B8',
    code: 'B8_KHCN_KHONG TSBD_THUNHAP_CBNV NGAN HANG',
    group: 'KHCN căn cứ theo thu nhập',
    subject: 'KHCN làm việc tại các Ngân hàng khác',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B9',
    code: 'B9_KHCN_KHONG TSBD_NGOAITHUNHAP_THE TD NGAN HANG KHAC',
    group: 'KHCN căn cứ vào các yếu tố ngoài thu nhập',
    subject: 'KHCN sở hữu thẻ tín dụng của Ngân hàng khác (đã được thẩm định thẻ bởi các Ngân hàng uy tín)',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B10',
    code: 'B10_KHCN_KHONG TSBD_VITRIXAHOI_CBNV CQNN',
    group: 'KHCN căn cứ vào vị trí xã hội',
    subject: 'KHCN là CBNV thuộc các Đơn vị nhà nước',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B11',
    code: 'B11_KHCN_KHONG TSBD_THUNHAP_HOKINHDOANH',
    group: 'KHCN căn cứ vào yếu tố thu nhập từ hoạt động kinh doanh của Hộ kinh doanh cá thể',
    subject: 'KHCN là chủ Hộ kinh doanh cá thể',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B12',
    code: 'B12_KHCN_KHONG TSBD_DNBAOLANH',
    group: 'KHCN căn cứ vào quan hệ với Vietbank',
    subject: 'KHCN được bảo lãnh bởi Doanh nghiệp có quan hệ tín dụng',
    collateralKind: 'KHONG_TSBD',
  },
  {
    key: 'B13',
    code: 'B13_KHCN_KHONG TSBD_BXH_SANCK',
    group: 'KHCN căn cứ vào vị trí xếp hạng người giàu trên sàn chứng khoán',
    subject: 'KHCN nằm trong bảng xếp hạng top 200 người giàu trên sàn chứng khoán HOSE/HNX',
    collateralKind: 'KHONG_TSBD',
  },
];

export function cardPolicyOf(ref?: string | null): CardPolicy | null {
  const r = normalizePolicyRef(ref);
  if (!r) return null;

  const byKey = CARD_POLICIES.find(p => normalizePolicyRef(p.key) === r);
  if (byKey) return byKey;

  const byCode = CARD_POLICIES.find(p => normalizePolicyRef(p.code) === r);
  if (byCode) return byCode;

  return CARD_POLICIES.find(p =>
    (p.aliases ?? []).some(a => normalizePolicyRef(a) === r)
  ) ?? null;
}

export function cardPolicyKeyOf(ref?: string | null): string | null {
  return cardPolicyOf(ref)?.key ?? null;
}

export function activeCardPolicies(): CardPolicy[] {
  return CARD_POLICIES.filter(p => !p.retiredAt);
}

export function searchCardPolicies(query: string): CardPolicy[] {
  const q = normalizePolicyRef(query);
  if (!q) return CARD_POLICIES;
  return CARD_POLICIES.filter(p =>
    normalizePolicyRef(p.key).includes(q) ||
    normalizePolicyRef(p.code).includes(q) ||
    normalizePolicyRef(p.group).includes(q) ||
    normalizePolicyRef(p.subject).includes(q) ||
    (p.aliases ?? []).some(a => normalizePolicyRef(a).includes(q))
  );
}

export function cardPoliciesForCollateralKind(
  kind: CardCollateralKind,
  options?: { includeRetired?: boolean }
): CardPolicy[] {
  const pool = options?.includeRetired ? CARD_POLICIES : activeCardPolicies();
  return pool.filter(p => p.collateralKind === kind);
}

export const CARD_CONTRACT_PREFIX = 'NAT';

export function formatCardContractNumber(year: number, seq: number): string {
  return `${CARD_CONTRACT_PREFIX}/${year}/${String(seq).padStart(3, '0')}`;
}

export function parseCardContractNumber(
  no?: string | null
): { year: number; seq: number } | null {
  const m = (no || '').trim().match(/^NAT\/(\d{4})\/(\d+)$/i);
  if (!m) return null;
  return { year: parseInt(m[1], 10), seq: parseInt(m[2], 10) };
}

export function nextCardContractNumber(
  year: number,
  existing: Pick<CardContract, 'CardContractNumber'>[]
): string {
  let max = 0;
  for (const c of existing) {
    const p = parseCardContractNumber(c.CardContractNumber);
    if (p && p.year === year && p.seq > max) max = p.seq;
  }
  return formatCardContractNumber(year, max + 1);
}

export function normalizeCardContractNumber(no?: string | null): string {
  return (no || '').trim().toLowerCase();
}

export function findCardContractNumberClash(
  no: string,
  excludeId: number | null,
  existing: Pick<CardContract, 'Id' | 'CardContractNumber'>[]
): CardContract | null {
  const target = normalizeCardContractNumber(no);
  if (!target) return null;
  const hit = existing.find(
    c => c.Id !== excludeId && normalizeCardContractNumber(c.CardContractNumber) === target
  );
  return (hit as CardContract) ?? null;
}

export function cardContractGrantedLimit(
  contract: Pick<CardContract, 'GrantedLimit' | 'CardProducts'>
): number {
  if (isDebitCard(contract as CardContract)) return 0;
  return contract.GrantedLimit ?? 0;
}

export function totalCardGrantedLimit(contracts: Pick<CardContract, 'GrantedLimit' | 'CardProducts' | 'IsClosed'>[]): number {
  return contracts.reduce(
    (sum, c) => sum + (c.IsClosed ? 0 : cardContractGrantedLimit(c as CardContract)),
    0
  );
}

export interface CardContractIssue {
  level: 'error' | 'warn';
  field: string;
  message: string;
}

export function checkCardContract(input: {
  contract: Pick<
    CardContract,
    'CardContractNumber' | 'CustomerId' | 'CardProducts' | 'GrantedLimit' | 'PolicyCode' | 'CollateralKind' | 'CollateralId'
  >;
  supplementaries: Pick<CardSupplementaryHolder, 'FullName' | 'Relation'>[];
  existing: Pick<CardContract, 'Id' | 'CardContractNumber'>[];
  excludeId?: number | null;
}): CardContractIssue[] {
  const issues: CardContractIssue[] = [];
  const c = input.contract;

  if (!parseCardContractNumber(c.CardContractNumber)) {
    issues.push({
      level: 'error',
      field: 'CardContractNumber',
      message: 'Số hợp đồng thẻ phải theo dạng NAT/<năm>/<số thứ tự 3 chữ số>, ví dụ NAT/2026/001.',
    });
  }

  const clash = findCardContractNumberClash(
    c.CardContractNumber || '',
    input.excludeId ?? null,
    input.existing
  );
  if (clash) {
    issues.push({
      level: 'error',
      field: 'CardContractNumber',
      message: `Số hợp đồng thẻ ${c.CardContractNumber} đã dùng cho hợp đồng khác.`,
    });
  }

  const products = parseCardProducts(c);
  if (products.length === 0) {
    issues.push({ level: 'error', field: 'CardProducts', message: 'Chọn ít nhất một loại thẻ.' });
  }

  const laGhiNo = isDebitCard(c as CardContract);

  if (!laGhiNo && (c.GrantedLimit ?? 0) <= 0) {
    issues.push({
      level: 'error',
      field: 'GrantedLimit',
      message: 'Thẻ tín dụng phải có hạn mức được cấp lớn hơn 0.',
    });
  }

  if (laGhiNo && (c.GrantedLimit ?? 0) > 0) {
    issues.push({
      level: 'error',
      field: 'GrantedLimit',
      message: 'Thẻ ghi nợ không có hạn mức tín dụng — để trống ô hạn mức.',
    });
  }

  if (!laGhiNo && !(c.PolicyCode || '').trim()) {
    issues.push({
      level: 'error',
      field: 'PolicyCode',
      message: 'Chọn mã chính sách phát hành thẻ.',
    });
  }

  const policy = cardPolicyOf(c.PolicyCode);
  if (policy && c.CollateralKind && policy.collateralKind !== c.CollateralKind) {
    const dung = CARD_COLLATERAL_KINDS.find(k => k.value === policy.collateralKind)?.label;
    issues.push({
      level: 'error',
      field: 'CollateralKind',
      message: `Mã chính sách ${policy.code} chỉ áp cho "${dung}". Chọn lại mã hoặc loại TSBĐ cho khớp.`,
    });
  }

  if (c.CollateralKind === 'CO_TSBD' && !c.CollateralId) {
    issues.push({
      level: 'error',
      field: 'CollateralId',
      message: 'Khoản cấp tín dụng có TSBĐ phải gán tài sản bảo đảm.',
    });
  }

  if (input.supplementaries.length > MAX_SUPPLEMENTARY_PER_CONTRACT) {
    issues.push({
      level: 'error',
      field: 'supplementaries',
      message: `Một thẻ chính chỉ có tối đa ${MAX_SUPPLEMENTARY_PER_CONTRACT} thẻ phụ, đang khai ${input.supplementaries.length}.`,
    });
  }

  input.supplementaries.forEach((s, i) => {
    if (!(s.FullName || '').trim()) {
      issues.push({
        level: 'error',
        field: `supplementaries.${i}.FullName`,
        message: `Thẻ phụ ${i + 1}: chưa khai họ tên chủ thẻ phụ.`,
      });
    }
    if (!(s.Relation || '').trim()) {
      issues.push({
        level: 'error',
        field: `supplementaries.${i}.Relation`,
        message: `Thẻ phụ ${i + 1}: chưa khai mối quan hệ với chủ thẻ chính.`,
      });
    }
  });

  return issues;
}
