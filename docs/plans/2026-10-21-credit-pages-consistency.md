# Đồng bộ ba trang nghiệp vụ tín dụng

**Mục tiêu:** Danh sách khách hàng, Hợp đồng tín dụng và Thông tin giải ngân liền menu phụ, có cùng kiểu tiêu đề/thanh thao tác; bỏ khung bo góc lồng nhau.
**Phạm vi:** LÀM: bố cục trang, tiêu đề, thanh số liệu, bộ lọc, danh sách HĐTD và bảng. Giữ đầy đủ dữ liệu, hành động, form và định tuyến. KHÔNG LÀM: thay nghiệp vụ, công thức tiền, API, RLS, schema, tự commit/push.
**Tệp dự kiến chạm:** AppLayout.tsx; ui/WorkspacePageHeader.tsx; views/{CustomerListView,CreditContractView,DisbursementPayeeListView}.tsx; customers/CustomerListSummaryStrip.tsx; creditContract/{CreditContractKpiStrip,KunnAccordionItem}.tsx. Ba trang dùng chung tiêu đề, các khối số liệu có component riêng.
**Tầng:** components thuần hiển thị, dùng controller và dữ liệu hiện có; không đổi hooks/lib/types.
**Kiểm chứng bằng gì:** toàn bộ Vitest, build vào .tmp, oxlint tệp sửa; Edge trên localhost bằng fixture chặn toàn bộ Supabase, desktop sáng/tối và mobile. Kiểm tra mép nội dung, khung số liệu, lọc khách/lưu trữ, mở form, chuyển khách và mở chi tiết KUNN.
**Rủi ro đã biết:** không mở rộng bố cục sang các trang tín dụng chưa yêu cầu; marker workspace không được làm mất bo góc hộp thoại; bảo toàn thao tác theo URL và chỉ đọc đúng phạm vi; không ghi dữ liệu thật.

## Thiết kế

Dùng token hiện có: panel #FFFFFF, surface #F3F5F8, line #C4D1E3, ink #0A192F, accent #004CB8, pos #047653; chế độ tối dùng ánh xạ sẵn của hệ thống. Font kế thừa font-app, số tiền font-mono, tiêu đề text-base font-semibold, thanh thao tác text-xs, lề trong 16px.

```text
Menu phụ | Tiêu đề ngắn                          [Thêm/Tạo]
         | Số liệu cùng hàng, phân cách bằng đường kẻ
         | Bộ lọc / tìm kiếm
         | Bảng dữ liệu hoặc các HĐTD ngăn bằng đường kẻ
```

Căn trái nhãn và thông tin, căn phải cột tiền; trên mobile số liệu chia hai cột, hành động tự xuống hàng. Giữ bo góc ô nhập/nút/hộp thoại theo token, bỏ bo góc và bóng trên khung trang. HĐTD vẫn có đầy đủ hạn mức, dư nợ, khả dụng, KUNN, tài sản và trạng thái; không đổi thành bảng làm mất nội dung.

Đã đối chiếu phương án với bố cục Khoản vay/Báo cáo Excel đang chạy: dùng chung mặt phẳng và đường phân cách, không thêm hệ màu, phụ đề hay khung trang mới.
