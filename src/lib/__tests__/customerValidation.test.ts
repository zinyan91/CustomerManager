import { describe, it, expect } from 'vitest';
import {
  digitsOnly, capDigits, validateNationalId, validatePhone, validateCustomerForm,
  splitNumberList, capNumberList, normalizeNumberList, parseRawCustomerText,
} from '../customerValidation';

describe('digitsOnly / capDigits', () => {
  it('bỏ mọi ký tự không phải chữ số', () => {
    expect(digitsOnly('0802 0300 9530')).toBe('080203009530');
    expect(digitsOnly('0901-234.567')).toBe('0901234567');
    expect(digitsOnly('')).toBe('');
    expect(digitsOnly(null)).toBe('');
    expect(digitsOnly(undefined)).toBe('');
  });

  it('cắt đúng số chữ số tối đa, chặn gõ thừa ngay tại ô nhập', () => {
    expect(capDigits('0802030095301234', 12)).toBe('080203009530');
    expect(capDigits('09012345678888', 10)).toBe('0901234567');
    expect(capDigits('0802 0300 9530', 12)).toBe('080203009530');
  });

  it('chưa đủ số thì giữ nguyên, không tự thêm', () => {
    expect(capDigits('0901', 10)).toBe('0901');
  });
});

describe('nhiều số trong một ô', () => {
  it('tách được theo mọi dấu ngăn banker hay dùng', () => {
    expect(splitNumberList('0961685842; 0916566506')).toEqual(['0961685842', '0916566506']);
    expect(splitNumberList('0961685842 / 0916566506')).toEqual(['0961685842', '0916566506']);
    expect(splitNumberList('0961685842, 0916566506')).toEqual(['0961685842', '0916566506']);
    expect(splitNumberList('0961685842\n0916566506')).toEqual(['0961685842', '0916566506']);
  });

  it('gom về một dạng ngăn cách duy nhất', () => {
    expect(capNumberList('0961685842; 0916566506', 10)).toBe('0961685842 / 0916566506');
    expect(normalizeNumberList('190333;190444')).toBe('190333 / 190444');
  });

  it('cắt từng số theo mức tối đa, không cắt cả chuỗi', () => {
    expect(capNumberList('09616858421234 / 09165665069999', 10))
      .toBe('0961685842 / 0916566506');
  });

  it('giữ dấu ngăn đang gõ dở để nhập số tiếp theo được', () => {
    expect(capNumberList('0961685842 /', 10)).toBe('0961685842 / ');
    expect(normalizeNumberList('190333 /')).toBe('190333 / ');
  });

  it('rỗng thì trả chuỗi rỗng', () => {
    expect(splitNumberList('')).toEqual([]);
    expect(splitNumberList(null)).toEqual([]);
    expect(capNumberList('', 10)).toBe('');
    expect(normalizeNumberList('  ')).toBe('');
  });
});

describe('validateNationalId', () => {
  it('12 số là CCCD hợp lệ', () => {
    expect(validateNationalId('080203009530', 'Số CCCD / CMND')).toBeNull();
    expect(validateNationalId('0802 0300 9530', 'Số CCCD / CMND')).toBeNull();
  });

  it('9 số là CMND hợp lệ', () => {
    expect(validateNationalId('012345678', 'Số CCCD / CMND')).toBeNull();
  });

  it('bỏ trống là hợp lệ vì đây không phải trường bắt buộc', () => {
    expect(validateNationalId('', 'Số CCCD / CMND')).toBeNull();
    expect(validateNationalId(null, 'Số CCCD / CMND')).toBeNull();
    expect(validateNationalId('   ', 'Số CCCD / CMND')).toBeNull();
  });

  it('độ dài khác thì báo lỗi và nêu đang có bao nhiêu số', () => {
    const loi = validateNationalId('12345678', 'Số CCCD / CMND');
    expect(loi).toContain('9 số');
    expect(loi).toContain('12 số');
    expect(loi).toContain('đang có 8 số');
  });

  it('nêu đúng tên trường để banker biết sửa ở đâu', () => {
    expect(validateNationalId('123', 'Số CCCD KHLQ / Bảo lãnh'))
      .toContain('Số CCCD KHLQ / Bảo lãnh');
  });

  it('dài hơn 12 số vẫn bị bắt, phòng khi dữ liệu vào từ đường khác', () => {
    expect(validateNationalId('0802030095301234', 'Số CCCD / CMND')).toContain('đang có 16 số');
  });
});

describe('validatePhone', () => {
  it('đúng 10 số là hợp lệ', () => {
    expect(validatePhone('0901234567', 'Số điện thoại')).toBeNull();
    expect(validatePhone('090 123 4567', 'Số điện thoại')).toBeNull();
  });

  it('bỏ trống là hợp lệ', () => {
    expect(validatePhone('', 'Số điện thoại')).toBeNull();
    expect(validatePhone(null, 'Số điện thoại')).toBeNull();
  });

  it('thiếu hoặc thừa số đều bị bắt', () => {
    expect(validatePhone('090123456', 'Số điện thoại')).toContain('đang có 9 số');
    expect(validatePhone('09012345678', 'Số điện thoại')).toContain('đang có 11 số');
  });

  it('nhiều số cách nhau bằng dấu ngăn đều hợp lệ nếu số nào cũng đủ 10', () => {
    expect(validatePhone('0961685842; 0916566506', 'Số điện thoại KHLQ / Bảo lãnh')).toBeNull();
    expect(validatePhone('0961685842 / 0916566506 / 0987654321', 'Số điện thoại')).toBeNull();
  });

  it('trong danh sách có số sai thì nêu rõ có mấy số sai', () => {
    const loi = validatePhone('0961685842 / 09165', 'Số điện thoại KHLQ / Bảo lãnh');
    expect(loi).toContain('còn 1 số chưa đúng');
    expect(loi).toContain('5 số');
  });
});

describe('validateCustomerForm', () => {
  it('hồ sơ hợp lệ thì không có lỗi nào', () => {
    expect(validateCustomerForm({
      nationalId: '080203009530',
      phone: '0901234567',
      spouseNationalId: '012345678',
      spousePhone: '0987654321',
    })).toEqual([]);
  });

  it('hồ sơ trống hoàn toàn cũng hợp lệ', () => {
    expect(validateCustomerForm({})).toEqual([]);
  });

  it('gom đủ mọi lỗi để banker sửa một lượt, không sửa từng cái một', () => {
    const loi = validateCustomerForm({
      nationalId: '123',
      phone: '090',
      spouseNationalId: '456',
      spousePhone: '098',
    });
    expect(loi).toHaveLength(4);
  });

  it('giữ đúng thứ tự trường trên biểu mẫu', () => {
    const loi = validateCustomerForm({ phone: '090', spousePhone: '098' });
    expect(loi[0]).toContain('Số điện thoại phải');
    expect(loi[1]).toContain('Số điện thoại KHLQ');
  });
});

describe('parseRawCustomerText (Smart Paste)', () => {
  it('nhận diện đầy đủ các trường từ văn bản có nhãn', () => {
    const raw = 'CIF: 005299617 - KH: NGUYEN VAN AN - CCCD: 079090001234 - SDT: 0909123456 - STK: 190333444555 - ĐC: 123 Lê Lợi, Q1, TPHCM';
    const parsed = parseRawCustomerText(raw);
    expect(parsed.cif).toBe('005299617');
    expect(parsed.fullName).toBe('NGUYEN VAN AN');
    expect(parsed.nationalId).toBe('079090001234');
    expect(parsed.phone).toBe('0909123456');
    expect(parsed.accountNumber).toBe('190333444555');
    expect(parsed.address).toBe('123 Lê Lợi, Q1, TPHCM');
  });

  it('nhận diện từ chuỗi phân cách bởi ký tự |', () => {
    const raw = '005299617 | LÊ THỊ MAI | 079198004567 | 0987654321 | mai.le@gmail.com';
    const parsed = parseRawCustomerText(raw);
    expect(parsed.cif).toBe('005299617');
    expect(parsed.fullName).toBe('LÊ THỊ MAI');
    expect(parsed.nationalId).toBe('079198004567');
    expect(parsed.phone).toBe('0987654321');
    expect(parsed.email).toBe('mai.le@gmail.com');
  });

  it('xử lý an toàn khi văn bản rỗng hoặc không khớp', () => {
    expect(parseRawCustomerText('')).toEqual({});
    expect(parseRawCustomerText('   ')).toEqual({});
  });
});
