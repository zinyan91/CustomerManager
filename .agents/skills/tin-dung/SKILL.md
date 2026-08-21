---
name: tin-dung
description: Kiến thức nghiệp vụ, quy ước kỹ thuật, mô hình bảo mật, công thức tài chính và hướng dẫn phát triển của hệ thống CustomerManager. Dùng khi làm bất cứ việc gì liên quan tới lãi, gốc, lịch trả nợ, LTV, tài sản bảo đảm, hạn mức tín dụng, cho vay từng lần, phân nhóm nợ, sản phẩm vay, giải ngân theo tiến độ, phí phạt trả trước, bảo mật RLS, kiến trúc dự án hoặc thiết lập môi trường trong codebase này.
---

# Cẩm Nang & Nghiệp Vụ Tín Dụng — CustomerManager

Ứng dụng web quản lý hồ sơ tín dụng ngân hàng: khách hàng, hợp đồng tín dụng (HĐTD), giấy nhận nợ (KUNN), tài sản bảo đảm (TSĐB), thẻ tín dụng, lịch trả nợ và các công cụ tính toán phục vụ tư vấn.

Mã nguồn **không chứa chú thích trực tiếp trong code**. Toàn bộ giải thích kiến trúc, mô hình bảo mật, quy ước kỹ thuật và công thức tài chính được tập trung tại tài liệu này và file `CONVENTIONS.md`.

> **Quy tắc bất biến:** Đọc kỹ tài liệu này trước khi sửa bất cứ thứ gì liên quan tới tiền, lãi, gốc, LTV, hạn mức hoặc bảo mật cơ sở dữ liệu.

---

## 1. Công nghệ & Môi trường phát triển

| Thành phần | Lựa chọn |
| :--- | :--- |
| **Giao diện** | React 19 + TypeScript + Vite |
| **Kiểu dáng** | TailwindCSS 4, hỗ trợ giao diện Sáng / Tối linh hoạt |
| **Biểu đồ & Biểu tượng** | Recharts, Lucide Icons |
| **Dữ liệu & Xác thực** | Supabase (PostgreSQL + Auth + Row Level Security) |
| **Kiểm thử** | Vitest (hơn 1.800 ca kiểm thử tự động) |
| **Triển khai** | Vercel |

Ứng dụng gọi trực tiếp Supabase từ trình duyệt thông qua `@supabase/supabase-js`. **Không có tầng backend riêng** — an toàn dữ liệu dựa hoàn toàn vào Auth và Row Level Security (RLS) ở phía PostgreSQL.

### Thiết lập môi trường

```bash
npm install
```

Tạo file `.env` từ `.env.example`:
```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

> **Không bao giờ commit file `.env`.** Ứng dụng sẽ báo lỗi ngay khi thiếu biến môi trường thay vì âm thầm dùng giá trị dự phòng.

### Các lệnh vận hành

```bash
npm run dev        # Chạy máy chủ phát triển Vite
npm run build      # Kiểm tra kiểu TypeScript + đóng gói bản phát hành
npm test           # Chạy toàn bộ test tự động (Vitest)
npm run test:watch # Chạy test ở chế độ theo dõi thay đổi
npm run lint       # Kiểm tra mã nguồn (Oxlint / ESLint)
```

---

## 2. Cấu trúc thư mục & Nguyên tắc tổ chức code

```
src/
├── components/
│   ├── views/        Màn hình chính của từng phân hệ (Dashboard, Loans, Collaterals...)
│   ├── portfolio/    Thành phần phân hệ Khoản vay & Giấy nhận nợ (KUNN)
│   ├── collateral/   Thành phần phân hệ Tài sản bảo đảm
│   ├── calculator/   8 công cụ tính toán tài chính & tín dụng
│   ├── inventory/    Quản lý kho hàng, Bảng kê mua bán, Hóa đơn bán lẻ
│   ├── rate/         Chào lãi suất cho vay & biểu lãi suất huy động
│   └── documents/    Soạn thảo & xuất biểu mẫu hợp đồng (.docx, .xlsx, .pptx)
├── context/          Theme, Format, Date, Font, Auth context
├── lib/              Toàn bộ logic nghiệp vụ thuần (Pure Functions) + Tầng Data Access
└── types/            Định nghĩa kiểu dữ liệu TypeScript dùng chung
supabase/migrations/  Các script SQL migration chạy theo thứ tự
```

### Nguyên tắc Kiến trúc & Tách biệt Trách nhiệm (Clean Code Architecture)

1. **Single Responsibility Principle (SRP) — Đơn trách nhiệm:**
   - Mỗi file, component, hook hoặc pure function chỉ chịu trách nhiệm cho **MỘT mục đích duy nhất**.
   - **Tuyệt đối không "dồn cục" (monolithic bundling):** Không gom chung Header, Filter/Search Bar, KPI Telemetry Cards, Form nhập/sửa Modal, Table dữ liệu và thuật toán tổng hợp vào chung một tệp `.tsx`.
   - Khi một component phình to hoặc đảm nhận từ 2 trách nhiệm hiển thị/điều khiển trở lên, **bắt buộc phải bóc tách** thành các component con (ví dụ: `*Table.tsx`, `*Modal.tsx`, `*Card.tsx`, `*Bar.tsx`).

2. **Separation of Concerns (SoC) — Tách biệt mối quan tâm:**
   - Phân định ranh giới rành mạch giữa 3 tầng:
     - **Tầng Logic & Toán nghiệp vụ (`src/lib/`):** Các hàm thuần (Pure Functions), độc lập hoàn toàn với React JSX/DOM, nhận input và trả output, được kiểm thử tự động 100% bằng Vitest.
     - **Tầng Trạng thái & Điều phối (`src/hooks/`, `src/context/`):** Quản lý vòng đời dữ liệu, kết nối Supabase, form state, caching và xử lý side-effects.
     - **Tầng Hiển thị / UI View (`src/components/`):** Chuyên trách trình bày giao diện (Specular Glassmorphism, Responsive, Typography, Tokens), nhận dữ liệu qua props và phát tín hiệu qua callbacks/events.

3. **Decoupling UI and Business Logic — Tách rời Giao diện và Logic Nghiệp vụ:**
   - **Tuyệt đối không nhúng công thức nghiệp vụ vào `.tsx`:** Mọi phép tính tiền, lãi, ngày tháng, LTV, hạn mức, phân nhóm nợ, bảng kê, công nợ... phải nằm ở `src/lib/`. View chỉ gọi hàm hoặc hook và hiển thị kết quả.
   - Tránh việc view tự phân tích dữ liệu thô (raw data parsing) hoặc tự chạy các vòng lặp aggregate phức tạp ngay trong lúc render.

### Nguyên tắc tách biệt logic (`src/lib/`)

| Tệp | Trách nhiệm |
| :--- | :--- |
| `src/lib/loanMath.ts` | Sinh lịch trả nợ, tính lãi theo ngày thực tế/365, phân bổ gốc, phân nhóm nợ |
| `src/lib/collateralMath.ts` | Chính sách LTV theo phân loại tài sản, kiểm tra hiệu lực định giá |
| `src/lib/creditLimit.ts` | Tổng mức cấp, kiểm soát hạn mức theo tài sản và theo nhóm HĐTD |
| `src/lib/calcMath.ts` | Công thức cho 8 công cụ tính toán (EMI, EAR, DTI, phí phạt tất toán sớm) |
| `src/lib/rateResolution.ts` | Xác định lãi suất hiệu lực, dựng cột lãi suất cho form |
| `src/lib/rateQuote.ts` | Chào lãi suất theo chương trình từng thời kỳ, phí dịch vụ, điều kiện thẻ |
| `src/lib/cof.ts` | Biểu lãi suất mua bán vốn nội bộ (FTP bán - COF / FTP mua - VOF) |
| `src/lib/stkPledge.ts` | Cầm cố sổ tiết kiệm, tái tục nhiều kỳ, phạt chậm trả |
| `src/lib/utils.ts` | Định dạng tiền tệ, ngày tháng, `parseMoneyInput`, `todayIso` |
| `src/lib/api.ts` | Tầng giao tiếp cơ sở dữ liệu Supabase |

Toàn bộ logic tính toán tài chính **bắt buộc phải là hàm thuần trong `src/lib/`**, tuyệt đối không viết công thức tính tiền trực tiếp trong các component React (`.tsx`).

### Danh bạ hàm nghiệp vụ dùng chung — gọi, không chép lại

| Nhu cầu | Hàm dùng chung | Tệp |
| :--- | :--- | :--- |
| Tiền phạt quá hạn (150% gốc + 10% lãi) | `computeSchedulePenalty` | `loanMath.ts` |
| Số ngày quá hạn thực tế của một kỳ | `overdueDaysOfSchedule` | `loanMath.ts` |
| Ngày hôm nay chuẩn múi giờ VN (YYYY-MM-DD) | `todayIso` | `utils.ts` |
| Số ngày còn lại tới một mốc | `daysUntil` | `utils.ts` |
| Mốc thu lãi hàng tháng kế tiếp | `monthlyDueInfo` | `dueList.ts` |
| Tổng mức cấp / dư nợ / khả dụng của khách | `totalsOfCreditContracts` | `creditContract.ts` |
| Dư nợ của một khoản vay | `outstandingOf` | `loanMath.ts` |
| Lãi suất đang áp dụng | `getEffectiveActiveRate` | `rateResolution.ts` |
| Đọc số tiền từ ô nhập (chỉ chữ số) | `parseMoneyInput` | `utils.ts` |
| Đọc số tiền lẻ đồng | `parseMoneyDecimalInput` | `utils.ts` |
| In tài liệu sạch qua iframe ẩn | `printHtmlDoc` | `printHtmlDoc.ts` |

---

## 3. Các bài học kỹ thuật xương máu từ `CONVENTIONS.md`

### 1. Không dùng `||` khi `0` là giá trị hợp lệ
- **Lỗi từng xảy ra**: `parseFloat('0') || 80` cho ra `80`, biến tài sản "Hạn chế nhận TS" (LTV chính sách 0%) thành tài sản bậc cao nhất (80%).
- **Quy tắc**: Luôn kiểm tra `null`/`undefined`/`NaN` tường minh. Phân biệt rõ `0` (con số có thật) và `null` (chưa khai).

### 2. Cấm dùng `toISOString().split('T')[0]` lấy ngày hôm nay
- **Lỗi từng xảy ra**: `toISOString()` lấy giờ UTC, trước 07:00 sáng tại Việt Nam (UTC+7) luôn trả về **ngày hôm qua**, dẫn tới tính sai mốc điều chỉnh lãi suất và xét nhầm hiệu lực HĐTD.
- **Quy tắc**: Luôn dùng `todayIso()` từ `src/lib/utils.ts`.

### 3. Không nuốt lỗi và không tự đoán ý
- Bắt lỗi rồi lưu lại sau khi xoá bớt trường sẽ khiến giao diện báo thành công trong khi dữ liệu bị mất.
- Không tự ý sinh lại số KUNN mà không kiểm tra DB. Trùng số phải báo lỗi rõ ràng để banker tra chứng từ.

### 4. Không nhét dữ liệu nghiệp vụ vào trường ghi chú (`Note`)
- Mỗi thông tin nghiệp vụ bắt buộc phải có cột riêng trong CSDL.
- Nhét vào `Note` không truy vấn được, không kiểm toán được, và tạo ra nguồn thứ hai trôi dạt khỏi cột thật.

### 5. Hai chế độ lãi suất loại trừ nhau (Ưu đãi vs Thông thường)
- Một KUNN chỉ thuộc một trong hai chế độ:
  - **Chế độ Ưu đãi**: Lưu `PreferentialRate`, `PreferentialPeriodMonths`, `PostPreferentialRate`, `MarginRate`; để trống `BaseRate`, `NormalRate`.
  - **Chế độ Thông thường**: Lưu `BaseRate`, `MarginRate`, `NormalRate`; để trống `PreferentialRate`, `PreferentialPeriodMonths`.
- Khi banker chọn chế độ này thì nhánh kia phải xoá hoàn toàn, không lưu song song.

### 6. Phụ trội điều kiện (`PenaltySurcharge`)
- Lưu theo **điểm phần trăm** (`0.2` = 0,20%), **không** được đưa qua `toPercent()` (sẽ biến thành 20%).
- Sàn lãi suất áp cho phần định giá trước, sau đó phụ trội cộng lên sau: `applyRateFloor(BaseRate + MarginRate) + PenaltySurcharge`.

### 7. Đóng HĐTD khác với hết hạn hiệu lực
- Đóng HĐTD chỉ là **dừng quyền giải ngân mới** (`available = 0`), **không phải xoá nợ**.
- KUNN còn nợ vẫn tiếp tục trả theo lịch cho tới khi tất toán (`isKunnSettled` chỉ đọc cờ `IsSettled` của chính KUNN).
- Không được phép đóng HĐTD nếu còn KUNN chưa tất toán (được bảo vệ bởi trigger CSDL).

---

## 4. Mô hình bảo mật & Row Level Security (RLS)

### Xác thực & Phân quyền

- Bắt buộc đăng nhập, **không hỗ trợ tự đăng ký**.
- **Phân quyền dữ liệu**:
  - `admin`: Xem và quản trị toàn bộ dữ liệu.
  - `banker`: Chỉ xem và thao tác trên khách hàng do mình phụ trách (`Customers.OwnerId`).
- Quyền trên TSĐB, HĐTD, KUNN, thẻ tín dụng và lịch trả nợ được **suy ra tự động theo quan hệ tới Khách hàng**, không cần cấu hình riêng.

### Row Level Security (RLS)

- RLS được bật trên **100% các bảng**.
- Khoá `anon` nằm công khai trên client, nên RLS là lớp phòng thủ duy nhất.
- Bảng chưa dùng tới được bật RLS **không kèm policy** (ngăn chặn truy cập mặc định).
- **Sinh ID**: Phải do CSDL đảm nhiệm qua sequence. Không tính `max(Id)+1` ở phía client vì dưới RLS client chỉ thấy một phần dữ liệu của mình.
- `service_role` key **tuyệt đối không đưa vào mã nguồn client**, chỉ sử dụng qua Supabase Edge Functions khi cần.

---

## 5. Thuật ngữ ngân hàng & Ký hiệu viết tắt

| Ký hiệu | Tên đầy đủ | Giải thích nghiệp vụ |
| :--- | :--- | :--- |
| **HMTD** | Hạn mức tín dụng | Khoản cấp tín dụng tuần hoàn bổ sung vốn lưu động (vay – trả – tự phục hồi hạn mức). |
| **TL** | Cho vay từng lần | Khoản vay không tuần hoàn đầu tư tài sản/tiêu dùng (dư nợ giảm dần, trả hết là tất toán). |
| **HĐTD** | Hợp đồng tín dụng | Hợp đồng khung (đối với HMTD) hoặc hợp đồng vay cụ thể (đối với TL). |
| **GNN / KUNN** | Giấy nhận nợ / Khế ước nhận nợ | Văn bản xác nhận số tiền, thời hạn và lãi suất của từng lần rút vốn/giải ngân cụ thể. |
| **GN** | Giải ngân | Hành động xuất tiền từ ngân hàng chuyển cho bên vay hoặc bên thụ hưởng. |
| **LS / LSCV** | Lãi suất cho vay | Tỷ lệ phần trăm tính tiền lãi (%/năm). |
| **LSCS** | Lãi suất cơ sở | Lãi suất tham chiếu dùng để tính lãi suất thả nổi sau thời gian ưu đãi. |
| **TSBĐ / TSĐB** | Tài sản bảo đảm | Tài sản thế chấp/cầm cố để đảm bảo cho nghĩa vụ trả nợ. |
| **LTV** | Loan-to-Value | Tỷ lệ cho vay tối đa trên giá trị định giá của tài sản bảo đảm. |
| **COF** | Cost of Funds | Giá vốn nội bộ (FTP bán) mà Hội sở điều chuyển cho đơn vị kinh doanh. |

---

## 6. Công thức & Quy chuẩn tài chính

### Tính lãi theo số ngày thực tế (Actual/365)

```
Tiền lãi = Dư nợ đầu kỳ × Lãi suất năm × Số ngày thực tế trong kỳ / 365
```

Số ngày tính lãi là **số ngày thực tế giữa hai mốc** (Actual/365), không làm tròn 30 ngày. Vì vậy tiền lãi có thể tăng ở tháng 31 ngày so với tháng 28 ngày dù dư nợ giảm.

### Bất biến quan trọng nhất

```
Σ(Tiền gốc các kỳ) = Tổng số tiền vay giải ngân
```

Bất biến này phải đúng ở **mọi phương thức trả nợ** (trả góp đều, trả gốc cuối kỳ, ân hạn, giải ngân theo tiến độ, trả nợ trước hạn).

### Làm tròn tiền gốc

Làm tròn **LÊN** bước 10.000đ theo chuẩn core banking (`PRINCIPAL_ROUND_MODE`). Kỳ cuối cùng gánh phần lẻ dư để đảm bảo khớp đúng tổng số tiền vay. Nếu KUNN có thoả thuận gốc cố định, dùng `MonthlyPrincipalAmount` (migration 36).

### Trả góp đều (EMI)

```
EMI = P × [r(1+r)^n] / [(1+r)^n − 1]
```
Trong đó $P$ là số tiền vay, $r$ là lãi suất kỳ (tháng), $n$ là tổng số kỳ.

### Lãi suất hiệu lực (EAR) & Quy đổi lãi phẳng

```
EAR = (1 + r/m)^m − 1
r_giảm_dần ≈ (r_phẳng × 2 × n) / (n + 1)
```

### Chính sách LTV & Hiệu lực định giá TSĐB

| Phân loại tài sản | LTV tối đa |
| :--- | ---: |
| Bất động sản Loại 1 | 80% |
| Bất động sản Loại 2 | 70% |
| Bất động sản Loại 3 | 60% |
| Bất động sản Loại 4 | 55% |
| **Hạn chế nhận TS** | **0%** *(Trình ngoại lệ phê duyệt)* |
| Sổ tiết kiệm cùng hệ thống | 100% |
| Sổ tiết kiệm khác hệ thống | 90% |
| Giấy tờ có giá | 80% |
| Phương tiện vận tải | 70% |
| Máy móc thiết bị | 60% |
| Hàng hóa, Quyền tài sản | 50% |

- **Hiệu lực định giá**: Chứng thư định giá chỉ có giá trị tính hạn mức trong thời hạn hiệu lực (6, 12 hoặc 24 tháng). Khi hết hiệu lực, `usableCapacity` trả về **0** và hệ thống cảnh báo cần định giá lại.
- **So khớp mã tài sản**: Khi lọc `CollateralIds` (dạng `"1,5,12"`), bắt buộc tách theo dấu phẩy rồi so từng phần tử, không dùng `LIKE '%1%'` vì sẽ khớp nhầm `10`, `21`.

### Phân nhóm nợ tự động

Căn cứ số ngày quá hạn lớn nhất của các kỳ chưa thanh toán:
- **Nhóm 1 (Đủ tiêu chuẩn)**: Quá hạn < 10 ngày.
- **Nhóm 2 (Cần chú ý)**: Quá hạn từ 10 đến 90 ngày.
- **Nhóm 3 (Dưới tiêu chuẩn)**: Quá hạn từ 91 đến 180 ngày.
- **Nhóm 4 (Nghi ngờ)**: Quá hạn từ 181 đến 360 ngày.
- **Nhóm 5 (Có khả năng mất vốn)**: Quá hạn trên 360 ngày.

---

## 7. Ba tầng hạn mức tín dụng & Vòng đời khoản vay

```
Phê duyệt HMTD  →  Hợp đồng tín dụng (HĐTD)  →  Giấy nhận nợ (KUNN)
```

1. **Hạn mức tín dụng (HMTD) — Vay bổ sung vốn lưu động**:
   - Vay – trả – tự phục hồi hạn mức khả dụng (`available = granted − used`).
   - HĐTD hạn mức 12–24 tháng (thời gian rút vốn); KUNN 3–12 tháng (thời hạn trả nợ từng món).
   - Lãi trả hàng tháng, gốc trả 1 lần cuối kỳ KUNN.
   - Khi HĐTD hết hạn, không được rút mới; các KUNN còn lại chuyển sang chế độ thu hồi nợ đến khi đáo hạn.
2. **Cho vay từng lần (TL) — Mua sắm tài sản / Dự án trung dài hạn**:
   - HĐTD và KUNN gộp làm một, thời hạn từ 60 đến 360 tháng.
   - Không phục hồi hạn mức khi trả gốc.
   - Hỗ trợ giải ngân theo tiến độ và ân hạn gốc giai đoạn đầu. Gốc trả đều hàng tháng sau ân hạn.
3. **Chốt chặn ngày đáo hạn**:
   - Dãy kỳ trả nợ kết thúc tại ngày đáo hạn của KUNN/khoản vay.
   - Đổi kỳ hạn phải dùng cơ chế đối chiếu (`reconcileScheduleRows`), không xoá trắng lịch cũ để bảo toàn lịch sử thu nợ.
4. **Viết SQL thống kê rà soát hạn mức**:
   - Phải gom theo tiền tố HĐTD gốc trước khi cộng mức cấp: `coalesce(nullif("LoanAmount", 0), "ContractAmount", 0)`.
   - Không cộng thẳng từng dòng KUNN vì sẽ nhân ảo mức cấp lên gấp nhiều lần.

---

## 8. Quy trình 7 bước chuẩn khi sửa đổi logic tiền

1. **Đọc kỹ tài liệu này** và `CONVENTIONS.md`.
2. **Viết test kiểm thử trước** (Red-Green-Refactor), đặc biệt kiểm tra bất biến `Σ(gốc) = Tiền vay`.
3. **Cài đặt logic tại `src/lib/`**, không nhúng phép tính vào `.tsx`.
4. Chạy kiểm thử: `npm test && npm run build`.
5. Nếu có thay đổi CSDL: Tạo migration trong `supabase/migrations/`, **áp dụng migration trên Supabase trước khi deploy mã nguồn**.
6. Kiểm chứng thực tế: Kiểm tra file xuất, giao diện trực quan và phản hồi từ CSDL.
7. Cập nhật tiến độ vào `PROGRESS.md`.
