import { describe, it, expect } from 'vitest';
import type { OfficialDocInput } from '../../../types/officialDoc';
import { mapOfficialDocRow, toOfficialDocRow } from '../mapRow';

const input: OfficialDocInput = {
  category: 'van-ban',
  docNumber: '2753/2026/TB-BĐH',
  title: 'Chương trình lãi suất cho vay',
  issuedDate: '2026-09-18',
  effectiveFrom: '2026-09-21',
  effectiveTo: null,
  files: [{ kind: 'goc', repoId: 'o/kho', path: 'a/b.pdf', name: 'b.pdf' }],
};

describe('toOfficialDocRow', () => {
  it('đổi sang cột PascalCase kèm SearchText không dấu', () => {
    const row = toOfficialDocRow({ ...input, docNumber: ' 2753/2026/TB-BĐH ', title: ' Chương trình lãi suất cho vay ' });
    expect(row).toMatchObject({
      Category: 'van-ban',
      DocNumber: '2753/2026/TB-BĐH',
      Title: 'Chương trình lãi suất cho vay',
      IssuedDate: '2026-09-18',
      EffectiveFrom: '2026-09-21',
      EffectiveTo: null,
      Files: input.files,
      SearchText: '2753/2026/tb-bdh chuong trinh lai suat cho vay',
    });
  });
  it('ngày hết hiệu lực trống gửi null, không gửi chuỗi rỗng', () => {
    expect(toOfficialDocRow({ ...input, effectiveTo: '' as unknown as null }).EffectiveTo).toBeNull();
  });
  it('không gửi OwnerId (DB tự gán auth.uid())', () => {
    expect('OwnerId' in toOfficialDocRow(input)).toBe(false);
  });
});

describe('mapOfficialDocRow', () => {
  const row = {
    Id: 7,
    Category: 'hop-dong',
    DocNumber: 'S1',
    Title: 'T',
    IssuedDate: '2026-01-01',
    EffectiveFrom: '2026-01-02',
    EffectiveTo: '2026-12-31',
    Files: [{ kind: 'bieu-mau', repoId: 'o/k', path: 'p.docx', name: 'p.docx' }],
    CreatedAt: 'c',
    UpdatedAt: 'u',
  };

  it('đọc đủ trường', () => {
    expect(mapOfficialDocRow(row)).toEqual({
      id: '7',
      category: 'hop-dong',
      docNumber: 'S1',
      title: 'T',
      issuedDate: '2026-01-01',
      effectiveFrom: '2026-01-02',
      effectiveTo: '2026-12-31',
      files: row.Files,
      createdAt: 'c',
      updatedAt: 'u',
    });
  });

  it('Files hỏng thì bỏ phần tử sai, không làm sập danh sách', () => {
    const doc = mapOfficialDocRow({
      ...row,
      Files: [{ kind: 'x', repoId: 'o/k', path: 'p', name: 'p' }, { kind: 'goc', repoId: 'o/k' }, null, row.Files[0]],
    });
    expect(doc.files).toEqual(row.Files);
    expect(mapOfficialDocRow({ ...row, Files: 'rác' }).files).toEqual([]);
  });

  it('mục lạ rơi về Khác; EffectiveTo null giữ null', () => {
    const doc = mapOfficialDocRow({ ...row, Category: 'la', EffectiveTo: null });
    expect(doc.category).toBe('khac');
    expect(doc.effectiveTo).toBeNull();
  });
});
