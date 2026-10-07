import { describe, it, expect } from 'vitest';
import { MAX_FORM_TOTAL_BYTES, checkFormTotal, formPairingProblem, isFormAttachment } from '../formFiles';

describe('isFormAttachment', () => {
  it('Word, Excel, ZIP là biểu mẫu', () => {
    expect(isFormAttachment({ name: 'to-trinh.docx' })).toBe(true);
    expect(isFormAttachment({ name: 'phu-luc.xlsx' })).toBe(true);
    expect(isFormAttachment({ name: 'bo.zip', type: 'application/x-zip-compressed' })).toBe(true);
    expect(isFormAttachment({ name: 'bo.ZIP' })).toBe(true);
  });
  it('PDF và ảnh là văn bản AI đọc, không phải biểu mẫu', () => {
    expect(isFormAttachment({ name: 'van-ban.pdf', type: 'application/pdf' })).toBe(false);
    expect(isFormAttachment({ name: 'scan.JPG' })).toBe(false);
    expect(isFormAttachment({ name: 'a.png', type: 'image/png' })).toBe(false);
  });
});

describe('checkFormTotal', () => {
  it('chặn khi tổng cỡ nhiều tệp vượt giới hạn và nói rõ giới hạn', () => {
    expect(checkFormTotal([{ size: 10 }, { size: 20 }])).toBeNull();
    expect(checkFormTotal([{ size: MAX_FORM_TOTAL_BYTES }])).toBeNull();
    expect(checkFormTotal([{ size: MAX_FORM_TOTAL_BYTES - 5 }, { size: 6 }])).toMatch(/vượt quá 100 MB/);
  });
});

describe('formPairingProblem', () => {
  it('không có biểu mẫu thì không có vấn đề', () => {
    expect(formPairingProblem(0, 0)).toBeNull();
    expect(formPairingProblem(0, 3)).toBeNull();
  });
  it('một hay nhiều biểu mẫu đi với đúng một văn bản là hợp lệ', () => {
    expect(formPairingProblem(1, 1)).toBeNull();
    expect(formPairingProblem(5, 1)).toBeNull();
  });
  it('thiếu văn bản hoặc thừa văn bản thì báo', () => {
    expect(formPairingProblem(3, 0)).toMatch(/Thêm văn bản/);
    expect(formPairingProblem(3, 2)).toMatch(/một văn bản/);
  });
});
