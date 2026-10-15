---
id: giai-ngan
tieuDe: Thông tin giải ngân (người thụ hưởng)
moTa: Danh sách người thụ hưởng giải ngân và tài khoản ngân hàng, lưu máy chủ và trên máy, dùng khi lập biểu mẫu hồ sơ
nhom: Hồ sơ tín dụng
tuKhoa: [thông tin giải ngân, người thụ hưởng, thụ hưởng, tài khoản thụ hưởng, stk thụ hưởng, ngân hàng thụ hưởng, chưa đồng bộ]
trang: [/disbursement]
nguon: [src/lib/disbursementDb.ts, src/components/views/DisbursementPayeeListView.tsx, src/components/documents/dossier/CommonInfoForm.tsx]
---
# Thông tin giải ngân

Màn này chỉ quản lý danh sách người thụ hưởng giải ngân và tài khoản ngân hàng của họ. Không ghi số tiền, ngày hay khoản giải ngân; khoản vay (KUNN) và hạn mức giải ngân nằm ở màn Hợp đồng tín dụng và Quản lý khoản vay.

## Dùng
- "THÊM THÔNG TIN MỚI" mở form: Họ và tên người thụ hưởng (bắt buộc, tự đổi sang chữ hoa), Số CCCD (ô gợi ý 12 chữ số, hệ thống không kiểm độ dài), ngày và nơi cấp CCCD, và các tài khoản ngân hàng.
- "Thêm tài khoản" cho nhiều tài khoản mỗi người, mỗi tài khoản có số tài khoản, ngân hàng, chi nhánh. Tài khoản đầu tiên là tài khoản chính. Dòng tài khoản để trống hoàn toàn thì bị bỏ.
- Ô tìm theo Họ tên, CCCD, STK, Ngân hàng. Dòng "Tổng cộng" đếm số người thụ hưởng đang hiện.
- Danh sách này không gắn với khách hàng cụ thể. Khi lập biểu mẫu trong bộ hồ sơ, chọn một người ở phần người thụ hưởng thì họ tên, CCCD, ngày và nơi cấp, cùng tài khoản chính (số tài khoản, ngân hàng, chi nhánh) được điền vào Bên B.

## Lưu ở đâu
Mỗi lần lưu hoặc xóa đều ghi lên máy chủ và luôn giữ thêm một bản trong trình duyệt của máy này. Máy chủ lỗi thì báo "Đã lưu tạm trên máy này nhưng chưa đồng bộ được lên máy chủ. Vui lòng kiểm tra kết nối và lưu lại."

## Chỗ dễ sai
- Máy chủ lỗi hoặc trả danh sách rỗng thì màn hiện bản lưu trong trình duyệt; máy chủ có dữ liệu thì bản trên máy bị thay bằng dữ liệu máy chủ. Người nhập lúc mất kết nối rồi không lưu lại sẽ không có dữ liệu trên máy khác.
- Xóa khi máy chủ lỗi chỉ xóa trên máy này, lần tải sau người đó có thể hiện lại.
