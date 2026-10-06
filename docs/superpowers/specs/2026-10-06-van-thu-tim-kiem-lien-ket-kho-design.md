# Văn thư dạng danh mục văn bản: tìm kiếm, chi tiết, liên kết tệp Kho lưu trữ

Ngày: 2026-10-06 · Người duyệt: người dùng (đã xác nhận phạm vi gọn theo ảnh khoanh đỏ).

## Mục tiêu
Văn thư là danh mục văn bản có thể tìm và lọc nhanh. Mỗi văn bản chỉ giữ thông tin cần thiết và **liên kết tới tệp nằm ở Kho lưu trữ**. Văn thư không tải tệp lên nữa.

## Phạm vi
**Làm**
- Bốn mục sidebar giữ nguyên: Văn bản, Hợp đồng, Công văn, Khác (kèm số lượng).
- Trường của một văn bản: Số hiệu, Tiêu đề, Mục, Ngày ban hành, Ngày hiệu lực, Ngày hết hiệu lực (có thể trống), Tình trạng (tính sống), tệp **gốc** và tệp **biểu mẫu** (mỗi loại nhiều tệp).
- Tìm nhanh không dấu theo số hiệu và tiêu đề; lọc theo Tình trạng, khoảng ngày ban hành; phân trang 15 dòng.
- Trang "Xem văn bản" chỉ đọc; form tạo/sửa chỉ cho admin; chọn tệp từ Kho chung và kho Văn thư.

**Không làm:** Loại văn bản (đã bỏ ngày 06/10, migration 62; mục sidebar đã đủ để phân loại), Nghiệp vụ, Đơn vị/Thẩm quyền ban hành, Số lần ban hành, Độ mật, Mức ưu tiên, Trích yếu, tệp Final, quan hệ giữa các văn bản, tìm trong nội dung tệp, tóm tắt AI từng văn bản.

## Mô hình dữ liệu
Bảng mới `OfficialDocuments` (migration 61). Bảng `Dispatches` cũ (rỗng) không còn được dùng và không bị đụng tới.

| Cột | Ghi chú |
|---|---|
| Id | bigint identity |
| OwnerId | uuid mặc định `auth.uid()` |
| Category | `van-ban` / `hop-dong` / `cong-van` / `khac` |
| DocNumber, Title | bắt buộc |
| IssuedDate, EffectiveFrom | bắt buộc; form mặc định EffectiveFrom = IssuedDate |
| EffectiveTo | có thể trống; CHECK `>= EffectiveFrom` |
| Files | jsonb mảng `{kind: 'goc'｜'bieu-mau', repoId, path, name}` |
| SearchText | số hiệu + tiêu đề đã chuẩn hóa không dấu, app tính khi lưu |
| CreatedAt, UpdatedAt | |

**Tình trạng** không lưu. `EffectiveFrom > hôm nay` là Chưa hiệu lực; `EffectiveTo < hôm nay` là Hết hiệu lực; còn lại là Hiện hành. Hôm nay lấy bằng `todayIso()`.

RLS: mọi tài khoản đăng nhập đọc được; thêm/sửa/xóa chỉ khi `is_admin()`. Thu hồi quyền của `anon`.

## Tìm kiếm và phân trang (chạy trong Postgres)
- Mỗi từ trong ô tìm kiếm được chuẩn hóa (chữ thường, bỏ dấu, `đ` thành `d`) rồi `ilike '%từ%'` trên `SearchText`; mọi từ phải khớp. Ký tự `%`, `_` được thoát.
- Lọc Loại, Mục, Tình trạng, ngày ban hành là điều kiện SQL. Sắp xếp ngày ban hành giảm dần, `Id` giảm dần.
- Phân trang bằng `range` kèm `count: 'exact'`. Số lượng từng mục lấy bằng 4 truy vấn `head` cùng bộ lọc trừ Mục. Mỗi lần tìm chỉ chuyển vài KB metadata qua Supabase, tệp không đi qua Vercel/Supabase.

## Tệp
Tệp nằm ở Hugging Face trong Kho lưu trữ. Văn bản lưu `repoId + path`. Chỉ cho chọn tệp ở **Kho chung** và **kho Văn thư** (kho cá nhân người khác không mở được). "Xem" (PDF, ảnh) mở tab mới, "Tải về" tải thẳng từ trình duyệt tới huggingface.co. Tệp đã bị xóa khỏi Kho thì hiện thông báo rõ ràng.

## Giao diện
- Danh sách: ô tìm nhanh, hàng lọc, các dòng `[Số hiệu] Tiêu đề`, Loại, ba ngày, Tình trạng, nút Xem; phân trang. Màu tiết chế theo AGENTS.md.
- "Xem văn bản": các trường khoanh đỏ + hai nhóm tệp.
- Form (admin): trường nhập + "Chọn từ Kho" cho từng nhóm tệp.
- Nút Trợ lý AI vẫn mở chat chung, không đính kèm văn bản.

## Kiến trúc
- `src/lib/officialDoc/`: `docTypes`, `normalize`, `status`, `validate`, `mapRow` (thuần, có test).
- `src/lib/api/officialDocApi.ts`: truy vấn Supabase (`applyDocFilters` thuần, có test bằng chuỗi gọi giả).
- `src/hooks/useOfficialDocs.ts`: trạng thái tìm kiếm (debounce), phân trang, số lượng mục.
- Components: `DispatchManagementView` (viết lại), `OfficialDocList`, `OfficialDocDetail`, `OfficialDocForm`, `HfFilePickerModal`.
- Dọn mã chết sau khi viết lại: `DispatchTable`, `DispatchUploadModal`, `DispatchPreviewModal`, phần chỉ dùng cho Văn thư trong `dispatchStorage`/`dispatchCategories`, chế độ `dispatch` của `useArchive`.

## Rủi ro
- Migration 61 do người dùng tự áp trên Supabase **trước khi deploy**.
- Quyền chọn tệp là quy tắc giao diện (token HF dùng chung), như đã chấp nhận ở Kho lưu trữ.
- Số hiệu không ép duy nhất để không chặn văn bản hợp lệ trùng số.

## Bổ sung: AI đọc và ghi nhận văn bản (06/10)
- Kéo thả PDF/ảnh vào chat chỉ đính kèm, Enter mới gửi. Với admin, AI trích các trường rồi hiện thẻ cho sửa; bấm "Ghi nhận vào Văn thư" mới tải tệp lên kho Văn thư và tạo văn bản (AI không tự ghi).
- Khi hỏi, AI tự tìm văn bản liên quan (`docRetrieval`: số hiệu nêu rõ, rồi từ khóa không dấu, rồi văn bản đang bàn), tải PDF/ảnh từ Kho thẳng từ trình duyệt (`docReader`, tối đa 4 tệp, 12MB) và gửi kèm câu hỏi để trả lời theo nội dung thật. Tệp không đọc được được báo rõ cho AI, không bịa.
- Tốc độ: lấy ngữ cảnh hệ thống song song, chỉ tải khách hàng khi câu hỏi nhắc tới, giảm thinking của Gemini, bỏ qua model đã báo 404.
