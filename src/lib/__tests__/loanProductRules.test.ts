import { describe, it, expect } from 'vitest';
import {
  getLoanProductRule,
  allowedPurposes,
  isPurposeLocked,
  graceMonthOptions,
  checkTenor,
  checkKunnTenor,
  checkPurpose,
  checkGrace,
  purposeLabel,
} from '../loanProductRules';

describe('Hạn mức tín dụng — vay ngắn hạn sản xuất kinh doanh', () => {
  const M = 'Hạn mức tín dụng';

  it('chỉ có duy nhất mục đích Sản xuất kinh doanh', () => {
    expect(allowedPurposes(M).map(p => p.value)).toEqual(['Kinh doanh']);
  });

  it('KHOÁ ô mục đích vay', () => {
    expect(isPurposeLocked(M)).toBe(true);
  });

  it('tự điền mục đích Kinh doanh', () => {
    expect(getLoanProductRule(M).defaultPurpose).toBe('Kinh doanh');
  });

  it('KHÔNG áp dụng ân hạn gốc', () => {
    expect(graceMonthOptions(M)).toEqual([]);
    expect(checkGrace(M, 12).ok).toBe(false);
    expect(checkGrace(M, 0).ok).toBe(true);
  });

  it('kỳ hạn HĐTD 12 và 24 tháng là hợp lệ', () => {
    expect(checkTenor(M, 12).ok).toBe(true);
    expect(checkTenor(M, 24).ok).toBe(true);
    expect(checkTenor(M, 18).ok).toBe(true);
  });

  it('cảnh báo khi kỳ hạn HĐTD ngoài 12–24 tháng', () => {
    expect(checkTenor(M, 6).ok).toBe(false);
    expect(checkTenor(M, 36).ok).toBe(false);
    expect(checkTenor(M, 240).ok).toBe(false);
  });

  it('kỳ hạn KUNN 3–12 tháng là hợp lệ, KHÔNG bị đo bằng thước HĐTD', () => {
    for (const thang of [3, 5, 6, 12]) {
      expect(checkKunnTenor(M, thang).ok).toBe(true);
    }
  });

  it('cảnh báo khi kỳ hạn KUNN ngoài 3–12 tháng', () => {
    expect(checkKunnTenor(M, 2).ok).toBe(false);
    expect(checkKunnTenor(M, 24).ok).toBe(false);
  });

  it('hai lời cảnh báo gọi đúng tên cấp hợp đồng', () => {
    expect(checkTenor(M, 6).message).toContain('HĐTD');
    expect(checkKunnTenor(M, 24).message).toContain('KUNN');
  });

  it('cảnh báo khi mục đích không phải kinh doanh', () => {
    const r = checkPurpose(M, 'Mua bất động sản');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('Sản xuất kinh doanh');
  });
});

describe('Cho vay từng lần — vay dài hạn phục vụ đời sống', () => {
  const M = 'Cho vay từng lần';

  it('có bốn mục đích: tiêu dùng, xây/sửa nhà, mua nhà, mua nhà hình thành tương lai', () => {
    expect(allowedPurposes(M).map(p => p.value))
      .toEqual(['Tiêu dùng', 'Sửa chữa nhà', 'Mua bất động sản', 'Mua nhà ở hình thành trong tương lai']);
  });

  it('mặc định phương thức trả gốc là Trả đều hàng tháng', () => {
    expect(getLoanProductRule(M).defaultPrincipalMethod).toBe('Trả đều hàng tháng');
  });

  it('KHÔNG khoá ô mục đích vay', () => {
    expect(isPurposeLocked(M)).toBe(false);
  });

  it('không cho chọn mục đích kinh doanh', () => {
    expect(allowedPurposes(M).map(p => p.value)).not.toContain('Kinh doanh');
    expect(checkPurpose(M, 'Kinh doanh').ok).toBe(false);
  });

  it('cho phép chọn mục đích Mua nhà ở hình thành trong tương lai', () => {
    expect(checkPurpose(M, 'Mua nhà ở hình thành trong tương lai').ok).toBe(true);
  });

  it('ân hạn gốc đúng các mức 6/12/15/18/24/36 tháng', () => {
    expect(graceMonthOptions(M)).toEqual([6, 12, 15, 18, 24, 36]);
    for (const g of [6, 12, 15, 18, 24, 36]) {
      expect(checkGrace(M, g).ok).toBe(true);
    }
  });

  it('cảnh báo mức ân hạn không thuộc danh sách', () => {
    expect(checkGrace(M, 9).ok).toBe(false);
    expect(checkGrace(M, 48).ok).toBe(false);
  });

  it('kỳ hạn từ 5 năm đến 30 năm là hợp lệ', () => {
    expect(checkTenor(M, 60).ok).toBe(true);
    expect(checkTenor(M, 240).ok).toBe(true);
    expect(checkTenor(M, 360).ok).toBe(true);
  });

  it('cảnh báo khi ngắn hơn 5 năm hoặc dài hơn 30 năm', () => {
    expect(checkTenor(M, 59).ok).toBe(false);
    expect(checkTenor(M, 361).ok).toBe(false);
    const r = checkTenor(M, 24);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('5 năm');
    expect(r.message).toContain('30 năm');
  });
});

describe('Các sản phẩm chưa khai báo ràng buộc riêng', () => {
  it('giữ nguyên hành vi thoáng — không giới hạn mục đích', () => {
    expect(allowedPurposes('Hạn mức tín dụng từng lần')).toHaveLength(6);
    expect(isPurposeLocked('Hạn mức tín dụng từng lần')).toBe(false);
  });

  it('không cảnh báo kỳ hạn trong phạm vi rộng', () => {
    expect(checkTenor('Hạn mức tín dụng từng lần', 6).ok).toBe(true);
    expect(checkTenor('Hạn mức tín dụng từng lần', 300).ok).toBe(true);
  });

  it('phương thức vay chưa xác định cũng không vỡ', () => {
    expect(allowedPurposes(null)).toHaveLength(6);
    expect(checkTenor(null, 100).ok).toBe(true);
    expect(checkGrace(undefined, 0).ok).toBe(true);
  });

  it('Cầm cố sổ tiết kiệm mặc định trả lãi cuối kỳ', () => {
    expect(getLoanProductRule('Cầm cố sổ tiết kiệm').defaultInterestMethod).toBe('Trả cuối kỳ');
  });
});

describe('checkTenor / checkGrace — biên và đầu vào rỗng', () => {
  it('kỳ hạn 0 hoặc chưa nhập thì không cảnh báo', () => {
    expect(checkTenor('Hạn mức tín dụng', 0).ok).toBe(true);
  });

  it('ân hạn 0 luôn hợp lệ ở mọi sản phẩm', () => {
    expect(checkGrace('Hạn mức tín dụng', 0).ok).toBe(true);
    expect(checkGrace('Cho vay từng lần', 0).ok).toBe(true);
  });

  it('mục đích chưa chọn thì không cảnh báo', () => {
    expect(checkPurpose('Hạn mức tín dụng', null).ok).toBe(true);
  });
});

describe('purposeLabel', () => {
  it('trả nhãn hiển thị theo giá trị lưu trong CSDL', () => {
    expect(purposeLabel('Kinh doanh')).toBe('Sản xuất kinh doanh');
    expect(purposeLabel('Tiêu dùng')).toBe('Tiêu dùng phục vụ đời sống');
    expect(purposeLabel('Sửa chữa nhà')).toBe('Xây / sửa chữa nhà');
    expect(purposeLabel('Mua bất động sản')).toBe('Mua nhà / bất động sản');
    expect(purposeLabel('Mua nhà ở hình thành trong tương lai')).toBe('Mua nhà ở hình thành trong tương lai (căn hộ/chung cư)');
  });

  it('giá trị lạ thì hiển thị nguyên văn, không làm mất dữ liệu cũ', () => {
    expect(purposeLabel('Mục đích cũ nào đó')).toBe('Mục đích cũ nào đó');
    expect(purposeLabel(null)).toBe('');
  });
});

describe('kỳ hạn KUNN khi sản phẩm không tách hai cấp', () => {
  it('cho vay từng lần: KUNN dùng chung thước với khoản vay', () => {
    expect(checkKunnTenor('Cho vay từng lần', 120).ok).toBe(true);
    expect(checkKunnTenor('Cho vay từng lần', 12).ok).toBe(false);
  });

  it('sản phẩm chưa khai ràng buộc thì không cảnh báo', () => {
    expect(checkKunnTenor('Cầm cố sổ tiết kiệm', 3).ok).toBe(true);
    expect(checkKunnTenor(null, 5).ok).toBe(true);
  });

  it('chưa khai kỳ hạn thì không cảnh báo', () => {
    expect(checkKunnTenor('Hạn mức tín dụng', 0).ok).toBe(true);
  });
});
