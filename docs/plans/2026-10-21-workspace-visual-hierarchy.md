# Phân cấp nền và màu cho giao diện làm việc

Phần bề mặt KPI đã được điều chỉnh tiếp theo phản hồi người dùng tại [workspace-soft-surfaces](2026-10-21-workspace-soft-surfaces.md). Các số đo bên dưới ghi nhận bản 8px trước tinh chỉnh.

**Mục tiêu:** Phân biệt rõ ô thống kê, vùng lọc, bảng và trạng thái; giữ nội dung rộng và nối liền menu phụ.
**Phạm vi:** LÀM: phục hồi nền trạng thái bị CSS làm phẳng ghi đè; dùng màu ngữ nghĩa cho sáu dải thống kê, thẻ KPI dùng chung; đồng bộ thanh lọc và tiêu đề bảng. KHÔNG LÀM: đổi dữ liệu, công thức, quyền, điều hướng, nội dung dashboard hoặc tự commit/push.
**Tệp dự kiến chạm:** src/index.css; src/lib/uiClasses.ts; nhóm components/ui/{KpiCard,DataTable,Tabs}; sáu dải KPI hiện có và team/TeamKpiSummaryCards; các thanh lọc ở customers/collateral/disbursement và báo cáo tiến độ; loanProgress/{ProgressTable,ProgressStageBadge}; AGENTS.md; docs/specs/workspace-visual-conventions.md; docs/progress/2026-10.md. Nhiều hơn năm tệp do cần gắn đúng sắc theo ý nghĩa từng chỉ số, không tô màu theo vị trí ô.
**Tầng:** Giao diện và CSS; không thay hooks, lib nghiệp vụ hoặc hạ tầng.
**Kiểm chứng bằng gì:** Full npm test, build; trình duyệt render component thật với CSS dự án ở sáng/tối, 1440/390/320px; đo nền, viền, tương phản, tràn ngang; kiểm nhấn lọc, tab, chọn dòng và bàn phím. Kiểm riêng nền cảnh báo, dialog và bản in không bị CSS màn hình lấn.
**Rủi ro đã biết:** Selector làm phẳng có độ ưu tiên cao; màu đang chọn không được che nghĩa cảnh báo; màu không được thay nhãn trạng thái; bảng nhiều cột phải cuộn trong vùng bảng, không đẩy ngang trang.

## Hướng thiết kế

- Nền và chữ giữ token hiện có: panel #FFFFFF, surface #F3F5F8, panel-muted #E6ECF5, ink #0A192F; tối theo token sẵn có.
- Màu thao tác và quy mô #004CB8; đạt/đang hoạt động #047653; cần chú ý #9D5604; hết hiệu lực #CA2121. Định danh KH #5B3BA2, TSĐB #0F6B76 và thẻ #A61C5B chỉ dùng trên KPI theo nhóm.
- Font, cỡ chữ và định dạng tiền kế thừa cấu hình người dùng.
- Khung trang vuông, liền menu. Theo điều chỉnh của người dùng, thẻ KPI bo nhẹ 8px để bớt thô, có viền mảnh, cạnh trái theo nghĩa và nền pha nhẹ; bộ lọc nền surface với ô nhập panel; tiêu đề bảng nền panel-muted.

```text
Menu | Tiêu đề và thao tác chính
     | [▏KPI quy mô] [▏KPI đạt] [▏KPI cảnh báo]
     | Nền thanh lọc nhẹ [ô nhập] [chọn] [nút]
     | Tiêu đề bảng nền đậm hơn
     | Dữ liệu / hover / dòng đang chọn
```

Rà theo yêu cầu: không thêm hộp lồng, bóng trang trí hoặc màu theo thứ tự. Dashboard có hệ màu riêng đã đủ phân cấp, giữ nguyên; chỉnh cơ chế CSS dùng chung và các vùng đang mất nền.

## Kiểm chứng

- Full Vitest: 4.725 test / 374 tệp đạt. Sau tinh chỉnh cuối, 62 test / 7 tệp liên quan KPI, bảng, tab, báo cáo team/tiến độ và token/tương phản đạt.
- Build TypeScript + Vite ra `.tmp/workspace-visual-final-build` đạt; oxlint các tệp nguồn sửa/thêm và `git diff --check` đạt.
- Edge trên localhost, fixture render component thật: sáu dải thống kê và bảy thẻ KPI team, bảng dùng chung, tiến độ hồ sơ, tab và nền cảnh báo ở sáng/tối × 1440/390/320px. 36 dải không tràn ô/trang, thẻ team không tràn; KPI bo 8px, khung trang vẫn vuông; không lỗi JS.
- 498 mẫu chữ đo tương phản trên nền thực tế: thấp nhất 4,97:1. Nhấn lọc khách hàng/tài sản, đổi tab, chọn dòng và focus bàn phím đạt; cạnh đỏ của KPI hết hiệu lực vẫn giữ khi chọn.
- Nền cảnh báo được giữ; dialog vẫn bo 12px và tiêu đề bảng trong dialog không bị style workspace ghi đè. Kiểm media print: không áp quy tắc làm phẳng màn hình.
- Đã xem ảnh desktop sáng và mobile tối, gồm thẻ team. Fixture dùng dữ liệu mẫu, không đọc/ghi hồ sơ thật; chưa kiểm toàn bộ route với phiên đăng nhập thật.
