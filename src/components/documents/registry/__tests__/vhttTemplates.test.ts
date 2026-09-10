// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { bm01DeNghiGiaiNganTemplate } from '../templates/bm01DeNghiGiaiNgan';
import { bm02ToTrinhGiaiNganTemplate } from '../templates/bm02ToTrinhGiaiNgan';
import { bm11TraNoTruocHanTemplate } from '../templates/bm11TraNoTruocHan';
import { emptyCommon } from '../types';
import { htmlToDocx } from '../../../../lib/docxWriter';

function textContentOf(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

describe('Vận hành tập trung templates', () => {
  const common = emptyCommon();

  describe('BM01 - Giấy đề nghị giải ngân', () => {
    it('hiển thị đúng thông tin khi KH là cá nhân độc thân (ẩn các dòng thừa và xóa footnote)', () => {
      const html = bm01DeNghiGiaiNganTemplate.buildHtml(common, {
        customerType: 'single',
        name1: 'Nguyễn Văn A',
        cif1: '000001',
        cccd1: '0123414234',
        disbursementMethod: 'transfer',
      });
      const text = textContentOf(html);

      // Tiêu đề & thông tin chung
      expect(text).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      expect(text).toContain('Độc lập – Tự do – Hạnh phúc');
      expect(text).toContain('GIẤY ĐỀ NGHỊ GIẢI NGÂN');
      expect(text).toContain('Kính gửi: VIETBANK – CN/PGD ………………');
      expect(text).toContain('Tôi/Chúng tôi là:');

      // Thông tin KH 1
      expect(text).toContain('Nguyễn Văn A');
      expect(text).toContain('CIF: 000001');
      expect(text).toContain('0123414234');

      // Ẩn hoàn toàn thông tin tổ chức và KH2
      expect(text).not.toContain('Tên tổ chức');
      expect(text).not.toContain('MSDN/số ĐKKD/GPHĐ số');
      expect(text).not.toContain('Người đại diện');
      expect(text).not.toContain('Chức vụ');
      expect(text).not.toContain('Theo Văn bản uỷ quyền số');

      // Chỉ hiển thị chuyển khoản, ẩn tiền mặt
      expect(text).toContain('Chuyển khoản');
      expect(text).not.toContain('Nhận tiền mặt:');

      // Cam kết & Khách hàng ký tên
      expect(text).toContain('Tôi/Chúng tôi cam kết:');
      expect(text).toContain('KHÁCH HÀNG');

      // ĐÃ XÓA HOÀN TOÀN FOOTNOTE
      expect(text).not.toContain('TTKD lưu ý xóa footnote trước khi sử dụng');
      expect(text).not.toContain('Áp dụng đối với trường hợp giải ngân phong tỏa.');
      expect(html).not.toContain('class="doc-footnotes"');

      // VẪN GIỮ NGUYÊN FOOTER VĂN BẢN
      expect(text).toContain('BM01_....../2026/TB-TGĐ_Giấy đề nghị giải ngân');
    });

    it('hiển thị thông tin 2 người khi KH là vợ chồng', () => {
      const html = bm01DeNghiGiaiNganTemplate.buildHtml(common, {
        customerType: 'married',
        name1: 'Nguyễn Văn A',
        cif1: '000001',
        cccd1: '0123414234',
        name2: 'Trần Thị B',
        cif2: '000002',
        cccd2: '0791234567',
      });
      const text = textContentOf(html);
      expect(text).toContain('Nguyễn Văn A');
      expect(text).toContain('CIF: 000001');
      expect(text).toContain('Trần Thị B');
      expect(text).toContain('CIF: 000002');
      expect(text).not.toContain('Tên tổ chức');
    });

    it('chỉ hiển thị bảng tiền mặt và ẩn chuyển khoản khi chọn phương thức tiền mặt', () => {
      const html = bm01DeNghiGiaiNganTemplate.buildHtml(common, {
        disbursementMethod: 'cash',
        cashAmount: '150,000,000',
        cashReceiverName: 'Lê Văn C',
        cashReceiverCccd: '088123456789',
      });
      const text = textContentOf(html);
      expect(text).toContain('Nhận tiền mặt:');
      expect(text).toContain('150,000,000 VNĐ');
      expect(text).toContain('Lê Văn C');
      expect(text).toContain('088123456789');
      // Ẩn chuyển khoản
      expect(text).not.toContain('Chuyển khoản');
    });

    it('can be converted to docx bytes via htmlToDocx without errors', () => {
      const html = bm01DeNghiGiaiNganTemplate.buildHtml(common, {});
      const bytes = htmlToDocx(html);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(1000);
    });
  });

  describe('BM02 - Tờ trình giải ngân', () => {
    it('builds HTML with exact required text and structure', () => {
      const html = bm02ToTrinhGiaiNganTemplate.buildHtml(common, {});
      const text = textContentOf(html);
      expect(text).toContain('Tên TTKD: ……………………');
      expect(text).toContain('Mã TTKD: …………………….');
      expect(text).toContain('TỜ TRÌNH GIẢI NGÂN');
      expect(text).toContain('(LẦN ….)');
      expect(text).toContain('THÔNG TIN KHÁCH HÀNG');
      expect(text).toContain('Tên Khách hàng: …………………………………………….. CIF: ……………………………….');
      expect(text).toContain('CNĐKKD/CNĐKDN: ……………………');
      expect(text).toContain('Khoản mục thanh toán');
      expect(text).toContain('Hạn mức tuần hoàn');
      expect(text).toContain('Hạn mức từng lần');
      expect(text).toContain('Tài sản bảo đảm');
      expect(text).toContain('Tình hình thực hiện các phê duyệt');
      expect(text).toContain('Biên độ cho vay');
      expect(text).toContain('Mức cộng trừ (+/-) LSCV');
      expect(text).toContain('CBBH');
      expect(text).toContain('CKS.CBBH');
      expect(text).toContain('PHÊ DUYỆT CỦA TĐV/CẤP CÓ THẨM QUYỀN');
      expect(text).toContain('Mã CIF quản lý TKV:.................');
      expect(text).not.toContain('TTKD lưu ý xóa footnote trước khi sử dụng');
      expect(text).toContain('BM02_........./2026/TB-TGĐ_Tờ trình giải ngân');
    });

    it('can be converted to docx bytes via htmlToDocx without errors', () => {
      const html = bm02ToTrinhGiaiNganTemplate.buildHtml(common, {});
      const bytes = htmlToDocx(html);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(1000);
    });
  });

  describe('BM11 - Giấy đề nghị trả nợ trước hạn', () => {
    it('builds HTML with exact required text and structure', () => {
      const html = bm11TraNoTruocHanTemplate.buildHtml(common, {});
      const text = textContentOf(html);
      expect(text).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      expect(text).toContain('Độc lập – Tự do – Hạnh phúc');
      expect(text).toContain('GIẤY ĐỀ NGHỊ TRẢ NỢ TRƯỚC HẠN');
      expect(text).toContain('Ngân hàng TMCP Việt Nam Thương Tín (Vietbank) – CN/PGD ……');
      expect(text).toContain('THÔNG TIN KHÁCH HÀNG');
      expect(text).toContain('NHU CẦU KHÁCH HÀNG');
      expect(text).toContain('000000666888');
      expect(text).toContain('000000777999');
      expect(text).toContain('Tài khoản tiền gửi');
      expect(text).toContain('Tài khoản thanh toán');
      expect(text).toContain('để thu nợ trước hạn cho (các) khoản vay cụ thể như sau:');
      expect(text).toContain('Giấy nhận nợ');
      expect(text).toContain('Số tài khoản vay');
      expect(text).toContain('Số tiền gốc');
      expect(text).toContain('Số tiền lãi');
      expect(text).toContain('Hợp đồng tín dụng');
      expect(text).toContain('NGƯỜI ĐỀ NGHỊ');
      expect(text).toContain('(Ký, ghi rõ họ tên và đóng dấu (nếu có))');
      expect(text).toContain('PHẦN XÁC NHẬN CỦA NGÂN HÀNG');
      expect(text).toContain('GIAO DỊCH VIÊN');
      expect(text).toContain('CẤP KIỂM SOÁT');
      expect(text).toContain('TRƯỞNG ĐƠN VỊ');
      expect(text).toContain('(**) : Ghi rõ mức phí / phạt áp dụng phù hợp qui định / phê duyệt của cấp có thẩm quyền.');
      expect(text).toContain('BM11_.............../2026/TB-TGĐ_Giấy đề nghị trả nợ trước hạn vay CC TG. CCTG VB');
    });

    it('can be converted to docx bytes via htmlToDocx without errors', () => {
      const html = bm11TraNoTruocHanTemplate.buildHtml(common, {});
      const bytes = htmlToDocx(html);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(1000);
    });
  });
});
