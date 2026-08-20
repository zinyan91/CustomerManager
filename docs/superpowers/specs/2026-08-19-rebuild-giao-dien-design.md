# Rebuild giao diện CustomerManager — thiết kế

Ngày chốt: 19/08/2026

## 1. Lý do

Chủ dự án nêu hai lý do: giao diện **nhìn cũ và thiếu nhất quán**, và **dùng chậm, thao tác nhiều**. Không phải vì luồng làm việc sai — cách sắp xếp màn hình giữ nguyên — cũng không phải vì khó bảo trì.

Rà soát mã nguồn ngày 19/08/2026 đo được:

| Chỉ số | Giá trị |
| :--- | :--- |
| Màn hình | 19, điều hướng bằng chuỗi `activeTab ===` trong `App.tsx` |
| Định tuyến URL | không có |
| Lần dùng cỡ chữ ≤12px | 1.066 / 1.229 (**87%**) |
| Biến thể bo góc | 7 |
| Tệp có modal tự dựng | 15 — số cái có `role="dialog"` hoặc bẫy tiêu điểm: **0** |
| Tệp dùng `window.confirm` | 13 |
| Tệp truyền chuỗi class qua props | **69** |
| `BTN_PRIMARY` / nút accent tự dựng | 8 tệp / 37 lần |
| `PANEL` / `bg-panel border border-line` tự dựng | 10 tệp / 16 lần |
| Props `KunnForm` nhận | 65 |
| Phụ thuộc cài mà không dùng | `recharts`, `clsx`, `tailwind-merge` |

Hai vấn đề nặng nhất không sửa được ở từng màn riêng lẻ:

**Không có URL.** F5 là mất chỗ đang làm, không gửi được link cho đồng nghiệp, nút Back thoát khỏi ứng dụng, không mở hai hồ sơ ở hai tab.

**Bốn cách chọn khách hàng khác nhau.** `CustomerListView` dùng ba ô lọc; `LoanPortfolioView` dùng thanh tìm có dropdown cộng ba ô; `CreditContractView` dùng một `<select>` liệt kê toàn bộ danh sách; `CollateralView` lại ba ô lọc riêng. `WorkContext` có `selectedCustomerId` nhưng mỗi màn hiểu một kiểu.

### Tài liệu đã lệch khỏi mã

`CONVENTIONS.md` §15 mô tả một hệ thống thiết kế tốt, nhưng mã nguồn chưa theo, và bản thân tài liệu cũng ghi sai giá trị:

| §15 ghi | Thực tế |
| :--- | :--- |
| "không truyền chuỗi class qua props nữa" | 69 tệp vẫn truyền |
| `RADIUS_PANEL` = `rounded-lg`, `RADIUS_CONTROL` = `rounded-md` | `uiClasses.ts` để `rounded-xl` / `rounded-lg` |
| "Chỉ hai bán kính, không có bán kính thứ ba" | 7 bán kính |
| "mỗi màn chỉ một nút chính" | Tổng quan có 1 nút chính + 2 nút lọc + 4 nút tab đều nền accent |
| "Chữ in hoa chỉ dùng cho nhãn 10–11px" | tiêu đề màn in hoa ở hầu hết các màn |
| §17 "739 test" | 1.621 test |

Sửa tài liệu cho khớp là một phần bắt buộc của rebuild, không phải việc phụ. Để nguyên thì sau đợt này lại lệch tiếp.

## 2. Phạm vi

**Trong phạm vi:** toàn bộ tầng trình bày — `src/components/`, `src/index.css`, `src/lib/uiClasses.ts`, `src/App.tsx`, `src/main.tsx`, và phần điều hướng trong `src/context/`.

**Ngoài phạm vi:** `src/lib/` (logic tài chính, định dạng, gọi API) và `src/hooks/` (trạng thái nghiệp vụ). 1.621 test hiện có bảo vệ vùng này. Hook chỉ đổi khi cần cắt phụ thuộc vào chuỗi class hoặc vào `selectedCustomerId` của `WorkContext`.

**Không làm trong đợt này:** tối ưu truy vấn Tổng quan (xem §10).

## 3. Quyết định đã chốt

| Quyết định | Lựa chọn |
| :--- | :--- |
| Hướng diện mạo | **Bảng điều khiển** — vỏ thẻ, bo góc, đổ bóng nhẹ, số lớn, thoáng |
| Chính sách màu | **Rộng rãi** — giữ 5 sắc KPI, số tiền và ngày tháng có màu, viên trạng thái nền đặc |
| Khung điều hướng | **Thanh ngữ cảnh khách hàng** + URL thật |
| Định danh trên URL | **`Id` số**, không dùng CIF |
| Nền component | **Radix UI primitives** (headless) |
| Cách triển khai | **Theo đợt**, mỗi đợt merge được, app luôn chạy |
| Ba màn tồn kho | **Gộp** — sidebar còn 17 mục |

Lựa chọn "màu rộng rãi" **thay thế** quy tắc "màu chỉ được mang nghĩa" đang ghi ở §15. Đây là quyết định có ý thức, không phải bỏ sót; §15 phải được viết lại cho khớp ở đợt 0.

## 4. Nền tảng thị giác

### 4.1 Thang chữ

`index.css` hiện ghi đè **chính lớp tiện dụng của Tailwind** (`.text-xs`, `.text-sm`, `.font-mono`) để tính năng chỉnh cỡ chữ ăn được. Hệ quả: `text-xs` không còn nghĩa cố định, và `.num-lead` phải khai sau `.font-mono` vì cùng độ đặc hiệu nên thua theo thứ tự nguồn.

Thay bằng thang ngữ nghĩa khai một chỗ:

| Token | Mặc định | Dùng cho |
| :--- | ---: | :--- |
| `--fs-label` | 11px | nhãn cột, nhãn KPI, chú thích |
| `--fs-dense` | 12px | ô bảng dày: lịch trả nợ 120 kỳ, ma trận COF |
| `--fs-body` | 13px | ô bảng thường, chữ thân, ô nhập |
| `--fs-title` | 15px | tiêu đề thẻ |
| `--fs-screen` | 18px | tiêu đề màn |
| `--fs-num` | 24px | số trên thẻ KPI |

Số KPI để **một cỡ cố định 24px**, bỏ kiểu phóng to theo bề rộng màn (`text-2xl xl:text-3xl`) mà `KpiCard` đang dùng — cùng một con số không nên đổi cỡ khi người dùng kéo rộng cửa sổ.

Cỡ chữ bảng lên **13px** từ 12px. `.num-lead` bỏ.

Tính năng chỉnh cỡ chữ trong Cài đặt giữ nguyên **bốn nhóm điều chỉnh như hiện tại** — tiêu đề, bảng, chữ nhỏ, số — nhưng mỗi nhóm nay trỏ vào token thay vì ghi đè lớp Tailwind:

| Nhóm trong Cài đặt | Điều khiển token |
| :--- | :--- |
| Tiêu đề | `--fs-screen`, `--fs-title` |
| Bảng | `--fs-body`, `--fs-dense` |
| Chữ nhỏ | `--fs-label` |
| Số | `--fs-num` |

### 4.2 Bo góc — ba, không phải bảy

`--r-panel` 12px (thẻ, bảng, hộp thoại) · `--r-control` 8px (nút, ô nhập, tab) · `--r-pill` 999px (viên trạng thái).

Ba chứ không phải hai như §15 đang ghi: hướng bảng điều khiển cần viên bo tròn cho trạng thái.

### 4.3 Chính sách màu

| Vị trí | Màu |
| :--- | :--- |
| Năm ô KPI | năm sắc định danh: `accent` · `kpi-cust` · `kpi-collateral` · `kpi-card` · `neg` |
| Số tiền trong bảng | `pos` |
| Ngày tháng trong bảng | `accent` |
| Trạng thái, hạn còn lại | viên nền `pos-soft` / `warn-soft` / `neg-soft`; quá hạn dùng `bg-neg` + `text-surface` |
| Tiêu đề, nhãn, khung | trung tính — không tô |

Dòng cuối là điểm duy nhất siết lại so với hiện tại: bỏ kiểu tiêu đề panel tô màu tuỳ hứng, ví dụ `DƯ NỢ THEO PHƯƠNG THỨC VAY` xanh dương đặt cạnh `PHÂN BỔ DƯ NỢ THEO NHÓM NỢ` xanh lá.

Nền đặc của trạng thái đi kèm `text-surface` chứ không `text-white` — giữ nguyên quy tắc cũ, vì ở giao diện tối nền đỏ sáng với chữ trắng chỉ đạt tương phản 2,71.

### 4.4 Tương phản phải đo lại

§15 ghi mức thấp nhất hiện tại là 5,09. Tô số tiền bằng `pos` và ngày tháng bằng `accent` trên nền `panel` là những cặp **chưa từng đo**. Đo cả hai giao diện bằng công cụ trước khi chốt token; hụt thì chỉnh giá trị `--t-*`, không ước lượng bằng mắt. Chữ 11–13px không có chỗ để hụt tương phản.

### 4.5 Chữ in hoa

Giữ nguyên quy ước đã ghi: chỉ nhãn từ 11px trở xuống mới in hoa. Tiêu đề màn chuyển về chữ thường. Đây là thay đổi trông thấy rõ nhất trên mọi màn.

### 4.6 Bỏ đi

`src/App.css` — 185 dòng rác template Vite (`.hero`, `#next-steps`, logo Vite), không được import ở đâu.

`clsx` và `tailwind-merge` — cài nhưng không dùng ở bất kỳ tệp nào.

Lệch phiên bản: `Sidebar` ghi `2.4.0`, `LoginView` ghi `v2.5.0 Stable`. Gom về một nguồn duy nhất.

`recharts` **giữ lại và bắt đầu dùng**: `DashboardPortfolioStructure` và `KunnAccordionItem` đang tự dựng biểu đồ tỷ trọng bằng `div`, chuyển sang nó.

## 5. Bộ component dùng chung

**Ba gói Radix**, không hơn: `dialog`, `popover`, `tabs`. Chỉ lấy hành vi — bẫy tiêu điểm, phím Escape, thuộc tính ARIA, điều hướng bàn phím. Diện mạo tự tô bằng lớp token `--t-*` đã có.

Ba gói này chọn vì có nhu cầu đo được: 15 modal không bẫy tiêu điểm cần `dialog`; `CustomerPicker` cần khung nổi định vị đúng và tự đóng, tức `popover`; khoảng tám thanh tab tự dựng thiếu điều hướng phím mũi tên cần `tabs`.

**Không** cài `select`, `checkbox`, `tooltip`, `slider`: thẻ HTML gốc (`<select>`, `<input type="checkbox">`, `<input type="range">`, thuộc tính `title`) đã đúng về tiếp cận và đang chạy tốt. Thêm gói cho chúng là thêm phụ thuộc không đổi lấy gì. Gói mới chỉ cài khi gặp nhu cầu thật, ghi rõ lý do trong lần sửa đó.

| Component | Thay cho |
| :--- | :--- |
| `Panel`, `PanelHeader` | 16 lần `bg-panel border border-line` tự dựng + `UI.containerCardBg` truyền qua props |
| `KpiCard` | bốn hình dạng thẻ KPI đang tồn tại song song (Tổng quan, TSĐB, PAKD/Ôn tập, Kiểm soát sau vay) |
| `DataTable` | `AdaptiveTable` — **giữ nguyên cơ chế `priority` 1/2/3 và điểm ngắt `md`**, thêm sắp xếp và khoá cột đầu khi cuộn |
| `Dialog` | 15 modal tự dựng. Biến thể `side` trượt từ mép phải dùng cho biểu mẫu dài (hồ sơ khách hàng, KUNN) — vẫn là `Dialog`, chỉ khác cách tô, không phải component riêng |
| `ConfirmDialog` | 13 tệp dùng `window.confirm`, gồm xoá khách hàng, xoá HĐTD, đăng xuất |
| `Button` | 37 nút accent tự dựng |
| `Field` | nhãn + ô nhập + **lỗi hiện ngay dưới ô gây ra nó** |
| `CustomerPicker` | bốn kiểu chọn khách khác nhau |
| `Tabs`, `StatusPill` | khoảng tám thanh tab tự dựng và các viên trạng thái rải rác |
| `LoadingState`, `EmptyState`, `ErrorState` | năm kiểu hiển thị đang tải khác nhau |
| `Toast` | giữ nguyên — đã đúng, một đường duy nhất |

**Luật cứng: component không nhận chuỗi class qua props.** Quy ước này §15 đã ghi từ trước nhưng 69 tệp vẫn vi phạm. Xoá `containerCardBg`, `sectionBoxBg`, `inputStyle`, `readonlyInputStyle`, `labelStyle`, `tableHeaderStyle`, `styles`, `cardBg` khỏi mọi chữ ký hàm. Component đọc token trực tiếp.

Riêng `KunnForm` hiện nhận 65 props; sáu trong đó chỉ là chuỗi class.

Hai chỗ **cố ý giữ bảng cuộn ngang**, không chuyển sang thẻ dọc: lịch trả nợ ở Công cụ tính toán (lưới 120 kỳ để so sánh dọc) và bảng lãi suất ở Mua bán vốn nội bộ (ma trận hai chiều). Quy tắc này §15 đã chốt, rebuild không đổi.

## 6. Khung ứng dụng

### 6.1 Định tuyến

`react-router` v7. Đường dẫn dùng `Id` số của khách hàng, không dùng CIF: CIF là định danh khách hàng thật và sẽ nằm trong lịch sử trình duyệt, log máy chủ, cùng mọi link dán vào tin nhắn. `Id` là khoá chính nội bộ, dẫn đường đủ tốt mà không phơi định danh ra ngoài.

Chủ dự án chốt ngày 20/08/2026: đường dẫn viết **tiếng Anh**, không phải tiếng Việt như bảng cũ dưới đây từng ghi — tránh rắc rối mã hoá và công cụ (dấu, khoảng trắng URL-encode, không gõ được trên một số bàn phím). Bảng dưới là bảng thật đang chạy sau đợt 1a, khớp `src/lib/routes.ts`:

```
/dashboard
/customers
/credit-contracts                      (đợt 1b lồng vào /customers/:id/credit-contracts)
/loans                                 (đợt 1b lồng vào /customers/:id/loans)
/collaterals                           (đợt 1b lồng vào /customers/:id/collaterals)
/credit-cards                          (đợt 1b lồng vào /customers/:id/credit-cards)
/post-loan-control                     (đợt 1b lồng vào /customers/:id/post-loan-control)
/tools/calculators
/tools/business-plan
/tools/inventory
/tools/purchase-statement              (đợt 1b gộp vào /tools/inventory theo §6.5)
/tools/retail-invoice                  (đợt 1b gộp vào /tools/inventory theo §6.5)
/tools/rate-quote
/tools/cost-of-funds
/reference/loan-purpose
/reference/card-policies
/reference/templates
/reference/quiz
/settings
```

Hiện trạng đợt 1a: sáu màn hồ sơ khách hàng (HĐTD, Khoản vay, TSĐB, Thẻ tín dụng, Kiểm soát sau vay — cộng bản thân `/customers`) **đang** dùng đường dẫn phẳng, không có tiền tố `:id`; `selectedCustomerId` vẫn còn trong `WorkContext`. Đợt 1b mới lồng năm màn còn lại vào `/customers/:id/...` (kèm `/customers/:id/profile` và `/customers/:id/loans/:kunnId/schedule` như thiết kế) và xoá `selectedCustomerId` như §6.2 mô tả. `/tools/calculators` cũng chưa nhận tham số `:tool` trên URL — `CalculatorView` tự quản lý lựa chọn công cụ bằng state nội bộ.

### 6.2 Thanh ngữ cảnh khách hàng

Hiện khi URL có `:id`, dùng chung cho sáu màn hồ sơ. Nội dung: tên, CIF, điện thoại, dư nợ, hạn mức khả dụng, nhóm nợ, nút đổi khách hàng.

Điểm quan trọng nằm ở nguồn dữ liệu: **`selectedCustomerId` bị xoá khỏi `WorkContext`; URL trở thành nguồn sự thật duy nhất.** Một hook `useSelectedCustomer()` đọc `:id`. Bốn kiểu chọn khách gộp thành một chỗ đổi khách duy nhất.

`disburseRequest` trong `WorkContext` cũng bỏ, thay bằng điều hướng URL kèm tham số.

### 6.3 Header thôi ping cơ sở dữ liệu

`Header` hiện chạy `supabase.from('Customers').select('Id').limit(1)` **mỗi 30 giây, ở mọi màn, suốt phiên làm việc**, chỉ để hiện chấm "Trực tuyến". Thay bằng `navigator.onLine` cộng cờ lỗi từ lần gọi API thật gần nhất — không tốn truy vấn nào.

Đợt 1a **mới làm nửa đầu**: bỏ được vòng lặp truy vấn 30 giây, `Header` giờ chỉ đọc `navigator.onLine`. Nửa sau — cờ lỗi từ lần gọi API thật gần nhất — **chưa làm**. Hệ quả: chấm vẫn hiện "Trực tuyến" (xanh) khi máy có mạng nhưng Supabase không với tới được (dự án tạm ngưng, RLS chặn, hết phiên...) — `navigator.onLine` chỉ biết máy có kết nối mạng, không biết API có trả lời hay không. Việc gắn cờ lỗi từ lần gọi API thật gần nhất là của đợt 1b.

### 6.4 Danh sách màn gom về một chỗ

Danh sách 19 màn hiện khai ở ba nơi: `Sidebar`, `CommandPalette`, `App`. Rút về `src/lib/navigation.ts`; Sidebar, CommandPalette và router cùng đọc từ đó. Thêm màn chỉ sửa một chỗ, và kiểu dữ liệu ràng buộc được thay vì chuỗi tự do.

### 6.5 Gộp ba màn tồn kho

`PurchaseStatementView` và `RetailInvoiceView` mỗi cái chỉ là vỏ 16 dòng bọc một tab của Hàng tồn kho — ba dòng menu cho một phân hệ. Gộp thành `/cong-cu/hang-ton-kho` có tab con. Sidebar còn 17 mục.

## 7. Trạng thái và thông báo

`LoadingState`, `EmptyState`, `ErrorState` thay năm kiểu đang dùng song song. `ErrorBoundary` đặt theo từng route thay vì một cái bọc tất cả.

### 7.1 Bỏ note giải thích trong giao diện

Nhãn cộng số liệu là đủ; dòng phụ diễn giải lại là nhiễu. Các chỗ đã xác định:

- `CustomerListView` — `Bấm nút "Chỉnh sửa" để cập nhật thông tin`
- `CalculatorView` — `Chọn phân nhóm công cụ nghiệp vụ để tính toán`
- `SettingsView` — `Tùy biến giao diện làm việc và quy chuẩn định dạng số liệu cá nhân hóa`
- `CreditContractView` — đoạn văn hai dòng ở trạng thái chưa chọn khách
- `MdsdvLookupView` — thẻ hướng dẫn ở cuối màn
- `PostLoanControlView` — banner mô tả nghiệp vụ ở đầu màn

### 7.2 Cảnh báo hiện tại chỗ

Cảnh báo đặt ngay dưới trường gây ra nó, không gom vào hộp riêng trên biểu mẫu. `Field` có sẵn chỗ cho việc này. Áp cho: vượt hạn mức ở `KunnForm`, vượt khả năng bảo đảm ở `CreditContractFormModal`, LTV ở `CollateralForm`.

## 8. Tám đợt

Mỗi đợt merge được và app chạy được sau mỗi đợt.

| Đợt | Nội dung | Rủi ro |
| :--- | :--- | :--- |
| **0** | Token, thang chữ, bo góc, `navigation.ts`, dọn `App.css` + `clsx` + `tailwind-merge`, viết lại §15 và §17. Không đổi màn nào | thấp |
| **1** | `react-router`, thanh ngữ cảnh khách hàng, Header, Sidebar, CommandPalette. Màn cũ chạy nguyên trạng bên trong khung mới | trung bình |
| **2** | Bộ component + `Dialog` / `ConfirmDialog`: thay 15 modal và 13 tệp `window.confirm` | trung bình, chạm nhiều tệp nhưng cơ học |
| **3** | Nhóm hồ sơ tín dụng: Khách hàng, HĐTD, Khoản vay, TSĐB, Thẻ. Gồm gỡ 65 props của `KunnForm` | **cao** |
| **4** | Tổng quan, Kiểm soát sau vay | trung bình |
| **5** | Công cụ & Phương án — 5 màn sau khi gộp tồn kho | trung bình |
| **6** | Tra cứu & Biểu mẫu — 4 màn, gồm gỡ 65 `useState` của `DocumentTemplateView` | trung bình |
| **7** | Cài đặt, dọn nốt | thấp |

Đợt 0–2 là nền nên giao diện chưa đổi rõ. Từ đợt 3 mới thấy khác biệt, và đó cũng là lúc màn cũ với màn mới trông không giống nhau — hệ quả đã chấp nhận của cách triển khai theo đợt.

## 9. Xác minh

1.621 test hiện có phải xanh sau mỗi đợt. `src/lib/` không nằm trong phạm vi sửa — **test trong `lib/` chuyển đỏ là dấu hiệu rebuild đã lấn sang tầng nghiệp vụ; dừng lại và xem xét, đừng sửa test cho xanh.**

Ngoài test đơn vị, mỗi đợt còn phải kiểm chứng thật:

- **Tương phản màu:** đo bằng công cụ ở cả hai giao diện, không ước lượng bằng mắt. Đặc biệt các cặp mới ở §4.3.
- **Màn hẹp:** mở trình duyệt ở 375px, đếm phần tử có `getBoundingClientRect().right` vượt `clientWidth` mà tổ tiên không có `overflow-x: auto`. Đây là cách §15 đã quy định.
- **Hộp thoại:** thử bàn phím thật — Tab có bị giữ trong hộp không, Escape có đóng không, tiêu điểm có trả về đúng nút đã mở nó không.
- **Ảnh chụp** màn trước và sau mỗi đợt.

## 10. Ngoài phạm vi — việc kế tiếp

**Tổng quan nạp sáu bảng toàn bộ rồi tổng hợp phía trình duyệt.** `DashboardView` gọi song song `fetchCustomersAPI`, `fetchCollateralsAPI`, `fetchContractsAPI`, `fetchCardContractsAPI`, `fetchAllCreditContractsAPI`, `fetchPaidPrincipalMapAPI`, cộng một lượt lấy lịch trả nợ. Đây là vấn đề thật, nhưng sửa nó cần view hoặc RPC bên Supabase chứ không phải việc của tầng trình bày.

Khi làm: **đo độ trễ truy vấn thật trước, đừng đếm số dòng rồi kết luận là nhẹ.** Dự án đã trả giá một lần vì đếm 6.705 dòng rồi tưởng nhẹ, kết quả làm dashboard chậm gấp bảy lần.

## 11. Rủi ro

**Đợt 3 là đợt duy nhất có thể làm vỡ nghiệp vụ.** `KunnForm` đang nắm ràng buộc hạn mức tín dụng. Gỡ 65 props của nó là việc cơ học nhưng dễ làm rơi mất một ràng buộc mà test không bắt được, vì ràng buộc nằm ở tầng trình bày chứ không ở `lib/`. Trước khi sửa: liệt kê đủ các ràng buộc màn này đang giữ, và cân nhắc rút chúng xuống `lib/` để có test bảo vệ.

**Chính sách màu mới chưa đo tương phản.** Nếu cặp `pos` trên `panel` hoặc `accent` trên `panel` không đạt ngưỡng ở một trong hai giao diện, phải chỉnh giá trị token — việc này ảnh hưởng ngược lại toàn bộ hệ thống và nên làm xong ở đợt 0, không để tới đợt 3 mới phát hiện.

**Tài liệu lại lệch.** Rebuild lần này sinh ra quy ước mới; nếu không cập nhật `CONVENTIONS.md` §15 và §17 ngay trong đợt 0 thì sáu tháng nữa lại đúng tình trạng đang có.
