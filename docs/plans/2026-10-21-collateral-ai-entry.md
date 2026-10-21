# Đồng bộ Định giá tài sản và bỏ nút chat AI trùng

**Mục tiêu:** Trang Định giá tài sản liền menu phụ và cùng bố cục ba trang tín dụng đã chỉnh; mỗi trang chỉ có một nút mở chat AI.
**Phạm vi:** LÀM: header chung, dải thống kê, tìm kiếm/bảng/form tài sản; bỏ nút AI trên header; trang thường giữ nút nổi, Văn thư/Kho lưu trữ/BCTC giữ nút AI có ngữ cảnh; ẩn nút nổi khi chat mở và đóng chat chung khi chuyển trang. KHÔNG LÀM: thay công thức LTV/định giá, API/quyền, dữ liệu, luồng AI nhập hồ sơ/tài liệu, tự commit/push.
**Tệp dự kiến chạm:** AppLayout, Header, ai/AiChatDialog; views/CollateralView; collateral/{CollateralSummaryStrip,CollateralSearchBar,CollateralTable,CollateralForm}; kiểm thử điều hướng AI.
**Tầng:** components hiển thị và điều phối phần mở chat có sẵn; summary nhận số liệu/controller hiện có, không tính tiền trong JSX mới.
**Kiểm chứng bằng gì:** test tích hợp AppLayout đếm nút AI theo route và chuyển trang; các test tài sản theo khách; browser fixture desktop/mobile sáng/tối đo lề/bo góc, lọc/chọn/thêm tài sản và đếm nút trên các trang thực; full test/build/lint.
**Rủi ro đã biết:** giữ AI BCTC đọc profile hiện tại, AI Văn thư/Kho đọc đúng tài liệu và quyền; không đếm nút nhập tài liệu bằng AI là nút chat; bố cục form inline vẫn đủ trường và dòng tổng cộng của bảng giữ nguyên.

## Thiết kế

Kế thừa palette panel #FFFFFF, surface #F3F5F8, line #C4D1E3, ink #0A192F, accent #004CB8, pos #047653 và ánh xạ tối có sẵn. Font-app, font-mono cho tiền, tiêu đề text-base font-semibold; lề trong 16px.

```text
Menu phụ | Định giá tài sản                       [Thêm TSBĐ mới]
         | Tổng giá trị | Hết hiệu lực | Sắp hết hạn | Chưa định giá
         | Tìm kiếm
         | Bảng + tổng cộng + phân trang
         | Form tạo/sửa có thể thu gọn
```

Đối chiếu Danh sách KH/HĐTD: chỉ giữ đường phân cách giữa khối, bỏ bo góc/bóng khung trang; không đổi bảng thành thẻ hay bỏ dữ liệu. AI chỉ còn một lối mở chat theo trang, giữ nút xử lý tài liệu riêng vì có mục đích khác.
