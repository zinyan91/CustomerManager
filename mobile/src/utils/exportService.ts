import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { Customer, LoanContract, CreditContract, Collateral } from '../types';
import { formatVND, formatDate, formatRate } from './formatters';

export const exportService = {
  // 1. Export Customer 360 to PDF
  async exportCustomerPDF(
    cust: Customer,
    loans: LoanContract[] = [],
    credits: CreditContract[] = [],
    colls: Collateral[] = []
  ) {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #0F172A; }
            .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 12px; margin-bottom: 20px; }
            .bank-title { font-size: 18px; font-weight: bold; color: #1E3A8A; text-transform: uppercase; }
            .sub-title { font-size: 13px; color: #64748B; margin-top: 4px; }
            .section-title { font-size: 13px; font-weight: bold; color: #1E40AF; text-transform: uppercase; margin-top: 18px; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; font-size: 11px; }
            th { background-color: #F1F5F9; color: #334155; text-align: left; padding: 8px; border: 1px solid #E2E8F0; }
            td { padding: 8px; border: 1px solid #E2E8F0; }
            .info-grid { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; margin-bottom: 12px; }
            .info-item { width: 48%; padding: 4px 0; }
            .label { color: #64748B; }
            .value { font-weight: bold; color: #0F172A; }
            .footer { text-align: right; font-size: 11px; color: #94A3B8; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="bank-title">HỒ SƠ KHÁCH HÀNG 360°</div>
            <div class="sub-title">Hệ thống Quản lý Khách hàng & Tín dụng</div>
          </div>

          <div class="section-title">1. Thông tin chung khách hàng</div>
          <div class="info-grid">
            <div class="info-item"><span class="label">Họ và tên:</span> <span class="value">${cust.FullName}</span></div>
            <div class="info-item"><span class="label">Mã CIF:</span> <span class="value">${cust.CifKh}</span></div>
            <div class="info-item"><span class="label">Số CCCD/CMND:</span> <span class="value">${cust.NationalId || '-'}</span></div>
            <div class="info-item"><span class="label">Số điện thoại:</span> <span class="value">${cust.Phone || '-'}</span></div>
            <div class="info-item"><span class="label">Địa chỉ:</span> <span class="value">${cust.Address || '-'}</span></div>
            <div class="info-item"><span class="label">Thu nhập hàng tháng:</span> <span class="value">${formatVND(cust.MonthlyIncome)}</span></div>
            <div class="info-item"><span class="label">Xếp hạng tín dụng:</span> <span class="value">${cust.CreditRating || '-'}</span></div>
            <div class="info-item"><span class="label">Tình trạng hôn nhân:</span> <span class="value">${cust.MaritalStatus || '-'}</span></div>
          </div>

          <div class="section-title">2. Danh sách Khế ước nhận nợ (KUNN)</div>
          ${
            loans.length === 0
              ? '<p style="font-size: 12px; color: #64748B;">Không có khoản vay nào.</p>'
              : `
              <table>
                <thead>
                  <tr>
                    <th>Số Khế ước</th>
                    <th>Số tiền vay</th>
                    <th>Dư nợ hiện tại</th>
                    <th>Lãi suất</th>
                    <th>Nhóm nợ</th>
                  </tr>
                </thead>
                <tbody>
                  ${loans
                    .map(
                      (l) => `
                    <tr>
                      <td><b>${l.ContractNumber}</b></td>
                      <td>${formatVND(l.ContractAmount)}</td>
                      <td style="color: #DC2626; font-weight: bold;">${formatVND(l.CurrentBalance)}</td>
                      <td>${formatRate(l.InterestRate)}</td>
                      <td>Nhóm ${l.DebtGroup || 1}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
          }

          <div class="section-title">3. Danh sách Tài sản bảo đảm (TSBD)</div>
          ${
            colls.length === 0
              ? '<p style="font-size: 12px; color: #64748B;">Không có tài sản bảo đảm.</p>'
              : `
              <table>
                <thead>
                  <tr>
                    <th>Mã Tài sản</th>
                    <th>Loại TS</th>
                    <th>Địa chỉ / Mô tả</th>
                    <th>Định giá</th>
                    <th>Tỷ lệ LTV</th>
                  </tr>
                </thead>
                <tbody>
                  ${colls
                    .map(
                      (c) => `
                    <tr>
                      <td><b>${c.AssetCode || '-'}</b></td>
                      <td>${c.AssetType || '-'}</td>
                      <td>${c.Address || '-'}</td>
                      <td style="color: #D97706; font-weight: bold;">${formatVND(c.AppraisedValue || c.Value)}</td>
                      <td>${c.LtvPercent ? `${c.LtvPercent}%` : '-'}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
          }

          <div class="footer">
            Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Lỗi xuất PDF', err.message || 'Không thể tạo file PDF.');
    }
  },

  // 2. Export Customer 360 to Excel-ready Table Sheet PDF
  async exportCustomerExcel(
    cust: Customer,
    loans: LoanContract[] = [],
    colls: Collateral[] = []
  ) {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; font-size: 11px; }
            h2 { color: #065F46; border-bottom: 2px solid #10B981; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #ECFDF5; color: #065F46; padding: 8px; border: 1px solid #A7F3D0; text-align: left; }
            td { padding: 8px; border: 1px solid #E2E8F0; }
          </style>
        </head>
        <body>
          <h2>BẢNG KÊ DỮ LIỆU TÍN DỤNG & KHÁCH HÀNG (EXCEL FORMAT)</h2>
          <p><b>Khách hàng:</b> ${cust.FullName} | <b>CIF:</b> ${cust.CifKh} | <b>CCCD:</b> ${cust.NationalId || '-'} | <b>SĐT:</b> ${cust.Phone || '-'}</p>
          <p><b>Thu nhập:</b> ${formatVND(cust.MonthlyIncome)} | <b>Địa chỉ:</b> ${cust.Address || '-'}</p>

          <h3>Danh mục Khế ước vay (KUNN)</h3>
          <table>
            <thead><tr><th>Số Khế ước</th><th>Số tiền vay</th><th>Dư nợ</th><th>Lãi suất</th><th>Nhóm nợ</th></tr></thead>
            <tbody>
              ${loans.map((l) => `<tr><td>${l.ContractNumber}</td><td>${formatVND(l.ContractAmount)}</td><td style="color:#DC2626;font-weight:bold;">${formatVND(l.CurrentBalance)}</td><td>${formatRate(l.InterestRate)}</td><td>Nhóm ${l.DebtGroup || 1}</td></tr>`).join('')}
            </tbody>
          </table>

          <h3>Danh mục Tài sản thế chấp (TSBD)</h3>
          <table>
            <thead><tr><th>Mã TS</th><th>Loại TS</th><th>Địa chỉ</th><th>Định giá</th><th>LTV</th></tr></thead>
            <tbody>
              ${colls.map((c) => `<tr><td>${c.AssetCode}</td><td>${c.AssetType}</td><td>${c.Address}</td><td style="color:#D97706;font-weight:bold;">${formatVND(c.AppraisedValue || c.Value)}</td><td>${c.LtvPercent ? `${c.LtvPercent}%` : '-'}</td></tr>`).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Lỗi xuất bảng kê', err.message || 'Không thể tạo file.');
    }
  },

  // 3. Export Customer 360 to Document Sheet (Word format PDF/Print)
  async exportCustomerWord(
    cust: Customer,
    loans: LoanContract[] = [],
    colls: Collateral[] = []
  ) {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 24px; color: #000; font-size: 13px; line-height: 1.5; }
            .doc-header { text-align: center; margin-bottom: 20px; }
            .doc-title { font-size: 16px; font-weight: bold; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="doc-header">
            <div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b></div>
            <div><u>Độc lập - Tự do - Hạnh phúc</u></div>
            <br/>
            <div class="doc-title">BÁO CÁO THẨM ĐỊNH & THÔNG TIN KHÁCH HÀNG TÍN DỤNG</div>
          </div>

          <p><b>1. Bên vay (Khách hàng):</b> ${cust.FullName}</p>
          <p><b>Mã định danh CIF:</b> ${cust.CifKh} &nbsp;&nbsp;&nbsp;&nbsp; <b>CCCD/Hộ chiếu:</b> ${cust.NationalId || '-'}</p>
          <p><b>Địa chỉ thường trú:</b> ${cust.Address || '-'}</p>
          <p><b>Số điện thoại liên hệ:</b> ${cust.Phone || '-'} &nbsp;&nbsp;&nbsp;&nbsp; <b>Thu nhập bình quân:</b> ${formatVND(cust.MonthlyIncome)}</p>

          <p><b>2. Tình hình quan hệ tín dụng:</b></p>
          <table>
            <thead>
              <tr><th>STT</th><th>Số HĐTD / KUNN</th><th>Số tiền cấp</th><th>Dư nợ hiện hữu</th><th>Lãi suất</th></tr>
            </thead>
            <tbody>
              ${loans.map((l, idx) => `<tr><td>${idx + 1}</td><td>${l.ContractNumber}</td><td>${formatVND(l.ContractAmount)}</td><td>${formatVND(l.CurrentBalance)}</td><td>${formatRate(l.InterestRate)}</td></tr>`).join('')}
            </tbody>
          </table>

          <p><b>3. Biện pháp bảo đảm tiền vay:</b></p>
          <table>
            <thead>
              <tr><th>STT</th><th>Mã Tài sản</th><th>Loại TS</th><th>Giá trị định giá</th><th>Tỷ lệ LTV</th></tr>
            </thead>
            <tbody>
              ${colls.map((c, idx) => `<tr><td>${idx + 1}</td><td>${c.AssetCode}</td><td>${c.AssetType}</td><td>${formatVND(c.AppraisedValue || c.Value)}</td><td>${c.LtvPercent ? `${c.LtvPercent}%` : '-'}</td></tr>`).join('')}
            </tbody>
          </table>

          <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div style="text-align: center; width: 45%;">
              <b>NGƯỜI LẬP BÁO CÁO</b><br/><i>(Ký và ghi rõ họ tên)</i>
            </div>
            <div style="text-align: center; width: 45%;">
              <b>LÃNH ĐẠO PHÊ DUYỆT</b><br/><i>(Ký và ghi rõ họ tên)</i>
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Lỗi xuất văn bản', err.message || 'Không thể tạo văn bản.');
    }
  },

  // 4. Export Repayment Schedule to PDF / Share
  async exportRepaymentSchedulePDF(
    loanAmount: number,
    tenorMonths: number,
    ratePercent: number,
    method: 'reducing' | 'annuity',
    rows: any[]
  ) {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #0F172A; }
            .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 18px; font-weight: bold; color: #1E3A8A; }
            .sub { font-size: 13px; color: #64748B; margin-top: 4px; }
            .param-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background-color: #2563EB; color: #FFFFFF; text-align: right; padding: 6px; border: 1px solid #CBD5E1; }
            th:first-child { text-align: center; }
            td { padding: 6px; border: 1px solid #E2E8F0; text-align: right; }
            td:first-child { text-align: center; font-weight: bold; }
            tr:nth-child(even) { background-color: #F8FAFC; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">BẢNG TÍNH LỊCH TRẢ NỢ VỐN VAY</div>
            <div class="sub">Phương thức: ${method === 'reducing' ? 'Dư nợ giảm dần' : 'Niên kim cố định hàng tháng'}</div>
          </div>

          <div class="param-box">
            <b>Số tiền vay:</b> ${formatVND(loanAmount)} &nbsp;|&nbsp;
            <b>Thời hạn:</b> ${tenorMonths} tháng &nbsp;|&nbsp;
            <b>Lãi suất:</b> ${ratePercent}%/năm
          </div>

          <table>
            <thead>
              <tr>
                <th>Kỳ</th>
                <th>Dư nợ đầu kỳ</th>
                <th>Gốc trả</th>
                <th>Lãi trả</th>
                <th>Tổng thanh toán</th>
                <th>Dư nợ cuối kỳ</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) => `
                <tr>
                  <td>${r.period}</td>
                  <td>${formatVND(r.beginningBalance)}</td>
                  <td>${formatVND(r.principal)}</td>
                  <td>${formatVND(r.interest)}</td>
                  <td style="font-weight: bold; color: #2563EB;">${formatVND(r.total)}</td>
                  <td>${formatVND(r.remaining)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Lỗi xuất PDF', err.message || 'Không thể tạo file PDF.');
    }
  },
};
