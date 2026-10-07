import type { Collateral, Customer } from '../types';
import { appraisalExpiryDate } from './collateralMath';
import { validateNationalId, validatePhone } from './customerValidation';
import type { ExtractedCollateral, ExtractedCustomer } from './ai/creditExtract';

/** Khách hàng mới theo đúng các trường form khách hàng lưu (họ tên viết hoa như form). */
export function customerToCreate(c: ExtractedCustomer): Partial<Customer> {
  const married = c.maritalStatus === 'Đã kết hôn';
  return {
    CifKh: c.cif.trim(),
    FullName: c.fullName.trim().toUpperCase(),
    NationalId: c.nationalId || null,
    IdCardIssueDate: c.idCardIssueDate || null,
    IdCardIssuePlace: c.idCardIssuePlace || null,
    Phone: c.phone || null,
    Email: c.email || null,
    Address: c.address || null,
    MaritalStatus: c.maritalStatus,
    KhlqRelationship: married && c.spouseName ? 'Vợ / Chồng' : 'Không có KHLQ',
    SpouseName: c.spouseName.trim().toUpperCase() || null,
    SpouseNationalId: c.spouseNationalId || null,
    SpousePhone: c.spousePhone || null,
    ...(c.monthlyIncome !== null ? { MonthlyIncome: c.monthlyIncome } : {}),
  };
}

const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || v === 0;

export interface BlankFill {
  patch: Partial<Customer>;
  /** Tên các ô được điền, để báo cho người dùng. */
  labels: string[];
}

/**
 * Khách hàng đã có: chỉ điền những ô còn trống bằng thông tin trong hồ sơ, không ghi đè thông tin đã nhập.
 * Tình trạng hôn nhân và quan hệ KHLQ chỉ đổi khi khách hàng chưa có người phụ thuộc nào được ghi.
 */
export function fillCustomerBlanks(existing: Customer, ext: ExtractedCustomer): BlankFill {
  const patch: Partial<Customer> = {};
  const labels: string[] = [];
  const put = <K extends keyof Customer>(key: K, value: Customer[K] | null, label: string) => {
    if (value === null || value === undefined || value === '' || !isBlank(existing[key])) return;
    patch[key] = value;
    labels.push(label);
  };

  put('NationalId', ext.nationalId || null, 'Số CCCD');
  put('IdCardIssueDate', ext.idCardIssueDate || null, 'Ngày cấp CCCD');
  put('IdCardIssuePlace', ext.idCardIssuePlace || null, 'Nơi cấp CCCD');
  put('Phone', ext.phone || null, 'Số điện thoại');
  put('Email', ext.email || null, 'Email');
  put('Address', ext.address || null, 'Địa chỉ');
  if (ext.monthlyIncome !== null) put('MonthlyIncome', ext.monthlyIncome, 'Thu nhập');

  if (ext.spouseName && isBlank(existing.SpouseName)) {
    patch.SpouseName = ext.spouseName.trim().toUpperCase();
    patch.MaritalStatus = 'Đã kết hôn';
    patch.KhlqRelationship = existing.KhlqRelationship && existing.KhlqRelationship !== 'Không có KHLQ' ? existing.KhlqRelationship : 'Vợ / Chồng';
    labels.push('Vợ / Chồng');
    put('SpouseNationalId', ext.spouseNationalId || null, 'CCCD vợ/chồng');
    put('SpousePhone', ext.spousePhone || null, 'SĐT vợ/chồng');
  }
  return { patch, labels };
}

/** Lỗi nhập liệu trước khi ghi; null nếu hợp lệ. `matched` = khách hàng đã có trong hệ thống. */
export function validateCreditIntake(customer: ExtractedCustomer, collaterals: ExtractedCollateral[], matched: boolean): string | null {
  if (!matched) {
    if (!customer.fullName.trim()) return 'Nhập họ tên khách hàng.';
    if (!customer.cif.trim()) return 'Nhập mã CIF khách hàng (hệ thống bắt buộc, hồ sơ này chưa nêu).';
  }
  const id = validateNationalId(customer.nationalId, 'Số CCCD');
  if (id) return id;
  const phone = validatePhone(customer.phone, 'Số điện thoại');
  if (phone) return phone;
  if (customer.spouseNationalId) {
    const spouse = validateNationalId(customer.spouseNationalId, 'CCCD vợ/chồng');
    if (spouse) return spouse;
  }
  if (matched && !customer.cif.trim() && !customer.nationalId.trim() && collaterals.length === 0) return 'Không có gì để ghi.';
  for (const [i, c] of collaterals.entries()) {
    const label = `Tài sản ${i + 1}`;
    if (c.appraisedValue === null || c.appraisedValue <= 0) return `${label}: nhập giá trị định giá.`;
    if (!c.assetType) return `${label}: chọn loại tài sản.`;
    if (c.ltvPercent < 0 || c.ltvPercent > 100) return `${label}: tỷ lệ LTV phải từ 0 đến 100.`;
  }
  return null;
}

/**
 * Chủ tài sản ghi trong hồ sơ khác người vay: tài sản vẫn gắn với người vay (hệ thống chưa có chỗ lưu chủ tài sản riêng),
 * nên người dùng cần được báo để kiểm tra. So sánh không phân biệt hoa thường và khoảng trắng.
 */
export function ownerDiffers(ownerName: string, borrowerName: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(ownerName) !== '' && norm(borrowerName) !== '' && norm(ownerName) !== norm(borrowerName);
}

/** Tài sản bảo đảm theo đúng các trường form định giá TSĐB lưu. */
export function collateralToSave(customerId: number, c: ExtractedCollateral): Partial<Collateral> {
  const expiry = appraisalExpiryDate({ AppraisalDate: c.appraisalDate || null, AppraisalTenorMonths: c.tenorMonths });
  return {
    CustomerId: customerId,
    AssetCode: c.assetCode.trim() || null,
    AssetType: c.assetType,
    Address: c.address.trim() || null,
    AppraisedValue: c.appraisedValue ?? 0,
    Value: c.appraisedValue ?? 0,
    LtvPercent: c.ltvPercent,
    AppraisalDate: c.appraisalDate || null,
    AppraisalTenorMonths: c.tenorMonths,
    AppraisalExpiryDate: c.appraisalDate ? expiry : null,
    Note: c.note.trim() || null,
  };
}
