# Báo cáo: chia sẻ Văn bản (Writer) cho từng tài khoản, sửa lần lượt

Ngày: 09/10/2026. Trạng thái: đã làm (09/10/2026), migration 74 chưa áp. Hướng đã chốt với người dùng (09/10/2026): chia sẻ từng người sửa lần lượt, không sửa cùng lúc theo từng ký tự.

## Mục tiêu

Một văn bản trong tab Báo cáo có thể được **chia sẻ** như bảng tính chung: chủ mời từng tài khoản (quyền sửa hoặc chỉ xem), người được mời mở và sửa cùng một văn bản trên hệ thống, thấy ai đang mở, quay lại các mốc đã lưu, biết ai đã lưu gì lúc nào. Hai người lưu chồng nhau thì được báo xung đột, không bản nào bị ghi đè lặng lẽ.

## Không làm

- Sửa cùng lúc theo từng ký tự (Yjs / hợp nhất văn bản). Người dùng đã chọn không làm đợt này.
- Xem trước chỉ-đọc của mốc trong Writer (Bảng tính đã có; Writer cần dựng trình soạn chỉ-đọc riêng, để đợt sau). Khôi phục vẫn có hộp xác nhận và tự lưu mốc an toàn.
- Hợp nhất tự động hai bản sửa. Xung đột thì người dùng chọn: tải bản mới (bỏ phần mình sửa chưa lưu) hoặc giữ bản của mình thành nháp riêng.
- Đổi cách nháp cá nhân: văn bản chưa chia sẻ vẫn là nháp trong trình duyệt (IndexedDB).

## Tái dùng những gì đã có (đã áp migration 71, 72; 73 đang chờ)

`OfficeDocuments`, `OfficeDocumentMembers`, `OfficeDocumentVersions`, `OfficeDocumentOps`, các hàm quyền (`office_role_of`), mời/đổi quyền (`ShareDialog`), lưu có kiểm số thứ tự (`office_save_document`, lỗi 40001 khi lệch), mốc (`office_save_version`, `office_restore_version`), đổi tên (`office_rename_document`), presence (`joinPresence`), ngăn Nhật ký, ngăn Lịch sử. Không có bảng mới.

## Thiết kế

### Máy chủ (migration 74, chỉ nới và thêm, không xóa dữ liệu)

1. `OfficeDocuments."Kind"` cho phép `'writer'` (bỏ ràng buộc cũ `IN ('calc')` rồi thêm lại với hai giá trị).
2. `office_create_document(p_title, p_data, p_kind text DEFAULT 'calc')`: nhận loại, kiểm `p_kind IN ('calc','writer')`. Hàm cũ hai tham số bỏ đi (thay bằng hàm có tham số mặc định) nên lời gọi cũ vẫn chạy.
3. `office_list_documents` và `office_get_document` trả thêm `kind` (đổi kiểu trả về nên bỏ hàm cũ rồi tạo lại, như migration 72 đã làm).
4. `office_save_document` ghi tóm tắt `{"kind":"save"}` thay cho `{"kind":"reset"}` khi tài liệu là `writer`, để nhật ký ghi "Lưu văn bản" chứ không phải "Khôi phục". Thao tác vẫn mang `Patch = [{"t":"reset"}]` để máy khác biết phải nạp lại.
5. Kích thước vẫn giới hạn 5 MB (`office_check_size`); hình dán vào văn bản là base64 nên văn bản nhiều ảnh có thể vượt; thông báo lỗi của máy chủ hiện nguyên.

Kiểm trên PGlite: tạo `writer`, danh sách trả `kind`, lưu đúng/sai số thứ tự (40001), người chỉ xem không lưu được, `save` ghi đúng tóm tắt, chạy lại migration không làm mất dữ liệu, `calc` hiện có không đổi hành vi.

### Máy khách

- Tuyến `/office/writer/shared/:sharedId` (như `/office/calc/shared/:sharedId`). Mở tài liệu `calc` bằng tuyến Writer hoặc ngược lại thì báo lỗi rõ, không dựng sai trình soạn.
- `collabApi` thêm `kind` vào `SharedDocSummary`/`SharedDocument`; `createSharedDocument(title, data, kind)`.
- Hook `useSharedDocument` (tách khỏi giao diện, một việc: giữ `baseSeq`, tự lưu sau 1,5 giây không gõ và khi rời trang, báo trạng thái `saved | saving | conflict | failed`). Khi lưu bị 40001 chuyển `conflict`, dừng tự lưu, giữ nguyên nội dung người dùng đang gõ.
- Nghe `subscribeOps` của tài liệu: có thao tác từ máy khác (số thứ tự lớn hơn `baseSeq`):
  - mình không có thay đổi chưa lưu: tải bản mới và thay nội dung, giữ vị trí con trỏ gần nhất có thể;
  - mình có thay đổi chưa lưu: chuyển `conflict`.
- Banner xung đột (cùng kiểu banner hiện có): "Người khác đã lưu bản mới." với hai nút: **Tải bản mới** (bỏ phần chưa lưu của mình), **Giữ bản của tôi thành nháp** (tạo nháp riêng từ nội dung hiện tại rồi tải bản mới). Không bao giờ ghi đè khi chưa chọn.
- Người chỉ xem: trình soạn khóa, tự lưu tắt, vẫn xem Nhật ký, Lịch sử, người đang mở.
- Thanh tiêu đề (như Bảng tính): nút Chia sẻ (chủ và Master Admin), Nhật ký, Lịch sử, tiêu đề sửa được tại chỗ cho người có quyền sửa, ảnh chữ cái người đang mở (`usePresence` hiện lấy ô; với Writer báo ô rỗng, chỉ hiện tên).
- Ngăn Lịch sử dùng lại `HistoryPanel`, thêm tùy chọn tắt nút Xem cho Writer. Lưu mốc dùng bản đang soạn ở `baseSeq`; khôi phục ghi thành thao tác mới, các máy mở nhận qua Realtime và tải bản mới.
- Cổng `/office`: nhóm "Bảng tính chung" chuyển thành "Tài liệu chung" có nhãn loại, bấm vào mở đúng trình soạn theo `kind`; Backstage Writer có "Chia sẻ" đưa nháp lên hệ thống như Bảng tính (hỏi xác nhận trước).

### Chữ trên giao diện

Chỉ thêm nhãn bắt buộc (nút, banner xung đột, dòng nhật ký "Lưu văn bản", nhãn loại ở cổng). Không thêm câu hướng dẫn hay tooltip. Tiếng Việt là bản gốc, tiếng Anh theo kiểu có sẵn.

## Kiểm thử (chỉ phần liên quan)

- Migration 74 trên PGlite (các ca ở trên).
- `useSharedDocument`: tự lưu gộp, lưu lỗi mạng thử lại không mất nội dung, 40001 sang `conflict` không ghi đè, nhận thao tác khác khi sạch thì tải bản mới, khi có sửa dở thì `conflict`, người chỉ xem không gửi gì.
- Màn Writer chung: banner xung đột và hai nút, người chỉ xem khóa, tuyến sai loại báo lỗi.
- Cổng và `ActivityPanel` dòng "Lưu văn bản".
- Kiểm tay trên máy thật (không tự động): hai tài khoản mở cùng văn bản. Ghi dữ liệu thật cần người dùng duyệt.

## Rủi ro đã biết

- Lưu cả khối nên văn bản lớn (nhiều ảnh) tải chậm và dễ vượt 5 MB; chấp nhận cho đợt này, đồng bộ từng phần để đợt sau.
- Người mở lâu không gõ gì vẫn thấy bản cũ cho tới khi có thao tác Realtime; mất kết nối Realtime thì chỉ phát hiện khi bấm lưu (40001). Chấp nhận, vì lưu luôn kiểm số thứ tự nên không mất dữ liệu.
- Migration 74 phải áp trước khi deploy mã Writer chung; người dùng tự chạy trong SQL Editor.

## Thứ tự làm

1. Migration 74 + rollback + test PGlite.
2. `collabApi` (kind) + `useSharedDocument` + test.
3. Màn Writer chung (tuyến, thanh tiêu đề, banner, Lịch sử, Nhật ký) + cổng + test.
4. Nhật ký tiến độ, memory; hỏi người dùng trước khi commit/push.
