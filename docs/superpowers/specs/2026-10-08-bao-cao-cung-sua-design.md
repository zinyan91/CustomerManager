# Báo cáo: bảng tính dùng chung, cùng sửa nhiều người, nhật ký và lùi lịch sử

Ngày: 08/10/2026. Trạng thái: chờ duyệt. Làm cho Bảng tính; Văn bản (Writer) làm sau giai đoạn 2 của tab Báo cáo.

## Mục tiêu

Một bảng tính trong tab Báo cáo có thể được **chia sẻ**: chủ mời từng tài khoản (quyền sửa hoặc chỉ xem), nhiều người **cùng sửa một lúc** và thấy thay đổi của nhau gần như ngay, mọi thay đổi được **ghi nhật ký** (ai, ô nào, lúc nào, cũ và mới), và có thể **lùi về phiên bản trước** mà không mất lịch sử.

Đã chốt với người dùng: chia sẻ theo từng tài khoản được mời; phạm vi lần này chỉ Bảng tính.

## Không làm

- Văn bản (Writer) cùng sửa: làm sau, cần cơ chế khác (hợp nhất văn bản, không phải ô).
- Bình luận, @nhắc tên, thông báo qua email.
- Chia sẻ ra ngoài hệ thống (người không có tài khoản), liên kết công khai.
- Đồng bộ ngoại tuyến nhiều người: mất mạng thì tiếp tục sửa trên máy, có mạng lại thì gửi và hợp nhất (giới hạn nêu ở mục Rủi ro).
- Đổi cách nháp cá nhân đang chạy: bảng tính chưa chia sẻ vẫn là nháp trong trình duyệt (IndexedDB). Bấm "Chia sẻ" mới đưa lên hệ thống.

## Thiết kế

### Mô hình dữ liệu (migration 71, chỉ thêm bảng và hàm, không đụng dữ liệu cũ)

| Bảng | Vai trò |
|---|---|
| `OfficeDocuments` | một bảng tính chung: `Id` uuid, `Kind` ('calc'), `Title`, `OwnerId`, `CreatedAt`, `UpdatedAt`, `LastSeq` |
| `OfficeDocumentMembers` | `DocId`, `UserId`, `Role` ('editor' hoặc 'viewer'); chủ luôn là editor |
| `OfficeDocumentOps` | **nhật ký và nguồn sự thật**: `Id`, `DocId`, `Seq` (số thứ tự không trùng trong một tài liệu), `UserId`, `Patch` jsonb (phần chênh lệch), `Summary` jsonb (mô tả cho người đọc), `CreatedAt` |
| `OfficeDocumentVersions` | các mốc: `Id`, `DocId`, `Seq` (mốc sau thao tác số mấy), `Data` jsonb (cả bảng tính), `Label` (tên mốc, rỗng nếu tự động), `CreatedBy`, `CreatedAt` |

RLS bật ở cả bốn bảng. Đọc: chủ, thành viên, Master Admin. Ghi trực tiếp vào `OfficeDocumentOps` bị khóa; chỉ qua hàm. Mọi thay đổi quyền (mời, đổi quyền, gỡ) chỉ chủ hoặc Master Admin.

Hàm (SECURITY DEFINER, kiểm quyền bên trong, `search_path` cố định):
- `office_create_document(title, data)`: tạo tài liệu từ một bản nháp, tạo mốc đầu (Seq 0).
- `office_append_op(doc, base_seq, patch, summary)`: kiểm tra quyền sửa, khóa dòng tài liệu, gán `Seq = LastSeq + 1`, ghi dòng nhật ký, trả `Seq`. Máy chủ **chỉ xếp thứ tự**, không tự áp patch (tránh viết lại engine bảng tính bằng SQL).
- `office_save_version(doc, seq, data, label)`: ghi mốc (khi tự động mỗi 100 thao tác, hoặc người dùng bấm "Lưu mốc").
- `office_restore_version(doc, version_id)`: ghi một thao tác loại `snapshot` thay cả nội dung bằng mốc đã chọn; **không xóa thao tác hay mốc nào**.
- `office_invitable_users()`: trả `id` và họ tên của các tài khoản đang hoạt động để chủ chọn khi mời (chỉ tên, không email).

Realtime: thêm `OfficeDocumentOps` vào publication `supabase_realtime`; RLS vẫn áp lên luồng, người không phải thành viên không nhận được gì.

### Cách đồng bộ

- Tải tài liệu: mốc mới nhất cộng các thao tác có `Seq` lớn hơn, áp tuần tự trên máy. Tải hết thao tác từ đầu không cần thiết nên số thao tác phải phát lại tối đa khoảng 100.
- Mỗi lần sửa, máy so bảng tính trước và sau (`WorkbookData`) để ra **patch**: ô đặt hoặc xóa (kèm định dạng theo giá trị, không theo số hiệu định dạng của riêng máy đó), thuộc tính từng trang tính thay cả giá trị (độ rộng cột, chiều cao dòng, ô gộp, định dạng có điều kiện, biểu đồ, bộ lọc, cố định, kiểm tra dữ liệu), thêm, xóa, đổi tên trang tính. Chèn hoặc xóa dòng cột sinh patch lớn nhưng đúng.
- Patch gửi lên bằng `office_append_op`. Máy khác nhận qua Realtime, **áp theo thứ tự `Seq`**; mọi máy áp cùng một dãy nên cùng ra một kết quả.
- **Xung đột:** hai người sửa cùng một ô cùng lúc thì thao tác có `Seq` lớn hơn thắng, ở mức từng ô (không khóa cả bảng). Thao tác của mình chưa được xác nhận được áp lại sau khi các thao tác mới hơn đến.
- **Hoàn tác** (Ctrl+Z) chỉ hoàn tác thay đổi của chính mình bằng một thao tác mới ghi vào nhật ký (không xóa gì của người khác).
- Chống lặp: thao tác của chính mình quay về qua Realtime được nhận ra theo `UserId` cộng `Seq` đã biết, không áp hai lần.

### Người cùng làm việc (presence)

Kênh presence của Supabase Realtime theo tài liệu: thanh tiêu đề hiện ảnh chữ cái của những người đang mở; trên lưới hiện khung màu và tên ở ô mỗi người đang chọn. Không lưu gì xuống CSDL.

### Giao diện

- Nút **Chia sẻ** ở thanh tiêu đề: hộp thoại mời tài khoản, đổi quyền, gỡ; bản nháp cá nhân bấm Chia sẻ thì hỏi "Đưa lên hệ thống?" rồi mới tạo tài liệu chung.
- Ngăn **Nhật ký** (bên phải): danh sách mới nhất trước, mỗi dòng "Họ tên · giờ · Trang tính!Ô: cũ → mới", lọc theo người; thao tác lớn (chèn dòng, khôi phục) ghi một dòng tóm tắt.
- Ngăn **Lịch sử**: danh sách mốc (tự động và đặt tên), xem trước ở chế độ chỉ đọc, nút **Khôi phục** (có hỏi xác nhận) và **Lưu mốc**.
- Cổng `/office`: hai nhóm "Bản nháp trên máy" và "Bảng tính chung" (của tôi, được mời), có huy hiệu quyền.
- Người chỉ xem: lưới khóa, ribbon xám, vẫn xem được nhật ký và lịch sử.

### Kiến trúc mã

`src/office/collab/` tách khỏi `calc/` (calc không biết gì về mạng):
- `diff.ts`, `apply.ts` (thuần): từ hai `WorkbookData` ra patch và ngược lại; có test thuộc tính (áp patch lên bản trước ra đúng bản sau).
- `sync.ts` (thuần): hàng đợi thao tác chờ xác nhận, áp lại theo `Seq`, chống lặp.
- `collabApi.ts`: gọi các hàm Supabase và đăng ký Realtime (mọi gọi mạng ở đây).
- `useCollabDocument.ts`: nối bộ điều khiển bảng tính với `sync` và `collabApi`, trạng thái đã kết nối, đang lưu, lỗi.
- Thành phần giao diện: `SharePanel`, `ActivityPanel`, `HistoryPanel`, `PresenceBar`.
Điểm chạm vào `calc/`: bộ điều khiển phát sự kiện "bảng tính đổi" (đã có `subscribe`) và nhận lệnh `applyRemote(patch)` không đưa vào ngăn xếp hoàn tác.

## Các giai đoạn (mỗi giai đoạn dùng được và kiểm chứng riêng)

1. **Tài liệu chung, chưa thời gian thực.** Migration 71, `collabApi`, đưa nháp lên hệ thống, mở lại, mời tài khoản và phân quyền, danh sách ở cổng. Người khác mở thấy bản mới nhất khi tải lại.
2. **Cùng sửa thời gian thực.** `diff`, `apply`, `sync`, Realtime, presence.
3. **Nhật ký.** Ngăn Nhật ký, tóm tắt thao tác.
4. **Lịch sử và khôi phục.** Mốc tự động và đặt tên, xem trước, khôi phục.

## Kiểm chứng

- PGlite (như các test migration hiện có): RLS đúng cho chủ, thành viên sửa, thành viên xem, người ngoài, Master Admin; `Seq` không trùng và tăng đều khi gọi đồng thời; không ghi thẳng vào nhật ký được; khôi phục không xóa gì; chạy lại migration không lỗi; rollback.
- Test thuần cho `diff`/`apply`/`sync`: hai bộ điều khiển trên một kho giả trong bộ nhớ, sửa xen kẽ rồi đối chiếu hai bên cùng ra một kết quả; xung đột cùng ô; thao tác tới trễ và tới lặp; chèn dòng đồng thời với sửa ô.
- Chrome thật với hai cửa sổ hai tài khoản (khi người dùng cung cấp được hai tài khoản thử), hoặc hai ngữ cảnh trình duyệt dùng một Supabase thử: gõ ở bên này thấy ở bên kia, nhật ký đúng, khôi phục đúng.
- Chỉ chạy test của phần đang làm và phần liên quan.

## Rủi ro

- **Kích thước:** bảng tính lớn làm mốc `Data` nặng. Giới hạn bản chung ở 5 MB; vượt thì báo và gợi ý chia nhỏ.
- **Sửa nặng cùng lúc** (dán hàng chục nghìn ô): patch lớn. Gộp các thay đổi trong 300 ms thành một thao tác và giới hạn kích thước một thao tác; vượt thì gửi dưới dạng `snapshot` kèm tóm tắt.
- **Chèn hoặc xóa dòng cột đồng thời với sửa ô ở vùng bị dịch** có thể ra kết quả bất ngờ (xung đột ở mức ô); ghi rõ cho người dùng, và nhật ký cùng lịch sử cho phép lùi.
- **Mất mạng:** thao tác chưa gửi được giữ trong hàng đợi trên máy, hiện trạng thái "chưa đồng bộ"; có mạng lại thì gửi theo thứ tự. Nếu tài liệu đã thay đổi nhiều thì hợp nhất ở mức ô.
- **Quyền riêng tư:** `office_invitable_users` lộ họ tên mọi tài khoản cho người dùng thường; chỉ trả họ tên và mã, không email; có thể giới hạn theo vai trò nếu bạn muốn.
- **Realtime:** cần Realtime bật cho dự án Supabase (gói hiện tại cần kiểm trước khi làm giai đoạn 2).
