# Khu quản trị /admin và cờ module chặn thật ở RLS

Ngày: 07/10/2026. Trạng thái: đã duyệt và đã cài (chưa áp migration 65 lên Supabase).

## Mục tiêu

Master Admin và User Admin chọn cho từng tài khoản được dùng những chức năng nào (ví dụ tài khoản A chỉ mở Văn thư, tài khoản B đầy đủ). Chức năng bị tắt phải bị **chặn thật ở CSDL**, không chỉ ẩn menu: tài khoản đó gọi thẳng API Supabase cũng không đọc hay ghi được dữ liệu của chức năng đó.

## Phạm vi giai đoạn này

Làm:
- Khu `/admin` trong app, chỉ hai vai trò quản trị vào được: Tổng quan (số liệu thật), Người dùng (chuyển từ tab Người dùng hiện có), Chi tiết người dùng với bảng tích module.
- Bảng cờ module, hàm kiểm tra, chính sách RLS chặn theo module.
- Ẩn menu, chặn tuyến, lọc Hub và bảng lệnh theo module.

Không làm (để sau): quản trị văn bản, quản trị kho tệp, nhật ký thao tác, dọn bộ nhớ AI, tách web admin riêng.

## Vai trò và module là hai trục khác nhau

- Vai trò (đã có): quyết định ai quản lý ai. Master Admin, User Admin, User.
- Module (mới): quyết định tài khoản thấy chức năng nào. Chỉ áp cho tài khoản cấp User; hai vai trò quản trị luôn có đủ module.

## Danh sách module

| Module | Màn hình | Bảng dữ liệu chặn ở RLS |
|---|---|---|
| `credit` Hồ sơ tín dụng | Tổng quan, Khách hàng, HĐTD, Khoản vay, TSĐB, Hợp đồng thế chấp, Thẻ tín dụng, Kiểm soát sau vay, Giải ngân và thụ hưởng, Hồ sơ chứng từ | Customers, CreditContracts, LoanContracts, RepaymentSchedules, Collaterals, CollateralAppraisals, MortgageContracts và 2 bảng nối, CardContracts, CardSupplementaryHolders, PostLoanControlRecords, DisbursementPayees |
| `rates` Lãi suất và vốn | Chào lãi suất, Mua bán vốn COF, Dự phóng TOI | RatePrograms và 6 bảng con, CofPrograms, CofRateItems, CofStandardRates, DepositRateAuthorities |
| `dispatch` Văn thư | Văn thư | OfficialDocuments, Dispatches, AiAnswerCache |
| `storage` Kho lưu trữ | Kho lưu trữ | StorageRepos (kho chung, kho cá nhân) |
| `inventory` Dự toán, kho hàng, bán lẻ | Kho hàng, Dự toán thi công, Mua sắm, Hóa đơn bán lẻ, Bảng kê thu mua | InventoryItems, InventoryCategoryTemplates, SaleCatalogProfiles, StatementTemplates, PurchaseStatements, RetailInvoices |
| `quiz` Ôn tập nghiệp vụ | Ôn tập nghiệp vụ tín dụng | QuizQuestions |
| `tools` Công cụ tính | Công cụ tính toán, Phương án kinh doanh, BCTC doanh nghiệp, Tra cứu MĐSDV, Tra cứu mã phí thẻ, Báo cáo Excel | không có bảng riêng (chạy trên trình duyệt) |

Cấu hình chung (`SystemConfig`) và `UserRoles` không thuộc module nào.

Chức năng chạy hoàn toàn trên trình duyệt (module `tools`) chỉ ẩn được ở giao diện, vì không có dữ liệu máy chủ để chặn. Sẽ nói rõ điều này ở màn quản trị.

## Mô hình dữ liệu

```sql
CREATE TABLE public."UserModules" (
  "UserId"    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "Modules"   text[] NOT NULL DEFAULT '{}',
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
```

Quy tắc đọc cờ, gói trong hàm `has_module(m text)` (SECURITY DEFINER, STABLE):
1. Chưa đăng nhập: **không có quyền** (kể cả khi bảng đang mở cho anon).
2. Master Admin, User Admin: luôn có quyền.
3. Không có dòng trong `UserModules`: có quyền mọi module (tương thích ngược, không ai mất menu khi triển khai).
4. Có dòng: chỉ các module trong mảng. Mảng rỗng nghĩa là không module nào.

## Chặn bằng chính sách RESTRICTIVE, không sửa chính sách cũ

Với mỗi bảng thêm một chính sách `AS RESTRICTIVE FOR ALL` kiểu `USING ((SELECT public.has_module('credit')))`. Postgres nối chính sách RESTRICTIVE bằng AND với các chính sách hiện có, nên:
- Không động vào ~40 chính sách đang chạy, nên không thể làm hỏng logic quyền hiện tại.
- Gỡ lại dễ: xóa các chính sách `mod_*` là về nguyên trạng. Kèm tập lệnh gỡ trong migration.
- `(SELECT ...)` để Postgres tính một lần mỗi câu lệnh, không tính từng dòng.

`SystemConfig`: thêm chính sách RESTRICTIVE chỉ cho phép đọc khóa `hf_config` (token kho tệp) khi có module `storage` hoặc `dispatch`. Tài khoản không có hai module này không lấy được token nên không với tới tệp trên Hugging Face.

`UserModules`:
- Đọc: chính mình, hoặc hai vai trò quản trị.
- Ghi: hai vai trò quản trị, và dòng đích **không** phải của Master Admin (User Admin không đụng Master Admin, giống luật quản lý người dùng). Edge Function dùng service_role nên bỏ qua RLS, không ảnh hưởng.

## Phát hiện cần xử lý (đã đọc CSDL thật, chỉ đọc)

Tám bảng đang cho phép **người chưa đăng nhập** đọc và ghi, vì chính sách dành cho `public` hoặc `anon` với điều kiện `true`: DisbursementPayees (có số tài khoản thụ hưởng), InventoryItems, InventoryCategoryTemplates, SaleCatalogProfiles, StatementTemplates, PurchaseStatements, RetailInvoices, và các bảng lãi suất (đang cấp quyền cho `anon`). Khóa `anon` nằm công khai trong mã trình duyệt nên ai cũng gọi được.

Chính sách RESTRICTIVE ở trên (điều 1 của `has_module`) **đóng luôn lỗ hổng này** như một tác dụng phụ. Ứng dụng bắt đăng nhập nên không bị ảnh hưởng. Đây là việc nên làm dù bạn có dùng cờ module hay không.

## Giới hạn nói thật

- Tệp nằm trên Hugging Face và mọi tài khoản có module `storage` hoặc `dispatch` dùng chung một token. Chặn module chỉ chặn việc lấy token, không phân biệt được người có `dispatch` mà không có `storage` khi họ đã có token. Mức này giống rủi ro đã ghi ở đặc tả kho lưu trữ.
- Khóa Gemini nằm ở trình duyệt nên không chặn được việc dùng AI; AI chỉ thấy dữ liệu mà RLS cho tài khoản đó thấy.
- Khóa đăng nhập hay đổi cờ không cắt phiên đang mở ngay: JWT còn hiệu lực tới một giờ, nhưng cờ module đọc từ CSDL ở mỗi truy vấn nên có hiệu lực ngay ở dữ liệu.

## Phía ứng dụng

- Bảng ánh xạ thuần ở `src/lib/modules.ts`: danh sách module, nhãn, màn hình và tác vụ Hub thuộc module nào, bộ chọn nhanh ("Chỉ Văn thư", "Đầy đủ"). Có test kiểm mọi màn hình và tác vụ Hub đều có module hoặc được khai là luôn mở.
- `ModulesContext` đọc dòng `UserModules` của chính mình; chưa có dòng thì đủ module.
- Thanh bên, bảng lệnh, Hub, và tuyến bị chặn theo module; vào tuyến không được phép thì chuyển về màn đầu tiên được phép (người chỉ có Văn thư mở thẳng Văn thư).
- `/admin` (chỉ hai vai trò quản trị): Tổng quan; Người dùng (danh sách như hiện nay, thêm cột module); Chi tiết người dùng `/admin/users/:id` với bảng tích module và bộ chọn nhanh. Mục "Người dùng" cũ trong thanh bên đổi thành "Quản trị".

## Kiểm chứng

- Test thuần cho ánh xạ module, bộ chọn nhanh, lọc điều hướng.
- Test RLS chạy cục bộ bằng Postgres thật trong bộ nhớ (PGlite), dựng giả `auth.uid()` và vai trò `anon`/`authenticated`: kiểm khách chưa đăng nhập bị chặn, tài khoản không có dòng thì đủ quyền, tài khoản có dòng bị chặn đúng bảng, quản trị luôn đủ quyền, User Admin không sửa được cờ của Master Admin. Cần thêm một gói phát triển (`@electric-sql/pglite`, chỉ dùng khi chạy test).
- Không ghi vào CSDL thật khi chưa duyệt. Bạn tự áp migration; sau khi áp tôi chỉ đọc lại danh sách chính sách để đối chiếu.

## Rủi ro

- Khóa nhầm chính mình: không xảy ra vì hai vai trò quản trị luôn đủ quyền ở `has_module`.
- Chính sách sai làm cả hệ thống không đọc được dữ liệu: giảm bằng test PGlite trước khi giao, migration chỉ thêm (không xóa, không sửa), có tập lệnh gỡ.
- Một số màn dùng dữ liệu của module khác (ví dụ chào lãi suất cần khách hàng). Tài khoản chỉ có `rates` sẽ không thấy tên khách hàng ở những chỗ nhúng. Bộ chọn nhanh và nhãn mô tả nói rõ module nào cần module nào.

## Thứ tự làm

1. Migration 65 (bảng, hàm, chính sách) và test PGlite.
2. `src/lib/modules.ts` và test.
3. `ModulesContext`, lọc điều hướng, chặn tuyến.
4. Khu `/admin`: Tổng quan, Người dùng, Chi tiết người dùng.
5. Nhật ký tiến độ.
