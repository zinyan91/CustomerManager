import { describe, it, expect } from 'vitest';
import { danhSachChuDe, docChuDe, dungBanDo, traChuDe, type ChuDe } from '../triThuc/phanTichTriThuc';

const TEP = `---
id: lai-lich-tra-no
tieuDe: Lãi và lịch trả nợ
moTa: Cách tính lãi, lịch trả gốc lãi
nhom: Tính toán và lãi
tuKhoa: [lãi, lịch trả nợ, tổng gốc]
trang: [/tools/calculators, /loans]
nguon: [src/lib/loanMath.ts]
---
# Nội dung
Gốc chia đều theo kỳ.
`;

const cd = (id: string, nhom: string, tuKhoa: string[], tieuDe = id): ChuDe => ({
  id, tieuDe, moTa: `mô tả ${id}`, nhom, tuKhoa, trang: [], nguon: [], noiDung: `nội dung ${id}`,
});

describe('docChuDe', () => {
  it('đọc đủ trường và phần nội dung', () => {
    const c = docChuDe(TEP);
    expect(c).toMatchObject({
      id: 'lai-lich-tra-no',
      tieuDe: 'Lãi và lịch trả nợ',
      nhom: 'Tính toán và lãi',
      tuKhoa: ['lãi', 'lịch trả nợ', 'tổng gốc'],
      trang: ['/tools/calculators', '/loans'],
      nguon: ['src/lib/loanMath.ts'],
    });
    expect(c.noiDung).toBe('# Nội dung\nGốc chia đều theo kỳ.');
  });

  it('chịu được BOM và xuống dòng CRLF do Notepad lưu', () => {
    const c = docChuDe('﻿' + TEP.replace(/\n/g, '\r\n'));
    expect(c.id).toBe('lai-lich-tra-no');
    expect(c.noiDung).toBe('# Nội dung\nGốc chia đều theo kỳ.');
  });

  it('thiếu phần đầu hoặc thiếu trường bắt buộc thì lỗi nêu tên tệp', () => {
    expect(() => docChuDe('# không có đầu', 'a.md')).toThrow('a.md');
    expect(() => docChuDe('---\nid: x\n---\nnd', 'b.md')).toThrow('b.md: thiếu trường tieuDe');
  });

  it('không có tuKhoa/trang/nguon thì là mảng rỗng', () => {
    const c = docChuDe('---\nid: x\ntieuDe: X\nmoTa: m\nnhom: N\n---\nnd');
    expect(c.tuKhoa).toEqual([]);
    expect(c.trang).toEqual([]);
    expect(c.nguon).toEqual([]);
  });
});

describe('traChuDe', () => {
  const kho = [
    cd('kho-luu-tru', 'Hệ thống', ['kho lưu trữ', 'kho', 'tải lên']),
    cd('lai-lich-tra-no', 'Tính toán và lãi', ['lãi', 'lịch trả nợ', 'tổng gốc']),
    cd('goi-dich-vu', 'Hệ thống', ['gói']),
    cd('goi-dien', 'Hệ thống', ['gọi']),
  ];

  it('khớp đúng id trước', () => {
    expect(traChuDe(kho, 'lai-lich-tra-no').map((c) => c.id)).toEqual(['lai-lich-tra-no']);
  });

  it('khớp trọn dãy từ khóa trong câu hỏi', () => {
    expect(traChuDe(kho, 'Tính lãi thế nào?').map((c) => c.id)).toEqual(['lai-lich-tra-no']);
    expect(traChuDe(kho, 'lịch trả nợ lệch tổng gốc').map((c) => c.id)).toEqual(['lai-lich-tra-no']);
  });

  it('không khớp chuỗi con: "không" không khớp "kho"', () => {
    expect(traChuDe(kho, 'Hệ thống không chạy')).toEqual([]);
  });

  it('câu có dấu so có dấu: "gọi" không lẫn "gói"', () => {
    expect(traChuDe(kho, 'cách gọi').map((c) => c.id)).toEqual(['goi-dien']);
    expect(traChuDe(kho, 'cách gói').map((c) => c.id)).toEqual(['goi-dich-vu']);
  });

  it('câu gõ không dấu so ở dạng bỏ dấu', () => {
    expect(traChuDe(kho, 'tinh lai the nao').map((c) => c.id)).toEqual(['lai-lich-tra-no']);
    expect(traChuDe(kho, 'tai len kho luu tru').map((c) => c.id)).toEqual(['kho-luu-tru']);
  });

  it('chỉ trả tối đa số chủ đề yêu cầu', () => {
    const r = traChuDe(kho, 'kho lưu trữ và lịch trả nợ, lãi, tải lên', 1);
    expect(r).toHaveLength(1);
  });

  it('câu rỗng không khớp gì', () => {
    expect(traChuDe(kho, '   ')).toEqual([]);
  });
});

describe('danhSachChuDe và dungBanDo', () => {
  const kho = [
    cd('a', 'Nhóm một', [], 'Tiêu đề A'),
    cd('b', 'Nhóm hai', [], 'Tiêu đề B'),
    cd('c', 'Nhóm một', [], 'Tiêu đề C'),
  ];

  it('danh sách chỉ có id, tiêu đề, mô tả', () => {
    expect(danhSachChuDe(kho)[0]).toEqual({ id: 'a', tieuDe: 'Tiêu đề A', moTa: 'mô tả a' });
  });

  it('bản đồ gộp theo nhóm, mỗi nhóm một dòng', () => {
    expect(dungBanDo(kho)).toBe('- Nhóm một: a (Tiêu đề A); c (Tiêu đề C)\n- Nhóm hai: b (Tiêu đề B)');
  });
});
