import { describe, it, expect } from 'vitest';
import { collateralToSave, customerToCreate, fillCustomerBlanks, ownerDiffers, validateCreditIntake } from '../creditIntake';
import type { Customer } from '../../types';
import type { ExtractedCollateral, ExtractedCustomer } from '../ai/creditExtract';

const ext = (over: Partial<ExtractedCustomer> = {}): ExtractedCustomer => ({
  cif: '12345678', fullName: 'Nguyễn Văn An', nationalId: '079090123456', idCardIssueDate: '2021-03-15', idCardIssuePlace: 'Cục CSQLHC',
  phone: '0901234567', email: 'an@x.vn', address: '12 Lê Lợi', accountNumber: '', maritalStatus: 'Độc thân',
  spouseName: '', spouseNationalId: '', spousePhone: '', monthlyIncome: null, ...over,
});
const col = (over: Partial<ExtractedCollateral> = {}): ExtractedCollateral => ({
  assetCode: 'CT-001', assetType: 'Bất động sản đất ở', address: 'Thửa 12', ownerName: '', appraisedValue: 2500000000, appraisalDate: '2026-09-10', tenorMonths: 6, ltvPercent: 80, note: '', ...over,
});
const existing = (over: Partial<Customer> = {}): Customer => ({ Id: 7, CifKh: '12345678', FullName: 'NGUYỄN VĂN AN', MaritalStatus: 'Độc thân', ...over });

describe('customerToCreate', () => {
  it('họ tên viết hoa, trường trống thành null, đúng các trường form khách hàng', () => {
    const p = customerToCreate(ext());
    expect(p).toMatchObject({ CifKh: '12345678', FullName: 'NGUYỄN VĂN AN', NationalId: '079090123456', Phone: '0901234567', KhlqRelationship: 'Không có KHLQ', SpouseName: null });
    expect(p).not.toHaveProperty('MonthlyIncome');
  });
  it('có vợ/chồng thì ghi quan hệ Vợ / Chồng', () => {
    const p = customerToCreate(ext({ maritalStatus: 'Đã kết hôn', spouseName: 'trần thị bình', spouseNationalId: '079191000111' }));
    expect(p).toMatchObject({ MaritalStatus: 'Đã kết hôn', SpouseName: 'TRẦN THỊ BÌNH', KhlqRelationship: 'Vợ / Chồng', SpouseNationalId: '079191000111' });
  });
  it('có thu nhập thì ghi', () => {
    expect(customerToCreate(ext({ monthlyIncome: 35000000 }))).toMatchObject({ MonthlyIncome: 35000000 });
  });
});

describe('fillCustomerBlanks', () => {
  it('chỉ điền ô còn trống, kèm tên các ô đã điền', () => {
    const { patch, labels } = fillCustomerBlanks(existing({ Phone: '0911111111' }), ext());
    expect(patch).toMatchObject({ NationalId: '079090123456', IdCardIssuePlace: 'Cục CSQLHC', Address: '12 Lê Lợi', Email: 'an@x.vn' });
    expect(patch).not.toHaveProperty('Phone');
    expect(labels).toContain('Số CCCD');
    expect(labels).not.toContain('Số điện thoại');
  });

  it('không ghi đè thông tin đã nhập, dù hồ sơ khác', () => {
    const { patch } = fillCustomerBlanks(existing({ NationalId: '111', Address: 'Địa chỉ cũ', Phone: '0911111111', Email: 'cu@x.vn', IdCardIssueDate: '2020-01-01', IdCardIssuePlace: 'Nơi cũ' }), ext());
    expect(patch).toEqual({});
  });

  it('hồ sơ không nêu thì không gán rỗng vào ô trống', () => {
    expect(fillCustomerBlanks(existing(), ext({ nationalId: '', phone: '', email: '', address: '', idCardIssueDate: '', idCardIssuePlace: '' })).patch).toEqual({});
  });

  it('thêm vợ/chồng khi khách chưa có, kèm tình trạng hôn nhân; có rồi thì giữ', () => {
    const add = fillCustomerBlanks(existing(), ext({ spouseName: 'trần thị bình', spouseNationalId: '079191000111' }));
    expect(add.patch).toMatchObject({ SpouseName: 'TRẦN THỊ BÌNH', MaritalStatus: 'Đã kết hôn', KhlqRelationship: 'Vợ / Chồng', SpouseNationalId: '079191000111' });
    expect(fillCustomerBlanks(existing({ SpouseName: 'NGƯỜI KHÁC' }), ext({ spouseName: 'trần thị bình' })).patch).not.toHaveProperty('SpouseName');
  });

  it('thu nhập đang 0 coi như chưa nhập', () => {
    expect(fillCustomerBlanks(existing({ MonthlyIncome: 0 }), ext({ monthlyIncome: 30000000 })).patch).toMatchObject({ MonthlyIncome: 30000000 });
    expect(fillCustomerBlanks(existing({ MonthlyIncome: 20000000 }), ext({ monthlyIncome: 30000000 })).patch).not.toHaveProperty('MonthlyIncome');
  });
});

describe('validateCreditIntake', () => {
  it('khách hàng mới bắt buộc có họ tên và CIF', () => {
    expect(validateCreditIntake(ext({ fullName: '' }), [], false)).toMatch(/họ tên/);
    expect(validateCreditIntake(ext({ cif: '' }), [], false)).toMatch(/CIF/);
    expect(validateCreditIntake(ext(), [col()], false)).toBeNull();
  });

  it('khách hàng đã có thì không cần CIF trong hồ sơ', () => {
    expect(validateCreditIntake(ext({ cif: '' }), [col()], true)).toBeNull();
  });

  it('CCCD và số điện thoại sai độ dài bị chặn', () => {
    expect(validateCreditIntake(ext({ nationalId: '12345' }), [], false)).toMatch(/CCCD/);
    expect(validateCreditIntake(ext({ phone: '09012' }), [], false)).toMatch(/điện thoại/);
    expect(validateCreditIntake(ext({ spouseNationalId: '1234' }), [], false)).toMatch(/vợ\/chồng/);
  });

  it('tài sản phải có giá trị định giá và LTV hợp lệ', () => {
    expect(validateCreditIntake(ext(), [col({ appraisedValue: null })], false)).toMatch(/Tài sản 1: nhập giá trị/);
    expect(validateCreditIntake(ext(), [col(), col({ appraisedValue: 0 })], false)).toMatch(/Tài sản 2/);
    expect(validateCreditIntake(ext(), [col({ ltvPercent: 120 })], false)).toMatch(/LTV/);
  });
});

describe('collateralToSave', () => {
  it('đúng các trường form định giá TSĐB, giá trị và giá trị định giá bằng nhau', () => {
    const p = collateralToSave(7, col());
    expect(p).toMatchObject({
      CustomerId: 7, AssetCode: 'CT-001', AssetType: 'Bất động sản đất ở', Address: 'Thửa 12', AppraisedValue: 2500000000, Value: 2500000000,
      LtvPercent: 80, AppraisalDate: '2026-09-10', AppraisalTenorMonths: 6, AppraisalExpiryDate: '2027-03-10',
    });
  });

  it('không có ngày định giá thì không có ngày hết hạn', () => {
    expect(collateralToSave(7, col({ appraisalDate: '' }))).toMatchObject({ AppraisalDate: null, AppraisalExpiryDate: null });
  });

  it('mã chứng thư trống thành null; ghi chú là ghi chú của tài sản, không lẫn chủ tài sản', () => {
    const p = collateralToSave(7, col({ assetCode: ' ', ownerName: 'Lê Văn C', note: 'Sổ hồng' }));
    expect(p.AssetCode).toBeNull();
    expect(p.Note).toBe('Sổ hồng');
  });
});

describe('ownerDiffers', () => {
  it('khác người vay thì báo; trùng (không phân biệt hoa thường, khoảng trắng) thì không', () => {
    expect(ownerDiffers('Lê Văn C', 'Nguyễn Văn An')).toBe(true);
    expect(ownerDiffers('  nguyễn  văn an ', 'NGUYỄN VĂN AN')).toBe(false);
  });
  it('thiếu một bên thì không báo', () => {
    expect(ownerDiffers('', 'An')).toBe(false);
    expect(ownerDiffers('An', '')).toBe(false);
  });
});
