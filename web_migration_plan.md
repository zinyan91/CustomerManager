# Chuyển đổi Hệ thống Quản lý Tín dụng sang Web — Tình trạng triển khai

> Tài liệu này ban đầu là **kế hoạch**. Nay được viết lại thành **báo cáo tình trạng thực tế**, đối chiếu với mã nguồn và cơ sở dữ liệu đang chạy.
>
> Cập nhật: 03/08/2026

---

## 1. Tổng quan

- **Hệ thống gốc:** Ứng dụng WPF Desktop (.NET) kết nối Supabase PostgreSQL Cloud.
- **Hệ thống web:** React 19 + TypeScript + Vite + TailwindCSS, triển khai trên Vercel, đáp ứng đa thiết bị, có giao diện Sáng/Tối.
- **Kiến trúc dữ liệu:** Trình duyệt gọi **thẳng** Supabase qua `@supabase/supabase-js`. **Không có tầng backend riêng.**

> **Khác biệt so với kế hoạch ban đầu:** từng tồn tại một tầng serverless trong thư mục `api/` dùng thư viện `pg` kết nối trực tiếp PostgreSQL. Tầng này **chưa bao giờ được frontend gọi tới**, đồng thời làm lộ mật khẩu quản trị cơ sở dữ liệu, và sẽ ngừng hoạt động sau khi bật RLS vì không mang danh tính người dùng. **Đã xoá bỏ hoàn toàn.**

---

## 2. Tiến độ theo giai đoạn

### Giai đoạn 1 — Nền tảng công nghệ & cơ sở dữ liệu ✅

| Hạng mục | Tình trạng |
| :--- | :--- |
| Khởi tạo dự án Vite + TypeScript + Tailwind | ✅ Hoàn thành |
| Tích hợp Supabase SDK | ✅ Hoàn thành |
| Bảo tồn nguyên vẹn lược đồ CSDL hiện có | ✅ Hoàn thành |

### Giai đoạn 2 — Thư viện giao diện ✅

| Hạng mục | Tình trạng |
| :--- | :--- |
| Bảng màu & chủ đề Sáng/Tối | ✅ Hoàn thành |
| Sidebar điều hướng theo phân hệ | ✅ Hoàn thành |
| Header, thanh trạng thái kết nối, thông tin người dùng | ✅ Hoàn thành |
| Bộ thành phần dùng chung (bảng, biểu mẫu, hộp thoại, nhãn) | ✅ Hoàn thành |

### Giai đoạn 3 — Các phân hệ nghiệp vụ

#### 3.1 Khách hàng & Khách hàng liên quan ✅
- ✅ Tra cứu theo Mã CIF, Họ tên, Số CCCD
- ✅ Khai báo hồ sơ pháp lý và thông tin hôn nhân / KHLQ
- ✅ Kiểm tra trùng CIF và trùng CCCD khi lưu
- ✅ Nhập / xuất CSV

#### 3.2 Hợp đồng tín dụng & Giấy nhận nợ (KUNN) ✅
- ✅ Tra cứu đa tiêu chí, phân loại theo phương thức vay
- ✅ Lịch trả nợ tự động: gốc trả đều, gốc cuối kỳ, ân hạn gốc, trả trước hạn
- ✅ Lãi suất thả nổi theo lịch sử điều chỉnh; lãi suất ưu đãi theo kỳ
- ✅ Ghi nhận thu nợ từng kỳ, tính số ngày quá hạn và lãi phạt
- ✅ Cảnh báo hạn KUNN và hạn HĐTD theo mức độ rủi ro
- ✅ Tự động phân nhóm nợ 1–5 theo số ngày quá hạn

#### 3.3 Tài sản bảo đảm ✅
- ✅ Tra cứu theo CIF, tên chủ sở hữu, mã chứng thư
- ✅ Phân loại và áp tỷ lệ LTV theo chính sách
- ✅ Theo dõi hạn định giá, tự tính ngày hết hiệu lực
- ✅ Gán một hoặc nhiều TSĐB cho hợp đồng
- ✅ Xoá TSĐB, có chặn khi tài sản đang thế chấp cho khoản vay

**Chính sách LTV** (nguồn duy nhất: `src/lib/collateralMath.ts`):

| Phân loại | LTV | | Phân loại | LTV |
| :--- | ---: | :--- | :--- | ---: |
| Loại 1 | 80% | | Sổ tiết kiệm cùng hệ thống | 100% |
| Loại 2 | 70% | | STK khác hệ thống | 90% |
| Loại 3 | 60% | | Giấy tờ có giá | 80% |
| Loại 4 | 55% | | Phương tiện vận tải | 70% |
| **Hạn chế nhận TS** | **0%** | | Máy móc thiết bị | 60% |
| | | | Hàng hóa, Quyền tài sản | 50% |

> **Tài sản hạn chế nhận:** LTV theo chính sách là **0%**. Cho vay trên tài sản đó là **trường hợp ngoại lệ, bắt buộc có phê duyệt của cấp có thẩm quyền**. Hệ thống buộc người nhập xác nhận và đánh dấu `⚠ NGOẠI LỆ` trên danh sách để bộ phận kiểm soát rà soát được.

#### 3.4 Thẻ tín dụng ✅ / Kiểm soát sau vay ⬜
- ✅ Phân loại diện mở thẻ: cầm cố STK, quan hệ tín dụng (liên kết TSĐB), tín chấp
- ✅ Tính hạn mức đề xuất theo TSĐB liên kết
- ⬜ **Phân hệ Kiểm soát sau vay chưa xây dựng** — hiện là màn hình chờ. Bảng `PostLoanControls` đã tồn tại nhưng rỗng và đang bị RLS chặn theo nguyên tắc từ chối mặc định.

#### 3.5 Công cụ tính toán ✅
Tám công cụ phục vụ tư vấn: lịch trả nợ, cầm cố STK một kỳ và nhiều kỳ, giảm lãi suất, khả năng vay theo DTI/LTV, phân tích trả trước hạn, so sánh phương thức trả nợ, quy đổi lãi suất phẳng ↔ dư nợ giảm dần ↔ EAR.

### Giai đoạn 4 — Bảo mật, đồng bộ, hiệu năng

| Hạng mục | Tình trạng |
| :--- | :--- |
| **Xác thực & phân quyền** | ✅ **Hoàn thành** |
| **Row Level Security** | ✅ **Hoàn thành, đã kiểm chứng thực nghiệm** |
| Đồng bộ realtime | ⬜ Chưa làm |
| Bộ nhớ đệm phía client (React Query / SWR) | ⬜ Chưa làm |

**Về xác thực:** bắt buộc đăng nhập, đã tắt tự đăng ký. Hai vai trò: `admin` xem toàn bộ, `banker` chỉ xem khách hàng mình phụ trách qua `Customers.OwnerId`. Quyền trên TSĐB, hợp đồng, thẻ, lịch trả nợ suy ra theo quan hệ tới khách hàng.

**Về RLS:** bật trên **toàn bộ bảng**, kể cả các bảng kế thừa chưa dùng tới. Đã kiểm chứng bằng thực nghiệm: đăng nhập song song hai tài khoản, banker chỉ nhìn thấy 2 khách hàng trong khi admin thấy 47 — kể cả TSĐB, hợp đồng và số liệu tổng hợp trên Dashboard đều được lọc đúng.

> **Điểm cần hiểu đúng:** khoá `anon` của Supabase **nằm công khai** trong gói JavaScript gửi tới trình duyệt. Màn hình đăng nhập chỉ chặn người dùng thông thường. **RLS là lớp phòng thủ duy nhất và thực sự.** Tắt RLS đồng nghĩa mở toàn bộ dữ liệu khách hàng cho bất kỳ ai biết gọi API.

### Giai đoạn 5 — Kiểm thử & triển khai

| Hạng mục | Tình trạng |
| :--- | :--- |
| Kiểm thử logic tài chính | ✅ 116 test tự động |
| Kiểm thử thành phần giao diện | ⬜ Chưa có |
| Triển khai production (Vercel, HTTPS) | ✅ Hoàn thành |
| Tên miền riêng | ⬜ Chưa cấu hình |
| Tài liệu hướng dẫn sử dụng | ⬜ Chưa có |

---

## 3. Việc còn lại

| Ưu tiên | Hạng mục |
| :--- | :--- |
| Cao | Bật chính sách mật khẩu Supabase trước khi cấp tài khoản cho nhân viên thật |
| Cao | Rà soát 2 tài sản có LTV lệch khỏi bậc phân loại (xem mục 4) |
| Trung bình | Xây dựng phân hệ Kiểm soát sau vay |
| Trung bình | Màn hình quản trị người dùng — **bắt buộc qua Edge Function**, không đưa `service_role` key vào frontend |
| Trung bình | Tách nhỏ `LoanPortfolioView` (khoảng 2.300 dòng) |
| Thấp | Đồng bộ realtime, bộ nhớ đệm client, tên miền riêng, tài liệu người dùng |

---

## 4. Vấn đề đã biết, cần rà soát nghiệp vụ

Hai tài sản có tỷ lệ LTV không khớp với bậc phân loại của nó:

| Phân loại | LTV đang lưu | Theo chính sách | Đánh giá |
| :--- | ---: | ---: | :--- |
| Loại 1 | 70% | 80% | Thận trọng hơn chính sách — không phát sinh rủi ro |
| Loại 3 | 70% | 60% | Cao hơn chính sách, hạn mức vượt khoảng 160 triệu đồng |

`LtvPercent` là trường nhập tay nên đây **có thể là ngoại lệ đã được phê duyệt**. Hệ thống không tự động điều chỉnh; cần người có thẩm quyền xác nhận.

---

## 5. Các lỗi đã khắc phục

Ghi lại để tránh tái diễn:

| Vấn đề | Bản chất |
| :--- | :--- |
| Mật khẩu quản trị CSDL nằm trong mã nguồn, repository công khai | Đã gỡ, xoay vòng toàn bộ khoá, chuyển repository sang riêng tư |
| Ứng dụng không có xác thực, RLS chưa bật | Đã bổ sung đăng nhập và bật RLS toàn bộ bảng |
| Sinh ID bằng `max(Id)+1` ở phía client | Dưới RLS, client chỉ thấy phần dữ liệu của mình nên giá trị luôn sai. Đã trả về cho database qua sequence |
| Liên kết TSĐB của 39 hợp đồng lưu dưới dạng chuỗi trong trường `Note` | Đã chuyển về cột riêng, đối chiếu từng dòng với bản sao lưu |
| Diện mở thẻ bị mất âm thầm mỗi lần lưu | Cột kiểu số nhận chuỗi mô tả; nhánh bắt lỗi xoá trường rồi lưu lại nên giao diện báo thành công. Đã sửa kiểu cột |
| Tài sản hạn chế nhận được lưu với LTV 80% | `parseFloat('0') \|\| 80` cho ra 80 vì số 0 là giá trị giả trong JavaScript |
| Bốn bản `getEffectiveLtv` khác nhau ở bốn màn hình | Cùng một tài sản cho ba hạn mức cho vay khác nhau. Đã gộp về một nguồn |
| `getMasterHdtdNumber` đọc số hợp đồng từ cột kiểu timestamp | Tàn dư thiết kế cũ; sẽ hiển thị dấu thời gian ở vị trí số hợp đồng nếu cột có giá trị |
| Tầng `api/` là mã nguồn chết và làm lộ thông tin đăng nhập | Đã xoá |
