**Mục tiêu:** Nhập số có phân cách hàng nghìn; hai màn báo cáo sát menu phụ, ít khung; tiến độ hiện ngay dưới thẻ KPI và nhận được hồ sơ đã lưu.
**Phạm vi:** LÀM: định dạng khi nhập, bỏ padding ngoài cho hai route và Panel bao DataTable, bỏ biểu đồ so sánh thành viên, sắp xếp lại báo cáo, truy nguyên chủ sở hữu/tháng/membership và sửa lỗi nhận dữ liệu theo bằng chứng. KHÔNG LÀM: tự chuyển chủ hồ sơ, gán team hoặc đổi RLS chỉ để làm xuất hiện dữ liệu.
**Tệp dự kiến chạm:** lib/loanProgress và test; hooks/useProgressEditor; ProgressEditor; AppLayout; LoanProgressView; ProgressTable/TeamProgressReport; TeamKpiDashboard/TeamKpiReportCharts; tests liên quan. Mỗi thay đổi giữ đúng tầng của nó.
**Tầng:** lib định dạng/parse; hooks nhập liệu và tải; components bố cục; API chỉ sửa khi chẩn đoán cho thấy cần.
**Kiểm chứng bằng gì:** query DB thật đối chiếu dòng đã nhập, tháng và thành viên; test input có dấu phân cách vẫn lưu đúng số, không mất 0/null; test vị trí tiến độ và loại bỏ biểu đồ thành viên; browser desktop/mobile; npm test và build.
**Rủi ro đã biết:** Bộ lọc team không được mở rộng quyền ngoài team. Không sửa dữ liệu thật để phù hợp giao diện. Phải kiểm cả luồng thành viên và Leader; lỗi tải không được giả làm trạng thái rỗng.

**Cập nhật yêu cầu:** Chỉ Admin/Leader nhập và sửa báo cáo team. Thêm TeamId trực tiếp; thành viên thường đọc team. Dòng cũ chưa chọn team giữ nguyên để Admin mở sửa gán team, không tự backfill. Không còn lọc báo cáo theo người tạo; OwnerId giữ làm người tạo/audit. Migration bổ sung không phá hủy; kiểm quyền ghi cả team nguồn và đích.
