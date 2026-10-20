**Mục tiêu:** Kho lưu trữ không quay tải vô hạn; khi kết nối treo phải nêu đúng chặng lỗi và tải lại được.
**Phạm vi:** LÀM: đo kết nối thật chỉ đọc, giới hạn chờ danh sách kho/cấp quyền Drive/liệt kê Drive, hủy yêu cầu quá hạn, cho tải lại metadata khi lỗi, giữ danh sách cache khi làm mới lỗi. KHÔNG LÀM: thay quyền, migration, cấu hình Google hoặc dữ liệu kho.
**Tệp dự kiến chạm:** lib/asyncTimeout.ts, lib/api/storageReposApi.ts, lib/drive/driveToken.ts và driveClient.ts, hooks/useArchive.ts; test tương ứng.
**Tầng:** Hạ tầng hủy yêu cầu, hook điều phối trạng thái lỗi; tiện ích async độc lập React.
**Kiểm chứng bằng gì:** Test mô phỏng yêu cầu không trả lời, yêu cầu trả muộn sau timeout, thử lại thành công và giữ cache; browser treo từng chặng rồi kiểm tra lỗi/thử lại. Full test và build.
**Rủi ro đã biết:** Token dùng chung không được kẹt ở Promise cũ sau timeout; tác vụ cũ không được ghi đè tác vụ mới. Không timeout toàn bộ thao tác tải tệp lớn. Chưa có phiên đăng nhập người dùng trong trình duyệt công cụ nên không khẳng định đã đọc được tệp thật.
