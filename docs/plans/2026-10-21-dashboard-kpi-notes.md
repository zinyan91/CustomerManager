# Bỏ dòng phụ trên thẻ KPI Tổng quan

**Mục tiêu:** Năm thẻ KPI không còn năm dòng phụ người dùng chỉ định.
**Phạm vi:** Bỏ dòng khách có dư nợ, tổng hạn mức, LTV bình quân, hạn mức thẻ và lời nhắc cảnh báo; giữ nhãn, số chính, đơn vị và thanh chỉ báo hiện tại. Không đổi dữ liệu hoặc công thức.
**Tệp dự kiến chạm:** `src/components/dashboard/DashboardSummaryKpis.tsx`, test hiện có và nhật ký tiến độ.
**Tầng:** components, chỉ trình bày.
**Kiểm chứng bằng gì:** Cập nhật kỳ vọng test hiển thị hiện có; npm test và npm run build; kiểm tra diff.
**Rủi ro đã biết:** Không bỏ số chính hoặc thay đổi các thẻ KPI ở màn khác.
