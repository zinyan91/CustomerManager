# Kho lưu trữ nhiều repo, upload thư mục/kéo thả, Văn thư có sidebar riêng

Ngày: 2026-10-06. Nối tiếp [spec phân quyền](./2026-10-06-phan-quyen-3-cap-design.md). Trạng thái: thiết kế đã trình bày trong hội thoại, người dùng yêu cầu "làm đi".

## Đầu bài (8 mục)

1. Bỏ nhãn quyền; tiêu đề chỉ là "Kho lưu trữ"; bỏ tooltip.
2. Cấu hình repo chỉ hiện với Master Admin.
3. Upload được thư mục và file nén.
4. Master Admin tạo repo gán cho từng user; có một repo chung cho mọi user.
5. Văn thư dùng repo `van-thu-tin-dung`, mọi user đều thấy tệp.
6. Kéo thả.
7. Tăng kích thước Kho lưu trữ lên một bậc.
8. Văn thư có sidebar riêng: Văn bản, Hợp đồng, Công văn, Khác; admin chọn nơi bỏ vào.

## Phát hiện khi đối chiếu

Code ghi lên Hugging Face cũ gửi JSON với khóa `operations` và lệnh `delete`; chuẩn commit của HF (đối chiếu `huggingface.co/.well-known/openapi.md`) nhận NDJSON hoặc JSON với `files`/`deletedEntries`/`lfsFiles`, và tệp lớn phải qua LFS. Phần ghi cũ vì vậy rất có thể chưa từng chạy được. Thay bằng thư viện chính thức `@huggingface/hub` (nạp động, lo LFS, băm sha256, tạo repo).

## Quyết định đã chốt

| Câu hỏi | Quyết định |
| --- | --- |
| Tạo repo | Tạo dataset private thật trên HF bằng một token chung; có tùy chọn đăng ký repo đã có |
| Ai upload vào Văn thư | Chỉ Master Admin và User Admin; user chỉ xem và tải |
| Xóa tệp trong Kho | Admin xóa mọi repo; user chỉ xóa trong kho cá nhân của mình (giả định, không bị phản đối) |
| Mục 7 | Tăng cỡ chữ/icon/khoảng đệm một bậc, không phải dung lượng lưu trữ (giả định) |
| File nén | Lưu nguyên một tệp, không tự giải nén (giả định) |

## Thiết kế

- **Dữ liệu (gộp vào migration 60 chưa áp):** bảng `StorageRepos` (`Kind` = `shared` | `personal` | `dispatch`, `AssignedUserId`); một Kho chung, một repo Văn thư, mỗi tài khoản tối đa một repo cá nhân. RLS: mọi tài khoản đăng nhập thấy `shared` và `dispatch`; repo cá nhân chỉ người được gán và admin thấy; chỉ Master Admin ghi. `Dispatches` thêm `RepoId`, khóa duy nhất `(RepoId, FilePath)`. Token HF vẫn ở `SystemConfig.hf_config`, chỉ còn `{ token, username }`.
- **Lớp ghi HF:** `lib/huggingface/hfWrite.ts` (`uploadItemsToHf` chia lô tối đa 50 tệp hoặc 300 MB mỗi commit, commit hỏng thì thử lại từng tệp để tách đúng tệp lỗi; `deleteFileFromHf`; `createHfDataset`; dịch lỗi HF sang tiếng Việt).
- **Danh sách upload:** `lib/uploadItems.ts` (chọn file, chọn thư mục qua `webkitdirectory`, thả thư mục qua `webkitGetAsEntry` duyệt đệ quy, chặn `..` thoát thư mục đích, bỏ tệp rác và `.git`).
- **Phân quyền theo repo:** `lib/storageRepos.ts` (`reposForStorage`, `canUploadToRepo`, `canDeleteInRepo`, `canManageRepos`). Thêm năng lực `dispatch.upload` vào ma trận.
- **Kho lưu trữ:** chọn repo (Kho chung, Kho của tôi; admin thấy cả kho người khác), tải lên tệp/thư mục, kéo thả, tiến độ và lỗi từng tệp, cỡ chữ tăng một bậc, không nhãn quyền, không `title` tooltip (icon có `aria-label`). Bánh răng cấu hình (token + quản lý repo) chỉ Master Admin.
- **Văn thư:** sidebar 4 mục có đếm số; mục suy từ thư mục con đầu tiên dưới thư mục gốc của repo (`van-ban`, `hop-dong`, `cong-van`, `khac`), không khớp thì suy từ loại văn bản; upload ghi vào `<gốc>/<mục>/<năm>`, admin chọn mục.

## Rủi ro đã biết

- **Phân quyền theo repo chỉ là quy tắc giao diện.** Mọi tài khoản đăng nhập đọc được token chung nên một user có kỹ thuật vẫn ghi/xóa được repo khác bằng chính token đó. RLS chỉ che việc *thấy* repo trong danh sách. Cô lập thật cần token riêng theo repo hoặc proxy ghi qua Edge Function, ngoài phạm vi đợt này.
- Token cần quyền Write và quyền tạo repo; nên dùng fine-grained token.
- Chưa kiểm chứng với Hugging Face thật: toàn bộ test dùng mock `@huggingface/hub`.
- Migration 60 chưa áp lên DB thật và chưa kiểm bằng Postgres thật.

## Brief theo `truoc-khi-code.md`

**Mục tiêu:** Kho lưu trữ gọn, nhiều repo, upload thư mục/kéo thả; Văn thư có sidebar 4 mục và repo riêng.
**Không làm:** token riêng theo repo; proxy Edge Function; tự giải nén file nén; đổi dung lượng lưu trữ; chuyển dữ liệu cũ từ repo đơn sang repo mới.
**Kiểm chứng bằng gì:** `npm test` (203 tệp / 2.686 test), `npm run build`; test giao diện mô phỏng thả tệp gọi `commit` đúng dataset và đường dẫn.
