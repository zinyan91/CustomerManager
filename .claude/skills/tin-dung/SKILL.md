---
name: tin-dung
description: Kiến thức nghiệp vụ, quy ước kỹ thuật, mô hình bảo mật, công thức tài chính và hướng dẫn phát triển của hệ thống CustomerManager. Dùng khi làm bất cứ việc gì liên quan tới lãi, gốc, lịch trả nợ, LTV, tài sản bảo đảm, hạn mức tín dụng, cho vay từng lần, phân nhóm nợ, sản phẩm vay, giải ngân theo tiến độ, phí phạt trả trước, bảo mật RLS, kiến trúc dự án hoặc thiết lập môi trường trong codebase này.
---

# Hướng Dẫn & Nghiệp Vụ Tín Dụng — CustomerManager

Ứng dụng web quản lý hồ sơ tín dụng ngân hàng: khách hàng, hợp đồng tín dụng (HĐTD), giấy nhận nợ (KUNN), tài sản bảo đảm (TSĐB), thẻ tín dụng, lịch trả nợ và các công cụ tính toán phục vụ tư vấn.

Mã nguồn **không chứa chú thích trực tiếp**. Toàn bộ quy ước, mô hình bảo mật, kiến trúc và công thức tài chính được tập trung tại tài liệu này và file `CONVENTIONS.md`.

> **Quy tắc bất biến:** Đọc tài liệu này trước khi sửa bất cứ thứ gì liên quan tới tiền, lãi, gốc, LTV, hạn mức hoặc bảo mật cơ sở dữ liệu.

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

### Nguyên tắc tách biệt logic (`src/lib/`)

| Tệp | Trách nhiệm |
| :--- | :--- |
| `src/lib/loanMath.ts` | Sinh lịch trả nợ, tính lãi theo ngày thực tế/365, phân bổ gốc, phân nhóm nợ |
| `src/lib/collateralMath.ts` | Chính sách LTV theo phân loại tài sản, kiểm tra hiệu lực định giá |
| `src/lib/creditLimit.ts` | Tổng mức cấp, kiểm soát hạn mức theo tài sản và theo nhóm HĐTD |
| `src/lib/calcMath.ts` | Công thức cho 8 công cụ tính toán (EMI, EAR, DTI, phí phạt tất toán sớm) |
| `src/lib/rateQuote.ts` | Chào lãi suất theo chương trình từng thời kỳ, phí dịch vụ, điều kiện thẻ |
| `src/lib/cof.ts` | Biểu lãi suất mua bán vốn nội bộ (FTP bán - COF / FTP mua - VOF) |
| `src/lib/stkPledge.ts` | Cầm cố sổ tiết kiệm, tái tục nhiều kỳ, phạt chậm trả |
| `src/lib/utils.ts` | Định dạng tiền tệ, ngày tháng, `parseMoneyInput`, `todayIso` |
| `src/lib/api.ts` | Tầng giao tiếp cơ sở dữ liệu Supabase |

Toàn bộ logic tính toán tài chính **bắt buộc phải là hàm thuần trong `src/lib/`**, tuyệt đối không viết công thức tính tiền trực tiếp trong các component React (`.tsx`).

---

## 3. Bốn nguyên tắc bắt buộc khi phát triển

1. **Một quy tắc nghiệp vụ chỉ cài ở MỘT nơi.** Cần dùng lại thì import, tuyệt đối không copy hàm sang file khác để tránh trôi dạt logic.
2. **Không dùng `||` khi số 0 là giá trị hợp lệ.** `parseFloat('0') || 80` sẽ cho ra `80`. Luôn dùng kiểm tra `null`/`undefined`/`NaN` tường minh.
3. **Không nuốt lỗi.** Bắt lỗi rồi lưu lại sau khi xoá bớt trường sẽ khiến giao diện báo thành công trong khi dữ liệu bị mất.
4. **Sửa gì liên quan tới tiền thì viết test trước.** Đảm bảo bất biến tài chính không bị phá vỡ trước khi commit.

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
- **Sinh ID**: Phải do CSDL đảm nhiệm qua sequence. Không tính `max(Id)+1` ở phía client vì dưới RLS client chỉ thấy một phần dữ liệu.
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

## 6. Công thức & Quy chuẩn nghiệp vụ

### Tính lãi theo số ngày thực tế

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

Làm tròn **LÊN** bước 1.000đ hoặc 10.000đ theo chuẩn core banking. Kỳ cuối cùng gánh phần lẻ dư để đảm bảo khớp đúng tổng số tiền vay.

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

---

## 8. Quy trình 7 bước chuẩn khi sửa đổi logic tiền

1. **Đọc kỹ tài liệu này** và `CONVENTIONS.md`.
2. **Viết test kiểm thử trước** (Red-Green-Refactor), đặc biệt kiểm tra bất biến `Σ(gốc) = Tiền vay`.
3. **Cài đặt logic tại `src/lib/`**, không nhúng phép tính vào `.tsx`.
4. Chạy kiểm thử: `npm test && npm run build`.
5. Nếu có thay đổi CSDL: Tạo migration trong `supabase/migrations/`, **áp dụng migration trên Supabase trước khi deploy mã nguồn**.
6. Kiểm chứng thực tế: Kiểm tra file xuất, giao diện trực quan và phản hồi từ CSDL.
7. Cập nhật tiến độ vào `PROGRESS.md`.
