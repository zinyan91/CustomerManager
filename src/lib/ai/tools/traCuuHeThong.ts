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

const DAU_HIEU_HOI_HE_THONG = /hệ thống|phần mềm|ứng dụng|(^|[^\p{L}])(app|trang|màn|nút|tab|menu|ô)($|[^\p{L}])|chức năng|tính năng|cách dùng|sử dụng|thao tác|nhập|lưu|xuất|tải lên|in ra|làm sao|làm thế nào|ở đâu|chỗ nào|không thấy|không hiện|không được|bị lỗi|lệch|sai|tự tính|tính ra|tính[^?.!]*(thế nào|ra sao)/iu;

/**
 * Mỗi lần AI gọi công cụ là thêm một lượt gửi lại cả lời dặn và tệp đính kèm, nên chỉ khai báo công cụ
 * khi câu hỏi có dấu hiệu hỏi về cách dùng hay cách tính của hệ thống.
 */
export function hoiVeCachDungHeThong(cauHoi: string): boolean {
  return DAU_HIEU_HOI_HE_THONG.test(cauHoi);
}

export function dungChiDanTriThuc(kho: ChuDe[]): string {
  return `TRI THỨC HỆ THỐNG:
Khi người dùng hỏi một trang trong hệ thống dùng thế nào, hệ thống tính số liệu ra sao hoặc vì sao số liệu lệch, gọi công cụ ${TEN_CONG_CU} rồi trả lời theo nội dung nhận được; đó là nguồn duy nhất về cách hệ thống này được làm.
Công cụ không có chủ đề phù hợp thì nói hệ thống chưa có mô tả cho phần đó, không tự bịa tên trang, nút bấm hay cách tính riêng của hệ thống; nhưng nếu câu hỏi là nghiệp vụ chung (quy trình tín dụng, công thức tài chính, quy định pháp luật) thì vẫn trả lời đầy đủ bằng hiểu biết chuyên môn.
Câu hỏi nghiệp vụ chung không liên quan tới cách dùng hệ thống thì không cần gọi công cụ.
Các chủ đề:
${dungBanDo(kho)}`;
}
