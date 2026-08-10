# Tiến độ công việc

Cập nhật: 07/08/2026

Trạng thái: ✅ xong · 🔄 đang làm · ⬜ chưa làm · 🕐 hoãn có chủ đích · ⚠️ chờ quyết định nghiệp vụ

---

## Bảo mật

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Gỡ credential nhúng cứng khỏi mã nguồn | Mật khẩu superuser Postgres và anon key |
| ✅ | Loại `.env` khỏi git, chặn tái phạm | |
| ✅ | Chuyển repository sang riêng tư | |
| ✅ | Xoay vòng mật khẩu Postgres và anon key | |
| ✅ | Đăng nhập bắt buộc, tắt tự đăng ký | |
| ✅ | Bật RLS trên toàn bộ bảng | Đã kiểm chứng: banker chỉ thấy KH của mình |
| ✅ | Xoá thư mục `api/` code chết | Từng làm lộ mật khẩu database |
| 🕐 | Bật chính sách mật khẩu Supabase | Hoãn tiếp theo quyết định 05/08/2026: chưa cấp tài khoản cho ai nên chưa cần. Mốc cần làm: **trước khi cấp tài khoản đầu tiên**. Tối thiểu 12 ký tự + Leaked Password Protection |
| 🕐 | Xoá tài khoản thử nghiệm `abc@gmail.com` | Hoãn theo quyết định 03/08/2026. **Không phụ thuộc việc cấp tài khoản**: đây là tài khoản đang hoạt động, mật khẩu yếu, có quyền xem hồ sơ khách hàng thật. Mốc: khi kết thúc đợt kiểm thử |

## Chất lượng dữ liệu

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Trả việc sinh ID về cho database | Bỏ `max(Id)+1` ở client, đồng bộ sequence |
| ✅ | Đưa dữ liệu nghiệp vụ từ `Note` về cột riêng | 39 hợp đồng, đối chiếu từng dòng với bản sao lưu |
| ✅ | Bịt các đường vẫn đang GHI dữ liệu nghiệp vụ vào `Note` | Migration 06 dọn dữ liệu cũ nhưng **không bịt đường ghi**, nên hệ thống tự sinh lại. Rà soát 05/08/2026 tìm ba đường, hai đang sống: `LoanPortfolioView` nhét `HĐTD: <số>` mỗi lần lưu KUNN (100 KUNN, **lệch số thật ở 2 dòng của LÊ VĂN CAO** ghi `HĐTD-01`/`HĐTD-02` — `getMasterHdtdNumber` đọc `Note` trước `ContractNumber` và `computeLimitGroups` lấy hàm đó làm khoá nhóm, nên `findLimitGroupFor` tra bằng số thật không khớp, chốt hạn mức hai KUNN đó rơi về mặc định); `generateSchedule` ghi `[TRẢ TRƯỚC HẠN: +Xđ]` vào `RepaymentSchedules.Note` mà bỏ trống `PrepaidPrincipalAmount`; `CreditCards.Note` còn `[CollateralId:N]` nhưng chỉ còn đọc. **Mã nguồn đã bịt cả ba** và xoá `serializeContractRateHistory` (không còn ai gọi), gom việc gỡ chuỗi về `stripLegacyNoteBlobs`. **Migration 24 đã chạy 05/08/2026.** Kiểm chứng: cả sáu khối chuỗi về **0 dòng**; 82 ô `Note` thành rỗng, đối chiếu bản sao lưu `_backup_Note_20260805` xác nhận **tất cả chỉ chứa dữ liệu nghiệp vụ, không mất ghi chú thật nào**. Bất biến sau khi dọn: **98 KUNN có lịch, 0 sai tổng gốc, 0 kỳ 1 trước giải ngân**. `RepaymentSchedules` Id 4387 (LÊ VĂN HẬU `2002/HĐTD/9665732/GNN-01`, kỳ 10, `IsPaid=true`) có 900 triệu trả trước hạn chuyển từ `Note` sang cột: dư nợ **không đổi** vì `paidPrincipalOf` với kỳ đã thu vốn trả về `PrincipalAmount` đã gồm phần đó — nhưng bịt được quả mìn: trước đó nếu sinh lại lịch thì `recalculateSchedules` đọc `PrepaidPrincipalAmount` rỗng và sẽ thổi bay 900 triệu khỏi kỳ 10, phá bất biến Σgốc |
| ✅ | Sửa kiểu cột `CreditCards.IssuanceType` | Cột số nhận chuỗi mô tả nên diện mở thẻ mất mỗi lần lưu |
| ✅ | Gỡ nhánh đọc số HĐTD từ `HdtdDueDate` | Tàn dư thiết kế cũ |
| ✅ | Lịch sử định giá TSĐB | Bảng `CollateralAppraisals` kèm trigger đồng bộ giá trị hiện hành. Đã nạp 55 dòng từ dữ liệu hiện có. Ghi nhận định giá lại qua màn hình Kiểm soát sau vay |
| ✅ | Chỉnh LTV của hai tài sản lệch bậc phân loại | Đã kiểm chứng 04/08/2026: 55 tài sản, mỗi xếp loại chỉ còn một giá trị LTV duy nhất (Loại 1 80% · Loại 2 70% · Loại 3 60% · Loại 4 55%) |
| ✅ | Số HĐTD gốc của KUNN đọc theo HĐTD liên kết | `resolveMasterHdtdNumber`. Trước đây suy từ tiền tố số KUNN nên sửa số bên HĐTD không kéo theo. Migration 16 đổi luôn tiền tố số KUNN cũ |
| ✅ | Làm tròn lại gốc kỳ chưa trả theo bước 10.000đ | Migration 18 đã chạy 05/08/2026. Kiểm chứng: Σ(gốc)=số tiền vay đúng ở **mọi** khoản, gốc kỳ chưa trả chia hết 10.000. Loại 41 dòng: gốc trả cuối kỳ và 2 KUNN đang thu lẻ |
| ✅ | Chuẩn hoá ngày đọc từ database về một dạng | `toIsoDate` trong `utils.ts`. `HdtdDueDate` kiểu `timestamptz` trả về chuỗi có múi giờ nên `creditLimit.ts` so chuỗi ra sai thứ tự, hai view tự chặn bằng regex khiến nhánh dự phòng ngày hết hiệu lực coi như chết, và `saveContractAPI` **xoá hẳn trường khỏi payload** — mở KUNN cũ rồi lưu là mất giá trị mà giao diện vẫn báo thành công. 6 test |
| ✅ | Chống trùng số hiệu KUNN ở mã nguồn | `assertKunnNumberFree` hỏi lại database trước khi ghi, `findKunnNumberClash` so theo dạng chuẩn hoá, lỗi unique của Postgres dịch sang tiếng Việt. 7 test. Nguyên nhân cũ: `nextKunnNumber` gọi lúc **mở form**, số không kiểm lại lúc lưu; cộng với migration 16 bước 2 thiếu dấu phẩy giữa hai CTE nên bước chốt an toàn chưa bao giờ chạy trong khi bước đổi số vẫn chạy |
| ✅ | 14 KUNN chưa tất toán không có dòng lịch thu nợ nào — 4.635.000.000đ dư nợ đóng băng | Đo được 05/08/2026: 97 KUNN chưa tất toán, 14 trong đó có 0 kỳ trong `RepaymentSchedules`, nên `computeOutstandingBalance` rơi vào nhánh dự phòng trả `CurrentBalance` — không có kỳ nào để đánh dấu đã thu nên dư nợ không bao giờ giảm được. **Anh đã sinh lại toàn bộ lịch 05/08/2026.** Kiểm chứng sau đó: **97/97 KUNN chưa tất toán đều có lịch**, `Σ(gốc các kỳ) = số tiền vay` đúng ở **mọi** khoản (0 dòng lệch), và **0 khoản có kỳ 1 rơi trước hoặc trùng ngày giải ngân** — lỗi đã gây thu vượt 21,7 triệu không còn ở đâu trên danh mục |
| ✅ | Chặn đóng HĐTD khi còn KUNN chưa tất toán | Migration 22 đã chạy 05/08/2026. **Rà soát BƯỚC 1 trả 0 dòng** — không HĐTD nào đang ở trạng thái sai; HĐTD `2002/HĐTD/9629301` của NGUYỄN MINH HÙNG đã được mở lại (`IsClosed = false`, hiệu lực 05/12/2025–05/12/2026, hai KUNN 200tr vẫn đang chạy đúng). **Kiểm chứng trigger** bằng `BEGIN; UPDATE ... SET "IsClosed" = true WHERE "Id" = 19; ROLLBACK;` — trả đúng `ERROR 23514: còn 2 KUNN chưa tất toán (2002/HĐTD/9629301/GNN-01, 2002/HĐTD/9629301/GNN-02)`, nêu đủ số hiệu nên trigger đọc đúng dữ liệu. Đo thêm: `CreditContractId IS NULL` = 0 dòng, tức mọi KUNN đều gắn HĐTD qua khoá ngoại — đúng đường trigger đối chiếu, không có lỗ |
| ✅ | `NOT NULL` cho `LoanContracts.CreditContractId` | Migration 23. Trigger chặn đóng HĐTD của migration 22 đối chiếu qua khoá ngoại này, để trống thì khoản vay vô hình với trigger. Đo trước khi làm: 0 dòng null, và mọi đường tạo KUNN trong ứng dụng đều gán qua `applyCreditContractToForm` lại chặn sẵn khi khách chưa có HĐTD — không phá đường ghi nào |
| ✅ | Xoá cột rác `CreditContracts.RateHistory` | Rà soát `reports/03` tìm 59 dòng: nội dung là bản sao `Note` cũ (`HĐTD: <số>` kèm `[PENALTY_RATE:N]`), **không phải lịch sử lãi suất**. Migration 14 copy vào sai cột. **Bảy dòng đã trôi dạt**: Id 26 khai `PNAT.CN.08102312` của TRẦN THỊ KIM CHI mà nội dung ghi `2002` (số của khách khác); Id 34/35/36 ghi nhãn tạm `HĐTD-01`/`HĐTD-02`; Id 10/11/12 của ĐOÀN NGỌC LÝ lệch số. Không mã nào đọc. **Migration 25 đã chạy 05/08/2026.** Kiểm chứng: cột không còn (`information_schema` trả 0), và `LoanContracts.RateHistory` không bị đụng — **18 KUNN vẫn giữ nguyên lịch sử lãi suất thật**. Bốn giá trị `[PENALTY_RATE:]` được giữ trong `_backup_CreditContractsRateHistory_20260805` |
| ✅ | Kỳ thu nợ được coi là xong khi chưa thu đủ | Chốt nghiệp vụ 05/08/2026: kỳ chỉ xong khi thu **đủ nghĩa vụ** (gốc + lãi + phạt). `IsPaid` là ô tích tay và điều khiển cả ba đường: `getAutoDebtGroupInfo` bỏ kỳ đó khỏi đếm ngày quá hạn, phần hiển thị ngừng tính phạt, thẻ tổng hợp cộng toàn bộ gốc lãi vào cột đã thu — tích sớm là khai thiếu dư nợ, khai tốt nhóm nợ và tha phạt. Thêm `schedulePaymentStatus` (`chua_thu`/`thu_mot_phan`/`da_thu_du`) làm nguồn duy nhất, nối vào `getAutoDebtGroupInfo`, `ScheduleTab` và `DebtSummaryCard`. Bảng lịch có nhãn mới **Thu thiếu \<số tiền\>**. 14 test. **Ba điều đã xử:** tôn trọng quy ước cũ (`IsPaid` + hai cột khai tay trống = đã trả đủ, 831/835 kỳ) nên không làm dư nợ phình; không trừ hai lần phần trả trước hạn (ca LÊ VĂN HẬU 785 và 888 triệu); không cần ngưỡng làm tròn vì đo được 0 kỳ thiếu dưới 100.000đ. Phạt có tính vào nghĩa vụ hay không đặt ở hằng số `PENALTY_COUNTS_TOWARD_SETTLEMENT` (hiện `true`). **Hệ quả cần đối chiếu:** hai kỳ của PHẠM TẤN KIỆT `PNAT.CN.02170124/GNN-01` (kỳ 17 thiếu lãi 3.486.897đ, kỳ 18 mới thu gốc 1.911đ) nay được đếm quá hạn, nên nhóm nợ khoản đó sẽ nhảy lên |
| ⚠️ | **`[PENALTY_RATE:N]` — lãi suất phạt quá hạn theo từng khoản, không có cột để chứa** | Khối thứ bảy, `reports/03` mới tìm ra. Không mã nào đọc; mọi khoản đều bị áp `DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER = 1.5` nhúng cứng. KUNN `PNAT.CN.01290824/GNN-01` (MAI PHƯỚC HIỂN) khai `PENALTY_RATE:0` tức **miễn phạt** nhưng hệ thống tính 150%. **Chưa gây thiệt hại** — kiểm chứng 21/21 kỳ đã thu đúng hạn, `OverdueDays = 0`, `OverdueInterestAmount = 0`. **Cần quyết định:** lãi suất phạt có khác 150% theo từng khoản không. Có thì cần cột thật + nối vào `computeSchedulePenalty` (`calcOverduePenalty` đã nhận sẵn `principalPenaltyMultiplier`). `stripLegacyNoteBlobs` cố tình chưa gỡ chuỗi này vì đó là bản ghi duy nhất của con số |
| 🔄 | Xoá toàn bộ bảng sao lưu `_backup_*` | Migration 26 chờ chạy. Liệt kê từ `pg_tables` rồi `DROP` trong vòng lặp, không kể tên bằng tay. Bốn giá trị `PENALTY_RATE` cấp HĐTD (Id 29/30 ĐINH TIÊN HOÀNG = 150, Id 40 MAI PHƯỚC HIỂN = 0, Id 48 NGUYỄN THỊ BÉ HAI = 150) đã chép vào chính tệp migration làm bản ghi vĩnh viễn trong git trước khi xoá; ba giá trị cấp KUNN vẫn còn sống trong `LoanContracts.Note` |
| ⬜ | Xoá bảng `PostLoanControls` kế thừa từ WPF | Rỗng và chỉ có 4 cột (`Id`, `CustomerId`, `LastControlDate`, `Result`), không biểu diễn được ba loại kiểm tra theo kỳ nên đã tạo bảng mới thay thế |

## Lỗi tính tiền đã sửa

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | LTV 0% bị đổi thành 80% | `parseFloat('0') \|\| 80`; tài sản hạn chế nhận thành bậc cao nhất |
| ✅ | Gộp 4 bản `getEffectiveLtv` | Cùng một tài sản cho ba hạn mức khác nhau ở ba màn hình |
| ✅ | Trừ đôi tiền trả trước hạn | Tổng gốc thu về hụt so với số cho vay |
| ✅ | Trả trước hạn mất trắng khi kỳ đã tất toán | Dư nợ không giảm |
| ✅ | Phương thức vay đè lên lựa chọn trả gốc | Giao diện ghi "trả đều" nhưng gốc mọi kỳ bằng 0 |
| ✅ | Mặc định `PrincipalRepaymentMethod` khi tạo KUNN mới không theo `LoanMethod` | Phát hiện 05/08/2026 qua khoản Nguyễn Thị Bé Hai: `loanProductRules.ts` đã có sẵn `defaultPrincipalMethod` đúng quy tắc (Hạn mức tín dụng → gốc cuối kỳ, Cho vay từng lần → gốc trả đều) nhưng `LoanPortfolioView.tsx` không hề dùng tới, hai chỗ tạo KUNN mới hardcode `'Gốc trả cuối kỳ'` bất kể `LoanMethod`. Đã nối `getLoanProductRule().defaultPrincipalMethod` vào `applyCreditContractToForm` (chỉ áp khi tạo mới, giữ nguyên lựa chọn cũ khi sửa KUNN đã lưu) và luồng giải ngân nhanh từ Dashboard. Rà soát diện rộng: không còn khoản "Cho vay từng lần" nào khác bị sai giá trị này — chỉ là lỗi khai đơn lẻ ở khoản của Nguyễn Thị Bé Hai, anh đã tự sửa lại đúng |
| ✅ | Cộng đôi hạn mức khi nhiều HĐTD chung một HMTD | Thêm tầng `CreditLimitCode` |
| ✅ | Báo động giả khi so mức cấp gốc với TSĐB ở vay từng lần | Vay từng lần phải đối chiếu theo **dư nợ hiện hữu**; hạn mức tín dụng mới đối chiếu theo mức cấp |
| ✅ | Biên độ âm bị bỏ mất, khoản vay tính lãi cao hơn hợp đồng | `toPercent` trả 0 cho mọi số âm. Biên độ là số duy nhất trong dòng thời gian lãi suất được phép âm (lãi sau ưu đãi chào dưới lãi cơ sở) |
| ✅ | Khung KUNN hiện lãi suất khác bảng lịch của chính khoản đó | Phát hiện 05/08/2026 qua ĐOÀN NGỌC LÝ `2002/HĐTD_1/9718695/GNN-03`: khung ghi **11,25%/năm**, mọi kỳ trong bảng tính lãi ở **10,20%/năm**. Hai định nghĩa "lãi suất đang áp dụng" với thứ tự ưu tiên **ngược nhau**: `getEffectiveActiveRate` ở `utils.ts` lấy `InterestRate` → `NormalRate` → `PreferentialRate` → `BaseRate` và **bỏ quên biên độ**; `buildRateTimeline` lấy `BaseRate + MarginRate` (có sàn) → `PostPreferentialRate` → `NormalRate` → `InterestRate`. Tiền đi theo dòng thời gian nên 10,20% là số thật. Đây đúng là nợ kỹ thuật `CONVENTIONS.md` §1 đã ghi từ đầu. Chuyển `getEffectiveActiveRate` sang `rateResolution.ts`, cài trên chính dòng thời gian đó — cùng hàm nuôi cả nhãn màn hình lẫn tiền phạt quá hạn nên không còn chỗ lệch. 10 test |
| ✅ | Chọn LS thông thường nhưng hệ thống vẫn áp lãi ưu đãi | Quyết định nghiệp vụ 05/08/2026: **hai chế độ lãi suất loại trừ nhau** — chọn LS thông thường thì lãi ưu đãi không tồn tại để mà áp. Form trước đây lưu **cả hai** nhóm cột bất kể banker chọn gì, còn `buildRateTimeline` thấy `PreferentialRate > 0` kèm số kỳ `> 0` là áp ưu đãi. Thêm `buildRateFields(mode, input)` làm nơi duy nhất dựng nhóm cột lãi suất khi lưu: chế độ ưu đãi xoá `BaseRate`/`NormalRate`, chế độ thông thường xoá `PreferentialRate`/`PreferentialPeriodMonths`/`PostPreferentialRate`. Dữ liệu tự nói lên chế độ nên không tạo lại được mâu thuẫn. 12 test. **Còn phải chạy** `reports/04` để tìm các KUNN cũ đang khai cả hai chế độ và quyết định từng dòng |
| ✅ | Phụ trội điều kiện không đi vào phép tính lãi | Chốt nghiệp vụ 05/08/2026: **có cộng vào lãi suất cho vay.** Trước đó cột `PenaltySurcharge` chỉ được lưu rồi đọc lại vào form, không kỳ lãi nào cộng nó — hồ sơ ĐOÀN NGỌC LÝ có phụ trội 0,20% nên `InterestRate` đã lưu 11,25% trong khi bảng lịch tính 11,05%. Nay cộng vào mọi đoạn định giá của dòng thời gian. Ba cái bẫy đã xử: (1) cột này lưu theo **điểm phần trăm** (`0.2` = 0,20%) khác các cột lãi suất khác lưu theo tỷ lệ, nên không được qua `toPercent()`; (2) `ratePercent` của mốc điều chỉnh **đã gồm** phụ trội nên không cộng lần hai, chỉ nhánh dự phòng mới cộng `penaltyPercent` của chính mốc đó; (3) sàn lãi suất áp cho phần định giá rồi phụ trội mới cộng lên sau. Cùng đợt: form không tự cộng lãi suất nữa — `currentActiveRateDisplay` dựng hợp đồng nháp từ các ô đang nhập rồi gọi `getEffectiveActiveRate`, nên số xem trước khớp đúng số sẽ lưu và sẽ tính; bản cũ bỏ qua sàn và tự đếm tháng để đoán ưu đãi đã hết. 8 test |
| ✅ | Lãi thả nổi ra 0% bị hiểu là "chưa khai" rồi nhận mặc định 8,5%/năm | Hệ quả của lỗi trên: biên độ âm lớn hơn lãi cơ sở → kẹp về 0 → mất hẳn liên hệ với hợp đồng. Tách `{ value, configured }`; 0% là con số hợp lệ |
| ✅ | Kỳ trả nợ cuối cùng không rơi vào ngày đáo hạn | GNN ghi "kỳ cuối trả vào ngày đáo hạn". Lịch cộng dồn theo kỳ nên kỳ cuối rơi trước đáo hạn khi ngày trả nợ đầu tiên khác giải ngân + 1 tháng |
| ✅ | Kỳ trả nợ đầu tiên rơi TRƯỚC ngày giải ngân | 5 KUNN của NGÔ NHỊ ĐẠT dùng chung mốc 15/04/2026 của hợp đồng hạn mức. Tính lãi cho quãng tiền chưa ra khỏi ngân hàng; hàm đếm ngày chặn số âm về 1 nên kỳ 1 chỉ ra 1 ngày lãi |
| ✅ | Đường **SỬA** KUNN vẫn sinh được kỳ 1 trước ngày giải ngân | Phát hiện 05/08/2026 khi rà soát vị trí các thành phần. Chốt bảo vệ chỉ nằm trong `generateSchedule`, còn `LoanPortfolioView` tự cộng tháng khi sửa KUNN đã có lịch — bịt đường tạo mới không bịt được đường sửa, cùng một hồ sơ vẫn tái tạo lại được lỗi cũ. Rút dãy ngày đến hạn về `buildDueDateSequence` làm nguồn duy nhất; cả `generateSchedule` và `redateSchedules` (đường sửa) đều gọi nó. Đường sửa nay cũng áp quy tắc "kỳ cuối rơi vào ngày đáo hạn" như đường tạo mới. 14 test mới, gồm ca NGÔ NHỊ ĐẠT GNN-11 và một test khẳng định hai đường cho ra dãy ngày y hệt nhau |
| ✅ | Sửa mốc trả nợ ghi đè cả kỳ ĐÃ THU | `redateSchedules` đổi `DueDate` của mọi kỳ, `recalculateSchedules` tính lại `InterestAmount` của mọi kỳ — hồ sơ đã thu vài kỳ rồi mới sửa mốc là bị sửa lại lịch sử. Nay kỳ `IsPaid` giữ nguyên `DueDate` và `InterestAmount`; gốc **vẫn** tính lại để tiền trả trước hạn ghi nhận được trên kỳ đã tất toán theo đúng quy ước. 5 test |
| ✅ | HĐTD ký nhưng chưa tới ngày hiệu lực vẫn chào hạn mức khả dụng | Chốt hiệu lực chỉ xét `ContractEndDate < today`, không xét `ContractStartDate`. Đây là khoảng trống giữa hai HĐTD kế nhiệm mà anh nêu 05/08/2026: HĐTD mới có ngày hiệu lực sau ngày đáo hạn của KUNN hiện hữu, trong quãng đó không hợp đồng nào cho phép giải ngân nhưng màn hình vẫn báo còn hạn mức. Thêm `notYetEffective` vào cả `computeLimitGroups` và `summarizeCreditContracts`; nhóm dùng chung lấy ngày hiệu lực sớm nhất, chưa khai thì không suy đoán. 8 test |
| ✅ | Tab Khoản Vay chào hạn mức khả dụng trên HĐTD **đã đóng** | Phát hiện 05/08/2026 từ hồ sơ NGUYỄN MINH HÙNG: HĐTD 2002/HĐTD/9629301 đã đóng, hai KUNN 200tr `IsSettled=false`, tab HĐTD báo đỏ "còn 400.000.000" nhưng tab Khoản Vay ghi HMTD còn lại 600.000.000 và nút Giải ngân vẫn bật. `computeLimitGroups` không đọc `IsClosed` (cờ nằm ở bảng `CreditContracts`), `expiredLimitNote` chỉ xét hết hiệu lực theo ngày, nút Giải ngân không có chốt nào. Thêm `options.isClosed`, `closed` và `blockReason` vào `LimitGroupStatus`, cùng thứ tự ưu tiên lý do chặn với `summarizeCreditContracts`. 8 test mới |
| ✅ | Đóng HĐTD bị hiểu thành "mọi KUNN đã tất toán", che mất dư nợ thật | Quyết định nghiệp vụ 05/08/2026: **đóng HĐTD là dừng quyền giải ngân, không phải xoá nợ.** `isKunnSettled` trước đây trả `true` khi HĐTD có `IsClosed`, nên hai KUNN 200 triệu của NGUYỄN MINH HÙNG (`IsSettled=false`, chưa trả đồng nào) hiện "Dư nợ hiện hữu 0" kèm nhãn "ĐÃ TẤT TOÁN (theo HĐTD)", trong khi tab HĐTD báo đỏ còn 400 triệu. Bỏ nhánh `IsClosed` khỏi `isKunnSettled` (nay chỉ một tham số), tách `isKunnOfClosedHdtd` thành hàm riêng dùng chung cho `computeLimitGroups` và nhãn trên bảng KUNN. Nhãn "(theo HĐTD)" đổi thành cảnh báo đỏ "⚠ HĐTD đã đóng, còn nợ". HĐTD đã đóng mà còn KUNN chưa tất toán nay **luôn hiện**, không ẩn theo toggle. 12 test, trong đó 5 test cũ khẳng định điều ngược lại đã bị viết lại |
| ✅ | Cấu trúc cho phép tồn tại HĐTD đã đóng mà còn dư nợ | Chủ dự án chỉnh 05/08/2026: không ngân hàng nào tất toán hợp đồng khi còn dư nợ, nên đó là **dữ liệu sai phải chặn**, không phải trạng thái cần dựng giao diện để hiển thị. Trước đó tôi đã làm đúng hướng ngược lại: nhãn đỏ trên bảng KUNN, dòng cảnh báo đầu trang, cột `closedWithBalance`, tooltip lý do chặn. Đã gỡ hết. Thay bằng ràng buộc: `canCloseCreditContract` chặn ở form, trigger `trg_chan_dong_hdtd_con_du_no` (migration 22) là lớp bảo vệ thật vì chốt client không đỡ được đường ghi SQL. Ô "HĐTD đã đóng" bị làm mờ khi còn KUNN chưa tất toán; lưu vẫn cố thì báo lỗi kèm **số hiệu** các KUNN phải xử lý. 6 test |
| ✅ | Trắng trang tab KUNN khi chọn khách hàng | `getEffectiveBalanceForContract` gọi `kunnSettled` khai sau nó; `limitGroups` gọi lúc render nên ném ReferenceError. Build, lint và 668 test đều xanh — lỗi runtime trong component |
| ✅ | Gốc mỗi kỳ lệch chứng từ vì làm tròn bước 1.000đ | GNN thật ghi 4.170.000đ/kỳ (500tr/120 làm tròn lên bước **10.000**), hệ thống cho 4.167.000đ. Gom về `PRINCIPAL_ROUND_MODE`, đã chạy migration 18 sửa dữ liệu cũ |
| ✅ | Định giá hết hiệu lực vẫn được tính vào khả năng bảo đảm | Định giá chỉ có hiệu lực 6/12/24 tháng; hết hạn thì khả năng bảo đảm bằng 0 và báo cần định giá lại |
| ✅ | Trả trước hạn trong lúc còn ân hạn gốc làm gốc đều sau ân hạn bị tính hụt, dồn cục vào kỳ cuối | Phát hiện 05/08/2026 qua đối chiếu PDF thật (GNN 960tr/120 tháng, ân hạn 18 tháng, trả trước hạn kỳ 2&3): công thức tính lại gốc đều chia dư nợ cho `tenorMonths - kỳ hiện tại` (117 kỳ) thay vì kỳ còn lại SAU ân hạn (102 kỳ) — gốc/kỳ hụt còn 8.070.000đ thay vì đúng 9.260.000đ, kỳ cuối phải gánh 128.930.000đ (gấp 16 lần một kỳ thường). Lỗi có ở CẢ HAI nơi giống hệt nhau: `calcMath.ts` (Công cụ 1) và `loanMath.ts` (lịch KUNN thật) — đã sửa cả hai thành `tenorMonths - Math.max(kỳ hiện tại, số tháng ân hạn)`. Test hồi quy trong `calcMath.test.ts` |

## Lỗi giao diện đã sửa

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Giao diện tối chưa bao giờ hoạt động đúng | Tailwind 4 gắn biến thể `dark:` vào `prefers-color-scheme` của hệ điều hành, còn app bật giao diện bằng lớp `.dark` trên `<html>`. Máy ở chế độ sáng thì nền đổi tối nhưng chữ giữ màu của giao diện sáng — tương phản còn **1,13–1,72**. Khai `@custom-variant dark` theo lớp |
| ✅ | Trang Cấu hình chưa bao giờ đổi sang giao diện sáng | `SettingsView` viết 84 lớp `light:*` mà Tailwind không có biến thể `light`: thẻ vẫn nền tối trong khi chữ lấy màu sáng, tương phản **1,04** |
| ✅ | Nâng tương phản chữ đạt WCAG AA ở cả hai giao diện | Sáng: chữ nhấn bậc -500/-600 lên -700, chữ mờ đậm hơn. Nút nền đặc chữ trắng: nền -600 xuống -700. Đo lại 13 phân hệ × 2 giao diện, không còn chỗ dưới ngưỡng |
| ✅ | Nút In lịch thu nợ in ra cả trang giao diện | `window.print()` in nguyên trang app; đổi sang dựng tài liệu A4 ngang riêng rồi in qua iframe ẩn (không bị chặn popup) |

⚠️ Lỗi giao diện tối nói trên có từ trước, nên **mọi lần kiểm thử giao diện tối trước 05/08/2026 đều xem một bản lỗi màu**. Các hạng mục ở cuối tài liệu này cần soi lại bằng mắt, nhất là mục nhãn trạng thái định giá hiển thị đúng màu.

## Chức năng

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Công cụ 1 — trả nợ trước hạn nhiều kỳ | Trước chỉ khai được một kỳ. Mỗi lần trả có phương án xử lý riêng (giảm gốc hàng tháng / rút ngắn kỳ hạn), nhiều lần cùng kỳ cộng dồn, số tiền vượt dư nợ tự cắt |
| ✅ | Công cụ 1 — lãi suất theo giai đoạn | Số tháng ưu đãi, LS cơ sở, biên độ, LS sau ưu đãi. Ưu tiên: LS sau ưu đãi khai tay > cơ sở + biên độ > LS ưu đãi + biên độ |
| ✅ | Công cụ 1 — ngày bắt đầu trả nợ | Khai ngày trả nợ kỳ 1; kỳ 1 tính lãi theo số ngày thực tế từ ngày giải ngân. Để trống thì giữ nguyên giải ngân + 1 tháng |
| ✅ | Sàn lãi suất theo hợp đồng | Cột `RateFloorAnnual` (migration 17). Biên độ âm gần như luôn kèm câu "không thấp hơn X%/năm"; không khai sàn thì vẫn chặn ở 0% |
| ✅ | Công cụ 1 — cột ngày bắt đầu và LS áp dụng từng kỳ | Có ở cả bảng trên màn hình, bản Excel và bản in |
| ✅ | Xoá tài sản bảo đảm | Chặn khi tài sản đang thế chấp cho khoản vay |
| ✅ | Luồng trình ngoại lệ cho tài sản hạn chế nhận | Cảnh báo + nhãn `⚠ NGOẠI LỆ` |
| ✅ | Chốt kiểm soát tổng mức cấp so với TSĐB | Xét theo cụm liên thông hợp đồng ↔ tài sản |
| ✅ | Tầng hạn mức dùng chung cho nhiều HĐTD | `CreditLimitCode` + `CreditLimitAmount` |
| ✅ | Quy tắc sản phẩm theo phương thức vay | Mục đích, kỳ hạn, ân hạn gốc |
| ✅ | Đồng bộ nhãn xếp loại TSĐB | Loại 1–4 và Hạn chế, bỏ tiền tố BĐS và phần trăm trong ngoặc, dùng chung ở Dashboard, bảng TSĐB, thẻ tín dụng |
| ✅ | Phân hệ Kiểm soát sau vay | Ba loại kiểm tra, lịch sinh tự động, ghi nhận kết quả, định giá lại ngay trong đợt kiểm tra hiện trạng tài sản. 29 test cho phần lõi |
| ✅ | Lọc đợt kiểm soát sau vay theo khách hàng | Dùng chung `selectedCustomerId` của `WorkContext`, mặc định tất cả. Vẫn nhắc số đợt quá hạn toàn danh mục khi đang lọc để không mất khả năng giám sát |
| ✅ | Lưu trữ hồ sơ khách hàng | Cột `Customers.ArchivedAt` (migration 32), bộ lọc ba nhóm ở tab Khách hàng. Cờ thủ công, KHÔNG suy từ dư nợ — tab Khách hàng cố ý không nạp KUNN/HĐTD |
| ✅ | Nút xoá KH — ba lỗi | Chữ đỏ trên nền đỏ nên vô hình; không kiểm tra ràng buộc trước khi xoá; thiếu `.select()` nên RLS chặn vẫn báo thành công |
| ✅ | Phân hệ Phương án kinh doanh & Hạn mức | Thay bộ bốn file Excel của banker. Hai chế độ: cấp hạn mức (xuất 3 phụ lục) và cho vay từng lần (xuất 2). Bảng `BusinessPlans` + `BusinessPlanDebts` (migration 31), 43 test lõi + 24 test phụ lục + 4 test dựng màn hình. Xem mục ngày 09/08/2026 |
| 🕐 | Màn hình quản trị người dùng | Bỏ qua theo quyết định 05/08/2026: chưa cần cấp tài khoản cho người dùng khác. Khi làm thì **bắt buộc qua Edge Function** — không đưa `service_role` key vào frontend |

## Kỹ thuật

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Tách logic tài chính ra `src/lib/` dạng hàm thuần | Công cụ 1 bóc thêm `buildLoanSchedule` (calcMath), `scheduleDocHtml`, `printHtmlDoc` — component chỉ còn JSX |
| ✅ | 681 test cho logic tính tiền | `src/lib/__tests__/`. Bất biến Σ(gốc) = số tiền vay được khoá ở mọi tổ hợp: ân hạn, gốc cuối kỳ, nhiều lần trả trước hạn, rút ngắn kỳ hạn, lùi ngày trả nợ |
| ✅ | Test cho thành phần giao diện | `src/components/__tests__/`, vitest + Testing Library, mỗi tệp tự khai `// @vitest-environment jsdom` để 681 test logic không phải dựng DOM. Ba test khói cho tab KUNN. **Đã kiểm chứng bằng cách tái tạo lỗi trắng trang 05/08/2026: 2/3 test đỏ đúng chỗ** |
| ✅ | Gom kiến thức vào `CONVENTIONS.md` và skill `tin-dung` | Mã nguồn không còn chú thích |
| ✅ | Viết lại `README.md` và `web_migration_plan.md` khớp thực tế | |
| ✅ | Tách nhỏ `LoanPortfolioView` | Từ 2.264 dòng còn 1.333 dòng (giảm 41%). Tách 3 khối JSX lớn sang `src/components/portfolio/`: `KunnForm.tsx` (form tạo/sửa KUNN, ~580 dòng), `ScheduleTab.tsx` (tab Lịch Thu Nợ, ~270 dòng), `PaymentModal.tsx` (modal ghi nhận thanh toán, ~165 dòng). Nhân tiện dọn trùng lặp: `fmtMoney`/`fmtRate` cục bộ trong view (tự ý bỏ qua thiết lập định dạng người dùng) thay bằng bản dùng chung ở `utils.ts`; `PRINCIPAL_REPAY_OPTIONS`/`INTEREST_REPAY_OPTIONS` chuyển sang `loanProductRules.ts`. Đã kiểm chứng cả 3 phần trên trình duyệt thật (mở form KUNN, xem lịch thu nợ, mở modal ghi nhận TT). Build + 686 test đều xanh |
| ⬜ | Mở rộng test giao diện sang các phân hệ còn lại | Hiện chỉ có tab KUNN |
| ⬜ | Đồng bộ realtime, bộ nhớ đệm client | Có trong kế hoạch ban đầu, chưa làm |
| ⬜ | Tên miền riêng | |


## Ngày 10/08/2026

### Bảng tính hạn mức — dựng lại theo đúng hình dạng bảng tính HM

Bản đầu là form xếp dọc từng khối, gắn khách hàng, gắn HĐTD và lưu vào cơ sở dữ liệu.
Banker phản hồi: nhập phải cuộn lên cuộn xuống, mất hẳn cái lợi của bảng tính; và đây chỉ
là **công cụ nhập liệu cho tờ trình**, không liên quan gì tới hồ sơ tín dụng.

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Giao diện dựng lại theo lưới hai cột | Năm khối đúng vị trí file gốc. Khối `b` và `c` trong **cùng một bảng** để cột `Đvt` thẳng hàng; `table-fixed` + `colgroup` |
| ✅ | Bỏ lưu trữ, bỏ chọn khách hàng và HĐTD | Migration 34 xoá `BusinessPlans`, `BusinessPlanDebts` và hai hàm kèm theo. Trạng thái nằm hết trong component |
| ✅ | Kỳ kế hoạch dự phóng theo hệ số | `planDriversOf`, mặc định 1,5. Gõ đè từng dòng qua `planOverrides`; gõ đè bằng 0 là con số thật. Lãi vay **không** nhân hệ số |
| ✅ | Giá vốn nhập bằng số tiền | Mọi cột `%/DT` và `Tăng/giảm` thành công thức. Không còn ô phần trăm nào ngoài lãi suất từng khoản vay và trần DTI |
| ✅ | Số trong bảng phân cách nhất quán | `MoneyCell` giữ chuỗi đang gõ trong state riêng, định dạng lại khi rời ô. Trước đó ô nhập không có dấu phân cách còn ô công thức thì có |

**Hai hệ quả đã chấp nhận:** đóng tab là mất số đã nhập, và khả năng bảo đảm của TSĐB thành
ô nhập tay vì không còn khách hàng để `totalUsableCapacity` đọc tài sản.

Ba phụ lục xuất ra **không đổi một dòng nào** — vẫn cùng bộ số, vẫn đúng nguyên bản template.

## Ngày 09/08/2026

### Tab Khách hàng — lưu trữ hồ sơ và ba lỗi ở nút xoá

Câu hỏi ban đầu: tách hồ sơ khách hàng đã tất toán ra khỏi danh sách. Chốt lại là
**không** kéo dư nợ vào tab Khách hàng — nó là danh bạ hồ sơ, thêm KUNN và HĐTD vào
là biến nó thành bản sao của tab Khoản vay. Vì vậy trạng thái này là **cờ thủ công**
trên chính hồ sơ, và cố ý gọi là "lưu trữ" chứ không phải "đã tất toán".

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Migration 32 — `Customers.ArchivedAt` | Một cột mang cả cờ lẫn ngày. `NULL` là đang làm việc. Đã chạy và kiểm chứng 09/08/2026: `timestamp with time zone`, nullable, 49 đang làm việc / 0 đã lưu trữ |
| ✅ | `customerStatus.ts` | Lọc và đếm ba nhóm, 17 test |
| ✅ | Bộ lọc ở tab Khách hàng | *Đang làm việc / Đã lưu trữ / Tất cả*, mặc định nhóm đầu, kèm số đếm; nút lưu trữ trên từng dòng |
| ✅ | Chốt chống trôi cờ ở `api.ts` | `saveContractAPI` và `saveCreditContractAPI` tự xoá `ArchivedAt` khi ghi hợp đồng cho khách đang lưu trữ |
| ✅ | Nút xoá KH — sửa ba lỗi | Xem bên dưới |
| ✅ | Ràng buộc số liệu trên hồ sơ | CCCD 12 số, CMND 9 số, điện thoại 10 số, áp cho cả trường KHLQ. Chặn hai tầng: ô nhập không gõ thừa được, lúc lưu gom đủ mọi lỗi một lượt. 23 test. Đo trước khi đặt luật: dữ liệu hiện có 14/14 CCCD và 11/11 điện thoại đều đúng chuẩn |
| ✅ | Điện thoại và số tài khoản nhận nhiều số | Một KHLQ có hai số là chuyện thật, không phải lỗi nhập. Tách theo `;` `,` `/` `\|` và xuống dòng, gom về một dạng ngăn cách `" / "`. Luật 10 số áp cho **từng số**. CCCD vẫn một giá trị |
| ✅ | Tờ chào lãi suất — bỏ dòng đối tượng lặp và khối phạm vi ở tờ cho vay | Tiêu đề đã ghi "dành cho KHCN"; phạm vi của tờ cho vay trùng phần điều kiện ở cuối |
| ✅ | Tờ chào lãi suất — tên file theo chuẩn | `LS NGAN HAN KHCN` · `LS TDH KHCN` · `LS HUY DONG`, sẵn nhánh `KHDN`. Tên đi vào `<title>` nên hộp thoại in gợi ý đúng tên PDF |
| ✅ | Tờ chào lãi suất — xuất ra hình ảnh | `htmlToPng.ts` dùng `<foreignObject>` + canvas, **không thêm thư viện ngoài**. Ảnh **luôn đúng khổ A4**, nội dung dài hơn trang thì thu nhỏ vừa trang chứ không cắt. Bản đầu bị cắt mất phần cuối vì bộ định dạng khai trên `body` mà trong `foreignObject` không có `body`; sửa bằng lớp `.rate-sheet-root` dùng chung cho cả đo lẫn dựng. 13 test |

**Chốt chống trôi áp cho cả sửa lẫn tạo mới**, không riêng hợp đồng mới như kế hoạch ban
đầu: sửa một KUNN của khách đang lưu trữ cũng là đang làm việc với khách đó, cờ lúc ấy
đã sai rồi.

**Ba lỗi ở nút xoá KH**, cả ba đều thật và độc lập nhau:

| # | Lỗi | Nguyên nhân |
| :--- | :--- | :--- |
| 1 | Nút hiện ra là khối đỏ đặc, không đọc được chữ | `bg-neg` ghép với `text-neg` — nền và chữ cùng một token màu. Icon dùng `currentColor` nên cũng vô hình. Dự án đã có `BTN_DANGER` làm đúng việc này, nút tự viết lại lớp màu bằng tay |
| 2 | Không kiểm tra ràng buộc nào trước khi xoá | `deleteCollateralAPI` ngay bên cạnh thì chặn khi tài sản đang thế chấp; nút xoá KH bị bỏ quên khỏi khuôn đó |
| 3 | Báo "Đã xoá thành công" khi thực ra không xoá được gì | Thiếu `.select()` — đúng cái bẫy RLS ghi ở `CONVENTIONS.md` §1: Supabase trả mảng rỗng mà không báo lỗi |

Kiểm chứng trên dữ liệu thật: CHÂU CÁT LƯỢNG (2 KUNN, 1 HĐTD, 1 TSĐB, 1 thẻ) bị chặn kèm
thông báo nêu đủ bốn số lượng; hồ sơ nháp không ràng buộc thì xoá được, 50 → 49. Chốt chống
trôi cờ cũng kiểm chứng có chủ đích: lưu trữ → lưu HĐTD → cờ tự bỏ (48/1 → 49/0).

**Hai việc phát hiện thêm, đã làm nốt cùng ngày:**

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Migration 33 — `LoanContracts.CreditContractId` đổi sang `ON DELETE RESTRICT` | Migration 14 đặt `ON DELETE SET NULL`, migration 23 đặt `SET NOT NULL` — nhánh `SET NULL` **không bao giờ chạy được**, chỉ để lại lỗi 23502 tiếng Anh. `RESTRICT` mới đúng ý định đã có ở migration 22 và ở `CreditContractView` |
| ✅ | `deleteContractAPI` thêm `.select()` | Cùng lỗi #3 của nút xoá KH, chỉ khác là ở nút xoá KUNN |
| ✅ | Dịch lỗi 23503 sang tiếng Việt | `deleteCreditContractAPI` nêu đúng số KUNN đang vướng; `deleteCustomerAPI` nhắc nạp lại danh sách |

Tên khoá ngoại do Postgres tự đặt lúc `ADD COLUMN ... REFERENCES` nên migration 33 **tra theo
quan hệ rồi mới xoá**, không viết cứng tên vào script.

### Phương án kinh doanh & Hạn mức — thay bộ bốn file Excel

Banker đang dùng `BẢNG TÍNH HM.xlsx` làm bảng làm việc và ba file `TINH HINH TAI CHINH`,
`KET QUA KINH DOANH`, `CapHanMucTinDung` làm phụ lục — nhưng ba phụ lục chỉ là **liên kết
ngoài** trỏ về bảng gốc, và đã trôi khỏi nhau: phụ lục KQKD giữ doanh thu 908 trđ/tháng
trong khi bảng gốc hiện chỉ còn 128. Trong hệ thống là một nguồn dữ liệu, ba bản in.

Đối tượng là **khách hàng cá nhân và hộ kinh doanh**, không phải doanh nghiệp.

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | `businessPlan.ts` — toàn bộ công thức | 43 test. Hai kỳ đi qua **cùng một hàm** `computePeriod` nên không thể lệch công thức như file gốc |
| ✅ | `xlsxWriter.ts` — sinh tệp .xlsx thật | ZIP dạng store + CRC32 tự tính, sáu thành phần OOXML kể cả `styles.xml`, chuỗi nội tuyến kèm `xml:space="preserve"`. Không thêm thư viện ngoài. 30 test, và kiểm chứng bằng cách cho **openpyxl** đọc lại tệp sinh ra. Thay cho HTML đội lốt Excel vốn luôn báo *"format and extension don't match"* |
| ✅ | Định dạng phụ lục khớp bản gốc | Bản đầu xuất ra lưới trơn không khung, không dấu phân cách nghìn — khác hẳn tờ banker quen dùng. Nay có Times New Roman 11, kẻ khung toàn bộ, tiêu đề tô nền `DCE6F1` in đậm, dòng tổng đậm, dòng con nghiêng, `#,##0` · `0%` · `#,##0.0`, độ rộng riêng từng cột, cột "Cơ sở xác định" xuống dòng |
| ✅ | `businessPlanExport.ts` — ba phụ lục | 27 test trên **mô hình dòng**, không trên chuỗi HTML. File xuất phải **trùng khít bản gốc** vì còn nạp ngược lên hệ thống: nguyên văn nhãn từng dòng (kể cả `b6` ghi "Chi phí khác" nhưng nạp khấu hao), nguyên văn tiêu đề cột (kể cả dấu cách cuối ở `"Tăng/giảm "`), không chèn dòng nào phía trên bảng. Đã phạm một lần và sửa lại trong ngày; test khoá toàn bộ danh sách nhãn |
| ✅ | Migration 31 — `BusinessPlans` + `BusinessPlanDebts` | Chỉ lưu ô đầu vào. Đã chạy 09/08/2026, kiểm chứng RLS: mỗi bảng đúng một policy `ALL` |
| ✅ | Tab **Phương án kinh doanh** | Hai chế độ, đơn vị nhập trđ/đồng đổi được, 4 test dựng màn hình |
| ✅ | Rút `totalUsableCapacity` về `collateralMath.ts` | Đã có 4 chỗ cùng `reduce(usableCapacity)`; gom trước khi thêm chỗ thứ năm |

**Bốn quyết định đã chốt:** vay từng lần lấy `min` của ba giới hạn · lưu vào CSDL gắn khách
hàng · sửa hết lỗi công thức của file Excel · doanh thu là đầu vào, vòng quay là kết quả.

**Bảy lỗi của file Excel gốc, đã sửa trong hệ thống:**

| # | Lỗi trong file | Cách xử lý |
| :--- | :--- | :--- |
| 1 | `D27 = D18+D23+F24` cộng **Vốn góp** (một khoản mục nguồn vốn) vào Tổng tài sản. Không lộ ra vì vốn chủ sở hữu là số dư nên hai vế vẫn cân | Bỏ hẳn Vốn góp khỏi đầu vào. Phụ lục vẫn in dòng đó, giá trị 0 |
| 2 | Lãi vay có **hai con số không khớp**: `D6` = 48 trđ tính từ bảng dư nợ, còn dòng lãi vay trong bảng chi phí để 0 nhập tay | Bảng `BusinessPlanDebts` là nguồn duy nhất |
| 3 | LNTT hai kỳ **hai công thức khác nhau**: `E7 = E3-E4-E5-E6-J19-J21` bỏ sót chi phí mặt bằng và chi phí khác | Hai kỳ dùng chung `computePeriod`, có test khoá |
| 4 | `D3 = D10*3,4` rồi `D13 = D3/D10 = 3,4` — vòng quay là giả định gõ tay chạy ngược, không phải kết quả | Doanh thu là đầu vào, vòng quay tính ra |
| 5 | Lãi suất 8%/năm nhúng cứng trong `*8/100/12` | Lãi suất theo từng khoản vay |
| 6 | `ROUNDUP(.../12,0)` làm tròn lên tới hàng triệu ở từng dòng rồi lấy số đã tròn đi tính tỷ trọng và nhân ngược ×12 | Tính trên số gốc, chỉ làm tròn khi hiển thị |
| 7 | `SUM(C4:C8)` của phụ lục KQKD cộng thiếu dòng chi phí cuối | Tổng gộp đủ bảy dòng, có test |

**Một tính chất phát hiện khi viết test:** `Tổng nhu cầu vốn bằng tiền` **không phụ thuộc lãi
vay**. Rút gọn `c1 = DTT − KH − LV − LNTT` ra đúng `giá vốn + nhân công + mặt bằng + điện
nước + chi phí khác` — tức các khoản chi bằng tiền, đúng như tên gọi. Hệ quả: lỗi #2 làm sai
lợi nhuận trình lên nhưng **không** làm sai hạn mức. Đã khoá bằng test để không ai "sửa" `c1`
thành phụ thuộc lãi vay.

**Thêm cho khách hàng cá nhân, bảng Excel gốc không có:** khối thu chi hộ gia đình (thu nhập
ngoài kinh doanh, chi phí sinh hoạt, nghĩa vụ nợ đang trả, trần DTI). Nguồn trả nợ =
`(LNST + khấu hao)/12 + thu nhập khác − chi phí sinh hoạt`, đưa qua `dtiMaxMonthlyPayment` rồi
quy ra hạn mức bằng `pvAnnuityFactor` — cả hai hàm đã có sẵn, không viết bản thứ hai.

`MaxDtiPercent = 0` nghĩa là **chưa khai**, và khi đó khả năng vay theo dòng tiền trả về 0 chứ
không suy đoán. Trần mặc định 60% ở hằng số `DEFAULT_MAX_DTI_PERCENT`, form điền sẵn khi tạo mới.

**Không có cột khả năng bảo đảm của TSĐB.** Con số đó tính bằng `totalUsableCapacity` từ chính
tài sản của khách và tụt về 0 khi định giá hết hiệu lực; lưu lại là đóng băng một bản sao —
đúng kiểu sai lầm mà ba phụ lục Excel đang mắc.

Đã kiểm chứng trên trình duyệt thật 09/08/2026: tạo phương án cho LÊ NGỌC QUẾ HÂN, đối chiếu
tay toàn bộ số (tổng chi phí 81 trđ/tháng, LNTT 19 trđ/tháng, nhu cầu vốn bằng tiền 852 trđ,
vòng quay 2,7 vòng, nhu cầu một vòng 319,5 trđ), lưu xuống Supabase rồi nạp lại đúng số, đổi
sang chế độ vay từng lần thấy khối "Số tiền cho vay" và nút xuất đổi thành 2 phụ lục. **Bản
thử đã xoá khỏi cơ sở dữ liệu.**

## Ngày 07/08/2026

### Thẻ tín dụng — ba trường hợp mở thẻ

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Thẻ vào chốt kiểm soát TSĐB | Trước đó `checkCollateralCapacity` chỉ nhận `LoanContract[]`; thẻ tiêu tốn 0đ khả năng bảo đảm nên chốt báo xanh trong khi cụm đã vượt trần |
| ✅ | Trần sản phẩm 90% cho thẻ trên sổ tiết kiệm | `CARD_STK_LTV_PERCENT`, cố ý đè bảng LTV cho vay |
| ✅ | Chặn lưu khi vượt trần, mở bằng ô xác nhận ngoại lệ | Cột riêng `IsLtvException` / `LtvExceptionReason`, migration 27 |
| ✅ | Gỡ bản LTV thứ tư trong `CreditCardView` | Nó nhận cả định giá hết hiệu lực, khác `usableCapacity` |
| ✅ | Sửa `saveCreditCardAPI` không gỡ được liên kết TSBĐ | `if (dbPayload.CollateralId)` là kiểm falsy nên gán `null` không lưu |
| ✅ | Sửa cấp thẻ mới luôn hỏng | Cột `Limit` `NOT NULL` không bao giờ được ghi — lỗi có sẵn, cấp thẻ từ web chưa từng chạy |

### Tàn dư ứng dụng WPF

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Gộp `CreditCards.Limit` về `CreditLimit`, xoá cột thừa | Migration 28, backfill trước xoá sau |
| ✅ | Chuyển `[CollateralId:` từ `Note` về cột thật | Migration 28 |
| ✅ | Cho `[PENALTY_RATE:` một cột thật | Migration 29 → `PrincipalPenaltyMultiplier`. Dữ liệu chỉ có 150 và 0 nên thực chất là công tắc miễn phạt gốc |
| ⚠️ | Xác nhận phạm vi miễn phạt | Đang hiểu là **chỉ miễn phạt nợ gốc**; lãi phạt chậm trả lãi 10%/năm vẫn tính. Có test khoá. Nếu nghiệp vụ hiểu khác thì báo |
| ⬜ | Gỡ ba nhánh đọc `[RATE_HISTORY:` / `[COLLATERAL_IDS:` / `[PENALTY_SURCHARGE:` trong `utils.ts` | Mã chết sau migration 24, nhưng đụng lịch sử lãi suất nên để đợt riêng có đối chiếu |

### Sự cố: nút Đồng bộ kỳ cuối làm hỏng dữ liệu

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Gỡ hẳn nút và mục Bảo trì dữ liệu | Nó lấy `ContractEndDate` (hạn HĐTD) làm ngày đáo hạn KUNN |
| ✅ | Gỡ quy tắc kéo kỳ cuối về ngày đáo hạn | Quy tắc sai, do đọc ngược bằng chứng — xem `CONVENTIONS.md` §2 |
| ✅ | Gỡ cùng fallback đó khỏi đường lưu bình thường | Hai chỗ trong `LoanPortfolioView`, hỏng cả khi không bấm nút |
| ⬜ | Rà dữ liệu đã bị ghi đè | Ngày tháng: tối đa 1 khoản (chỉ 1/100 KUNN thiếu `KunnDueDate`). Số lãi khai tay ở kỳ chưa thu: **không dò được bằng SQL**, cần bản trước đó để đối chiếu |

### Giao diện

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Bảng đổi hình dạng theo thiết bị | `AdaptiveTable`, áp cho 6 màn. 375px: 0 bảng còn tràn |
| ✅ | Gộp ba kiểu thông báo về `Toast` | Thêm nút đóng, `aria-live`, không tràn mép trên màn hẹp |
| ✅ | Bỏ nút "Lưu cài đặt cá nhân" | Nó không lưu gì — thiết lập tự ghi khi chạm vào điều khiển |
| ✅ | Gộp bốn đường in về `printHtmlDoc` | Popup bị chặn thì im lặng, `setTimeout(300)` là cuộc đua, cửa sổ không dọn |
| ✅ | Gộp ba bản tải file về `downloadTextFile` | |
| ✅ | Sửa chọn font không đổi được | `App.tsx` bọc cây con trong `font-sans` của Tailwind |
| ✅ | Sửa số tiền trên phiếu nghĩa vụ bị ép về 12px | `.font-mono` thắng `text-[calc(...)]` theo thứ tự nguồn |
| ✅ | Dùng từ nghiệp vụ thay khẩu ngữ ở màn thẻ | "đỡ được" → "khả năng bảo đảm" |
| ⬜ | Thử in tờ chào lãi suất và biểu mẫu hợp đồng | Hai đường vừa đổi sang iframe, chưa ai in thử |
| ⬜ | Cuộn 300 thẻ ở Tra cứu MĐSDV và Kiểm soát sau vay trên điện thoại thật | Có thể cần phân trang |

### Lịch thu nợ

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Rút công thức nghĩa vụ kỳ về `scheduleView.ts` | Ba bản trong `.tsx` đã trôi dạt: kỳ miễn phạt cho dòng và tổng cột lệch nhau |
| ✅ | Bố cục hai cột từ `xl`, phiếu chi tiết bám theo | |

---

## Quyết định nghiệp vụ đã chốt 05/08/2026

| Câu hỏi | Quyết định |
| :--- | :--- |
| Ngày thu lãi hàng tháng của hợp đồng hạn mức | **Theo lựa chọn của từng khách hàng, khai trên từng KUNN.** Có khách chọn ngày 1, 15, 28, 30 — không gom chung được, và cũng không phải giải ngân + 1 tháng: LÊ NGỌC QUẾ HÂN giải ngân 05/05/2026 nhưng trả kỳ 1 ngày 15/05/2026. `RepaymentStartDate` là dữ liệu gốc phải khai theo GNN giấy. Đã ghi vào `CONVENTIONS.md` §2 |
| Xử lý ≈21,7 triệu đã thu vượt của NGÔ NHỊ ĐẠT | **Chưa xử lý, chỉ báo cáo.** Không hoàn, không cấn trừ, không ghi điều chỉnh. Báo cáo ở `supabase/reports/01_thu_vuot_ky_dau.sql` |

## ⚠️ Đang dở — đọc trước khi làm tiếp phần lịch trả nợ

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ⚠️ | **Độ tin cậy của cờ `IsPaid` trong `RepaymentSchedules` đang bị nghi ngờ** | Phát hiện 05/08/2026: `PaymentDate = 2026-07-30` đồng loạt trên nhiều kỳ khác nhau, `ActualPaidInterest = 0` ở toàn bộ 898/898 kỳ `IsPaid=true` — do một **tiến trình cập nhật tự động chạy ngày 30/07/2026** (chưa rõ là script nào). Anh xác nhận: không chắc tiến trình đó có đánh dấu `IsPaid=true` đúng cho từng kỳ hay không, chỉ chắc chắn `PaymentDate` sai. Hệ quả nếu `IsPaid` sai: dư nợ hiện tại, phân nhóm nợ theo quá hạn, và chính con số 21,7 triệu "đã chốt" đều cần xem lại — tất cả đều tính dựa trên kỳ nào `IsPaid=true`. **Cần xác định tiến trình 30/07/2026 là gì trước khi tin bất kỳ con số "đã thu" nào của hệ thống** |
| 🔄 | Chạy báo cáo thu vượt trên production | `supabase/reports/01_thu_vuot_ky_dau.sql`, nay 6 phần, chỉ đọc. Phần 5 liệt kê KUNN đang mượn mốc trả nợ của hợp đồng. Phần 6 đối chiếu `KunnTenor` với khoảng giải ngân→đáo hạn (chỉ bắt lệch giữa hai cột, không bắt được trường hợp cả hai cùng sai như ĐOÀN THỊ TUYỂN — vẫn cần đối chiếu tay GNN giấy cho nhóm hạn mức). Sửa 05/08/2026: PHẦN 2–3 ban đầu trả 0 dòng vì `coalesce(ActualPaidInterest, InterestAmount)` — `ActualPaidInterest` chưa từng được điền (0/898 kỳ đã thu có giá trị dương), đã sửa dùng thẳng `InterestAmount`. Cùng lỗi `??` với số 0 cũng có ở `loanMath.ts:389` (tính `TotalAmount`), đã sửa — hiện chưa gây hại vì UI không đọc trường đó. **Kiểm chứng 05/08/2026: PHẦN 3 cho tổng `thu_thừa` nhóm NGÔ NHỊ ĐẠT = 21.698.628đ ≈ 21,7 triệu — khớp đúng con số đã chốt.** PHẦN 3 còn phát hiện thêm TRẦN THỊ KIM CHI thu thừa 197.945đ (cùng nguyên nhân: kỳ 1 trùng đúng ngày giải ngân), **chưa nằm trong quyết định đã chốt — đang chờ anh quyết định** áp dụng chung logic "chưa xử lý, chỉ báo cáo" hay cần quyết định riêng |
| ✅ | Khai lại `RepaymentStartDate` theo GNN giấy cho nhóm hạn mức | Migration 21 đã chạy 05/08/2026 (`21_repayment_start_date_han_muc.sql`). 10 dòng đã sửa theo GNN giấy: NGÔ NHỊ ĐẠT ×5 và PHẠM NGỌC CẢNH → 15/05/2026; NGUYỄN VƯƠNG VŨ và PHAN THÚC BẢO → 15/07/2026; TRẦN MINH HIẾU → 15/07/2025; TRẦN THỊ KIM CHI → 15/03/2025. Kiểm chứng lại: PHAN THÚC BẢO và TRẦN MINH HIẾU vẫn hiện trong chẩn đoán "trùng ngày trong tháng với mốc HĐTD" — đây là trùng ngẫu nhiên đã xác nhận đúng GNN giấy, không phải lỗi |
| ⬜ | Đối chiếu `KunnTenor` nhóm hạn mức với GNN giấy | Gần cả nhóm khai 5 tháng; GNN của ĐOÀN THỊ TUYỂN ghi 06 tháng, đáo hạn 23/10/2026 thay vì 23/09/2026 đang lưu. Ngày đáo hạn là dữ liệu gốc, sai nó thì sinh lại lịch vẫn sai |
| ⬜ | Sinh lại lịch trả nợ — mở rộng ra toàn bộ danh sách phần 4 của report 01 | Chỉ làm SAU khi `RepaymentStartDate` và `KunnTenor` đã đúng GNN giấy. Phần 4 của `01_thu_vuot_ky_dau.sql` đã liệt kê đầy đủ ~60 dòng lệch đáo hạn trên toàn danh mục — không giới hạn ở nhóm hạn mức. Quyết định "chưa xử lý phần thu vượt" nghĩa là script **không được ghi đè các kỳ đã thanh toán** — chỉ sinh lại kỳ chưa trả |
| ✅ | Số hiệu KUNN trùng nhau | Mã nguồn đã chống trùng (`assertKunnNumberFree` + `findKunnNumberClash`, 7 test). Migration 20 đã chạy 05/08/2026: bước 1–2 rà soát ra 0 dòng (đã sạch), bước 4 tạo unique index `LoanContracts_ContractNumber_key`, bước 5 xác nhận index tồn tại |
| ✅ | ~~31/98 KUNN có kỳ cuối không rơi đúng ngày đáo hạn~~ — **KHÔNG PHẢI LỖI** | Đóng 07/08/2026. Banker xác nhận: ngày trong tháng giữ nguyên từ kỳ đầu tới kỳ cuối, ngày đáo hạn KUNN không được phép đổi ngày của kỳ nào. Ba mươi mốt khoản cùng theo một khuôn chính là **bằng chứng khuôn ấy là quy tắc**, không phải bằng chứng 31 khoản đều hỏng — tôi đã đọc ngược. Quy tắc tự đặt ra hôm 06/08 cùng nút "Đồng bộ kỳ cuối" đã gỡ hẳn ở `786d0e9`. Nút đó lấy `ContractEndDate` (hạn HĐTD) làm ngày đáo hạn KUNN và **đã làm hỏng dữ liệu thật**. Xem `CONVENTIONS.md` §2 |
| ⚠️ | `LoanAmount = 0` trên KUNN, hệ thống mượn mức cấp HĐTD làm số tiền vay | Phát hiện 05/08/2026 khi truy nguyên một báo động giả. `generateSchedule`, `recalculateSchedules`, `computeOutstandingBalance` đều dùng `LoanAmount || ContractAmount` nên "trông vẫn đúng", nhưng `disbursedOf` trong `creditLimit.ts` dùng `LoanAmount ?? CurrentBalance ?? 0` — với `LoanAmount = 0` nó lấy **0**, khiến cho vay từng lần khai thiếu số đã giải ngân và **hạn mức khả dụng ra cao hơn thực tế**. Đã biết chắc có ĐOÀN NGỌC LÝ `2002/HĐTD/9738792/GNN-01` (240 kỳ, 830 triệu lấy từ `ContractAmount`). **Cần đếm phạm vi rồi khai lại `LoanAmount` theo GNN giấy** |
| ✅ | Đổi `HdtdDueDate` từ `timestamptz` sang `date` | Migration 19 đã chạy 05/08/2026. Có backup `_backup_HdtdDueDate_20260805`, kiểm chứng không lệch giá trị giữa bản cũ và bản mới |

## Cần kiểm thử trên giao diện

| | Việc |
| :--- | :--- |
| ⬜ | Phân hệ Thẻ tín dụng sau khi sửa kiểu `IssuanceType` — tạo thẻ, chọn diện mở thẻ, lưu, mở lại xem có giữ đúng |
| ⬜ | Luồng nhập Mã HMTD dùng chung — nhập mã, kiểm tra ô hạn mức được duyệt hiện ra và lưu đúng |
| ⬜ | Lịch thu nợ của hợp đồng hạn mức đã chọn "Trả đều hàng tháng" — gốc phải chia đều thay vì dồn kỳ cuối |
| ⬜ | Ràng buộc sản phẩm — chọn HMTD thì mục đích bị khoá và ô ân hạn ẩn; chọn cho vay từng lần thì ân hạn là danh sách 6/12/15/18/24/36 |
| ⬜ | Cảnh báo TSĐB ở khách hàng LÊ VĂN CAO phải biến mất (dư nợ 784.987.000 < khả năng bảo đảm 1.089.600.000) |
| ⬜ | Màn hình Kiểm soát sau vay — ghi nhận một đợt, kiểm tra trạng thái chuyển sang "đã thực hiện" và không sinh lại |
| ⬜ | Định giá lại trong đợt kiểm tra hiện trạng tài sản — giá trị mới phải đồng bộ về bảng TSĐB qua trigger |
| ⬜ | Nhãn trạng thái định giá trên bảng TSĐB — HẾT HIỆU LỰC / SẮP HẾT HẠN / CHƯA ĐỊNH GIÁ hiển thị đúng màu |
| ✅ | Công cụ 1 — trả trước hạn nhiều kỳ, cột NGÀY BẮT ĐẦU, LS ÁP DỤNG đổi sau ưu đãi. Đã kiểm chứng 05/08/2026 trên dữ liệu 960tr/120 tháng: ưu đãi 9,5% kỳ 1–12 → 13,4% từ kỳ 13, hai lần trả trước hạn ghi nhận đúng, rút ngắn còn 23 kỳ, tổng gốc khớp số cho vay |
| ⬜ | Công cụ 1 — nút Xuất Excel (.xls): mở bằng Excel xem bảng thông số và bảng lịch có đủ cột, số không bị hiểu thành text |
| ⬜ | Soi lại bằng mắt cả hai giao diện các màn hình vừa sửa màu: Cấu hình, Mua bán vốn nội bộ, Chào lãi suất, Soạn biểu mẫu HĐ, thanh tìm kiếm KUNN |
| ⬜ | Ô Sàn lãi suất trong form sửa KUNN — mở một khoản, nhập sàn, lưu, mở lại xem có giữ đúng (cần migration 17 đã chạy) |
| ⬜ | Tính lại lãi các kỳ chưa trả của những khoản vừa đổi gốc: mở từng khoản trong app rồi lưu một lần. Chỉ cần khi định đối chiếu tổng lãi phải thu với core |
| ⬜ | Khai hai khoản của KH Nguyễn Thị Bé Hai theo GNN (8,0% · 12 tháng · biên độ 2,7% · ngày bắt đầu trả nợ 15/01/2024) rồi đối chiếu kỳ 1 và mốc tháng 13 |
