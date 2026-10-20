**Mục tiêu:** Bỏ toàn bộ nhóm nhập Cơ sở xác định khỏi bảng tính hạn mức; phụ lục xuất tự ghi tỷ trọng doanh thu.
**Phạm vi:** LÀM: bỏ nhóm textarea và danh mục nhãn không dùng; bổ sung tỷ trọng mặc định cho những dòng xuất đang để trống. KHÔNG LÀM: đổi công thức tiền, số liệu, cấu trúc phụ lục hoặc dữ liệu lưu.
**Tệp dự kiến chạm:** BusinessPlanView.tsx, useBusinessPlanController.ts, businessPlanExport.ts, businessPlanExport.test.ts; progress.
**Tầng:** Giao diện bỏ ô nhập; hàm xuất thuần dùng lại shareOfRevenueText.
**Kiểm chứng bằng gì:** Test phụ lục kiểm tỷ trọng từng dòng và doanh thu 0; test view hiện có; browser xác nhận mất nhóm và xuất .xlsx đọc lại; full test/build.
**Rủi ro đã biết:** Các dòng nhân công, mặt bằng, điện nước và thuế chưa có fallback tỷ trọng; mẫu doanh thu 0 phải giữ trống thay vì NaN/Infinity. Giữ khả năng đọc basis cũ ở tầng xuất.
