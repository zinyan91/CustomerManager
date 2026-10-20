# Triển khai role theo team và nối dữ liệu KPI

### Điều chỉnh trang báo cáo sau phản hồi ngày 20/10/2026

**Mục tiêu:** `/team-kpi` là dashboard báo cáo kinh doanh, đồng bộ Tổng quan: card KPI, so sánh thành viên và xu hướng/kế hoạch theo tháng.
**Phạm vi:** Bỏ khung tên team/vai trò, danh sách nhân sự, hồ sơ và toàn bộ form/bảng giao chỉ tiêu cá nhân khỏi trang báo cáo. Giữ 7 card chỉ tiêu dù chưa có dữ liệu, không biến thiếu dữ liệu thành 0. Quản trị team giữ ở `/admin/teams`; công cụ kỳ/chỉ tiêu/import giữ ở trang quản trị riêng. Không sửa Dashboard cá nhân, migration, membership hoặc dữ liệu thật.
**Tệp dự kiến chạm:** TeamKpiView; bộ component báo cáo team; hook nạp báo cáo thống nhất; model thuần tổng hợp/định dạng từ kpiReport; điểm vào công cụ KPI trong Quản trị và test. Tách hiển thị, trạng thái, nghiệp vụ và repository; tái sử dụng API hiện có.
**Tầng:** Component trình bày dùng bộ `ui/Panel`, `Button`, `Field`, `Tabs`, `KpiCard`, `DataTable` và token toàn ứng dụng; hook nạp một snapshot cho cả màn; model thuần tính card/biểu đồ/bảng tháng; API chỉ đọc đã có.
**Kiểm chứng bằng gì:** Test model thiếu dữ liệu/số âm/month/YTD/stock; test route không dựng form/quản lý nhân sự/hồ sơ; test hủy request cũ và dữ liệu thống nhất; test/build; Edge kiểm có số liệu/không có kỳ, desktop/mobile và sáng/tối.
**Rủi ro đã biết:** Đọc từng khung độc lập gây lệch kỳ; trộn đơn vị trên biểu đồ; card biến mất khi chưa tạo kỳ; cộng stock vào lũy kế; UI báo 0 dù thiếu nguồn. Kết quả thật chưa có batch nên giữ —, browser fixture chỉ dùng kiểm giao diện.

Rà giao diện: kiểm cấu trúc 36 tệp `views`, khung ứng dụng/quản trị, `uiClasses.ts`, CSS token và component dùng chung. Phần Team trước đây tự dựng khung `rounded-lg`, nút/cỡ chữ riêng thay vì dùng bộ `ui/`; đồng thời có hai KpiCard khác nhau (`dashboard/` và `ui/`). Bản sửa dùng component chung toàn ứng dụng, không lấy một trang đơn lẻ làm chuẩn và không đổi nội dung chức năng các màn hiện hữu.

Đã phát hiện qua CSS build: `text-[var(--fs-label)]` được Tailwind sinh thành `color: var(--fs-label)`, không đặt cỡ chữ. Sửa sang `text-[length:var(...)]` cho token chữ ở Card, Field, Panel, Dialog và DataTable; giá trị card dùng `num-lead` có sẵn để không bị `.font-mono` ép về cỡ số trong bảng. Browser đo lại nhãn 11px và số lớn hơn nhãn theo thiết lập mặc định.

Route báo cáo hiện chỉ đọc, không có form nhân sự/hồ sơ/giao chỉ tiêu/Excel. Công cụ dữ liệu đã chuyển sang `/admin/kpi`, mục Quản trị → Dữ liệu KPI, chỉ Master Admin; `/admin/teams` tiếp tục quản lý cơ cấu. Không đổi schema, membership hoặc số liệu thật trong lần sửa giao diện này.

Ngày: 20/10/2026. Trạng thái: đã triển khai nền tảng team/KPI trên localhost và Supabase; chưa có dữ liệu KPI kinh doanh được công bố hoặc chính sách quy đổi điểm.

### Triển khai bắt đầu ngày 20/10/2026

**Mục tiêu:** Team/KPI dùng dữ liệu Supabase thật, role team đúng và được kiểm chứng bằng truy vấn, đối soát số liệu, test quyền và trình duyệt.
**Phạm vi:** Thực hiện P1–P6 theo thứ tự phụ thuộc, giữ nguồn Excel đã chốt và trạng thái thiếu công thức. Không xóa dữ liệu, không tự gán nhân sự thật vào team theo suy đoán, không dùng mock làm kết quả thật.
**Tệp dự kiến chạm:** Theo các gói trong mục 10: lib/types và test phạm vi, migration/team API, hooks, màn React, import Excel và test tích hợp. Tách từng gói theo trách nhiệm, không dồn nghiệp vụ trong component.
**Tầng:** Nghiệp vụ thuần và quyền theo ngữ cảnh ở lib/types; truy cập dữ liệu qua API/RPC; trạng thái qua hooks/context; RLS và ràng buộc ở migration.
**Kiểm chứng bằng gì:** Test RED trước sửa phạm vi; PGlite chạy migration theo role; test/build; kiểm RLS, ngân sách, import và chốt kỳ bằng giao dịch rollback trên Supabase. Browser Edge kiểm giao diện bằng fixture chặn request tới Supabase. Phạm vi của nhân sự thật được kiểm bằng SQL authenticated.
**Rủi ro đã biết:** Mở SELECT team làm rộng Dashboard cá nhân; helper cũ dùng cho cả đọc/ghi; nhập trùng; nhầm số dư/tháng/lũy kế. Đã thêm điều kiện request `x-team-read: 1` trong helper đọc hồ sơ team; chỉ API hồ sơ team gửi header. Dashboard cũ không gửi header nên không mở rộng phạm vi.

### Kết quả triển khai

- P1: user thường có scope OwnerId rõ ràng. P2: Team/Leader/member, lịch sử, audit, quyền đọc bảng con; giữ nguyên helper ghi. Tạo team và gán nhân sự nằm ở **Quản trị → Team**, capability `team.manage` chỉ cho Master Admin. Cả UI lẫn DB chặn User Admin quản lý cơ cấu.
- Theo xác nhận người dùng, đã tạo Team Thanh Tùng: Thanh Tùng là Leader; Xuân Như và Công Bằng là thành viên. Không đổi `UserRoles`: Công Bằng vẫn là Master Admin. Thao tác SQL ghi lý do theo xác nhận, không giả danh tài khoản để ghi audit.
- Kiểm SQL authenticated trên danh mục thật: Thanh Tùng có 0 khách cá nhân, phạm vi team có 53 khách; Xuân Như chỉ thấy 49 khách của mình. 5 bảng Customers/LoanContracts/RepaymentSchedules/CardContracts/UserRoles giữ nguyên counts và hash mọi trường so với trước migration.
- P3: 7 định nghĩa KPI, kỳ, ngân sách/phân bổ, version, kiểm không vượt ngân sách và audit; giao diện React gọi API thật.
- P4: mẫu Excel có tài khoản sẵn, sheet KPI và basis month/snapshot; ô giá trị, không nhận công thức/YTD; xem trước lỗi/trùng, từng dòng và tổng từng KPI. Công bố toàn bộ bản thay thế, giữ revision cũ và khử nhập trùng. Bảy thành phần phí có cột riêng và kiểm tổng.
- P5: bỏ iframe khỏi route, Team & KPI ngay dưới Tổng quan; bảng kế hoạch/thực hiện tháng và lũy kế/cuối kỳ, biểu đồ từng tháng/thành viên; hồ sơ team chỉ đọc. Số KPI công bố lấy từ observation đã kiểm; hồ sơ CRM là dữ liệu vận hành riêng, không cộng lẫn hai nguồn.
- P6: Master Admin chốt/mở kỳ với lý do; chốt cần đủ dữ liệu cuối tháng, chỉ tiêu và thực hiện của nhân sự; snapshot nằm ở schema nội bộ, không xóa khi mở lại. Điểm RBO/SRBO chưa triển khai khi thiếu chính sách.
- Edge Function `admin-users` đã cập nhật kiểm lịch sử membership/KPI trước xóa tài khoản. FK RESTRICT là lớp chặn độc lập.
- Chưa tạo kỳ, ngân sách hoặc số KPI thật tùy đoán. Chưa import workbook tra cứu 30/09 thành số tháng vì chưa đủ căn cứ tháng/YTD và đội hình mới bắt đầu từ ngày được gán. Có thể nhập file chuẩn sau khi đối soát nguồn.
- Chưa push hoặc deploy frontend production. Dev server chạy cổng 5173. Các thay đổi Supabase và Edge Function đã áp thật.
- Kiểm cuối: 4.551 test/352 tệp qua, build qua, lint mô-đun mới không cảnh báo. Browser Edge qua luồng quản trị/quyền, chỉ tiêu, tải và mở mẫu Excel, preview/công bố, hồ sơ chỉ đọc, lỗi server và responsive. Kiểm số còn lại trên DB: 1 team/3 membership/7 definitions; 0 kỳ/batch/observation/snapshot thử.

Backup đã xác minh: `backup-20261020-1729` tại commit `77fff53e8f1233f35f3a645bd8451b6513c29702`. Các thay đổi chưa commit có sẵn được giữ nguyên trong worktree; nhánh backup chỉ giữ commit hiện tại.

Thiết kế giao diện và đối chiếu Excel: [Team và KPI](2026-10-20-team-va-kpi.md).

## 1. Kết quả cần đạt và phạm vi

- Giữ Tổng quan hiện tại. **Team & KPI** nằm ngay dưới **Tổng quan** trong menu phụ, không thêm mục ở cột ngoài.
- Đăng nhập là xác định được người dùng, team và quyền; không nhập CIF cán bộ để tra cứu.
- Thành viên xem KPI RBO của mình. Leader xem tổng hợp team, KPI từng thành viên và phần đánh giá SRBO.
- Leader xem hồ sơ thành viên nhưng không sửa, thu nợ, chuyển giao hoặc xóa hồ sơ người khác.
- Thẻ số liệu, biểu đồ và bảng chỉ tiêu dùng cùng nguồn đã kiểm tra, không còn fixture mô phỏng.
- Chưa triển khai thưởng/lương chính thức khi thiếu công thức. Không xây hệ thống core tiền gửi hoặc kế toán phí trong đợt này.

Đã bắt đầu code theo brief trên, giữ các quyết định nghiệp vụ và các phần thiếu nguồn ở mục 12.

## 2. Khảo sát trước triển khai

| Tệp | Kết quả và ảnh hưởng |
|---|---|
| `src/lib/permissions.ts` | Quyền hệ thống có `master_admin`, `user_admin`, `user`; `can()` hiện chỉ nhận quyền hệ thống |
| `src/context/AuthContext.tsx` | Đọc `UserRoles.Role/FullName` sau đăng nhập; chưa nạp membership |
| `src/lib/ownerScope.ts`, `src/context/UserScopeContext.tsx` | User thường dùng scope `all` và dựa vào RLS để thu hẹp về chính mình; admin mặc định tài khoản của mình |
| `src/lib/api/customerApi.ts` | Danh sách có giới hạn 1.000 dòng, danh sách ID phạm vi có giới hạn 5.000; `fetchCustomersAPI` trả `[]` khi lỗi, còn bản strict ném lỗi |
| `src/lib/api/cardContractApi.ts` | Danh sách thẻ cũng có nhánh lỗi trả `[]`; có `IssueDate`, nhưng một hợp đồng có thể gồm nhiều dòng thẻ |
| `src/types/index.ts` | `Customer` chưa có ngày quan hệ mới đủ để tính KPI; `LoanContract` có ngày giải ngân; lịch trả nợ có ngày thanh toán nhưng chưa chứng minh là sổ sự kiện không bị sửa |
| `supabase/migrations/37_hop_dong_the.sql` | Hạn mức chung cho cả hợp đồng và nhiều sản phẩm; không thể mặc định một hợp đồng = một thẻ KPI |
| `supabase/migrations/51_view_goc_da_thu_theo_hop_dong.sql` | `ContractPaidPrincipal` là tổng gốc đã thu hiện tại, không có bộ lọc thời điểm quá khứ |
| Migrations `02`, `60`, `65`, `66` | Có policy ghi dùng `can_access_customer/contract`; cờ module là điều kiện bổ sung; có nhật ký chuyển giao KH |
| `src/lib/api/userAdminApi.ts`, `UserManagementView.tsx` | Đã có UI quản lý tài khoản gọi Edge Function `admin-users`; không cần xây lại luồng tạo user |
| `supabase/functions/admin-users/index.ts` | Khóa tài khoản qua `ban_duration`; xóa tài khoản kiểm danh sách dữ liệu đang chặn xóa. Phải bổ sung vòng đời team/KPI vào các thao tác này |
| `src/lib/workspaceNavigation.ts`, `src/App.tsx`, `TeamKpiPreview.tsx` | Điểm vào KPI đang chỉ ở dev, nhúng HTML mô phỏng; chưa phải màn React nối CSDL |

Trước triển khai, `src/` và migrations chưa có mô hình team/KPI hoặc sổ số dư tiền gửi/phí đủ dùng cho báo cáo này. Các biến CASA trong chào lãi suất và công thức phí tư vấn không chứng minh có số dư CASA hoặc phí đã hạch toán.

Đã truy vấn catalog/policy thật trước P2. Sau hai migration và kiểm RLS trong giao dịch rollback, counts và hash mọi trường của Customers (53), LoanContracts (123), RepaymentSchedules (10.606), CardContracts (9), UserRoles (5) khớp baseline.

## 3. Cơ chế role đề xuất: hai lớp

### Quyền hệ thống giữ ba giá trị

`UserRoles.Role` tiếp tục là `master_admin | user_admin | user`.

Không đổi user cũ thành Leader hàng loạt, không thêm Leader vào `is_admin()`. Vai trò quản trị hệ thống và vai trò kinh doanh có mục đích khác nhau.

### Vai trò team lưu trong membership

`TeamMemberships.TeamRole = leader | member`.

Ví dụ: một tài khoản có quyền hệ thống `user`, thuộc team A với vai trò `leader`: xem team A, sửa hồ sơ của chính mình và chỉ đọc hồ sơ thành viên team A.

Trong Quản trị → Team, quản lý cơ cấu riêng với Quản lý người dùng:

| Nhóm trường | Nội dung |
|---|---|
| Quyền hệ thống | Master Admin / User Admin / User như hiện tại |
| Team nghiệp vụ | Team đang hoạt động, ngày bắt đầu/kết thúc |
| Vai trò trong team | Leader / Thành viên |
| Chính sách KPI | RBO / SRBO, chức danh/cấp bậc và phiên bản chính sách nếu cần |

RBO1–RBO6 là cấp bậc nghiệp vụ, không phải sáu mức quyền bảo mật. Template RBO/SRBO suy ra theo membership và chính sách, không cho người dùng tự chọn role trên trang KPI.

Giả định phiên bản đầu: một user có tối đa một team hoạt động tại mỗi thời điểm; một Leader hoạt động trong mỗi team. Leader nằm trong danh sách nhân sự team đúng một lần.

Đổi Leader, chuyển team hoặc kết thúc membership chạy qua RPC có giao dịch, khoảng hiệu lực `[EffectiveFrom, EffectiveTo)` và nhật ký. Không xóa membership đã được báo cáo sử dụng.

Tạo Auth user và gán team không nằm trong cùng giao dịch Postgres: nếu gán team lỗi, giữ tài khoản đã tạo ở trạng thái chưa có team và cho gán lại; không tạo thêm tài khoản hoặc báo đã gán thành công.

Khóa tài khoản phải chặn truy cập team/KPI theo trạng thái hiện tại ở server, không chỉ chờ token hết hạn. Dùng kiểm tra trạng thái tài khoản trong RPC/helper RLS phù hợp; nếu phải đọc trạng thái Auth thì helper nội bộ chỉ trả boolean, không phơi bảng Auth. Khi xóa user, bổ sung team/KPI vào danh sách chặn xóa và dùng FK phù hợp để không cascade mất báo cáo. User có lịch sử KPI dùng khóa/ngừng hoạt động thay cho xóa cứng.

### Quyền mới cần khai báo rõ

Giữ `can(role, capability)` cho quyền hệ thống hiện có; thêm hàm thuần xử lý ngữ cảnh team để UI hiển thị đúng, đồng thời thực thi lại ở CSDL:

- `team.manage`: tạo team, gán/chuyển thành viên, bổ nhiệm Leader.
- `team.view`: xem team đang quản lý hoặc team trong quyền quản trị.
- `customer.viewTeam`: chỉ đọc hồ sơ thuộc team hiện tại.
- `kpi.target.approve`: duyệt chỉ tiêu team.
- `kpi.target.allocate`: phân bổ chỉ tiêu thành viên trong ngân sách đã duyệt.
- `kpi.actual.import`: nhập/duyệt số liệu thực hiện.
- `kpi.period.close`, `kpi.period.reopen`: chốt và mở lại kỳ.

Đề xuất mặc định: Master Admin quản lý cơ cấu và bổ nhiệm Leader; User Admin được xem dữ liệu, duyệt chỉ tiêu/nguồn thực hiện, chốt kỳ theo capability được cấu hình, chưa tự có quyền bổ nhiệm Leader. Mở rộng quyền quản lý team cho User Admin là quyết định riêng.

Không tái sử dụng `scope.switch` hoặc `customer.viewAll` để cấp quyền Leader.

| Thao tác | Thành viên (`user`) | Leader (`user`) | User Admin | Master Admin |
|---|---|---|---|---|
| Hồ sơ của mình | Như hiện tại | Như hiện tại | Như hiện tại | Như hiện tại |
| Hồ sơ thành viên | Không | Chỉ đọc trong team hiện tại | Quyền hiện có | Quyền hiện có |
| KPI RBO | Chính mình | Mình và thành viên team | Theo quyền quản trị | Toàn bộ |
| Tổng hợp team / SRBO | Không | Team mình | Theo quyền quản trị | Toàn bộ |
| Phân bổ chỉ tiêu | Không | Kỳ mở, trong ngân sách | Theo capability | Có |
| Sửa kết quả thực hiện | Không | Không mặc định | Nhập/duyệt qua quy trình | Nhập/duyệt qua quy trình |
| Cơ cấu team / bổ nhiệm Leader | Không | Không | Chưa cấp mặc định | Có |
| Mở lại kỳ | Không | Đề nghị | Chưa cấp mặc định | Có, kèm lý do |

Nếu một Leader vẫn mang quyền hệ thống `user_admin`, quyền quản trị rộng sẵn có vẫn tồn tại. Muốn tài khoản đó chỉ đọc hồ sơ người khác thì phải chủ động chuyển quyền hệ thống về `user`; không thể chỉ gắn nhãn Leader mà coi quyền admin đã bị thu hồi.

Không đưa lương A2, thông tin Auth hoặc dữ liệu trả thưởng cá nhân vào danh bạ team. Phần thưởng/lương nằm ngoài bản đầu; nếu làm sau cần quyền riêng, không tự cho Leader xem lương của cả team.

## 4. Khóa hai nguy cơ khi mở quyền team

### Dashboard cá nhân bị cộng cả team

Đổi mặc định user thường từ scope `all` sang scope rõ `user: auth.uid()` trước hoặc đồng thời với mở RLS SELECT cho Leader. Kiểm mọi API lấy danh sách theo `ownerScopeStore`, kể cả biểu đồ, export và các bảng con.

Giữ quyền chuyển scope toàn hệ thống của admin như hiện tại. Team/KPI dùng `TeamContext` riêng, không ghi teamId hoặc thành viên đang xem vào scope admin toàn ứng dụng.

Ví dụ kiểm hồi quy: A sở hữu 5 KH, thành viên B sở hữu 7 KH. Khi A được bổ nhiệm Leader:

- Dashboard cá nhân A vẫn có 5 KH.
- Tổng hợp team có 12 KH nếu cùng phạm vi/định nghĩa.
- A mở được hồ sơ B ở chế độ chỉ đọc.
- A không sửa/thu nợ/chuyển giao hồ sơ B kể cả gọi thẳng API.

### Quyền xem vô tình trở thành quyền ghi

Giữ nguyên nghĩa ghi của `can_access_customer()` và các helper cũ đang được policy `FOR ALL` sử dụng. Bổ sung helper đọc riêng, ví dụ `can_read_team_customer()`, và policy `FOR SELECT`.

Rà đầy đủ bảng liên quan hồ sơ: Customers, CreditContracts, LoanContracts, RepaymentSchedules, Collaterals, định giá, MortgageContracts và bảng nối, CardContracts/thẻ phụ, PostLoanControlRecords, DisbursementPayees; kiểm danh sách thực tế trong catalog trước migration.

Policy đọc mới phải cùng chịu điều kiện module hiện hành. Không mở kho tệp riêng, văn thư riêng hay bảng Auth chỉ vì có liên kết cùng user.

Giao diện cần ngữ cảnh truy cập hồ sơ có `canEdit` theo từng bản ghi: ẩn/khóa cả sửa, xóa, thu nợ, thay lịch, upload/ghi tài liệu gắn hồ sơ khi không được cấp. Đây là hỗ trợ thao tác; API/RLS vẫn phải từ chối ghi.

Danh bạ thành viên lấy qua RPC/view chuyên dụng với cột cần thiết; không mở SELECT toàn bộ `UserRoles` để Leader tự đọc danh sách mọi người.

## 5. Nối từng KPI: nguồn nào, nối tới đâu

Khởi đầu bằng nguồn hỗn hợp: dữ liệu tín dụng trong ứng dụng dùng cho số vận hành khi đủ; KPI chính thức chưa có nguồn cập nhật bằng **Excel định kỳ, có xem trước và đối soát**, đã được người dùng xác nhận ngày 20/10/2026. File mẫu tra cứu dùng để đối chiếu cấu trúc, không mặc định là feed tự động.

| KPI | Dữ liệu có thể tận dụng | Khoảng thiếu | Cách nối giai đoạn đầu |
|---|---|---|---|
| Tăng ròng cho vay | Dư nợ hiện tại suy từ KUNN và gốc đã thu | Số đầu kỳ/cuối kỳ, lịch sử thay đổi và chuyển giao | Snapshot có mốc và dữ liệu điều chỉnh; kỳ quá khứ nhập số đã đối soát. Không lấy tổng giải ngân làm tăng ròng |
| Tăng ròng huy động có kỳ hạn | Hiện mới thấy chương trình/chào lãi suất | Sổ số dư tiền gửi đầu/cuối kỳ | Nhập/import nguồn được duyệt; không tự lấy từ RatePrograms |
| Tăng ròng CASA | Có ô CASA phục vụ tư vấn chào phí | Số dư thực tế và định nghĩa thời điểm/bình quân | Nhập/import; chốt phương pháp trước khi tính |
| Khách hàng mới | Customers và OwnerId | Ngày bắt đầu quan hệ, quy tắc KH mới và khử trùng | Kết quả/sự kiện KH mới được xác nhận; không đếm bản ghi KH vừa thêm vào phần mềm |
| Phí dịch vụ | Có phép tính phí chào khách | Phí thực thu/hạch toán, hoàn/hủy và phân loại | Nguồn được duyệt gồm 7 khoản; không dùng phí chào hoặc TOI dự phóng |
| Quy mô dư nợ quản lý | KUNN và tổng gốc đã thu hiện tại | Snapshot kỳ cũ và phạm vi danh mục | Tạo snapshot vận hành từ ngày bắt đầu; nhập/đối soát số dư kỳ trước nếu cần |
| Thẻ tín dụng | CardContracts, IssueDate, CardProducts | Số thẻ đủ điều kiện KPI, trạng thái phát hành/kích hoạt, đơn vị thật | Nguồn xác nhận hoặc nhập kết quả; không đếm hợp đồng hay tách chuỗi CardProducts để suy ra KPI chính thức |

Mỗi KPI chốt một nguồn có thẩm quyền theo kỳ/phạm vi. Không cộng kết quả CRM và kết quả import của cùng chỉ tiêu. Nếu có cả hai, một nguồn là số chính thức, nguồn còn lại để đối chiếu sai lệch.

Tiền lưu VND chính xác; hiển thị triệu/tỷ theo definition. Chỉ tiêu thẻ phải chốt là số thẻ, số hợp đồng, doanh số hoặc đơn vị khác trước khi bỏ nhãn mô phỏng.

Phí gồm: số đẹp, phi nhân thọ, nhân thọ, hủy bảo hiểm, hoạt động tín dụng, FX, dịch vụ tại quầy & NHĐT. Chốt dấu khoản hoàn/hủy theo nguồn; không tự trừ lần hai nếu nguồn đã ghi âm. Có cả tổng phí và thành phần thì kiểm tổng khớp, không cộng cả tổng lẫn thành phần.

Không lấy bộ API danh sách có giới hạn 1.000/5.000 dòng để cộng KPI ở trình duyệt. Dùng tổng hợp theo kỳ ở server hoặc snapshot đã đối soát; lỗi phải truyền ra, không gọi wrapper trả `[]` rồi coi là thực hiện bằng 0.

## 6. Hợp đồng dữ liệu và luồng nối

```text
Tài khoản xác thực → quyền hệ thống + membership có hiệu lực
                         ↓
                 phạm vi xem được phép
                         ↓
Nguồn tín dụng / nhập số liệu / import đã duyệt
                         ↓
Observation chuẩn hóa + nguồn + mốc + đơn vị + người/team hưởng
                         ↓
Chỉ tiêu + kết quả kỳ + phiên bản chính sách điểm
                         ↓
RPC báo cáo RBO / tổng hợp team / SRBO
                         ↓
Hook điều phối → thẻ KPI / biểu đồ / bảng / hồ sơ chỉ đọc
```

RPC tự kiểm `auth.uid()`, quyền hệ thống, membership và module. Tham số teamId/memberId chỉ là yêu cầu lọc; không phải bằng chứng quyền truy cập.

Kết quả trả về mỗi ô cần có: metricCode, period, target, actual, unit, completion, source, dataAsOf, completeness, revision. Điểm quy đổi có policyVersion riêng; thiếu điểm không làm mất doanh số đã xác nhận.

Phân biệt `not_configured`, `missing`, `partial`, `confirmed` và lỗi tải. Nếu một thành viên thiếu nguồn, tổng team không được trình bày như số đầy đủ; có thể hiển thị tổng phần đã có kèm trạng thái thiếu.

Cache theo user đăng nhập, team, thành viên, kỳ, trạng thái tháng/lũy kế và revision. Đổi role/team hoặc thu hồi quyền phải bỏ dữ liệu cũ khỏi UI; mỗi truy vấn phía server vẫn kiểm quyền hiện tại.

### Import Excel định kỳ — đã chốt

1. Quản trị ánh xạ mã cán bộ nguồn → UserId một lần. Không nhầm mã CIF cán bộ với `Customers.CifKh`; không gán bằng tên hoặc số thứ tự dòng.
2. Chọn kỳ, mốc dữ liệu, đơn vị và loại số liệu `monthly / ytd / as_of`.
3. Đọc vào vùng tạm; chưa ghi kết quả chính thức. Hiện dòng không khớp tài khoản, trùng khóa, sai đơn vị, thiếu kỳ, tổng phí lệch.
4. Xem trước chênh lệch so với phiên bản hiện tại; duyệt mới công bố trong giao dịch.
5. Chống nhập trùng bằng khóa nghiệp vụ nguồn/người/kỳ/KPI/loại số, không chỉ hash tên/file. Nhập lại cùng dữ liệu không tăng kết quả.
6. Điều chỉnh tạo revision thay thế có lịch sử; không cộng dồn batch thay thế vào batch cũ.

File mẫu có ngày dữ liệu 30/09/2026 nhưng chưa chứng minh mọi số là thực hiện tháng 9. Số lũy kế chỉ dùng cho lũy kế; không chia ra chín tháng hoặc tự dựng biểu đồ tháng. Chỉ suy chênh lệch giữa hai mốc khi có đủ dữ liệu cùng phương pháp và được duyệt quy tắc.

Phiên bản đầu dùng Excel cho số liệu thực hiện từ nguồn ngoài; không bổ sung luồng nhập tay song song. Việc giao/phân bổ chỉ tiêu vẫn thao tác trực tiếp trên hệ thống. Thành viên không tự sửa kết quả thực hiện của mình.

Đề xuất hợp đồng file nhập: kỳ báo cáo, mốc dữ liệu, mã cán bộ nguồn, mã KPI, đơn vị, loại số liệu tháng/lũy kế/số dư, giá trị và mã nguồn đối soát. Sau khi có file đầu vào thực tế sẽ chốt adapter và mẫu tải xuống; không yêu cầu người xem KPI nhập CIF. Người có quyền import chọn kỳ/nguồn một lần, hệ thống tự gán dòng về UserId/team từ ánh xạ và membership có hiệu lực.

Màn xem trước có số dòng hợp lệ/lỗi/trùng, tài khoản chưa ánh xạ, tổng theo KPI/team và chênh lệch so với dữ liệu đã công bố. Chỉ công bố batch đã qua đối soát; dữ liệu không đủ điều kiện không được ghi một phần âm thầm. File nhập lại để sửa kỳ phải hiện rõ thay thế phiên bản và giữ nhật ký, không cộng thêm vào số cũ.

## 7. Kỳ, lịch sử và tính KPI

- Kỳ theo tháng và lịch nghiệp vụ Việt Nam; ngày hiệu lực không lấy bằng phép cắt chuỗi UTC.
- Có `draft/open/closed`, `dataAsOf` và revision; tháng đang chạy không được coi là đủ tháng.
- Lũy kế phát sinh/tăng ròng cộng các tháng sau chuẩn hóa; quy mô dư nợ dùng mốc cuối, không cộng số dư.
- Target chưa giao khác target bằng 0; chia target 0 hoặc thiếu cho “—”. Tăng ròng thực hiện có thể âm.
- Mặc định bản đầu không cho target âm; nếu kế hoạch kinh doanh cần target âm phải bổ sung quy tắc hoàn thành riêng, không dùng phép chia thông thường.
- Chỉ tiêu team độc lập với phân bổ: đã giao + chưa phân bổ = ngân sách team. Server khóa hàng ngân sách và kiểm version khi nhiều người sửa đồng thời.
- Chốt kỳ lưu kết quả, chỉ tiêu, phạm vi nhân sự, nguồn và phiên bản chính sách. Mở lại phải có quyền/lý do và giữ revision trước.
- Chuyển team không sửa báo cáo đã chốt; KPI phát sinh gắn người/team tại thời điểm ghi nhận, số dư gắn phạm vi tại mốc snapshot.
- Điều chuyển danh mục phải có điều chỉnh riêng để không tính thành tăng trưởng kinh doanh. Cần mốc ban đầu và nguồn chuyển giao, không chỉ OwnerId hiện tại.
- Leader mới được xem lịch sử của team; quyền mở hồ sơ gốc vẫn theo team hiện tại. Báo cáo cũ không cấp lại quyền đọc hồ sơ người đã chuyển ra ngoài.
- Quyết định ngày giữa tháng, nhân sự đủ điều kiện tính SRBO và Leader tự kinh doanh phải nằm trong policy đã duyệt.

## 8. Cấu trúc lưu trữ đề xuất

Bảng dưới là thiết kế ban đầu. Bản đã áp dùng `KpiDefinitions`, `KpiPeriods`, `TeamKpiTargets`, `MemberKpiTargets`, `KpiInputBatches`, `KpiObservations`, `KpiAuditLog`; snapshot chốt kỳ ở `app_team.KpiPeriodSnapshots`. Preview Excel ở bộ nhớ trình duyệt và server kiểm lại trong giao dịch khi công bố; chưa có bảng staging raw hoặc chính sách điểm.

| Nhóm | Dữ liệu |
|---|---|
| `Teams`, `TeamMemberships` | Cơ cấu, vai trò, khoảng hiệu lực và lịch sử |
| `KpiDefinitions` | Mã, đơn vị, loại tổng hợp, phương pháp, trạng thái nguồn |
| `KpiPeriods` | Team/kỳ, mốc dữ liệu, trạng thái chốt, revision |
| `TeamKpiTargets`, `MemberKpiTargets` | Ngân sách team và phân bổ; duy nhất theo kỳ/KPI/phạm vi/revision |
| `KpiObservations` | Số liệu chuẩn hóa theo nguồn/người/team/kỳ, loại tháng/lũy kế/snapshot, trạng thái kiểm tra và dấu vết nguồn |
| `KpiInputBatches`, `KpiInputRows` | Bản nháp nhập/import, đối soát, khử trùng và duyệt; không phơi dữ liệu thô cho cả team |
| `KpiPeriodResults` | Kết quả công bố và các revision đã chốt |
| `KpiPolicyVersions` | Quy đổi điểm RBO/SRBO, ngày hiệu lực, hệ số, điều kiện; làm khi có công thức |
| `KpiAuditLog` | Người thực hiện, thời điểm, thay đổi, lý do, phiên bản |
| Ánh xạ mã cán bộ nguồn | Chỉ thêm nếu nguồn nhập dùng mã ngoài; giữ ngoài dữ liệu Auth công khai |

Trong phiên bản đầu, `KpiObservations` chứa được cả phát sinh và snapshot có phân loại, không cần xây hai sổ kế toán đầy đủ chỉ để có Dashboard KPI. Khi nguồn nghiệp vụ thực sự có sổ sự kiện chuẩn thì adapter đọc từ đó.

Mô hình này cụ thể hóa đề xuất sơ bộ `KpiFacts/KpiSnapshots` trong tài liệu thiết kế giao diện: dùng observation có phân loại ở bản đầu, không tạo cả hai mô hình trùng trách nhiệm.

Mọi bảng được expose phải có grants và RLS phù hợp. Rà các policy cũ vì policy đọc mới không thay thế policy ghi cũ. View tổng hợp dùng chế độ tôn trọng quyền người gọi khi phù hợp; helper đặc quyền cần khóa search_path, giới hạn EXECUTE và kiểm quyền trong hàm.

Tài liệu chính thức cần kiểm lại trước khi viết migration: Supabase, “Row Level Security”, phần SELECT/UPDATE policies, Views và RLS performance:
`https://supabase.com/docs/guides/database/postgres/row-level-security`.

## 9. Gắn vào ứng dụng thật

| Phần | Thay đổi |
|---|---|
| AuthContext | Giữ role hệ thống; nạp ngữ cảnh team riêng, trạng thái loading/error rõ |
| TeamContext/hook | Membership, quyền theo team, phạm vi hiệu lực; không ghi đè OwnerScope toàn ứng dụng |
| Quản lý người dùng | Giữ quản lý tài khoản và quyền hệ thống; không đặt form tạo team ở đây |
| Quản trị → Team | Master Admin tạo team, gán/chuyển thành viên, đổi Leader; server giữ hiệu lực và lịch sử |
| Sidebar và routes | Team & KPI dưới Tổng quan trong menu phụ; thay guard dev bằng quyền/ngữ cảnh thật |
| TeamKpiView | React dùng design token hiện tại, không iframe, không chọn role xem thử |
| KPI RBO | Tự lấy UserId; Leader chọn tên thành viên trong danh sách được phép |
| Tổng hợp team | Thẻ/biểu đồ/bảng đọc cùng query/report revision; không tải toàn bộ hồ sơ để cộng trên client |
| Hồ sơ thành viên | Link từ KPI sang ngữ cảnh chỉ đọc; server vẫn kiểm quyền độc lập |
| Điểm SRBO | Lấy nhân sự đủ điều kiện, điểm kế hoạch/thực hiện và hệ số theo policy; không mặc định tổng doanh số hoặc trung bình phần trăm RBO |

Tách tầng: `types/team.ts`, `types/kpi.ts`; logic thuần `lib/team/`, `lib/kpi/`; repository/RPC dưới `lib/api/`; hooks điều phối; components nhận props và callback. Không viết công thức hoặc Supabase trong JSX.

## 10. Các gói triển khai theo thứ tự

| Gói | Làm gì | Tiêu chí hoàn thành |
|---|---|---|
| P0 — Chốt dữ liệu | Chọn nguồn và loại kỳ cho 7 KPI, đơn vị thẻ, KH mới, tăng ròng và ngày bắt đầu lịch sử | Có từ điển KPI và một bộ số liệu đối soát kỳ mẫu; chỗ chưa chốt ghi rõ thiếu |
| P1 — Phạm vi cá nhân | Sửa scope mặc định user thành tài khoản mình; hồi quy danh sách, Dashboard, export và admin | Trước khi mở quyền team, cá nhân không dựa vào RLS “chỉ có mình” để cộng số |
| P2 — Team và quyền đọc | Bảng team/membership, quản trị gán role, SELECT-only, kiểm quyền hồ sơ và thu hồi | Leader đọc được team mình, không ghi hồ sơ người khác; user chưa có team vẫn dùng hệ thống cũ |
| P3 — Kỳ và chỉ tiêu | Definition, period, ngân sách, phân bổ, version và audit | Chỉ tiêu team khớp tổng phân bổ + còn lại; cập nhật đồng thời không vượt ngân sách |
| P4 — Nguồn thực hiện | Adapter tín dụng/snapshot, import Excel định kỳ có xem trước/đối soát, provenance | Từng người/KPI/kỳ có nguồn; nhập lặp không tăng số; không bịa lịch sử |
| P5 — Trang KPI thật | React RBO/team, biểu đồ, tháng/lũy kế, trạng thái dữ liệu, link hồ sơ | Thay iframe bằng dữ liệu thật; không còn bộ chọn role mô phỏng; đúng vị trí menu phụ |
| P6 — Điểm SRBO và chốt kỳ | Chính sách điểm có phiên bản, tập nhân sự tính điểm, hệ số, chốt/mở lại | Đối chiếu kết quả từng người và Leader với mẫu được duyệt; giữ lịch sử khi chuyển team |

P1–P3 có thể triển khai trước khi đủ công thức điểm. Không chờ đủ chính sách thưởng mới làm team và chỉ tiêu, nhưng chưa gọi “—” thành kết quả 0 hoặc gắn nhãn báo cáo chính thức khi nguồn còn thiếu.

## 11. Kiểm chứng và rollout

1. Trước migration: nhánh backup; kiểm catalog/policy/grants thật, số dòng và tổng gốc theo mốc. Không sửa/xóa dữ liệu cũ.
2. Kiểm tích hợp RLS bằng hai team, nhiều user, Leader, admin và user không team; gọi trực tiếp SELECT/INSERT/UPDATE/DELETE và RPC, không chỉ thử UI.
3. Bao phủ đọc bảng con, chuyển chủ KH, user bị khóa, đổi Leader, đổi module, chuyển team giữa tháng, token cũ, truy vấn giả teamId/memberId. Membership/quyền hiện tại được kiểm ở server; khóa đăng nhập không được coi là đã thu hồi mọi access token.
4. Hồi quy tình huống 5 KH cá nhân/12 KH team; scope admin và hồ sơ OwnerId NULL vẫn đúng.
5. Unit test thuần cho số âm, 0/null, đơn vị, lũy kế/snapshot, phí hoàn/hủy, thiếu dữ liệu và phân bổ đồng thời.
6. Nhập/import: trùng batch, mã cán bộ không ánh xạ, thiếu thành viên, nguồn tháng/lũy kế trộn, tổng phí lệch, thay thế phiên bản và rollback giao dịch.
7. Đối soát một kỳ mẫu: từng người, từng KPI, tổng team, chỉ tiêu và điểm Leader. Kiểm counts/totals, không chỉ so giao diện.
8. Test/build trước push; migration và quyền dữ liệu phải sẵn sàng trước mã đọc bảng mới. Pilot một team/kỳ, xác nhận deployment và kiểm bằng danh tính thật được phép.
9. Nếu lỗi: tắt điểm vào/feature, giữ bảng và snapshot làm dự phòng; không tự rollback bằng xóa dữ liệu hoặc khôi phục policy ghi rộng.

## 12. Quyết định còn thiếu trước từng gói

| Quyết định | Đề xuất / trạng thái | Chặn gói |
|---|---|---|
| Leader xem/sửa hồ sơ | Đã chốt: xem team, chỉ đọc hồ sơ người khác | Không hỏi lại |
| Vị trí menu | Đã chốt: ngay dưới Tổng quan trong menu phụ | Không hỏi lại |
| Cập nhật KPI chưa có nguồn | Đã chốt Excel định kỳ, có xem trước và đối soát trước công bố | Không hỏi lại; P4 triển khai theo lựa chọn này |
| Mốc lịch sử đầu tiên | Bắt đầu từ tháng có số mở kỳ/snapshot được xác nhận; kỳ cũ chỉ nhập nếu đủ bằng chứng | P0/P4 |
| Ngày KH mới, đơn vị thẻ, công thức tăng ròng | Mẫu tra cứu chưa đủ công thức gốc | KPI tương ứng ở P4 |
| Điểm RBO/SRBO và hệ số quản lý | Cần bảng quy đổi/policy; không suy từ ô VLOOKUP hoặc tham chiếu lỗi | P6 |
| User Admin có được bổ nhiệm Leader | Đề xuất chưa cấp mặc định; mở bằng capability riêng nếu được duyệt | P2 |
| Leader có chỉ tiêu kinh doanh cá nhân | Cho phép riêng với KPI quản lý; tính vào SRBO hay không chờ policy | P3/P6 |
| Quyền chốt/mở kỳ và thưởng | Master Admin mở lại; thưởng/lương ngoài bản đầu | P6 |

Không cần chốt tất cả để bắt đầu P1–P3. Trước code từng gói phải khóa các quyết định ảnh hưởng gói đó; không tự lấp công thức còn thiếu bằng dữ liệu mockup.
