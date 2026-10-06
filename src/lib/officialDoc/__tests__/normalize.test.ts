import { describe, it, expect } from 'vitest';
import { buildSearchText, escapeLike, normalizeSearch, searchTokens } from '../normalize';

describe('normalizeSearch', () => {
  it('bỏ dấu tiếng Việt, đ thành d, chữ thường', () => {
    expect(normalizeSearch('Chương trình Lãi suất ĐẶC BIỆT')).toBe('chuong trinh lai suat dac biet');
  });

  it('giữ nguyên / và - để tìm theo số hiệu', () => {
    expect(normalizeSearch('2753/2026/TB-BĐH')).toBe('2753/2026/tb-bdh');
  });

  it('gộp khoảng trắng thừa và cắt hai đầu', () => {
    expect(normalizeSearch('  lai   suat \n')).toBe('lai suat');
  });
});

describe('searchTokens', () => {
  it('tách từ khóa đã chuẩn hóa', () => {
    expect(searchTokens('  Lãi  SUẤT ')).toEqual(['lai', 'suat']);
  });
  it('chuỗi rỗng không có từ khóa', () => {
    expect(searchTokens('   ')).toEqual([]);
  });
});

describe('escapeLike', () => {
  it('thoát %, _ và \\ để không thành ký tự đại diện', () => {
    expect(escapeLike('50%_a\\')).toBe('50\\%\\_a\\\\');
  });
});

describe('buildSearchText', () => {
  it('ghép số hiệu và tiêu đề đã chuẩn hóa', () => {
    expect(buildSearchText('2753/2026/TB-BĐH', 'Chương trình lãi suất')).toBe('2753/2026/tb-bdh chuong trinh lai suat');
  });
});
