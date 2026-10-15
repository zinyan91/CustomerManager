import { describe, it, expect } from 'vitest';
import type { ChuDe } from '../triThuc/phanTichTriThuc';
import { KHAI_BAO_CONG_CU, TEN_CONG_CU, dungChiDanTriThuc, taoCongCuTriThuc } from '../tools/traCuuHeThong';

const kho: ChuDe[] = [
  { id: 'lai-lich-tra-no', tieuDe: 'Lãi và lịch trả nợ', moTa: 'm1', nhom: 'Tính toán và lãi', tuKhoa: ['lãi', 'lịch trả nợ'], trang: ['/loans'], nguon: [], noiDung: 'Gốc chia đều' },
  { id: 'kho-luu-tru', tieuDe: 'Kho lưu trữ', moTa: 'm2', nhom: 'Hệ thống', tuKhoa: ['kho lưu trữ'], trang: ['/storage'], nguon: [], noiDung: 'Tải lên' },
];
const chay = async (args: Record<string, unknown>) => {
  const tool = taoCongCuTriThuc(async () => kho)[TEN_CONG_CU];
  return (await tool(args)) as Record<string, unknown>;
};

describe('traCuuHeThong', () => {
  it('khai báo đúng tên và tham số chuDe tùy chọn', () => {
    const decl = KHAI_BAO_CONG_CU.functionDeclarations[0];
    expect(decl.name).toBe('traCuuHeThong');
    expect(decl.parameters.properties.chuDe.type).toBe('STRING');
    expect(decl.parameters).not.toHaveProperty('required');
  });

  it('có chuDe khớp: trả nội dung chủ đề', async () => {
    expect(await chay({ chuDe: 'tính lãi' })).toEqual({
      chuDe: [{ id: 'lai-lich-tra-no', tieuDe: 'Lãi và lịch trả nợ', trang: ['/loans'], noiDung: 'Gốc chia đều' }],
    });
  });

  it('chuDe rỗng, thiếu hoặc không phải chuỗi: trả danh sách chủ đề, không lỗi', async () => {
    const mong = { danhSach: [{ id: 'lai-lich-tra-no', tieuDe: 'Lãi và lịch trả nợ', moTa: 'm1' }, { id: 'kho-luu-tru', tieuDe: 'Kho lưu trữ', moTa: 'm2' }] };
    expect(await chay({})).toEqual(mong);
    expect(await chay({ chuDe: '  ' })).toEqual(mong);
    expect(await chay({ chuDe: 42 })).toEqual(mong);
  });

  it('chủ đề không tồn tại: nói không tìm thấy và kèm danh sách', async () => {
    const r = await chay({ chuDe: 'thời tiết hôm nay' });
    expect(r.khongTimThay).toBe('thời tiết hôm nay');
    expect(r.danhSach).toHaveLength(2);
  });
});

describe('dungChiDanTriThuc', () => {
  it('nêu tên công cụ, dặn không bịa, và chứa bản đồ chủ đề', () => {
    const s = dungChiDanTriThuc(kho);
    expect(s).toContain('traCuuHeThong');
    expect(s).toContain('không tự bịa');
    expect(s).toContain('- Tính toán và lãi: lai-lich-tra-no (Lãi và lịch trả nợ)');
  });
});
