# CustomerManager Workspace Guidelines

Tài liệu này tổng hợp toàn bộ các quy chuẩn làm việc, phong cách thiết kế và yêu cầu kỹ thuật bắt buộc của dự án CustomerManager.

---

## 0. Bắt Buộc Trước Khi Code (đọc đầu tiên)

- **Trước khi gõ dòng code đầu tiên:** làm đủ checklist và điền mẫu brief trong [truoc-khi-code.md](file:///d:/CustomerManager/.agents/rules/truoc-khi-code.md). Không bỏ qua vì "việc nhỏ".
- **Tài liệu có thể đã trôi khỏi mã nguồn.** Skill và `references/` cập nhật chậm hơn `src/`. Luôn đối chiếu mã nguồn trước khi kết luận về phạm vi hay kiến trúc; mâu thuẫn thì **tin code và sửa tài liệu**.
- **Sau khi xong và đã kiểm chứng:** ghi một mục vào `docs/progress/YYYY-MM.md` theo khuôn tại [docs/progress/README.md](file:///d:/CustomerManager/docs/progress/README.md). Ghi trước khi commit, không để dồn.
- `PROGRESS.md` ở thư mục gốc **đã đóng băng**, nay là `docs/progress/archive-truoc-2026-09.md` — chỉ tra cứu, tuyệt đối không ghi thêm.

---

## 1. Phong Cách Thiết Kế & Trình Bày (Aesthetics & Presentation)

- **Đơn giản, thực dụng, chuẩn mực:**
  - Càng đơn giản, rõ ràng càng tốt. Tuyệt đối **không màu mè lòe loẹt**.
  - Sử dụng bảng màu Grayscale / Slate tối giản chuẩn bảng tính Excel và văn bản nhà nước.
- **Không tự ý thêm chú thích thừa:**
  - Tuyệt đối không tự ý thêm các dòng như "Bằng chữ: ...", ngày lập bảng tùy tiện, các subtitle dài dòng không cần thiết, trừ khi có quy định pháp quy hoặc người dùng yêu cầu.
- **Dòng TỔNG CỘNG:**
  - Bắt buộc là hàng cuối cùng của bảng tính (`<tr><td colspan="...">TỔNG CỘNG</td><td>...</td></tr>`).
  - Cột số tiền phải thẳng hàng dọc 100% với cột Thành tiền. Tuyệt đối không tạo hộp nổi hay bảng rời.
- **Kích thước cột & Tiêu đề:**
  - Phân chia kích thước cột cân đối, hợp lý.
  - Tiêu đề nhóm, tầng, phòng phải ngắn gọn, không để ngắt chữ rớt xuống dòng thứ 2 cụt lủn.

---

## 2. Quy Chuẩn In Ấn, PDF & Xuất Excel

- **Bản in / PDF:**
  - Khổ giấy: A4 dọc chuẩn (`size: A4 portrait; margin: 12mm 15mm;`).
  - Phông chữ: `Times New Roman` hoặc `Arial`.
  - Triệt tiêu hoàn toàn header/footer mặc định của trình duyệt (URL, date, title).
  - Khối chữ ký luôn có `page-break-inside: avoid;` để không bị ngắt trang giữa chữ ký.
- **Xuất Excel (.xlsx):**
  - Định dạng số kế toán chuẩn: `#,##0;(#,##0);"-"`.
  - Thiết lập độ rộng cột `colWidths` đầy đủ để tránh lỗi `###`.
  - Xuất đa sheet tương ứng từng biểu mẫu trong cùng một file workbook.

---

## 3. Quy Chuẩn Kiến Trúc Mã Nguồn (Architecture Principles)

- **Single Responsibility Principle (SRP):** Mỗi component, module, hook chỉ làm một nhiệm vụ duy nhất. Không dồn cục mã nguồn.
- **Separation of Concerns (SoC):** Tách biệt rành mạch giữa 3 tầng:
  - `src/lib/`: Logic & thuật toán thuần túy (Pure functions, Vitest 100%).
  - `src/hooks/`, `src/context/`: Quản lý trạng thái và kết nối.
  - `src/components/`: Giao diện người dùng.
- **Decoupled Business Logic:** Không nhúng công thức tài chính hay phân tích số liệu thô vào trong JSX.

---

## 4. Hệ Thống Rules & Skills Liên Quan

- **Bắt buộc trước khi code (checklist + mẫu brief):** [truoc-khi-code.md](file:///d:/CustomerManager/.agents/rules/truoc-khi-code.md)
- Quy chuẩn kiến trúc SRP/SoC: [architecture-principles.md](file:///d:/CustomerManager/.agents/rules/architecture-principles.md)
- Nhật ký tiến độ theo tháng: [docs/progress/README.md](file:///d:/CustomerManager/docs/progress/README.md)
- Quy chuẩn chi tiết in ấn & bảng biểu: [document-formatting-and-printing.md](file:///d:/CustomerManager/.agents/rules/document-formatting-and-printing.md)
- Kỹ năng định dạng văn bản: [SKILL.md](file:///d:/CustomerManager/.agents/skills/document-formatting/SKILL.md)
- Quy chuẩn lưu trữ Supabase + Cloudflare R2: [dual-storage-supabase-r2.md](file:///d:/CustomerManager/.agents/rules/dual-storage-supabase-r2.md)
- Quy chuẩn nghiệp vụ tín dụng & ngân hàng: [tin-dung SKILL.md](file:///d:/CustomerManager/.agents/skills/tin-dung/SKILL.md)

---

## 5. Quy Chuẩn Đối Chiếu & Chuẩn Hóa Danh Mục ISO (Windows / Windows Server)

- **Ngôn ngữ:** Chỉ lấy bản tiếng Anh (`en-us` / English).
- **Phạm vi loại trừ (Bỏ qua 100%):**
  - Không phải bản cài đặt (Language Pack, SDK, Tools, Symbols, Patches, Checked Builds).
  - Driver Kits (DDK, WDK).
  - Kiến trúc ARM (ARM64, ARM32).
  - Ảnh đĩa ảo dựng sẵn (VHD, VHDX).
  - Bản thử nghiệm / Xem trước (**Preview**, Insider Preview).
  - Bản đánh giá dùng thử trùng lặp (EVAL) khi đã có bản Retail/VLSC chính thức.
  - Các bản đám mây riêng của Azure (**Azure Stack HCI** / `SERVERAZURESTACKHCICOR`, **Azure Edition** / `SERVERDCAZURE`).
- **Chuẩn hóa & Khớp nối dữ liệu:**
  - Tên file có thể sai/nhầm: Bắt buộc đối chiếu mã băm SHA-1 từ tệp NFO và RG-Adguard để lấy tên gốc chuẩn.
  - Kiến trúc ghi rõ ràng (`x64`, `x86`).
  - Đường dẫn Google Drive chuẩn hóa định dạng tải trực tiếp: `https://docs.google.com/uc?export=download&id=...`.

