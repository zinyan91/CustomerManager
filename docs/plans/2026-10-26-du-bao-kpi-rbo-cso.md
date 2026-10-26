# Dự báo KPI RBO, CSO

**Mục tiêu:** Người dùng nhập cấp bậc, khu vực 5, thâm niên và kết quả dự kiến để xem kế hoạch, điểm KPI, tỷ lệ hoàn thành và thưởng dự kiến ngay trong CustomerManager.

**Phạm vi:** LÀM: thêm mục Dự báo KPI trong menu phụ Tổng quan; chuyển bảng hệ số và công thức của workbook `DU BAO KPI RBO-CSO.xlsx` thành hàm TypeScript thuần; chỉ cho chọn khu vực 5; hỗ trợ RBO1 đến RBO6 và CSO1 đến CSO3; hiển thị bảng chỉ tiêu theo đúng thứ tự từ trên xuống dưới của tab `DU BAO`, đặt từng cấu phần doanh số phí ngay dưới dòng tổng phí để nhập riêng, và hiển thị ba bậc thưởng. KHÔNG LÀM: sửa workbook gốc; thay đổi Team & KPI; lưu dữ liệu vào Supabase; gộp các cấu phần phí thành một ô; thêm chính sách SRBO quản lý; tự sửa những điều kiện thưởng mà workbook ghi là chưa bao gồm.

**Tệp dự kiến chạm:** `src/types/kpiForecast.ts`; `src/lib/kpiForecast.ts`; `src/hooks/useKpiForecast.ts`; `src/components/kpiForecast/`; `src/components/views/KpiForecastView.tsx`; `src/App.tsx`; `src/lib/workspaceNavigation.ts`; `src/lib/modules.ts`; các test điều hướng và tính toán; `docs/progress/2026-10.md`.

**Tầng:** `types` giữ kiểu dữ liệu; `lib` giữ hệ số và công thức; `hooks` giữ trạng thái nhập; `components` chỉ hiển thị và phát sự kiện; không có migration.

**Kiểm chứng bằng gì:** đối chiếu bộ dữ liệu mẫu trong workbook phải cho điểm kế hoạch 285,2, điểm thực hiện 155,255 và tỷ lệ hoàn thành 54,437%; unit test các ngưỡng thâm niên, trần 130% và ba bậc thưởng; chạy test liên quan, toàn bộ `npm test`, `npm run build`, linter giao diện và kiểm tra màn hình ở 1440px, 768px, 390px.

**Rủi ro đã biết:** workbook có điều kiện thưởng chưa bao gồm tăng trưởng, ràng buộc TTKD, mức thưởng tối đa và điểm trừ; công thức khu vực của một số chỉ tiêu cấp bậc 1 dưới ba tháng không đồng nhất với các chỉ tiêu khác; cần giữ đúng công thức nguồn, không tự chuẩn hóa.
