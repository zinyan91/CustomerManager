---
id: team-kpi
tieuDe: Quản trị team và KPI
moTa: Quản trị team, báo cáo KPI và tiến độ hồ sơ
nhom: Quản trị
tuKhoa: [team, nhóm kinh doanh, leader, thành viên, chỉ tiêu, kpi, rbo, srbo, phân bổ, nhập excel]
trang: [/admin/teams, /admin/kpi]
nguon: [src/components/views/AdminTeamsView.tsx, src/components/views/AdminKpiDataView.tsx, src/components/views/TeamKpiView.tsx, src/components/team/TeamKpiDashboard.tsx, src/components/team/KpiTargetsWorkspace.tsx, src/lib/permissions.ts, src/lib/kpiImport.ts, src/lib/kpiReport.ts]
---
# Team và KPI

## Quản trị team
Chỉ Master Admin mở Quản trị → Team để tạo team, gán hoặc chuyển thành viên và bổ nhiệm Leader. User Admin không có quyền quản lý cơ cấu team. Gán vai trò team không đổi quyền hệ thống: Master Admin vẫn là Master Admin khi được gán thành viên.

Mỗi người chỉ có một team tại một thời điểm. Thay Leader giữ lịch sử; chuyển Leader sang team khác phải bổ nhiệm người thay trước.

## Team & KPI
Team & KPI nằm trong menu phụ Tổng quan: 7 card chỉ tiêu, tiến độ hồ sơ, xu hướng tháng/lũy kế; không so sánh thành viên. Dùng bộ UI chung, không có form giao chỉ tiêu cá nhân.

Thành viên xem số liệu mình, Leader xem team. Dashboard cá nhân giữ phạm vi riêng. Kỳ, chỉ tiêu và import ở Quản trị → Dữ liệu KPI, chỉ Master Admin quản lý.

Server còn capability phân bổ cho Leader; trang báo cáo không dựng form nhập. Phiên bản cũ hoặc phân bổ vượt ngân sách bị từ chối.

## Báo cáo tiến độ
Tổng quan → Báo cáo tiến độ: khách mới nhập tên, hiện hữu chọn KH của mình. Nhập Số tiền, Thẻ (số lượng), Phí, Bảo hiểm (tiền VND); loại hồ sơ, ngắn/dài hạn và 11 tiến độ từ nhận hồ sơ đến giải ngân. STT tự động; không tạo CIF.

Admin/Leader nhập, sửa theo Team và Nhân sự phụ trách được chọn; thành viên chỉ đọc team. Nhân sự lấy theo Team; đổi Team xóa lựa chọn cũ. Dòng cũ cần chọn thêm dữ liệu còn thiếu. Team & KPI tổng hợp TeamId/tháng, hiện tên nhân sự; tab nhập ẩn cột Team/nhân sự. Không cộng vào KPI tăng ròng. Giữ lịch sử và chặn ghi đè phiên bản cũ.

## Nguồn kết quả
Master Admin tải mẫu Excel tại Quản trị → Dữ liệu KPI: tài khoản, mã chỉ tiêu và loại dữ liệu điền sẵn, không nhập CIF. Nhập vào sheet KPI các ô giá trị số; không dùng công thức. Loại month cho phát sinh tháng, snapshot cho quy mô dư nợ; không nhập lũy kế năm thành số tháng.

Xem trước báo lỗi và chênh lệch. Bản thay thế giữ revision trước; nhập lại không cộng thêm. Phí dịch vụ khớp bảy thành phần, giữ dấu hoàn/hủy.

## Cách đọc báo cáo
Thiếu số liệu hiển thị —, khác số 0. Tăng ròng có thể âm. Lũy kế phát sinh cộng các tháng đủ dữ liệu; quy mô dư nợ lấy cuối kỳ. Chưa có chính sách quy đổi điểm RBO/SRBO thì không tính điểm hoặc thưởng.

Chốt kỳ cần dữ liệu đến cuối tháng và đủ chỉ tiêu, số thực hiện từng thành viên. Mở lại kỳ cần lý do; snapshot cũ được giữ. Người có lịch sử team/KPI nên khóa đăng nhập thay cho xóa tài khoản.
