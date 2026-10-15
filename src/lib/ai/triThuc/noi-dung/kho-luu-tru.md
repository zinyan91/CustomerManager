---
id: kho-luu-tru
tieuDe: Kho lưu trữ
moTa: Kho tệp Google Drive: tải lên, tệp trùng, bảng truyền tệp, tải về, quyền, cấu hình
nhom: Hệ thống
tuKhoa: [kho lưu trữ, kho, tải lên, tải về, tệp trùng, ghi đè, bảng truyền tệp, thử lại, zip, cấu hình kho]
trang: [/storage, /admin/storage]
nguon: [src/lib/drive/driveDuplicates.ts, src/lib/drive/driveClient.ts, src/lib/transferRows.ts, src/lib/storageRepos.ts, src/hooks/useArchiveUpload.ts, src/components/views/StorageManagementView.tsx, src/components/storage/TransferPanel.tsx, src/components/storage/UploadDuplicateDialog.tsx, src/components/storage/StorageReposSection.tsx]
---
# Kho lưu trữ

Tệp nằm trong Shared Drive trên Google Drive; trình duyệt gửi và nhận trực tiếp với Drive.

## Kho và quyền
- Mỗi người có Kho chung và kho cá nhân của mình, chọn ở cột "Kho". Master Admin thêm kho của người khác, chọn ở ô "Kho của người dùng khác".
- Tải lên: Master Admin mọi kho; người khác ở Kho chung và kho của mình.
- Xóa: Master Admin mọi kho; User Admin ở Kho chung và kho của mình; người dùng thường chỉ ở kho của mình.
- Cần thêm kết nối Drive có quyền ghi.

## Tải lên
Kéo thả tệp hoặc thư mục vào trang, hoặc dùng "Tải lên tệp", "Tải lên thư mục".

## Tệp trùng tên
So tên (không phân biệt hoa thường) với tệp đã có ở đúng thư mục đích rồi hỏi từng tệp:
- Bỏ qua: mặc định khi cùng dung lượng (khả năng cao là cùng tệp).
- Giữ cả hai (tệp mới đổi tên): mặc định khi khác dung lượng.
- Ghi đè: thay nội dung tệp cũ, giữ mã và tên; không chọn sẵn. Không có với tệp Google Docs, Sheets, Slides, chọn thì coi như giữ cả hai.
Có "Áp dụng lựa chọn của tệp đầu tiên cho tất cả", "Hủy tải lên".

## Bảng truyền tệp
Hiện ở đáy trang khi có việc. Tab: Tất cả, Đang chạy, Hoàn tất, Bỏ qua / Lỗi, kèm số lượng. Trạng thái mỗi dòng: Đang chờ, Đang chạy, Hoàn tất, Đã bỏ qua, Lỗi, Đã hủy.
- Hủy: tệp đang chờ (đổi sang "Đã hủy" ngay) hoặc đang tải (dừng ở lần gửi kế tiếp).
- Thử lại: tệp lỗi hoặc đã hủy, khi không có đợt khác đang chạy và còn giữ tệp gốc trong bộ nhớ (tải lại trang thì mất). Tệp ghi đè thử lại vẫn ghi đè.
- Tiến độ theo byte và tốc độ do trình duyệt đo khi gửi tệp lên Drive. "Xóa danh sách đã xong" dọn các dòng đã xong.

## Tải về, xóa
"Tải về" một tệp là tải trực tiếp của trình duyệt, không có trong bảng truyền tệp; thư mục là "Tải về (ZIP)" và có dòng trong bảng. Còn có Đổi tên, Di chuyển. Xóa đưa vào thùng rác Shared Drive, khôi phục được trên Google Drive.

## Cấu hình kho (/admin/storage)
Chỉ Master Admin. "Thêm repo" tạo thư mục mới trong Shared Drive hoặc đăng ký thư mục đã có; Gỡ repo không xóa thư mục trên Drive. "Kiểm tra kết nối Google Drive" báo bước lỗi.

## Chỗ dễ sai
- Ghi đè bằng tệp 0 byte không làm được: báo lỗi "Không ghi được tệp rỗng lên Google Drive" ở riêng tệp đó.
- Sau khi ghi đè chưa có giao diện xem bản cũ; Drive vẫn giữ trong lịch sử phiên bản.
