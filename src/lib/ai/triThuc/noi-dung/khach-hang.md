---
id: khach-hang
tieuDe: Khách hàng
moTa: Danh sách khách hàng, thêm và dán nhanh hồ sơ, kiểm tra CCCD và số điện thoại, lưu trữ thay vì xóa, phạm vi theo tài khoản
nhom: Hồ sơ tín dụng
tuKhoa: [khách hàng, hồ sơ khách hàng, cif, cccd, cmnd, số điện thoại, dán nhanh, lưu trữ hồ sơ, xóa khách hàng, khlq, người bảo lãnh, tiến độ hồ sơ]
trang: [/customers]
nguon: [src/components/views/CustomerListView.tsx, src/components/customer/CustomerDrawerForm.tsx, src/lib/customerStatus.ts, src/lib/customerValidation.ts, src/lib/customerProgress.ts, src/lib/ownerScope.ts, src/hooks/useCustomerListController.ts]
---
# Khách hàng

## Danh sách
- Tìm theo Mã CIF, Họ tên, Số CCCD. Lọc theo trạng thái: Đang làm việc, Đã lưu trữ, Tất cả (kèm số lượng).
- Cột "Tiến độ hồ sơ" cho biết khách đã có đủ ba phần chưa: Hợp đồng tín dụng, Quản lý khoản vay, Tài sản bảo đảm.
- "XUẤT DANH MỤC ĐANG VAY" ra Excel danh sách khách đang vay kèm khoản vay (KUNN) và tài sản bảo đảm.
- "THÊM KHÁCH HÀNG MỚI" mở form hồ sơ bên cạnh.

## Phạm vi theo tài khoản
Người dùng thường chỉ thấy khách của mình. Tài khoản quản trị mặc định xem khách của chính mình và có thể chuyển sang "Tất cả tài khoản", "Chưa phân công" hoặc một tài khoản khác; khi đang xem dữ liệu của người khác có lối quay về tài khoản của tôi. Ô "Người phụ trách (tài khoản)" trong form chỉ tài khoản quản trị thấy; mặc định giữ nguyên hoặc là tài khoản của tôi.

## Form hồ sơ
- "Dán nhanh": dán email, tin nhắn hay ghi chú rồi bấm "Nhận diện & Tự điền"; hệ thống bóc CIF, họ tên (đổi sang chữ hoa), CCCD, ngày và nơi cấp, số điện thoại, email, số tài khoản, địa chỉ. Ngày dạng dd/mm/yyyy được đổi sang yyyy-mm-dd. Dòng không có nhãn thì tách theo dấu | hoặc tab.
- Số CCCD/CMND phải đúng 9 số (CMND) hoặc 12 số (CCCD). Số điện thoại phải đúng 10 số; nhiều số cách nhau bằng " / ". Cùng quy tắc cho người liên quan.
- Phần "Người liên quan (KHLQ) / Vợ Chồng / Người bảo lãnh" nhập được một người, chọn mối quan hệ (vợ/chồng, người bảo lãnh, bên bảo đảm chủ TSĐB, bố/mẹ, con cái, đại diện pháp luật, khác); nút "+ Thêm người bảo lãnh/KHLQ" mở phần này. Đã kết hôn với quan hệ "Vợ / Chồng" thì bắt buộc nhập họ tên vợ/chồng.

## Xóa và lưu trữ
Khách còn khoản vay (KUNN), hợp đồng thế chấp, hợp đồng tín dụng, tài sản bảo đảm hoặc thẻ tín dụng thì không xóa được; thông báo nêu số lượng từng loại. Chỉ Master Admin xóa vĩnh viễn được; người khác dùng "Lưu trữ hồ sơ" để ẩn khỏi danh sách "Đang làm việc", "Bỏ lưu trữ" đưa trở lại.

## Chỗ dễ sai
- Nhập số điện thoại hay CCCD thiếu hoặc thừa số thì không lưu được.
- Khách không thấy trong danh sách thường do đang lọc "Đang làm việc" trong khi hồ sơ đã lưu trữ, hoặc đang xem phạm vi của tài khoản khác.
