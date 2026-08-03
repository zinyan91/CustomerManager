# Quy ước & Kiến thức nghiệp vụ

Mã nguồn không chứa chú thích. Toàn bộ giải thích "vì sao" nằm ở đây.

Đọc file này trước khi sửa bất cứ thứ gì liên quan tới tiền: lãi, gốc, LTV, hạn mức.

---

## 1. Nguyên tắc bắt buộc

**Một quy tắc nghiệp vụ chỉ được cài ở MỘT nơi.** Dự án đã trả giá 5 lần cho việc chép hàm ra nhiều file rồi để chúng trôi dạt: `getEffectiveLtv` từng có 4 bản khác nhau khiến cùng một tài sản cho ba hạn mức cho vay khác nhau ở ba màn hình; `getMasterHdtdNumber` 3 bản; `diffDays` 3 bản. Cần dùng lại thì import, không copy.

**Cẩn thận `||` khi số 0 là giá trị hợp lệ.** `parseFloat('0') || 80` cho ra `80`. Chính lỗi này từng biến tài sản "Hạn chế nhận TS" (LTV 0%) thành tài sản bậc cao nhất 80%. Dùng kiểm tra `null`/`undefined`/`NaN` tường minh.

**Không nuốt lỗi.** Bắt lỗi rồi lưu lại sau khi xoá bớt trường sẽ khiến giao diện báo thành công trong khi dữ liệu đã mất. Đây là cách "diện mở thẻ" từng biến mất mỗi lần lưu.

**Không nhét dữ liệu nghiệp vụ vào trường ghi chú.** Mỗi thông tin phải có cột riêng. Từng có 39 hợp đồng lưu liên kết tài sản bảo đảm dưới dạng chuỗi `[COLLATERAL_IDS:...]` trong `Note` — không truy vấn được, không kiểm toán được.

**Sinh ID do cơ sở dữ liệu đảm nhiệm** qua sequence. Không tính `max(Id)+1` ở client: dưới RLS, client chỉ nhìn thấy phần dữ liệu của mình nên con số đó luôn sai và gây trùng khoá chính.

**Viết SQL rà soát phải dùng lại đúng quy tắc đã cài trong code.** Một câu SQL cộng `ContractAmount` mà quên gom theo HĐTD gốc đã tạo ra báo động giả 41 tỷ trên dữ liệu vốn đã đúng.

**Rà soát bảo mật liệt kê tài nguyên từ `pg_tables`,** không suy từ mã nguồn. Cách suy từ code từng bỏ sót 7 bảng đang mở.

---

## 2. Logic tài chính

Toàn bộ nằm trong `src/lib/` dưới dạng hàm thuần, không phụ thuộc React, được phủ 196 test tại `src/lib/__tests__/`.

| Tệp | Nội dung |
| :--- | :--- |
| `loanMath.ts` | Lịch trả nợ, tính lãi, phân bổ gốc, quá hạn, phân nhóm nợ |
| `collateralMath.ts` | Chính sách LTV theo phân loại tài sản |
| `creditLimit.ts` | Tổng mức cấp và chốt kiểm soát theo tài sản bảo đảm |
| `calcMath.ts` | Công thức cho 8 công cụ tính toán (EMI, EAR, DTI) |
| `loanProductRules.ts` | Ràng buộc theo phương thức vay |
| `utils.ts` | Định dạng tiền, phân tích ngày đa định dạng |

Sửa gì liên quan tới tiền thì **viết test trước**. Ba lỗi mất tiền trong dự án này đều do test phát hiện, không ai thấy bằng mắt.

### Công thức tính lãi

```
Lãi = Dư nợ × Lãi suất năm × Số ngày thực tế trong kỳ / 365
```

Vì dùng số ngày thực tế, **tiền lãi có thể TĂNG so với kỳ trước dù dư nợ đã giảm**. Kỳ 15/03–15/04 (31 ngày) cao hơn kỳ 15/02–15/03 (28 ngày) là đúng, không phải lỗi. Có test riêng ghi nhận hành vi này để không ai "sửa" thành sai.

### Bất biến quan trọng nhất

> **Tổng tiền gốc các kỳ luôn bằng đúng số tiền vay**, ở mọi phương thức trả nợ.

Sai bất biến này là ngân hàng thu thừa hoặc thu thiếu của khách hàng. Đây là bài test đã bắt được lỗi trừ đôi tiền trả trước hạn.

### Làm tròn gốc

Làm tròn **LÊN** theo bước 1.000 đồng, chuẩn core banking. Kỳ cuối gánh phần dư để đảm bảo bất biến trên.

### Phương thức trả gốc

`isBulletPrincipal` **chỉ căn cứ vào `PrincipalRepaymentMethod`** mà banker đã chọn. Phương thức vay không được đè lên lựa chọn đó — trước đây `LoanMethod === 'Hạn mức tín dụng'` ép mọi hợp đồng hạn mức thành gốc cuối kỳ, khiến giao diện ghi "Trả đều hàng tháng" nhưng cột gốc của mọi kỳ đều bằng 0.

Hợp đồng hạn mức vẫn **mặc định** "Gốc trả cuối kỳ", nhưng banker đổi được.

### Trả trước hạn

Phải được ghi nhận **kể cả khi kỳ đã tất toán**. Dư nợ trừ đúng bằng phần gốc ghi nhận trong kỳ — `principalInPeriod` đã bao gồm tiền trả trước, cộng thêm lần nữa là trừ đôi và ngân hàng mất gốc.

### Phân nhóm nợ

Theo số ngày quá hạn lớn nhất trong các kỳ **chưa thanh toán**:

| Nhóm | Số ngày quá hạn |
| :--- | :--- |
| 1 — Đủ tiêu chuẩn | dưới 10 |
| 2 — Cần chú ý | 10 – 90 |
| 3 — Dưới tiêu chuẩn | 91 – 180 |
| 4 — Nghi ngờ | 181 – 360 |
| 5 — Có khả năng mất vốn | trên 360 |

---

## 3. Tài sản bảo đảm

Bảng chính sách LTV nằm ở một nơi duy nhất: `src/lib/collateralMath.ts`.

| Phân loại | LTV | | Phân loại | LTV |
| :--- | ---: | :--- | :--- | ---: |
| Loại 1 | 80% | | Sổ tiết kiệm cùng hệ thống | 100% |
| Loại 2 | 70% | | STK khác hệ thống | 90% |
| Loại 3 | 60% | | Giấy tờ có giá | 80% |
| Loại 4 | 55% | | Phương tiện vận tải | 70% |
| **Hạn chế nhận TS** | **0%** | | Máy móc thiết bị | 60% |
| | | | Hàng hóa, Quyền tài sản | 50% |

**Tài sản hạn chế nhận có LTV 0%.** Cho vay trên tài sản đó là **trình ngoại lệ, bắt buộc có phê duyệt của cấp có thẩm quyền**. Hệ thống buộc người nhập xác nhận và đánh dấu `⚠ NGOẠI LỆ` trên danh sách, nhưng không chặn cứng.

Xoá tài sản bảo đảm bị chặn nếu nó đang thế chấp cho khoản vay. So khớp mã tài sản trong chuỗi `CollateralIds` phải tách theo dấu phẩy rồi so từng phần tử — dùng `LIKE '%1%'` sẽ khớp nhầm `10`, `21`.

---

## 4. Hạn mức tín dụng — ba trường hợp

Nghiệp vụ có ba tầng: **Phê duyệt HMTD → HĐTD → KUNN**.

| | Trường hợp | Cách biểu diễn |
| :--- | :--- | :--- |
| **TH1** | Một số HĐTD, nhiều KUNN | `ContractAmount` lặp trên từng dòng KUNN là **đúng**. Gom theo tiền tố `ContractNumber` trước `/GNN-`, lấy giá trị lớn nhất. |
| **TH2** | Khác số HĐTD, **cùng một HMTD** | Khai cùng `CreditLimitCode`. Hạn mức chỉ tính **một lần**. |
| **TH3** | Khác số HĐTD, khác HMTD | Cộng mức cấp của từng hợp đồng. |

Số HĐTD gốc nằm ở **tiền tố của `ContractNumber`**, dạng `HD123/GNN-01`. Cột `HdtdDueDate` **không** chứa số hợp đồng — đó là tàn dư thiết kế cũ đã gỡ bỏ.

### Chốt kiểm soát theo tài sản bảo đảm

Đối chiếu tổng mức cấp với tổng khả năng bảo đảm theo **cụm liên thông** hợp đồng ↔ tài sản, không xét từng tài sản riêng lẻ. Lý do: một hợp đồng thường được bảo đảm bằng nhiều tài sản cộng lại, và một tài sản có thể bảo đảm cho nhiều hợp đồng. Xét lẻ sẽ báo động giả hàng loạt.

---

## 5. Sản phẩm tín dụng

Ràng buộc theo phương thức vay nằm ở `src/lib/loanProductRules.ts`.

### Hạn mức tín dụng — vay ngắn hạn

- Mục đích **cố định** "Sản xuất kinh doanh", ô chọn bị khoá
- Kỳ hạn 12 – 24 tháng
- **Không** áp dụng ân hạn gốc

### Cho vay từng lần — vay dài hạn

- Mục đích: tiêu dùng phục vụ đời sống, xây/sửa chữa nhà, mua nhà
- Kỳ hạn 60 – 360 tháng (5 đến 30 năm)
- Ân hạn gốc: 6 / 12 / 15 / 18 / 24 / 36 tháng

Sai lệch được **cảnh báo, không chặn lưu**. Nghiệp vụ ngân hàng luôn có ngoại lệ được phê duyệt; chặn cứng khiến banker tìm cách lách.

Nhãn hiển thị mục đích vay được viết lại cho rõ nghĩa nhưng **giá trị lưu trong CSDL giữ nguyên**, nên hợp đồng cũ vẫn hiển thị đúng.

---

## 6. Bảo mật

**Khoá `anon` của Supabase nằm công khai** trong gói JavaScript gửi tới trình duyệt. Màn hình đăng nhập chỉ chặn người dùng thông thường. **RLS là lớp phòng thủ duy nhất và thực sự.**

RLS bật trên **toàn bộ bảng**, kể cả bảng chưa dùng tới (bật không kèm policy = chặn hoàn toàn theo nguyên tắc từ chối mặc định).

Kiểm tra nhanh, kỳ vọng không trả về dòng nào:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
```

Phân quyền: `admin` xem tất cả, `banker` chỉ xem khách hàng của mình qua `Customers.OwnerId`. Quyền trên tài sản, hợp đồng, thẻ, lịch trả nợ **suy ra theo quan hệ tới khách hàng**.

**Tạo tài khoản người dùng cần `service_role` key** — tuyệt đối không đưa vào code phía trình duyệt. Nếu làm màn hình quản trị người dùng, phải qua Supabase Edge Function.

Khi RLS chặn một lệnh, Supabase trả về **mảng rỗng mà không báo lỗi**. Mọi lệnh xoá/sửa phải dùng `.select()` và kiểm tra số dòng thực sự bị tác động, nếu không giao diện sẽ báo thành công trong khi chưa có gì thay đổi.

---

## 7. Cơ sở dữ liệu

Script trong `supabase/migrations/` chạy **thủ công qua Supabase SQL Editor**, theo đúng thứ tự số.

> **Thứ tự triển khai:** khi một thay đổi vừa động vào lược đồ vừa động vào mã nguồn, **luôn chạy migration trước rồi mới deploy**. Làm ngược lại sẽ có khoảng thời gian hệ thống ở trạng thái hỏng.

---

## 8. Lệnh thường dùng

```bash
npm run dev        # Máy chủ phát triển
npm run build      # Kiểm tra kiểu + đóng gói
npm test           # 196 test logic tài chính
npm run lint       # Kiểm tra mã nguồn
```
