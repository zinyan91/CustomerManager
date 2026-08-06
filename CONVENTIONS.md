# Quy ước & Kiến thức nghiệp vụ

Mã nguồn không chứa chú thích. Toàn bộ giải thích "vì sao" nằm ở đây.

Đọc file này trước khi sửa bất cứ thứ gì liên quan tới tiền: lãi, gốc, LTV, hạn mức.

---

## 1. Nguyên tắc bắt buộc

**Một quy tắc nghiệp vụ chỉ được cài ở MỘT nơi.** Dự án đã trả giá 5 lần cho việc chép hàm ra nhiều file rồi để chúng trôi dạt: `getEffectiveLtv` từng có 4 bản khác nhau khiến cùng một tài sản cho ba hạn mức cho vay khác nhau ở ba màn hình; `getMasterHdtdNumber` 3 bản; `diffDays` 3 bản. Cần dùng lại thì import, không copy.

**Không viết công thức nghiệp vụ trong `.tsx`.** Mọi phép tính tiền, lãi, ngày, LTV, hạn mức phải nằm ở `src/lib/` dưới dạng hàm thuần có test; component chỉ gọi và hiển thị. Lý do đo được: `src/lib` có 707 test, `src/components` có **3** — công thức viết trong view là công thức không ai kiểm, và đó là nơi mọi lỗi lệch số của dự án này sinh ra.

**Test hàm thuần không bắt được lỗi runtime trong component.** Ngày 05/08/2026 tab KUNN trắng trang vì `getEffectiveBalanceForContract` gọi `kunnSettled` khai sau nó — build, lint và 668 test đều xanh. Test giao diện ở `src/components/__tests__/` chỉ làm một việc: dựng component lên và khẳng định nó render tới cùng. Không kiểm công thức tiền ở đó (đã có test hàm thuần lo), và mỗi tệp tự khai `// @vitest-environment jsdom` để 707 test logic không phải chịu chi phí dựng DOM.

Ba lần đã trả giá: bốn cách tính hạn mức khả dụng cùng tồn tại, hai trong số đó viết thẳng trong `LoanPortfolioView`, khiến cùng một khách hàng hiện `2.800.000.000` ở đầu trang và `1.400.000.000` trong form. Khái niệm "lãi suất đang áp dụng" có ba bản: `getEffectiveActiveRate` trong `utils.ts` bỏ qua kỳ ưu đãi, khối tính trong view bỏ qua bảng điều chỉnh, nhánh trong `generateSchedule` chỉ chọn một trong hai. Và view tự tính LTV `giá trị × LTV / 100` nên chấp nhận cả định giá đã hết hiệu lực, trong khi `usableCapacity` loại — cùng hồ sơ, hai kết luận trái nhau trên cùng màn hình.

Kể cả việc nhỏ cũng theo quy tắc này: đọc số tiền từ ô nhập dùng `parseMoneyInput` trong `utils.ts`, không tự viết lại `parseFloat(...replace(...))`.

**Cẩn thận `||` khi số 0 là giá trị hợp lệ.** `parseFloat('0') || 80` cho ra `80`. Chính lỗi này từng biến tài sản "Hạn chế nhận TS" (LTV 0%) thành tài sản bậc cao nhất 80%. Dùng kiểm tra `null`/`undefined`/`NaN` tường minh.

**Không nuốt lỗi.** Bắt lỗi rồi lưu lại sau khi xoá bớt trường sẽ khiến giao diện báo thành công trong khi dữ liệu đã mất. Đây là cách "diện mở thẻ" từng biến mất mỗi lần lưu.

**Không nhét dữ liệu nghiệp vụ vào trường ghi chú.** Mỗi thông tin phải có cột riêng. Không truy vấn được, không kiểm toán được, và tạo ra **nguồn thứ hai trôi dạt khỏi cột thật**.

Rà soát 05/08/2026 tìm ra ba đường ghi vẫn đang **sống**, không phải tàn dư — migration 06 dọn dữ liệu cũ nhưng không bịt đường ghi:

| Chuỗi | Bảng | Ghi bởi | Cột đúng |
| :--- | :--- | :--- | :--- |
| `HĐTD: <số>` | `LoanContracts` | `LoanPortfolioView` khi lưu KUNN | `CreditContractId` |
| `[TRẢ TRƯỚC HẠN: +Xđ]` | `RepaymentSchedules` | `generateSchedule` | `PrepaidPrincipalAmount` |
| `[CollateralId:N]` | `CreditCards` | (chỉ còn đọc) | `CollateralId` |
| `[COLLATERAL_IDS:...]` · `[RATE_HISTORY:...]` · `[PENALTY_SURCHARGE:...]` | `LoanContracts` | (chỉ còn đọc) | cột riêng |

Cái giá đo được: `HĐTD:` có ở 100 KUNN và **lệch số thật ở 2 dòng** (LÊ VĂN CAO ghi `HĐTD-01`/`HĐTD-02`). Vì `getMasterHdtdNumber` đọc `Note` **trước** `ContractNumber`, và `computeLimitGroups` lấy hàm đó làm khoá gom nhóm, `findLimitGroupFor` tra bằng số thật không khớp được — chốt kiểm soát hạn mức của hai KUNN đó rơi về mặc định thay vì chặn theo nhóm. Còn `[TRẢ TRƯỚC HẠN:]` ghi số tiền vào `Note` mà bỏ trống `PrepaidPrincipalAmount`, nên tiền trả trước hạn vô hình với `paidPrincipalOf` và `recalculateSchedules`.

Cả ba đã bịt, và migration 24 đã dọn dữ liệu (05/08/2026: sáu khối chuỗi về 0, 82 ô ghi chú thành rỗng, đối chiếu bản sao lưu xác nhận không mất ghi chú thật nào). Gỡ chuỗi dùng `stripLegacyNoteBlobs` (`utils.ts`) — **giữ nguyên phần ghi chú thật của banker trong cùng ô**. Báo cáo `supabase/reports/02_du_lieu_nghiep_vu_trong_note.sql` đo lại bất cứ lúc nào.

Rà soát diện rộng bằng `supabase/reports/03_quet_toan_bo_cot_van_ban.sql` (quét **mọi** cột văn bản của **mọi** bảng lấy từ `information_schema`) tìm thêm hai chỗ mà cách đếm sáu khối đã biết không bắt được:

- **`CreditContracts.RateHistory`** — 59 dòng, nội dung là bản sao `Note` cũ (`HĐTD: <số>` kèm `[PENALTY_RATE:N]`), không phải lịch sử lãi suất. Migration 14 copy vào sai cột; ba dòng của ĐOÀN NGỌC LÝ có `HdtdNumber` không khớp số ghi bên trong. Không mã nào đọc — migration 25 xoá cột.
- **`[PENALTY_RATE:N]`** — khối thứ bảy, là **lãi suất phạt quá hạn theo từng khoản**, và **không có cột nào để chứa**. Không mã nào đọc; mọi khoản đều bị áp `DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER = 1.5` nhúng cứng trong `stkPledge.ts`. KUNN `PNAT.CN.01290824/GNN-01` khai `PENALTY_RATE:0` (miễn phạt) nhưng hệ thống vẫn tính 150%. Chưa gây thiệt hại vì 21/21 kỳ của khoản đó đã thu đúng hạn, nhưng là rủi ro tiềm ẩn. **Chờ quyết định**: lãi suất phạt có khác 150% theo từng khoản không. `calcOverduePenalty` đã nhận sẵn tham số `principalPenaltyMultiplier`, chỉ thiếu cột và đường dẫn dữ liệu.

**Không gỡ một chuỗi khỏi `Note` trước khi giá trị trong đó có chỗ ở.** `stripLegacyNoteBlobs` cố tình **không** gỡ `[PENALTY_RATE:` — đó là bản ghi duy nhất của con số ấy.

**Sinh ID do cơ sở dữ liệu đảm nhiệm** qua sequence. Không tính `max(Id)+1` ở client: dưới RLS, client chỉ nhìn thấy phần dữ liệu của mình nên con số đó luôn sai và gây trùng khoá chính.

**Viết SQL rà soát phải dùng lại đúng quy tắc đã cài trong code.** Một câu SQL cộng `ContractAmount` mà quên gom theo HĐTD gốc đã tạo ra báo động giả 41 tỷ trên dữ liệu vốn đã đúng.

Trả giá lần thứ hai ngày 05/08/2026 với `reports/05`: câu tìm "kỳ thu thiếu" tự cộng tay thay vì phản chiếu `paidPrincipalOf`, và sinh hai báo động giả trên hồ sơ LÊ VĂN HẬU — khách **trả nợ trước hạn**, bị báo thành nợ quá hạn. Hai cái bẫy phải nhớ khi viết SQL về tiền thu nợ:

- **`PrincipalAmount` VỐN ĐÃ bao gồm `PrepaidPrincipalAmount`.** Trừ phần trả trước hạn ra khỏi nghĩa vụ là trừ hai lần. Kỳ 7 của `2002/HĐTD/9665732/GNN-01`: `800.840.000 + 24.158.604 − 785.000.000` ra một khoản "thiếu" 39.998.604đ không tồn tại.
- **`ActualPaidPrincipal = 0` kèm `IsPaid = true` nghĩa là "đã trả đủ theo lịch"**, không phải "chưa thu đồng nào" — xem mục `paidPrincipalOf` ở §13. Hiểu ngược thì 829/835 kỳ đã thu bị báo là chưa thu.

Chỉ được kết luận một kỳ thu thiếu khi **có khai tay** ít nhất một trong `ActualPaidPrincipal` / `ActualPaidInterest` mà tổng vẫn dưới nghĩa vụ.

Lần thứ ba, cùng ngày: câu kiểm bất biến Σgốc so `sum(PrincipalAmount)` với `LoanAmount` **trần**, trong khi `generateSchedule`, `recalculateSchedules` và `computeOutstandingBalance` đều dùng `LoanAmount || ContractAmount`. Hồ sơ ĐOÀN NGỌC LÝ `2002/HĐTD/9738792/GNN-01` có `LoanAmount = 0` nên lịch lấy 830.000.000 từ `ContractAmount` — câu sai báo bất biến quan trọng nhất của dự án bị phá. SQL đúng phải là `coalesce(nullif("LoanAmount", 0), "ContractAmount", 0)`.

Chú ý toán tử: `||` cho phép số 0 rơi xuống nhánh sau, `??` thì không. `disbursedOf` trong `creditLimit.ts` dùng `LoanAmount ?? CurrentBalance ?? 0` nên với KUNN có `LoanAmount = 0` nó lấy **0**, khác hẳn ba hàm kia — cho vay từng lần sẽ khai thiếu số đã giải ngân và hạn mức khả dụng ra cao hơn thực tế.

**Rà soát bảo mật liệt kê tài nguyên từ `pg_tables`,** không suy từ mã nguồn. Cách suy từ code từng bỏ sót 7 bảng đang mở.

---

## 2. Logic tài chính

Toàn bộ nằm trong `src/lib/` dưới dạng hàm thuần, không phụ thuộc React, được phủ 707 test tại `src/lib/__tests__/`.

| Tệp | Nội dung |
| :--- | :--- |
| `loanMath.ts` | Lịch trả nợ, tính lãi, phân bổ gốc, quá hạn, phân nhóm nợ |
| `collateralMath.ts` | Chính sách LTV theo phân loại tài sản |
| `creditLimit.ts` | Tổng mức cấp và chốt kiểm soát theo tài sản bảo đảm |
| `calcMath.ts` | Công thức cho 8 công cụ tính toán (EMI, EAR, DTI), số học ngày tháng kiểu EDATE |
| `rateReduction.ts` | Tính tiền giảm lãi suất vay: ngắn hạn nhiều khoản và lịch trung dài hạn |
| `mdsdv.ts` | Tra cứu mã mục đích sử dụng vốn theo danh mục FBE |
| `rateQuote.ts` | Chào lãi suất theo chương trình từng thời kỳ, phí dịch vụ, cảnh báo chặn |
| `rateSheet.ts` | Dựng bảng lãi suất một trang A4 để gửi khách hàng |
| `formatSettings.ts` | Định dạng số tiền, số thập phân, phần trăm và giờ theo thiết lập người dùng |
| `numberToWords.ts` | Đọc số tiền thành chữ tiếng Việt cho biểu mẫu hợp đồng |
| `cof.ts` | Giá mua vốn từ Hội Sở (FTP bán - COF) theo kỳ hạn và kỳ điều chỉnh |
| `stkPledge.ts` | Cầm cố sổ tiết kiệm: một sổ, tái tục nhiều kỳ, và phạt chậm trả quá hạn |
| `loanProductRules.ts` | Ràng buộc theo phương thức vay |
| `utils.ts` | Định dạng tiền, phần trăm, phân tích ngày đa định dạng, `todayIso`, `daysUntil` |
| `dueList.ts` | Bộ lọc và bảng in danh sách đến hạn, `monthlyDueInfo` cho mốc thu lãi tháng kế tiếp |

### Nơi lưu trữ chung — dùng, đừng chép lại

Đợt gộp 05/08/2026 rút các bản sao trong `.tsx` về một chỗ. Cần thứ nào dưới đây thì import, tuyệt đối không viết lại trong component:

| Việc cần làm | Gọi hàm |
| :--- | :--- |
| Tiền phạt quá hạn của một kỳ (150% gốc + 10% lãi chậm trả) | `computeSchedulePenalty` (`loanMath.ts`) |
| Số ngày quá hạn thực tế của một kỳ | `overdueDaysOfSchedule` (`loanMath.ts`) |
| Ngày hôm nay dạng `YYYY-MM-DD` | `todayIso` (`utils.ts`) |
| Số ngày còn lại tới một mốc | `daysUntil` (`utils.ts`) |
| Mốc thu lãi hàng tháng kế tiếp | `monthlyDueInfo` (`dueList.ts`) |
| Hiển thị phần trăm từ tỷ lệ thập phân | `fmtPercent` (`utils.ts`) |
| Hiển thị số tiền | `fmtMoney` (`utils.ts`) |
| Đọc số tiền từ ô nhập chỉ có chữ số | `parseMoneyInput` (`utils.ts`) |
| Đọc số tiền có thể lẻ đồng | `parseMoneyDecimalInput` (`utils.ts`) |

**"Lãi suất đang áp dụng" chỉ có MỘT nguồn: `getEffectiveActiveRate` trong `rateResolution.ts`,** dựng trên chính dòng thời gian mà bảng lịch trả nợ dùng. Trước 05/08/2026 hàm này nằm ở `utils.ts` với thứ tự ưu tiên **ngược hẳn** — `InterestRate` → `NormalRate` → `PreferentialRate` → `BaseRate` và **bỏ quên biên độ** — nên khung KUNN của ĐOÀN NGỌC LÝ hiện `11,25%/năm` trong khi mọi kỳ của chính khoản đó tính lãi ở `10,20%/năm`. Tiền đi theo dòng thời gian, con số ở khung là con số không phép tính nào dùng tới.

Thứ tự đúng, cài trong `floatingRate`: `BaseRate + MarginRate` (áp sàn `RateFloorAnnual`) → `PostPreferentialRate` → `NormalRate` → `InterestRate`. Kỳ ưu đãi ghi đè N tháng đầu, mốc điều chỉnh ghi đè kể từ ngày hiệu lực. Cùng hàm này nuôi cả nhãn trên màn hình lẫn tiền phạt quá hạn, nên không còn chỗ nào lệch.

### Hai chế độ lãi suất LOẠI TRỪ NHAU

Quyết định nghiệp vụ 05/08/2026: một KUNN chỉ theo **một** trong hai chế độ.

| Chế độ | Cột được lưu | Cột phải để trống |
| :--- | :--- | :--- |
| **Ưu đãi** | `PreferentialRate`, `PreferentialPeriodMonths`, `PostPreferentialRate` (= ưu đãi + biên), `MarginRate` | `BaseRate`, `NormalRate` |
| **Thông thường** | `BaseRate`, `MarginRate`, `NormalRate` (= cơ sở + biên) | `PreferentialRate`, `PreferentialPeriodMonths`, `PostPreferentialRate` |

Chọn LS thông thường thì lãi ưu đãi **không tồn tại để mà áp dụng**. Trước đây form lưu cả hai nhóm cột bất kể banker chọn gì, còn `buildRateTimeline` thấy `PreferentialRate > 0` kèm số kỳ `> 0` là áp ưu đãi — nên khoản khai theo lãi thông thường vẫn bị tính lãi ưu đãi. Hồ sơ ĐOÀN NGỌC LÝ `2002/HĐTD_1/9718695/GNN-03` khai ưu đãi 10,20%/24 tháng **và** cơ sở 9,70% + biên 1,35%: khung hiện 11,25% còn mọi kỳ tính ở 10,20%.

`buildRateFields(mode, input)` trong `rateResolution.ts` là **nơi duy nhất** dựng nhóm cột lãi suất khi lưu — nó xoá hẳn nhánh không dùng, nên dữ liệu tự nói lên chế độ và không tạo lại được mâu thuẫn. `resolveRateModeOf` suy chế độ ngược lại khi mở form; trước đây `interestRateMode` là state không nạp lại từ hợp đồng, khiến **mở KUNN rồi bấm Lưu là đổi lãi suất đã lưu dù không sửa gì**.

### Phụ trội điều kiện được cộng vào lãi suất cho vay

Chốt 05/08/2026. `PenaltySurcharge` cộng vào **mọi đoạn định giá** của dòng thời gian: đoạn ưu đãi, đoạn thả nổi sau ưu đãi, và mức hợp đồng khi không có ưu đãi. Trước đó cột này chỉ được lưu rồi đọc lại vào form — không kỳ lãi nào cộng nó.

Ba cái bẫy khi chạm vào chỗ này:

**Đơn vị khác các cột lãi suất còn lại.** `PenaltySurcharge` lưu theo **điểm phần trăm** (`0.2` nghĩa là 0,20%), trong khi `MarginRate`, `BaseRate`, `PreferentialRate` lưu theo **tỷ lệ** (`0.0135` nghĩa là 1,35%). Cho nên **không được** đưa nó qua `toPercent()` — hàm đó sẽ biến `0.2` thành 20%.

**Mốc điều chỉnh đã gồm phụ trội sẵn.** `ratePercent` của một `RateAdjustmentHistoryItem` do form dựng bằng `base + biên + phụ trội`, nên cộng thêm phụ trội cấp hợp đồng vào đó là **cộng đôi**. Chỉ nhánh dự phòng khi mốc bỏ trống `ratePercent` mới cộng `penaltyPercent` của chính mốc đó.

**Sàn lãi suất áp cho phần định giá, phụ trội cộng lên sau.** `applyRateFloor(base + biên)` rồi mới `+ phụ trội` — cơ sở 5% + biên 1% với sàn 8% và phụ trội 0,2% ra **8,2%**, không phải 8%.

Form không tự cộng lãi suất nữa: `currentActiveRateDisplay` dựng một hợp đồng nháp từ chính các ô đang nhập rồi gọi `getEffectiveActiveRate`, nên con số xem trước **khớp đúng** con số sẽ lưu và sẽ tính. Bản cũ cộng tay `base + biên + phụ trội` và bỏ qua sàn, lại tự đếm tháng để đoán ưu đãi đã hết chưa.

**`computeLimitGroups` phải được truyền `options.isClosed`.** Cờ `IsClosed` nằm ở bảng `CreditContracts` còn hàm này chỉ nhận `LoanContract[]`, nên nó không tự biết hợp đồng đã đóng. Bỏ trống thì hạn mức khả dụng ra số dương trên HĐTD đã đóng — hồ sơ NGUYỄN MINH HÙNG ngày 05/08/2026 hiện HMTD còn lại 600 triệu với nút Giải ngân đang bật, trong khi HĐTD đã đóng và còn 400 triệu chưa trả. **Đóng HĐTD và hết hiệu lực theo ngày là hai chuyện khác nhau**: hợp đồng còn hạn vẫn đóng được, nên không thay cái này bằng cái kia. Cả `computeLimitGroups` và `summarizeCreditContracts` đều cho `available = 0` khi `expired || closed`, và xếp lý do chặn cùng thứ tự: đã đóng → hết hiệu lực → hết hạn mức.

**Không đóng HĐTD khi còn KUNN chưa tất toán.** Không ngân hàng nào tất toán hợp đồng mà còn dư nợ, nên đó là **dữ liệu sai phải chặn**, không phải trạng thái cần thiết kế màn hình để hiển thị. Chốt ở `canCloseCreditContract` cho đường giao diện, và trigger `trg_chan_dong_hdtd_con_du_no` (migration 22, đã chạy và kiểm chứng 05/08/2026) là lớp bảo vệ thật — cùng lý lẽ với RLS và unique index số KUNN: chốt ở client không đỡ được đường ghi bằng SQL.

Trạng thái sai đã tồn tại trong dữ liệu thì **báo cáo rồi để banker quyết**, không sửa hàng loạt: mở lại hợp đồng nếu khoản vay còn chạy thật, hoặc tất toán từng KUNN nếu khách đã trả hết mà chưa ai đánh dấu.

**Hạn mức chỉ khả dụng trong thời gian hiệu lực.** Ba điều kiện độc lập cùng cho `available = 0`: hợp đồng **đã đóng**, **hết hiệu lực** (`ContractEndDate < today`), hoặc **chưa tới ngày hiệu lực** (`ContractStartDate > today`). Điều kiện thứ ba là khoảng trống giữa hai HĐTD kế nhiệm: HĐTD mới có thể ký với ngày hiệu lực nằm sau ngày đáo hạn của KUNN đang chạy, và trong quãng đó không hợp đồng nào cho phép giải ngân. Trước 05/08/2026 chỉ xét `ContractEndDate`, nên hợp đồng đã ký chưa tới hiệu lực vẫn chào hạn mức khả dụng.

Nhóm dùng chung hạn mức lấy **ngày hiệu lực sớm nhất** trong nhóm: một hợp đồng đã hiệu lực là cả nhóm giải ngân được. Chưa khai `ContractStartDate` thì **không suy đoán** — coi như đã hiệu lực.

**Không ghi đè kỳ ĐÃ THU.** Kỳ đã thanh toán là dữ liệu lịch sử: `redateSchedules` giữ nguyên `DueDate`, `recalculateSchedules` giữ nguyên `InterestAmount` của kỳ đó. Vì `ActualPaidInterest` chưa từng được điền (0/898 kỳ), `InterestAmount` chính là bản ghi tiền lãi đã thu — tính lại theo mốc mới là sửa lịch sử. Gốc thì **vẫn** tính lại để tiền trả trước hạn ghi nhận được kể cả trên kỳ đã tất toán, theo đúng mục *Trả trước hạn*.

**KUNN bắt buộc có `CreditContractId`** (`NOT NULL`, migration 23). Trigger chặn đóng HĐTD đối chiếu qua khoá ngoại này; để trống thì khoản vay vô hình với trigger và HĐTD vẫn đóng được dù còn dư nợ. Không suy liên kết từ tiền tố số hiệu — số hiệu sửa được bằng tay, khoá ngoại thì không.

**Đóng HĐTD là dừng quyền giải ngân, KHÔNG phải xoá nợ.** Hai câu hỏi khác nhau, hai hàm khác nhau, đừng trả lời câu này bằng câu kia:

| Câu hỏi | Hàm |
| :--- | :--- |
| KUNN còn nợ không? | `isKunnSettled(kunn)` — **chỉ** cờ `IsSettled` của chính KUNN |
| Còn bao nhiêu nợ? | `computeOutstandingBalance(schedules, kunn)` |
| Còn giải ngân được không? | `computeLimitGroups(options.isClosed)` · `summarizeCreditContracts` |
| KUNN thuộc HĐTD đã đóng? | `isKunnOfClosedHdtd(kunn, creditContracts)` |

`isKunnSettled` từng trả `true` khi HĐTD có `IsClosed`, và suy diễn đó che dư nợ thật khỏi **mọi** con số: hai KUNN 200 triệu của NGUYỄN MINH HÙNG, `IsSettled = false`, chưa trả một đồng, vẫn hiện "Dư nợ hiện hữu 0" kèm nhãn "ĐÃ TẤT TOÁN (theo HĐTD)" chỉ vì hợp đồng bị đóng. Cùng lúc đó tab HĐTD báo đỏ "còn 400.000.000" — hai màn hình nói ngược nhau về cùng một hồ sơ.

### Giao diện cài quy tắc, không giải thích quy tắc

Người dùng hệ thống này là banker. **Không viết lời giải thích nghiệp vụ lên màn hình** — nút bị làm mờ đã nói đủ, thêm tooltip "HĐTD đã đóng nên không giải ngân được" là nhắc lại điều họ biết rõ hơn ta.

Quy tắc thì cài thành hành vi: chặn ô nhập, làm mờ nút, từ chối lưu kèm **dữ liệu** banker chưa biết (số hiệu KUNN nào chưa tất toán, con số nào vượt). Chỉ đưa chữ lên giao diện khi nó mang thông tin mới, không khi nó mang lời dạy nghiệp vụ.

**KUNN không có dòng nào trong `RepaymentSchedules` thì dư nợ không giảm được.** `computeOutstandingBalance` rơi vào nhánh dự phòng trả `CurrentBalance`, và không có kỳ nào để đánh dấu đã thu. Đo 05/08/2026: 14/97 KUNN chưa tất toán ở trạng thái này, treo 4,635 tỷ. Mọi đường tạo KUNN phải sinh lịch; nhập KUNN bằng SQL mà bỏ bước này là tạo ra khoản vay không thu nợ được.

**Không dùng `new Date().toISOString().split('T')[0]` để lấy ngày hôm nay.** Đó là ngày theo UTC: ở múi giờ Việt Nam (UTC+7), mọi lần chạy trước 07:00 sáng đều trả về NGÀY HÔM QUA. Lỗi này từng nằm ở 16 chỗ, gồm cả `getEffectiveActiveRate` (chọn sai mốc điều chỉnh lãi suất trong buổi sáng) và chốt xét hiệu lực HĐTD. Dùng `todayIso()`.

Sửa gì liên quan tới tiền thì **viết test trước**. Ba lỗi mất tiền trong dự án này đều do test phát hiện, không ai thấy bằng mắt.

### Công thức tính lãi

```
Lãi = Dư nợ × Lãi suất năm × Số ngày thực tế trong kỳ / 365
```

Vì dùng số ngày thực tế, **tiền lãi có thể TĂNG so với kỳ trước dù dư nợ đã giảm**. Kỳ 15/03–15/04 (31 ngày) cao hơn kỳ 15/02–15/03 (28 ngày) là đúng, không phải lỗi. Có test riêng ghi nhận hành vi này để không ai "sửa" thành sai.

### Ngày trả nợ kỳ đầu tiên là DỮ LIỆU GỐC, không suy ra được

`RepaymentStartDate` của từng KUNN do **khách hàng chọn** và ghi trên GNN giấy. Có khách chọn ngày 1, ngày 15, ngày 28, ngày 30. Không có quy tắc nào suy được con số này:

- **Không** phải giải ngân + 1 tháng. LÊ NGỌC QUẾ HÂN giải ngân 05/05/2026, trả kỳ 1 ngày 15/05/2026 — kỳ 1 chỉ 10 ngày.
- **Không** gom về một ngày dùng chung cho cả hợp đồng hạn mức. Chính việc 5 KUNN của NGÔ NHỊ ĐẠT mượn mốc 15/04/2026 của hợp đồng đã sinh ra lỗi kỳ 1 rơi trước ngày giải ngân và thu vượt của khách hơn 21 triệu.

Ràng buộc duy nhất: **kỳ 1 phải SAU ngày giải ngân**. Mốc khai sớm hơn thì dịch lên từng tháng, giữ nguyên ngày trong tháng — không đổi ngày khách đã chọn. Để trống `RepaymentStartDate` thì mới mặc định giải ngân + 1 tháng, và đó là **giá trị tạm chờ khai theo chứng từ**, không phải quy tắc nghiệp vụ.

**Ngày trong tháng giữ nguyên từ kỳ đầu tới kỳ cuối.** Khách trả ngày 15 thì mọi kỳ đều ngày 15, kể cả kỳ cuối. Ngày đáo hạn KUNN **không** được phép đổi ngày của kỳ nào.

Đã có lúc làm ngược lại và phải trả giá. Ngày 06/08/2026 một chốt "kéo kỳ cuối về ngày đáo hạn" được thêm vào `buildDueDateSequence`, kèm `alignLastPeriodToMaturity` và một nút bảo trì ở tab Cài đặt quét toàn danh mục. Lý lẽ khi đó: *"31/98 KUNN có kỳ cuối không rơi đúng ngày đáo hạn"*. Đó là đọc ngược bằng chứng — 31 khoản cùng theo một khuôn là dấu hiệu **khuôn ấy chính là quy tắc**, không phải dấu hiệu 31 khoản đều hỏng. Không hồ sơ giấy nào được đối chiếu, không banker nào được hỏi.

Nút đó chạy `recalculateSchedules` trên **toàn bộ** các kỳ chứ không riêng kỳ cuối, và với kỳ chưa thu nó ghi đè `InterestAmount` bằng số tự tính — xoá mọi con số banker khai tay. Không xem trước, không xác nhận, không sao lưu. Bấm một cái là ghi thẳng vào danh mục.

Bài học, ghi ở đây để không lặp lại: **một khuôn lặp lại trong dữ liệu là quy tắc cần hỏi, không phải lỗi cần sửa.** Và công cụ ghi hàng loạt phải có bước xem trước liệt kê đúng những gì sắp đổi, trước khi ghi dòng đầu tiên.

Ràng buộc này cài trong **`buildDueDateSequence`** — nguồn duy nhất sinh dãy ngày đến hạn. Có **hai** đường ghi ngày đến nợ và cả hai đều phải đi qua đó: `generateSchedule` khi tạo lịch mới, và `redateSchedules` khi banker sửa mốc trả nợ của một KUNN **đã có lịch**. Cài chốt ở một đường không bịt được đường kia: bản chép tay trong `LoanPortfolioView` từng làm chính điều đó, khiến hồ sơ NGÔ NHỊ ĐẠT tái tạo lại được lỗi cũ sau khi đường tạo mới đã sửa. Thêm đường ghi ngày thứ ba thì cũng phải gọi hàm này, đừng cộng tháng bằng tay.

### Kỳ chỉ xong khi thu ĐỦ nghĩa vụ

Chốt 05/08/2026. Nghĩa vụ của một kỳ = `PrincipalAmount + InterestAmount + OverdueInterestAmount`. Thu một phần gốc, đủ gốc mà chưa đóng lãi, hay một phần gốc một phần lãi — **đều chưa xong**.

`schedulePaymentStatus` trong `loanMath.ts` là nguồn duy nhất, trả ba trạng thái `chua_thu` / `thu_mot_phan` / `da_thu_du`. `isScheduleFullySettled` là dạng gọn dùng ở chỗ chỉ cần đúng/sai. Trước đó `IsPaid` là **ô tích tay** và điều khiển cả ba đường: `getAutoDebtGroupInfo` bỏ kỳ đó khỏi đếm ngày quá hạn, phần hiển thị ngừng tính phạt, thẻ tổng hợp cộng toàn bộ gốc lãi vào cột đã thu. Tích sớm là **khai thiếu dư nợ, khai tốt nhóm nợ và tha phạt** — cả ba đều lệch về phía có lợi cho hồ sơ.

Ba điều bắt buộc phải giữ khi sửa chỗ này:

**Quy ước cũ phải được tôn trọng.** `IsPaid = true` kèm **cả hai** cột `ActualPaidPrincipal` và `ActualPaidInterest` bỏ trống nghĩa là "đã trả đủ theo lịch" — đo được 831/835 kỳ đã thu ở trạng thái này. Bỏ nhánh đó là biến 831 kỳ thành chưa thu và làm dư nợ toàn danh mục phình lên.

**Trả trước hạn không được trừ hai lần.** `PrincipalAmount` đã gồm `PrepaidPrincipalAmount`, nên gốc đã thu là `ActualPaidPrincipal + PrepaidPrincipalAmount` (khi có khai tay) — không phải nghĩa vụ trừ đi phần trả trước. Hồ sơ LÊ VĂN HẬU `2002/HĐTD/9665732/GNN-01` kỳ 7 và 10 trả trước 785 và 888 triệu; công thức sai biến khách **trả sớm** thành khách **nợ quá hạn**.

**Không cần ngưỡng làm tròn.** Đo 05/08/2026: 0 kỳ thiếu dưới 1.000đ, 0 kỳ thiếu dưới 100.000đ; hai kỳ thiếu thật đều trên 3 triệu. So bằng chính xác.

Phạt có tính vào nghĩa vụ hay không đặt ở hằng số `PENALTY_COUNTS_TOWARD_SETTLEMENT`, hiện `true` — kỳ đã thu đủ gốc lãi mà chưa đóng phạt vẫn chưa xong. Đổi một chỗ là đổi toàn hệ thống.

### Bất biến quan trọng nhất

> **Tổng tiền gốc các kỳ luôn bằng đúng số tiền vay**, ở mọi phương thức trả nợ.

Sai bất biến này là ngân hàng thu thừa hoặc thu thiếu của khách hàng. Đây là bài test đã bắt được lỗi trừ đôi tiền trả trước hạn.

### Làm tròn gốc

Làm tròn **LÊN** theo bước **10.000 đồng**, khai ở `PRINCIPAL_ROUND_MODE`. Kỳ cuối gánh phần dư để đảm bảo bất biến trên.

Bước này lấy từ chứng từ thật, không phải chọn cho tròn: GNN `PNAT.CN.03111223/GNN-01` cho vay 500.000.000đ chia 120 kỳ ghi gốc mỗi kỳ 4.170.000đ, kỳ cuối 3.770.000đ. `500.000.000 / 120 = 4.166.667`, làm tròn lên bước 10.000 ra đúng 4.170.000. Bước 1.000 dùng trước đây cho 4.167.000đ — lệch **mọi** kỳ so với chứng từ khách đang giữ. Đổi hằng số này là đổi cho toàn hệ thống; migration 18 đã sửa dữ liệu cũ theo bước mới.

### Phương thức trả gốc

`isBulletPrincipal` **chỉ căn cứ vào `PrincipalRepaymentMethod`** mà banker đã chọn. Phương thức vay không được đè lên lựa chọn đó — trước đây `LoanMethod === 'Hạn mức tín dụng'` ép mọi hợp đồng hạn mức thành gốc cuối kỳ, khiến giao diện ghi "Trả đều hàng tháng" nhưng cột gốc của mọi kỳ đều bằng 0.

Hợp đồng hạn mức vẫn **mặc định** "Gốc trả cuối kỳ", nhưng banker đổi được.

### Trả trước hạn

Phải được ghi nhận **kể cả khi kỳ đã tất toán**. Dư nợ trừ đúng bằng phần gốc ghi nhận trong kỳ — `principalInPeriod` đã bao gồm tiền trả trước, cộng thêm lần nữa là trừ đôi và ngân hàng mất gốc.

**Trả trước hạn trong lúc còn ân hạn gốc thì chia lại theo số kỳ SAU ân hạn.** Các kỳ ân hạn còn lại vẫn chưa trả gốc, nên số kỳ để chia phần dư nợ mới không phải `tổng kỳ − kỳ hiện tại`. Dùng công thức đó từng làm gốc mỗi kỳ tính hụt rồi dồn phần thiếu vào kỳ cuối: khoản 960 triệu chia 120 kỳ ân hạn 18 tháng ra gốc/kỳ 8,07 triệu thay vì ~9,26 triệu, kỳ cuối gánh 128,93 triệu.

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

### Số hiệu KUNN là số chứng từ, không được trùng

`nextKunnNumber` chỉ **gợi ý** số tiếp theo lúc mở form. Số đó đã cũ vào lúc bấm lưu, nên phải kiểm tra lại — `assertKunnNumberFree` trong `api.ts` hỏi lại database trước khi ghi. Dữ liệu thật từng có 8 dòng trùng số vì thiếu bước này.

Kiểm tra ở client **không phải lớp bảo vệ**: dưới RLS banker chỉ thấy KUNN của khách hàng mình nên số do banker khác đã dùng là vô hình. Lớp bảo vệ thật là unique index trên `lower(btrim("ContractNumber"))` (migration 20) — cùng lý lẽ với RLS. Hai lớp phải so theo cùng một quy tắc chuẩn hoá, đó là lý do có `normalizeKunnNumber`.

**Không tự đổi số giúp người nhập.** Số KUNN phải khớp GNN giấy; máy đặt lại thì bản đối chiếu hồ sơ và core banking đều lệch. Trùng số thì báo lỗi và để banker tra chứng từ.

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
| Trung dài hạn `1680/2026/TB-TGĐ` | Chính văn bản | **Đã đối chiếu** (migration 10) |
| Huy động `2279/2026/TB-BĐH` | Chính văn bản | **Đã đối chiếu** (migration 13) |

Bảng tính nội bộ còn **bỏ sót cột "Lãi trả trước" của kỳ hạn 12 tháng** — chỉ chép 3 trong 4 cách trả lãi. Migration 13 bổ sung 3 mức 8,17% / 8,25% / 8,34%.

**Gói cố định 3 tháng của trung dài hạn có LSCV đúng bằng 0%/năm.** Đây là ưu đãi 0% ba tháng đầu, là số liệu đã biết, không phải ô chưa điền. Migration 09 từng để `NULL` vì suy đoán sai từ bảng tính; migration 10 sửa thành `0`. Đừng "sửa" lại thành `NULL`.

Bảng tính nội bộ `Book.xlsx` **sai cả 5 dòng lãi suất ngắn hạn** khi so với văn bản 2274 (một dòng ghi 110,50% thay vì 11,70%; một dòng ghi 0% thay vì 8,45%). Vì vậy số liệu trung dài hạn và huy động lấy từ cùng file đó phải coi là tạm cho tới khi có văn bản gốc. Không sửa `SourceVerified` thành `true` khi chưa thực sự đối chiếu.

### Xuất bảng lãi suất gửi khách hàng

`buildRateSheetHtml` dựng một tài liệu HTML **tự chứa, khổ A4 một trang**, mở ở cửa sổ mới rồi gọi `print()` để banker lưu thành PDF. Không dùng thư viện ngoài: trình duyệt đã in ra PDF tốt hơn mọi thư viện nhúng, và thêm phụ thuộc chỉ để đóng gói HTML là không cần thiết.

Bố cục đo theo A4 trừ lề: rộng 703px, cao 1039px ở 96dpi. Khi thêm mục vào tờ này phải đo lại chiều cao thật, đừng ước lượng — tràn sang trang 2 làm tờ chào khách mất chuyên nghiệp.

**Không xuất file khi còn số liệu thiếu.** `findRateSheetBlockers` chặn bốn trường hợp: chương trình chưa đối chiếu văn bản gốc, chương trình chưa có dòng nào, còn gói chưa có lãi suất, còn bậc phí trả nợ trước hạn chưa có số. Gửi cho khách một bảng lãi suất có ô trống hoặc số chưa kiểm chứng là rủi ro danh tiếng và có thể thành cam kết sai.

Lãi suất `0%` **phải in ra "0%"**, không được in dấu gạch. Đây là lý do `formatRateForCustomer` phân biệt `0` với `null` thay vì dùng `||`.

Mọi chuỗi lấy từ cơ sở dữ liệu đều đi qua hàm escape trước khi ghép vào HTML. Tờ này ghép chuỗi thủ công nên không có lớp bảo vệ nào của React; có test riêng khẳng định thẻ `<script>` trong tên chương trình bị vô hiệu hoá.

Tờ chào khách **chỉ chứa thông tin đã công bố**: lãi suất, điều kiện, phí. Không đưa COF, biên độ lợi nhuận, hạn mức nội bộ hay dữ liệu khách hàng khác vào đây.

### Quyền ghi

Đọc: mọi người dùng đã đăng nhập. Ghi: **chỉ `admin`**. Sai một con số ở đây là chào sai lãi suất cho toàn hệ thống, khác hẳn dữ liệu khách hàng chỉ ảnh hưởng một hồ sơ.

---

## 9. Định dạng hiển thị

Người dùng chọn được kiểu phân cách số, số chữ số thập phân, số chữ số phần trăm và định dạng giờ ở tab **Cấu Hình & Cài Đặt**. Logic thuần ở `src/lib/formatSettings.ts`, trạng thái ở `FormatSettingsContext`.

| Thiết lập | Khoá localStorage | Mặc định |
| :--- | :--- | :--- |
| Kiểu phân cách | `app_number_style` | `vi` — nghìn dấu chấm, thập phân dấu phẩy |
| Số thập phân | `app_decimal_digits` | 2 |
| Phần trăm | `app_percent_digits` | 2 |
| Định dạng giờ | `app_time_format` | `24h` |
| Tự động phân cách khi gõ | `app_auto_group_money` | bật |

`fmtMoney`, `fmtRate` và `formatMoneyInput` trong `utils.ts` đọc thiết lập này, nên **mọi màn hình đổi theo mà không phải sửa nơi gọi**. Đây là lý do các hàm định dạng đọc thẳng localStorage thay vì nhận tham số: cùng cách `fmtDate` đã làm cho định dạng ngày.

Thiết lập được **cache trong module**, xoá cache khi lưu. Không có cache thì mỗi ô tiền trong bảng danh mục sẽ đọc localStorage một lần, bảng vài nghìn dòng là thấy chậm.

### Số tiền không có phần thập phân

Đồng Việt Nam không dùng phần lẻ trong nghiệp vụ, nên `fmtMoney` **luôn 0 chữ số thập phân**, chỉ ăn theo kiểu phân cách. Thiết lập "số thập phân" áp cho các số thường, không áp cho tiền.

### Đổi mặc định của lãi suất

`fmtRate` trước đây in `8.5%/năm` — dấu chấm thập phân và cắt số 0 thừa. Nay theo thiết lập nên mặc định thành **`8,50%/năm`**: dấu phẩy đúng chuẩn Việt Nam và khớp với bảng lãi suất gửi khách vốn đã in `8,45%`. Muốn về kiểu cũ thì chọn kiểu phân cách "Quốc tế" và phần trăm 1 chữ số.

`fmtRate` vẫn giữ suy đoán cũ `v > 1 ? v/100 : v` để nhận cả `0.085` lẫn `8.5`. **Suy đoán này sai với lãi suất trên 100%/năm** — hiếm gặp nên chưa sửa, nhưng đừng dựa vào nó cho dữ liệu mới.

---

## 10. Mua bán vốn nội bộ (COF)

Giá mua vốn từ Hội Sở — FTP bán (COF). Tab riêng vì đây là **số liệu điều hành nội bộ**, không bao giờ được đưa vào tài liệu gửi khách hàng. Logic ở `src/lib/cof.ts`, dữ liệu ở `CofPrograms` / `CofStandardRates` / `CofRateItems` (migration 13).

Đã nạp **phần cho vay VND** của Phụ lục B. Chưa nạp phần cho vay USD và toàn bộ Phụ lục A — FTP mua (VOF).

### Bảng kỳ hạn để dạng rộng, không dạng dài

`CofStandardRates` mỗi kỳ hạn **một dòng**, mỗi kỳ điều chỉnh lãi suất **một cột** (`FixedRate`, `Reset3M`… `Reset36M`). Đây đúng hình dạng bảng trong văn bản và là dạng admin sửa nhanh nhất — bấm thẳng vào ô, Enter là lưu. Nếu tách thành dạng dài mỗi ô một dòng thì giao diện phải xoay bảng lại và việc sửa trở nên rối.

**Ô trống là NULL, không phải 0%.** Văn bản chỉ công bố mức cho một số tổ hợp kỳ hạn × kỳ điều chỉnh; ô còn lại bỏ trống có nghĩa "không áp dụng". Ghi 0 vào đó là bịa ra một mức giá vốn bằng không.

Các mục còn lại nằm ở `CofRateItems` với hai cột `RateAnnual` và `Formula` tách bạch: văn bản có mục là con số (nhà ở xã hội 3,5%/năm), có mục là công thức bằng lời (CBNV = lãi suất cho vay − 0,75%/năm). Nhét công thức vào cột số sẽ mất nghĩa.

### Kỳ điều chỉnh 6M, 9M, 12M, 24M chỉ dành cho khoản vay cũ

Văn bản ghi rõ các kỳ này **chỉ áp dụng với khoản vay giải ngân trước ngày thông báo có hiệu lực**. Khoản vay mới chỉ được chọn LSCĐ hoặc ĐCLS 3M. Giao diện đánh dấu `(*)` ở các cột đó.

---

## 11. Bảo mật

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

## 12. Cơ sở dữ liệu

Script trong `supabase/migrations/` chạy **thủ công qua Supabase SQL Editor**, theo đúng thứ tự số.

> **Thứ tự triển khai:** khi một thay đổi vừa động vào lược đồ vừa động vào mã nguồn, **luôn chạy migration trước rồi mới deploy**. Làm ngược lại sẽ có khoảng thời gian hệ thống ở trạng thái hỏng.

Script trong `supabase/reports/` là **báo cáo chỉ đọc**, không phải migration: không UPDATE, không INSERT, chạy lại bao nhiêu lần cũng được.

### Mọi cột ngày đều là kiểu `date`

Không dùng `timestamptz` cho ngày nghiệp vụ. `HdtdDueDate` từng là `timestamptz` nên PostgREST trả về `2026-05-28T00:00:00+00:00` trong khi mọi cột khác trả về `2026-05-28`. Hệ quả: `creditLimit.ts` so chuỗi giữa hai dạng ra sai thứ tự, còn hai view thì tự chặn bằng regex `^\d{4}-\d{2}-\d{2}$` nên nhánh dự phòng coi như chết, và `saveContractAPI` xoá hẳn trường khỏi payload — mở KUNN cũ rồi lưu là mất giá trị mà giao diện vẫn báo thành công. Migration 19 đã đổi kiểu.

Ngày đọc từ database chuẩn hoá bằng **`toIsoDate` trong `utils.ts`**, không viết lại regex tại chỗ dùng. Hàm này cắt phần giờ **không quy đổi múi giờ**: giá trị banker nhập từ trình duyệt ở +07 nên ngày người nhập thấy là ngày theo giờ Việt Nam, quy đổi về UTC sẽ lùi một ngày.

### Bước chốt an toàn trong migration phải thực sự chạy được

Migration 16 bước 2 — đúng bước kiểm "số mới có trùng số cũ không" — thiếu dấu phẩy giữa hai CTE nên **luôn lỗi cú pháp**, còn bước 4 đổi số vẫn chạy. Đây là đường sinh ra phần lớn các cặp KUNN trùng số. Chạy migration nhiều bước thì đọc kết quả từng bước, thấy lỗi cú pháp ở bước rà soát là **dừng lại**, không nhảy sang bước cập nhật.

---

## 13. Sổ tra cứu — hàm nào giữ quy tắc nào

Mã nguồn không có chú thích, nên phần "vì sao" của từng hàm nằm ở đây.

### `loanMath.ts`

| Hàm | Điều phải biết |
| :--- | :--- |
| `buildDueDateSequence` | **Nguồn duy nhất** sinh dãy ngày đến hạn. Cả `generateSchedule` (tạo lịch mới) và `redateSchedules` (khai lại ngày khi sửa KUNN) đều gọi nó. Xem §2 *Ngày trả nợ kỳ đầu tiên*. |
| `resolveFirstDueAnchor` | Dịch mốc trả nợ lên từng tháng cho tới khi vượt ngày giải ngân, **giữ nguyên ngày trong tháng** khách đã chọn. |
| `redateSchedules` | Giữ nguyên số kỳ và mọi trường khác của từng kỳ, chỉ đổi `DueDate`. **Hiện vẫn ghi đè ngày của kỳ đã thu** — chờ quyết định nghiệp vụ. |
| `paidPrincipalOf` | Ba khái niệm khác nhau, đừng gộp: `PrincipalAmount` là gốc **phải** trả theo lịch (không đổi khi khách trả thiếu), `ActualPaidPrincipal` là gốc **đã** trả, `PrepaidPrincipalAmount` là gốc trả **trước hạn**. Dữ liệu cũ có kỳ đánh dấu đã thanh toán nhưng `ActualPaidPrincipal` bằng 0 — hiểu là đã trả đủ theo lịch. `PrincipalAmount` đã gồm phần trả trước hạn của kỳ nên nhánh đó không cộng thêm lần nữa. |
| `computeOutstandingBalance` | Trả 0 khi `IsSettled` — tất toán trước hạn là hết nợ dù lịch còn hàng chục kỳ chưa tới hạn. Không có dòng lịch nào thì rơi về `CurrentBalance`; xem cảnh báo dư nợ đóng băng ở §2. Dư nợ giảm theo gốc **đã thực thu**, không theo gốc phải trả. |
| `computeSchedulePenalty` | Phạt gốc = 150% lãi suất trong hạn, phạt lãi chậm trả = 10%/năm, cùng Actual/365. Hằng số ở `stkPledge.ts`. |

### `scheduleView.ts`

Nguồn duy nhất phân rã nghĩa vụ **một kỳ** thành gốc / lãi / lãi phạt theo ba cột Phải trả · Đã trả · Còn nợ. Mọi chỗ hiển thị số tiền của một kỳ đều gọi `periodObligation`, tổng cột gọi `sumObligations` trên cùng mảng đó — tổng chân bảng khi ấy **bằng định nghĩa** là tổng các dòng.

Vì sao phải rút ra: trước đó công thức này có **ba bản viết trong `.tsx`** — dòng bảng, `tfoot`, và `PeriodDetailCard` — và chúng đã trôi dạt đúng như §1 cảnh báo. Bản `tfoot` phân giải lãi phạt bằng "đã tất toán thì lấy cột, chưa thì tính dồn tích", nên với kỳ chưa tất toán mà banker **khai tay `OverdueInterestAmount = 0` (miễn phạt)** nó bỏ qua số khai và áp mức tính tự động 150%. Dòng hiện `0`, chân bảng hiện một số lớn hơn: tổng cột không bằng tổng các dòng trên cùng màn hình.

| Hàm | Điều phải biết |
| :--- | :--- |
| `resolvePenaltyDue` | `OverdueInterestAmount` là lãi phạt **đã ghi nhận** và luôn thắng, kể cả khi bằng 0 — đây chính là cái bẫy `\|\|` ở §1, phải dùng `??`. `KUNN PNAT.CN.01290824/GNN-01` khai `PENALTY_RATE:0` là ca thật. Chỉ khi cột **chưa khai** mới rơi về `computeSchedulePenalty`, và kỳ đã tất toán chưa khai thì bằng 0 chứ không tính dồn tích. |
| `periodObligation` | Phân giải lãi phạt phải khớp `schedulePaymentStatus`, vốn chỉ lấy cột đã ghi nhận làm nghĩa vụ. Lệch nhau thì màn hình vừa báo "đã thu đủ" vừa hiện một khoản còn nợ — trạng thái vô lý mà §1 yêu cầu chặn từ gốc. |
| `sumObligations` | Cộng `total.unpaid` **của từng kỳ đã kẹp sàn 0**, không lấy tổng phải trả trừ tổng đã trả: một kỳ thu vượt sẽ bù khống phần thiếu của kỳ khác và giấu mất kỳ nợ. |

Số ngày quá hạn lấy từ `overdueDaysOfSchedule`, **không tự viết lại phép trừ ngày trong `.tsx`** — `diffDays` từng có 3 bản, xem §1.

### Thẻ tín dụng — ba trường hợp mở thẻ

Thẻ là **rủi ro tái sử dụng**: trả vào là tiêu lại được. Nên thẻ vào cụm theo **hạn mức cấp**, không theo dư nợ — cùng cơ sở với HMTD tuần hoàn ở §4.

| TH | TSBĐ | Ràng buộc |
| :--- | :--- | :--- |
| 1 | Không có (tín chấp) | Không kiểm LTV |
| 2 | Tài sản đang thế chấp | Hạn mức thẻ ≤ phần còn trống của **cụm liên thông**, tính cả khoản vay và thẻ khác |
| 3 | Sổ tiết kiệm cầm cố | Thêm **trần sản phẩm 90% mệnh giá**, áp đồng thời với ràng buộc cụm |

**Trần sản phẩm và trần LTV là hai ràng buộc khác loại, cả hai phải thoả.** Sổ 500tr cùng hệ thống có LTV 100% ở góc nhìn cho vay nên khả năng bảo đảm của cụm là 500tr; nhưng thẻ bị `CARD_STK_LTV_PERCENT = 90` kẹp về 450tr. Sổ đó đang bảo đảm cho khoản vay 300tr thì thẻ tối đa `min(500−300, 450) = 200tr`. `checkCardLimit` trả về `blocker` để thông báo nêu đúng trần nào bị chạm.

Vì sao 90% chứ không theo bảng LTV: đây là quy tắc **của sản phẩm thẻ**, cố ý đè lên bảng LTV cho vay. Đừng "sửa" nó thành `getEffectiveLtv`.

Trước đợt này thẻ **hoàn toàn vô hình** với chốt kiểm soát TSĐB — `checkCollateralCapacity` chỉ nhận `LoanContract[]`. Một thẻ 500tr trên căn nhà đang thế chấp tiêu tốn 0đ khả năng bảo đảm, chốt báo xanh trong khi cụm đã vượt trần. Và `CreditCardView` tự tính `giá trị × LTV / 100` — bản LTV thứ tư bị trôi dạt mà §1 đã gọi tên, nó nhận cả định giá hết hiệu lực trong khi `usableCapacity` trả 0.

Vượt trần thì **chặn lưu**, mở được bằng ô xác nhận ngoại lệ kèm lý do bắt buộc. Dấu vết nằm ở cột riêng `IsLtvException` / `LtvExceptionReason`, **không** nhét vào `Note`.

`CreditCards` từng có **hai cột cùng nghĩa**: `CreditLimit` (web đọc) và `Limit` (WPF ghi, `NOT NULL` không mặc định). `saveCreditCardAPI` bóc `Limit` ra khỏi payload rồi không ghi lại, nên **cấp thẻ mới từ web chưa bao giờ chạy được** — đổ `null value in column "Limit"`. Migration 28 gộp về `CreditLimit` và xoá cột thừa. Đọc hạn mức thẻ dùng `cardGrantedLimit`, đừng viết lại `CreditLimit || Limit` — bẫy `||` khiến hạn mức 0 hợp lệ rơi xuống cột cũ.

### Tàn dư WPF — cái gì đã gỡ, cái gì cố ý giữ

Hệ thống đã chuyển hoàn toàn sang web (06/08/2026), ứng dụng WPF ngừng hoạt động. Migration 28 gỡ: cột `CreditCards.Limit`, và chuỗi `[CollateralId:` trong `Note` (backfill về cột `CollateralId` trước khi xoá, giữ nguyên ghi chú thật của banker).

**`[PENALTY_RATE:` cố ý KHÔNG gỡ.** Đó là lãi suất phạt quá hạn theo từng khoản và **chưa có cột nào chứa** — gỡ đi là mất hẳn con số. `stripLegacyNoteBlobs` cũng cố tình bỏ qua nó. Chờ quyết định "lãi suất phạt có khác 150% theo từng khoản không" ở §1, có cột rồi mới gỡ.

Còn tồn đọng, chưa xử lý trong đợt này: các nhánh đọc `[RATE_HISTORY:` / `[COLLATERAL_IDS:` / `[PENALTY_SURCHARGE:` trong `utils.ts`. Migration 24 đã dọn dữ liệu về 0 nên chúng là mã chết, nhưng chúng đụng vào lịch sử lãi suất nên đáng một đợt riêng có đối chiếu, không gỡ kèm.

### `creditContract.ts`

| Hàm | Điều phải biết |
| :--- | :--- |
| `nextKunnNumber` | Lấy `MAX` số thứ tự rồi cộng 1, **không đếm số dòng** — đếm dòng sinh trùng ngay khi có KUNN bị xoá giữa dãy. Số đã dùng không tái sử dụng. Xem §4 *Số hiệu KUNN*. |
| `normalizeKunnNumber` | `'HD01/GNN-01'` và `'hd01/gnn-01 '` là cùng một số chứng từ. Unique index dưới database cũng đặt trên `lower(btrim(...))` để hai lớp kiểm tra nói cùng một chuyện. |
| `checkKunnAgainstContract` | Trả **cảnh báo**, không chặn cứng: nghiệp vụ luôn có ngoại lệ được phê duyệt, và còn phải nhập được KUNN lịch sử của hợp đồng đã hết hiệu lực. Ràng buộc thật là **ngày giải ngân** phải nằm trong thời gian hiệu lực; KUNN đáo hạn sau ngày hết hiệu lực **không** phải lỗi. |
| `kunnRevolvingStatus` | Đáo hạn **trước** ngày hết hiệu lực HĐTD: trả xong còn rút lại được. Đáo hạn **sau**: trả xong thì hạn mức đã hết hiệu lực, khách buộc phải tất toán — không tất toán được là nguy cơ chuyển nhóm nợ. |
| `summarizeCreditContracts` | Trả về **cả** HĐTD chưa có KUNN nào: hợp đồng đã ký chưa giải ngân, và hạn mức còn hiệu lực đã tất toán hết KUNN, đều là trạng thái bình thường phải nhìn thấy. |
| `canCloseCreditContract` | Chốt đóng HĐTD cho đường giao diện. Trả về danh sách số hiệu KUNN chưa tất toán để thông báo lỗi nêu đúng khoản phải xử lý. |

### `creditLimit.ts`

`computeLimitGroups` là **nguồn duy nhất** tính hạn mức khả dụng. Nhóm theo mã hạn mức dùng chung nếu có, ngược lại theo số HĐTD — cùng cách nhóm với `computeCreditLimit` để tổng mức cấp của hai hàm luôn khớp.

Cơ sở trừ hạn mức phụ thuộc sản phẩm: **HMTD tuần hoàn** lấy mức cấp − dư nợ các KUNN còn hiệu lực (trả nợ là giải phóng hạn mức); **cho vay từng lần** lấy mức cấp − tổng đã nhận nợ kể cả KUNN đã tất toán (đã giải ngân là hết).

Mức cấp và ngày hết hiệu lực là thông tin **cấp HĐTD**, nên vẫn ghi nhận từ dòng đang bị `excludeContractId` loại trừ, và ngày hết hiệu lực lấy mốc muộn nhất trong nhóm. Một KUNN thuộc HĐTD đã đóng là đủ để **cả nhóm** hết quyền giải ngân: nhóm dùng chung hạn mức thì hạn mức chỉ có một, không rút qua hợp đồng khác được.

`headroom` là hạn mức trống theo dư nợ, **chưa** xét hiệu lực — giữ lại để đối chiếu. `available` mới là số giải ngân được thật.

### `dueList.ts`

`filterByDue` đặt mốc 0 vào nhóm "sắp đến hạn": đến hạn **hôm nay** thì chưa quá hạn, khớp cách phân nhóm nợ ở §2. Thiếu số ngày cũng coi là sắp đến hạn để dòng đó không âm thầm biến mất khỏi cả hai bộ lọc.

`buildDueListHtml` không dùng thư viện ngoài, mở cửa sổ mới rồi để trình duyệt in ra PDF — cùng cách làm với tờ lãi suất. Khổ A4 **ngang** vì các bảng này nhiều cột.

### In và tải file — hai đường duy nhất

**In: `printHtmlDoc` trong `printHtmlDoc.ts`.** Không nơi nào được gọi `window.open` để in.

Trước đây có ba cách cho cùng một việc: `printHtmlDoc` (iframe ẩn, tự dọn theo `afterprint`), `openPrintWindow` trong `dueList.ts` (popup), và một bản popup chép tay trong `RateQuoteView` giống hệt `openPrintWindow`. `DocumentPreview` là cách thứ tư, popup kèm `<script>window.onload = print()`.

Popup sai ở ba điểm. Trình duyệt chặn popup thì lệnh in **im lặng không xảy ra** — `DocumentPreview` còn `return` trắng, người dùng bấm In mà không có gì báo, đúng kiểu nuốt lỗi §1 cấm. `setTimeout(300)` trước khi in là cuộc đua: máy chậm thì in ra trang trắng. Và cửa sổ không bao giờ được dọn.

iframe không dính cái nào: không bị chặn, `document.write` là đồng bộ nên không cần chờ, và `afterprint` dọn ngay. `printHtmlDoc` trả `boolean` — **phải kiểm và báo cho người dùng khi false**.

**Tải file: `downloadTextFile(content, fileName, mimeType)` trong `xlsExport.ts`.** Ba bản Blob + thẻ neo chép tay giống hệt nhau, chỉ khác MIME. `downloadXls` giờ là lớp mỏng gọi nó. Dùng hằng `MIME_XLS` / `MIME_DOC`, đừng gõ lại chuỗi MIME.

Tệp Word phải mở đầu bằng `'\uFEFF'` — thiếu BOM thì Word đọc sai tiếng Việt. Viết bằng dấu escape, đừng dán ký tự BOM thật vào mã nguồn: nó vô hình, người sau sửa sẽ xoá nhầm.

### `rateSheet.ts` · `dueList.ts` — bảng in

Cả hai dựng tài liệu HTML tự chứa rồi để trình duyệt in ra PDF, **không dùng thư viện ngoài**. Tờ lãi suất khổ A4 dọc; danh sách theo dõi hạn khổ A4 **ngang** vì nhiều cột.

Trong `<style>` của tờ in bắt buộc có `print-color-adjust: exact` cho `html, body, header, th, .meta` và hàng chẵn: **Chrome mặc định KHÔNG in nền khi Save as PDF**, thiếu dòng này thì dải tiêu đề xanh và ô tiêu đề bảng in ra trắng, chữ trắng mất hút.

`KENH_GUI_KHACH` chỉ gồm `quay` và `online` — xem §8 *Tờ chào khách chỉ chứa thông tin đã công bố*. Có test riêng khẳng định chuỗi FTP không xuất hiện trong tờ in.

### `fontSettings.ts`

Chỉ dùng font có sẵn trên máy, **không tải từ CDN**: tải font ngoài kéo theo phụ thuộc mạng và làm chữ nhảy khi trang mới mở, mà hệ thống này chạy trong mạng nội bộ ngân hàng. Mỗi lựa chọn đều có dấu tiếng Việt đầy đủ và font dự phòng phía sau.

---

## 15. Lớp token giao diện & hai ngôn ngữ

### Vì sao có lớp token

Trước đây mỗi component tự quyết định màu của mình bằng `isLight ? 'bg-white ...' : 'bg-slate-900 ...'` — 107 biểu thức rải trong 34 file, thêm chuỗi class truyền qua props (`containerCardBg`, `tableHeaderStyle`, `inputStyle`) và 18 dòng `!important` trong `index.css` để vá tương phản. Hệ quả: đổi diện mạo là phép nhân 34 lần, và tương phản WCAG phải sửa ở từng lớp Tailwind.

Nay màu khai báo **một chỗ** trong `index.css`: biến `--t-*` đổi theo `:root.light` / `:root.dark`, `@theme inline` biến chúng thành utility Tailwind thật.

| Nhóm | Utility | Dùng cho |
| :--- | :--- | :--- |
| Nền | `bg-surface` `bg-panel` `bg-panel-muted` | nền trang, thẻ, dải tiêu đề bảng |
| Viền | `border-line` `border-line-strong` | viền thường, viền nhấn (đường tổng cộng) |
| Chữ | `text-ink` `text-ink-muted` `text-ink-faint` | số liệu, chữ phụ, nhãn cột |
| Hành động | `bg-accent` `text-accent` `bg-accent-soft` `text-accent-ink` | nút chính, dòng đang chọn |
| Trạng thái | `text-pos` `text-neg` `text-warn` (+ `-soft`) | đã thu, quá hạn / còn nợ, cảnh báo |

**Quy tắc: màu chỉ được mang nghĩa.** Khung giao diện đi màu trung tính; `pos` / `neg` / `warn` chỉ dùng cho trạng thái nghiệp vụ, `accent` chỉ cho hành động và lựa chọn hiện hành. Không tô màu để trang trí — banker học được ý nghĩa của màu thì mới quét bảng nhanh.

Mọi cặp màu đã đo tương phản ở cả hai giao diện, thấp nhất **5.09** (nhãn cột `ink-faint` trên `panel-muted`). Đổi giá trị `--t-*` thì đo lại, đừng ước lượng bằng mắt: chữ 10–11px không có chỗ để hụt tương phản. Riêng viên "Quá hạn" nền đặc phải dùng `text-surface` chứ không `text-white` — ở giao diện tối nền đỏ sáng, chữ trắng chỉ đạt 2.71.

Mật độ dòng đi qua `data-density="cozy" | "compact"` đặt ở khối bao ngoài, ô bảng dùng `px-[var(--row-px)] py-[var(--row-py)]`. Bảng lịch thu nợ 40 kỳ và bảng tra cứu không cần cùng chiều cao dòng.

Số tiền luôn `font-mono` — lớp này đã bật `tabular-nums`, cột số mới thẳng hàng. Số 0 in thành `–`: bảng ngân hàng đầy số 0 thì mắt không tìm ra số thật.

### Hai ngôn ngữ

`src/lib/i18n.ts` giữ từ điển `vi` / `en`, `LanguageContext` cấp hàm `t()` và ghi `app_lang` vào localStorage kèm thuộc tính `lang` trên `<html>`. Công tắc VI/EN nằm ở Header.

**Không viết song ngữ chồng dòng** (nhãn tiếng Anh kèm nhãn tiếng Việt bên dưới). Một màn hình chỉ nói một thứ tiếng tại một thời điểm; muốn thấy tiếng kia thì bật công tắc.

Toàn bộ giao diện đã chuyển sang token: không còn `isLight` trong mã, không còn lớp màu thô (`slate-*`, `sky-*`, `emerald-*`…) trong `.tsx`, và các khối `!important` ghi đè theo lớp Tailwind trong `index.css` đã gỡ hết — chỉ còn khối `prefers-reduced-motion`.

Chuỗi class dùng chung nằm ở `src/lib/uiClasses.ts` (`UI.containerCardBg`, `UI.inputStyle`, `UI.tableHeaderStyle`, `BTN_PRIMARY`, `DEBT_GROUP_COLOR`…). Đây là nơi duy nhất khai báo; component không tự dựng chuỗi class riêng và **không truyền chuỗi class qua props** nữa. `src/lib/themeStyles.ts` đã xoá.

Lưu ý khi đặt tên lớp động: Tailwind quét mã tĩnh, nên `bg-g${n}` **không sinh ra lớp nào**. Dùng bảng tra như `DEBT_GROUP_COLOR[n]`.

Đã chuyển sang `t()`: Header, Sidebar, `ScheduleTab`, `PeriodDetailCard`. Các màn còn lại vẫn để chuỗi tiếng Việt cứng — vì vậy **công tắc VI/EN đang tắt** bằng cờ `LANG_SWITCH_ENABLED` trong `i18n.ts`. Bật nửa vời còn tệ hơn không bật: người dùng sẽ thấy thanh điều hướng tiếng Anh nằm cạnh thân màn tiếng Việt. Dịch xong toàn bộ thì bật lại cờ đó.

### Quy tắc hình thức dùng chung

Ba thứ dưới đây khai báo ở `src/lib/uiClasses.ts`, đừng dựng lại tại chỗ:

| Hạng mục | Quy tắc |
| :--- | :--- |
| Bo góc | `RADIUS_PANEL` (`rounded-lg`) cho thẻ và bảng; `RADIUS_CONTROL` (`rounded-md`) cho nút, ô nhập, viên trạng thái. Chỉ hai bán kính, không có bán kính thứ ba |
| Nút | `BTN_PRIMARY` nền màu nhấn — **mỗi màn chỉ một nút chính**; `BTN_SECONDARY` viền mờ cho thao tác phụ như xuất Excel, in, nhập CSV; `BTN_DANGER` cho thao tác xoá |
| Tiêu đề | `HEADING_SCREEN` cho tiêu đề màn, `HEADING_PANEL` cho tiêu đề thẻ, `SECTION_LABEL` cho nhãn nhỏ. **Chữ in hoa chỉ dùng cho nhãn 10–11px**; tiêu đề cỡ `text-sm` trở lên viết thường |

Màu nền đặc của trạng thái (`bg-neg`, `bg-warn`, `bg-pos`) đi kèm chữ `text-surface`, không phải `text-white`: ở giao diện tối nền đỏ sáng với chữ trắng chỉ đạt tương phản 2,71.

Bảng dữ liệu dùng `TABLE_HEAD` cho hàng tiêu đề và `TABLE_CELL` cho ô. Ô lấy giãn cách từ biến `--row-px` / `--row-py` nên mọi bảng đổi mật độ cùng lúc; `data-density="compact"` đặt ở khối bao ngoài để thu gọn một vùng cụ thể. Các màn còn lại vẫn để chuỗi tiếng Việt cứng trong mã, chuyển dần theo từng đợt cùng lúc dọn `isLight`. Giá trị dữ liệu lấy từ CSDL (`KunnTenor`, `PrincipalRepaymentMethod`, tên nhóm nợ) **không dịch** — đó là dữ liệu nghiệp vụ, không phải giao diện.

---

## 16. Tách vai trò trong `src/`

| Thư mục | Vai trò |
| :--- | :--- |
| `src/lib/` | Logic thuần, không phụ thuộc React: tính toán tài chính, định dạng, gọi API, chuỗi class dùng chung, từ điển ngôn ngữ |
| `src/hooks/` | Trạng thái + luồng nghiệp vụ tái sử dụng được, ví dụ `usePaymentModal` giữ toàn bộ luồng ghi nhận thu nợ (mở form, dựng bản ghi, lưu, tính lại lịch) |
| `src/context/` | Trạng thái toàn ứng dụng: phiên đăng nhập, giao diện sáng/tối, ngôn ngữ, thiết lập định dạng |
| `src/components/views/` | Màn hình: điều phối dữ liệu và ghép các thành phần con, **không** ôm luôn logic nghiệp vụ |
| `src/components/<miền>/` | Thành phần thuộc một miền nghiệp vụ (`portfolio`, `collateral`, `documents`, `calculator`) |

Một tệp làm một việc. Màn hình quá 400 dòng là dấu hiệu logic đang nằm nhầm chỗ: rút phần tính toán thuần về `lib/`, phần trạng thái + luồng về `hooks/`, phần trình bày về component con.

Màn Quản lý khoản vay đã tách theo mẫu này:

| Tệp | Giữ việc gì |
| :--- | :--- |
| `lib/kunnForm.ts` | Ánh xạ hai chiều giữa bản ghi KUNN và dữ liệu biểu mẫu: `contractToFormFields`, `blankFormFields`, `buildKunnPayload`, `nextKunnNumberFor`. Thuần, không React, kiểm thử được |
| `hooks/useCustomerPortfolio.ts` | Tra cứu khách hàng và nạp dữ liệu: danh sách KH, HĐTD, KUNN, TSBĐ, lịch thu nợ; chọn khách, chọn KUNN, xoá tìm kiếm |
| `hooks/usePaymentModal.ts` | Luồng ghi nhận thu nợ: mở form, dựng bản ghi, lưu, tính lại lịch, trả về dư nợ và nhóm nợ mới |
| `views/LoanPortfolioView.tsx` | Điều phối: nối ba phần trên với các component trình bày, giữ ràng buộc hạn mức và luồng lưu KUNN |

Hook nhận việc cập nhật giao diện qua callback (`onCustomerChanged`, `onContractOpened`, `onSaved`) chứ không tự đụng vào trạng thái của màn hình — nhờ vậy hook không biết gì về bố cục và dùng lại được.

Hai màn khác đã tách theo cùng nguyên tắc:

`DocumentForm` trước đây là một hàm 953 dòng rẽ nhánh theo tám loại biểu mẫu. Nay mỗi loại là một tệp trong `components/documents/forms/` và `DocumentForm` chỉ còn điều hướng. Mỗi biểu mẫu khai báo đúng những trường nó dùng, nên đọc một tệp là biết loại hợp đồng đó cần gì.

`RateQuoteView` giao phần nạp chương trình lãi suất cho `hooks/useRatePrograms`: tải chương trình cùng bậc lãi, phí trả trước, mã FBE, thẩm quyền, tuỳ chọn phí, điều kiện — rồi lọc sẵn theo chương trình đang hiệu lực. Màn hình giữ phần công cụ tính và trình bày.

---

## 17. Lệnh thường dùng

```bash
npm run dev        # Máy chủ phát triển
npm run build      # Kiểm tra kiểu + đóng gói
npm test           # 739 test: 736 logic tài chính + 3 khói giao diện
npm run lint       # Kiểm tra mã nguồn
```
