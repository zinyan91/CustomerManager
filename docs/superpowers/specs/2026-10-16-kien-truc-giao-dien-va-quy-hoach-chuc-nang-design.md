# Kiến Trúc Giao Diện & Quy Hoạch Chức Năng CustomerManager — Thiết Kế

Ngày chốt: 16/10/2026  
Mockup HTML tương tác đi kèm: [`2026-10-16-mockup-kien-truc-giao-dien-moi.html`](./2026-10-16-mockup-kien-truc-giao-dien-moi.html)

---

## 1. Lý Do & Thực Trạng

Chủ dự án phản ánh: **"hiện tại khá là rối khi có quá nhiều chức năng"**.

### Số liệu đo lường kiến trúc hiện tại (16/10/2026)

| Chỉ số đo | Giá trị thực tế | Tác động UX |
| :--- | :--- | :--- |
| Tổng số route & màn hình | **28** màn hình chức năng | Quá tải nhận thức, khó tìm kiếm |
| Số mục trên Sidebar chính | **17** mục xếp dọc liên tiếp | Cuộn mỏi mắt, danh sách phẳng thiếu phân cấp |
| Số thẻ tác vụ trên Hub (`/hub`) | **13** thẻ chia 4 nhóm | Trùng lặp chéo với Sidebar |
| Mục trùng lặp giữa Sidebar & Hub | **7** mục (Giải ngân, BCTC, Biểu mẫu, Báo cáo, Mua sắm, Bán lẻ, Thu mua) | Người dùng bối rối không biết nên bấm vào đâu |
| Ngữ cảnh khách hàng khi chuyển trang | Bị ngắt quãng | Cán bộ phải chọn lại khách hàng khi đổi màn |

### 4 Điểm nghẽn cốt lõi gây rối

1. **Nghịch lý 2 cổng vào (Dual-entry Confusion):** 
   - Vừa có Sidebar 17 mục, vừa có Hub 13 mục. Cùng một nghiệp vụ "Thông tin giải ngân", trên Hub có nút lớn, nhưng trên Sidebar thì nằm ở một vị trí khác hoặc không có biểu tượng tương đương. Người dùng không biết đâu là "menu chính" đâu là "menu phụ".
2. **Liệt kê phẳng, thiếu phân cấp theo quy trình nghiệp vụ:**
   - Nhóm "Hồ sơ" liệt kê phẳng: Khách hàng, HĐTD, Khoản vay, TSBĐ, HĐTC, Thẻ tín dụng, Văn thư, Kho lưu trữ. Thực tế tác nghiệp của cán bộ ngân hàng là một **vòng đời tín dụng khép kín theo trình tự**:
     $$\text{CIF (Khách hàng)} \longrightarrow \text{HĐTD} \longrightarrow \text{TSBĐ \& HĐTC} \longrightarrow \text{KUNN / Giải ngân} \longrightarrow \text{Thẻ} \longrightarrow \text{KSSV}$$
3. **Pha trộn giữa "Nghiệp vụ tín dụng lõi" và "Công cụ phụ trợ":**
   - Các công cụ như Dự toán công trình xây dựng, Bảng kê mua sắm cá nhân, Hóa đơn bán lẻ, Thu mua nông sản... bị đặt xen lẫn vào nhóm Hồ sơ doanh nghiệp và Công cụ tính, làm loãng các màn hình nghiệp vụ ngân hàng cốt lõi.
4. **Các công cụ phân tích tài chính bị phân tán:**
   - Báo cáo tài chính doanh nghiệp nằm ở một nơi; Thẩm định phương án kinh doanh nằm trong Business Plan; Dự phóng TOI nằm ở Hub; Bộ 9 công cụ tính lãi vay nằm trong Calculator; Định giá lãi suất COF nằm riêng.

---

## 2. Giải Pháp: Quy Hoạch 5 Trụ Cột Nghiệp Vụ Cốt Lõi (5 Pillars)

Toàn bộ 28 màn hình được tinh gọn và phân bổ lại một cách logic theo 5 không gian nghiệp vụ độc lập:

```
                            ┌──────────────────────────────────────────────┐
                            │    DASHBOARD: BÀN LÀM VIỆC TỔNG QUAN (HOME)  │
                            │ (Vị trí số 1 trên cùng — Mặc định mở đầu tiên)│
                            │  • 5 Ô KPIs Dư nợ, TSBĐ, Khách hàng, Thẻ tín dụng │
                            │  • Bảng Lịch thu nợ đến hạn (7 ngày / Hôm nay)│
                            │  • Bảng Cảnh báo HĐTD hết hạn cần tái cấp/gia hạn │
                            └──────────────────────┬───────────────────────┘
                                                   │
        ┌──────────────────┬───────────────────────┼───────────────────────┬──────────────────┐
        ▼                  ▼                       ▼                       ▼                  ▼
┌───────────────┐  ┌───────────────┐       ┌───────────────┐       ┌───────────────┐  ┌───────────────┐
│ 1. TÍN DỤNG   │  │ 2. TÀI CHÍNH  │       │ 3. VĂN THƯ    │       │ 4. DỰ TOÁN    │  │ 5. TRA CỨU    │
│ & KHÁCH HÀNG  │  │ & THẨM ĐỊNH   │       │ & KHO HỒ SƠ   │       │ & BÁN LẺ      │  │ & QUẢN TRỊ    │
├───────────────┤  ├───────────────┤       ├───────────────┤       ├───────────────┤  ├───────────────┤
│• Khách hàng   │  │• BCTC (Live AI│       │• Sổ văn thư   │       │• Dự toán thi  │  │• Tra cứu      │
│  (CIF)        │  │• Sao kê ngân  │       │  (đi / đến)   │       │  công XD      │  │  MĐSDV 2026   │
│• HĐTD hạn mức │  │  hàng (đối    │       │• Soạn thảo hợp│       │• Bảng kê mua  │• Biểu phí thẻ    │
│• TSBĐ & HĐTC  │  │  soát chéo)   │       │  đồng & mẫu   │       │  sắm cá nhân  │• Ôn tập nghiệp   │
│• Giải ngân &  │  │• Thẩm định    │       │• Kho lưu trữ  │       │• Hóa đơn bán  │  vụ (Quiz)       │
│  thụ hưởng    │  │  PAKD (TT 39) │       │  Drive / R2   │       │  lẻ hàng hóa  │• Phân quyền      │
│• KUNN & Lịch  │  │• Dự phóng TOI │       │• Báo cáo cùng │       │• Bảng kê thu  │  người dùng      │
│• Thẻ tín dụng │  │• Bộ 9 công cụ │       │  sửa Office   │       │  mua hàng     │• Cài đặt hệ thống│
│• Kiểm soát    │  │  tính lãi/vốn │       │• Báo cáo tổng │       │• Quản lý tồn  │                  │
│  sau vay KSSV │  │• Chào lãi COF │       │  hợp trung tâm│       │  kho & VT     │                  │
└───────────────┘  └───────────────┘       └───────────────┘       └───────────────┘  └───────────────┘
```

---

## 3. Hai Phương Án Trình Bày Bố Cục (Layout Architecture)

File mockup HTML tương tác tại [`2026-10-16-mockup-kien-truc-giao-dien-moi.html`](./2026-10-16-mockup-kien-truc-giao-dien-moi.html) hiện thực hóa 2 phương án bố cục để xem xét trực tiếp:

### Phương án 1: Primary Rail + Contextual Drawer (Khuyên Dùng ⭐)
- **Primary Rail (68px siêu tinh gọn bên trái):**
  - **Vị trí số 1 trên cùng:** Nút **Dashboard** nổi bật với viền phân cách riêng. Đây là Bàn làm việc trung tâm mở mặc định mỗi khi cán bộ truy cập hệ thống.
  - Tiếp theo là **5 biểu tượng trụ cột nghiệp vụ** (Tín dụng, Tài chính, Văn thư, Dự toán, Tra cứu).
  - Đáy Rail là nút Cài đặt & Phân quyền hệ thống.
  - Loại bỏ hoàn toàn cảm giác choáng ngợp khi mở ứng dụng.
- **Contextual Drawer (Thanh phụ 240px có thể thu gọn):**
  - Khi ở Dashboard: Drawer liệt kê ngay các chỉ số theo dõi (Bảng tin KPIs, Lịch thu nợ, Cảnh báo HĐTD, Cơ cấu danh mục) cùng lối tắt tạo mới nhanh (`+ Thêm KH mới`, `+ Lập khế ước`, `+ Phân tích BCTC`).
  - Khi người dùng bấm vào 1 trong 5 trụ cột trên Rail: Drawer mở ra **4–6 chức năng con** thuộc đúng phân hệ đó.
  - Có thể bấm nút ghim/thu gọn (`Collapse`) để mở rộng 100% diện tích màn hình cho bảng tính Excel hoặc báo cáo tài chính.
- **Customer Context Capsule:**
  - Viên nhãn định danh khách hàng (`CIF: 28489102 - Cty Thép Nam Hà`) luôn cố định trên header khi vào từng hồ sơ tín dụng, giúp cán bộ chuyển đổi giữa HĐTD, TSBĐ, KUNN hay BCTC của cùng một khách hàng mà không bị mất dấu.

### Phương án 2: Top Workspace Tabs (Kiểu Core Banking Hiện Đại)
- **Top Workspace Bar:**
  - **Tab số 1 đầu tiên:** **📊 Dashboard Tổng Quan** luôn nằm ở vị trí trung tâm trên thanh điều hướng đỉnh.
  - 5 phân hệ lớn được xếp thành các tab ngang tiếp theo.
  - Sidebar bên trái đóng vai trò là cây danh mục con của phân hệ đang chọn.
- **Ưu điểm:** Tương thích cao với cán bộ quen dùng các hệ thống ngân hàng truyền thống (T24, Flexcube, Core BPM).

---

## 4. Bảng So Sánh Chi Tiết Trước vs Sau

| Tiêu chí | Trước khi quy hoạch (Cũ) | Sau khi quy hoạch (Đề xuất) | Lợi ích mang lại |
| :--- | :--- | :--- | :--- |
| **Số lượng mục nhìn thấy cùng lúc** | 17 mục Sidebar + 13 thẻ Hub = **30 mục** | **5 biểu tượng nhóm lớn** trên Rail | Giảm **75%** tải nhận thức cho mắt |
| **Quy trình cấp tín dụng** | Các màn hình nằm rải rác phẳng | **Credit Lifecycle Stepper** liên hoàn (CIF → HĐTD → TSBĐ → KUNN → KSSV) | Liền mạch theo đúng hồ sơ khoản vay |
| **Báo cáo tài chính & Thẩm định** | Phân tán giữa Tools, Business Plan, Calculator và Hub | Tập trung thành trụ cột **Phân Tích & Thẩm Định** | Hỗ trợ phân tích chuyên sâu TT 39 & BCTC AI |
| **Nhóm Mua sắm & Dự toán** | Nằm lẫn trong Tồn kho và Công cụ tính | Tách thành phân hệ **Dự Toán Thi Công & Bán Lẻ** | Phù hợp đúng đối tượng khách hàng cá nhân/XD |
| **Trang Hub** | Menu song song gây tranh chấp với Sidebar | Biến thành **Trung Tâm Tìm Kiếm & Lối Tắt Nhanh (Quick Launch)** | Triệt tiêu xung đột 2 cổng vào |

---

## 5. Kế Hoạch Chuyển Đổi An Toàn (Zero Breaking Changes)

1. **Bảo toàn URL 100%:** Toàn bộ các đường dẫn `/customers`, `/credit-contracts`, `/tools/corporate-financial`, `/office`... giữ nguyên vẹn; không làm hỏng bookmark hay liên kết chia sẻ.
2. **Bảo toàn phân quyền Module (Migration 65):** Bảng `UserModules` và các cờ `credit, rates, dispatch, storage, inventory, quiz, tools` ánh xạ 1:1 sang 5 trụ cột mới một cách tự nhiên.
3. **Thực thi giao diện:** Thay thế bố cục thanh bên `Sidebar.tsx` và thanh tiêu đề `Header.tsx` sang mô hình `PrimaryRail` + `ContextualDrawer`, giữ nguyên nội dung bên trong của từng màn hình con.
