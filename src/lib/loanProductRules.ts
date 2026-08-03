/**
 * Quy tắc sản phẩm tín dụng — nguồn duy nhất cho mọi ràng buộc theo phương
 * thức vay: mục đích vay hợp lệ, kỳ hạn, ân hạn gốc, phương thức trả nợ
 * mặc định.
 *
 * Đặt tập trung ở đây thay vì rải điều kiện `if (LoanMethod === ...)` khắp
 * biểu mẫu — dự án này đã trả giá nhiều lần cho việc chép cùng một quy tắc
 * ra nhiều nơi rồi để chúng trôi dạt khác nhau.
 */

/** Giá trị lưu trong CSDL giữ nguyên; chỉ nhãn hiển thị được viết lại. */
export const LOAN_PURPOSES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Kinh doanh',          label: 'Sản xuất kinh doanh' },
  { value: 'Tiêu dùng',           label: 'Tiêu dùng phục vụ đời sống' },
  { value: 'Sửa chữa nhà',        label: 'Xây / sửa chữa nhà' },
  { value: 'Mua bất động sản',    label: 'Mua nhà / bất động sản' },
  { value: 'Khác',                label: 'Khác' },
];

export function purposeLabel(value?: string | null): string {
  if (!value) return '';
  return LOAN_PURPOSES.find(p => p.value === value)?.label ?? value;
}

export interface LoanProductRule {
  /** Mục đích vay được phép. Rỗng = không giới hạn. */
  purposes: string[];
  /** Mục đích tự điền khi chọn phương thức vay này. */
  defaultPurpose?: string;
  /** Khoá ô mục đích vay (chỉ một lựa chọn duy nhất theo sản phẩm). */
  lockPurpose: boolean;
  /** Kỳ hạn hợp lệ, tính theo tháng. */
  tenor: { min: number; max: number; typical?: number[] };
  /** Các mức ân hạn gốc cho phép. Rỗng = sản phẩm không có ân hạn. */
  graceMonths: number[];
  defaultPrincipalMethod: string;
  defaultInterestMethod: string;
  /** Mô tả ngắn hiện trên biểu mẫu để banker biết ràng buộc. */
  note?: string;
}

const PERMISSIVE: LoanProductRule = {
  purposes: [],
  lockPurpose: false,
  tenor: { min: 1, max: 360 },
  graceMonths: [],
  defaultPrincipalMethod: 'Gốc trả cuối kỳ',
  defaultInterestMethod: 'Trả hàng tháng theo dư nợ thực tế',
};

const RULES: Record<string, LoanProductRule> = {
  // Vay ngắn hạn, một mục đích duy nhất là sản xuất kinh doanh
  'Hạn mức tín dụng': {
    purposes: ['Kinh doanh'],
    defaultPurpose: 'Kinh doanh',
    lockPurpose: true,
    tenor: { min: 12, max: 24, typical: [12, 24] },
    graceMonths: [],
    defaultPrincipalMethod: 'Gốc trả cuối kỳ',
    defaultInterestMethod: 'Trả hàng tháng theo dư nợ thực tế',
    note: 'Vay ngắn hạn phục vụ sản xuất kinh doanh. Kỳ hạn thường 12 hoặc 24 tháng.',
  },

  // Vay dài hạn phục vụ đời sống
  'Cho vay từng lần': {
    purposes: ['Tiêu dùng', 'Sửa chữa nhà', 'Mua bất động sản'],
    defaultPurpose: 'Tiêu dùng',
    lockPurpose: false,
    tenor: { min: 60, max: 360 },
    graceMonths: [6, 12, 15, 18, 24, 36],
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
    defaultPrincipalMethod: 'Thanh toán dư nợ tối thiểu hàng tháng',
    defaultInterestMethod: 'Tính theo sao kê hàng tháng',
  },
};

/**
 * Quy tắc của một phương thức vay. Phương thức chưa khai báo ràng buộc
 * riêng sẽ dùng bộ mặc định thoáng, giữ nguyên hành vi cũ.
 */
export function getLoanProductRule(loanMethod?: string | null): LoanProductRule {
  if (!loanMethod) return PERMISSIVE;
  return RULES[loanMethod] ?? PERMISSIVE;
}

/** Danh sách mục đích vay được phép, kèm nhãn hiển thị. */
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

/**
 * Kiểm tra kỳ hạn so với sản phẩm. Chỉ CẢNH BÁO, không chặn — nghiệp vụ
 * ngân hàng có ngoại lệ được phê duyệt.
 */
export function checkTenor(loanMethod: string | null | undefined, months: number): RuleCheck {
  const rule = getLoanProductRule(loanMethod);
  if (!months || months <= 0) return { ok: true };
  if (months < rule.tenor.min || months > rule.tenor.max) {
    const namMin = rule.tenor.min % 12 === 0 ? ` (${rule.tenor.min / 12} năm)` : '';
    const namMax = rule.tenor.max % 12 === 0 ? ` (${rule.tenor.max / 12} năm)` : '';
    return {
      ok: false,
      message:
        `Kỳ hạn ${months} tháng nằm ngoài khoảng thông thường của "${loanMethod}": ` +
        `${rule.tenor.min}${namMin} đến ${rule.tenor.max} tháng${namMax}. ` +
        `Chỉ tiếp tục khi đã có phê duyệt ngoại lệ.`,
    };
  }
  return { ok: true };
}

/** Kiểm tra mục đích vay có thuộc sản phẩm hay không. */
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

/** Kiểm tra mức ân hạn gốc. */
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
