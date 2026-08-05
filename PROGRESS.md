# Tiến độ công việc

Cập nhật: 05/08/2026 (sau khi chốt hai quyết định nghiệp vụ)

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
| 🔄 | **Bịt các đường vẫn đang GHI dữ liệu nghiệp vụ vào `Note`** | Migration 06 dọn dữ liệu cũ nhưng **không bịt đường ghi**, nên hệ thống tự sinh lại. Rà soát 05/08/2026 tìm ba đường: `LoanPortfolioView` nhét `HĐTD: <số>` mỗi lần lưu KUNN (100 KUNN đang có, **lệch số thật ở 2 dòng của LÊ VĂN CAO** ghi `HĐTD-01`/`HĐTD-02` — vì `getMasterHdtdNumber` đọc `Note` trước `ContractNumber` và `computeLimitGroups` lấy hàm đó làm khoá nhóm, `findLimitGroupFor` tra bằng số thật không khớp nên chốt hạn mức hai KUNN đó rơi về mặc định); `generateSchedule` ghi `[TRẢ TRƯỚC HẠN: +Xđ]` vào `RepaymentSchedules.Note` mà bỏ trống `PrepaidPrincipalAmount`, khiến tiền trả trước hạn vô hình với `paidPrincipalOf`; `CreditCards.Note` còn `[CollateralId:N]` nhưng chỉ còn đọc. **Mã nguồn đã bịt cả ba**: gỡ nhánh đọc `Note` khỏi `getMasterHdtdNumber`, ghi tiền trả trước hạn vào cột, xoá `serializeContractRateHistory` (hàm sinh khối `[RATE_HISTORY:` không còn ai gọi), gom việc gỡ chuỗi về `stripLegacyNoteBlobs`. **Còn phải chạy** báo cáo `reports/02` và migration 24 để dọn dữ liệu. 11 test |
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
| ⬜ | Xoá bảng `_backup_LoanContracts_Note_20260803` | Sau vài ngày chạy ổn |
| ⬜ | Xoá bảng `_backup_SchedulePrincipal_20260805` và `_backup_KunnNumbers_20260805` | Sau vài ngày chạy ổn |
| ⬜ | Xoá bảng `_backup_HdtdDueDate_20260805` | Sau vài ngày chạy ổn |
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
| ⚠️ | **77/97 KUNN có kỳ cuối không rơi đúng ngày đáo hạn — mai đối chiếu core bank** | Đo lại 05/08/2026 sau khi anh sinh lại toàn bộ lịch: `max(DueDate) <> KunnDueDate` ở 77/97 khoản, cao hơn con số ~60 đo được trước đó. **Chưa kết luận là 77 lỗi**: có ba nguyên nhân khác nhau cùng cho ra triệu chứng này — (1) `KunnTenor` và `KunnDueDate` khai không khớp nhau, loại mà báo cáo PHẦN 6 không bắt được khi cả hai cột cùng sai; (2) lệch dưới 3 ngày có thể đúng, vì `generateSchedule` cố ý không đưa kỳ cuối về đáo hạn khi làm vậy sinh ra một kỳ chỉ 1 ngày; (3) lịch bị cắt ngắn vì dư nợ về 0 trước hạn do làm tròn gốc — không phải lỗi tiền vì `Σgốc` đã đúng. **Quyết định 05/08/2026: để mai so lại với core bank rồi mới xử lý.** Core bank là chuẩn đối chiếu, không suy từ mã nguồn |
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
