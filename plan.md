# Kế hoạch nâng cấp giao diện toàn hệ thống

Cập nhật 10/08/2026 (đo lại số liệu). Thay thế hoàn toàn bản kế hoạch trước.

**Chưa đợt nào bắt đầu.** Toàn bộ phần dưới là việc chưa làm, trừ mục 2b.

---

## 0. Vì sao bản kế hoạch cũ bị bỏ

Bản cũ đề xuất "Glassmorphism, palette Slate/Sky/Emerald, `rounded-2xl`, hiệu ứng mượt". Bỏ vì hai lý do đo được:

**Phần 1 của nó đã làm xong rồi.** Tab Lịch thu nợ đã có cột chọn kỳ, bảng đã rút còn 9 cột, `PeriodDetailCard` đã tồn tại, `DebtSummaryCard` đã gỡ.

**Phần 2 của nó đi ngược hệ thống đang chạy.** Lớp token trong `src/index.css` đã phủ toàn bộ mã nguồn — quét cả `src/` không còn **một** lớp màu Tailwind cứng nào (`bg-slate-800`, `text-emerald-500`, …). Đắp glassmorphism và accent Sky/Emerald lên đó không phải nâng cấp, là viết lại lớp nền đã đúng để quay về hướng trang trí.

```bash
grep -roE "(bg|text|border|ring)-(slate|gray|zinc|red|emerald|sky|blue|indigo)-[0-9]{2,3}" src --include=*.tsx | wc -l
```

---

## 1. Tình trạng đo được

Chạy lại bất cứ lúc nào để biết đợt nâng cấp đã đi tới đâu.

| Hạng mục | 06/08 | 07/08 | 10/08 | Đánh giá |
| :--- | ---: | ---: | ---: | :--- |
| Màu Tailwind cứng ngoài token | 0 | 0 | **0** | Xong |
| File khai lại lớp dùng chung bằng tay | 0 | 0 | **0** | Xong |
| Khung thông báo viết tay | 5 | 0 | **0** | Xong — gộp về `Toast` |
| `window.alert` | 2 | 0 | **0** | Xong |
| Đường in khác nhau | 4 | 1 | **1** | Xong — gộp về `printHtmlDoc` |
| Bản tải file chép tay | 3 | 1 | **1** | Xong — gộp về `downloadTextFile` |
| Chỗ tự tính LTV trong `.tsx` | 8 | 0 | **0** | Xong |
| **Chuỗi tiếng Việt cứng trong JSX** | 726 | 688 | **770** | **Hổng nặng, đang tăng** |
| **File dùng `useLang`** | 4/57 | 4/59 | **5/74** | **Hổng nặng, tỷ lệ đang giảm** |
| **File có `focus-visible`** | 3/57 | 5/59 | **5/74** | **Dưới sàn chất lượng** |
| **File `.tsx` quá 400 dòng** | — | — | **11** | **Nặng hơn dự tính ban đầu** |
| Bảng thiếu `overflow-x-auto` | 5 | 4 | **5** | Tăng — `BusinessPlanSheet` mới |
| Test dựng component | 2/57 | 2/59 | **4/74** | Mỏng |
| `ROW_RAIL_*` được dùng | 0 | 0 | **0** | Hằng chết |
| `text-[9px]` | — | 1 | **1** | Chưa giết |
| Tổng test | 813 | 843 | **1.066** | |

**Ba dòng đáng chú ý khi đo lại 10/08:**

Chuỗi tiếng Việt cứng **tăng từ 688 lên 770** và tỷ lệ file dùng `useLang` **tụt từ
4/59 xuống 5/74** — các phân hệ mới (Phương án kinh doanh, Chào lãi suất, ô Gốc mỗi
kỳ) đều viết tiếng Việt trực tiếp. Đợt 3 đang lùi ra xa hơn mỗi lần thêm màn hình.
Số 726 ở bản kế hoạch gốc **không phải mục tiêu cố định** mà là mục tiêu đang chạy.

Số file quá 400 dòng là **11**, không phải 3 như bản kế hoạch ban đầu ước. Tiêu chí
ra của Đợt 4 vì thế nặng hơn nhiều.

Bảng thiếu `overflow-x-auto` **tăng lại** vì `BusinessPlanSheet` là bảng mới. Sàn
chất lượng không tự giữ được nếu không có chốt.

---

## 2. Hướng thiết kế — chốt bằng chữ để hết tranh cãi

Hệ thống này là **sổ cái điện tử của một ngân hàng**, người dùng là banker đọc số tiền cả ngày. Mọi quyết định hình thức phải phục vụ một câu hỏi: *con số này đúng không, và tôi phải làm gì với nó.*

### Màu — chỉ mang nghĩa, không trang trí

Bảng token trong `src/index.css` là nguồn duy nhất. Quy tắc bất di bất dịch: **một màu chỉ được dùng khi nó nói một điều nghiệp vụ.**

| Token | Nghĩa | Không được dùng để |
| :--- | :--- | :--- |
| `accent` | Thứ người dùng đang chọn | Làm nút cho đẹp |
| `pos` | Tiền đã về, kỳ đã tất toán | Thông báo thành công chung chung |
| `neg` | Tiền còn thiếu, kỳ quá hạn | Nút xoá |
| `warn` | Sắp đến hạn, cần chú ý | Nhấn mạnh tuỳ hứng |
| `g1`–`g5` | Nhóm nợ 1–5 | Bất cứ thang màu nào khác |

Không thêm hex mới. Cần một sắc thái mới nghĩa là bạn đang định nói một điều nghiệp vụ chưa có tên — đặt tên cho nó trước.

### Chữ — ba vai, không hơn

Font chữ do người dùng chọn qua `lib/fontSettings.ts`, nên cá tính **không** đến từ typeface. Nó đến từ việc phân vai kỷ luật:

1. **Số liệu** — `font-mono`, `tabular-nums`. Mọi con số tiền, lãi suất, ngày, số hiệu chứng từ. Cột số phải thẳng hàng khi cuộn; đó là toàn bộ lý do mono tồn tại ở đây.
2. **Nhãn cấu trúc** — 10px, `uppercase`, `tracking` 0.09–0.12em, `ink-faint`. Tiêu đề cột, nhãn khối. Đây là "rubric" của tờ sổ cái: luôn im lặng, không bao giờ tranh chấp với số.
3. **Văn bản** — font hệ thống, cỡ theo `--fs-*`. Tên khách, ghi chú, nội dung nút.

Cỡ chữ tuỳ tiện phải hết: `text-[11px]` đang có 207 chỗ, `text-[10px]` 81 chỗ, và **một** chỗ `text-[9px]` ở [KunnTable.tsx:122](src/components/portfolio/KunnTable.tsx:122) — cỡ chữ lẻ loi đó không đọc được và phải chết.

### Bố cục — mật độ là tính năng

Banker muốn thấy nhiều dòng cùng lúc, không muốn khoảng thở. Công tắc `data-density` (`cozy` / `compact`) đã có ở Lịch thu nợ và phải phủ ra mọi bảng. Bo góc chỉ hai bậc: `RADIUS_PANEL` cho khung, `RADIUS_CONTROL` cho điều khiển. Hết.

### Điểm nhấn hệ thống — thanh rail trái

Một thứ duy nhất được phép là chữ ký của toàn hệ thống: **thanh rail 2px bên trái mỗi dòng bảng** mang trạng thái của dòng đó. Xanh = đã tất toán, đỏ = quá hạn, accent = đang chọn, trong suốt = bình thường.

Vì sao là nó: banker quét bảng theo chiều dọc. Rail cho phép đọc trạng thái của 40 dòng bằng một cú liếc mà không cần đọc chữ, và nó không tốn một cột nào. `ROW_RAIL_SELECTED` / `_NEUTRAL` / `_ALERT` **đã có sẵn trong `uiClasses.ts` nhưng 0 file dùng** — kể cả `ScheduleTab` cũng tự viết lại bằng tay. Đợt 2 biến nó thành thật.

Ngoài rail, không thêm hiệu ứng nào. Không gradient, không đổ bóng, không animation trang trí.

---

## 2b. Đã làm ngày 07/08/2026

Ngoài kế hoạch ban đầu, do phát hiện trong lúc làm:

**Bảng đổi hình dạng theo thiết bị.** Điện thoại ưu tiên tra cứu, máy tính ưu tiên nhập liệu — chốt với banker. `AdaptiveTable` nhận một bộ định nghĩa cột, dựng bảng ở `md` trở lên và thẻ dọc ở dưới. Áp cho 6 màn: Tổng quan, Danh sách khách hàng, Định giá TSĐB, Thẻ tín dụng, Kiểm soát sau vay, Tra cứu mục đích SDV. Đo lại ở 375px: 0 bảng còn tràn. Xem `CONVENTIONS.md` §15.

**Gộp thông báo.** Ba kiểu song song về một `Toast`. Bỏ nút "Lưu cài đặt cá nhân" — nó không lưu gì, mọi thiết lập đã tự ghi khi chạm vào điều khiển.

**Gộp in và tải file.** Bốn cách in về `printHtmlDoc` (iframe, không popup); ba bản tải file về `downloadTextFile`.

**Sửa font không đổi được.** `App.tsx` bọc cả cây con trong `font-sans` của Tailwind nên chặn kế thừa `--app-font`.

**Gỡ quy tắc kéo kỳ cuối về ngày đáo hạn** và nút bảo trì đi kèm — xem `CONVENTIONS.md` §2, quy tắc do đọc ngược bằng chứng mà ra và đã làm hỏng dữ liệu.

**Thẻ tín dụng vào chốt kiểm soát TSĐB**, ba trường hợp mở thẻ có ràng buộc thật. Xem `CONVENTIONS.md` §13.

---

## 3. Các đợt

Mỗi đợt một nhánh, một lần gộp, có tiêu chí ra rõ ràng. Không đợt nào được bắt đầu khi đợt trước chưa xanh.

### Đợt 1 — Sàn chất lượng bàn phím và màn hẹp

Nhỏ nhất, rủi ro thấp nhất, giá trị tức thì. Làm trước.

- Đưa `focus-visible:outline-2 outline-offset-2 outline-accent` vào `BTN_BASE`, `UI.inputStyle` và mọi phần tử bấm được. Hiện **5/74** file có.
- Bọc `overflow-x-auto` cho 5 bảng còn thiếu: `EstimateForm`, `PaymentRequestForm`, `SaleForm`, `KunnRateSection`, `BusinessPlanSheet`. (`CustomerListView` đã xong qua `AdaptiveTable`.)
- Gán `aria-label` cho các nút chỉ có biểu tượng.
- Giết `text-[9px]`.

**Ra khi:** đi hết một màn hình bằng `Tab` luôn nhìn thấy con trỏ đang ở đâu; không màn nào cuộn ngang ở bề rộng 375px.

### Đợt 2 — Rail trạng thái phủ mọi bảng

- Dùng `ROW_RAIL_*` từ `uiClasses`; xoá bản viết tay trong `ScheduleTab`.
- Áp cho `KunnTable`, `CreditContractView`, và bên trong `AdaptiveTable` để mọi bảng đã chuyển đều có rail.
- Phủ công tắc `data-density` ra các bảng đó.

**Ra khi:** `grep -rl "border-l-2 border-neg" src/components` chỉ trả về `uiClasses.ts`.

### Đợt 3 — Dịch xong hai ngôn ngữ

Đợt nặng nhất: **770 chuỗi** (đo 10/08, đang tăng). Đây là lý do thật khiến công tắc ngôn ngữ đang bị tắt sau cờ `LANG_SWITCH_ENABLED` ở [Header.tsx:70](src/components/Header.tsx:70).

Chia theo màn, mỗi màn một lần gộp, theo thứ tự người dùng đụng tới nhiều nhất:

1. `LoanPortfolioView` + `portfolio/*` — 935 dòng, màn chính
2. `CustomerListView` · `CreditContractView`
3. `DashboardView` · `PostLoanControlView`
4. `calculator/*` — 9 công cụ
5. `documents/*` · `rate/*` · `SettingsView` · phần còn lại

**Ra khi:** `LANG_SWITCH_ENABLED` bật được mà không màn nào còn lẫn tiếng Việt khi chọn EN. Kiểm bằng đếm chuỗi cứng về 0 trên từng thư mục.

Không bật cờ sớm. Giao diện nửa dịch nửa không tệ hơn giao diện một ngôn ngữ.

### Đợt 4 — Chẻ nhỏ component quá khổ

Không phải việc thẩm mỹ, nhưng là điều kiện để đợt 3 và 5 làm được. Đo lại 10/08: **11 file** quá 400 dòng, không phải 3 như bản kế hoạch ban đầu ước.

| File | Dòng |
| :--- | ---: |
| `views/LoanPortfolioView.tsx` | 957 |
| `calculator/Tool4RateReductionCalc.tsx` | 801 |
| `views/RateQuoteView.tsx` | 615 |
| `views/CustomerListView.tsx` | 614 |
| `views/CreditContractView.tsx` | 609 |
| `calculator/Tool1LoanScheduleCalc.tsx` | 570 |
| `views/CreditCardView.tsx` | 514 |
| `views/DashboardView.tsx` | 511 |
| `views/PostLoanControlView.tsx` | 508 |
| `businessPlan/BusinessPlanSheet.tsx` | 462 |
| `views/CofView.tsx` | 407 |

`LoanPortfolioView` vẫn đứng đầu dù đã tách hai lần (2.264 → 1.333 → 957). `CONVENTIONS.md`
§1 nêu đích danh nó: hai cách tính hạn mức khả dụng viết thẳng trong file này khiến
cùng một khách hiện `2.800.000.000` ở đầu trang và `1.400.000.000` trong form.
`Tool4RateReductionCalc` còn kèm chuỗi HTML bản in.

Kèm theo: rút 3 khối HTML bản in trong `Tool1LoanScheduleCalc`, `Tool4RateReductionCalc`, `DocumentPreview` về `src/lib/` — nơi đã có sẵn `printHtmlDoc.ts`, `scheduleDocHtml.ts`, `documentHtml.ts`, `rateSheet.ts`, `dueList.ts` làm đúng việc đó.

**Ra khi:** không file `.tsx` nào quá 400 dòng; không công thức tiền nào còn trong `.tsx`; không chuỗi HTML bản in nào còn trong `.tsx`.

### Đợt 5 — Lưới an toàn dựng component

Hiện có **4/74** test dựng component (`LoanPortfolioView`, `ScheduleTab`, `BusinessPlanView`, `KunnRepaymentSection`). `CONVENTIONS.md` §1 ghi rõ vì sao cần: ngày 05/08/2026 tab KUNN trắng trang vì một hàm gọi biến khai sau nó — build, lint và 668 test đều xanh.

Mỗi màn một test jsdom, chỉ làm một việc: dựng lên với dữ liệu rỗng / một dòng / dữ liệu biên, khẳng định render tới cùng và `console.error` rỗng. **Không** kiểm công thức tiền ở đây.

**Ra khi:** mọi màn trong `views/` có ít nhất một test dựng lên.

---

## 4. Thứ tự và vì sao

```
Đợt 1 ──► Đợt 2 ──► Đợt 4 ──► Đợt 3 ──► Đợt 5
 sàn      rail      chẻ nhỏ    dịch     lưới
```

Đợt 4 chen trước đợt 3 dù nó không phải việc giao diện: dịch một file 935 dòng rồi mới chẻ nó ra là làm hai lần. Chẻ trước thì mỗi mảnh dịch xong gộp được ngay.

Đợt 5 đi cuối vì test dựng component viết trên cấu trúc đã ổn định mới không phải viết lại.

---

## 5. Rủi ro

**Đợt 3 là nơi dự án dễ chết giữa đường nhất.** 770 chuỗi là khối lượng nhiều tuần. Nếu bỏ dở, hệ thống mắc kẹt ở trạng thái nửa vời và cờ `LANG_SWITCH_ENABLED` nằm đó mãi. Chấp nhận được: dừng hẳn sau một màn hoàn chỉnh, không dừng giữa một màn.

**Mục tiêu đang chạy, không cố định.** Số chuỗi cứng tăng 688 → 770 giữa hai lần đo vì phân hệ mới vẫn viết tiếng Việt trực tiếp. Đợt 3 sẽ không bao giờ xong nếu không có chốt chặn chuỗi cứng mới — cân nhắc thêm luật lint trước khi bắt đầu dịch, không phải sau.

**Đợt 4 đụng vào tiền.** Chẻ `LoanPortfolioView` là chẻ đúng file mà `CONVENTIONS.md` nói đã bốn lần sinh ra số sai. Mọi công thức rút ra phải có test hàm thuần **trước** khi xoá bản cũ, không phải sau.

**Đợt 2 dễ bị hiểu sai thành trang trí.** Rail chỉ được mang trạng thái nghiệp vụ. Ngay khi nó bắt đầu mang "dòng chẵn / dòng lẻ" thì nó mất hết giá trị.

---

## 6. Không làm

- Không đổi bảng màu, không thêm accent.
- Không glassmorphism, không gradient, không đổ bóng.
- Không animation ngoài chuyển màu 150ms khi hover và focus.
- Không thư viện giao diện ngoài. Không tải font từ CDN — hệ thống chạy trong mạng nội bộ ngân hàng, xem `CONVENTIONS.md` §13 `fontSettings.ts`.
- Không đụng vào chuỗi HTML bản in ở đợt 1–3; bản in cố tình không ăn theo thiết lập màn hình.
