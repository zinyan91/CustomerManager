export const LOAN_PURPOSES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Kinh doanh',                             label: 'Sản xuất kinh doanh' },
  { value: 'Tiêu dùng',                              label: 'Tiêu dùng phục vụ đời sống' },
  { value: 'Sửa chữa nhà',                           label: 'Xây / sửa chữa nhà' },
  { value: 'Mua bất động sản',                       label: 'Mua nhà / bất động sản' },
  { value: 'Mua nhà ở hình thành trong tương lai',   label: 'Mua nhà ở hình thành trong tương lai (căn hộ/chung cư)' },
  { value: 'Khác',                                   label: 'Khác' },
];

export function purposeLabel(value?: string | null): string {
  if (!value) return '';
  return LOAN_PURPOSES.find(p => p.value === value)?.label ?? value;
}

export interface LoanProductRule {
  purposes: string[];

  defaultPurpose?: string;

  lockPurpose: boolean;

  tenor: { min: number; max: number; typical?: number[] };

  kunnTenor?: { min: number; max: number };

  graceMonths: number[];
  revolving: boolean;
  defaultPrincipalMethod: string;
  defaultInterestMethod: string;

  note?: string;
}

const PERMISSIVE: LoanProductRule = {
  purposes: [],
  lockPurpose: false,
  tenor: { min: 1, max: 360 },
  graceMonths: [],
  revolving: false,
  defaultPrincipalMethod: 'Gốc trả cuối kỳ',
  defaultInterestMethod: 'Trả hàng tháng theo dư nợ thực tế',
};

const RULES: Record<string, LoanProductRule> = {
  'Hạn mức tín dụng': {
    purposes: ['Kinh doanh'],
    defaultPurpose: 'Kinh doanh',
    lockPurpose: true,
    tenor: { min: 12, max: 24, typical: [12, 24] },
    kunnTenor: { min: 3, max: 12 },
    graceMonths: [],
    revolving: true,
    defaultPrincipalMethod: 'Gốc trả cuối kỳ',
    defaultInterestMethod: 'Trả hàng tháng theo dư nợ thực tế',
    note: 'Vay ngắn hạn phục vụ sản xuất kinh doanh. HĐTD 12 hoặc 24 tháng, mỗi KUNN 3 đến 12 tháng.',
  },

  'Cho vay từng lần': {
    purposes: ['Tiêu dùng', 'Sửa chữa nhà', 'Mua bất động sản', 'Mua nhà ở hình thành trong tương lai'],
    defaultPurpose: 'Tiêu dùng',
    lockPurpose: false,
    tenor: { min: 60, max: 360 },
    graceMonths: [6, 12, 15, 18, 24, 36],
    revolving: false,
    defaultPrincipalMethod: 'Trả đều hàng tháng',
    defaultInterestMethod: 'Trả hàng tháng theo dư nợ thực tế',
    note: 'Vay dài hạn phục vụ đời sống. Kỳ hạn từ 5 năm đến tối đa 30 năm.',
  },

  'Cầm cố sổ tiết kiệm': {
    ...PERMISSIVE,
    defaultPrincipalMethod: 'Gốc trả cuối kỳ',
    defaultInterestMethod: 'Trả cuối kỳ',
  },

  'Hạn mức thẻ tín dụng': {
    ...PERMISSIVE,
    revolving: true,
    defaultPrincipalMethod: 'Thanh toán dư nợ tối thiểu hàng tháng',
    defaultInterestMethod: 'Tính theo sao kê hàng tháng',
  },
};

export const PRINCIPAL_REPAY_OPTIONS = [
  'Gốc trả cuối kỳ',
  'Trả đều hàng tháng',
  'Trả đều hàng quý (3 tháng)',
  'Trả gốc tăng dần',
  'Thanh toán dư nợ tối thiểu hàng tháng',
  'Theo thỏa thuận trong KUNN'
];

export const INTEREST_REPAY_OPTIONS = [
  'Trả hàng tháng theo dư nợ thực tế',
  'Trả hàng tháng theo dư nợ giảm dần',
  'Trả hàng tháng theo dư nợ ban đầu',
  'Trả cuối kỳ',
  'Tính theo sao kê hàng tháng'
];

export function getLoanProductRule(loanMethod?: string | null): LoanProductRule {
  if (!loanMethod) return PERMISSIVE;
  return RULES[loanMethod] ?? PERMISSIVE;
}

export function allowedPurposes(loanMethod?: string | null) {
  const rule = getLoanProductRule(loanMethod);
  if (rule.purposes.length === 0) return LOAN_PURPOSES;
  return LOAN_PURPOSES.filter(p => rule.purposes.includes(p.value));
}

export function isPurposeLocked(loanMethod?: string | null): boolean {
  return getLoanProductRule(loanMethod).lockPurpose;
}

export function graceMonthOptions(loanMethod?: string | null): number[] {
  return getLoanProductRule(loanMethod).graceMonths;
}

export interface RuleCheck {
  ok: boolean;
  message?: string;
}

function checkTenorRange(
  loanMethod: string | null | undefined,
  months: number,
  range: { min: number; max: number },
  capName: string
): RuleCheck {
  if (!months || months <= 0) return { ok: true };
  if (months >= range.min && months <= range.max) return { ok: true };
  const namMin = range.min % 12 === 0 ? ` (${range.min / 12} năm)` : '';
  const namMax = range.max % 12 === 0 ? ` (${range.max / 12} năm)` : '';
  return {
    ok: false,
    message:
      `Kỳ hạn ${capName} ${months} tháng nằm ngoài khoảng thông thường của "${loanMethod}": ` +
      `${range.min}${namMin} đến ${range.max} tháng${namMax}. ` +
      `Chỉ tiếp tục khi đã có phê duyệt ngoại lệ.`,
  };
}

export function checkTenor(loanMethod: string | null | undefined, months: number): RuleCheck {
  const rule = getLoanProductRule(loanMethod);
  return checkTenorRange(loanMethod, months, rule.tenor, rule.kunnTenor ? 'HĐTD' : 'khoản vay');
}

export function checkKunnTenor(loanMethod: string | null | undefined, months: number): RuleCheck {
  const rule = getLoanProductRule(loanMethod);
  if (!rule.kunnTenor) return checkTenor(loanMethod, months);
  return checkTenorRange(loanMethod, months, rule.kunnTenor, 'KUNN');
}

export function checkPurpose(loanMethod: string | null | undefined, purpose?: string | null): RuleCheck {
  const rule = getLoanProductRule(loanMethod);
  if (rule.purposes.length === 0 || !purpose) return { ok: true };
  if (!rule.purposes.includes(purpose)) {
    return {
      ok: false,
      message:
        `Mục đích vay "${purposeLabel(purpose)}" không thuộc sản phẩm "${loanMethod}". ` +
        `Mục đích hợp lệ: ${rule.purposes.map(purposeLabel).join(', ')}.`,
    };
  }
  return { ok: true };
}

export function checkGrace(loanMethod: string | null | undefined, graceMonths?: number | null): RuleCheck {
  const rule = getLoanProductRule(loanMethod);
  const g = graceMonths ?? 0;
  if (g === 0) return { ok: true };
  if (rule.graceMonths.length === 0) {
    return { ok: false, message: `Sản phẩm "${loanMethod}" không áp dụng ân hạn gốc.` };
  }
  if (!rule.graceMonths.includes(g)) {
    return {
      ok: false,
      message: `Ân hạn gốc ${g} tháng không thuộc các mức cho phép: ${rule.graceMonths.join(', ')} tháng.`,
    };
  }
  return { ok: true };
}

export function isRevolvingCredit(loanMethod?: string | null): boolean {
  return getLoanProductRule(loanMethod).revolving;
}
