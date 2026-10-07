# Chuyển Kho lưu trữ từ Hugging Face sang Google Drive (Shared Drive)

Ngày: 08/10/2026. Trạng thái: chờ duyệt.

## Mục tiêu

Mọi kho (Kho chung, kho cá nhân, kho Văn thư, kho Biểu mẫu) lưu tệp trên **một Shared Drive** của Google Workspace, thay Hugging Face. Người dùng quản lý thư mục và tệp đầy đủ: tạo, đổi tên, di chuyển, sao chép, xóa, tải lên, tải về, trong giao diện Kho lưu trữ hiện có. Văn thư, Biểu mẫu và AI đọc văn bản chạy như cũ, chỉ đổi nơi lấy tệp.

## Đã chốt với người dùng

- Có Google Workspace và Shared Drive; dùng **tài khoản dịch vụ (service account)**.
- Lý do chuyển: quản lý thư mục và tệp đầy đủ như Drive (tạo thư mục rỗng, đổi tên, di chuyển, thùng rác).
- **Chuyển hết một lần**, gồm Văn thư và Biểu mẫu.
- Nhân viên **không** là thành viên Shared Drive: chỉ ứng dụng truy cập; quyền ai thấy kho nào do ứng dụng quyết định như hiện nay.
- Tệp đi thẳng trình duyệt <-> Google Drive, không qua Vercel hay Supabase (trừ việc lấy token, vài trăm byte).

## Điều kiện phải có trước khi làm (người dùng chuẩn bị)

1. Một dự án Google Cloud bật **Drive API**.
2. Một service account và **khóa JSON** của nó. Lưu ý: nhiều tổ chức Workspace mới bị chính sách chặn tạo khóa service account (`iam.disableServiceAccountKeyCreation`). Nếu bị chặn, quản trị Workspace phải tắt chính sách đó cho dự án này; nếu không tắt được thì phương án này không dùng được và phải bàn lại.
3. Thêm email service account làm thành viên **Quản lý nội dung (Content manager)** của Shared Drive.
4. Cho tôi **ID Shared Drive** (không phải khóa).
5. Đặt ba secret ở Supabase (người dùng tự đặt, tôi không thấy khóa): `GDRIVE_SA_EMAIL`, `GDRIVE_SA_PRIVATE_KEY`, `GDRIVE_SHARED_DRIVE_ID`.

## Kiến trúc

### Lấy token (Edge Function `drive-token`)
Trình duyệt gọi hàm bằng JWT đăng nhập. Hàm kiểm tra người gọi (còn hoạt động, có module `storage` hoặc `dispatch`), ký JWT bằng khóa service account và đổi lấy access token Google (sống 1 giờ, cache trong bộ nhớ hàm). Khóa nằm ở secret của Supabase, **không nằm trong bảng `SystemConfig`** như token Hugging Face hiện nay. Cùng khuôn với `admin-users` (kiểm tra vai trò trong hàm, `verify_jwt` bật). Phần ký JWT lấy cách làm ở `felix-admin/src/lib/drive/driveService.ts` (thư viện `jose`).

Phạm vi token theo người gọi: có quyền tải lên ở đâu đó (Master Admin, User Admin, hoặc có module `storage`) thì nhận token ghi (`drive`); chỉ đọc (ví dụ chỉ có module Văn thư) thì nhận token `drive.readonly`. Đây là cưỡng chế thật ở token cho nhóm chỉ đọc.

### Gọi Drive trực tiếp từ trình duyệt
Một lớp `driveClient` (hàm thuần cộng gọi `fetch`), mọi lệnh có `supportsAllDrives=true`:

| Việc | Lệnh Drive v3 |
|---|---|
| Liệt kê cả kho | `files.list` với `corpora=drive`, `driveId`, `trashed=false`, `fields` gồm id, name, mimeType, size, parents, modifiedTime; `pageSize=1000`; dựng cây ở máy theo `parents`, cắt phần thuộc thư mục gốc của kho |
| Tạo thư mục | `files.create` với `mimeType=application/vnd.google-apps.folder` |
| Đổi tên | `files.update` (`name`) |
| Di chuyển | `files.update` (`addParents`, `removeParents`) |
| Sao chép | `files.copy` phía máy chủ Google (hết giới hạn 200 MB và 500 tệp của cách dán qua trình duyệt) |
| Xóa | `files.update` (`trashed=true`), vào thùng rác của Shared Drive, khôi phục được |
| Tải lên | tải lên kiểu resumable (`uploadType=resumable`) cho tệp lớn |
| Tải về | `files.get?alt=media`; tệp Google Docs/Sheets/Slides thì `files.export` ra docx/xlsx/pptx |

Drive cho phép **hai tệp cùng tên trong một thư mục**; ứng dụng vẫn đổi tên tránh trùng khi tải lên và dán như hiện nay (`uniqueFileName`).

### Lớp nhà cung cấp lưu trữ
Mã hiện nay gọi thẳng Hugging Face ở khoảng 30 tệp. Tạo một giao diện `StorageProvider` (liệt kê, tạo thư mục, đổi tên, di chuyển, sao chép, xóa, tải lên, tải về) với hai bộ nối: `huggingface` (giữ nguyên mã cũ, dùng để đọc nguồn khi chuyển dữ liệu) và `drive`. Màn hình, hook, AI chỉ biết giao diện.

### Mô hình dữ liệu (migration 68)
- `StorageRepos`: thêm cột `Provider` (`huggingface` mặc định, hoặc `drive`). Với repo Drive, `RepoId` chứa **ID thư mục gốc của kho trong Shared Drive**. Hàm `update_storage_repo` đổi cách kiểm tra Repository ID theo `Provider`.
- Tệp của văn bản (`OfficialDocuments.Files`): thêm `fileId`. Tệp Drive tham chiếu bằng **ID tệp**, nên đổi tên hay di chuyển tệp trong Kho **không làm văn bản mất liên kết** (khác Hugging Face hiện nay, tham chiếu theo đường dẫn nên vỡ khi đổi tên). `path` giữ để hiển thị.
- `Dispatches`: thêm `FileId`.
- Cột `LegacyRepoId` giữ repo Hugging Face cũ để quay lui.

### Chuyển dữ liệu cũ (công cụ cho Master Admin)
Nút "Chuyển sang Drive" ở từng repo: đọc từng tệp từ Hugging Face, tải thẳng lên Drive với cùng cấu trúc thư mục, đối chiếu dung lượng, rồi gọi một hàm CSDL (một giao dịch) đổi `Provider`, ghi `fileId` và cập nhật `OfficialDocuments.Files`, `Dispatches`. **Không xóa gì trên Hugging Face**: dữ liệu cũ giữ nguyên làm bản dự phòng; muốn quay lại chỉ cần đổi `Provider` về cũ. Có chế độ chạy thử (chỉ đếm tệp và dung lượng, không ghi). Chạy lại được nếu đứt giữa chừng (bỏ qua tệp đã sang đủ dung lượng).

## Giới hạn nói thật

- **Token dùng chung.** Ai nhận được token ghi thì gọi thẳng Drive API làm được mọi việc trong Shared Drive, kể cả xóa tệp của kho khác. Google không có token giới hạn theo thư mục cho service account. Mức bảo vệ tương đương hiện nay với Hugging Face, chỉ tốt hơn ở hai điểm: khóa không nằm trong CSDL, và nhóm chỉ đọc nhận token chỉ đọc. Xóa vào thùng rác nên khôi phục được.
- Phân quyền theo kho cá nhân, Kho chung, Văn thư, Biểu mẫu vẫn là luật của ứng dụng (giao diện + RLS cho danh sách kho), không phải luật của Google.
- Resumable upload từ trình duyệt tới Drive **chưa thử với khóa thật**; đây là việc đầu tiên của giai đoạn 1 (thử nghiệm nhỏ có khóa thật). Nếu CORS chặn, tải lên phải đổi cách (chia nhỏ theo multipart).
- Liệt kê cả Shared Drive một lần chậm hơn Hugging Face khi có hàng chục nghìn tệp (một lần gọi mỗi 1.000 tệp). Kho hiện còn nhỏ; sẽ có nút làm mới và giữ cây trong bộ nhớ phiên.
- Tệp trong Shared Drive thuộc về Shared Drive, không thuộc về ai; xóa tài khoản nhân viên không làm mất tệp.

## Các giai đoạn

1. **Nền và đọc.** Migration 68, Edge Function `drive-token`, `driveClient`, `StorageProvider`, kết nối thử trong cài đặt kho, duyệt cây, xem trước, tải về, tải thư mục dạng ZIP, thử resumable với khóa thật.
2. **Ghi.** Tạo thư mục, đổi tên, di chuyển, sao chép và dán phía Google, xóa vào thùng rác, tải lên tệp và thư mục; menu và nút trong Kho lưu trữ bổ sung đổi tên, di chuyển, thư mục mới.
3. **Văn thư, Biểu mẫu, AI.** `fileId` trong `OfficialDocFile`, `docFiles`, `recordFromAi` (ghi phụ lục, biểu mẫu lên Drive), `docReader`/`docContext` cho AI, chọn tệp từ Kho.
4. **Công cụ chuyển dữ liệu cũ** và chạy cho từng repo, đối chiếu kết quả.
5. **Dọn.** Gỡ mã Hugging Face và `SystemConfig.hf_config` chỉ sau khi người dùng xác nhận mọi thứ chạy ổn trên Drive; cập nhật tài liệu skill.

## Kiểm chứng

- Hàm thuần (dựng cây từ `parents`, chọn phạm vi token, chọn tên tránh trùng, lập kế hoạch chuyển) có test.
- `driveClient` test bằng `fetch` giả: đúng URL, tham số `supportsAllDrives`, phân trang, mã lỗi 401/403/404/429 thành thông báo tiếng Việt.
- Edge Function: phần quyết định phạm vi và kiểm tra người gọi tách thành hàm thuần có test; phần gọi Google chỉ kiểm bằng khóa thật.
- Migration 68 và hàm chuyển repo: test PGlite như migration 66, 67.
- Với khóa thật: nút "Kiểm tra kết nối" trong cài đặt kho tạo thư mục thử, tải lên tệp thử, đọc lại, đổi tên, xóa; báo từng bước. Chạy tay trước khi chuyển dữ liệu.
- Sau khi chuyển: đối chiếu số tệp và dung lượng từng repo giữa Hugging Face và Drive, mở thử từng văn bản qua Văn thư, hỏi AI về một văn bản.

## Rủi ro

- Chính sách Workspace chặn tạo khóa service account (nêu ở trên): kiểm tra trước, vì quyết định cả hướng đi.
- Khối lượng lớn: viết lại lớp truy cập tệp (khoảng 30 tệp, 21 tệp test liên quan) và chuyển dữ liệu văn bản thật. Đã chốt chuyển một lần, nhưng vẫn **làm từng giai đoạn** và chỉ bật Drive cho từng repo khi giai đoạn tương ứng đã chạy ổn; Hugging Face vẫn nguyên cho tới giai đoạn 5.
- Văn bản cũ trỏ theo đường dẫn: chỉ chuyển đúng khi hàm chuyển dữ liệu chạy trọn; đã có chạy thử và quay lui.
