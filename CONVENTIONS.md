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

Toàn bộ nằm trong `src/lib/` dưới dạng hàm thuần, không phụ thuộc React, được phủ 902 test tại `src/lib/__tests__/`.

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
| `businessPlan.ts` | Phương án kinh doanh: cân đối, kết quả kinh doanh, nhu cầu vốn lưu động, khả năng trả nợ |
| `businessPlanExport.ts` | Ba phụ lục xuất Excel của phương án kinh doanh |

### Nơi lưu trữ chung — dùng, đừng chép lại

Đợt gộp 05/08/2026 rút các bản sao trong `.tsx` về một chỗ. Cần thứ nào dưới đây thì import, tuyệt đối không viết lại trong component:

| Việc cần làm | Gọi hàm |
| :--- | :--- |
| Tiền phạt quá hạn của một kỳ (150% gốc + 10% lãi chậm trả) | `computeSchedulePenalty` (`loanMath.ts`) |
| Số ngày quá hạn thực tế của một kỳ | `overdueDaysOfSchedule` (`loanMath.ts`) |
| Ngày hôm nay dạng `YYYY-MM-DD` | `todayIso` (`utils.ts`) |
| Số ngày còn lại tới một mốc | `daysUntil` (`utils.ts`) |
| Mốc thu lãi hàng tháng kế tiếp | `monthlyDueInfo` (`dueList.ts`) |
| Ba con số mức cấp / dư nợ / khả dụng của một khách hàng | `totalsOfCreditContracts` (`creditContract.ts`) |
| Dư nợ của một khoản vay | `outstandingOf` (`loanMath.ts`) — `computeOutstandingBalance` chỉ là lớp bọc khi có sẵn lịch |

**Không có lãi suất mặc định.** `getEffectiveActiveRate` trả **0** khi hợp đồng chưa khai lãi suất, và `fmtRate(0)` hiện `— chưa khai`. Trước 18/08/2026 nó rơi về hằng số `DEFAULT_RATE_PERCENT = 8.5` — con số đó đã chảy vào `InterestRate` của hồ sơ thật rồi vào lịch trả nợ, thu lãi 8,5% trên một khoản chưa ai khai lãi suất. Một hằng số dự phòng **không bao giờ** được đóng vai số liệu hợp đồng: thiếu thì phải nói là thiếu.

**Ưu đãi bỏ trống thời gian = lãi suất cố định suốt kỳ vay.** Banker gõ 7,5 rồi thôi nghĩa là không có giai đoạn sau ưu đãi. Bản cũ đòi `pref > 0 && months > 0`, không đủ thì **vứt luôn con số 7,5** và ghi `null` vào cả sáu cột lãi suất — im lặng, màn hình vẫn báo lưu thành công. Nay `buildRateFields` giữ lại `PreferentialRate` và để `PreferentialPeriodMonths` trống.
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

**Ngày trong tháng giữ nguyên từ kỳ đầu tới kỳ cuối.** Khách trả ngày 15 thì mọi kỳ đều ngày 15. Ngày đáo hạn KUNN **không** đổi ngày của kỳ nào ở giữa; nó chỉ quyết định **kỳ cuối kết thúc ở đâu**, và chỉ với hạn mức tín dụng — xem mục dưới.

Đã có lúc làm ngược lại và phải trả giá. Ngày 06/08/2026 một chốt "kéo kỳ cuối về ngày đáo hạn" được thêm vào `buildDueDateSequence`, kèm `alignLastPeriodToMaturity` và một nút bảo trì ở tab Cài đặt quét toàn danh mục. Lý lẽ khi đó: *"31/98 KUNN có kỳ cuối không rơi đúng ngày đáo hạn"*. Đó là đọc ngược bằng chứng — 31 khoản cùng theo một khuôn là dấu hiệu **khuôn ấy chính là quy tắc**, không phải dấu hiệu 31 khoản đều hỏng. Không hồ sơ giấy nào được đối chiếu, không banker nào được hỏi.

Nút đó chạy `recalculateSchedules` trên **toàn bộ** các kỳ chứ không riêng kỳ cuối, và với kỳ chưa thu nó ghi đè `InterestAmount` bằng số tự tính — xoá mọi con số banker khai tay. Không xem trước, không xác nhận, không sao lưu. Bấm một cái là ghi thẳng vào danh mục.

Bài học, ghi ở đây để không lặp lại: **một khuôn lặp lại trong dữ liệu là quy tắc cần hỏi, không phải lỗi cần sửa.** Và công cụ ghi hàng loạt phải có bước xem trước liệt kê đúng những gì sắp đổi, trước khi ghi dòng đầu tiên.

### Ngày đáo hạn là chốt chặn của dãy kỳ

Chốt 17/08/2026, thay cho mâu thuẫn treo từ 07/08 giữa `supabase/reports/06_ky_cuoi_lech_ngay_dao_han.sql` và lời banker. Áp cho **cả hai loại vay** — chỉ khác nhau ở chỗ lấy ngày đáo hạn của cái gì:

| Loại vay | Chốt chặn | Vì sao |
| :--- | :--- | :--- |
| **Hạn mức tín dụng** | Ngày đáo hạn **KUNN** | HĐTD chỉ cấp quyền rút vốn; nghĩa vụ trả nợ thuộc về từng KUNN, và KUNN được phép sống qua ngày HĐTD hết hạn |
| **Cho vay từng lần** | Ngày đáo hạn **khoản vay** | HĐTD và KUNN là một, cùng thời hạn |

Nợ chấm dứt ở ngày đáo hạn, nên dãy kỳ cũng phải chấm dứt ở đó — không sớm hơn để khỏi thu thiếu lãi, không muộn hơn để khỏi thu lãi trên khoản đã hết hạn:

| Ngày due cuối so với ngày đáo hạn | Kết quả |
| :--- | :--- |
| **Sau** | Huỷ kỳ due cố định, dời về đúng ngày đáo hạn. Thu toàn bộ gốc còn lại + lãi thực tế. Số kỳ không đổi |
| **Trùng** | Không đổi gì |
| **Trước** | Kỳ due đóng như thường, rồi mở thêm **một kỳ** tới ngày đáo hạn thu nốt gốc còn lại + lãi số ngày lẻ |

Cài ở `applyMaturityToDueDates`: bỏ mọi ngày due **sau** ngày đáo hạn rồi nối ngày đáo hạn vào cuối nếu chưa có. Một phép biến đổi lo cả ba trường hợp, và **luỹ đẳng** — chạy lại trên dãy đã có kỳ phụ ra đúng dãy cũ, nên `redateSchedules` không đẻ thêm kỳ mỗi lần bấm "Tính lại lịch". Có test khoá tính chất này.

**Kỳ phụ chỉ sinh ra khi thật sự còn nợ.** `generateSchedule` dừng vòng lặp khi dư nợ về 0, nên:

- **Hạn mức**: gốc trả cuối kỳ, dư nợ vẫn nguyên tới ngày đáo hạn → kỳ phụ luôn có, và **gốc dồn vào chính kỳ đó**, không phải kỳ due tháng trước.
- **Từng lần**: gốc trả đều **làm tròn lên** bước 10.000đ nên dư nợ về 0 tại hoặc trước kỳ due cuối. Kỳ phụ nếu có sẽ rỗng cả gốc lẫn lãi, và không được sinh ra. Đây là hệ quả của quy tắc làm tròn, không phải quy tắc riêng — có test khoá trên ba số tiền vay khác nhau.

Nguồn ngày đáo hạn là `maturityDateOf`: `KunnDueDate` đã khai, thiếu thì suy ra `DisbursementDate + KunnTenor` (hoặc `LoanTenorMonths`). **Không** đọc `ContractEndDate` — lấy hạn HĐTD làm hạn khoản vay chính là lỗi đã gỡ ở trên, và có test khoá riêng cho điều đó.

Điều bị gỡ ngày 07/08 và **vẫn còn bị gỡ**: kéo kỳ cuối về ngày đáo hạn cho **mọi** loại vay, cộng nút bảo trì quét toàn danh mục ghi đè `InterestAmount` không xem trước.

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

Mặc định làm tròn **LÊN** theo bước **10.000 đồng**, khai ở `PRINCIPAL_ROUND_MODE`. Kỳ cuối gánh phần dư để đảm bảo bất biến trên.

Bước này lấy từ chứng từ thật, không phải chọn cho tròn: GNN `PNAT.CN.03111223/GNN-01` cho vay 500.000.000đ chia 120 kỳ ghi gốc mỗi kỳ 4.170.000đ, kỳ cuối 3.770.000đ. `500.000.000 / 120 = 4.166.667`, làm tròn lên bước 10.000 ra đúng 4.170.000. Bước 1.000 dùng trước đây cho 4.167.000đ — lệch **mọi** kỳ so với chứng từ khách đang giữ. Migration 18 đã sửa dữ liệu cũ theo bước mới.

**Bước 10.000 đã được kiểm chứng trên toàn danh mục** (10/08/2026), không còn là suy luận từ một tờ GNN. Migration 18 chỉ viết lại kỳ **chưa** thu, nên gốc của kỳ **đã** thu còn giữ con số nguyên bản và dùng làm bằng chứng được: 28 khoản tái tạo được bằng bước 10.000 và **không** tái tạo được bằng bước 1.000; 8 khoản chia hết tuyệt đối nên không mang thông tin; **0 khoản nói bước khác**.

Cách đo phải là **tái tạo lại con số** từ thương số, không phải xét chia hết. Phép chia hết cho ra 14 khoản trông như "bước 50.000" — sai, vì một khoản dùng bước 10.000 rơi vào bội số của 50.000 với xác suất 1/5 thuần ngẫu nhiên.

### Gốc mỗi kỳ khai theo GNN — `MonthlyPrincipalAmount`

Bước làm tròn là dữ liệu **của từng giấy nhận nợ**, không phải thiết lập hệ thống. Cột `LoanContracts.MonthlyPrincipalAmount` (migration 36) khai ngoại lệ; `NULL` = tự tính bằng thương số đã làm tròn, **không phải** chưa khai. Đọc bằng `resolveMonthlyPrincipal`, đừng viết `MonthlyPrincipalAmount || <mặc định>`.

Ô nhập là **số tiền**, cố ý **không** phải drop down chọn bước làm tròn. Banker đọc trên GNN con số "4.170.000đ/kỳ" chứ không đọc "bước 10.000"; drop down bắt suy ngược, và đoán sai thì im lặng hoàn toàn — mọi kỳ lệch mà Σgốc vẫn đúng. Số tiền còn diễn tả được ca gốc/kỳ là số thoả thuận, thứ mà không bước làm tròn nào tái tạo được.

Ô chỉ hiện với "Gốc trả đều": với gốc trả cuối kỳ thì `isBullet ? 0` nên không có phép chia nào để làm tròn.

`checkMonthlyPrincipal` chặn lúc lưu nếu số khai lệch quá ±100.000đ so với thương số, và thông báo nêu đủ **ba** con số phải nhất quán (số tiền vay, số kỳ trả gốc, gốc mỗi kỳ) để banker biết sai ở đâu. Cố ý **không** chặn số làm tròn xuống: hướng làm tròn (`Math.ceil`) là giả định thứ hai, độc lập với bước, và chưa đo được.

Sau khi trả trước hạn theo phương án "giảm gốc hàng tháng", số khai tay **không còn áp dụng** — mục đích của phương án đó là gốc/kỳ phải giảm. Hệ thống tính lại theo bước mặc định, và cố ý **không** suy bước từ số đã khai: suy bước từ một con số chính là ngộ nhận chia-hết nói trên.

⚠️ `buildKunnPayload` luôn gửi cột này và `saveContractAPI` không có nhánh dự phòng cho cột lạ — **chưa chạy migration 36 thì mọi lần lưu KUNN đổ lỗi PGRST204**.

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
| Huy động `2279/2026/TB-BĐH` | Chính văn bản | **Đã đối chiếu** (migration 13) — hết hiệu lực 05/08/2026 |
| Huy động `2400/2026/TB-BĐH` | Bản quét 7 trang | **Đã đối chiếu** (migration 30) — hiệu lực 06–15/08/2026 |

Bảng tính nội bộ còn **bỏ sót cột "Lãi trả trước" của kỳ hạn 12 tháng** — chỉ chép 3 trong 4 cách trả lãi. Migration 13 bổ sung 3 mức 8,17% / 8,25% / 8,34%.

**Gói cố định 3 tháng của trung dài hạn có LSCV đúng bằng 0%/năm.** Đây là ưu đãi 0% ba tháng đầu, là số liệu đã biết, không phải ô chưa điền. Migration 09 từng để `NULL` vì suy đoán sai từ bảng tính; migration 10 sửa thành `0`. Đừng "sửa" lại thành `NULL`.

Bảng tính nội bộ `Book.xlsx` **sai cả 5 dòng lãi suất ngắn hạn** khi so với văn bản 2274 (một dòng ghi 110,50% thay vì 11,70%; một dòng ghi 0% thay vì 8,45%). Vì vậy số liệu trung dài hạn và huy động lấy từ cùng file đó phải coi là tạm cho tới khi có văn bản gốc. Không sửa `SourceVerified` thành `true` khi chưa thực sự đối chiếu.

### Tuần lễ vàng huy động — bản 2400 thay bản 2279

Thông báo 2400/2026/TB-BĐH ngày 06/08/2026 **điều chỉnh** chương trình chứ không lập mới. Bản 2279 khai hiệu lực tới 07/08/2026, chồng lấn hai ngày với bản mới bắt đầu 06/08/2026 — migration 30 đóng bản cũ ở 05/08/2026. **Không để hai chương trình huy động cùng hiệu lực một ngày**, nếu không `resolveProgramForDate` phải đoán.

Ba điểm của bản 2400 khác cấu trúc bản cũ, đừng chép nhầm khuôn:

- **Năm bậc số dư** thay vì ba: thêm bậc `< 200 triệu` ở dưới và tách `≥ 1 tỷ` cũ thành `1–8 tỷ` với `≥ 8 tỷ`.
- **Thêm kỳ hạn 07 tháng**, và kỳ hạn này **không có phương án lãi hàng quý** — văn bản để dấu `–`. Lưu `NULL` chứ đừng lưu 0: 0%/năm là một mức lãi có thật, `NULL` mới nghĩa là không có phương án đó.
- **Thêm kênh `ftp`** — giá bán vốn nội bộ (FTP mua VOF) của riêng chương trình. Kênh này có đủ bốn cách trả lãi ở cả ba kỳ hạn, kể cả 07 tháng hàng quý 9,35%.

Bậc `≥ 8 tỷ` kỳ hạn 06 tháng có **lãi trả trước 8,97% cao hơn lãi cuối kỳ 8,95%**. Trái lẽ thường nhưng đã soi bản quét ở độ phóng cao và đúng là con số trong văn bản; nó cũng khớp bậc thang đều +0,09 của cột trả trước (8,61 → 8,70 → 8,79 → 8,88 → 8,97). Đừng "sửa" thành 8,95.

Mức phân quyền cao hơn (Trưởng bộ phận huy động và dịch vụ, 9,00–9,40%) nằm ở bảng `DepositRateAuthorities`, chỉ áp cho lãi cuối kỳ và chung cho cả ba kỳ hạn.

### Xuất bảng lãi suất gửi khách hàng

**Tên file do `rateSheetFileBase` quyết định**, và nó đi thẳng vào `<title>` của tài liệu in — hộp thoại in của trình duyệt lấy tiêu đề làm tên PDF gợi ý, nên đây là chỗ duy nhất cần đặt tên. Quy tắc: `LS NGAN HAN` / `LS TDH` / `LS HUY DONG`, tờ cho vay gắn thêm nhóm khách hàng (`KHCN` mặc định, `KHDN` khi tên chương trình hoặc đối tượng có nhắc tới). Tờ huy động không gắn nhóm vì dùng chung.

**Không lặp lại đối tượng khách hàng dưới tiêu đề lớn.** Tiêu đề chương trình đã ghi "dành cho KHCN" rồi; thêm một dòng "Khách hàng cá nhân (KHCN)" ngay dưới là nói hai lần.

**Tờ cho vay bỏ khối "Phạm vi áp dụng"**, chỉ tờ huy động còn giữ. Nội dung phạm vi của tờ cho vay trùng với phần điều kiện áp dụng ở cuối.

**Xuất hình ảnh không dùng thư viện ngoài.** `src/lib/htmlToPng.ts` gói phần thân tờ chào vào `<foreignObject>` của SVG rồi vẽ lên canvas, xuất PNG ở độ phân giải gấp đôi.

**Ảnh luôn đúng khổ A4**, không co theo nội dung: 794×1123 khổ dọc, 1123×794 khổ ngang, lề 11mm/12mm bằng đúng `@page` của bản in. Nội dung dài hơn trang thì `fitScale` **thu nhỏ vừa trang**, không cắt.

Bốn điều kiện để cách này chạy được, đừng phá:

- Nội dung phải **hợp lệ theo XML**: mọi thẻ đóng đủ, `<img/>` tự đóng, không dùng thực thể HTML như `&nbsp;`.
- Ảnh nhúng phải là **data URI** — logo đã ở dạng đó nhờ `?inline`. Ảnh trỏ ra URL ngoài sẽ không vẽ được và làm bẩn canvas.
- Bộ định dạng của tờ chào đặt trên `body`, mà trong `<foreignObject>` **không có `body`**. Vì vậy quy tắc gốc khai là `body, .rate-sheet-root` và khối nội dung mang đúng lớp đó. Bỏ lớp này là cỡ chữ nhảy về mặc định trình duyệt.
- Chiều cao **đo bằng DOM thật, trong đúng lớp `.rate-sheet-root` và đúng bề rộng vùng nội dung**. Đo ở ngữ cảnh khác thì ra một con số, dựng ra ảnh lại ra con số khác — đó chính là lỗi cắt mất phần cuối tờ ngày 10/08/2026.

Đã kiểm chứng trên trình duyệt 10/08/2026: tờ ngắn hạn nội dung cao 926px trong vùng cho phép 1039px nên tỷ lệ 1.000, ảnh ra 1588×2246 đủ tới dòng cuối phần điều kiện áp dụng; tờ huy động khổ ngang 2246×1588.

`buildRateSheetHtml` dựng một tài liệu HTML **tự chứa, khổ A4 một trang**, mở ở cửa sổ mới rồi gọi `print()` để banker lưu thành PDF. Không dùng thư viện ngoài: trình duyệt đã in ra PDF tốt hơn mọi thư viện nhúng, và thêm phụ thuộc chỉ để đóng gói HTML là không cần thiết.

Bố cục đo theo A4 trừ lề: rộng 703px, cao 1039px ở 96dpi. Khi thêm mục vào tờ này phải đo lại chiều cao thật, đừng ước lượng — tràn sang trang 2 làm tờ chào khách mất chuyên nghiệp.

**Hai loại tờ, hai hướng giấy.** Tờ cho vay khổ **dọc** — ít cột, nhiều chữ ở phần điều kiện và phí. Tờ huy động khổ **ngang** (1032px ≈ 273mm) vì nó là ma trận kỳ hạn × hình thức trả lãi: chỉ 3 kỳ hạn × 4 hình thức đã là 12 cột lãi suất. Đo ở khổ dọc: cột "Điều kiện áp dụng" bị bóp còn ~25mm, bậc `500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng` xuống **8 dòng**. Có test khoá cả hai chiều để đổi một tờ không kéo theo tờ kia.

**Bề rộng cột để trình duyệt tự chia, đừng cố định.** Số cột thay đổi theo từng Thông báo, nên mọi con số cố định chỉ đúng với bộ dữ liệu hôm nay. Các ô lãi suất có `white-space: nowrap` và cùng độ dài nên đã đều sẵn, phần dư tự dồn về cột điều kiện. `table-layout: fixed` còn tệ hơn: cột chứa cả câu dài sẽ bằng đúng cột chứa `8,62%`.

Giới hạn thật của cách bày này là **số kỳ hạn**, không phải bề rộng cột: một Thông báo công bố cả thang 1–36 tháng sẽ thành 44 cột, khổ ngang cũng không cứu được. Gặp ca đó thì tách mỗi kỳ hạn một bảng hoặc đảo trục, chứ đừng chỉnh bề rộng.

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

## 9b. Lưu trữ hồ sơ khách hàng

Tab Khách hàng là **danh bạ hồ sơ**. Nó cố ý chỉ nạp bảng `Customers` — không KUNN, không HĐTD, không thẻ. Kéo dư nợ vào đó là biến nó thành bản sao của tab Khoản vay.

Hệ quả: tab này **không thể tự nhận ra ai đã tất toán**, nên trạng thái ấy là cờ thủ công `Customers.ArchivedAt` (migration 32) do banker đánh dấu.

**Gọi là "lưu trữ", không gọi là "đã tất toán".** Cờ do người gõ tay không bảo đảm được điều gì về nợ; gắn nhãn "đã tất toán" lên nó là tạo nguồn thứ hai mâu thuẫn với dư nợ thật — đúng lỗi mà `isKunnSettled` từng gây ra khi suy trạng thái tất toán từ `IsClosed` của HĐTD (§2). "Lưu trữ" thì trung thực: *hồ sơ này tôi không làm việc nữa*, không nói gì về nợ.

**Một cột mang cả cờ lẫn ngày.** `NULL` là đang làm việc. Hai cột `IsArchived` + ngày sẽ tạo ra trạng thái vô lý "cờ bật mà ngày rỗng".

**Chốt chống trôi nằm ở `api.ts`, không ở tab Khách hàng.** `saveContractAPI` và `saveCreditContractAPI` tự xoá `ArchivedAt` khi ghi hợp đồng cho khách đang lưu trữ — áp cho **cả sửa lẫn tạo mới**, vì sửa một KUNN của khách đang lưu trữ cũng là đang làm việc với khách đó. Đặt ở lớp dữ liệu thì tab Khách hàng vẫn sạch mà cờ không mâu thuẫn được với thực tế. Dữ liệu nhập thẳng bằng SQL thì không đi qua đây; migration 32 có sẵn câu rà soát.

`ArchivedAt` là chuỗi rỗng đọc thành **chưa lưu trữ**, không phải đã lưu trữ — hồ sơ thà nằm lại danh sách làm việc còn hơn âm thầm biến mất.

### Ràng buộc số liệu trên hồ sơ

`src/lib/customerValidation.ts`. Hai tầng, cả hai đều cần:

| Tầng | Làm gì |
| :--- | :--- |
| **Ô nhập** | `capDigits` lọc bỏ ký tự không phải số và cắt ở mức tối đa — gõ thừa không vào được, lỗi bị chặn ngay lúc phát sinh |
| **Lúc lưu** | `validateCustomerForm` gom **đủ mọi lỗi một lượt**, nêu tên trường và **đang có bao nhiêu số**, không bắt banker sửa từng cái rồi lưu lại |

Luật: CCCD **12 số**, CMND **9 số**, điện thoại **10 số**. Áp cho cả trường của KHLQ / Bảo lãnh.

**Bỏ trống là hợp lệ** — đây không phải trường bắt buộc, chỉ khi có nhập mới xét độ dài. Nhầm chỗ này là chặn banker lưu hồ sơ mới chưa đủ giấy tờ.

Chỉ chặn ở mức tối đa của **CCCD 12 số** tại ô nhập, không chặn ở 9: gõ CMND 9 số vẫn phải qua được cùng một ô.

**Điện thoại và số tài khoản nhận NHIỀU số trong một ô.** Một KHLQ có hai số là chuyện thật, không phải lỗi nhập liệu — dữ liệu đang có sẵn một ca như vậy. `splitNumberList` tách theo `;` `,` `/` `|` và xuống dòng, `capNumberList` gom về một dạng ngăn cách duy nhất là `" / "`. Luật 10 số áp cho **từng số**, không áp cho cả chuỗi.

Dấu ngăn đang gõ dở được **giữ lại** để nhập số tiếp theo — cắt nó đi thì không gõ được số thứ hai.

CCCD thì ngược lại: một người **một số**, nên ô đó vẫn chỉ nhận một giá trị.

Đo trước khi đặt luật (10/08/2026): 14/14 CCCD đang có đều 12 số, 11/11 điện thoại đều 10 số — luật này không khoá ai khỏi sửa hồ sơ cũ.

### Xoá hồ sơ khách hàng

Ba điều kiện, thiếu một là hỏng, và cả ba từng cùng hỏng một lúc:

1. **Kiểm tra ràng buộc trước.** Còn KUNN, HĐTD, TSĐB hay thẻ thì chặn, nêu **số lượng từng loại** để banker biết gỡ từ đâu — cùng khuôn với `deleteCollateralAPI`. Thông báo chỉ luôn lối thoát là **lưu trữ**, vì phần lớn trường hợp bấm xoá thực ra chỉ muốn hồ sơ biến khỏi danh sách.
2. **`.select()` rồi đếm số dòng.** RLS chặn thì Supabase trả mảng rỗng **không kèm lỗi**, và giao diện sẽ báo "Đã xoá thành công" trên một hồ sơ vẫn còn nguyên.
3. **Nút phải đọc được.** Bản cũ ghép `bg-neg` với `text-neg` — nền và chữ cùng token màu nên nút là khối đỏ đặc, icon `currentColor` cũng biến mất. Dùng `BTN_DANGER` trong `uiClasses.ts`, đừng tự viết lại lớp màu.

Điểm 3 nghe như chuyện thẩm mỹ nhưng cùng một gốc với §1: **một quy tắc chỉ cài ở một nơi**, kể cả quy tắc màu.

### Xoá HĐTD — lớp bảo vệ thật nằm ở khoá ngoại

`LoanContracts.CreditContractId` là `ON DELETE RESTRICT` (migration 33). Trước đó nó mang hai ràng buộc chọi nhau: migration 14 đặt `ON DELETE SET NULL`, migration 23 đặt `SET NOT NULL` — nên nhánh `SET NULL` **không bao giờ chạy được**, xoá HĐTD còn KUNN chỉ nhận lỗi 23502 bằng tiếng Anh.

Ý định vốn đã rõ ở ba nơi khác: migration 22 chặn *đóng* HĐTD khi còn dư nợ, migration 23 buộc mọi KUNN gắn HĐTD, `CreditContractView` chặn *xoá* khi còn KUNN. Khoá ngoại chỉ là lớp cuối cùng nói lại đúng điều đó — chốt ở giao diện không phải lớp bảo vệ, cùng lý lẽ với RLS và unique index số KUNN.

Lỗi `23503` từ ràng buộc này được dịch sang tiếng Việt kèm **số KUNN đang vướng**, không để lộ thông báo gốc của Postgres.

Xoá khách hàng đi qua đây gián tiếp: `CreditContracts.CustomerId` là `ON DELETE CASCADE`, nên xoá khách kéo theo xoá HĐTD rồi chạm `RESTRICT`. Chốt đếm ràng buộc ở `deleteCustomerAPI` chặn trước, khoá ngoại đỡ phần còn lại.

---

## 10b. Phương án kinh doanh & Hạn mức

Thay bộ bốn file Excel của banker. Logic ở `src/lib/businessPlan.ts`, phụ lục ở `src/lib/businessPlanExport.ts`, dữ liệu ở `BusinessPlans` / `BusinessPlanDebts` (migration 31). Đối tượng là **khách hàng cá nhân và hộ kinh doanh**, không phải doanh nghiệp.

Bốn file gốc không phải bốn bảng: `BẢNG TÍNH HM` là bảng làm việc, ba file kia chỉ là **liên kết ngoài** trỏ về nó. Và chúng đã trôi khỏi nhau trong thực tế — phụ lục KQKD giữ doanh thu 908 trđ/tháng trong khi bảng gốc chỉ còn 128. Trong hệ thống: **một nguồn dữ liệu, ba bản in**.

### Đây là máy tính, không phải hồ sơ

Quyết định nghiệp vụ 10/08/2026: bảng tính này là **công cụ nhập liệu cho tờ trình** — không gắn khách hàng, không gắn HĐTD, **không lưu**. Banker nhập, xem kết quả, xuất phụ lục rồi thôi. Migration 34 đã xoá hai bảng mà migration 31 dựng.

Hai hệ quả đã chấp nhận: đóng tab là mất số đã nhập, và **khả năng bảo đảm của TSĐB thành ô nhập tay** vì không còn khách hàng để `totalUsableCapacity` đọc tài sản.

Đừng gắn nó trở lại vào khách hàng cho "tiện tra cứu". Nó không phải hồ sơ tín dụng; gắn vào là lại phải trả lời câu hỏi bản nào mới là bản chính thức khi số trên tờ trình đã trình lệch số trong máy.

### Giao diện bám đúng hình dạng bảng tính HM

Năm khối đúng vị trí như file gốc: bảng `b` và khối `c` cùng bảng cân đối bên trái, Tiêu chí/tháng và Dư nợ và Chi phí bên phải. Banker nhìn là biết ô nào ở đâu vì đó là tờ họ dùng hằng ngày.

**Ô nhập chữ xanh, ô công thức nền xám** — quy ước mô hình tài chính áp cho cả màn hình, không riêng file xuất ra.

Bản đầu dựng theo kiểu form xếp dọc từng khối: nhập phải cuộn lên cuộn xuống, mất hẳn cái lợi của bảng tính. Đừng quay lại kiểu đó.

**Khối `b` và khối `c` nằm trong CÙNG MỘT bảng.** Tách thành hai bảng riêng thì cột `Đvt` và các cột số của hai khối lệch nhau vì mỗi bảng tự chia độ rộng. File gốc cũng là một vùng liền — `table-fixed` kèm `colgroup` giữ cột thẳng từ dòng đầu tới dòng cuối.

**Số trong bảng luôn có dấu phân cách nghìn, kể cả ô đang nhập.** `MoneyCell` giữ **chuỗi đang gõ** trong state riêng và chỉ định dạng lại khi rời ô: gõ tới đâu thấy đúng tới đó, rời ô thì số nhảy về dạng `10.896`. Định dạng ngay từng ký tự sẽ ăn mất dấu thập phân đang gõ dở; không định dạng gì thì ô nhập và ô công thức trông như hai bảng khác nhau.

Số chữ số thập phân do `decimalsFor` quyết: tròn trđ thì không hiện phần thập phân, có phần lẻ mới hiện một chữ số. Nhờ vậy `10.896` và `12.160,5` đứng cạnh nhau vẫn gọn.

### Kỳ kế hoạch là dự phóng, không phải bộ nhập thứ hai

`planDriversOf` nhân mọi khoản mục của kỳ thực hiện với **hệ số dự phóng** (mặc định 1,5). Dòng nào cần khác thì gõ đè, lưu ở `planOverrides`; dòng không gõ đè luôn bám hệ số.

Hai chỗ dễ sai: **gõ đè bằng 0 là con số thật**, không được coi là "chưa gõ" rồi rơi về hệ số — đây đúng cái bẫy `||` ở §1, phải kiểm `null`/`undefined`/`NaN` tường minh. Và **lãi vay không nhân hệ số**: nó tính từ danh sách dư nợ thật, nhân lên là bịa ra khoản vay không tồn tại.

### Giá vốn nhập bằng SỐ TIỀN, mọi tỷ lệ đều là công thức

File gốc để `D4 = D3*0,65`, tức tỷ lệ giá vốn mới là ô nhập. Ở đây ngược lại: banker gõ **số tiền** giá vốn như mọi dòng chi phí khác, còn cột `%/DT` và cột `Tăng/giảm` **không có ô nào phải gõ**. Không còn ô phần trăm nào trong bảng ngoài lãi suất từng khoản vay và trần DTI.

### Bảy lỗi của file Excel gốc — đã sửa, đừng "sửa" ngược lại

| # | Lỗi | Đã xử lý |
| :--- | :--- | :--- |
| 1 | `D27 = D18+D23+F24` cộng Vốn góp (nguồn vốn) vào Tổng tài sản | Bỏ Vốn góp khỏi đầu vào; phụ lục vẫn in dòng đó với giá trị 0 |
| 2 | Lãi vay có hai con số không khớp: `D6` = 48 trđ từ bảng dư nợ, dòng lãi vay trong bảng chi phí = 0 nhập tay | `BusinessPlanDebts` là nguồn duy nhất |
| 3 | LNTT hai kỳ hai công thức: `E7` bỏ sót chi phí mặt bằng và chi phí khác | Hai kỳ dùng chung `computePeriod` |
| 4 | `D3 = D10*3,4` rồi `D13 = D3/D10 = 3,4` — vòng quay chạy ngược | Doanh thu là đầu vào, vòng quay là kết quả |
| 5 | Lãi suất 8%/năm nhúng cứng trong `*8/100/12` | Lãi suất theo từng khoản vay |
| 6 | `ROUNDUP(.../12,0)` làm tròn lên hàng triệu rồi lấy số đã tròn tính tỷ trọng | Tính trên số gốc, làm tròn khi hiển thị |
| 7 | `SUM(C4:C8)` của phụ lục KQKD cộng thiếu một dòng chi phí | Tổng gộp đủ bảy dòng |

Lỗi #1 không lộ ra vì vốn chủ sở hữu là **số dư** nên hai vế luôn cân — tổng tài sản bị thổi lên đúng bằng vốn góp mà bảng vẫn trông đúng.

### Nhu cầu vốn bằng tiền không phụ thuộc lãi vay

```
c1 = DTT − khấu hao − lãi vay − LNTT
   = giá vốn + nhân công + mặt bằng + điện nước + chi phí khác
```

Rút gọn ra đúng **các khoản chi bằng tiền**, đúng như tên gọi. Vì vậy lỗi #2 làm sai lợi nhuận trình lên nhưng **không** làm sai hạn mức. Có test khoá tính chất này — đừng sửa `c1` thành phụ thuộc lãi vay.

### File xuất ra phải trùng khít bản gốc — nó là template nạp lên hệ thống

Đây là ràng buộc cứng, không phải sở thích trình bày: ba phụ lục còn được **nạp ngược lên hệ thống**, nên bất cứ chữ nào lệch cũng làm file không dùng được.

Giữ **nguyên văn**:

- **Nhãn từng dòng**, kể cả nhãn sai nghĩa. Dòng `b6` của phụ lục KQKD ghi "Chi phí 6: Chi phí khác" nhưng nạp giá trị **khấu hao**, và `b7` là "Chi phí 7:…" nhận chi phí khác — đúng như bản gốc làm. Sửa nhãn cho đúng nghĩa là **phá template**.
- **Tiêu đề cột**, kể cả ký tự vô hình: cột cuối của `CapHanMucTinDung` là `"Tăng/giảm "` với một dấu cách cuối.
- **Số cột, thứ tự STT chữ** (`a`, `b`, `b1`…`b7`, `c`, `d`, `e`), các dòng `…` bỏ trống, hai dòng Vốn góp và Nguồn kinh phí & quỹ khác (giá trị 0 cho khách hàng cá nhân).
- **Đơn vị từng file**: hai phụ lục đầu bằng **VND**, `CapHanMucTinDung` bằng **trđ**.
- **Không chèn gì phía trên bảng.** Bản gốc bắt đầu ngay ở dòng tiêu đề cột; thêm dòng tiêu đề hay tên khách hàng là đẩy lệch mọi ô.

Đã phạm một lần 09/08/2026: đổi nhãn `b6`/`b7` cho "đúng nghĩa" và thêm hai dòng tiêu đề. Có test khoá **toàn bộ danh sách nhãn** của hai phụ lục để không tái diễn.

Phần **giá trị** thì ngược lại — bảy lỗi công thức ở trên đều đã sửa. Ranh giới: **hình thức giữ nguyên, con số tính đúng**.

**Kiểu ô cũng phải khớp.** Cột STT của `TINH HINH TAI CHINH` và `CapHanMucTinDung` là **số** trong bản gốc, còn của `KET QUA KINH DOANH` là **chữ** (`a`, `b1`…). Mọi ô tiền và tỷ lệ là số thật để Excel tính tiếp được, không phải chuỗi đã định dạng.

**Định dạng cũng là một phần của bản gốc**, không phải trang trí:

| Thứ | Bản gốc |
| :--- | :--- |
| Phông | Times New Roman 11 |
| Khung | Kẻ toàn bộ ô, kể cả ô rỗng — bảng không được thủng |
| Dòng tiêu đề | In đậm, canh giữa, xuống dòng, nền `DCE6F1` |
| Dòng tổng | In đậm cả nhãn lẫn số |
| Dòng con | In nghiêng |
| Số | `#,##0` cho tiền, `0%` cho tăng/giảm, `#,##0.0` cho vòng quay |
| Cột | Độ rộng riêng từng cột; cột "Cơ sở xác định" rộng 62 và bật xuống dòng |

Xuất số thô không định dạng thì banker mở ra thấy `908000000` thay vì `908,000,000` — đọc không nổi và khác hẳn tờ họ quen dùng.

### Xuất ra .xlsx thật, không phải HTML đội lốt Excel

`downloadXls` của dự án ghi HTML rồi đặt tên `.xls`. Excel mở được nhưng **luôn cảnh báo** *"The file format and extension don't match"*, và đổi đuôi thành `.xlsx` chỉ làm hỏng nặng hơn vì `.xlsx` là một tệp ZIP.

`src/lib/xlsxWriter.ts` sinh **tệp OOXML thật**: ZIP dạng store kèm CRC32 tự tính, sáu thành phần bắt buộc (`[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/styles.xml`, `xl/worksheets/sheet1.xml`), chuỗi ghi nội tuyến. Không thêm thư viện ngoài — cùng lý lẽ với việc không nhúng thư viện PDF ở §8.

`buildStyleSheet` gom kiểu theo khoá nên **mỗi kiểu chỉ đăng ký một lần**. Ba chỗ dễ sai khi sửa: mã định dạng số tuỳ biến phải bắt đầu từ **164** (dưới đó là mã dựng sẵn của Excel), hai ô tô nền đầu tiên trong `fills` là **chỗ dành riêng** của Excel (`none` và `gray125`) nên nền tự khai bắt đầu từ chỉ số 2, và `styles.xml` phải được khai ở **cả** `[Content_Types].xml` lẫn quan hệ của workbook — thiếu một chỗ là Excel đòi sửa file.

Hai điểm bắt buộc khi sửa chỗ này:

- **`xml:space="preserve"` trên mọi ô chữ.** Không có nó, Excel cắt khoảng trắng đầu/cuối và nhãn `"Tài sản lưu động "` mất dấu cách cuối — đúng thứ template cần giữ.
- **Ô rỗng thì bỏ hẳn thẻ `<c>`**, đừng ghi ô trắng.

Kiểm chứng không dừng ở test đơn vị: sinh cả ba tệp ra đĩa rồi cho **openpyxl** đọc lại. Một bộ đọc OOXML thật mở được thì Excel mở được. Đã làm 10/08/2026 — ZIP nguyên vẹn, ô đúng địa chỉ, số ra số, nbsp và dấu cách cuối còn nguyên.

Hai tab còn lại (`Công cụ 1`, `Công cụ 4`) **vẫn dùng HTML `.xls`** và vẫn có cảnh báo đó. Chưa chuyển vì chúng cần màu và gộp ô; `xlsxWriter` hiện chỉ làm lưới trơn.

Phần ZIP dùng chung — bảng CRC32, `zipStore`, `escapeXml`, khai báo XML — nằm ở `src/lib/ooxml.ts` từ 10/08/2026, khi `docxWriter` thành chỗ dùng thứ hai. `xlsxWriter` xuất lại `escapeXml`/`zipStore` để nơi gọi cũ không phải sửa.

### Xuất biểu mẫu ra .docx thật

`src/lib/docxWriter.ts` đổi HTML của tab **Soạn biểu mẫu** thành WordprocessingML rồi gói năm thành phần (`[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels`, `word/styles.xml`). Trước 10/08/2026 tab này ghi HTML kèm chỉ thị `mso-` rồi đặt tên `.doc` — Word mở được nhưng luôn cảnh báo lệch định dạng.

Bộ chuyển không phải bộ dựng HTML tổng quát: nó chỉ hiểu đúng từ vựng mà `documentHtml.ts` sinh ra — `h1`/`h2`, `p`, `div`, `table`/`thead`/`tbody`/`tr`/`th`/`td`, `strong`, `em`, `span`, `br`, cùng các lớp `clause-p`, `item-p`, `no-indent`, `text-center`/`right`, `font-bold`, `font-italic`, `uppercase`, `text-[Npt]`, `pt-*`/`pb-*`/`pl-*`, `table-doc`, `sig-table`, `sig-space`. **Thêm lớp hay thẻ mới vào biểu mẫu thì phải khai ở đây**, không thì nó lặng lẽ rơi về định dạng mặc định.

Bốn chỗ dễ sai:

- **`w:tblPr` phải xếp đúng thứ tự lược đồ**: `tblW` → `tblBorders` → `tblLayout` → `tblCellMar`. Đặt `tblCellMar` trước `tblLayout` thì Word từ chối mở. `w:pPr` là `spacing` → `ind` → `jc`; `w:rPr` là `b` → `i` → `spacing` → `sz`. Sai thứ tự là sai lược đồ, không phải chuyện thẩm mỹ.
- **Mỗi ô bảng phải có ít nhất một `w:p`**, kể cả ô rỗng. Sau mỗi `w:tbl` cũng phải có một `w:p` trống.
- **`xml:space="preserve"` trên mọi `w:t`** — cùng lý do như bên `.xlsx`.
- **Gộp khoảng trắng theo lối HTML nhưng giữ nguyên nbsp** (`/[^\S ]+/g`). `\s` của JavaScript bao cả nbsp, viết thiếu là nbsp biến thành dấu cách thường.

Con số bám đúng **bản xem trước trên màn hình**, không bám bản `.doc` cũ: giãn dòng 1,5 (bản cũ 1,35) và chữ trong bảng 12pt (bản cũ 11pt). Bản in PDF vốn đã dùng hai con số này; giờ cả ba mặt khớp nhau.

Kiểm chứng ngoài test đơn vị: sinh cả tám biểu mẫu ra đĩa rồi cho **python-docx** đọc lại, đối chiếu từng ký tự phần chữ với `textContent` của bản xem trước. Đã làm 10/08/2026 — tám tệp mở được, khổ A4 lề 25/20/20/30mm đúng, khớp chữ cả tám. Bản đối chiếu đó nay là test thường trực `src/components/__tests__/DocumentTemplateExport.test.tsx`, chạy trong bộ test bình thường và không ghi ra đĩa.

### Xuất slide ra .pptx thật

`src/lib/pptxWriter.ts` dựng bộ slide từ mô hình `{ title, subtitle, bullets, table }`; phần theme, slide master và slide layout tối thiểu nằm riêng ở `pptxTheme.ts` vì chúng là hằng, không phụ thuộc nội dung.

**Chưa màn nào gọi tới** — đây là thư viện dựng trước theo yêu cầu 10/08/2026, để lần sau cần slide thì không phải làm lại từ đầu như đã từng làm với `.xls` và `.doc` HTML.

Bốn thứ PowerPoint bắt buộc mà thiếu là không mở được tệp:

- **Đủ chín thành phần khung**: `presentation.xml` + rels, `theme1.xml`, `slideMaster1.xml` + rels, `slideLayout1.xml` + rels, và mỗi slide một tệp kèm một tệp rels trỏ về layout. Slide không có rels trỏ layout là slide PowerPoint bỏ.
- **`a:clrScheme` đúng 12 màu đúng thứ tự** `dk1, lt1, dk2, lt2, accent1…6, hlink, folHlink`; `a:fmtScheme` đủ bốn danh sách, mỗi danh sách ba phần tử.
- **`a:pPr` xếp `buFont` trước `buChar`**, và `a:rPr` xếp `latin` trước `cs` — cùng loại lỗi thứ tự lược đồ như `w:tblCellMar` bên `.docx`.
- **Mã hình `p:cNvPr id` không lặp trong một slide**, và mọi hàng của bảng phải đủ số ô (hàng thiếu ô thì bù ô rỗng).

Đơn vị đo là EMU: 914.400 EMU một inch, 12.700 EMU một điểm. Khổ 16:9 là 12.192.000 × 6.858.000.

Kiểm chứng bằng **python-pptx**: đọc lại đúng khổ, đúng số slide, đúng cấp bậc gạch đầu dòng, đúng kích thước bảng. Nhưng python-pptx **dễ tính hơn PowerPoint** — nó đọc được cả tệp sai thứ tự lược đồ, đúng như lỗi `tblCellMar` bên `.docx` mà nó không bắt. Chưa mở được bằng PowerPoint thật trên máy này.

### Ngân hàng câu hỏi — chống trùng bằng trigger, không bằng unique index

`QuizQuestions` (migration 38) là dữ liệu tham chiếu dùng chung, không gắn khách hàng nào — cùng loại với `RatePrograms`, không phải hồ sơ tín dụng. RLS: ai đăng nhập cũng đọc và thêm được, nhưng sửa/xoá thì chỉ admin hoặc chính người đã thêm.

**Lựa chọn để trong `jsonb`, không tách bảng con.** Lựa chọn là dữ liệu trình bày có thứ tự, không bao giờ được tra riêng. Ràng buộc thật sự cần — "đáp án đúng phải nằm trong danh sách lựa chọn" — đã chốt bằng trigger.

**Số lựa chọn không cố định 4, số đáp án đúng không cố định 1.** Đo trên bộ 662 câu: lựa chọn phân bố 1→5, đáp án đúng phân bố 1→5 (21 câu nhiều đáp án).

**Mảng `CorrectAnswers` rỗng nghĩa là CHƯA CHỐT ĐÁP ÁN**, không phải dữ liệu lỗi. Hai câu trong đề ghi thẳng *"CÂU NÀO CŨNG SAI"* (id 504 Tiết kiệm Phát Lộc, id 570 vốn lưu động ròng); bản dọn sẵn đánh cả bốn lựa chọn là đúng, nhưng đó là ghi chú của người soạn chứ không phải đáp án. Chốt 10/08/2026: để trống. Chế độ Luyện tập bỏ qua các câu này và nói rõ đã bỏ bao nhiêu; `isAnswerCorrect` trả `false` **kể cả khi không chọn gì**, nếu không thì bỏ trắng lại thành "đúng".

**Vẫn không đặt ràng buộc "không được đánh đúng mọi lựa chọn".** Bốn câu có mọi lựa chọn đều đúng một cách hợp lệ — 176, 194, 195, 198, trong đó hai câu ghi thẳng trong đề *"(cho phép lựa chọn nhiều đáp án)"*. Thứ cần biểu diễn là "chưa chốt đáp án" và nó biểu diễn bằng mảng rỗng, không bằng việc đánh đúng tất cả.

Migration 38 để ràng buộc `array_length("CorrectAnswers", 1) >= 1`, mà mảng rỗng vẫn đi qua được vì `array_length('{}', 1)` trả `NULL` và CHECK của Postgres chỉ đổ khi biểu thức ra `FALSE`. Migration 39 viết lại cho đúng ý định thay vì dựa vào chỗ ăn may đó.

**Trùng = trùng CẢ câu hỏi LẪN bộ lựa chọn**, chốt 11/08/2026 (migration 42). Khoá so trùng là `quizDuplicateKey` / `quiz_duplicate_key`: nội dung câu hỏi + các lựa chọn đã chuẩn hoá và **sắp thứ tự** (đảo thứ tự lựa chọn vẫn là một câu; mã A/B/C không tính vào khoá).

Lý do phải có bộ lựa chọn trong khoá — và đây là **một kết luận sai tôi từng đưa ra**: bộ đề có những câu dẫn chung chung mà nội dung thật nằm ở bốn lựa chọn. *"Các trường hợp sau đây theo quy định hiện hành VietBank hạn chế nhận thế chấp"* xuất hiện ở bốn câu (267, 272, 274, 283) với **hai bộ lựa chọn khác hẳn nhau**. Luật cũ so bằng câu hỏi suông đã gom cả bốn thành một cụm rồi kết luận *"đáp án đúng khác nhau, ít nhất một bản đang dạy sai"*. **Kết luận đó sai**: 267/272 là một câu (đáp án B), 274/283 là câu khác (đáp án D), mỗi đáp án đúng cho bộ lựa chọn của nó.

Đo lại trên 662 câu ngày 11/08/2026:

| Luật | Cụm | Câu | Bản dư | Cụm lệch đáp án |
| :--- | ---: | ---: | ---: | ---: |
| Chỉ câu hỏi (sai) | 9 | 24 | 15 | 3 |
| Câu hỏi + lựa chọn | 6 | 12 | 6 | **0** |

Bài học: **so trùng trên một phần của bản ghi thì sinh ra kết luận về phần còn lại**. Cảnh báo "dạy sai" ấy trông rất thuyết phục vì nó dẫn số hiệu câu cụ thể, nhưng nó chỉ là hệ quả của việc bỏ mất bộ lựa chọn khỏi khoá.

Cơ chế cảnh báo lệch đáp án **giữ nguyên trong mã** — nó vẫn là chốt đúng nếu về sau có hai bản thật sự trùng cả câu lẫn lựa chọn mà khác đáp án. Chỉ là trên dữ liệu hiện tại nó không bắn.

**Chống trùng phải là trigger, không phải unique index.** Bộ gốc vẫn còn 6 cụm trùng thật (6 bản dư) mà chủ dự án chốt giữ nguyên, nên unique index không dựng nổi — build đổ ngay trên dữ liệu nạp vào. Trigger cho đường nạp gốc đi qua bằng cờ phiên `app.quiz_seed`, chặn mọi đường ghi khác.

**`COLLATE "C"` khi sắp lựa chọn trong khoá SQL.** TypeScript sắp bằng `Array.prototype.sort` — thứ tự mã ký tự. Sắp theo collation mặc định của CSDL ra thứ tự khác với tiếng Việt, làm client và CSDL tính ra hai khoá khác nhau: client bảo không trùng, CSDL bảo trùng. `COLLATE "C"` là thứ tự byte UTF-8, khớp với thứ tự mã ký tự cho toàn bộ chữ tiếng Việt.

**Màn Tra cứu là để đọc, không phải để tự kiểm tra.** Chốt 11/08/2026: đáp án đúng **tô sẵn** (đậm, nền `bg-pos-soft`), không có nút ẩn/hiện — muốn tự kiểm tra thì sang chế độ Luyện tập. Cũng bỏ luôn dòng nguồn, ô lọc theo nguồn, bảng phân bố số lựa chọn và dòng đếm "n/m câu khớp bộ lọc"; danh sách chia trang 20 câu, vị trí do ô số trang mang. `Sources` vẫn còn trong CSDL và trong khung nhập liệu, chỉ không hiện ở danh sách; `searchQuestions` vẫn tra được theo nguồn.

`quizNormalizeText`/`quizDuplicateKey` trong `src/lib/quizBank.ts` và `public.quiz_normalize_text`/`public.quiz_duplicate_key` trong CSDL phải giống nhau: hạ chữ, gộp khoảng trắng, cắt hai đầu, **giữ nguyên dấu tiếng Việt** — "lãi" và "lai" là hai câu khác nghĩa. Sửa một bên phải sửa bên kia.

**Hai đường nạp, không dùng lẫn.** `seed_quiz_bank` chỉ chạy trên bảng **rỗng** và cố ý **bỏ qua** chống trùng — đó là đường duy nhất mang được 9 cụm trùng có sẵn của bộ gốc vào. `import_quiz_questions` (migration 40) là đường nạp thêm khi bảng **đã có** dữ liệu và **bỏ** câu trùng.

**Chỉ `seed_quiz_bank` là `SECURITY DEFINER`**, vì nó phải bật cờ phiên `app.quiz_seed` — đặc quyền có lý do. `import_quiz_questions` là `SECURITY INVOKER` (migration 41): nó chỉ làm đúng những gì RLS vốn cho phép người đăng nhập làm, nên `SECURITY DEFINER` không mua thêm gì mà để lại một hàm chạy dưới quyền chủ sở hữu.

Kèm theo đó một bẫy phải nhớ: **hàm `SECURITY INVOKER` không được kiểm tra đăng nhập bằng `SELECT … FROM auth.users`** — `authenticated` không chắc đọc được bảng đó, và hàm sẽ đổ ngay dòng đầu. Hỏi `auth.uid() IS NULL` thay vào.

`import_quiz_questions` chạy **vòng lặp với `BEGIN…EXCEPTION` từng dòng**, không phải một câu `INSERT`. Lý do: trigger chống trùng nổ exception, mà một exception làm đổ cả câu `INSERT` — nạp 500 câu có 30 câu trùng thì mất cả 500. `plpgsql` tự đặt savepoint quanh khối `EXCEPTION` nên một dòng lỗi chỉ mất dòng đó. Hàm **không tắt trigger**: nó tự lọc trước để trigger không phải nổ, còn nếu có nổ (đua ghi) thì khối `EXCEPTION` hứng và ghi vào báo cáo.

Hàm trả báo cáo tách **bốn loại**, không gộp thành một con số: `da_nap`, `trung_trong_ngan_hang`, `trung_trong_file` (tệp tự trùng với chính nó, giữ bản đầu), `khong_hop_le`. Và riêng `lech_dap_an` — câu trùng nội dung nhưng **đáp án khác bản đang có**. Câu đó **bị bỏ, không ghi đè**, và nêu cả hai đáp án cạnh nhau để người có thẩm quyền quyết — cùng nguyên tắc với 3 cụm lệch đáp án của bộ gốc. Bỏ âm thầm là để người dùng tưởng đã nạp.

**Sửa thì phải loại chính nó ra khỏi phép so trùng.** `validateQuizDraft` và `findDuplicateQuestion` nhận `excludeId`; thiếu nó thì mở một câu ra sửa dấu phẩy cũng bị báo "câu này đã có trong ngân hàng". Nhưng sửa nội dung thành trùng câu **khác** thì vẫn chặn — cả hai chiều đều có test.

Quyền sửa/xoá là **admin hoặc chính người đã thêm** (policy migration 38). Hệ quả thực tế: 662 câu của bộ gốc mang `CreatedBy` của người bấm nút nạp, nên chỉ người đó và admin sửa được — người khác bấm sửa sẽ nhận đúng câu báo lỗi, không im lặng.

Ô tìm kiếm nhận `#12` để nhảy tới đúng câu số 12, và `#267,272,274,283` để mở nguyên một cụm trùng — có nó thì báo cáo nạp thêm mới dùng được, vì báo cáo nêu số hiệu câu đang có.

Bộ câu hỏi gốc nạp bằng nút trên tab qua hàm `seed_quiz_bank`, không nhét 662 dòng `INSERT` vào migration — 662 dòng thành tệp SQL gần 700KB, dán vào SQL editor là hỏng. Hàm chỉ chạy trên bảng rỗng nên không có đường nạp đè hay nạp hai lần.

### Vay từng lần lấy min của ba giới hạn

```
min( chi phí phương án − vốn tự có ;
     PV(khả năng trả nợ, lãi suất, kỳ hạn) ;
     totalUsableCapacity(TSĐB) )
```

Trường `binding` chỉ ra giới hạn nào đang chặn. Nguồn trả nợ = `(LNST + khấu hao)/12 + thu nhập khác − chi phí sinh hoạt`, đưa qua `dtiMaxMonthlyPayment` rồi quy ra hạn mức bằng `pvAnnuityFactor` — cả hai đã có trong `calcMath.ts`.

**`MaxDtiPercent = 0` nghĩa là chưa khai**, và khi đó khả năng vay theo dòng tiền trả về 0 chứ không suy đoán. Trần mặc định ở `DEFAULT_MAX_DTI_PERCENT`, form điền sẵn khi tạo mới — chính sách chỉ có một chỗ, không nhúng vào lược đồ cơ sở dữ liệu.

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

### Hợp đồng thẻ — `CardContracts`

Thẻ nằm ở **bảng riêng**, không phải `LoanContracts` và cũng không phải `CreditContracts`.
Đây là chỗ đã gây lỗi hai lần: thẻ vô hình với chốt kiểm soát TSĐB (07/08/2026) và dashboard
hiện hạn mức thẻ bằng 0 (10/08/2026) — cả hai đều vì hàm chỉ nhận `LoanContract[]`. Viết
hàm mới có dính tới thẻ thì kiểm xem nó có nhận `CardContract[]` chưa.

**HẠN MỨC DÙNG CHUNG — điểm dễ làm sai nhất.** Một hợp đồng thẻ phát hành được cả Visa,
Mastercard và Napas trên **cùng một** hạn mức. Vì vậy hạn mức nằm ở `CardContracts.GrantedLimit`
(cấp hợp đồng), **không** ở từng thẻ. Đừng dựng bảng "từng thẻ vật lý có hạn mức riêng" rồi
cộng lại — nó tiêu tốn khả năng bảo đảm **gấp ba lần thực tế**. Thẻ phụ cũng đồng mức cấp
với thẻ chính nên `CardSupplementaryHolders` **cố ý không có cột hạn mức**.

Đọc hạn mức thẻ bằng `cardContractGrantedLimit` / `totalCardGrantedLimit`, đừng đọc thẳng
`GrantedLimit`: hai hàm đó đã xử **thẻ ghi nợ trả 0** và **hợp đồng đã đóng trả 0**.

**Thẻ ghi nợ ATM không phải khoản cấp tín dụng.** Nó không có hạn mức nên không được tiêu
tốn khả năng bảo đảm. `checkCardContract` chặn hai chiều: thẻ tín dụng mà hạn mức 0 thì
chặn, thẻ ghi nợ mà khai hạn mức thì chặn. Hợp đồng lẫn cả hai loại thì **không** coi là
ghi nợ (`isDebitCard` yêu cầu *mọi* loại thẻ đều là ghi nợ).

KH và vợ/chồng là **hai hợp đồng riêng** vì hạn mức khác nhau. Đừng gộp thành một bản ghi
hai chủ thẻ.

Số hợp đồng `NAT/<năm>/<số thứ tự 3 chữ số>`. `nextCardContractNumber` lấy `MAX` cộng 1
**không đếm số dòng** (đếm dòng sinh trùng ngay khi có hợp đồng bị xoá giữa dãy), đếm riêng
theo năm. Unique index dưới database đặt trên `lower(btrim(...))` để hai lớp kiểm tra nói
cùng một chuyện — cùng khuôn `LoanContracts_ContractNumber_key`.

Tối đa 2 thẻ phụ mỗi hợp đồng, chặn bằng **trigger** `trg_chan_qua_hai_the_phu` chứ không
`CHECK`, vì luật đếm qua nhiều dòng.

### Mã chính sách phát hành thẻ — khoá bền vs mã chính thức

Hai khái niệm khác nhau, đừng lẫn:

| | Khoá bền (`key`) | Mã chính thức (`code`) |
| :--- | :--- | :--- |
| Giá trị | `A1`, `A2`, `B1`…`B13` | `B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK` |
| Lưu xuống CSDL | **có** — `CardContracts.PolicyCode` | không |
| Hiển thị cho banker | không | **có** |
| Đổi khi có QĐ mới | không bao giờ | có thể |

Lưu chuỗi mã chính thức xuống CSDL là sai: một quyết định mới đổi tên mã thì **mọi hợp
đồng cũ trỏ vào chỗ không còn tồn tại**.

`cardPolicyOf` tra được cả khoá bền, mã chính thức, và mã cũ qua `aliases`. `normalizePolicyRef`
bỏ khác biệt hoa thường và **dấu cách quanh gạch dưới** — bản gốc khai không nhất quán
(`_ LUONG` có dấu cách, `_LUONG` không). Mã bị bãi bỏ đánh `retiredAt`: nó biến khỏi
`activeCardPolicies()` cho hồ sơ mới nhưng `cardPolicyOf` **vẫn tra được** cho hồ sơ cũ.
Đừng xoá mã cũ khỏi danh mục.

**Quy trình khi Phòng Thẻ ban hành QĐ mới:** sửa số trong `CARD_POLICY_RULES`, thêm mã cũ
vào `aliases` nếu tên đổi, đánh `retiredAt` cho mã bãi bỏ, cập nhật `CARD_POLICY_SOURCE`.
Không đụng CSDL, không đụng hồ sơ đã lưu.

Dữ liệu để **trong mã nguồn**, cố ý không xuống CSDL — xem `PROGRESS.md` §27 cho lý do đầy
đủ. `CARD_POLICY_SOURCE` khai xuất xứ văn bản và hiện lên tab tra cứu để banker biết dữ
liệu có còn mới.

Luật hạn mức có **bốn hình dạng** (`limitRule` đơn, `tiers`, `matrix`, `brackets`), mỗi
hình dạng có hàm tra riêng và test khoá tính chất cấu trúc: bảng bậc phủ liên tục không hở
không chồng lấn, ma trận không ô rỗng, `maxLimit` của mã bằng đúng ô/nhánh lớn nhất. Nhập
lệch một ô là test đỏ.

`A1` là **mã duy nhất không có trần trên**. Test khoá riêng ngoại lệ này; mọi mã còn lại
bắt buộc `maxLimit > 0`.

**Hai trần theo doanh nghiệp chưa chặn được** (`B3` 1.000tr/500tr mỗi KHDN; `B12` 10% HMTD
và 5 tỉ mỗi DN, cộng gộp cả thẻ `B3`). Hệ thống không có thực thể doanh nghiệp nên chúng
chỉ là chữ trong `limitRule` và `matrix.note`. Đừng tưởng đã có chốt.

### Tàn dư WPF — cái gì đã gỡ, cái gì cố ý giữ

Hệ thống đã chuyển hoàn toàn sang web (06/08/2026), ứng dụng WPF ngừng hoạt động. Mã nguồn WPF bị xoá khỏi repo từ 30/07/2026 (commit `2f4bc10`).

Migration 28 gỡ: cột `CreditCards.Limit`, và chuỗi `[CollateralId:` trong `Note` (backfill về cột `CollateralId` trước khi xoá, giữ nguyên ghi chú thật của banker).

Migration 29 cho `[PENALTY_RATE:` một cột thật — `LoanContracts.PrincipalPenaltyMultiplier`. Trước đó khối này **cố ý không được gỡ** vì chưa có chỗ chứa; nay đã gỡ và `stripLegacyNoteBlobs` gỡ luôn nó. Đọc hệ số phạt gốc từ cột, `NULL` là dùng mặc định 1,5 chứ **không** phải chưa khai — `0` mới là miễn phạt, nên đừng viết `PrincipalPenaltyMultiplier || 1.5`.

Nhánh đọc `[RATE_HISTORY:` từ `Note` trong `getContractRateHistory` đã gỡ 10/08/2026: migration 24 dọn dữ liệu về 0 dòng và `LoanContracts.RateHistory` là cột thật của 18 KUNN còn giữ lịch sử lãi suất. `stripLegacyNoteBlobs` **vẫn giữ** cả sáu biểu thức gỡ chuỗi — nó nằm trên đường ghi và là lớp phòng vệ, không phải mã chết.

**WPF ghi vào bộ bảng riêng, không phải bảng của web app** — đây là chỗ dễ nhầm nhất khi đọc database:

| WPF ghi | Web app dùng |
| :--- | :--- |
| `Loans` | `LoanContracts` |
| `LoanSchedules` | `RepaymentSchedules` |
| `LoanCollaterals` | `CreditContracts.CollateralIds` |
| `PostLoanControls` | `PostLoanControlRecords` |
| `ApprovalConditions` | không có bản thay thế |

Migration 35 xoá cả sáu (kèm `__EFMigrationsHistory`), sau khi `reports/08` đọc trước. Hệ quả cần biết khi truy nguyên dữ liệu cũ: WPF nối database bằng **superuser Postgres nhúng cứng trong `AppDbContext.cs`** nên nó đi vòng qua RLS hoàn toàn — mọi bất thường dữ liệu trước 30/07/2026 đều phải xét khả năng do đường này ghi vào.

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

### `businessPlan.ts`

| Hàm | Điều phải biết |
| :--- | :--- |
| `computeBusinessPlan` | **Nguồn duy nhất** của mọi số dẫn xuất trong phương án. Hai kỳ đi qua cùng `computePeriod` — đó chính là thứ chặn lỗi #3 của file Excel tái sinh. Xem §10b. |
| `interestAnnualOf` | Chi phí lãi vay **chỉ** sinh từ danh sách khoản vay. Đừng thêm ô nhập lãi vay thứ hai; file Excel gốc có hai con số và chúng đã lệch nhau. |
| `businessPlanInputFrom` | Chỗ duy nhất dịch dòng cơ sở dữ liệu sang đầu vào tính toán. Khả năng bảo đảm truyền từ ngoài vào, **không** đọc từ dòng phương án. |
| `emptyBusinessPlan` | Điền sẵn `DEFAULT_MAX_DTI_PERCENT`. Bỏ trống là 0, mà 0 nghĩa là chưa khai → khả năng vay bằng 0. |
| `totalUsableCapacity` | Ở `collateralMath.ts`. Rút ra 09/08/2026 khi đếm được 4 chỗ cùng `reduce(usableCapacity)`. Cần cộng khả năng bảo đảm thì gọi nó, đừng viết `reduce` thứ năm. |

### `dueList.ts`

`filterByDue` đặt mốc 0 vào nhóm "sắp đến hạn": đến hạn **hôm nay** thì chưa quá hạn, khớp cách phân nhóm nợ ở §2. Thiếu số ngày cũng coi là sắp đến hạn để dòng đó không âm thầm biến mất khỏi cả hai bộ lọc.

`buildDueListHtml` không dùng thư viện ngoài, mở cửa sổ mới rồi để trình duyệt in ra PDF — cùng cách làm với tờ lãi suất. Khổ A4 **ngang** vì các bảng này nhiều cột.

### In và tải file — hai đường duy nhất

**In: `printHtmlDoc` trong `printHtmlDoc.ts`.** Không nơi nào được gọi `window.open` để in.

Trước đây có ba cách cho cùng một việc: `printHtmlDoc` (iframe ẩn, tự dọn theo `afterprint`), `openPrintWindow` trong `dueList.ts` (popup), và một bản popup chép tay trong `RateQuoteView` giống hệt `openPrintWindow`. `DocumentPreview` là cách thứ tư, popup kèm `<script>window.onload = print()`.

Popup sai ở ba điểm. Trình duyệt chặn popup thì lệnh in **im lặng không xảy ra** — `DocumentPreview` còn `return` trắng, người dùng bấm In mà không có gì báo, đúng kiểu nuốt lỗi §1 cấm. `setTimeout(300)` trước khi in là cuộc đua: máy chậm thì in ra trang trắng. Và cửa sổ không bao giờ được dọn.

iframe không dính cái nào: không bị chặn, `document.write` là đồng bộ nên không cần chờ, và `afterprint` dọn ngay. `printHtmlDoc` trả `boolean` — **phải kiểm và báo cho người dùng khi false**.

**Tải file: `downloadTextFile(content, fileName, mimeType)` trong `xlsExport.ts`.** Ba bản Blob + thẻ neo chép tay giống hệt nhau, chỉ khác MIME. `downloadXls` giờ là lớp mỏng gọi nó. Dùng hằng `MIME_XLS` / `MIME_XLSX` / `MIME_DOCX`, đừng gõ lại chuỗi MIME. `MIME_DOC` đã gỡ cùng lúc bỏ bản `.doc` HTML. Tệp nhị phân đi qua `downloadBytes`, không qua `downloadTextFile`.

Tệp Word phải mở đầu bằng `'\uFEFF'` — thiếu BOM thì Word đọc sai tiếng Việt. Viết bằng dấu escape, đừng dán ký tự BOM thật vào mã nguồn: nó vô hình, người sau sửa sẽ xoá nhầm.

### `rateSheet.ts` · `dueList.ts` — bảng in

Cả hai dựng tài liệu HTML tự chứa rồi để trình duyệt in ra PDF, **không dùng thư viện ngoài**. Tờ lãi suất khổ A4 dọc; danh sách theo dõi hạn khổ A4 **ngang** vì nhiều cột.

Trong `<style>` của tờ in bắt buộc có `print-color-adjust: exact` cho `html, body, header, th, .meta` và hàng chẵn: **Chrome mặc định KHÔNG in nền khi Save as PDF**, thiếu dòng này thì dải tiêu đề xanh và ô tiêu đề bảng in ra trắng, chữ trắng mất hút.

`KENH_GUI_KHACH` chỉ gồm `quay` và `online` — xem §8 *Tờ chào khách chỉ chứa thông tin đã công bố*. Có test riêng khẳng định chuỗi FTP không xuất hiện trong tờ in.

### `fontSettings.ts`

Chỉ dùng font có sẵn trên máy, **không tải từ CDN**: tải font ngoài kéo theo phụ thuộc mạng và làm chữ nhảy khi trang mới mở, mà hệ thống này chạy trong mạng nội bộ ngân hàng. Mỗi lựa chọn đều có dấu tiếng Việt đầy đủ và font dự phòng phía sau.

**Không dùng `font-sans` của Tailwind ở bất cứ đâu.** Lớp đó ghi `font-family` cứng lên phần tử nên chặn kế thừa từ `body`, vô hiệu hoá `--app-font`. Chọn font trong Cài đặt từng hoàn toàn không ăn vì `App.tsx` bọc cả cây con trong `font-sans`. Cần thoát khỏi ngữ cảnh mono thì dùng `.font-app` — khai trong `index.css` sau `.font-mono`, trỏ thẳng vào `var(--app-font)`.

**Cỡ chữ lớn cũng phải khai trong `index.css`, sau `.font-mono`.** Lớp tiện dụng cỡ chữ của Tailwind cùng độ đặc hiệu `0-1-0` với `.font-mono` nên thua theo thứ tự nguồn: viết `text-[calc(...)]` thẳng trong component sẽ bị ép về `--fs-mono`. Đã có `.num-lead`; thêm cỡ mới thì khai cạnh nó. Test ở `src/components/__tests__/ScheduleTab.test.tsx` khẳng định không còn `text-[calc(` nào trong cây render.

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

**Quy tắc: màu tô ở đúng năm chỗ, không tô chỗ khác.** Chốt 19/08/2026, thay
quy tắc "màu chỉ mang nghĩa" trước đây.

| Vị trí | Màu |
| :--- | :--- |
| Năm ô KPI | năm sắc định danh: `accent`, `kpi-cust`, `kpi-collateral`, `kpi-card`, `neg` |
| Số tiền trong bảng | `pos` |
| Ngày tháng trong bảng | `accent` |
| Trạng thái, hạn còn lại | viên nền `pos-soft` / `warn-soft` / `neg-soft`; quá hạn dùng `bg-neg` + `text-surface` |
| Tiêu đề, nhãn, khung | trung tính — không tô |

Dòng cuối là ràng buộc thật: tiêu đề panel **không** được tô màu. Trước đây
"DƯ NỢ THEO PHƯƠNG THỨC VAY" tô xanh dương nằm ngay cạnh "PHÂN BỔ DƯ NỢ THEO
NHÓM NỢ" tô xanh lá — hai màu trang trí không mang nghĩa gì, đặt cạnh bốn panel
cảnh báo đang dùng đúng bốn sắc ngữ nghĩa.

**Sắc định danh của hàng KPI vẫn giữ ranh giới cũ.** Chủ dự án chốt 17/08/2026 rằng năm ô KPI trên dashboard phải nhận ra được từng ô bằng màu. Nếu mượn `pos` / `warn` cho việc đó thì cùng một màn hình sẽ có hai nghĩa của một màu — ngay dưới hàng KPI là bốn panel cảnh báo đang dùng đúng bốn sắc ngữ nghĩa. Nên sắc định danh sống ở **namespace riêng**: `--t-kpi-cust`, `--t-kpi-collateral`, `--t-kpi-card` (tím, ngọc, hồng), không sắc nào trùng `pos` lục hay `warn` hổ phách. Ô dư nợ dùng `accent`, ô cảnh báo giữ `neg` vì đỏ ở đó **có nghĩa thật**.

Ranh giới: token `--t-kpi-*` **chỉ** dùng cho hàng KPI. Cần phân biệt các mục ở chỗ khác thì phân biệt bằng chữ và bố cục, đừng thêm sắc định danh thứ tư. `KpiCard` nhận **một** biến `--kpi-hue`; số lớn, ô biểu tượng và vạch trên đều đọc từ biến đó, nên thêm sắc là thêm một dòng token chứ không phải sửa ba bảng `Record` như bản cũ.

Mọi cặp màu đã đo tương phản ở cả hai giao diện, thấp nhất **4,50** (`accent` trên `panel-muted`, giao diện sáng). Đổi giá trị `--t-*` thì đo lại, đừng ước lượng bằng mắt: chữ 10–11px không có chỗ để hụt tương phản. Riêng viên "Quá hạn" nền đặc phải dùng `text-surface` chứ không `text-white` — ở giao diện tối nền đỏ sáng, chữ trắng chỉ đạt 2.71.

Ngưỡng này nay có test giữ: `src/lib/__tests__/contrast.test.ts` đo mọi cặp màu
ngữ nghĩa ở cả hai giao diện và bắt buộc đạt WCAG AA (4,5). Đổi giá trị `--t-*`
mà làm rơi xuống dưới ngưỡng thì test đỏ ngay. **Đừng hạ ngưỡng trong test để
cho xanh** — chỉnh lại giá trị màu.

`src/lib/themeTokens.ts` giữ bản sao bảng màu ở dạng TypeScript để test đọc
được; `src/lib/__tests__/themeTokens.test.ts` chặn nó trôi khỏi `index.css`.

### Thang chữ

`src/lib/fontSettings.ts` sinh ra sáu biến ngữ nghĩa, dẫn xuất từ bốn nhóm
điều chỉnh của màn Cài đặt:

| Biến | Dẫn xuất | Mặc định | Dùng cho |
| :--- | :--- | ---: | :--- |
| `--fs-screen` | `heading + 4` | 18px | tiêu đề màn |
| `--fs-title` | `heading + 1` | 15px | tiêu đề thẻ |
| `--fs-body` | `table + 1` | 13px | ô bảng thường, chữ thân, ô nhập |
| `--fs-dense` | `table` | 12px | bảng dày: lịch trả nợ 120 kỳ, ma trận COF |
| `--fs-label` | `small` | 11px | nhãn cột, nhãn KPI, chú thích |
| `--fs-num` | `mono × 2` | 24px | số trên thẻ KPI |

Cột "Dùng cho" là **đích của đợt 3–7, chưa phải hiện trạng**: sáu biến đã sinh
ra nhưng chưa component hay quy tắc CSS nào đọc `var(--fs-*)`. Các màn vẫn ăn
theo bốn biến cũ qua khối ghi đè ở cuối `index.css`. Ví dụ: đổi `--fs-num` lúc
này **không** làm số trên thẻ KPI đổi theo, vì `KpiCard` đang khai cứng
`text-2xl xl:text-3xl`.

Bốn biến cũ `--fs-heading`, `--fs-table`, `--fs-small`, `--fs-mono` cùng khối
ghi đè lớp Tailwind ở cuối `index.css` là **cầu tạm** cho các màn chưa chuyển.
Gỡ ở đợt 7 khi màn cuối cùng đã dùng biến ngữ nghĩa. Mã mới dùng biến ngữ
nghĩa, đừng dùng bốn biến cũ.

Mật độ dòng đi qua `data-density="cozy" | "compact"` đặt ở khối bao ngoài, ô bảng dùng `px-[var(--row-px)] py-[var(--row-py)]`. Bảng lịch thu nợ 40 kỳ và bảng tra cứu không cần cùng chiều cao dòng.

Số tiền luôn `font-mono` — lớp này đã bật `tabular-nums`, cột số mới thẳng hàng. Số 0 in thành `–`: bảng ngân hàng đầy số 0 thì mắt không tìm ra số thật.

### Định tuyến

`react-router` v7. Bảng đường dẫn khai một chỗ ở `src/lib/routes.ts`; `src/lib/navigation.ts`
đọc từ đó nên thanh bên và bảng lệnh không thể lệch đường dẫn. Nhưng `App.tsx` viết cứng
21 thẻ `<Route>` và không đọc `NAV_ITEMS` hay `NAV_GROUPS` — thêm màn phải sửa **ba** chỗ:
`routes.ts` (đường dẫn), `navigation.ts` (mục thanh bên) và `App.tsx` (tuyến đường cùng
import `lazy`). Quên chỗ thứ ba: mục menu vẫn hiện đủ trên thanh bên, nhưng bấm vào thì
lặng lẽ nhảy về `/dashboard` — không lỗi, không cảnh báo, và không test nào bắt được ngoài
`src/components/__tests__/routing.test.tsx` (dựng `App` thật, không phải `AppLayout` giả).

`vercel.json` đã có sẵn rewrite `/(.*) → /index.html`, nên F5 ở đường dẫn con không ra 404
trên bản đã triển khai. Đừng gỡ dòng đó.

Đường dẫn viết **tiếng Anh**, chữ thường, không có gạch chéo ở cuối — chốt 20/08/2026 để
tránh rắc rối mã hoá và công cụ. Chúng bám sát `ScreenId`, cộng tiền tố nhóm `/tools/` và
`/reference/`. Test `src/lib/__tests__/routes.test.ts` giữ ba quy tắc đó.

**Cầu tạm cần gỡ.** `WorkContext.activeTab` / `setActiveTab` giữ nguyên chữ ký cũ nhưng nay
đọc từ `screenIdOfPath(location.pathname)` và ghi bằng `navigate(ROUTE_OF[tab])` — không còn
state riêng. Rà soát 20/08/2026: chỉ còn **3 tệp** gọi `setActiveTab`, không phải cả 19 màn —
`WorkContext.tsx` (dùng nội bộ ở `requestDisburse`), `CustomerListView.tsx` và
`DashboardView.tsx` (mỗi màn nhảy sang HĐTD / Khoản vay / TSĐB ngay sau khi chọn một khách
hàng). Đây là **đích chưa xong**: hai màn đó nên gọi `useNavigate` trực tiếp thay vì qua cầu
— chuyển nốt ở đợt 3–7, xong thì gỡ `activeTab` / `setActiveTab` khỏi `WorkContext`.

Sáu màn hồ sơ khách hàng hiện dùng đường dẫn phẳng (`/loans`, `/collaterals`…). Đợt 1b lồng
chúng vào `/customers/:id/` theo spec §6.1. Mười ba đường dẫn còn lại đã là hình cuối.

### Hai ngôn ngữ

`src/lib/i18n.ts` giữ từ điển `vi` / `en`, `LanguageContext` cấp hàm `t()` và ghi `app_lang` vào localStorage kèm thuộc tính `lang` trên `<html>`. Công tắc VI/EN nằm ở Header.

**Không viết song ngữ chồng dòng** (nhãn tiếng Anh kèm nhãn tiếng Việt bên dưới). Một màn hình chỉ nói một thứ tiếng tại một thời điểm; muốn thấy tiếng kia thì bật công tắc.

Toàn bộ giao diện đã chuyển sang token: không còn `isLight` trong mã, và các khối `!important` ghi đè theo lớp Tailwind trong `index.css` đã gỡ hết — chỉ còn khối `prefers-reduced-motion`. Lớp màu thô (`slate-*`, `sky-*`, `emerald-*`…) trong `.tsx` chưa hết hẳn: rà soát 19/08/2026 còn đếm được **26 lớp** ở `src/components/ErrorBoundary.tsx`, `src/components/inventory/PurchaseStatementTab.tsx`, `src/components/inventory/RetailInvoiceTab.tsx`.

Chuỗi class dùng chung nằm ở `src/lib/uiClasses.ts` (`PANEL`, `UI.containerCardBg`, `UI.inputStyle`, `TABLE_HEAD`, `TABLE_CELL`, `SECTION_LABEL`, `BTN_PRIMARY`, `DEBT_GROUP_COLOR`…). Đây là nơi duy nhất khai báo — đích, chưa phải hiện trạng: rà soát 19/08/2026 đếm được **44 chuỗi** `bg-accent text-accent-ink` tự dựng ở **27 tệp** `.tsx`, và **16 chuỗi** `bg-panel border border-line` tự dựng ở **8 tệp**. `src/lib/themeStyles.ts` đã xoá.

Component **không được** truyền chuỗi class qua props. Đây là đích, chưa phải
hiện trạng: rà soát 19/08/2026 đếm được **69 tệp** vẫn truyền
`containerCardBg`, `inputStyle`, `labelStyle`, `tableHeaderStyle`,
`sectionBoxBg`, `styles`, `cardBg`. Đợt 2 của lần rebuild giao diện dựng bộ
component đọc token trực tiếp; đợt 3–7 gỡ dần các props này theo từng màn. Mã
mới **không được thêm** props kiểu này.

Lưu ý khi đặt tên lớp động: Tailwind quét mã tĩnh, nên `bg-g${n}` **không sinh ra lớp nào**. Dùng bảng tra như `DEBT_GROUP_COLOR[n]`.

Đã chuyển sang `t()`: Header, Sidebar, `ScheduleTab`, `PeriodDetailCard`. Các màn còn lại vẫn để chuỗi tiếng Việt cứng — vì vậy **công tắc VI/EN đang tắt** bằng cờ `LANG_SWITCH_ENABLED` trong `i18n.ts`. Bật nửa vời còn tệ hơn không bật: người dùng sẽ thấy thanh điều hướng tiếng Anh nằm cạnh thân màn tiếng Việt. Dịch xong toàn bộ thì bật lại cờ đó.

### Bảng đổi hình dạng theo thiết bị

Điện thoại ưu tiên **tra cứu**, máy tính ưu tiên **nhập liệu** — chốt với banker 07/08/2026.

Bảng 6–12 cột không bao giờ vừa màn 375px. Đo được trước khi sửa: bảng Định giá TSĐB rộng **1311px**, người dùng thấy 29% rồi phải vuốt ngang 936px; bảy màn cùng tình trạng.

**Cách chữa không phải ẩn bớt cột.** Banker mở Lịch thu nợ trên điện thoại chính là để xem còn nợ bao nhiêu — ẩn cột đó thì màn hình thành vô dụng, và không ai đoán được cột nào quan trọng với người đang đứng ở quầy. Cách chữa là đổi **hình dạng** bản ghi: rộng thì bảng, hẹp thì mỗi bản ghi một thẻ dọc. Cùng dữ liệu, không mất gì.

`AdaptiveTable` trong `src/components/AdaptiveTable.tsx` nhận **một** bộ định nghĩa cột rồi dựng ra cả hai hình dạng. Điểm ngắt là `md` (768px).

| `priority` | Trên điện thoại | Đặt cho |
| :--- | :--- | :--- |
| `1` | Hiện thẳng trên mặt thẻ | Số tiền, hạn còn lại, trạng thái, ngày đến hạn |
| `2` | Trong phần bung ra | Số hiệu chứng từ, kỳ hạn, thông tin tra cứu sâu |
| `3` | Trong phần bung ra, cuối cùng | Thứ đã có ở `cardTitle` / `cardSubtitle` |

Tên khách và mã CIF thường để `priority: 3` vì chúng đã nằm ở tiêu đề thẻ — hiện lại là thừa.

**Đừng viết bảng và thẻ thành hai đoạn mã riêng.** Chúng sẽ trôi dạt: thêm cột vào bảng, quên thêm vào thẻ, và điện thoại thiếu số. Đây đúng cái giá dự án đã trả năm lần với `getEffectiveLtv` ở §1, chỉ khác là lần này trôi dạt về giao diện thay vì công thức.

**Hai chỗ cố ý KHÔNG chuyển.** Lịch trả nợ ở Công cụ tính toán là lưới số 120 kỳ để so sánh dọc — 120 thẻ thì không đọc được nữa. Bảng lãi suất ở Mua bán vốn nội bộ là ma trận hai chiều, tách thành thẻ là phá quan hệ hàng–cột, tức là phá chính thông tin. Hai chỗ đó giữ bảng cuộn ngang là đúng; cần cải thiện thì khoá cột đầu khi cuộn, đừng đổi sang thẻ.

Sửa gì ở đây thì **đo lại trên trình duyệt ở 375px**, đừng tin mắt: đếm phần tử có `getBoundingClientRect().right` vượt `clientWidth` mà tổ tiên không có `overflow-x: auto`.

### Thông báo — một đường duy nhất

`Toast` trong `src/components/Toast.tsx`, kèm hook `useToast`. Không nơi nào được tự dựng khung thông báo hay gọi `window.alert`.

Trước đây có ba kiểu song song: khung nổi góc phải mà **năm màn mỗi màn tự khai lại cùng một chuỗi lớp**, chữ chèn trong luồng trang, và `window.alert`. Toast gộp cả ba, thêm nút đóng, `role="status"` với `aria-live` đổi theo mức độ, và trên màn hẹp trải ngang thay vì tràn khỏi mép phải. Mốc trên bám `--header-h` nên không chui xuống dưới thanh tiêu đề cố định.

**Đừng báo thành công cho việc chưa xảy ra.** Tab Cài đặt từng có nút "LƯU CÀI ĐẶT CÁ NHÂN" không lưu gì cả — cả bốn nhóm thiết lập đều tự ghi `localStorage` ngay khi người dùng chạm vào điều khiển, nút chỉ bật một dòng chữ ở **đầu** trang trong khi nó nằm ở **cuối** trang. Đã gỡ, thay bằng một câu nói thẳng rằng thiết lập tự lưu.

### Quy tắc hình thức dùng chung

Ba thứ dưới đây khai báo ở `src/lib/uiClasses.ts`, đừng dựng lại tại chỗ:

| Hạng mục | Quy tắc |
| :--- | :--- |
| Bo góc | Ba bán kính, khai bằng biến CSS: `--r-panel` 12px cho thẻ, bảng, hộp thoại; `--r-control` 8px cho nút, ô nhập, tab; `--r-pill` 999px cho viên trạng thái. Dùng qua `RADIUS_PANEL`, `RADIUS_CONTROL`, `RADIUS_PILL` ở `uiClasses.ts`, không viết `rounded-*` thô |
| Nút | `BTN_PRIMARY` nền màu nhấn — **mỗi màn chỉ một nút chính**; `BTN_SECONDARY` viền mờ cho thao tác phụ như xuất Excel, in, nhập CSV; `BTN_DANGER` cho thao tác xoá |
| Tiêu đề | `HEADING_SCREEN` cho tiêu đề màn, `HEADING_PANEL` cho tiêu đề thẻ, `SECTION_LABEL` cho nhãn nhỏ. **Chữ in hoa chỉ dùng cho nhãn 10–11px**; tiêu đề cỡ `text-sm` trở lên viết thường |

Màu nền đặc của trạng thái (`bg-neg`, `bg-warn`, `bg-pos`) đi kèm chữ `text-surface`, không phải `text-white`: ở giao diện tối nền đỏ sáng với chữ trắng chỉ đạt tương phản 2,71.

Bảng dữ liệu dùng `TABLE_HEAD` cho hàng tiêu đề và `TABLE_CELL` cho ô. Ô lấy giãn cách từ biến `--row-px` / `--row-py` nên mọi bảng đổi mật độ cùng lúc; `data-density="compact"` đặt ở khối bao ngoài để thu gọn một vùng cụ thể. Các màn còn lại vẫn để chuỗi tiếng Việt cứng trong mã, dịch dần theo từng đợt — xem "Hai ngôn ngữ" ở trên. Giá trị dữ liệu lấy từ CSDL (`KunnTenor`, `PrincipalRepaymentMethod`, tên nhóm nợ) **không dịch** — đó là dữ liệu nghiệp vụ, không phải giao diện.

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
npm test           # 1.686 test
npm run lint       # Kiểm tra mã nguồn
```
