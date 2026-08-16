---
name: tin-dung
description: Kiến thức nghiệp vụ và công thức của hệ thống quản lý tín dụng CustomerManager. Dùng khi làm bất cứ việc gì liên quan tới lãi, gốc, lịch trả nợ, LTV, tài sản bảo đảm, hạn mức tín dụng, phân nhóm nợ, sản phẩm vay, hoặc phân quyền RLS trong dự án này.
---

# Nghiệp vụ tín dụng — CustomerManager

Mã nguồn **không có chú thích**. Mọi giải thích "vì sao" nằm ở đây và ở `CONVENTIONS.md`.

Đọc trước khi sửa bất cứ thứ gì liên quan tới tiền.

---

## Bốn nguyên tắc bắt buộc

**1. Một quy tắc nghiệp vụ chỉ cài ở MỘT nơi.** Dự án đã trả giá 5 lần: `getEffectiveLtv` từng có 4 bản khác nhau khiến cùng một tài sản cho ba hạn mức khác nhau ở ba màn hình. Cần dùng lại thì import, không copy.

**2. Không dùng `||` khi số 0 là giá trị hợp lệ.** `parseFloat('0') || 80` cho ra `80` — chính lỗi này từng biến tài sản "Hạn chế nhận TS" (LTV 0%) thành 80%. Kiểm tra `null`/`undefined`/`NaN` tường minh.

**3. Không nuốt lỗi.** Bắt lỗi rồi lưu lại sau khi xoá bớt trường → giao diện báo thành công trong khi dữ liệu đã mất.

**4. Sửa gì liên quan tới tiền thì viết test trước.** Ba lỗi mất tiền của dự án đều do test phát hiện, không ai thấy bằng mắt.

---

## Nơi đặt code

| Việc | Tệp |
| :--- | :--- |
| Lãi, gốc, lịch trả nợ, quá hạn, nhóm nợ | `src/lib/loanMath.ts` |
| Đối chiếu lịch khi đổi kỳ hạn | `src/lib/scheduleSync.ts` |
| Trạng thái kỳ đến hạn cho dashboard | `src/lib/duePeriod.ts` |
| Chính sách LTV | `src/lib/collateralMath.ts` |
| Tổng mức cấp, chốt kiểm soát TSĐB | `src/lib/creditLimit.ts` |
| Ràng buộc theo phương thức vay | `src/lib/loanProductRules.ts` |
| Công thức 8 công cụ tính toán | `src/lib/calcMath.ts` |
| Định dạng tiền, phân tích ngày | `src/lib/utils.ts` |
| Truy vấn Supabase | `src/lib/api.ts` |
| Test | `src/lib/__tests__/` |

Logic tài chính **phải** là hàm thuần trong `src/lib/`, không viết trong component.

---

## Công thức

### Lãi theo kỳ

```
Lãi = Dư nợ đầu kỳ × Lãi suất năm × Số ngày thực tế trong kỳ / 365
```

Số ngày là **thực tế giữa hai mốc**, không phải 30. Vì vậy **lãi có thể TĂNG so với kỳ trước dù dư nợ đã giảm** — kỳ 31 ngày sau kỳ 28 ngày. Đây là đúng, có test khoá lại để không ai sửa thành sai.

### Bất biến quan trọng nhất

```
Σ(gốc các kỳ) = Số tiền vay
```

Đúng ở **mọi** phương thức: trả đều, gốc cuối kỳ, có ân hạn, có trả trước hạn. Sai bất biến này là ngân hàng thu thừa hoặc thu thiếu. Đây là bài test đã bắt được lỗi trừ đôi tiền trả trước hạn.

### Làm tròn gốc

Làm tròn **LÊN** bước 1.000đ (chuẩn core banking). Kỳ cuối gánh phần dư để giữ bất biến trên.

### Trả góp đều — EMI

```
EMI  = P × [r(1+r)^n] / [(1+r)^n − 1]
PV   = PMT × [1 − (1+r)^(−n)] / r
```
Hai hệ số là **nghịch đảo** của nhau, có test khứ hồi.

### Lãi suất hiệu lực

```
EAR = (1 + r/m)^m − 1
```
12%/năm ghép lãi tháng → 12,6825%.

### Quy đổi lãi phẳng sang dư nợ giảm dần

```
r_giảm_dần ≈ (r_phẳng × 2 × n) / (n + 1)
```
Lãi dư nợ giảm dần **luôn cao hơn** lãi phẳng tương đương — điểm khách hàng hay hiểu nhầm.

### Hạn mức theo tài sản

```
Hạn mức tối đa = Giá trị định giá × LTV
```

---

## Phân nhóm nợ

Theo số ngày quá hạn lớn nhất trong các kỳ **chưa thanh toán**:

| Nhóm | Ngày quá hạn |
| :--- | :--- |
| 1 — Đủ tiêu chuẩn | < 10 |
| 2 — Cần chú ý | 10 – 90 |
| 3 — Dưới tiêu chuẩn | 91 – 180 |
| 4 — Nghi ngờ | 181 – 360 |
| 5 — Có khả năng mất vốn | > 360 |

---

## Lịch trả nợ và ghi nhận thu

### Khoá chính do cơ sở dữ liệu cấp

`RepaymentSchedules."Id"` là **khoá chính toàn bảng**, không phải số thứ tự trong hợp đồng. Tuyệt đối không sinh `Id` ở client.

Lỗi đã xảy ra ngày 16/08/2026: `Id: s.Id || idx + 1` sinh ra Id 1, 2, 3… rồi `bulkSaveRepaymentSchedulesAPI` đẩy vào nhánh `upsert(onConflict: 'Id')`. Các dòng đó chen thẳng vào chỗ của hợp đồng khác. Hợp đồng 1014 kết cục có **hai bộ kỳ song song**, cùng số kỳ mà khác trạng thái trả, nạp lại thì thứ tự xáo trộn.

Sinh lịch mới thì để trống `Id`, ghi xong **nạp lại từ CSDL** rồi mới đưa lên giao diện.

### Đổi kỳ hạn thì đối chiếu, không xoá rồi ghi lại

Xoá sạch lịch cũ rồi sinh lại là **mất toàn bộ dấu đã thu**. `reconcileScheduleRows` đối chiếu theo **số kỳ**:

| Tình huống | Xử lý |
| :--- | :--- |
| Kỳ đã có | Cập nhật ngày và số tiền, **giữ nguyên phần đã thu** |
| Kỳ mới (5 → 6 tháng) | Thêm |
| Kỳ dư, chưa thu | Xoá |
| Kỳ dư, **đã thu** | **Chặn** |
| Kỳ **trùng số** | **Chặn** |

Hai trường hợp cuối chặn chứ không đoán: hệ thống không tự xoá lịch sử tiền, cũng không tự chọn bản nào là đúng.

### `ActualPaidAmount` đang rỗng, đừng dựa vào nó

Đo ngày 16/08/2026: **836/836 kỳ đã trả đều mang giá trị 0**. Không màn hình nào cho banker nhập số tiền thực thu, nên cột này chưa bao giờ có số thật. Muốn biết một kỳ đã thu hay chưa thì đọc `IsPaid`; đối chiếu số tiền sẽ biến mọi kỳ đã thu thành còn nợ.

Kèm theo, `s.ActualPaidAmount || 0` ở `useLoanPortfolioController.ts` ghi đè `null` thành `0`, xoá mất ranh giới giữa "chưa nhập" và "thu 0đ".

### Panel đến hạn đọc kỳ thật, không suy từ ngày kỷ niệm

Dashboard từng tính ngày đến hạn bằng ngày kỷ niệm của `RepaymentStartDate`, nên báo quá hạn cho khách đã đóng tiền. Nay lấy **kỳ chưa trả sớm nhất** trong `RepaymentSchedules` qua `contractDueState`.

Truy vấn lọc ngay ở máy chủ (`IsPaid` chưa trả **và** `DueDate <= hôm nay + 5`). Kéo đủ 6.705 dòng về rồi mới lọc làm dashboard chậm từ 1,2 giây lên 8,8 giây.

Điều kiện `IsPaid` phải dùng `or(IsPaid.is.null, IsPaid.eq.false)` — `eq(false)` bỏ sót dòng NULL trong khi hàm thuần coi NULL là còn nợ.

---

## Chính sách LTV

| Phân loại | LTV | | Phân loại | LTV |
| :--- | ---: | :--- | :--- | ---: |
| Loại 1 | 80% | | Sổ tiết kiệm cùng hệ thống | 100% |
| Loại 2 | 70% | | STK khác hệ thống | 90% |
| Loại 3 | 60% | | Giấy tờ có giá | 80% |
| Loại 4 | 55% | | Phương tiện vận tải | 70% |
| **Hạn chế nhận TS** | **0%** | | Máy móc thiết bị | 60% |
| | | | Hàng hóa, Quyền tài sản | 50% |

**Hạn chế nhận TS = 0%.** Cho vay trên tài sản đó là **trình ngoại lệ, cần phê duyệt**. Hệ thống buộc xác nhận và đánh dấu `⚠ NGOẠI LỆ`, không chặn cứng.

Khi so khớp mã tài sản trong chuỗi `CollateralIds` (dạng `"1,5,12"`): **tách theo dấu phẩy rồi so từng phần tử**. Dùng `LIKE '%1%'` sẽ khớp nhầm `10`, `21`.

### Hiệu lực định giá

Định giá **chỉ có hiệu lực trong 6 / 12 / 24 tháng** kể từ ngày định giá. Hết hiệu lực thì con số đó **không còn dùng được để tính hạn mức**, dù vẫn nằm trong cơ sở dữ liệu.

| Trạng thái | Tính vào khả năng bảo đảm |
| :--- | :--- |
| Còn hiệu lực | Có |
| Sắp hết hạn (còn ≤ 60 ngày) | Có, kèm cảnh báo |
| **Hết hiệu lực** | **Không — bằng 0** |
| Chưa có ngày định giá | Không — bằng 0 |

`maxLoanFromCollateral` là số học thuần (giá trị × LTV). `usableCapacity` mới là con số dùng cho chốt kiểm soát: trả 0 khi định giá không còn hiệu lực. Chốt kiểm soát báo riêng loại rủi ro này để banker biết cần định giá lại, chứ không lẫn với việc vượt hạn mức.

Ngày hết hiệu lực được **tính lại** từ `AppraisalDate` + `AppraisalTenorMonths` thay vì tin vào cột `AppraisalExpiryDate` (kiểu text, có thể lưu ở định dạng hiển thị).

---

## Ba tầng hạn mức tín dụng

```
Phê duyệt HMTD  →  HĐTD  →  KUNN
```

| | Trường hợp | Cách biểu diễn |
| :--- | :--- | :--- |
| **TH1** | 1 số HĐTD, nhiều KUNN | `ContractAmount` **lặp** trên từng dòng KUNN là ĐÚNG. Gom theo tiền tố `ContractNumber` trước `/GNN-`, lấy **max**. |
| **TH2** | Khác số HĐTD, **cùng** HMTD | Khai cùng `CreditLimitCode`. Hạn mức tính **một lần**. |
| **TH3** | Khác số HĐTD, khác HMTD | **Cộng** mức cấp từng hợp đồng. |

⚠️ Viết SQL rà soát **phải gom theo HĐTD gốc trước khi cộng**. Cộng thẳng `ContractAmount` từng dòng KUNN sẽ ra con số ảo gấp nhiều lần — đã từng tạo báo động giả 41 tỷ trên dữ liệu vốn đúng.

Số HĐTD gốc nằm ở **tiền tố `ContractNumber`** (`HD123/GNN-01`). Cột `HdtdDueDate` **không** chứa số hợp đồng.

### Chốt kiểm soát TSĐB

Đối chiếu tổng mức cấp với tổng khả năng bảo đảm theo **cụm liên thông** hợp đồng ↔ tài sản, **không** xét từng tài sản riêng lẻ. Một hợp đồng thường được bảo đảm bằng nhiều tài sản cộng lại; một tài sản có thể bảo đảm nhiều hợp đồng. Xét lẻ sẽ báo động giả hàng loạt.

### Cơ sở đối chiếu khác nhau theo loại vay

Đây là điểm dễ sai nhất khi so tổng nghĩa vụ với khả năng bảo đảm:

| Loại vay | Cơ sở đối chiếu | Lý do |
| :--- | :--- | :--- |
| **Hạn mức tín dụng** (tái sử dụng) | **Mức cấp** | Khách hàng rút lại được bất cứ lúc nào, tài sản phải đỡ đủ hạn mức |
| **Cho vay từng lần** | **Dư nợ hiện hữu** | Giải ngân một lần rồi giảm dần, không rút lại được |

Dùng mức cấp gốc cho vay từng lần sẽ báo động giả suốt vòng đời khoản vay, vì gốc trả vào thì LTV của khoản vay giảm theo. Tính chất tái sử dụng khai ở `revolving` trong `loanProductRules.ts`, tra bằng `isRevolvingCredit`.

Cụm có cả hai loại thì cộng: mức cấp của phần hạn mức + dư nợ của phần vay từng lần.

---

### Ngày hiệu lực HĐTD chỉ có một nguồn

Ngày hiệu lực nằm ở **bốn chỗ**: một dòng `CreditContracts` và bản chép `ContractStartDate` / `ContractEndDate` trên từng KUNN con.

**Nguồn đúng là dòng HĐTD cha.** Đọc qua `hdtdEffectiveDatesOf`, tra theo `CreditContractId`. Bản chép trên KUNN chỉ là lưới an toàn khi tra không ra cha, và có test khoá hành vi đó.

Form KUNN tự tính lại `ngày bắt đầu + kỳ hạn` mỗi lần mở. Khi lưu, `buildKunnPayload` ghi bản chép bằng **ngày của cha**, không bằng số form tự tính — nếu không, các bản sao sẽ trôi lệch. Hợp đồng `2002/HDTD/9653222` từng có ba KUNN ghi hai ngày khác nhau vì chuyện này.

Cột `HdtdDueDate` **đã xoá** ở migration 48: rỗng toàn bộ 103 KUNN trong khi mã vẫn dự phòng vào nó.

---

## Sản phẩm vay

### Hạn mức tín dụng — ngắn hạn
- Mục đích **cố định** "Sản xuất kinh doanh", ô chọn bị khoá
- Kỳ hạn 12 – 24 tháng
- **Không** có ân hạn gốc

### Cho vay từng lần — dài hạn
- Mục đích: tiêu dùng phục vụ đời sống, xây/sửa chữa nhà, mua nhà
- Kỳ hạn 60 – 360 tháng (5 – 30 năm)
- Ân hạn gốc: 6 / 12 / 15 / 18 / 24 / 36 tháng

Sai lệch → **cảnh báo, không chặn lưu**. Nghiệp vụ ngân hàng luôn có ngoại lệ được phê duyệt; chặn cứng khiến banker tìm cách lách.

`isBulletPrincipal` **chỉ** căn cứ `PrincipalRepaymentMethod`. Phương thức vay **không** được đè lên lựa chọn đó.

---

## Bảo mật

**Khoá `anon` nằm công khai** trong gói JS gửi tới trình duyệt. Màn hình đăng nhập chỉ chặn người dùng thường. **RLS là lớp phòng thủ duy nhất.**

- `admin` xem tất cả; `banker` chỉ xem KH của mình qua `Customers.OwnerId`
- Quyền trên TSĐB/hợp đồng/thẻ/lịch trả nợ **suy ra theo quan hệ tới khách hàng**
- RLS bật trên **mọi** bảng; bảng chưa dùng thì bật không kèm policy (chặn hoàn toàn)

**Khi RLS chặn, Supabase trả mảng rỗng mà KHÔNG báo lỗi.** Mọi lệnh xoá/sửa phải `.select()` rồi kiểm tra số dòng thực sự bị tác động.

**Sinh ID do database đảm nhiệm** qua sequence. Không tính `max(Id)+1` ở client — dưới RLS client chỉ thấy phần dữ liệu của mình nên số đó luôn sai, gây trùng khoá chính.

Tạo tài khoản cần `service_role` key — **tuyệt đối không** đưa vào code client, phải qua Edge Function.

Kiểm tra nhanh:
```sql
SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;
```

---

## Cơ sở dữ liệu

Script trong `supabase/migrations/`, chạy **thủ công** qua Supabase SQL Editor theo đúng thứ tự số.

⚠️ **Thay đổi vừa động lược đồ vừa động code: chạy migration TRƯỚC, deploy SAU.** Làm ngược lại sẽ có khoảng thời gian hệ thống hỏng.

Không nhét dữ liệu nghiệp vụ vào `Note` — mỗi thông tin một cột riêng.

---

## Lệnh

```bash
npm run dev      # máy chủ phát triển
npm test         # toàn bộ test, hiện 1.465 ca
npm run build    # typecheck + đóng gói
npm run lint
```

---

## Quy trình khi sửa logic tiền

1. Đọc file này và `CONVENTIONS.md`
2. Viết test cho hành vi mong đợi **trước**, đặc biệt bất biến `Σ(gốc) = số tiền vay`
3. Sửa code trong `src/lib/`, không viết logic trong component
4. `npm test && npm run build`
5. Nếu có migration: chạy SQL trước, deploy sau
6. Kiểm chứng ngoài test đơn vị: tệp xuất ra thì mở lại đối chiếu, màn hình thì chụp xem, ràng buộc CSDL thì thử hành vi
7. Cập nhật `PROGRESS.md`
