import { describe, it, expect } from 'vitest';
import { MAX_FORM_ZIP_BYTES, checkFormZip, isZipFile, zipPairingProblem } from '../formZip';

describe('isZipFile', () => {
  it('nhận theo đuôi hoặc kiểu MIME', () => {
    expect(isZipFile({ name: 'bieu-mau.zip' })).toBe(true);
    expect(isZipFile({ name: 'BIEU-MAU.ZIP' })).toBe(true);
    expect(isZipFile({ name: 'x', type: 'application/x-zip-compressed' })).toBe(true);
  });
  it('không nhận tệp khác, kể cả tên có chữ zip giữa chừng', () => {
    expect(isZipFile({ name: 'van-ban.pdf', type: 'application/pdf' })).toBe(false);
    expect(isZipFile({ name: 'zip.docx' })).toBe(false);
  });
});

describe('checkFormZip', () => {
  it('chỉ tài khoản được thêm văn bản mới dùng được thư mục nén', () => {
    expect(checkFormZip({ name: 'a.zip', size: 10 }, false)).toMatch(/không có quyền/);
    expect(checkFormZip({ name: 'a.zip', size: 10 }, true)).toBeNull();
  });
  it('chặn thư mục nén quá giới hạn và nói rõ giới hạn', () => {
    expect(checkFormZip({ name: 'a.zip', size: MAX_FORM_ZIP_BYTES }, true)).toBeNull();
    expect(checkFormZip({ name: 'a.zip', size: MAX_FORM_ZIP_BYTES + 1 }, true)).toMatch(/vượt quá 100 MB/);
  });
});

describe('zipPairingProblem', () => {
  it('không có thư mục nén thì không có vấn đề', () => {
    expect(zipPairingProblem(0, 0)).toBeNull();
    expect(zipPairingProblem(0, 3)).toBeNull();
  });
  it('một thư mục nén đi với đúng một văn bản là hợp lệ', () => {
    expect(zipPairingProblem(1, 1)).toBeNull();
  });
  it('thiếu văn bản, thừa văn bản hoặc thừa thư mục nén đều báo', () => {
    expect(zipPairingProblem(1, 0)).toMatch(/Thêm văn bản/);
    expect(zipPairingProblem(1, 2)).toMatch(/một văn bản/);
    expect(zipPairingProblem(2, 1)).toMatch(/Chỉ kèm được một/);
  });
});
