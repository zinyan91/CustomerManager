import { danhSachChuDe, dungBanDo, traChuDe, type ChuDe } from '../triThuc/phanTichTriThuc';
import type { ToolTable } from '../toolLoop';

export const TEN_CONG_CU = 'traCuuHeThong';

export const KHAI_BAO_CONG_CU = {
  functionDeclarations: [
    {
      name: TEN_CONG_CU,
      description:
        'Tra cứu cách dùng các trang, quy trình nghiệp vụ và các điểm dễ sai của hệ thống CustomerManager. Gọi khi người dùng hỏi một trang dùng thế nào, quy trình ra sao, vì sao số liệu lệch. Không dùng để tra dữ liệu khách hàng.',
      parameters: {
        type: 'OBJECT',
        properties: {
          chuDe: {
            type: 'STRING',
            description: 'Mã chủ đề hoặc từ khóa lấy từ bản đồ chủ đề. Bỏ trống để xem danh sách chủ đề.',
          },
        },
      },
    },
  ],
};

export function taoCongCuTriThuc(taiKho: () => Promise<ChuDe[]>): ToolTable {
  return {
    [TEN_CONG_CU]: async (args) => {
      const kho = await taiKho();
      const chuDe = typeof args.chuDe === 'string' ? args.chuDe.trim() : '';
      if (!chuDe) return { danhSach: danhSachChuDe(kho) };
      const khop = traChuDe(kho, chuDe);
      if (khop.length === 0) return { khongTimThay: chuDe, danhSach: danhSachChuDe(kho) };
      return { chuDe: khop.map((c) => ({ id: c.id, tieuDe: c.tieuDe, trang: c.trang, noiDung: c.noiDung })) };
    },
  };
}

export function dungChiDanTriThuc(kho: ChuDe[]): string {
  return `TRI THỨC HỆ THỐNG:
Khi người dùng hỏi một trang dùng thế nào, quy trình nghiệp vụ ra sao hoặc vì sao số liệu lệch, gọi công cụ ${TEN_CONG_CU} rồi trả lời theo nội dung nhận được. Công cụ không có thì nói hệ thống chưa có mô tả, không tự bịa.
Các chủ đề:
${dungBanDo(kho)}`;
}
