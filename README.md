# Hệ thống Quản lý Dư nợ Khách hàng & Thẻ Tín dụng

Ứng dụng web quản lý hồ sơ tín dụng ngân hàng: khách hàng, hợp đồng tín dụng (HĐTD) và giấy nhận nợ (KUNN), tài sản bảo đảm (TSĐB), thẻ tín dụng, lịch trả nợ và các công cụ tính toán phục vụ tư vấn.

Đây là bản chuyển đổi lên web của ứng dụng WPF desktop, dùng chung cơ sở dữ liệu Supabase PostgreSQL.

> **Mã nguồn không chứa chú thích.** Mọi giải thích nghiệp vụ, công thức và quy ước nằm ở:
> - **[CONVENTIONS.md](CONVENTIONS.md)** — quy ước, công thức, kiến thức nghiệp vụ
> - **[.claude/skills/tin-dung/SKILL.md](.claude/skills/tin-dung/SKILL.md)** — bản dành cho AI, gọi bằng `/tin-dung`
> - **[PROGRESS.md](PROGRESS.md)** — việc đã xong, đang làm, chuẩn bị làm
>
> Đọc trước khi sửa bất cứ thứ gì liên quan tới tiền.

---

## Công nghệ

| Thành phần | Lựa chọn |
| :--- | :--- |
| Giao diện | React 19 + TypeScript + Vite |
| Kiểu dáng | TailwindCSS 4, hỗ trợ giao diện Sáng/Tối |
| Biểu đồ & biểu tượng | Recharts, Lucide |
| Dữ liệu & xác thực | Supabase (PostgreSQL + Auth + Row Level Security) |
| Kiểm thử | Vitest |
| Triển khai | Vercel |

Ứng dụng gọi thẳng Supabase từ trình duyệt qua `@supabase/supabase-js`. **Không có tầng backend riêng** — an toàn dữ liệu dựa hoàn toàn vào Auth và Row Level Security ở phía cơ sở dữ liệu.

---

## Cài đặt

```bash
npm install
```

Sao chép `.env.example` thành `.env` rồi điền giá trị thật:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

> **Không bao giờ commit file `.env`.** Ứng dụng sẽ báo lỗi ngay khi thiếu biến môi trường thay vì âm thầm dùng giá trị dự phòng — đây là hành vi có chủ đích.

Khi triển khai, khai báo hai biến này trong **Vercel → Settings → Environment Variables**. Vite nhúng biến môi trường vào lúc build, nên sau khi đổi giá trị phải **Redeploy** thì mới có hiệu lực.

## Các lệnh

```bash
npm run dev        # Máy chủ phát triển
npm run build      # Kiểm tra kiểu + đóng gói production
npm test           # Chạy toàn bộ test
npm run test:watch # Test ở chế độ theo dõi
npm run lint       # Kiểm tra mã nguồn
```

---

## Cấu trúc thư mục

```
src/
├── components/
│   ├── views/        Màn hình chính của từng phân hệ
│   ├── portfolio/    Thành phần của phân hệ Khoản vay
│   ├── collateral/   Thành phần của phân hệ TSĐB
│   ├── calculator/   8 công cụ tính toán tín dụng
│   └── documents/    Soạn biểu mẫu hợp đồng
├── context/          Auth, Theme, định dạng ngày
├── lib/              Logic nghiệp vụ thuần + tầng truy cập dữ liệu
└── types/            Định nghĩa kiểu dùng chung
supabase/migrations/  Script SQL chạy thủ công theo thứ tự
```

### Logic nghiệp vụ tách riêng để test được

| Tệp | Nội dung |
| :--- | :--- |
| `lib/loanMath.ts` | Sinh lịch trả nợ, tính lãi theo số ngày thực tế/365, phân bổ gốc |
| `lib/collateralMath.ts` | Chính sách LTV theo phân loại tài sản |
| `lib/calcMath.ts` | Công thức cho các công cụ tính toán (EMI, EAR, DTI…) |
| `lib/utils.ts` | Định dạng tiền tệ, phân tích ngày đa định dạng |
| `lib/api.ts` | Toàn bộ truy vấn Supabase |

Các module `*Math.ts` là hàm thuần, không phụ thuộc React, và được phủ **116 test**. Mọi logic liên quan tới tiền nên đặt ở đây thay vì viết thẳng trong component.

---

## Mô hình bảo mật

### Xác thực

Bắt buộc đăng nhập, **không hỗ trợ tự đăng ký**. Tài khoản do quản trị viên tạo trong Supabase Dashboard (nhớ tích *Auto Confirm User*), sau đó gán vai trò bằng SQL — xem `supabase/migrations/03_user_management.sql`.

### Phân quyền

| Vai trò | Phạm vi dữ liệu |
| :--- | :--- |
| `admin` | Toàn bộ khách hàng |
| `banker` | Chỉ khách hàng do mình phụ trách (`Customers.OwnerId`) |

Quyền trên TSĐB, hợp đồng, thẻ và lịch trả nợ được **suy ra theo quan hệ tới khách hàng**, không cần cấu hình riêng.

### Row Level Security

RLS được bật trên **toàn bộ bảng**. Đây là lớp phòng thủ duy nhất và thực sự: khoá `anon` nằm công khai trong gói JavaScript gửi tới trình duyệt, nên nếu RLS tắt thì bất kỳ ai cũng đọc được toàn bộ dữ liệu khách hàng.

Các bảng chưa dùng tới được bật RLS **không kèm policy** — tức chặn hoàn toàn theo nguyên tắc từ chối mặc định.

Kiểm tra nhanh, kỳ vọng không trả về dòng nào:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

### Nguyên tắc vận hành

- Sinh ID do cơ sở dữ liệu đảm nhiệm qua sequence. **Không tính `max(Id)+1` ở phía client** — dưới RLS, client chỉ nhìn thấy phần dữ liệu của mình nên con số đó luôn sai.
- Không nhét dữ liệu nghiệp vụ vào trường `Note`. Mỗi thông tin phải có cột riêng.
- Tạo tài khoản người dùng cần `service_role` key. Khoá này **tuyệt đối không được đưa vào mã nguồn phía trình duyệt** — nếu làm màn hình quản trị người dùng, phải thực hiện qua Supabase Edge Function.

---

## Nghiệp vụ cần biết

### Tỷ lệ cho vay trên giá trị tài sản (LTV)

Bảng chính sách nằm ở một nơi duy nhất: `src/lib/collateralMath.ts`.

| Phân loại | LTV |
| :--- | ---: |
| Loại 1 | 80% |
| Loại 2 | 70% |
| Loại 3 | 60% |
| Loại 4 | 55% |
| **Hạn chế nhận TS** | **0%** |
| Sổ tiết kiệm cùng hệ thống | 100% |
| STK khác hệ thống | 90% |
| Giấy tờ có giá | 80% |
| Phương tiện vận tải | 70% |
| Máy móc thiết bị | 60% |
| Hàng hóa, Quyền tài sản | 50% |

**Tài sản hạn chế nhận có LTV chính sách là 0%.** Muốn cho vay trên tài sản đó là **trường hợp ngoại lệ, phải có phê duyệt của cấp có thẩm quyền**. Hệ thống không tự chặn nhưng buộc người nhập xác nhận, và đánh dấu `⚠ NGOẠI LỆ` trên danh sách TSĐB để bộ phận kiểm soát nhìn thấy.

### Tính lãi

Theo chuẩn core banking: `Lãi = Dư nợ × Lãi suất năm × Số ngày thực tế trong kỳ / 365`.

Vì dùng số ngày thực tế, **tiền lãi có thể tăng so với kỳ trước dù dư nợ đã giảm** — kỳ 31 ngày sau một kỳ 28 ngày là ví dụ. Đây là hành vi đúng, đã có test ghi nhận để không ai sửa nhầm thành sai.

Bất biến quan trọng nhất: **tổng tiền gốc các kỳ luôn bằng đúng số tiền vay**, ở mọi phương thức trả nợ. Sai bất biến này là ngân hàng thu thừa hoặc thu thiếu của khách hàng.

### Phân nhóm nợ

Tự động theo số ngày quá hạn lớn nhất: Nhóm 1 (đủ tiêu chuẩn) · Nhóm 2 (10–90 ngày) · Nhóm 3 (91–180) · Nhóm 4 (181–360) · Nhóm 5 (trên 360).

### Số HĐTD gốc

Một HĐTD hạn mức có nhiều KUNN. Số HĐTD gốc nằm ở **tiền tố của `ContractNumber`**, dạng `HD123/GNN-01`. Cột `HdtdDueDate` **không** chứa số hợp đồng — đó là tàn dư của thiết kế cũ đã được gỡ bỏ.

---

## Cơ sở dữ liệu

Script trong `supabase/migrations/` được chạy **thủ công qua Supabase SQL Editor**, theo đúng thứ tự số.

| Tệp | Nội dung |
| :--- | :--- |
| `01_roles_and_ownership.sql` | Bảng vai trò, cột `OwnerId`, hàm phân quyền |
| `02_enable_rls.sql` | Bật RLS và policy cho các bảng nghiệp vụ |
| `03_user_management.sql` | Bộ lệnh tra cứu: tạo vai trò, bàn giao khách hàng |
| `04_close_remaining_tables.sql` | Đóng nốt các bảng kế thừa từ hệ thống WPF |
| `05_fix_id_generation.sql` | Đồng bộ sequence, trả việc sinh ID về cho database |
| `06_migrate_note_blobs.sql` | Đưa dữ liệu nghiệp vụ từ `Note` về cột riêng |

> **Thứ tự triển khai:** khi một thay đổi vừa động vào lược đồ vừa động vào mã nguồn, **luôn chạy migration trước rồi mới deploy**. Làm ngược lại sẽ có khoảng thời gian hệ thống ở trạng thái hỏng.

---

## Kiểm thử

```bash
npm test
```

116 test phủ toàn bộ logic tài chính thuần. Component chưa có test — đó là khoảng trống đã biết.

Khi sửa bất kỳ thứ gì liên quan tới tiền, **viết test trước**. Nhiều lỗi trong quá khứ của dự án này chỉ lộ ra khi có người ngồi tính tay lại kết quả.

---

## Những điều đã học được

Ghi lại để không lặp lại:

- **Không chép hàm nghiệp vụ sang nhiều file.** Đã từng có 4 bản `getEffectiveLtv` với 4 hành vi khác nhau, khiến cùng một tài sản cho ra ba hạn mức cho vay khác nhau ở ba màn hình.
- **Cẩn thận với `||` khi số 0 là giá trị hợp lệ.** `parseFloat('0') || 80` cho ra 80 — chính lỗi này từng biến tài sản hạn chế nhận thành tài sản bậc cao nhất.
- **Không nuốt lỗi.** Bắt lỗi rồi lưu lại sau khi xoá bớt trường sẽ khiến giao diện báo thành công trong khi dữ liệu đã mất.
- **Rà soát bảo mật phải liệt kê tài nguyên từ phía cơ sở dữ liệu**, không suy từ mã nguồn ứng dụng. Cách suy từ code từng bỏ sót 7 bảng.
