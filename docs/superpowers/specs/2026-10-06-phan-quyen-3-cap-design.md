# Phân quyền 3 cấp, quản trị dữ liệu theo tài khoản, sửa Kho lưu trữ / Văn thư

Ngày: 2026-10-06. Trạng thái: thiết kế đã trình bày trong hội thoại, người dùng yêu cầu "làm tuần tự".

## Đầu bài

1. Master Admin toàn quyền. User Admin quyền gần đầy đủ. User giữ chức năng như hiện tại.
2. Admin (Master và User Admin) không xem gộp toàn bộ khách hàng của mọi user. Dữ liệu tổ chức theo tài khoản; cần xem tài khoản nào thì chọn tài khoản đó.
3. Tab Văn thư và Kho lưu trữ: admin đã cập nhật token HF và folder nhưng user không thấy file.

## Chẩn đoán mục 3 (đối chiếu DB thật `CustomerManager-DB`, 2026-10-06)

- Bảng `StatementTemplates` không có dòng `sys_hf_config` và `sys_dispatches_sync`. Cấu hình HF chỉ nằm trong localStorage của trình duyệt admin.
- Bảng `Dispatches` không tồn tại; migration 59 và 60 chưa áp lên DB thật.
- `UserRoles.Role` chỉ cho `admin` và `banker`; hiện có 2 admin, 1 banker.
- `saveHfConfig` và `syncDispatchesToCloud` nuốt lỗi `{ error }` của supabase-js nên giao diện báo thành công dù ghi hỏng.
- Danh sách văn thư dùng chung là một dòng JSON bị người upload sau cùng ghi đè.
- Văn thư liệt kê toàn repo HF, Kho liệt kê theo `folder` đã cấu hình, nên hai tab lệch nhau.
- Policy `StatementTemplates` là `TO public USING (true)` (kể cả `anon`): token HF lưu ở đó sẽ đọc và ghi đè được bằng anon key trong bundle web.

## Quyết định đã chốt với người dùng

| Câu hỏi | Quyết định |
| --- | --- |
| Mặc định của admin khi mở app | Tài khoản của chính admin |
| Chia sẻ token HF cho user | Lưu trong DB, chỉ user đã đăng nhập đọc được, chỉ Master Admin ghi |
| Quyền thêm của User Admin | Gán/chuyển KH giữa tài khoản; xóa tệp trên Kho/Văn thư |
| Chia giai đoạn | Giai đoạn 1: vai trò + DB + Kho/Văn thư/HF. Giai đoạn 2: phạm vi tài khoản trên các màn |

Giả định đã nêu, chưa bị phản đối: Kho lưu trữ và Văn thư dùng chung một thư mục HF cho mọi user; hai admin hiện có đều chuyển thành `master_admin` để giữ nguyên quyền.

## Ma trận quyền

Nguồn duy nhất: `src/lib/permissions.ts` (module thuần, test 100%).

| Năng lực | Master Admin | User Admin | User |
| --- | --- | --- | --- |
| Xem/sửa KH | mọi tài khoản | mọi tài khoản | chỉ KH của mình |
| Gán/chuyển KH | có | có | không |
| Xóa vĩnh viễn KH | có | không | không |
| Đổi vai trò | có | không | không |
| Cấu hình token/repo HF | có | không | không |
| Upload/tải tệp Kho, Văn thư | có | có | có |
| Xóa tệp Kho, Văn thư | có | có | không |
| Chọn tài khoản để xem | có | có | không (khóa vào chính mình) |

## Thiết kế

### Database (migration 60, viết lại; 59 giữ nguyên, 60 siết RLS của 59)

- `UserRoles`: chuyển `admin` thành `master_admin`, `banker` thành `user`; CHECK chỉ còn `master_admin | user_admin | user`. Trigger chặn hạ quyền hoặc xóa Master Admin cuối cùng.
- Hàm: `is_master_admin()` (chỉ master) và `is_admin()` (master hoặc user_admin). Các policy hiện dùng `is_admin()` tự được User Admin, phù hợp "gần đầy đủ".
- `Customers`: select và update giữ như DB thật (admin hoặc chủ sở hữu), không thêm `OwnerId IS NULL`; user không đổi `OwnerId` sang người khác; delete chỉ `is_master_admin()`.
- `UserRoles`: đọc (bản thân hoặc admin); ghi chỉ Master Admin.
- `SystemConfig(Key text PK, Value jsonb, UpdatedAt, UpdatedBy)`: select cho `authenticated`, ghi chỉ Master Admin, chặn `anon`. Khóa `hf_config`.
- `Dispatches`: thêm `FilePath`, `FolderPath` (FilePath duy nhất); RLS: đọc cho `authenticated`, thêm với `OwnerId = auth.uid()`, sửa bởi chủ hoặc admin, xóa bởi `is_admin()`; chặn `anon`.
- RPC `get_user_customer_counts()`: đếm KH theo `OwnerId` bằng `GROUP BY`, tôn trọng RLS.
- Gỡ `sys_hf_config` và `sys_dispatches_sync` khỏi `StatementTemplates` nếu tồn tại.

### Kho lưu trữ / Văn thư

- `hfConfigApi`: đọc/ghi `SystemConfig`, ném lỗi khi `{ error }`. Không dùng localStorage làm nguồn; bỏ fallback biến môi trường `VITE_HF_TOKEN` (token không được nằm trong bundle).
- Hook `useHfConfig` và `useArchive`; cả hai tab dùng chung, cùng liệt kê dưới `config.folder`.
- Metadata ở `Dispatches`; hợp nhất với cây HF theo `FilePath` bằng hàm thuần `mergeHfTreeWithDispatches`.
- Trạng thái thay cho danh sách rỗng: chưa cấu hình, token hết hạn (401/403), thư mục trống hoặc không tồn tại (404), lỗi mạng.
- Upload bắt buộc có HF; lỗi hiện rõ, không lưu tạm vào máy rồi báo thành công. Bỏ seed demo, IndexedDB làm bản chính, nhánh R2 giả.
- Modal cấu hình HF (chỉ Master Admin): nếu DB chưa có mà trình duyệt còn cấu hình cũ thì điền sẵn để bấm Lưu; Lưu báo lỗi thật.

### Phạm vi tài khoản (giai đoạn 2)

- `UserScopeContext`: user thường bị khóa vào `user.id`. Admin mặc định `user.id`; lựa chọn lưu theo `cm_scope_v2:<userId>` và kiểm tra lại khi nạp. "Tất cả tài khoản" và "Chưa phân công" là lựa chọn chủ động, không bao giờ là mặc định và "Tất cả" không được nhớ.
- Số KH theo tài khoản lấy từ RPC, không tải bảng `Customers`.
- Helper thuần `lib/ownerScope.ts`; API lọc ở server: KH `.eq('OwnerId')`/`.is('OwnerId', null)`; các bảng hợp đồng, TSBĐ, kỳ trả nợ, sau vay qua `customer:Customers!inner(...)`.
- Dữ liệu dùng chung (lãi suất, COF, ngân hàng câu hỏi, kho hàng mẫu, Kho lưu trữ) không theo phạm vi.
- Giao diện "Người phụ trách" trong form KH cho ai có quyền `customer.assign`.

## Brief theo `truoc-khi-code.md`

**Mục tiêu:** Master Admin, User Admin, User có quyền đúng ma trận; admin chọn tài khoản để xem dữ liệu; user nhìn thấy tệp mà admin đã cấu hình trên HF.

**Phạm vi:** LÀM như phần Thiết kế. KHÔNG LÀM: đổi công thức tín dụng; cơ chế tạo tài khoản đăng nhập mới (vẫn qua Supabase Dashboard); proxy token qua Edge Function; chuyển đổi R2; áp phạm vi cho dữ liệu dùng chung.

**Tệp dự kiến chạm:** nhiều hơn 5 nên chia hai giai đoạn, mỗi giai đoạn nghiệm thu riêng (xem bên dưới).

**Tầng:** `src/lib/` (permissions, hfConfigApi, hfStatus, dispatchStorage, ownerScope), `src/hooks/` (useHfConfig, useArchive), `src/context/` (Auth, UserScope), `src/components/`, `supabase/migrations/60`.

**Kiểm chứng bằng gì:** `npm test && npm run build` xanh; migration áp xong thì truy vấn `pg_policies` và `UserRoles` kiểm tra; đăng nhập bằng 3 vai trò xem đúng quyền; user thường thấy tệp sau khi Master Admin lưu cấu hình HF.

**Rủi ro đã biết:** backfill vai trò (khóa Master Admin cuối); user hiện đang đăng nhập có `Role` cũ cho tới khi áp migration, nên migration phải áp trước khi deploy mã; token HF user đọc được qua DevTools, giảm rủi ro bằng fine-grained token chỉ cấp cho đúng một dataset.

## Giai đoạn và thứ tự

1. Giai đoạn 1: `permissions` + `AuthContext`; migration 60; `hfConfigApi`, `dispatchStorage`, hook và hai view; sửa lỗi build `Header.tsx` của bản nháp.
2. Giai đoạn 2: `UserScopeContext`, `ownerScope`, luồng API/hook từng màn, giao diện gán người phụ trách.
3. Ghi `docs/progress/2026-10.md`; hỏi người dùng trước khi áp migration lên DB thật.
