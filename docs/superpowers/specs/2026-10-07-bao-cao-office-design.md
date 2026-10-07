# Tab Báo cáo: bảng tính và soạn văn bản như Excel/Word, mở toàn màn hình

Ngày: 07/10/2026. Trạng thái: chờ duyệt.

## Mục tiêu

Một tab "Báo cáo" trong CustomerManager mở ra **trang trống toàn màn hình, không sidebar**, trong đó cán bộ làm việc với hai loại tệp:
- **Bảng tính** (.xlsx) với giao diện như Excel: ribbon, thanh công thức, lưới ô, tab trang tính, công thức, định dạng, lọc, định dạng có điều kiện, biểu đồ.
- **Văn bản** (.docx) với giao diện như Word: ribbon, trang giấy, định dạng đoạn, bảng, ảnh, mục lục, tìm và thay thế.

Nguồn tham khảo là `D:\Felix Platform\felix-office` (Felix Calc và Felix Writer), **không** lấy Presenter (PowerPoint).

## Đã chốt với người dùng

- Sao chép mã Calc và Writer vào CustomerManager (không nhúng iframe, không viết bản gọn mới).
- Tài liệu: bản nháp tự lưu trên máy (IndexedDB) và tải về .xlsx/.docx; **lưu lên Kho lưu trữ** khi cần chia sẻ. Tệp đi thẳng từ trình duyệt tới Hugging Face, không qua Vercel hay Supabase.

## Quy mô của bản gốc (đo trong `felix-office`)

| Phần | Dòng mã | Ghi chú |
|---|---|---|
| `src/calc` | ~8.700 | engine công thức, lưới, ribbon, biểu đồ, nhập/xuất .xlsx |
| `src/writer` | ~4.200 | Tiptap, phân trang, nhập/xuất .docx |
| `src/shared` | ~1.200 | ribbon, kho nháp IndexedDB, lưu và in tệp; có phần riêng cho ứng dụng Windows (Tauri) |
| `src/i18n` | | từ điển riêng của Office (vi/en, Calc, Writer) |
| `src/styles` | ~3.000 | token màu và CSS toàn cục, `calc.css` 748 dòng, `writer.css` 743 dòng |

Thư viện thêm vào CustomerManager: `@tiptap/*` (13 gói), `docx`, `mammoth`, `jszip`, `exceljs`, `@fontsource/noto-sans`. Tất cả tải lười, chỉ khi mở tab Báo cáo, nên gói chính không nặng thêm.

## Phạm vi

LÀM:
- Cổng vào `/office`: hai lối "Bảng tính" và "Văn bản", danh sách nháp gần đây, mở tệp từ máy.
- `/office/calc/:draftId` và `/office/writer/:draftId` trong một khung trống riêng (`OfficeLayout`): kiểm tra đăng nhập, không sidebar, có nút "Về ứng dụng".
- Lưu nháp tự động, tải về .xlsx/.docx, in (Writer, "Lưu thành PDF" qua in).
- Lưu lên Kho lưu trữ và mở từ Kho lưu trữ (giai đoạn 3).
- Mục "Báo cáo" ở thanh bên, Hub không đổi.

KHÔNG LÀM:
- Presenter (trình chiếu), ứng dụng Windows (Tauri), cập nhật tự động, PWA riêng, chuyển giao tệp từ Felix PDF.
- Đồng soạn thảo nhiều người cùng lúc.
- Tự đổ dữ liệu khách hàng, khoản vay vào bảng tính (có thể là việc sau, cần yêu cầu riêng).
- Sửa hay đổi tên mục Hub "Trung Tâm Báo Cáo Excel" (xuất báo cáo từ dữ liệu CRM) đang có.

## Thiết kế

**Vị trí mã.** Một thư mục `src/office/` tách hẳn phần còn lại của ứng dụng, giữ nguyên cấu trúc của bản gốc (`calc/`, `writer/`, `shared/`, `i18n/`, `styles/`). Chỉ có hai điểm chạm vào ứng dụng: `OfficeLayout` + hai tuyến trong `App.tsx`, và một mục trong `navigation.ts`. Quy ước SRP/SoC của bản gốc đã khớp với CustomerManager (logic thuần ở `utils/`, `engine/`, `services/`; Tiptap chỉ nằm trong `writer/editor/`).

**Tên màn và tuyến.** Id màn hình mới `office`, đường dẫn `/office`, nhãn "Báo cáo". Không dùng id `reports` vì đã là màn "Trung Tâm Báo Cáo Excel" của Hub.

**Khung toàn màn hình.** `OfficeLayout` đặt ngoài `AppLayout` (như `AdminLayout`): chờ đăng nhập, không sidebar, không Header của ứng dụng; mỗi màn Calc/Writer tự có thanh tiêu đề của nó với nút "Về ứng dụng".

**Module.** Tab Báo cáo thuộc module `tools` hiện có (chỉ ẩn ở giao diện, vì tệp nháp nằm trên máy, không có bảng dữ liệu để chặn). Không cần migration. Muốn tắt riêng tab này cho từng tài khoản thì thêm module `office` bằng migration 67 (đổi CHECK của `UserModules`); chỉ làm khi bạn yêu cầu. Việc lưu lên Kho vẫn đi theo quyền Kho lưu trữ hiện có (`storage.upload`, token Hugging Face).

**CSS.** Bản gốc dùng CSS toàn cục (`:root` định nghĩa `--n-*`, `--font-sans`, `base.css` đặt lại kiểu) và sẽ đè lên Tailwind của CustomerManager. Cách xử lý: bọc mọi thứ trong một lớp gốc `.felix-office`, chuyển các khai báo `:root` thành `.felix-office`, bỏ `base.css` toàn cục, và chỉ nạp CSS khi tải khối Office (nhập CSS trong chính tệp màn hình tải lười). Chế độ tối dùng `:root[data-theme='dark']` của CustomerManager nên cần nối với cơ chế giao diện sáng/tối đang có, không giữ bộ chuyển riêng của bản gốc.

**Ngôn ngữ.** Từ điển của Office giữ nguyên thành module riêng; hook `useOfficeI18n` đọc ngôn ngữ từ `LanguageContext` của CustomerManager thay vì khóa `felix-lang`.

**Tệp, lưu và in.** `shared/files.ts` của bản gốc có nhánh Windows qua Tauri; bản đưa vào chỉ giữ nhánh web (tải xuống bằng trình duyệt, in bằng iframe). Không đưa `desktop.ts` và `@tauri-apps/*` vào.

**Nháp.** Giữ nguyên `idbStore` và kho nháp (`felix-office-calc`, `felix-office-writer`): nháp ở trong trình duyệt của từng người, không rời máy trừ khi bấm lưu lên Kho. Nháp gắn với trình duyệt chứ không gắn với tài khoản; đổi tài khoản trên cùng trình duyệt sẽ thấy cùng danh sách nháp. Cần nói rõ điều này khi bàn giao.

**Lưu lên Kho lưu trữ (giai đoạn 3).** Nút "Lưu vào Kho" mở hộp chọn kho và thư mục (kho chung, kho cá nhân theo quyền hiện có), xuất tệp .xlsx/.docx rồi gửi bằng `uploadItemsToHf` đã có. "Mở từ Kho" chọn tệp .xlsx/.docx trong kho, tải bằng `fetchHfFileBlob` rồi mở trong trình soạn. Dùng lại `useArchive` và danh sách kho hiện có, không thêm bảng dữ liệu.

## Các giai đoạn (mỗi giai đoạn dùng được và kiểm chứng riêng)

1. **Khung và Bảng tính.** `OfficeLayout`, cổng `/office`, Calc đầy đủ, nháp, tải .xlsx, mục thanh bên. Mang theo các test của bản gốc cho phần Calc (`calc*`, `xlfn`).
2. **Văn bản.** Writer đầy đủ, nháp, tải .docx, in. Mang theo test Writer (`writerUtils`, `docx*`).
3. **Kho lưu trữ.** Lưu vào Kho và mở từ Kho.

## Kiểm chứng

- Mang theo và chạy các test của bản gốc cho phần được đưa vào (engine công thức, xuất nhập .xlsx và .docx, tiện ích Writer); thêm test cho `OfficeLayout` và chốt chặn tuyến.
- `npx tsc -b`, `npm test`, `npm run build`, lint phải xanh; đo kích thước gói chính trước và sau để chứng minh khối Office không làm nặng gói chính.
- Mở thật trong trình duyệt: tạo bảng tính có công thức, lưu nháp, tải lại trang, tải .xlsx rồi mở bằng Excel; soạn văn bản có bảng, tải .docx rồi mở bằng Word; kiểm tra giao diện sáng và tối, và kiểm tra các màn khác của ứng dụng không đổi kiểu (CSS không rò).

## Rủi ro

- **CSS rò hoặc bị đè** giữa Office và Tailwind: giảm bằng lớp gốc `.felix-office` và kiểm bằng mắt các màn chính sau khi tích hợp.
- **Khác phiên bản công cụ**: bản gốc dùng TypeScript 6, Vitest 5, Vite 8, còn CustomerManager dùng Vitest 4. Mã được đưa vào phải biên dịch và chạy test trên bộ công cụ của CustomerManager; nếu lệch, sửa mã đưa vào chứ không đổi bộ công cụ.
- **Nháp theo trình duyệt chứ không theo tài khoản**: nói rõ ở trên; đổi sang nháp theo tài khoản là việc khác (cần bảng dữ liệu).
- **Dung lượng**: thêm khoảng 20 gói thư viện và vài nghìn dòng mã; chỉ tải khi mở tab Báo cáo.
- **Khối lượng lớn**: khoảng 13.000 dòng mã đưa vào, chia ba giai đoạn để mỗi bước kiểm chứng được.
