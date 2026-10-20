# Team, góc nhìn Leader và KPI tháng/lũy kế

Ngày lập: 20/10/2026. Tài liệu này lưu thiết kế và giai đoạn mockup ban đầu. Hiện `/team-kpi` đã là màn React/API thật trên localhost; cơ cấu team/KPI đã có trên Supabase. Xem [kết quả triển khai](2026-10-20-trien-khai-role-team-va-du-lieu-kpi.md). Frontend production chưa deploy.

Mockup: [Tổng quan Team & KPI](../specs/2026-10-20-team-kpi.html).

Kế hoạch triển khai thật: [Role theo team và nối dữ liệu KPI](2026-10-20-trien-khai-role-team-va-du-lieu-kpi.md).

**Mục tiêu:** Duyệt cách tổ chức Team, KPI RBO/SRBO và chỉ tiêu tháng/lũy kế bằng mockup thao tác được.
**Phạm vi:** LÀM kế hoạch, đối chiếu 2 màn tra cứu Excel, HTML minh họa. KHÔNG LÀM migration, tính thưởng chính thức, đổi Dashboard cá nhân hoặc triển khai production.
**Tệp dự kiến chạm:** Kế hoạch này, nhóm `docs/specs/team-kpi-*`, HTML mockup và nhật ký tiến độ. Tách model, view, controller, CSS và kiểm thử vì khác trách nhiệm.
**Tầng:** Nghiệp vụ mô phỏng thuần ở model; trạng thái ở controller; hiển thị ở views/CSS; không có tầng truy cập dữ liệu thật.
**Kiểm chứng bằng gì:** `node docs/specs/team-kpi-check.mjs`, kiểm thử/build repo, mở Edge ở 1920/1440/1024/390px và thử phân bổ.
**Rủi ro đã biết:** Nhầm doanh số với điểm Leader, cộng số dư vào lũy kế, phân bổ vượt team, nhầm role hiển thị với bảo mật; công thức Excel thiếu nguồn và có tham chiếu lỗi.

### Ghép thử vào localhost — giai đoạn mockup, đã thay thế

**Mục tiêu:** Mở localhost, chọn Tổng quan ở cột ngoài; menu phụ có Tổng quan và Team & KPI ngay dưới để mở hai màn riêng.
**Phạm vi:** LÀM điểm vào độc lập chỉ ở bản dev và dữ liệu mô phỏng. KHÔNG LÀM tab bên trong Tổng quan, quyền team thật, ghi CSDL hoặc đưa mockup vào production.
**Tệp dự kiến chạm:** `src/App.tsx`, `workspaceNavigation.ts`, `PrimaryRail.tsx`, component nhúng và hook đo chiều cao, kiểm thử; CSS/controller mockup có chế độ nhúng. Tách các tệp theo trách nhiệm.
**Tầng:** Component nhúng giao diện; lib khai báo điều hướng; hook quản lý kích thước iframe; model dữ liệu mô phỏng giữ nguyên.
**Kiểm chứng bằng gì:** Test điều hướng riêng và trở về Dashboard, build production loại bỏ điểm vào mockup, Edge trên localhost với dữ liệu kiểm thử.
**Rủi ro đã biết:** Khung lồng nhau làm chật biểu đồ, iframe cuộn hai lớp, vô tình đưa role xem thử lên bản thật; chế độ nhúng bỏ khung ngoài, tự đo chiều cao và dùng `import.meta.env.DEV`.

Mở `http://localhost:5173/`, chọn Tổng quan ở cột ngoài rồi Team & KPI trong menu phụ, hoặc mở trực tiếp `/team-kpi`. Không có mục Team & KPI ở cột ngoài. Tổng quan vẫn là `/dashboard`, không chứa tab mới. Route này hiện dùng React/API thật; mockup HTML bên dưới chỉ để đối chiếu thiết kế.

## 1. Kết quả cần đạt

1. Tài khoản thuộc một team và có vai trò trong team: Leader hoặc Thành viên.
2. **Team & KPI** nằm ngay dưới **Tổng quan** trong menu phụ của nhóm Tổng quan; không thêm mục ở cột điều hướng ngoài. Dashboard Tổng quan hiện tại giữ nguyên.
3. Leader theo dõi kết quả team, so sánh thành viên và so sánh các tháng.
4. Có chỉ tiêu theo tháng, phân bổ cho thành viên, thực hiện, chênh lệch và tỷ lệ hoàn thành; xem được lũy kế từ đầu năm.

Đợt thiết kế làm kế hoạch và mockup độc lập. Theo yêu cầu tiếp theo, bổ sung route và mục điều hướng riêng trong `src/` để xem mockup ở bản dev; không áp migration, không lấy dữ liệu production hoặc deploy.

## 2. Đối chiếu mã hiện có

| Nguồn đã đọc | Điều xác nhận được |
|---|---|
| `src/lib/permissions.ts` | Có ba quyền hệ thống: `master_admin`, `user_admin`, `user`; chưa có quyền Leader theo team |
| `src/lib/ownerScope.ts`, `UserScopeContext.tsx` | Phạm vi hiện tại là toàn bộ, chưa phân công hoặc một tài khoản; chưa có phạm vi team |
| `src/types/index.ts` | Khách hàng có `OwnerId`; không có `TeamId`. `Customer` chưa khai ngày tạo/quan hệ mới đủ để kết luận KPI khách hàng mới |
| `supabase/migrations/66_chuyen_giao_khach_hang.sql` | Có nhật ký chuyển giao khách hàng, nhưng không phải sổ ghi nhận toàn bộ sự kiện kinh doanh theo tháng |
| `src/lib/api/loanContractApi.ts` | Có tổng gốc đã trả hiện tại; không chứng minh tái tạo được dư nợ tại mọi ngày quá khứ |
| `src/lib/workspaceNavigation.ts` | Nhóm Tổng quan đang dẫn về Dashboard; có thể mở rộng điểm vào Team mà không đổi màn nghiệp vụ |
| Tìm `Teams`, `TeamMembers`, `TeamMemberships`, `KpiTargets`, `KpiActuals`, `TeamId` trong `src/` và migrations | Không có kết quả cho các tên này; chưa tìm thấy mô hình team/KPI trong phần mã đã khảo sát |

Không dùng dữ liệu danh mục hiện tại để vẽ ngược các tháng rồi gọi đó là lịch sử thực tế. Nguồn hiện có chưa đủ để khẳng định thẻ đã được ghi nhận KPI hoặc phí dịch vụ đã hạch toán.

## 3. Những giả định cần xác nhận

| Chủ đề | Đề xuất cho phiên bản đầu |
|---|---|
| Phạm vi team | Team nghiệp vụ trong cùng một tổ chức. Chưa phải mô hình nhiều tổ chức độc lập |
| Thành viên | Một user thuộc tối đa một team nghiệp vụ đang hoạt động tại một thời điểm; lưu đủ lịch sử thay đổi |
| Leader | Là vai trò trong `TeamMemberships`, không thêm `leader` vào `UserRoles.Role` và không tự trở thành Admin |
| Số Leader | Một Leader đang hoạt động cho mỗi team. Đổi Leader trong giao dịch; không để team hoạt động không còn người quản lý |
| Quyền xem của Leader | Đã xác nhận: xem tổng hợp team và hồ sơ của thành viên; không sửa, thu nợ hoặc chuyển giao hồ sơ người khác |
| Bộ KPI | Đã xác nhận 7 chỉ tiêu: tăng ròng cho vay, huy động có kỳ hạn, CASA, khách hàng mới, phí dịch vụ, quy mô dư nợ quản lý, thẻ tín dụng |
| Chất lượng tín dụng | Nợ quá hạn/nợ nhóm 2+ theo dõi riêng; chưa cộng vào điểm KPI tổng hợp khi chưa có công thức/trọng số |
| Tiền tệ | VND; không cộng số lượng với tiền hoặc tỷ lệ |
| Quản lý team | Admin tạo team, gán thành viên/Leader, ngừng hoạt động và chuyển giao |
| Chỉ tiêu | Admin hoặc người được giao quyền duyệt chỉ tiêu team; Leader phân bổ trong hạn mức đã duyệt |

Quyền Leader và tên bộ KPI đã xác nhận. Công thức tăng ròng, quy đổi điểm, hệ số và thưởng cần chốt tiếp sau khi đối chiếu Excel; không thay Dashboard cá nhân.

## 4. Ma trận quyền

Quyền cuối cùng là giao của quyền hệ thống, vai trò team và module được cấp. Vai trò Leader không vượt qua module bị tắt.

| Thao tác | Thành viên | Leader | Admin theo quyền hiện có |
|---|---|---|---|
| Dashboard cá nhân hiện tại | Như hiện tại | Như hiện tại | Như hiện tại |
| Chỉ tiêu/kết quả của chính mình | Xem | Xem | Xem theo phạm vi được phép |
| Tổng quan team và biểu đồ thành viên | Không, mặc định | Chỉ team đang quản lý | Các team được phép quản trị |
| Hồ sơ người khác | Không | Chỉ đọc hồ sơ thành viên trong team hiện tại | Giữ quyền hiện có |
| Phân bổ chỉ tiêu thành viên | Không | Tháng đang mở, trong chỉ tiêu team đã duyệt | Theo quyền được cấp |
| Đổi chỉ tiêu team đã duyệt | Không | Gửi đề nghị | Duyệt kèm lịch sử |
| Tạo team, đổi thành viên/Leader | Không | Không mặc định | Gán riêng capability quản lý team |
| Chốt tháng | Không | Gửi chốt | Người có capability chốt |
| Mở lại tháng đã chốt | Không | Đề nghị | Quyền riêng, bắt buộc lý do và bản sửa mới |
| Tự sửa kết quả tự động | Không | Không | Không ghi đè; dùng quy trình điều chỉnh có đối soát |

Tách policy SELECT cho Leader khỏi UPDATE/DELETE; không sửa hàm quyền dùng chung theo cách vô tình cấp quyền ghi. Quyền chỉ xem hồ sơ đã được người dùng xác nhận, nhưng chưa triển khai RLS trong đợt mockup.

## 5. Danh mục KPI và nguồn dữ liệu

| Chỉ tiêu | Loại | Thực hiện tháng | Lũy kế năm | Nguồn/điểm cần hoàn thiện |
|---|---|---|---|---|
| Tăng ròng cho vay | Chênh lệch số dư | Đề xuất: số dư cuối kỳ trừ đầu kỳ, điều chỉnh chuyển giao/đảo giao dịch theo chính sách | Cộng tăng ròng các tháng nếu cùng phạm vi và quy tắc điều chỉnh | Cần snapshot và số điều chỉnh; không đồng nhất với doanh số giải ngân |
| Tăng ròng huy động có kỳ hạn | Chênh lệch số dư | Đề xuất: số dư CKH cuối kỳ trừ đầu kỳ theo phạm vi được ghi nhận | Cộng tháng sau điều chỉnh | Cần nguồn số dư thực tế; chương trình lãi suất huy động không phải số dư tiền gửi |
| Tăng ròng CASA | Chênh lệch số dư | Đề xuất: CASA cuối kỳ trừ đầu kỳ | Cộng tháng sau điều chỉnh | Cần chốt dùng số dư thời điểm hay bình quân; mẫu tra cứu chưa chứng minh công thức gốc |
| Khách hàng mới | Phát sinh có khử trùng | CIF phát sinh quan hệ mới theo định nghĩa được duyệt | Cộng các sự kiện đủ điều kiện đã khử trùng | Cần chốt: đăng ký hồ sơ mới hay phát sinh quan hệ tín dụng lần đầu; không đoán từ danh sách hiện tại |
| Phí dịch vụ | Phát sinh | Các khoản phí được ghi nhận trong kỳ, bao gồm điều chỉnh theo chính sách | Cộng các tháng | Excel C20 = SUM(C21:C27); không tự coi phí bảo hiểm thu khách là doanh thu phí |
| Quy mô dư nợ quản lý | Số dư | Dư nợ quản lý tại thời điểm chốt | Lấy tháng đang xem, không cộng các tháng | Cần snapshot lịch sử |
| Thẻ tín dụng | Phát sinh, chờ chốt đơn vị | Kết quả thẻ được nguồn nghiệp vụ xác nhận | Cộng tháng nếu là số lượng phát sinh | Excel có nhãn Thẻ tín dụng nhưng chưa chứng minh đếm phát hành/kích hoạt hay doanh số; mockup tạm dùng số thẻ |

Mỗi KPI cần lưu: mã, tên, đơn vị, chiều tốt/xấu, cách tổng hợp tháng/lũy kế, nguồn, phiên bản công thức, độ đầy đủ dữ liệu và người phê duyệt.

Tăng ròng có thể âm, biểu đồ phải có trục 0 và cột âm. Chuyển danh mục giữa người/team không tự được tính là tăng trưởng kinh doanh.

### Đối chiếu mẫu Excel người dùng gửi ngày 20/10/2026

Nguồn đọc: `TRA_CUU_KPI_RBO_CSO_SRBO 30092026 ĐỐI SOÁT CBBH.xlsm`, chỉ phục vụ đối chiếu cấu trúc; không chép file hoặc danh tính/số liệu nhân sự vào repo. Không chạy macro.

Tên sheet thực tế gồm `TRA CUU SRBO`, `TRA CUU RBO-CSO`, `SRBO` và các nguồn phụ. Hai màn tra cứu người dùng cần tương ứng `TRA CUU SRBO` và `TRA CUU RBO-CSO`; sheet `SRBO` là nguồn liên kết nhân sự, không phải màn tra cứu KPI Leader.

| Mẫu đã đọc | Giữ trong hệ thống | Điều chỉnh |
|---|---|---|
| RBO B16:C27, E16:F23 | 7 KPI chính, 7 khoản phí, kết quả bổ sung | Một bảng rộng, có tháng/lũy kế, chỉ tiêu/thực hiện/chênh lệch/%; không chia bảng nhỏ ép cột |
| Phí C20 = SUM(C21:C27) | Số đẹp, phi nhân thọ, nhân thọ, hủy bảo hiểm, hoạt động tín dụng, FX, dịch vụ tại quầy & NHĐT | Khoản hủy/hoàn cần chốt dấu và cách ghi nhận; fixture có khoản âm minh họa, không phải công thức đã duyệt |
| RBO H8:J13, SRBO J8:L13 | Điểm kế hoạch/thực hiện, tỷ lệ hoàn thành, điều kiện tăng trưởng | Tách KPI kinh doanh khỏi điểm quy đổi; thiếu công thức thì để “—”, không tự tính tổng điểm |
| SRBO C14:H40 | Nhân sự trực thuộc, cờ tính KPI, điểm kế hoạch/thực hiện, tỷ lệ | Tự lọc membership theo Leader đăng nhập; Leader có thể xem RBO của một thành viên bằng tên |
| SRBO F11/G11 | Số nhân sự tính KPI, hệ số quản lý | Không bằng số người trong team một cách mặc định; cần cờ đủ điều kiện và bảng hệ số được duyệt |
| Hai sheet có khối bậc điểm và thưởng | Thiết kế mở rộng chính sách thưởng | Chưa tính tiền thưởng trong bản đầu; cần bảng đơn giá, điều kiện TTKD, trần, tỷ lệ chi và điểm trừ |
| Ô nhập mã CBBH/CIF, VLOOKUP tên và đơn vị | Tài khoản, vai trò và membership phía server | Bỏ thao tác nhập CIF; không cho tự đổi role/team trên giao diện thật |

Kết quả phụ có trong RBO nhưng chưa nằm trong 7 KPI người dùng chốt: quy mô HĐV CKH chăm sóc, doanh số giải ngân refer, điểm trừ, tăng ròng nợ quá hạn, quy mô CKH quản lý và giảm ròng quy mô CKH quản lý. Đề xuất giữ ở phần “Chỉ tiêu bổ sung” khi duyệt phạm vi, không tự biến thành KPI bắt buộc.

Giới hạn mẫu: nhiều ô chỉ VLOOKUP kết quả từ `DSNS`, không chứa công thức nghiệp vụ đầu nguồn. RBO F23 chứa `#REF!` trong công thức được IFERROR che; các ô tra hệ số có tham chiếu workbook ngoài `[1]HE SO - DIEM GIAO`. Các mốc 120%/140%, trần 5 lần lương A2 và chi 70% là nội dung mẫu 30/09/2026, chưa mặc định là chính sách áp dụng trong hệ thống.

SRBO không mặc định là tổng doanh số hoặc trung bình % RBO. Cần chốt tập người đủ điều kiện, công thức điểm Leader và hệ số quản lý; Leader tự kinh doanh có được tính vào điểm quản lý hay không là cấu hình riêng. Mockup cộng doanh số của 5 người một lần để xem quy mô kinh doanh team, còn khung điểm SRBO chỉ liệt kê 4 nhân sự trực thuộc và để cờ tính KPI chờ cấu hình.

Ánh xạ tự động: tài khoản xác thực → membership có hiệu lực → role trong team → template KPI. Member mở RBO chính mình; Leader mở SRBO team mình, có thể chọn người trong team để xem RBO; Admin chọn team trong phạm vi quản trị. Chức danh nghiệp vụ RBO1–RBO6/hệ số nếu dùng là hồ sơ chính sách, không phải role bảo mật mới. CIF/mã CBBH chỉ là khóa đối chiếu khi import nội bộ, không là bộ lọc tra cứu bắt buộc.

### Quy tắc số liệu

- Phần trăm hoàn thành của KPI càng lớn càng tốt = thực hiện / chỉ tiêu khi chỉ tiêu > 0. Không chặn 100% khi đã vượt.
- Chỉ tiêu chưa giao khác chỉ tiêu bằng 0. Chỉ tiêu bằng 0 không có tỷ lệ phần trăm; hiển thị “—”, không chia 0 hay tự coi 100%.
- Chỉ tiêu năm đang xem từ tháng 1 đến tháng được chọn; không so kết quả 9 tháng với chỉ tiêu đủ 12 tháng rồi gọi đó là tiến độ 9 tháng.
- Số dư dùng chỉ tiêu tại tháng cuối, không cộng 12 chỉ tiêu số dư cuối tháng.
- Nợ quá hạn/tỷ lệ có chiều thấp hơn tốt hơn phải có quy tắc riêng. Không dùng chung phép chia của KPI tăng trưởng.
- Không cộng tiền, khách hàng, thẻ và tỷ lệ vào một ô tổng. Mỗi bảng thành viên chỉ hiển thị một KPI có cùng đơn vị.
- Không xếp hạng KPI tổng hợp khi chưa chốt trọng số và cách chuẩn hóa. Mockup chỉ so sánh theo một chỉ tiêu.
- Không quy đổi tháng chưa kết thúc thành “kết quả cả tháng”. Tháng 10 đang mở ghi rõ mốc dữ liệu 20/10/2026; tháng 9 đã chốt để so các kỳ đầy đủ.
- Các KPI chưa có dữ liệu là “Chưa có dữ liệu”, không phải 0; số tổng của tập dữ liệu thiếu phải hiện trạng thái chưa đầy đủ.

## 6. Chỉ tiêu team, phân bổ và lịch sử

Chỉ tiêu team độc lập với tổng chỉ tiêu đã giao thành viên:

`Chỉ tiêu team = đã phân bổ cho thành viên + chưa phân bổ`.

Được phép còn phần chưa phân bổ; không cho phân bổ vượt chỉ tiêu team. Hiển thị phần còn lại ngay khi nhập. Lưu phải kiểm lại phía server, không chỉ disable nút trên client.

- Giao chỉ tiêu theo năm/tháng/KPI; hỗ trợ sao chép kế hoạch tháng trước như bản nháp, không ghi đè tháng có dữ liệu.
- Người giao xem được chỉ tiêu team, chỉ tiêu từng người và lịch sử sửa.
- Thành viên mới vào giữa tháng không tự được áp chỉ tiêu bằng 0 hoặc nhận đủ chỉ tiêu cả tháng: người có quyền điều chỉnh và ghi lý do.
- Thay thành viên không tự đổi kế hoạch/thực hiện các tháng đã chốt.
- Tháng chốt giữ snapshot chỉ tiêu và thực hiện. Mở lại tạo revision mới, lưu cả bản trước, lý do, người duyệt và thời điểm.
- Import cần khóa khử trùng, xem trước thay đổi, phát hiện trùng và đối soát tổng trước khi ghi; không cập nhật âm thầm.
- Nếu người dùng cần đánh giá lũy kế theo quý hoặc rolling 12 tháng, thêm ở giai đoạn sau, không gọi chung là “lũy kế năm”.

## 7. Lịch sử team và ghi nhận công lao

Giữ `Customers.OwnerId` làm người phụ trách. Không nhân bản hồ sơ sang từng team và không thay OwnerId bằng TeamId.

- `TeamMemberships` có khoảng hiệu lực `[EffectiveFrom, EffectiveTo)`; không cho khoảng hoạt động chồng lấn của một user theo giả định phiên bản đầu.
- Phát sinh khách mới/thẻ/phí gắn người hưởng chỉ tiêu và team tại thời điểm ghi nhận. Một sự kiện không tính vào hai team.
- Dư nợ là snapshot tại cuối kỳ, phân về người/team đang phụ trách tại mốc đó. Việc chuyển giao giữa hai team không làm đổi dư nợ toàn hệ thống.
- Leader mới xem được số liệu lịch sử của team đang quản lý; thành viên đã rời team vẫn xuất hiện trong báo cáo tháng cũ của team đó.
- Quyền xem hồ sơ gốc xét quan hệ hiện tại; xem báo cáo tháng cũ không mặc nhiên cho phép mở hồ sơ của người đã chuyển ra ngoài team.
- Chuyển team xong phải thu hồi quyền team cũ, xóa cache và kiểm lại server ngay, không chờ JWT hết hạn.
- Nếu cần chia công lao cho người giới thiệu/người xử lý, phải có quy tắc phân bổ riêng; chưa có trong phiên bản đầu.

## 8. Mô hình dữ liệu đề xuất

Đây là thiết kế, không phải migration đã tạo hoặc đã áp.

| Bảng | Vai trò và ràng buộc chính |
|---|---|
| `Teams` | Tên/mã team, trạng thái, ngày hoạt động, người tạo; lưu trữ thay cho xóa team có lịch sử |
| `TeamMemberships` | Team/User/TeamRole, khoảng hiệu lực, người thay đổi; chống chồng thời gian; Leader thuộc cùng bảng này |
| `KpiDefinitions` | Mã/đơn vị/loại tổng hợp/chiều tốt/xấu/nguồn/phiên bản công thức |
| `KpiPeriods` | Team/năm/tháng, trạng thái draft/open/closed, dataAsOf, revision, người chốt; chốt/mở lại trong giao dịch |
| `TeamKpiTargets` | Một chỉ tiêu được duyệt cho Team/Period/KPI/revision |
| `MemberKpiTargets` | Phân bổ theo membership/user tại kỳ; tổng phân bổ không vượt team target |
| `KpiFacts` | Sự kiện phát sinh từ nguồn, mã nguồn khử trùng, ngày ghi nhận, người/team được hưởng, giá trị, nguồn nhập; corrections không xóa lịch sử |
| `KpiSnapshots` | Dư nợ/tử số/mẫu số hoặc kết quả cuối kỳ, nguồn và phiên bản; không tái tạo quá khứ bằng số hiện tại |
| `KpiPeriodResults` | Kết quả đã chốt theo team và người; giữ các revision, trạng thái đủ/thiếu dữ liệu |
| `KpiAuditLog` | Thay đổi chỉ tiêu, điều chỉnh kết quả, chốt/mở lại, người thực hiện, lý do; server ghi |

Ràng buộc/index cần thiết:

- Khóa duy nhất Team/Period/KPI/revision, và Member/Period/KPI/revision.
- Tiền dùng số chính xác (`numeric` hoặc số nguyên VND theo giới hạn đã thống nhất), không dùng floating point SQL cho tiền.
- Đếm khách hàng/thẻ là số nguyên không âm; kiểm tháng, năm và khoảng ngày hợp lệ.
- Index membership theo User/Team/khoảng hiệu lực; facts theo Team/ngày và owner/ngày; snapshot theo Team/period; index ở mọi cột khóa ngoại/RLS thường dùng.
- Chốt tháng và phân bổ chỉ tiêu khóa đúng hàng period/target để chống hai Leader/phiên sửa vượt tổng; optimistic version chặn ghi đè bản mới hơn.
- Khi giải pháp dùng RPC/VIEW, kiểm quyền ở database; không tin `teamId`/`userId` gửi từ trình duyệt. View và SECURITY DEFINER cần review theo quy định dự án, không dùng để bỏ qua RLS một cách mặc định.
- Không đưa service-role key vào client. Mọi bảng mới có RLS và grants tối thiểu; module `credit` vẫn là điều kiện giao với quyền team.

## 9. Giao diện và luồng

### Điểm vào

Tổng quan cá nhân hiện tại vẫn nguyên trạng. **Team & KPI** có điểm vào ngay dưới Tổng quan trong menu phụ; bên trong phân quyền theo vai trò. Thành viên không thấy góc nhìn tổng hợp người khác. Admin chọn team hợp lệ trong phạm vi được cấp. Bản dev có bộ chọn vai trò mô phỏng, chưa phải cơ chế phân quyền thật.

### Tổng quan team

1. Chọn tháng và KPI so sánh; tháng chưa chốt thể hiện mốc cập nhật.
2. Bốn thẻ cho tăng ròng cho vay, huy động có kỳ hạn, CASA, phí dịch vụ; đầy đủ 7 chỉ tiêu trong bảng KPI.
3. Biểu đồ ngang rộng so thành viên theo thực hiện/chỉ tiêu hoặc phần trăm hoàn thành; đổi KPI phải đổi đơn vị và thang đo.
4. Biểu đồ xu hướng các tháng với hai chuỗi Thực hiện/Chỉ tiêu; tháng đang mở phân biệt rõ với tháng chốt.
5. Bảng thành viên có thực hiện, chỉ tiêu, chênh lệch, hoàn thành. Không dùng thứ hạng tổng hợp giả.

### Chỉ tiêu KPI

- Bảng rộng; chọn KPI và Tháng/Lũy kế. Một bảng chỉ có một đơn vị.
- Hàng cuối TỔNG CỘNG thẳng cột tiền; phần chưa phân bổ là hàng riêng khi cần.
- Tháng mở: Leader dùng “Phân bổ chỉ tiêu”, sửa chỉ tiêu thành viên, thấy tổng/còn lại, nhập lý do rồi lưu.
- Tháng chốt: chỉ xem. Mở lại chỉ qua quy trình có người duyệt; chưa dựng chức năng mở lại trong mockup.
- Thành viên chỉ thấy chỉ tiêu của mình và không có nút phân bổ.

### Thành viên

- Tên, vai trò, ngày vào team, trạng thái, người đang phụ trách.
- Admin quản lý cơ cấu team ở khu quản trị; Leader theo dõi và đề nghị thay đổi, không tự cấp quyền.
- Không nhét biểu đồ nhóm nợ hoặc phương thức vay của Dashboard cá nhân vào cột phụ của Team.

## 10. Các đợt triển khai

| Đợt | Phạm vi | Điều kiện hoàn thành |
|---|---|---|
| 0 — Chốt nghiệp vụ | Hoàn thiện định nghĩa nguồn, quy đổi điểm RBO/SRBO, hệ số, cơ cấu team, mốc lịch sử | Từ điển KPI và chính sách điểm được duyệt; quyền Leader chỉ đọc đã chốt |
| 1 — Team & quyền | Bảng team/membership, UI quản trị, truy vấn phạm vi team, RLS và thu hồi quyền | User không có team vẫn dùng như cũ; Leader không thấy team khác và không sửa được hồ sơ nếu chỉ được đọc |
| 2 — Chỉ tiêu | Kỳ, team target, phân bổ, version, audit; màn chỉ tiêu cá nhân/team | Tổng giao không vượt chỉ tiêu, zero/null đúng, sửa đồng thời bị chặn |
| 3 — Thực hiện & snapshot | Adapter dữ liệu, import nguồn chưa tự động, snapshot, dedup, provenance | Đối soát số bản ghi/tổng theo nguồn; dữ liệu thiếu không thành 0; không tự bịa lịch sử |
| 4 — Tổng quan Leader | Mục Team & KPI riêng, biểu đồ thành viên/tháng, tháng/lũy kế, cảnh báo chất lượng dữ liệu | Cùng bộ lọc cho thẻ/biểu đồ/bảng; số tổng khớp; màn Tổng quan không thay đổi |
| 5 — Chốt kỳ & vận hành | Chốt/mở lại, revision, đối soát, export nếu được yêu cầu | Lịch sử không đổi sau chuyển team; có đường khôi phục và nhật ký |

Không cam kết thời gian trước khi chốt nguồn thực hiện và khả năng import. Đợt 1–2 có thể dùng thử khi dữ liệu KPI chưa đủ, nhưng không gọi kết quả đó là báo cáo KPI chính thức.

### Cách triển khai an toàn

1. Tạo nhánh backup trước thay đổi schema/tầng dữ liệu.
2. Tạo migration theo công cụ/quy ước hiện hành; chỉ thêm bảng/cột/policy, không xóa dữ liệu cũ.
3. Giữ user chưa gán team hoạt động như hiện tại; không gom mọi tài khoản vào một team mặc định có quyền xem lẫn nhau.
4. Áp migration và kiểm RLS trước deploy mã đọc bảng mới.
5. Đối soát counts và totals theo team/user/kỳ; kiểm quyền bằng nhiều danh tính, không chỉ dùng admin.
6. Build/test rồi mới push; xác nhận deployment Ready hoặc endpoint mã mới. Không suy từ push thành công sang deploy thành công.

## 11. Kiến trúc mã khi triển khai thật

- `types/team.ts`, `types/kpi.ts`: kiểu dùng chung.
- `lib/team/`, `lib/kpi/`: quy tắc phạm vi, tính KPI, lũy kế, phân bổ, kiểm dữ liệu; unit test không DOM.
- Repository/API dưới `lib/api/`: truy vấn và RPC; không viết Supabase trong JSX.
- `hooks/useTeamOverviewController.ts`, `useKpiTargetsController.ts`: loading/error/bộ lọc/save/version.
- `components/team/`, `components/kpi/`: thẻ, biểu đồ, bảng và form nhận props/callback.
- Nguồn điều hướng hiện tại chỉ thêm điểm vào đã chốt, không tạo một danh mục thứ ba.
- Không thay `UserScopeContext` bằng localStorage teamId có quyền toàn hệ thống; phạm vi cần được server xác nhận.

## 12. Kiểm thử bắt buộc

- Mọi cặp Member/Leader/Admin, team A/B, user chưa có team, module bị tắt; gọi thẳng RPC/API bằng teamId giả.
- Leader chỉ đọc không UPDATE/DELETE/thu nợ cho người khác; đầu mối scope của admin vẫn tương thích.
- Thành viên chuyển team giữa tháng, chuyển chủ KH, đổi Leader, user nghỉ việc; tháng cũ và báo cáo toàn hệ thống không nhân đôi.
- Flow cộng đúng; stock lấy cuối kỳ; ratio dùng đúng mẫu số; zero/null/âm/đơn vị/trọng số thiếu.
- Tổng KPI thành viên + chưa phân bổ = chỉ tiêu team; tổng thực hiện team đúng theo facts/snapshot của kỳ, kể cả thành viên đã rời.
- Tháng mở/chốt/mở lại, cập nhật đồng thời, revision, import trùng và lỗi giữa giao dịch.
- Bộ lọc tháng/KPI/team đồng bộ trên thẻ, biểu đồ và bảng; phân biệt dữ liệu thiếu, lỗi và rỗng.
- Desktop/laptop/mobile, keyboard/focus; biểu đồ có số và bảng thay thế, không dùng màu làm dấu hiệu duy nhất.
- Hồi quy Dashboard cá nhân, quyền admin và các module hiện tại.

## 13. Mockup trong đợt này

Mockup là tệp HTML với CSS/JavaScript cục bộ, không tải thư viện ngoài. Có chọn tháng, KPI, vai trò xem thử; biểu đồ thành viên và xu hướng; bảng KPI tháng/lũy kế; thử phân bổ chỉ tiêu tháng 10 trong phiên. Tháng 9 đã chốt chỉ xem. Khung SRBO thể hiện cấu trúc điểm đang chờ cấu hình; RBO theo tài khoản, Leader chọn tên thành viên để xem. Nút mở Dashboard dẫn về ứng dụng hiện tại.

Số liệu và danh tính đều là ví dụ. Đổi vai trò trong mockup chỉ để trình diễn, không phải cơ chế bảo mật thật. Tải lại đặt lại bản nháp. Thành viên chỉ xem KPI của chính mình; Leader/Admin có các góc nhìn phù hợp giả định ở mục 3–4.

## 14. Tài liệu nền kỹ thuật

Đối chiếu các quy tắc RLS/SELECT–UPDATE, membership và view với tài liệu chính thức Supabase về Row Level Security; khi làm migration phải kiểm lại tài liệu/changelog ở thời điểm triển khai. Kế hoạch này không dựa vào khả năng kiểm quyền trên client.
