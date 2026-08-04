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

Toàn bộ nằm trong `src/lib/` dưới dạng hàm thuần, không phụ thuộc React, được phủ 329 test tại `src/lib/__tests__/`.

| Tệp | Nội dung |
| :--- | :--- |
| `loanMath.ts` | Lịch trả nợ, tính lãi, phân bổ gốc, quá hạn, phân nhóm nợ |
| `collateralMath.ts` | Chính sách LTV theo phân loại tài sản |
| `creditLimit.ts` | Tổng mức cấp và chốt kiểm soát theo tài sản bảo đảm |
| `calcMath.ts` | Công thức cho 8 công cụ tính toán (EMI, EAR, DTI), số học ngày tháng kiểu EDATE |
| `rateReduction.ts` | Tính tiền giảm lãi suất vay: ngắn hạn nhiều khoản và lịch trung dài hạn |
| `mdsdv.ts` | Tra cứu mã mục đích sử dụng vốn theo danh mục FBE |
| `rateQuote.ts` | Chào lãi suất theo chương trình từng thời kỳ, phí dịch vụ, cảnh báo chặn |
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

### Cơ sở đối chiếu khác nhau theo loại vay

Đây là điểm dễ sai nhất khi so tổng nghĩa vụ với khả năng bảo đảm:

| Loại vay | Cơ sở đối chiếu | Lý do |
| :--- | :--- | :--- |
| **Hạn mức tín dụng** (tái sử dụng) | **Mức cấp** | Khách hàng rút lại được bất cứ lúc nào, tài sản phải đỡ đủ hạn mức |
| **Cho vay từng lần** | **Dư nợ hiện hữu** | Giải ngân một lần rồi giảm dần, không rút lại được |

Dùng mức cấp gốc cho vay từng lần sẽ báo động giả suốt vòng đời khoản vay, vì gốc trả vào thì LTV của khoản vay giảm theo. Tính chất tái sử dụng khai ở `revolving` trong `loanProductRules.ts`, tra bằng `isRevolvingCredit`.

Cụm có cả hai loại thì cộng: mức cấp của phần hạn mức + dư nợ của phần vay từng lần.

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

## 6. Giảm lãi suất vay

Toàn bộ công thức nằm ở `src/lib/rateReduction.ts`, giao diện là công cụ số 4 trong `CalculatorView`.

```
Tiền giảm lãi = Dư nợ × (LSCV theo quy định − LS đề xuất) × Số ngày / 365
```

Hai nghiệp vụ khác nhau, dùng chung một công thức lãi:

| Chế độ | Dùng cho | Cách tính |
| :--- | :--- | :--- |
| Ngắn hạn / hạn mức | Nhiều khoản vay trên cùng một tờ trình | Mỗi khoản một dòng, số dư và số ngày nhập tay, có dòng Tổng |
| Trung dài hạn | Vay từng lần, gốc đều, lãi trên dư nợ giảm dần | Dựng lịch từng kỳ rồi cộng phần giảm trong cửa sổ áp dụng |

### Lãi suất giảm chốt

```
LS giảm chốt = min(LS quy định, max(sàn LSCV, max(LS quy định − trần giảm, LS đề xuất)))
```

**Kỳ đang trong thời gian ưu đãi không được giảm thêm.** Khách hàng đã hưởng lãi suất ưu đãi thì không cộng dồn tiếp ưu đãi giảm lãi.

Cửa sổ áp dụng là các kỳ từ `s` đến `s + k − 1`. Đặt `k = 0` thì không kỳ nào được giảm — đây là trạng thái hợp lệ, không phải lỗi nhập liệu.

Bản Excel gốc `GIẢM LS VAY.xlsx` chốt lãi suất bằng `MAX(sàn, LS hiện tại − trần giảm)`, **bỏ qua hẳn ô "LS đề xuất"**. Cài như vậy khiến ô đề xuất chỉ để trang trí: banker gõ 9,9% nhưng bảng vẫn tính theo 9,6%. Ở đây LS đề xuất được tôn trọng, chỉ bị kẹp lại bởi sàn và trần.

### Hai chỗ bản Excel gốc tính sai

Ghi lại để không ai "sửa" mã nguồn cho khớp lại với file cũ:

| Ô | Excel | Đúng | Nguyên nhân |
| :--- | ---: | ---: | :--- |
| Tiền giảm lãi (sheet NH) | 501.369.863 | **5.013.699** | Nhân chênh lệch `2.00` như 200%/năm thay vì 2%/năm — sai gấp 100 lần |
| Margin hiện tại (sheet NH) | 3,80% | **4,95%** | 10,25% − 5,30% = 4,95%. Ô "Margin đề xuất" 2,95% thì đúng |

Tổng tiền giảm lãi của ví dụ trong file là **12.367.124 đồng**, không phải 1.236.712.329 đồng.

### Số ngày trong kỳ

Ngày thanh toán sinh theo đúng ngữ nghĩa `EDATE`: **kẹp về ngày cuối tháng đích**. Kỳ 1 rơi 31/01 thì kỳ 2 là 28/02, không phải 03/03. Trước đây lịch dùng `new Date(y, m + 1, 31)` nên bị tràn sang tháng sau, làm lệch cả ngày trả nợ và số ngày tính lãi. Hàm dùng chung là `edate` trong `calcMath.ts`; `addMonths` gọi lại `edate` để chỉ còn một bản cài đặt.

Gốc trả đều vẫn **làm tròn lên bước 1.000 đồng và kỳ cuối gánh phần dư** như mọi lịch trả nợ khác trong hệ thống, nên tổng gốc bằng đúng số tiền vay. Bản Excel để `P/n` không làm tròn, vì vậy con số gốc từng kỳ sẽ lệch vài trăm đồng so với file — hệ thống theo chuẩn core banking, không theo file.

---

## 7. Mã mục đích sử dụng vốn

Danh mục MĐSDV theo hệ thống FBE, tra cứu ở tab **Tra Cứu Mục Đích Sử Dụng Vốn**. Logic ở `src/lib/mdsdv.ts`, dữ liệu ở `src/data/mdsdv.json`.

### Cấu trúc mã

| Cấp | Quy tắc |
| :--- | :--- |
| Cấp 1 | `CE` + mã ngành cấp 1 theo VSIC |
| Cấp 2 – 5 | `CE` + mã ngành cấp 1 + mã ngành cấp 2–5 tương ứng |
| Cấp 6 (chi tiết) | Mã MĐSDV ngành cấp 5 + mã chi tiết |
| Tiêu dùng đời sống | `CET00000` + mã chi tiết |

Tên hiển thị trên FBE = **8 ký tự cuối của mã cấp 6** + tên mục đích chi tiết.

### Dữ liệu lưu ở dạng chuẩn hoá, không lưu 9.133 dòng thô

Bảng tra cứu có 9.133 mã cấp 6, nhưng chỉ có **735 ngành cấp 5** và **11 bộ mục đích chi tiết** khác nhau. Mỗi ngành cấp 5 trỏ tới một bộ, mã cấp 6 sinh ra khi cần. Cách này giảm dữ liệu từ khoảng 4 MB xuống 321 KB.

Bộ mục đích **không suy được từ ngành cấp 1**: cùng ngành `CEK`, mã chi tiết `06` mang hai nghĩa khác nhau ở các ngành cấp 5 khác nhau. Vì vậy phải gộp theo **toàn bộ danh sách mục đích**, không gộp theo ngành cấp 1.

Có test khẳng định việc sinh lại tái tạo **đúng 9.133 dòng**. Khi cập nhật danh mục mới, chạy lại test này trước khi tin vào dữ liệu.

Mã chi tiết **không liên tục và không dùng chung giữa các ngành**. Vay tiêu dùng đời sống bắt đầu từ `09`, `18`, `21`… nên `CET0000001` không tồn tại — tra không ra là đúng dữ liệu, không phải lỗi tìm kiếm.

### Tìm kiếm

So khớp sau khi bỏ dấu và hạ chữ thường, nên `trong lua` tìm ra `Trồng lúa`. Mọi từ khoá phải khớp (`AND`), không phân biệt thứ tự. Vì so theo chuỗi con, `trong lua` cũng khớp `ngựa, lừa` — đây là đánh đổi có ý thức để banker gõ nhanh không cần dấu.

Kết quả trả về **giới hạn 300 dòng nhưng vẫn báo tổng số thật**, để người dùng biết cần thu hẹp từ khoá chứ không tưởng là đã xem hết.

Đây là **dữ liệu tham chiếu tĩnh**, không phải dữ liệu khách hàng: không nằm trong cơ sở dữ liệu, không chịu RLS, không có gì phải phân quyền.

---

## 8. Chào lãi suất theo chương trình

Lãi suất chào khách **không được cứng hoá trong mã nguồn**. Mỗi kỳ là một văn bản của Ban điều hành có ngày hiệu lực riêng, nên dữ liệu nằm ở bảng `RatePrograms` (migration 09). Logic thuần ở `src/lib/rateQuote.ts`, giao diện là tab **Chào Lãi Suất**.

Ba loại chương trình — cho vay ngắn hạn, cho vay trung dài hạn, huy động — dùng **chung** bảng dòng lãi suất `RateProgramTiers`, vì cùng bản chất "một điều kiện → một mức lãi". Các cột chiều để `NULL` ở loại không dùng: cho vay dùng `PackageCode`/`FixedMonths`/`MinFeeRatio`, huy động dùng `Channel`/`BalanceTierLabel`/`PayoutMode`.

### Chọn chương trình theo ngày, không theo "mới nhất"

`findActiveProgram` lấy chương trình có `EffectiveFrom ≤ ngày ≤ EffectiveTo`, hai đầu mút **tính vào**. Hai chương trình gối nhau thì lấy cái có `EffectiveFrom` muộn hơn. `EffectiveTo` để trống nghĩa là chưa có ngày kết thúc.

Lấy "chương trình mới nhất" là sai: khoản vay giải ngân trong quá khứ phải áp lãi suất của kỳ đó, không phải kỳ hiện hành.

### NULL và 0 là hai chuyện khác nhau

Đây là chỗ dễ gây mất tiền nhất ở phần này:

| Giá trị | Nghĩa |
| :--- | :--- |
| `RateAnnual = NULL` | **Chưa có số.** Hệ thống chặn không cho chào gói đó |
| `RateAnnual = 0` | Lãi suất 0%/năm, là số liệu đã biết |
| `FeeRatio = NULL` | **Chưa có số** |
| `FeeRatio = 0` | Miễn phí, là số liệu đã biết |

Bảng tính nội bộ ghi `0` cho ô chưa điền. Khi nạp phải chuyển thành `NULL`, nếu không hệ thống sẽ chào 0%/năm cho khách.

### Công thức phí dịch vụ

```
Tỷ lệ phí = tỷ lệ theo gói × (1 − mức giảm KH mới) + phụ phí CASA
Phí phải thu = max(Tỷ lệ phí × số tiền giải ngân, mức sàn)
```

Giảm cho khách hàng mới áp **trước**, phụ phí CASA cộng **sau**. Thứ tự này khớp ví dụ trong Thông báo 2274: gói LC2 phí 0,75%, CASA bình quân không đạt 5% dư nợ nên cộng 0,10% thành **0,85%**.

`casaAverage` để trống nghĩa là **chưa soát xét** nên không cộng phụ phí. Còn `casaAverage = 0` là đã soát xét và CASA bằng 0 — phải cộng phụ phí. Đừng gộp hai trạng thái này.

### Cảnh báo chặn

`collectQuoteWarnings` trả về hai mức. Mức `block` là **không được chào khách**:

- Không có chương trình hiệu lực tại ngày đã chọn
- `SourceVerified = false` — số liệu chưa đối chiếu văn bản gốc
- Gói chưa có lãi suất
- Chương trình đã hết hiệu lực

Mức `warn` chỉ nhắc: chương trình cấm dùng thẩm quyền giảm LSCV, cấm giảm phí trả nợ trước hạn, hoặc thời gian vay dưới mức tối thiểu của gói.

Cờ `AllowRateReduction = false` tồn tại vì Thông báo 2274 **cấm áp dụng thẩm quyền giảm LSCV trong suốt thời gian vay**. Trước đây banker phải tự nhớ điều này khi mở công cụ giảm lãi suất.

### Số liệu nào đã đối chiếu, số liệu nào chưa

`SourceVerified` là cột quan trọng nhất của bảng này.

| Chương trình | Nguồn | Trạng thái |
| :--- | :--- | :--- |
| Ngắn hạn `2274/2026/TB-BĐH` | Chính văn bản | **Đã đối chiếu** |
| Trung dài hạn `TAM-TDH-2026` | Bảng tính nội bộ | **Chưa** — thiếu lãi suất gói CĐ 3 tháng và phí Năm 3 |
| Huy động `TAM-HD-2279/...` | Bảng tính nội bộ | **Chưa** — chưa có văn bản 2279 |

Bảng tính nội bộ `Book.xlsx` **sai cả 5 dòng lãi suất ngắn hạn** khi so với văn bản 2274 (một dòng ghi 110,50% thay vì 11,70%; một dòng ghi 0% thay vì 8,45%). Vì vậy số liệu trung dài hạn và huy động lấy từ cùng file đó phải coi là tạm cho tới khi có văn bản gốc. Không sửa `SourceVerified` thành `true` khi chưa thực sự đối chiếu.

### Quyền ghi

Đọc: mọi người dùng đã đăng nhập. Ghi: **chỉ `admin`**. Sai một con số ở đây là chào sai lãi suất cho toàn hệ thống, khác hẳn dữ liệu khách hàng chỉ ảnh hưởng một hồ sơ.

---

## 9. Bảo mật

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

## 10. Cơ sở dữ liệu

Script trong `supabase/migrations/` chạy **thủ công qua Supabase SQL Editor**, theo đúng thứ tự số.

> **Thứ tự triển khai:** khi một thay đổi vừa động vào lược đồ vừa động vào mã nguồn, **luôn chạy migration trước rồi mới deploy**. Làm ngược lại sẽ có khoảng thời gian hệ thống ở trạng thái hỏng.

---

## 11. Lệnh thường dùng

```bash
npm run dev        # Máy chủ phát triển
npm run build      # Kiểm tra kiểu + đóng gói
npm test           # 329 test logic tài chính
npm run lint       # Kiểm tra mã nguồn
```
