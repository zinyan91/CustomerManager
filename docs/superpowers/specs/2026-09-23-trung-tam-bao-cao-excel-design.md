# Trung tâm báo cáo Excel — thiết kế

Ngày: 23/09/2026 · Trạng thái: chờ duyệt

---

## 1. Mục tiêu

Gom năm báo cáo Excel về **một màn duy nhất**, có bộ lọc kỳ hạn ba mốc, xuất được một tệp workbook nhiều sheet trong một lần bấm.

Hiện mỗi báo cáo nằm rải rác ở màn khác nhau, và hai trong năm báo cáo còn chưa tồn tại. Người dùng muốn lấy đủ bộ báo cáo định kỳ phải đi qua nhiều màn, mỗi màn tải một tệp riêng.

**Thành công trông như thế nào:** mở một màn, tích các báo cáo cần, chọn mốc kỳ hạn, bấm một lần, nhận một tệp `.xlsx` đủ sheet.

---

## 2. Hiện trạng đã khảo sát

| Báo cáo | Trạng thái | Nơi đang nằm |
| :--- | :--- | :--- |
| Danh mục đang vay | Đã có | `customerPortfolioExport.ts` → `CustomerListView`, `DashboardView` |
| Nợ due | Đã có (xuất HTML) | `dueList.ts` → `DashboardView` |
| KUNN | **Chưa có** | — |
| HĐTD | **Chưa có** | — |
| Tài sản bảo đảm | **Chưa có** | — |

Hạ tầng tái dùng được, không phải viết mới:

- `buildMultiSheetXlsx(sheets)` trong `xlsxWriter.ts` — gộp nhiều sheet thành một workbook.
- `downloadBytes(bytes, fileName, mimeType)` trong `xlsExport.ts`.
- `buildActivePortfolioData(params)` trong `customerPortfolioExport.ts` — dựng sẵn dữ liệu danh mục đang vay.
- Toàn bộ hàm nạp dữ liệu cần thiết: `fetchContractsAPI`, `fetchAllCreditContractsAPI`, `fetchCollateralsAPI`, `fetchCollateralAppraisalsAPI`, `fetchOutstandingSchedulesAPI`, `fetchCustomersAPI`.

**Điểm chặn đã xác định:** `duePeriod.ts` hiện chỉ phân **hai** mốc — `overdue` (`daysLeft < 0`) và `upcoming` (`0 ≤ daysLeft ≤ 5`, hằng `UPCOMING_DAYS = 5`). `DashboardView` và `DueSectionPanel` đang đọc nó.

---

## 3. Quyết định đã chốt

| # | Quyết định | Đã chọn |
| :--- | :--- | :--- |
| 1 | Hình hài kết quả | Một màn trung tâm báo cáo; tích nhiều loại để ra một workbook nhiều sheet |
| 2 | Ranh giới ba mốc | Tới hạn = còn 0–5 ngày (giữ `UPCOMING_DAYS = 5`); sắp tới hạn = 6–30 ngày |
| 3 | Mốc tính hạn | Mỗi loại báo cáo một mốc riêng theo bản chất của nó |
| 4 | Phạm vi dữ liệu | Toàn danh mục phụ trách, RLS tự giới hạn theo `OwnerId`; không thêm bộ lọc khách hàng |

Bổ sung sau khi duyệt thiết kế: màn có **thanh điều hướng trái riêng cho trang** để chọn báo cáo, thay cho danh sách hộp tích nằm trong thân trang.

---

## 4. Phân loại kỳ hạn — `src/lib/reports/dueBucket.ts`

```
DueBucket = 'overdue' | 'due' | 'upcoming' | 'none'

overdue  : daysLeft < 0
due      : 0  ≤ daysLeft ≤ 5      ← bằng đúng 'upcoming' hiện tại của duePeriod
upcoming : 6  ≤ daysLeft ≤ 30
none     : daysLeft > 30
```

Hàm chính:

```ts
export const REPORT_UPCOMING_DAYS = 30;
export function dueBucketOf(dateIso: string | null | undefined, todayIso?: string): DueBucket;
export function daysLeftOf(dateIso: string | null | undefined, todayIso?: string): number | null;
export const DUE_BUCKET_LABELS: Record<DueBucket, string>;
```

**Không sửa `duePeriod.ts`.** `DashboardView` và `DueSectionPanel` đang chạy trên nó; sửa là đổi hành vi màn đang dùng thật. Thay vào đó `dueBucket.ts` **nhập `UPCOMING_DAYS` từ `duePeriod.ts`** chứ không chép số `5` ra, nên hai chỗ không thể trôi khỏi nhau: đổi một chỗ là cả hai đổi theo.

Ngày rỗng, ngày không phân tích được → trả `'none'` và `daysLeft = null`. Không ném lỗi, không trả `NaN`.

---

## 5. Năm báo cáo

Cột `Số ngày` mang dấu: âm là đã quá hạn, dương là còn lại. Cột `Trạng thái` lấy từ `DUE_BUCKET_LABELS`.

### R1 — Danh mục đang vay

- **Nguồn:** `buildActivePortfolioData` đã có, tái dùng nguyên vẹn.
- **Mốc hạn:** không có. Đây là ảnh chụp toàn danh mục, không lọc theo kỳ hạn.
- **Cột:** giữ nguyên bộ cột hiện hành của `generateCustomerPortfolioWorkbook`.

### R2 — Nợ due

- **Nguồn:** `fetchOutstandingSchedulesAPI` (kỳ trả nợ chưa thanh toán) nối `LoanContract` và `Customer`.
- **Mốc hạn:** `RepaymentSchedule.DueDate`.
- **Cột:** STT · Mã CIF · Họ tên KH · Số KUNN · Kỳ số · Ngày đến hạn · Số ngày · Trạng thái · Gốc kỳ · Lãi kỳ · Tổng kỳ · Dư nợ hiện hữu · Nhóm nợ.

### R3 — KUNN

- **Nguồn:** `fetchContractsAPI`, lọc bỏ khoản đã tất toán (`IsSettled`).
- **Mốc hạn:** `LoanContract.KunnDueDate`.
- **Cột:** STT · Mã CIF · Họ tên KH · Số KUNN · Số HĐTD gốc · Phương thức vay · Ngày giải ngân · Ngày đáo hạn KUNN · Số ngày · Trạng thái · Số tiền nhận nợ · Dư nợ hiện hữu · Lãi suất · Nhóm nợ.

### R4 — HĐTD

- **Nguồn:** `fetchAllCreditContractsAPI`, lọc bỏ hợp đồng đã đóng (`IsClosed`).
- **Mốc hạn:** `CreditContract.ContractEndDate`.
- **Cột:** STT · Mã CIF · Họ tên KH · Số HĐTD · Mã phê duyệt · Phương thức vay · Ngày hiệu lực · Ngày hết hiệu lực · Số ngày · Trạng thái · Mức cấp · Đã sử dụng · Còn khả dụng.
- **Ba cột hạn mức không tự tính lại:** dùng `computeCreditLimit(contracts)` trong `creditLimit.ts` để lấy mức cấp / đã dùng / còn khả dụng, tránh sinh ra định nghĩa dư nợ thứ hai lệch với Dashboard. Cần gom KUNN theo HĐTD trước khi gọi.

### R5 — Tài sản bảo đảm

- **Nguồn:** `fetchCollateralsAPI`, bổ sung `fetchCollateralAppraisalsAPI` khi cần chứng thư mới nhất.
- **Mốc hạn:** `Collateral.AppraisalExpiryDate`.
- **Cột:** STT · Mã CIF · Họ tên KH · Mã tài sản · Loại tài sản · Địa chỉ · Ngày định giá · Hiệu lực (tháng) · Ngày hết hiệu lực · Số ngày · Trạng thái · Giá trị định giá · LTV (%) · Hạn mức tối đa.

### Quy tắc nghiệp vụ bắt buộc

**Nhóm nợ phải tính sống.** Cột `Nhóm nợ` ở R2 và R3 **không** đọc thẳng `LoanContract.DebtGroup` — cột lưu trong CSDL hay bị cũ. Dùng `max(DebtGroup đã lưu, getAutoDebtGroupInfo(lịch trả nợ quá hạn, hôm nay).debtGroup)`, đúng cách `customerContext.ts` đang làm.

**Ngày hôm nay.** Mọi phép tính mốc dùng `todayIso()` từ `utils.ts`. Tuyệt đối không `toISOString().split('T')[0]`.

**Giá trị 0 là thật.** Không dùng `||` để đặt mặc định cho số tiền, LTV hay số ngày; phân biệt rõ `0` và `null`.

---

## 6. Kiến trúc mã

```
src/lib/reports/
├── dueBucket.ts              phân ba mốc — hàm thuần
├── registry.ts               khai báo năm báo cáo
└── builders/
    ├── portfolioSheet.ts     R1
    ├── dueSheet.ts           R2
    ├── kunnSheet.ts          R3
    ├── creditSheet.ts        R4
    └── collateralSheet.ts    R5
src/hooks/useReportCenterController.ts
src/components/views/ReportCenterView.tsx
src/components/reports/ReportRail.tsx        thanh chọn báo cáo bên trái
src/components/reports/ReportOptionsPanel.tsx  bộ lọc kỳ hạn + nút xuất
```

**Registry** — mỗi báo cáo là một mục khai báo, màn không biết gì về nội dung từng báo cáo:

```ts
export interface ReportDef {
  id: ReportId;                    // 'portfolio' | 'due' | 'kunn' | 'credit' | 'collateral'
  name: string;                    // nhãn đầy đủ
  shortName: string;               // nhãn trên thanh trái
  sheetName: string;               // tên sheet trong workbook
  supportsDueFilter: boolean;      // R1 = false, còn lại = true
  dueFieldLabel: string;           // "Ngày đáo hạn KUNN", "Ngày hết hiệu lực"…
  load(ctx: ReportLoadContext): Promise<ReportRowSet>;
  buildSheet(rows: ReportRowSet, filter: DueBucketFilter): XlsxSheet;
}
```

Thêm báo cáo thứ sáu về sau = thêm một mục vào `registry.ts`, không đụng màn.

**Luồng:** màn đọc registry → người dùng chọn báo cáo trên thanh trái và mốc kỳ hạn → controller gọi `load` của các mục đã tích (song song bằng `Promise.all`) → mỗi `buildSheet` trả một `XlsxSheet` → `buildMultiSheetXlsx` gộp → `downloadBytes`.

**Xử lý lỗi:** một báo cáo nạp lỗi thì không nuốt lỗi và không chặn cả tệp — báo rõ báo cáo nào hỏng, vẫn xuất các sheet còn lại, và ghi `console.error` theo pattern của `src/lib/api/`. Nếu **mọi** báo cáo đều lỗi thì không tải tệp rỗng, hiện thông báo lỗi.

---

## 7. Giao diện

Màn nằm trong `DedicatedWorkspaceLayout` (không gian tác vụ độc lập, không có thanh bên toàn ứng dụng). Bố cục hai cột bên trong thân trang:

```
┌─────────────────────────────────────────────────┐
│  BÁO CÁO           │  Kỳ hạn: [Tất cả][Quá hạn] │
│  ─────────────     │         [Tới hạn][Sắp tới] │
│  ▍Danh mục đang vay│                            │
│  ▍Nợ due           │  Bảng xem trước số dòng    │
│  ▍KUNN             │  từng báo cáo đã chọn      │
│  ▍HĐTD             │                            │
│  ▍Tài sản bảo đảm  │       [ Xuất Excel ]       │
└─────────────────────────────────────────────────┘
```

Thanh trái theo **quy ước de-nesting** đã chốt của dự án: chỉ một lớp thẻ bao ngoài, từng mục dùng thanh màu bên trái để phân biệt, **không lồng viền trong viền**. Bảng màu giữ grayscale/slate theo `AGENTS.md`; không dùng `backdrop-blur-md` trở lên vì đã bị vô hiệu toàn cục trong `index.css`.

Trên màn hẹp, thanh trái xếp lên trên thành hàng chọn ngang.

**Điều hướng:** route `/hub/reports`, thêm một thẻ vào `hubTasks.ts` nhóm `credit` và một ánh xạ vào `HUB_SUBROUTES`. Bộ test toàn vẹn hub sẽ tự bắt nếu khai thiếu, kể cả nhãn đếm "N tác vụ" của nhóm.

---

## 8. Kiểm thử

Viết test **trước** phần logic, theo `truoc-khi-code.md`.

| Đối tượng | Nội dung kiểm |
| :--- | :--- |
| `dueBucket` | Ranh giới −1 / 0 / 5 / 6 / 30 / 31; ngày rỗng và ngày hỏng trả `'none'`; `daysLeft` âm khi quá hạn; hằng nhập từ `duePeriod` chứ không chép số |
| Mỗi builder | Đúng bộ cột và thứ tự; lọc đúng theo mốc; danh sách rỗng vẫn ra sheet có tiêu đề, không vỡ; số tiền `0` không bị biến thành rỗng |
| Nhóm nợ | Khoản có `DebtGroup` lưu thấp hơn nhóm tính sống thì lấy nhóm cao hơn |
| `registry` | `id` và `sheetName` không trùng; mọi mục có đủ `load` và `buildSheet`; chỉ R1 có `supportsDueFilter = false` |
| Workbook | Tích nhiều báo cáo cho ra đúng số sheet, đúng thứ tự; tệp bắt đầu bằng chữ ký `PK` |
| Điều hướng | Bộ test `hubTasks` hiện có tự phủ khi thêm thẻ mới |

---

## 9. Không làm lần này

- **Không đụng** nút xuất cũ ở `DashboardView` và `CustomerListView`. Chúng chạy song song. Gỡ trùng lặp là việc riêng, sau khi màn mới ổn định.
- **Không sửa** `duePeriod.ts` và hành vi đếm của Dashboard.
- **Không** thêm bộ lọc theo khách hàng.
- **Không** xuất PDF hay in — chỉ `.xlsx`.
- **Không** đụng `dueList.ts` (xuất HTML của Dashboard).

---

## 10. Rủi ro đã biết

| Rủi ro | Cách xử lý |
| :--- | :--- |
| Hai định nghĩa kỳ hạn trôi khỏi nhau | `dueBucket` nhập `UPCOMING_DAYS` từ `duePeriod`, không chép hằng số |
| Nạp toàn danh mục chậm khi dữ liệu lớn | Gọi song song `Promise.all`; chỉ nạp báo cáo đã tích, không nạp sẵn cả năm |
| Đọc thẳng `DebtGroup` cũ cho ra nhóm nợ sai | Bắt buộc dùng `max(lưu, tự tính)`; có test riêng cho tình huống này |
| Sheet thứ sáu về sau lại dồn vào một tệp lớn | Registry tách builder theo tệp; mỗi builder tự kiểm thử được |

---

## 11. Việc kế tiếp

Sau khi spec được duyệt: lập kế hoạch thực thi bằng kỹ năng `writing-plans`.
