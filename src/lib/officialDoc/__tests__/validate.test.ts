import { describe, it, expect } from 'vitest';
import type { OfficialDocInput } from '../../../types/officialDoc';
import { validateOfficialDoc } from '../validate';

const base: OfficialDocInput = {
  category: 'van-ban',
  docNumber: '2753/2026/TB-BĐH',
  title: 'Chương trình lãi suất',
  issuedDate: '2026-09-18',
  effectiveFrom: '2026-09-21',
  effectiveTo: '2026-10-31',
  files: [],
};

describe('validateOfficialDoc', () => {
  it('hợp lệ thì trả null', () => {
    expect(validateOfficialDoc(base)).toBeNull();
  });
  it('cho phép không có ngày hết hiệu lực', () => {
    expect(validateOfficialDoc({ ...base, effectiveTo: null })).toBeNull();
  });
  it('thiếu số hiệu hoặc tiêu đề', () => {
    expect(validateOfficialDoc({ ...base, docNumber: '  ' })).toMatch(/số hiệu/i);
    expect(validateOfficialDoc({ ...base, title: '' })).toMatch(/tiêu đề/i);
  });
  it('mục không hợp lệ', () => {
    expect(validateOfficialDoc({ ...base, category: 'x' as never })).toMatch(/mục/i);
  });
  it('thiếu hoặc sai định dạng ngày', () => {
    expect(validateOfficialDoc({ ...base, issuedDate: '' })).toMatch(/ngày ban hành/i);
    expect(validateOfficialDoc({ ...base, effectiveFrom: '18/09/2026' })).toMatch(/ngày hiệu lực/i);
    expect(validateOfficialDoc({ ...base, effectiveTo: '2026-13-40' })).toMatch(/ngày hết hiệu lực/i);
  });
  it('ngày hết hiệu lực không được trước ngày hiệu lực', () => {
    expect(validateOfficialDoc({ ...base, effectiveTo: '2026-09-20' })).toMatch(/không được trước/i);
  });
});
