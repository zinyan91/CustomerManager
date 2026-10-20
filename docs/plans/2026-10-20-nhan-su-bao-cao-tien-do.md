**Mục tiêu:** Admin/Leader chọn nhân sự phụ trách của team khi nhập hồ sơ; bảng tiến độ và báo cáo Team hiển thị nhân sự này.
**Phạm vi:** LÀM: chọn nhân sự theo Team, đổi Team xóa lựa chọn cũ, lưu ID và tên chụp tại lúc gán; server kiểm membership hiện hành; dữ liệu cũ chưa gán giữ nguyên. KHÔNG LÀM: đổi người tạo/OwnerId, tự gán nhân sự cho dòng cũ, đổi quyền nhập hoặc số KPI.
**Tệp dự kiến chạm:** types/loanProgress, lib/loanProgress và API, hook editor/danh sách nhân sự, ProgressEditor/ProgressTable/TeamProgressReport, migration, tests. Tách tải danh sách khỏi UI.
**Tầng:** types dữ liệu; lib validation; API ghi; hooks tải/điều phối; UI; migration kiểm membership và chụp tên.
**Kiểm chứng bằng gì:** test chọn/đổi Team và payload; PostgreSQL test nhân sự cùng team/khác team/lịch sử; DB thật rollback; trình duyệt fixture; npm test/build.
**Rủi ro đã biết:** OwnerId là người tạo, khác nhân sự phụ trách. Không lấy tên người tạo làm nhân sự. Giữ tên đã gán khi thành viên chuyển team; gán mới phải là thành viên hiện hành. Dòng cũ không backfill.
