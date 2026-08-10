# Tiến độ công việc

Cập nhật: 10/08/2026

Trạng thái: ✅ xong · 🔄 đang làm · ⬜ chưa làm · 🕐 hoãn có chủ đích · ⚠️ chờ quyết định nghiệp vụ

**Cách đọc tài liệu này.** Bảng chỉ ghi **một dòng** mỗi việc. Việc nào cần kể dài
thì có mục riêng ở phần [Ghi chú chi tiết](#ghi-chú-chi-tiết), đánh số §1, §2…
và dòng bảng trỏ tới. Phần **còn mở** đặt lên đầu vì đó là thứ cần biết trước.

---

# I. Việc còn mở

## Chặn đường — làm trước những việc khác

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ⬜ | Khai lại `LoanAmount` cho `2002/HĐTD/9738792/GNN-01` | Đang bằng 0, hạn mức khả dụng ra cao hơn thực tế. Xem §2 |
| ⬜ | Đối chiếu `KunnTenor` nhóm hạn mức với GNN giấy | ĐOÀN THỊ TUYỂN ghi 06 tháng, hệ thống lưu đáo hạn 23/09 thay vì 23/10/2026 |
| ⬜ | Sinh lại lịch trả nợ cho ~60 dòng lệch đáo hạn | Chỉ làm SAU khi hai việc trên xong. Xem §3 |

## Chờ quyết định nghiệp vụ

| | Việc | Câu hỏi |
| :--- | :--- | :--- |
| ⚠️ | Thu thừa 197.945đ của TRẦN THỊ KIM CHI | Áp chung quyết định "chưa xử lý, chỉ báo cáo" như nhóm NGÔ NHỊ ĐẠT, hay xử riêng |
| ⚠️ | Phạm vi miễn phạt của `PrincipalPenaltyMultiplier = 0` | Đang hiểu là **chỉ miễn phạt nợ gốc**; lãi phạt chậm trả lãi 10%/năm vẫn tính. Có test khoá. Nghiệp vụ hiểu khác thì báo |
| ⚠️ | Hướng làm tròn gốc mỗi kỳ | `roundPrincipalCore` luôn làm tròn **lên** (`Math.ceil`). Chưa đo được core bank có làm tròn xuống ở đâu không. Xem §4 |

## Đang làm

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| 🔄 | Chạy `reports/01` phần 5–6 trên production | Phần 5 liệt kê KUNN mượn mốc trả nợ của hợp đồng; phần 6 đối chiếu `KunnTenor` với khoảng giải ngân→đáo hạn |
| 🔄 | Chạy `reports/04` tìm KUNN khai cả hai chế độ lãi suất | Rồi quyết định từng dòng |

## Chưa làm

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ⬜ | Hai trần theo doanh nghiệp của mã thẻ `B3` và `B12` | Hiện chỉ là chữ trong luật, chưa phải chốt chặn. Xem §28 |
| ⚠️ | Xoá hai cột bản sao `LoanContracts.ContractStartDate` / `ContractEndDate` | **Không vô hại như ghi trước đây** — form KUNN vẫn ghi hai cột, và 7 chỗ còn đọc chúng làm đường dự phòng khi KUNN không trỏ được về HĐTD cha. Chạy `reports/10` §3 trước. Xem §29 |
| ⬜ | Gỡ 7 chỗ đọc bản sao ngày HĐTD + 2 ô trên form KUNN | Điều kiện để xoá được hai cột. Xem §29 |
| ⬜ | Đọc `.xlsx` / `.docx` / `.pptx` | Cần `DecompressionStream('deflate-raw')`. Chưa rõ cần nạp cái gì vào đâu. Xem §30 |
| ⬜ | Câu 640 bị bóc lỗi từ PDF | Cả bốn lựa chọn dồn vào một ô `"25 B.50 C.75 D.80"` nên không trả lời được. Cần mở nguồn ra tách lại |
| ⬜ | `xlsxWriter` học gộp ô và màu nền theo ô | Điều kiện để chuyển Công cụ 1 và Công cụ 4 khỏi HTML đội lốt `.xls`. Xem §30 |
| ⬜ | Tìm chỗ dùng cho `pptxWriter` | Thư viện đã xong, chưa màn nào gọi |
| ⚠️ | Ba cụm câu hỏi trùng mà đáp án khác nhau | Ít nhất một bản mỗi cụm đang dạy sai. Cần mở văn bản gốc đối chiếu. Xem §31 |
| ⬜ | Đo `ContractCollaterals` rồi quyết định xoá | Bảng thứ 20 trong database, web app không gọi `.from()` tới nó. Có thể đang dùng qua khoá ngoại |
| ⬜ | Rà dữ liệu bị nút "Đồng bộ kỳ cuối" ghi đè | Ngày tháng: tối đa 1 khoản. Số lãi khai tay ở kỳ chưa thu **không dò được bằng SQL**, cần bản trước đó để đối chiếu |
| ⬜ | Mở rộng test giao diện sang các phân hệ còn lại | Hiện có tab KUNN và khối phương thức trả nợ |
| ⬜ | Đồng bộ realtime, bộ nhớ đệm client | Có trong kế hoạch ban đầu |
| ⬜ | Tên miền riêng | |

## Hoãn có chủ đích — có mốc rõ

| | Việc | Mốc cần làm |
| :--- | :--- | :--- |
| 🕐 | Bật chính sách mật khẩu Supabase | **Trước khi cấp tài khoản đầu tiên.** Tối thiểu 12 ký tự + Leaked Password Protection |
| 🕐 | Xoá tài khoản thử nghiệm `abc@gmail.com` | **Khi kết thúc đợt kiểm thử.** Không phụ thuộc việc cấp tài khoản — đây là tài khoản đang hoạt động, mật khẩu yếu, xem được hồ sơ khách thật |
| 🕐 | Màn hình quản trị người dùng | Khi cần cấp tài khoản. Bắt buộc qua Edge Function, không đưa `service_role` key vào frontend |

## Cần kiểm thử trên giao diện

⚠️ Lỗi giao diện tối được sửa ngày 05/08/2026, nên **mọi lần kiểm thử giao diện tối
trước mốc đó đều xem một bản lỗi màu**. Các mục dưới cần soi lại bằng mắt.

| | Việc |
| :--- | :--- |
| ⬜ | Ô Gốc mỗi kỳ theo GNN — nhập, lưu, mở lại xem có giữ đúng (cần migration 36 đã chạy) |
| ⬜ | Hợp đồng thẻ — tạo cho KH và vợ/chồng với hạn mức khác nhau, xem tổng cộng đúng |
| ⬜ | Hợp đồng thẻ — thẻ ghi nợ ATM: ô hạn mức và ô mã chính sách phải mờ và khoá |
| ⬜ | Hợp đồng thẻ — chọn mã `A2` rồi để trống TSBĐ: phải bị chặn ở cả form và trigger CSDL |
| ⬜ | Hợp đồng thẻ — thêm thẻ phụ thứ ba bằng đưỏng SQL: trigger phải chặn |
| ⬜ | Hợp đồng thẻ — xóa TSBĐ đang gắn cho thẻ: phải bị chặn bởi `ON DELETE RESTRICT` |
| ⬜ | Tab Tra cứu chính sách thẻ — soi cả hai giao diện sáng/tối, và ở khục 375px |
| ⬜ | Phân hệ Thẻ tín dụng — tạo thẻ, chọn diện mở thẻ, lưu, mở lại |
| ⬜ | Luồng nhập Mã HMTD dùng chung — ô hạn mức được duyệt hiện ra và lưu đúng |
| ⬜ | Lịch thu nợ của hợp đồng hạn mức chọn "Trả đều hàng tháng" — gốc phải chia đều |
| ⬜ | Ràng buộc sản phẩm — HMTD thì mục đích bị khoá và ân hạn ẩn; vay từng lần thì ân hạn là 6/12/15/18/24/36 |
| ⬜ | Cảnh báo TSĐB ở LÊ VĂN CAO phải biến mất (dư nợ 784.987.000 < khả năng bảo đảm 1.089.600.000) |
| ⬜ | Kiểm soát sau vay — ghi nhận một đợt, trạng thái chuyển "đã thực hiện" và không sinh lại |
| ⬜ | Định giá lại trong đợt kiểm tra hiện trạng — giá trị mới đồng bộ về bảng TSĐB qua trigger |
| ⬜ | Nhãn trạng thái định giá — HẾT HIỆU LỰC / SẮP HẾT HẠN / CHƯA ĐỊNH GIÁ đúng màu |
| ⬜ | Công cụ 1 — nút Xuất Excel: mở bằng Excel, đủ cột, số không bị hiểu thành text |
| ⬜ | Soi hai giao diện các màn vừa sửa màu: Cấu hình, Mua bán vốn nội bộ, Chào lãi suất, Soạn biểu mẫu HĐ, thanh tìm kiếm KUNN |
| ⬜ | Ô Sàn lãi suất trong form sửa KUNN — nhập, lưu, mở lại |
| ⬜ | In tờ chào lãi suất và biểu mẫu hợp đồng | 
| ⬜ | Cuộn 300 thẻ ở Tra cứu MĐSDV và Kiểm soát sau vay trên điện thoại thật |

---

# II. Đã xong

## Bảo mật

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Gỡ credential nhúng cứng khỏi mã nguồn | Mật khẩu superuser Postgres và anon key |
| ✅ | Loại `.env` khỏi git, chặn tái phạm | |
| ✅ | Chuyển repository sang riêng tư | |
| ✅ | Xoay vòng mật khẩu Postgres và anon key | |
| ✅ | Đăng nhập bắt buộc, tắt tự đăng ký | |
| ✅ | Bật RLS trên toàn bộ bảng | Kiểm chứng: banker chỉ thấy KH của mình |
| ✅ | Xoá thư mục `api/` code chết | Từng làm lộ mật khẩu database |

## Tàn dư ứng dụng WPF

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Gộp `CreditCards.Limit` về `CreditLimit` | Migration 28, backfill trước xoá sau |
| ✅ | Chuyển `[CollateralId:` từ `Note` về cột thật | Migration 28 |
| ✅ | Cho `[PENALTY_RATE:` một cột thật | Migration 29 → `PrincipalPenaltyMultiplier`. Xem §5 |
| ✅ | Xoá sáu bảng chỉ WPF từng ghi vào | Migration 35 đã chạy 10/08/2026. Xem §6 |
| ✅ | Gỡ nhánh đọc `[RATE_HISTORY:` từ `Note` | 10/08/2026. `stripLegacyNoteBlobs` **vẫn giữ** — nó ở đường ghi, là lớp phòng vệ |

## Chất lượng dữ liệu

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Trả việc sinh ID về cho database | Bỏ `max(Id)+1` ở client, đồng bộ sequence |
| ✅ | Đưa dữ liệu nghiệp vụ từ `Note` về cột riêng | 39 hợp đồng, đối chiếu từng dòng với bản sao lưu |
| ✅ | Bịt các đường vẫn đang GHI dữ liệu nghiệp vụ vào `Note` | Migration 24. Xem §7 |
| ✅ | Sửa kiểu cột `CreditCards.IssuanceType` | Cột số nhận chuỗi mô tả nên diện mở thẻ mất mỗi lần lưu |
| ✅ | Gỡ nhánh đọc số HĐTD từ `HdtdDueDate` | Tàn dư thiết kế cũ |
| ✅ | Lịch sử định giá TSĐB | Bảng `CollateralAppraisals` kèm trigger đồng bộ. Nạp 55 dòng từ dữ liệu hiện có |
| ✅ | Chỉnh LTV hai tài sản lệch bậc phân loại | 55 tài sản, mỗi xếp loại một giá trị LTV duy nhất: L1 80% · L2 70% · L3 60% · L4 55% |
| ✅ | Số HĐTD gốc của KUNN đọc theo HĐTD liên kết | `resolveMasterHdtdNumber`. Migration 16 đổi tiền tố số KUNN cũ |
| ✅ | Làm tròn lại gốc kỳ chưa trả theo bước 10.000đ | Migration 18. Xem §4 |
| ✅ | Chuẩn hoá ngày đọc từ database về một dạng | `toIsoDate`. Xem §8 |
| ✅ | Chống trùng số hiệu KUNN | `assertKunnNumberFree`, migration 20. Xem §9 |
| ✅ | 14 KUNN chưa tất toán không có dòng lịch nào — 4,635 tỷ dư nợ đóng băng | Đã sinh lại toàn bộ lịch 05/08/2026. Xem §10 |
| ✅ | Chặn đóng HĐTD khi còn KUNN chưa tất toán | Trigger migration 22. Xem §11 |
| ✅ | `NOT NULL` cho `LoanContracts.CreditContractId` | Migration 23. Trigger của migration 22 đối chiếu qua khoá ngoại này |
| ✅ | Xoá cột rác `CreditContracts.RateHistory` | Migration 25. Xem §12 |
| ✅ | Kỳ thu nợ được coi là xong khi chưa thu đủ | `schedulePaymentStatus`. Xem §13 |
| ✅ | Xoá toàn bộ bảng sao lưu `_backup_*` | Migration 26. Kiểm chứng 10/08/2026: danh sách 20 bảng không còn bảng `_backup_` nào |
| ✅ | Xoá bảng `PostLoanControls` kế thừa từ WPF | Đã không còn trong database khi rà 10/08/2026 |
| ✅ | Gốc mỗi kỳ khai theo GNN | Cột `MonthlyPrincipalAmount`, migration 36 đã chạy. Xem §1 |
| ✅ | Ngày hiệu lực HĐTD đọc từ hợp đồng cha, không đọc bản sao trên KUNN | Xem §25 |
| ✅ | Phân hệ hợp đồng thẻ thay `CreditCards` | Migration 37 đã chạy. Xem §26 và §27 |

## Lỗi tính tiền đã sửa

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | LTV 0% bị đổi thành 80% | `parseFloat('0') \|\| 80`; tài sản hạn chế nhận thành bậc cao nhất |
| ✅ | Gộp 4 bản `getEffectiveLtv` | Cùng một tài sản cho ba hạn mức khác nhau ở ba màn hình |
| ✅ | Trừ đôi tiền trả trước hạn | Tổng gốc thu về hụt so với số cho vay |
| ✅ | Trả trước hạn mất trắng khi kỳ đã tất toán | Dư nợ không giảm |
| ✅ | Phương thức vay đè lên lựa chọn trả gốc | Giao diện ghi "trả đều" nhưng gốc mọi kỳ bằng 0 |
| ✅ | Mặc định `PrincipalRepaymentMethod` khi tạo KUNN mới không theo `LoanMethod` | Xem §14 |
| ✅ | Cộng đôi hạn mức khi nhiều HĐTD chung một HMTD | Thêm tầng `CreditLimitCode` |
| ✅ | Báo động giả khi so mức cấp gốc với TSĐB ở vay từng lần | Vay từng lần đối chiếu theo **dư nợ hiện hữu**; hạn mức tín dụng đối chiếu theo mức cấp |
| ✅ | Biên độ âm bị bỏ mất, khoản vay tính lãi cao hơn hợp đồng | `toPercent` trả 0 cho mọi số âm. Biên độ là số duy nhất được phép âm |
| ✅ | Khung KUNN hiện lãi suất khác bảng lịch của chính khoản đó | Gộp về `rateResolution.ts`. Xem §15 |
| ✅ | Chọn LS thông thường nhưng hệ thống vẫn áp lãi ưu đãi | `buildRateFields`. Xem §16 |
| ✅ | Phụ trội điều kiện không đi vào phép tính lãi | Xem §17 |
| ✅ | Lãi thả nổi ra 0% bị hiểu là "chưa khai" rồi nhận mặc định 8,5%/năm | Tách `{ value, configured }`; 0% là con số hợp lệ |
| ✅ | Kỳ trả nợ cuối cùng không rơi vào ngày đáo hạn | Lịch cộng dồn theo kỳ nên kỳ cuối rơi trước đáo hạn khi ngày trả nợ đầu khác giải ngân + 1 tháng |
| ✅ | Kỳ trả nợ đầu tiên rơi TRƯỚC ngày giải ngân | 5 KUNN của NGÔ NHỊ ĐẠT dùng chung mốc 15/04/2026 của hợp đồng hạn mức |
| ✅ | Đường **SỬA** KUNN vẫn sinh được kỳ 1 trước ngày giải ngân | `buildDueDateSequence`. Xem §18 |
| ✅ | Sửa mốc trả nợ ghi đè cả kỳ ĐÃ THU | Kỳ `IsPaid` nay giữ nguyên `DueDate` và `InterestAmount`; gốc vẫn tính lại để ghi nhận trả trước hạn |
| ✅ | HĐTD ký nhưng chưa tới ngày hiệu lực vẫn chào hạn mức khả dụng | Thêm `notYetEffective` vào `computeLimitGroups` và `summarizeCreditContracts` |
| ✅ | Tab Khoản Vay chào hạn mức khả dụng trên HĐTD **đã đóng** | Thêm `options.isClosed`, `closed`, `blockReason`. Xem §19 |
| ✅ | Đóng HĐTD bị hiểu thành "mọi KUNN đã tất toán", che mất dư nợ thật | Bỏ nhánh `IsClosed` khỏi `isKunnSettled`. Xem §20 |
| ✅ | Cấu trúc cho phép tồn tại HĐTD đã đóng mà còn dư nợ | Đổi từ hiển thị trạng thái sang **chặn**. Xem §21 |
| ✅ | Trắng trang tab KUNN khi chọn khách hàng | `getEffectiveBalanceForContract` gọi `kunnSettled` khai sau nó. Build, lint và 668 test đều xanh |
| ✅ | Gốc mỗi kỳ lệch chứng từ vì làm tròn bước 1.000đ | Gom về `PRINCIPAL_ROUND_MODE`, migration 18 sửa dữ liệu cũ |
| ✅ | Định giá hết hiệu lực vẫn được tính vào khả năng bảo đảm | Hết hạn thì khả năng bảo đảm bằng 0 và báo cần định giá lại |
| ✅ | Trả trước hạn trong ân hạn làm gốc đều sau ân hạn bị tính hụt | Xem §22 |

## Lỗi giao diện đã sửa

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Giao diện tối chưa bao giờ hoạt động đúng | Tailwind 4 gắn `dark:` vào `prefers-color-scheme`, app bật bằng lớp `.dark`. Tương phản còn 1,13–1,72. Khai `@custom-variant dark` theo lớp |
| ✅ | Trang Cấu hình chưa bao giờ đổi sang giao diện sáng | 84 lớp `light:*` mà Tailwind không có biến thể `light`; tương phản 1,04 |
| ✅ | Nâng tương phản chữ đạt WCAG AA ở cả hai giao diện | Đo lại 13 phân hệ × 2 giao diện |
| ✅ | Nút In lịch thu nợ in ra cả trang giao diện | Đổi sang dựng tài liệu A4 ngang rồi in qua iframe ẩn |
| ✅ | Bảng đổi hình dạng theo thiết bị | `AdaptiveTable`, áp cho 6 màn. 375px: 0 bảng còn tràn |
| ✅ | Gộp ba kiểu thông báo về `Toast` | Thêm nút đóng, `aria-live` |
| ✅ | Bỏ nút "Lưu cài đặt cá nhân" | Nó không lưu gì — thiết lập tự ghi khi chạm vào điều khiển |
| ✅ | Gộp bốn đường in về `printHtmlDoc` | Popup bị chặn thì im lặng, `setTimeout(300)` là cuộc đua |
| ✅ | Gộp ba bản tải file về `downloadTextFile` | |
| ✅ | Sửa chọn font không đổi được | `App.tsx` bọc cây con trong `font-sans` của Tailwind |
| ✅ | Sửa số tiền trên phiếu nghĩa vụ bị ép về 12px | `.font-mono` thắng `text-[calc(...)]` theo thứ tự nguồn |
| ✅ | Dùng từ nghiệp vụ thay khẩu ngữ ở màn thẻ | "đỡ được" → "khả năng bảo đảm" |

## Chức năng

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Công cụ 1 — trả nợ trước hạn nhiều kỳ | Mỗi lần trả có phương án riêng, nhiều lần cùng kỳ cộng dồn, vượt dư nợ tự cắt |
| ✅ | Công cụ 1 — lãi suất theo giai đoạn | Ưu tiên: LS sau ưu đãi khai tay > cơ sở + biên độ > LS ưu đãi + biên độ |
| ✅ | Công cụ 1 — ngày bắt đầu trả nợ | Kỳ 1 tính lãi theo số ngày thực tế từ ngày giải ngân |
| ✅ | Công cụ 1 — cột ngày bắt đầu và LS áp dụng từng kỳ | Có ở màn hình, bản Excel và bản in |
| ✅ | Sàn lãi suất theo hợp đồng | Cột `RateFloorAnnual`, migration 17. Không khai sàn thì vẫn chặn ở 0% |
| ✅ | Xoá tài sản bảo đảm | Chặn khi tài sản đang thế chấp cho khoản vay |
| ✅ | Luồng trình ngoại lệ cho tài sản hạn chế nhận | Cảnh báo + nhãn `⚠ NGOẠI LỆ` |
| ✅ | Chốt kiểm soát tổng mức cấp so với TSĐB | Xét theo cụm liên thông hợp đồng ↔ tài sản |
| ✅ | Tầng hạn mức dùng chung cho nhiều HĐTD | `CreditLimitCode` + `CreditLimitAmount` |
| ✅ | Quy tắc sản phẩm theo phương thức vay | Mục đích, kỳ hạn, ân hạn gốc |
| ✅ | Đồng bộ nhãn xếp loại TSĐB | Loại 1–4 và Hạn chế, dùng chung ở Dashboard, bảng TSĐB, thẻ tín dụng |
| ✅ | Phân hệ Kiểm soát sau vay | Ba loại kiểm tra, lịch sinh tự động, định giá lại ngay trong đợt kiểm tra. 29 test |
| ✅ | Lọc đợt kiểm soát sau vay theo khách hàng | Dùng chung `selectedCustomerId`. Vẫn nhắc số đợt quá hạn toàn danh mục khi đang lọc |
| ✅ | Lưu trữ hồ sơ khách hàng | Cột `Customers.ArchivedAt`, migration 32. Cờ thủ công, KHÔNG suy từ dư nợ |
| ✅ | Nút xoá KH — ba lỗi | Xem §23 |
| ✅ | Phân hệ Phương án kinh doanh & Hạn mức | Thay bộ bốn file Excel. Xem nhật ký 09/08 và 10/08 |
| ✅ | Thẻ tín dụng — ba trường hợp mở thẻ | Xem nhật ký 07/08 |

## Kỹ thuật

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Tách logic tài chính ra `src/lib/` dạng hàm thuần | Công cụ 1 bóc thêm `buildLoanSchedule`, `scheduleDocHtml`, `printHtmlDoc` |
| ✅ | 1.066 test cho logic tính tiền và giao diện | Bất biến Σ(gốc) = số tiền vay khoá ở mọi tổ hợp: ân hạn, gốc cuối kỳ, nhiều lần trả trước hạn, rút ngắn kỳ hạn, lùi ngày trả nợ, gốc/kỳ khai tay |
| ✅ | Test cho thành phần giao diện | `src/components/__tests__/`, mỗi tệp tự khai `// @vitest-environment jsdom`. Đã kiểm chứng bằng cách tái tạo lỗi trắng trang: 2/3 test đỏ đúng chỗ |
| ✅ | Gom kiến thức vào `CONVENTIONS.md` và skill `tin-dung` | Mã nguồn không còn chú thích |
| ✅ | Viết lại `README.md` khớp thực tế | |
| ✅ | Tách nhỏ `LoanPortfolioView` | 2.264 → 1.333 dòng. Xem §24 |

---

# III. Ghi chú chi tiết

## §1. Gốc mỗi kỳ khai theo GNN — cột `MonthlyPrincipalAmount`

**Vì sao cần.** Bước làm tròn gốc/kỳ là dữ liệu của từng GNN, không phải thiết lập
của hệ thống. Trước đợt này nó là hằng số `PRINCIPAL_ROUND_MODE = '10k'` áp cho
toàn danh mục, và bảy chỗ gọi `roundPrincipalCore(x)` đều không truyền tham số.

**Cơ chế đã có sẵn nhưng chết.** `generateSchedule` nhận tham số thứ tám
`customMonthlyPrincipal` từ 30/07/2026, nhưng **không một chỗ nào truyền nó** —
mọi lời gọi đặt `undefined` vào đúng vị trí đó.

**Hình dạng đã chọn:** ô nhập **số tiền**, không phải drop down chọn bước làm tròn.
Ba lý do:

1. Banker đọc trên GNN con số "4.170.000đ/kỳ", không đọc "bước làm tròn 10.000".
   Drop down bắt suy ngược từ con số đang thấy ra một khái niệm trừu tượng, và
   đoán sai thì **im lặng hoàn toàn**: mọi kỳ lệch, Σgốc vẫn đúng, không chốt nào bắt được.
2. Bước làm tròn không diễn tả được mọi tờ GNN. Gốc/kỳ là số thoả thuận thì không
   bước nào tái tạo được; ô số tiền luôn tái tạo được.
3. Ô số tiền **kiểm chứng được**, drop down thì không. Với drop down cả bốn lựa
   chọn luôn "hợp lệ".

`NULL` = tự tính, **không phải** chưa khai. Đọc bằng `??`. Ô chỉ hiện với "Gốc trả
đều" — với "Gốc trả cuối kỳ" thì `isBullet ? 0` nên làm tròn không tồn tại.

**Chốt chặn** `checkMonthlyPrincipal`: số khai phải nằm trong ±100.000đ quanh thương
số. Thông báo nêu đủ ba con số phải nhất quán (số tiền vay, số kỳ trả gốc, gốc/kỳ)
để banker biết sai ở đâu. Kiểm chứng trên trình duyệt thật 10/08/2026 với
`PNAT.CN.22070623/GNN-01`: số gợi ý ra **5.960.000đ**, khớp đúng gốc/kỳ đo được
trong database; nhập 59.600.000đ thì bị chặn kèm thông báo đủ ba số.

**Sau khi trả trước hạn theo phương án "giảm gốc hàng tháng"**, số khai tay không
còn áp dụng — chính mục đích của phương án đó là gốc/kỳ phải giảm. Từ đó hệ thống
tính lại theo bước mặc định. Cố ý **không** suy bước từ số đã khai: suy bước từ một
con số chính là ngộ nhận chia-hết ở §4.

⚠️ **`buildKunnPayload` nay luôn gửi `MonthlyPrincipalAmount`, và `saveContractAPI`
không có nhánh dự phòng cho cột lạ.** Chưa chạy migration 36 thì **mọi lần lưu KUNN
sẽ đổ lỗi PGRST204**. Chạy migration trước khi triển khai bản mã này.

## §2. `LoanAmount = 0` trên KUNN, hệ thống mượn mức cấp HĐTD

`generateSchedule`, `recalculateSchedules`, `computeOutstandingBalance` đều dùng
`LoanAmount || ContractAmount` nên "trông vẫn đúng", nhưng `disbursedOf` trong
`creditLimit.ts` dùng `LoanAmount ?? CurrentBalance ?? 0` — với `LoanAmount = 0`
nó lấy **0**, khiến vay từng lần khai thiếu số đã giải ngân và **hạn mức khả dụng
ra cao hơn thực tế**.

Rà 10/08/2026 qua phép đo bước làm tròn: **đúng một khoản** —
`2002/HĐTD/9738792/GNN-01` (ĐOÀN NGỌC LÝ, 240 kỳ). Gốc/kỳ thật 3.460.000đ, giải
ngược ra số tiền vay trong khoảng 828.000.240 – 830.400.000đ; **830.000.000đ** là
số tròn duy nhất trong khoảng và tái tạo đúng 3.460.000đ.

**Vẫn phải đối chiếu GNN giấy trước khi ghi** — con số này suy từ gốc/kỳ, không
đọc từ chứng từ.

Bẫy kèm theo: `coalesce("LoanAmount", "ContractAmount")` trong các báo cáo SQL
**chỉ bắt NULL, không bắt 0**, nên khoản này lọt qua migration 18. Ứng dụng dùng
`||` nên lại xử lý đúng — báo cáo SQL sai theo hướng ngược với app.

## §3. Sinh lại lịch trả nợ trên toàn danh mục

Phần 4 của `reports/01_thu_vuot_ky_dau.sql` đã liệt kê đầy đủ ~60 dòng lệch đáo hạn,
không giới hạn ở nhóm hạn mức. Quyết định "chưa xử lý phần thu vượt" nghĩa là script
**không được ghi đè các kỳ đã thanh toán** — chỉ sinh lại kỳ chưa trả.

Chỉ làm SAU khi `RepaymentStartDate` và `KunnTenor` đã đúng GNN giấy. Ngày đáo hạn
là dữ liệu gốc; sai nó thì sinh lại lịch vẫn sai.

## §4. Bước làm tròn gốc mỗi kỳ — đã đo, kết quả nhất trí 10.000

Migration 18 suy từ **một** tờ GNN (`PNAT.CN.03111223/GNN-01`, 500tr/120 kỳ, chứng
từ ghi 4.170.000đ/kỳ) ra bước 10.000 rồi áp cho cả danh mục. Đó đúng là lối đọc
ngược bằng chứng mà `CONVENTIONS.md` §2 đã ghi lại ở sự cố nút "Đồng bộ kỳ cuối".
Lần này **kết luận tình cờ đúng**, và đã kiểm chứng.

Cách đo: migration 18 chỉ viết lại **kỳ chưa thu**, nên gốc của **kỳ đã thu** còn
giữ con số nguyên bản. Với mỗi khoản có gốc/kỳ không đổi, tái tạo thương số từ số
tiền vay và số kỳ trả gốc rồi thử từng bước.

| Kết luận | Số khoản | Nghĩa |
| :--- | ---: | :--- |
| Bước 10.000 | 28 | Tái tạo được bằng 10.000 và **không** tái tạo được bằng 1.000 — bằng chứng dứt khoát |
| Chia hết tuyệt đối | 8 | Cả ba bước cho cùng một số, **không mang thông tin** |
| Không bước nào khớp | 1 | Chính là ca `LoanAmount = 0` ở §2 |
| Nói bước khác 10.000 | **0** | |

**Ngộ nhận phải tránh:** phép đo đầu tiên dùng phép **chia hết** cho ra 14 khoản
"bước 50.000". Sai — một khoản dùng bước 10.000 rơi vào bội số của 50.000 với xác
suất 1/5 thuần ngẫu nhiên; kỳ vọng trên 44 khoản là ~9. Chia hết **không** chứng
minh bước. Phải tái tạo lại con số từ thương số.

Còn tồn: **hướng** làm tròn cũng nhúng cứng (`Math.ceil`, luôn lên). Đây là giả
định thứ hai, độc lập với bước, và cũng chỉ dựa trên một tờ GNN. Đo nó cần bằng
chứng khác nên để đợt riêng — gộp hai giả định vào một lần sửa thì lúc số ra sai
không biết cái nào sai. Vì chưa đo, `checkMonthlyPrincipal` **không chặn** số làm
tròn xuống.

## §5. `[PENALTY_RATE:N]` — lãi suất phạt theo từng khoản

Khối chuỗi thứ bảy do `reports/03` tìm ra. Trước migration 29 không mã nào đọc nó;
mọi khoản bị áp `DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER = 1.5` nhúng cứng. KUNN
`PNAT.CN.01290824/GNN-01` (MAI PHƯỚC HIỂN) khai `PENALTY_RATE:0` tức **miễn phạt**
nhưng hệ thống vẫn tính 150% — chưa gây thiệt hại vì 21/21 kỳ thu đúng hạn,
`OverdueDays = 0`.

Quyết định đã chốt: dữ liệu thật chỉ có hai giá trị **150 và 0**, nên đây là **công
tắc miễn phạt gốc**, không phải thang lãi suất. Vẫn dùng cột số chứ không boolean
vì nó ánh xạ 1-1 với tham số `principalPenaltyMultiplier` mà `calcOverduePenalty`
đã nhận sẵn.

Cột `LoanContracts.PrincipalPenaltyMultiplier`: `NULL` = mặc định 1,5 · `0` = miễn
phạt gốc. Đừng viết `PrincipalPenaltyMultiplier || 1.5`. Nối vào `computeSchedulePenalty`
qua `scheduleView.ts` và `PaymentModal`.

## §6. Xoá các bảng chỉ WPF từng ghi vào

WPF ghi vào **bộ bảng riêng**, không phải bảng của web app — chỗ dễ nhầm nhất khi
đọc database:

| WPF ghi | Web app dùng |
| :--- | :--- |
| `Loans` | `LoanContracts` |
| `LoanSchedules` | `RepaymentSchedules` |
| `LoanCollaterals` | `CreditContracts.CollateralIds` |
| `PostLoanControls` | `PostLoanControlRecords` |
| `ApprovalConditions` | không có bản thay thế |

Căn cứ xoá: quét toàn bộ `.from('<bảng>')` trong `src/` ra đúng 19 bảng, không có
bảng nào ở danh sách trên. Rà `reports/08` ngày 10/08/2026: **cả bốn bảng nghiệp vụ
đều 0 dòng**, `PostLoanControls` đã không còn tồn tại, khoá ngoại duy nhất là
`LoanSchedules_LoanId_fkey → Loans` (cả hai đều trong danh sách xoá), không function
hay view nào tham chiếu. Migration 35 dùng `RESTRICT` chứ không `CASCADE`, và tự
chặn nếu bảng còn dòng. Sau khi chạy: `con_bang_wpf = 0`, 20 bảng còn lại, 0 bảng
hở RLS.

Hệ quả cần biết khi truy nguyên dữ liệu cũ: WPF nối database bằng **superuser
Postgres nhúng cứng trong `AppDbContext.cs`** nên nó **đi vòng qua RLS hoàn toàn**.
Nhưng `LoanSchedules` rỗng, nên WPF chưa từng ghi một kỳ trả nợ nào — điều này
**loại hẳn** khả năng có đường ghi song song thời WPF, và xác nhận `RepaymentSchedules`
là nguồn duy nhất từng tồn tại.

## §7. Bịt các đường vẫn đang GHI dữ liệu nghiệp vụ vào `Note`

Migration 06 dọn dữ liệu cũ nhưng **không bịt đường ghi**, nên hệ thống tự sinh lại.
Rà soát 05/08/2026 tìm ba đường, hai đang sống:

- `LoanPortfolioView` nhét `HĐTD: <số>` mỗi lần lưu KUNN (100 KUNN). **Lệch số thật
  ở 2 dòng của LÊ VĂN CAO** ghi `HĐTD-01`/`HĐTD-02`: `getMasterHdtdNumber` đọc `Note`
  trước `ContractNumber`, `computeLimitGroups` lấy hàm đó làm khoá nhóm, nên
  `findLimitGroupFor` tra bằng số thật không khớp và chốt hạn mức hai KUNN đó rơi về
  mặc định.
- `generateSchedule` ghi `[TRẢ TRƯỚC HẠN: +Xđ]` vào `RepaymentSchedules.Note` mà bỏ
  trống `PrepaidPrincipalAmount`.
- `CreditCards.Note` còn `[CollateralId:N]` nhưng chỉ còn đọc.

Mã nguồn đã bịt cả ba, xoá `serializeContractRateHistory`, gom việc gỡ chuỗi về
`stripLegacyNoteBlobs`. **Migration 24 đã chạy 05/08/2026.** Kiểm chứng: cả sáu khối
chuỗi về **0 dòng**; 82 ô `Note` thành rỗng, đối chiếu `_backup_Note_20260805` xác
nhận **tất cả chỉ chứa dữ liệu nghiệp vụ, không mất ghi chú thật nào**.

Bất biến sau khi dọn: **98 KUNN có lịch, 0 sai tổng gốc, 0 kỳ 1 trước giải ngân.**

Một quả mìn đã tháo: `RepaymentSchedules` Id 4387 (LÊ VĂN HẬU
`2002/HĐTD/9665732/GNN-01`, kỳ 10, `IsPaid=true`) có 900 triệu trả trước hạn chuyển
từ `Note` sang cột. Dư nợ **không đổi** vì `paidPrincipalOf` với kỳ đã thu vốn trả
về `PrincipalAmount` đã gồm phần đó — nhưng trước đó nếu sinh lại lịch thì
`recalculateSchedules` đọc `PrepaidPrincipalAmount` rỗng và sẽ thổi bay 900 triệu
khỏi kỳ 10, phá bất biến Σgốc.

## §8. Chuẩn hoá ngày đọc từ database về một dạng

`HdtdDueDate` kiểu `timestamptz` trả về chuỗi có múi giờ nên `creditLimit.ts` so
chuỗi ra sai thứ tự; hai view tự chặn bằng regex khiến nhánh dự phòng ngày hết hiệu
lực coi như chết; và `saveContractAPI` **xoá hẳn trường khỏi payload** — mở KUNN cũ
rồi lưu là mất giá trị mà giao diện vẫn báo thành công.

Gom về `toIsoDate` trong `utils.ts`, 6 test. Migration 19 đổi cột sang `date`, có
backup `_backup_HdtdDueDate_20260805`, kiểm chứng không lệch giá trị.

## §9. Chống trùng số hiệu KUNN

Nguyên nhân cũ: `nextKunnNumber` gọi lúc **mở form**, số không kiểm lại lúc lưu;
cộng với migration 16 bước 2 thiếu dấu phẩy giữa hai CTE nên bước chốt an toàn chưa
bao giờ chạy trong khi bước đổi số vẫn chạy.

`assertKunnNumberFree` hỏi lại database trước khi ghi, `findKunnNumberClash` so theo
dạng chuẩn hoá, lỗi unique của Postgres dịch sang tiếng Việt. 7 test. Migration 20
đã chạy 05/08/2026: rà soát ra 0 dòng (đã sạch), tạo unique index
`LoanContracts_ContractNumber_key` trên `lower(btrim(...))`.

## §10. 14 KUNN chưa tất toán không có dòng lịch nào

Đo 05/08/2026: 97 KUNN chưa tất toán, 14 trong đó có 0 kỳ trong `RepaymentSchedules`,
nên `computeOutstandingBalance` rơi vào nhánh dự phòng trả `CurrentBalance` — không
có kỳ nào để đánh dấu đã thu nên dư nợ **không bao giờ giảm được**. 4,635 tỷ đóng băng.

Đã sinh lại toàn bộ lịch 05/08/2026. Kiểm chứng: **97/97 KUNN chưa tất toán đều có
lịch**, `Σ(gốc các kỳ) = số tiền vay` đúng ở **mọi** khoản, và **0 khoản có kỳ 1 rơi
trước hoặc trùng ngày giải ngân** — lỗi đã gây thu vượt 21,7 triệu không còn ở đâu
trên danh mục.

## §11. Chặn đóng HĐTD khi còn KUNN chưa tất toán

Migration 22 đã chạy 05/08/2026. Rà soát BƯỚC 1 trả **0 dòng** — không HĐTD nào đang
ở trạng thái sai; HĐTD `2002/HĐTD/9629301` của NGUYỄN MINH HÙNG đã được mở lại
(hiệu lực 05/12/2025–05/12/2026, hai KUNN 200tr vẫn đang chạy đúng).

Kiểm chứng trigger bằng `BEGIN; UPDATE ... SET "IsClosed" = true WHERE "Id" = 19; ROLLBACK;`
— trả đúng `ERROR 23514: còn 2 KUNN chưa tất toán (2002/HĐTD/9629301/GNN-01,
2002/HĐTD/9629301/GNN-02)`, nêu đủ số hiệu nên trigger đọc đúng dữ liệu.

Đo thêm: `CreditContractId IS NULL` = 0 dòng, tức mọi KUNN đều gắn HĐTD qua khoá
ngoại — đúng đường trigger đối chiếu, không có lỗ.

## §12. Xoá cột rác `CreditContracts.RateHistory`

Rà `reports/03` tìm 59 dòng: nội dung là bản sao `Note` cũ (`HĐTD: <số>` kèm
`[PENALTY_RATE:N]`), **không phải lịch sử lãi suất**. Migration 14 copy vào sai cột.

**Bảy dòng đã trôi dạt:** Id 26 khai `PNAT.CN.08102312` của TRẦN THỊ KIM CHI mà nội
dung ghi `2002` (số của khách khác); Id 34/35/36 ghi nhãn tạm `HĐTD-01`/`HĐTD-02`;
Id 10/11/12 của ĐOÀN NGỌC LÝ lệch số. Không mã nào đọc.

Migration 25 đã chạy 05/08/2026. Kiểm chứng: cột không còn, và
`LoanContracts.RateHistory` không bị đụng — **18 KUNN vẫn giữ nguyên lịch sử lãi
suất thật**. Bốn giá trị `[PENALTY_RATE:]` được giữ trong
`_backup_CreditContractsRateHistory_20260805` trước khi xoá.

## §13. Kỳ thu nợ được coi là xong khi chưa thu đủ

Chốt nghiệp vụ 05/08/2026: kỳ chỉ xong khi thu **đủ nghĩa vụ** (gốc + lãi + phạt).

`IsPaid` là ô tích tay và điều khiển cả ba đường: `getAutoDebtGroupInfo` bỏ kỳ đó
khỏi đếm ngày quá hạn, phần hiển thị ngừng tính phạt, thẻ tổng hợp cộng toàn bộ gốc
lãi vào cột đã thu — tích sớm là khai thiếu dư nợ, khai tốt nhóm nợ và tha phạt.

Thêm `schedulePaymentStatus` (`chua_thu` / `thu_mot_phan` / `da_thu_du`) làm nguồn
duy nhất, nối vào `getAutoDebtGroupInfo`, `ScheduleTab` và `DebtSummaryCard`. Bảng
lịch có nhãn mới **Thu thiếu \<số tiền\>**. 14 test.

Ba điều đã xử: tôn trọng quy ước cũ (`IsPaid` + hai cột khai tay trống = đã trả đủ,
831/835 kỳ) nên không làm dư nợ phình; không trừ hai lần phần trả trước hạn (ca LÊ
VĂN HẬU 785 và 888 triệu); không cần ngưỡng làm tròn vì đo được 0 kỳ thiếu dưới
100.000đ. Phạt có tính vào nghĩa vụ hay không đặt ở hằng số
`PENALTY_COUNTS_TOWARD_SETTLEMENT` (hiện `true`).

Hệ quả cần đối chiếu: hai kỳ của PHẠM TẤN KIỆT `PNAT.CN.02170124/GNN-01` (kỳ 17
thiếu lãi 3.486.897đ, kỳ 18 mới thu gốc 1.911đ) nay được đếm quá hạn, nên nhóm nợ
khoản đó sẽ nhảy lên.

## §14. Mặc định `PrincipalRepaymentMethod` khi tạo KUNN mới không theo `LoanMethod`

Phát hiện 05/08/2026 qua khoản Nguyễn Thị Bé Hai. `loanProductRules.ts` đã có sẵn
`defaultPrincipalMethod` đúng quy tắc (Hạn mức tín dụng → gốc cuối kỳ, Cho vay từng
lần → gốc trả đều) nhưng `LoanPortfolioView.tsx` **không hề dùng tới**: hai chỗ tạo
KUNN mới hardcode `'Gốc trả cuối kỳ'` bất kể `LoanMethod`.

Đã nối `getLoanProductRule().defaultPrincipalMethod` vào `applyCreditContractToForm`
(chỉ áp khi tạo mới, giữ nguyên lựa chọn cũ khi sửa KUNN đã lưu) và luồng giải ngân
nhanh từ Dashboard. Rà soát diện rộng: không còn khoản "Cho vay từng lần" nào khác
bị sai giá trị này.

## §15. Khung KUNN hiện lãi suất khác bảng lịch của chính khoản đó

Phát hiện 05/08/2026 qua ĐOÀN NGỌC LÝ `2002/HĐTD_1/9718695/GNN-03`: khung ghi
**11,25%/năm**, mọi kỳ trong bảng tính lãi ở **10,20%/năm**.

Hai định nghĩa "lãi suất đang áp dụng" với thứ tự ưu tiên **ngược nhau**:
`getEffectiveActiveRate` ở `utils.ts` lấy `InterestRate` → `NormalRate` →
`PreferentialRate` → `BaseRate` và **bỏ quên biên độ**; `buildRateTimeline` lấy
`BaseRate + MarginRate` (có sàn) → `PostPreferentialRate` → `NormalRate` →
`InterestRate`. Tiền đi theo dòng thời gian nên 10,20% là số thật.

Chuyển `getEffectiveActiveRate` sang `rateResolution.ts`, cài trên chính dòng thời
gian đó — cùng hàm nuôi cả nhãn màn hình lẫn tiền phạt quá hạn nên không còn chỗ
lệch. 10 test.

## §16. Chọn LS thông thường nhưng hệ thống vẫn áp lãi ưu đãi

Quyết định nghiệp vụ 05/08/2026: **hai chế độ lãi suất loại trừ nhau** — chọn LS
thông thường thì lãi ưu đãi không tồn tại để mà áp.

Form trước đây lưu **cả hai** nhóm cột bất kể banker chọn gì, còn `buildRateTimeline`
thấy `PreferentialRate > 0` kèm số kỳ `> 0` là áp ưu đãi. Thêm `buildRateFields(mode, input)`
làm nơi duy nhất dựng nhóm cột lãi suất khi lưu: chế độ ưu đãi xoá `BaseRate`/`NormalRate`,
chế độ thông thường xoá `PreferentialRate`/`PreferentialPeriodMonths`/`PostPreferentialRate`.
Dữ liệu tự nói lên chế độ nên không tạo lại được mâu thuẫn. 12 test.

Còn phải chạy `reports/04` để tìm các KUNN cũ đang khai cả hai chế độ.

## §17. Phụ trội điều kiện không đi vào phép tính lãi

Chốt nghiệp vụ 05/08/2026: **có cộng vào lãi suất cho vay.** Trước đó cột
`PenaltySurcharge` chỉ được lưu rồi đọc lại vào form, không kỳ lãi nào cộng nó — hồ
sơ ĐOÀN NGỌC LÝ có phụ trội 0,20% nên `InterestRate` đã lưu 11,25% trong khi bảng
lịch tính 11,05%.

Ba cái bẫy đã xử:

1. Cột này lưu theo **điểm phần trăm** (`0.2` = 0,20%) khác các cột lãi suất khác
   lưu theo tỷ lệ, nên **không được** qua `toPercent()`.
2. `ratePercent` của mốc điều chỉnh **đã gồm** phụ trội nên không cộng lần hai; chỉ
   nhánh dự phòng mới cộng `penaltyPercent` của chính mốc đó.
3. Sàn lãi suất áp cho phần định giá **rồi** phụ trội mới cộng lên sau.

Cùng đợt: form không tự cộng lãi suất nữa — `currentActiveRateDisplay` dựng hợp đồng
nháp từ các ô đang nhập rồi gọi `getEffectiveActiveRate`, nên số xem trước khớp đúng
số sẽ lưu và sẽ tính. 8 test.

## §18. Đường SỬA KUNN vẫn sinh được kỳ 1 trước ngày giải ngân

Phát hiện 05/08/2026. Chốt bảo vệ chỉ nằm trong `generateSchedule`, còn
`LoanPortfolioView` tự cộng tháng khi sửa KUNN đã có lịch — bịt đường tạo mới không
bịt được đường sửa, cùng một hồ sơ vẫn tái tạo lại được lỗi cũ.

Rút dãy ngày đến hạn về `buildDueDateSequence` làm nguồn duy nhất; cả `generateSchedule`
và `redateSchedules` đều gọi nó. Đường sửa nay cũng áp quy tắc "kỳ cuối rơi vào ngày
đáo hạn". 14 test mới, gồm ca NGÔ NHỊ ĐẠT GNN-11 và một test khẳng định hai đường
cho ra dãy ngày y hệt nhau.

## §19. Tab Khoản Vay chào hạn mức khả dụng trên HĐTD đã đóng

Phát hiện 05/08/2026 từ hồ sơ NGUYỄN MINH HÙNG: HĐTD `2002/HĐTD/9629301` đã đóng,
hai KUNN 200tr `IsSettled=false`, tab HĐTD báo đỏ "còn 400.000.000" nhưng tab Khoản
Vay ghi HMTD còn lại 600.000.000 và nút Giải ngân vẫn bật.

`computeLimitGroups` không đọc `IsClosed` (cờ nằm ở bảng `CreditContracts`),
`expiredLimitNote` chỉ xét hết hiệu lực theo ngày, nút Giải ngân không có chốt nào.
Thêm `options.isClosed`, `closed` và `blockReason` vào `LimitGroupStatus`, cùng thứ
tự ưu tiên lý do chặn với `summarizeCreditContracts`. 8 test mới.

## §20. Đóng HĐTD bị hiểu thành "mọi KUNN đã tất toán"

Quyết định nghiệp vụ 05/08/2026: **đóng HĐTD là dừng quyền giải ngân, không phải xoá nợ.**

`isKunnSettled` trước đây trả `true` khi HĐTD có `IsClosed`, nên hai KUNN 200 triệu
của NGUYỄN MINH HÙNG (`IsSettled=false`, chưa trả đồng nào) hiện "Dư nợ hiện hữu 0"
kèm nhãn "ĐÃ TẤT TOÁN (theo HĐTD)", trong khi tab HĐTD báo đỏ còn 400 triệu.

Bỏ nhánh `IsClosed` khỏi `isKunnSettled` (nay chỉ một tham số), tách
`isKunnOfClosedHdtd` thành hàm riêng dùng chung cho `computeLimitGroups` và nhãn trên
bảng KUNN. 12 test, trong đó **5 test cũ khẳng định điều ngược lại đã bị viết lại**.

## §21. Cấu trúc cho phép tồn tại HĐTD đã đóng mà còn dư nợ

Chủ dự án chỉnh 05/08/2026: không ngân hàng nào tất toán hợp đồng khi còn dư nợ, nên
đó là **dữ liệu sai phải chặn**, không phải trạng thái cần dựng giao diện để hiển thị.

Trước đó đã làm đúng hướng ngược lại — nhãn đỏ trên bảng KUNN, dòng cảnh báo đầu
trang, cột `closedWithBalance`, tooltip lý do chặn. **Đã gỡ hết.**

Thay bằng ràng buộc: `canCloseCreditContract` chặn ở form, trigger
`trg_chan_dong_hdtd_con_du_no` (migration 22) là lớp bảo vệ thật vì chốt client
không đỡ được đường ghi SQL. Ô "HĐTD đã đóng" bị làm mờ khi còn KUNN chưa tất toán;
lưu vẫn cố thì báo lỗi kèm **số hiệu** các KUNN phải xử lý. 6 test.

## §22. Trả trước hạn trong ân hạn làm gốc đều sau ân hạn bị tính hụt

Phát hiện 05/08/2026 qua đối chiếu PDF thật (GNN 960tr/120 tháng, ân hạn 18 tháng,
trả trước hạn kỳ 2&3): công thức tính lại gốc đều chia dư nợ cho
`tenorMonths - kỳ hiện tại` (117 kỳ) thay vì kỳ còn lại **SAU ân hạn** (102 kỳ) —
gốc/kỳ hụt còn 8.070.000đ thay vì đúng 9.260.000đ, kỳ cuối phải gánh 128.930.000đ
(gấp 16 lần một kỳ thường).

Lỗi có ở **CẢ HAI** nơi giống hệt nhau: `calcMath.ts` (Công cụ 1) và `loanMath.ts`
(lịch KUNN thật) — đã sửa cả hai thành `tenorMonths - Math.max(kỳ hiện tại, số tháng ân hạn)`.
Test hồi quy trong `calcMath.test.ts`.

## §23. Nút xoá khách hàng — ba lỗi độc lập

| # | Lỗi | Nguyên nhân |
| :--- | :--- | :--- |
| 1 | Nút hiện ra là khối đỏ đặc, không đọc được chữ | `bg-neg` ghép với `text-neg` — nền và chữ cùng một token màu. Icon dùng `currentColor` nên cũng vô hình. Dự án đã có `BTN_DANGER` làm đúng việc này |
| 2 | Không kiểm tra ràng buộc nào trước khi xoá | `deleteCollateralAPI` ngay bên cạnh thì chặn khi tài sản đang thế chấp; nút xoá KH bị bỏ quên khỏi khuôn đó |
| 3 | Báo "Đã xoá thành công" khi thực ra không xoá được gì | Thiếu `.select()` — đúng cái bẫy RLS ở `CONVENTIONS.md` §1: Supabase trả mảng rỗng mà không báo lỗi |

Kiểm chứng trên dữ liệu thật: CHÂU CÁT LƯỢNG (2 KUNN, 1 HĐTD, 1 TSĐB, 1 thẻ) bị chặn
kèm thông báo nêu đủ bốn số lượng; hồ sơ nháp không ràng buộc thì xoá được, 50 → 49.

## §24. Tách nhỏ `LoanPortfolioView`

Từ 2.264 dòng còn 957 dòng (giảm 58%, đo lại 10/08/2026). Tách 3 khối JSX lớn sang
`src/components/portfolio/`: `KunnForm.tsx` (~580 dòng), `ScheduleTab.tsx` (~270 dòng),
`PaymentModal.tsx` (~165 dòng).

Nhân tiện dọn trùng lặp: `fmtMoney`/`fmtRate` cục bộ trong view (tự ý bỏ qua thiết
lập định dạng người dùng) thay bằng bản dùng chung ở `utils.ts`;
`PRINCIPAL_REPAY_OPTIONS`/`INTEREST_REPAY_OPTIONS` chuyển sang `loanProductRules.ts`.

Đã kiểm chứng cả 3 phần trên trình duyệt thật. Build + 686 test đều xanh.

---

## §25. Ngày hiệu lực HĐTD — một nguồn duy nhất

`computeLimitGroups` đọc `LoanContracts.ContractEndDate` — **bản sao ngày HĐTD nằm trên
từng dòng KUNN**. `saveCreditContractAPI` chỉ ghi `CreditContracts`, không ghi ngược, nên
mỗi lần sửa ngày HĐTD là sinh thêm một dòng lệch vĩnh viễn.

Tái hiện 10/08/2026 trên CHÂU CÁT LƯỢNG: tab HĐTD ghi hiệu lực 28/05/2027 trong khi tab
KUNN ghi 28/05/2026, HMTD còn lại 0 và nhãn đỏ "HĐTD hết hiệu lực".

Đo trên toàn danh mục: **102 KUNN, 4 lệch ngày kết thúc, 1 lệch ngày hiệu lực.**

**Chiều lệch nguy hiểm có thật:** `2002/HĐTD/9647376/GNN-01` (NGUYỄN THANH BÌNH) có hạn
thật **30/06/2025** nhưng bản sao ghi **30/06/2027** — lệch hai năm. Hệ thống coi HĐTD
còn hiệu lực suốt hơn một năm và **không nhãn nào cảnh báo**. Đây là lỗi §19 quay lại qua
cửa khác: chiều bản sao *cũ hơn* thì chặn oan, thấy ngay; chiều bản sao *dài hơn* thì âm
thầm chào hạn mức trên hợp đồng đã hết hiệu lực.

Sửa: thêm `getContractDates` vào `LimitGroupOptions` (cùng khuôn `isClosed` đã có), tra
HĐTD cha qua `CreditContractId` bằng `hdtdEffectiveDatesOf` đặt cạnh `isKunnOfClosedHdtd`
— hai chốt nay dùng **một cách tra**. Cố ý **không** đi hướng ngược lại (ghi đè ngày
xuống mọi dòng KUNN mỗi lần lưu) vì đó là nhân thêm bản sao, chính là cách sinh ra lỗi này.

7 test khoá cả hai chiều lệch, ca tra không ra HĐTD cha, và tương thích ngược khi không
truyền nguồn ngày. Kiểm chứng trên trình duyệt: HMTD còn lại đổi từ 0 thành
1.750.000.000đ, nhãn hết hiệu lực biến mất, khớp tab HĐTD.

**Kèm theo — ô tra "Số Hợp Đồng Tín Dụng" chưa bao giờ hoạt động.** Khi chỉ nhập số HĐTD,
nhánh `else` gọi `fetchCustomersAPI({})` lấy **toàn bộ 49 khách** rồi gán `customers[0]`,
nên vòng lặp tra theo số hợp đồng có điều kiện `!matchedCustomer` **không bao giờ chạy**.
Hệ quả nặng hơn "không tìm thấy": nó **mở sai hồ sơ khách hàng và không báo gì**. Bỏ
nhánh `else`; kiểm chứng tra `9647376` ra đúng NGUYỄN THANH BÌNH.

## §26. Phân hệ hợp đồng thẻ — `CardContracts`

Thay `CreditCards` bằng `CardContracts` + `CardSupplementaryHolders` (migration 37, đã
chạy 10/08/2026). Bảng riêng chứ không nhét vào `CreditContracts` vì trường khác gần hết:
loại thẻ, chủ thẻ, mã chính sách, thẻ phụ, thời hạn cố định 60 tháng — nhét chung là dựng
một bảng nửa rỗng. Xoá bảng cũ theo quyết định của chủ dự án: dữ liệu ít, khai lại theo mô
hình mới. Ô "số thẻ" bỏ hẳn vì banker không biết được lúc lập hồ sơ.

**HẠN MỨC DÙNG CHUNG là quyết định quan trọng nhất.** Một hợp đồng phát hành cả Visa,
Mastercard và Napas trên **cùng một** hạn mức, nên hạn mức nằm ở **hợp đồng**
(`GrantedLimit`), không nằm ở từng thẻ. Lưu theo từng thẻ rồi cộng lại sẽ tiêu tốn khả
năng bảo đảm **gấp ba lần thực tế**. Thẻ phụ đồng mức cấp nên bảng thẻ phụ **không có cột
hạn mức**; tối đa 2 thẻ phụ, chặn bằng **trigger** vì `CHECK` không đếm được qua nhiều dòng.

**Thẻ ghi nợ ATM không có hạn mức tín dụng** nên tiêu tốn 0 khả năng bảo đảm. Chặn cả hai
chiều: thẻ tín dụng mà hạn mức 0 thì chặn; thẻ ghi nợ mà khai hạn mức thì chặn. Hợp đồng
lẫn cả hai loại thì **không** coi là ghi nợ.

KH và vợ/chồng là **hai hợp đồng riêng** vì hạn mức khác nhau; tổng thì cộng lại.

Số hợp đồng `NAT/<năm>/<số thứ tự 3 chữ số>`, lấy `MAX` cộng 1 (không đếm số dòng), đếm
riêng theo năm, unique index trên `lower(btrim(...))` cùng khuôn migration 20.

`creditLimit.ts` đổi sang nhận `CardContract[]`: `cardGrantedLimit` trả 0 cho hợp đồng đã
đóng và cho thẻ ghi nợ. Dashboard nạp `CardContracts` và cộng qua `totalCardGrantedLimit`
— dòng thẻ **ghi rõ "hạn mức đã cấp"**, đếm theo "hợp đồng" chứ không "khoản", và **không
hiện phần trăm** vì nó không thuộc mẫu số tổng dư nợ.

Kiểm chứng đầu-cuối 10/08/2026 (CHÂU CÁT LƯỢNG, bản thử đã xoá): số `NAT/2026/001` tự
sinh, hết hạn 2031-08-10 đúng 60 tháng; chọn `B2` rồi nhập 200tr thì chặn kèm thông báo
nêu đủ trần và số đang khai; ba thương hiệu với hạn mức 100tr thì tổng hiển thị **100tr,
không phải 300tr**; nút "Thêm thẻ phụ" tự biến mất ở thẻ phụ thứ hai.

## §27. Mã chính sách phát hành thẻ — 15 mã, khoá bền

Nguồn: **Phụ lục 02 QĐ 1017/2025/QĐ-TGĐ** (ban hành 26/04/2025, hiệu lực 28/04/2025, lần
hiệu chính 02), thay thế Phụ lục 01 và 02 của QĐ 2630/2024 và QĐ 3296/2024. Hai tệp PDF là
**bản scan ảnh thuần** — không có text nào ngoài watermark, phải bóc ảnh nhúng ra đọc bằng mắt.

Chuẩn hoá `TSDB` thành `TSBD` ở B11–B13 (bản gốc khai không nhất quán), có test khoá
"0 mã còn chứa TSDB".

**Luật hạn mức không cùng một hình dạng** — bốn cấu trúc:

| Cấu trúc | Mã dùng | Ghi chú |
| :--- | :--- | :--- |
| Công thức đơn | A1, A2, B4, B9, B11, B12, B13 | `limitRule` + `minLimit`/`maxLimit` |
| Bảng bậc `tiers` | B1 | 8 bậc theo số dư TG CKH bình quân 6 tháng |
| Ma trận `matrix` | B3, B5 | Chức danh × xếp hạng doanh nghiệp |
| Nhánh phụ `brackets` | B6, B7, B8, B10 | B10 có **15 bậc**; B8 có **hai cơ sở song song** (theo chức danh / theo lương) với trần khác nhau |

`A1` là **mã duy nhất không có trần trên** (90% × giá trị tiền gửi, sàn 10tr). Con số 90%
khớp đúng hằng số `CARD_STK_LTV_PERCENT` đã có từ 07/08 — có test khoá sự khớp này.

**KHOÁ BỀN tách khỏi mã chính thức.** `CardContracts.PolicyCode` lưu `A1`/`A2`/`B1`…`B13`,
**không** lưu chuỗi dài như `B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK`. Mã chính
thức chỉ để hiển thị và có thể đổi khi Phòng Thẻ ban hành quyết định mới — lưu chuỗi đó là
mọi hợp đồng cũ trỏ vào chỗ không còn tồn tại.

`cardPolicyOf` tra được **ba đường**: khoá bền, mã chính thức, hoặc mã cũ qua `aliases`.
`normalizePolicyRef` bỏ khác biệt hoa thường và **dấu cách quanh gạch dưới**. `retiredAt`
cho mã bãi bỏ **biến khỏi danh sách chọn** (`activeCardPolicies`) nhưng **vẫn tra được**
cho hồ sơ cũ — đây là chỗ hầu hết hệ thống làm sai.

Dữ liệu để **trong mã nguồn**, không xuống CSDL. Tiền lệ đúng là `mdsdv.json` (danh mục
tra cứu 9.133 dòng, chỉ đọc) chứ không phải `RatePrograms` (5 bảng, lãi suất đổi theo
tuần, banker phải sửa). Lý do: bốn hình dạng dữ liệu quan hệ hoá rất đắt mà không được gì;
mất lớp test khoá cấu trúc; và mỗi bản QĐ mới đổi cả *hình dạng* nên "sửa từ giao diện
không cần deploy" phần lớn là ảo. Bù lại git cho dấu vết kiểm toán.

Đổi ý sau này **không phải làm lại**: dữ liệu nằm sau ba hàm truy cập, đổi nguồn là sửa ba
hàm đó.

Tab riêng **Tra cứu chính sách thẻ** (nhóm Công cụ, dưới Tra cứu mục đích SDV): cột MÃ
riêng, bộ lọc theo loại TSBĐ, nhấp một dòng mở ra bảng bậc / ma trận / nhánh phụ, điều
kiện, tái đánh giá, hồ sơ bổ sung, và dòng xuất xứ QĐ để banker biết dữ liệu còn mới.

## §28. Hai trần theo doanh nghiệp — chưa chặn được

`B3` và `B12` có trần **cắt ngang nhiều khách hàng cá nhân**, thứ hệ thống chưa biểu diễn
được vì không có thực thể doanh nghiệp:

- `B3`: tổng hạn mức cấp cho **01 KHDN** không quá 1.000tr (Platinum/Diamond) hoặc 500tr
  (xếp hạng còn lại).
- `B12`: tổng hạn mức thẻ được **một doanh nghiệp** bảo lãnh không quá 10% HMTD Vietbank
  đã cấp và không quá **5 tỉ/doanh nghiệp** — và **cộng gộp cả thẻ đã phát hành theo `B3`**.

Hiện hai trần này chỉ là chữ trong `limitRule` và `matrix.note`, hiện lên tab tra cứu để
banker tự đối chiếu. Muốn chặn thật thì cần thêm khái niệm doanh nghiệp bảo lãnh — việc đó
lớn, chưa làm.

## §29. Hai cột bản sao ngày HĐTD — chưa xoá được

Đo lại 10/08/2026 sau khi §25 xong. Ghi chú cũ nói "mã nguồn không đọc nữa nên vô hại"
**là sai**. Thực tế:

- `src/lib/kunnForm.ts` vẫn nạp hai cột lên form KUNN và vẫn ghi xuống khi lưu.
- Bảy chỗ còn đọc chúng làm **đường dự phòng** khi KUNN không trỏ được về HĐTD cha
  (`CreditContractId` rỗng hoặc trỏ vào hợp đồng không tồn tại): `creditLimit.ts`,
  `postLoanControl.ts`, `loanMath.ts`, `rateResolution.ts`, `DashboardView`, `ScheduleTab`,
  `KunnTable`.

§25 chỉ đổi **thứ tự ưu tiên** — tra HĐTD cha trước, bản sao sau — chứ không cắt bản sao.
Nên xoá cột không phải dọn dữ liệu mà là gỡ một đường dự phòng đang chạy.

`supabase/reports/10_ban_sao_ngay_hdtd_trong_kunn.sql` §3 đếm số KUNN sẽ **mất ngày** nếu
xoá cột. Khác 0 thì phải gỡ bảy chỗ dự phòng và bỏ hai ô khỏi form KUNN trước, rồi mới xoá
cột. Bằng 0 thì xoá cột an toàn ngay.

§4 của cùng báo cáo là câu `update` sửa 4 dòng lệch cho khớp hợp đồng cha — hướng giữ cột.
Đang comment, chỉ mở khi chọn hướng đó.

## §30. Bộ công cụ tệp — còn ba việc, một việc bị chặn

Yêu cầu 10/08/2026: dựng sẵn bộ công cụ đọc/ghi Word · Excel · PowerPoint · PDF · ảnh để
lần sau phát sinh thì không phải làm lại hay dùng HTML đội lốt. Hiện trạng sau đợt này:

| Định dạng | Ghi | Đọc |
| :--- | :--- | :--- |
| `.xlsx` | ✅ `xlsxWriter.ts` — lưới trơn, chưa gộp ô, chưa màu tuỳ ý | ⬜ |
| `.docx` | ✅ `docxWriter.ts` | ⬜ |
| `.pptx` | ✅ `pptxWriter.ts` | ⬜ |
| Ảnh PNG | ✅ `htmlToPng.ts` | — |
| PDF | ✅ hộp thoại In của trình duyệt rồi lưu thành PDF — **chốt 10/08/2026 dừng ở đây** | ⬜ |

**PDF: quyết định KHÔNG làm, chốt 10/08/2026.** Dùng hộp thoại In của trình duyệt rồi lưu
thành PDF là đủ. Lý lẽ để không làm còn giữ lại đây vì nó là thứ chặn: sinh PDF thật có chữ
tiếng Việt **buộc phải nhúng phông**. Mười bốn phông dựng sẵn của PDF (Helvetica, Times,
Courier…) mã hoá WinAnsi, **không có ký tự tiếng Việt có dấu** — dùng chúng thì "Điều" ra
"iu". Nhúng phông thì cần một tệp `.ttf` nằm trong repo, mà Times New Roman của Windows
không được phép phát hành lại; phải chọn một phông tự do đủ tiếng Việt và thêm 200–800KB vào
gói giao diện. Cái giá đó không đáng so với một cú bấm In. **Nếu sau này cần PDF sinh tự
động ở phía máy chủ** (gửi email, đính kèm) thì việc này quay lại, vì lúc đó không có trình
duyệt nào để bấm In.

**Đọc tệp chưa làm.** `.xlsx`/`.docx`/`.pptx` ngoài đời nén DEFLATE chứ không lưu thô như
tệp ta sinh ra, nên phải giải nén. Trình duyệt có `DecompressionStream('deflate-raw')` nên
làm được không cần thư viện ngoài. Chưa làm vì chưa rõ cần nạp cái gì vào đâu — nạp danh mục
từ Excel, nạp ngân hàng câu hỏi từ tệp, hay cả hai.

**Công cụ 1 và Công cụ 4 vẫn là HTML đội lốt `.xls`.** Chuyển được thì `xlsxWriter` phải học
gộp ô (`mergeCells`) và màu nền tuỳ ý theo ô. Đó là việc trong `xlsxWriter`, không phải việc
trong hai tab.

## §31. Chất lượng bộ 662 câu — ba loại vấn đề

**Loại 1 — hai câu đề ghi "CÂU NÀO CŨNG SAI" (504, 570).** Bản dọn sẵn đánh cả bốn lựa chọn
là đáp án đúng. Đó là cách người soạn ghi chú, không phải đáp án. Chốt 10/08/2026: để trống
đáp án; `CorrectAnswers` rỗng là trạng thái thật *"chưa chốt đáp án"*, có ràng buộc CSDL
(migration 39) và có nhãn trên tab. Luyện tập bỏ qua chúng vì không chấm được.

Quan trọng: **không vì hai câu này mà đặt ràng buộc "không được đánh đúng mọi lựa chọn"**.
Bốn câu 176, 194, 195, 198 đúng là mọi lựa chọn đều đúng, và hai câu trong đó ghi thẳng trong
đề *"(cho phép lựa chọn nhiều đáp án)"*. Ràng buộc ấy sẽ khoá dữ liệu thật ra ngoài.

**Loại 2 — một câu bị bóc lỗi từ PDF (640).** Cả bốn lựa chọn dồn vào một ô duy nhất:
`"25 B.50 C.75 D.80"`. Câu này không trả lời được, cần mở nguồn ra tách lại. Chưa sửa vì
không biết đáp án đúng là con nào.

**Loại 3 — ba cụm trùng câu mà đáp án khác nhau.** Đo trên 662 câu: 9 cụm trùng nội dung, 24
câu, 15 bản dư. Sáu cụm trùng vô hại (cùng đáp án). **Ba cụm dưới đây khác:**

| Cụm | Đáp án từng bản |
| :--- | :--- |
| 267, 272, 274, 283 | B · B · D · D |
| 309, 325, 344, 345 | D · C · D · B |
| 318, 343, 347 | A · C · B |

Ít nhất một bản trong mỗi cụm đang dạy sai, và người ôn tập gặp bản nào thì học theo bản đó.
Hệ thống **không tự chọn** — tab gắn nhãn đỏ *"trùng câu, lệch đáp án"* trên từng câu để
người có thẩm quyền mở văn bản gốc ra đối chiếu rồi xoá bản sai.

## §32. Xuất biểu mẫu ra `.docx` thật

Tab **Soạn biểu mẫu** trước 10/08/2026 ghi HTML kèm chỉ thị `mso-` rồi đặt tên `.doc`. Word
mở được nhưng luôn cảnh báo lệch định dạng — cùng bệnh với `.xls` HTML đã sửa ở phần Phương
án kinh doanh.

`src/lib/docxWriter.ts` đọc chính HTML mà `documentHtml.ts` sinh ra rồi dịch sang
WordprocessingML: `DOMParser` dựng cây, cây thành mô hình đoạn/bảng, mô hình thành XML, gói
năm thành phần OOXML. Phần ZIP + CRC32 rút về `src/lib/ooxml.ts` cho `xlsxWriter` và
`docxWriter` dùng chung, theo quy tắc "dùng ở hai nơi thì rút về `src/lib/`".

Không phải bộ dịch HTML tổng quát — nó chỉ hiểu từ vựng của tám biểu mẫu hiện có. Thêm lớp
CSS hay thẻ mới vào biểu mẫu thì phải khai ở `docxWriter`, xem CONVENTIONS.

**Con số bám bản xem trước, không bám bản `.doc` cũ:** giãn dòng 1,5 (cũ 1,35), chữ trong
bảng 12pt (cũ 11pt). Bản in PDF vốn đã dùng hai con số này, nên giờ ba mặt — màn hình, PDF,
Word — khớp nhau thay vì mỗi mặt một kiểu.

**Một lỗi lược đồ bắt được nhờ đọc kỹ CT_TblPr:** bản đầu đặt `w:tblCellMar` trước
`w:tblLayout`. Lược đồ đòi thứ tự `tblW` → `tblBorders` → `tblLayout` → `tblCellMar`, sai
là Word từ chối mở — mà python-docx vẫn đọc bình thường, nên test đọc lại **không** bắt
được. Đã sửa và khoá bằng test thứ tự thẻ.

41 test đơn vị cho bộ dịch, 8 test tích hợp dựng cả màn hình rồi bấm nút tải và đối chiếu
từng ký tự phần chữ trong `word/document.xml` với `textContent` của bản xem trước. Kiểm
chứng ngoài test: sinh tám tệp ra đĩa, **python-docx** mở được cả tám, khổ A4 lề
25/20/20/30mm đúng, khoảng chừa chỗ ký 1500 twips đúng, bảng dự toán kẻ khung còn bảng ký
thì không.

Không kiểm chứng được trên trình duyệt: app đòi đăng nhập, tôi không nhập thông tin đăng
nhập. Bằng chứng nằm ở test tích hợp và python-docx.

# IV. Quyết định nghiệp vụ đã chốt

| Câu hỏi | Quyết định | Ngày |
| :--- | :--- | :--- |
| Ngày thu lãi hàng tháng của hợp đồng hạn mức | **Theo lựa chọn của từng khách hàng, khai trên từng KUNN.** Có khách chọn ngày 1, 15, 28, 30 — không gom chung được, và cũng không phải giải ngân + 1 tháng: LÊ NGỌC QUẾ HÂN giải ngân 05/05/2026 nhưng trả kỳ 1 ngày 15/05/2026. `RepaymentStartDate` là dữ liệu gốc phải khai theo GNN giấy | 05/08 |
| Xử lý ≈21,7 triệu đã thu vượt của NGÔ NHỊ ĐẠT | **Chưa xử lý, chỉ báo cáo.** Không hoàn, không cấn trừ, không ghi điều chỉnh | 05/08 |
| Kỳ thu nợ coi là xong khi nào | Chỉ khi thu **đủ nghĩa vụ** — gốc + lãi + phạt. Xem §13 | 05/08 |
| Hai chế độ lãi suất | **Loại trừ nhau.** Xem §16 | 05/08 |
| Phụ trội điều kiện | **Có cộng vào lãi suất cho vay.** Xem §17 | 05/08 |
| Đóng HĐTD nghĩa là gì | **Dừng quyền giải ngân, không phải xoá nợ.** Xem §20 | 05/08 |
| HĐTD đã đóng mà còn dư nợ | **Dữ liệu sai phải chặn**, không phải trạng thái cần hiển thị. Xem §21 | 05/08 |
| 31/98 KUNN có kỳ cuối không rơi đúng ngày đáo hạn | **KHÔNG PHẢI LỖI.** Ngày trong tháng giữ nguyên từ kỳ đầu tới kỳ cuối; ngày đáo hạn KUNN không được phép đổi ngày của kỳ nào. Ba mươi mốt khoản cùng một khuôn chính là **bằng chứng khuôn ấy là quy tắc** — tôi đã đọc ngược. Quy tắc tự đặt hôm 06/08 cùng nút "Đồng bộ kỳ cuối" đã gỡ hẳn ở `786d0e9`; nút đó lấy `ContractEndDate` làm ngày đáo hạn KUNN và **đã làm hỏng dữ liệu thật** | 07/08 |
| `[PENALTY_RATE:N]` là gì | **Công tắc miễn phạt gốc**, không phải thang lãi suất. Xem §5 | 07/08 |
| Bảng tính hạn mức có gắn khách hàng không | **Không.** Đây là công cụ nhập liệu cho tờ trình, không liên quan hồ sơ tín dụng | 10/08 |
| Bước làm tròn gốc mỗi kỳ | **Theo từng giấy nhận nợ.** Mặc định 10.000 (28 tờ GNN xác nhận), khai ngoại lệ bằng ô số tiền. Xem §1 và §4 | 10/08 |
| Có sinh PDF thật không | **Không.** Bấm In của trình duyệt rồi lưu thành PDF là đủ; không đáng nhúng phông tiếng Việt 200–800KB vào gói. Việc này chỉ quay lại nếu cần sinh PDF phía máy chủ. Xem §30 | 10/08 |
| Câu hỏi mà đề ghi "câu nào cũng sai" | **Để trống đáp án**, không đánh đúng cả bốn lựa chọn. Đó là ghi chú của người soạn, không phải đáp án — và không được vì nó mà phá luật "mọi lựa chọn đều đúng là hợp lệ". Xem §31 | 10/08 |

---

# V. Nhật ký theo ngày

## 10/08/2026

### Tab Ôn tập nghiệp vụ — 662 câu hỏi

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Migration 38 `QuizQuestions` | Lựa chọn trong `jsonb`, chống trùng bằng **trigger** chứ không unique index. RLS: ai cũng đọc và thêm, sửa/xoá thì admin hoặc người đã thêm |
| ✅ | `quizBank.ts` — logic thuần | 35 test, trong đó 6 test chạy trên **chính bộ 662 câu trong repo** |
| ✅ | Tab hai chế độ: Tra cứu và Luyện tập | Chấm đúng câu nhiều đáp án (đủ và không thừa), ẩn/hiện đáp án, lọc theo nguồn |
| ✅ | Khung nhập liệu | Số lựa chọn thêm bớt được (2–12), mã dồn lại khi xoá lựa chọn giữa, tích nhiều đáp án đúng. Báo trùng ngay lúc nhập **và** hứng lỗi trùng từ CSDL |
| ✅ | 20 test dựng màn hình | Gồm đúng ca anh yêu cầu: submit câu đã có thì báo trùng |
| ✅ | Migration 39 — trạng thái "chưa chốt đáp án" | `CorrectAnswers` rỗng. Hai câu *"CÂU NÀO CŨNG SAI"* (504, 570) để trống theo chốt 10/08/2026. Luyện tập bỏ qua và nói rõ bỏ bao nhiêu |
| ⚠️ | Ba cụm trùng có đáp án khác nhau | `(267,272,274,283)`, `(309,325,344,345)`, `(318,343,347)`. Ít nhất một bản mỗi cụm đang dạy sai. Xem §31 |

Hai ràng buộc tôi định đặt rồi **bỏ vì dữ liệu thật bác bỏ**: sàn 4 lựa chọn (bộ thật có câu 1, 2, 3, 5 lựa chọn) và "không được đánh đúng mọi lựa chọn" — bốn câu (176, 194, 195, 198) đúng là mọi lựa chọn đều đúng, hai trong đó ghi thẳng trong đề *"(cho phép lựa chọn nhiều đáp án)"*. Thứ cần biểu diễn là "chưa chốt đáp án", và nó biểu diễn bằng mảng rỗng chứ không bằng việc đánh đúng tất cả.

### Xuất slide ra `.pptx` thật

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | `pptxWriter.ts` + `pptxTheme.ts` | Tiêu đề, gạch đầu dòng nhiều cấp, bảng kẻ khung, khổ 16:9 và 4:3. 28 test |
| ✅ | Kiểm chứng bằng **python-pptx** | Đúng khổ, đúng số slide, đúng cấp bậc, đúng kích thước bảng |
| ⬜ | Chưa màn nào gọi tới | Thư viện dựng trước theo yêu cầu; chờ biết cần slide ở đâu |

### Biểu mẫu hợp đồng xuất ra `.docx` thật

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | `ooxml.ts` — rút phần ZIP dùng chung | Bảng CRC32, `zipStore`, `escapeXml`, khai báo XML. `xlsxWriter` xuất lại `escapeXml`/`zipStore` nên nơi gọi cũ không phải sửa |
| ✅ | `docxWriter.ts` — HTML sang WordprocessingML | 41 test. Bắt được lỗi thứ tự thẻ `w:tblCellMar` trước `w:tblLayout` — Word sẽ từ chối mở mà python-docx vẫn đọc được, nên test đọc lại không bắt nổi |
| ✅ | Tab Soạn biểu mẫu tải `.docx`, gỡ bản `.doc` HTML | Gỡ luôn `MIME_DOC` và 138 dòng CSS `mso-` |
| ✅ | Test tích hợp tám biểu mẫu | Dựng cả màn hình, bấm nút tải, đối chiếu từng ký tự với bản xem trước. Không ghi ra đĩa |
| ✅ | Kiểm chứng bằng **python-docx** | Tám tệp mở được, A4 lề 25/20/20/30mm, khoảng ký 1500 twips, bảng dự toán kẻ khung — bảng ký thì không |

Xem §32. Giãn dòng và cỡ chữ trong bảng đổi theo **bản xem trước** (1,5 và 12pt) chứ không
theo bản `.doc` cũ (1,35 và 11pt); PDF vốn đã dùng con số của bản xem trước.

### Hai cột bản sao ngày HĐTD — đo lại thì chưa xoá được

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | `reports/10` — đo trước khi xoá cột | Bốn truy vấn: phân bố, 4 dòng lệch, **chặn xoá** (KUNN không cha mà đang dựa vào bản sao), và câu `update` cho hướng giữ cột |
| ⚠️ | Bác bỏ ghi chú "mã nguồn không đọc nữa" | Form KUNN vẫn ghi hai cột; 7 chỗ còn đọc làm đường dự phòng. §25 chỉ đổi thứ tự ưu tiên, không cắt bản sao. Xem §29 |

### Phân hệ hợp đồng thẻ — thay `CreditCards`

Bảng cũ không biểu diễn được hợp đồng thẻ: không có số hợp đồng, không có mã chính sách,
không có thẻ phụ, và ô "số thẻ" là dữ liệu banker không thể biết lúc lập hồ sơ.

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Migration 37 — `CardContracts` + `CardSupplementaryHolders` | Đã chạy và kiểm chứng: bảng cũ 0, hai bảng mới, mỗi bảng một policy RLS, `REVOKE anon` |
| ✅ | `cardContract.ts` — luật nghiệp vụ thẻ | 48 test |
| ✅ | `cardPolicyRules.ts` — 15 mã kèm luật hạn mức | 24 test. Xem §27 |
| ✅ | `api.ts` — CRUD hợp đồng thẻ và thẻ phụ | Dịch lỗi ràng buộc CSDL sang tiếng Việt; `.select()` ở `delete` để RLS chặn không báo thành công giả |
| ✅ | `creditLimit.ts` sang `CardContract` | Thẻ ghi nợ và hợp đồng đã đóng tiêu tốn **0** khả năng bảo đảm |
| ✅ | `CardContractView` thay `CreditCardView` | Mã chính sách tự lọc theo loại TSBĐ; luật hạn mức hiện ngay khi chọn mã |
| ✅ | Tab riêng `CardPolicyLookupView` | Nhóm Công cụ, dưới Tra cứu mục đích SDV |
| ✅ | Dashboard hết hiện 0 ở dòng hạn mức thẻ | Nạp `CardContracts`, cộng qua `totalCardGrantedLimit` |
| ✅ | Tab Thẻ dùng chung `selectedCustomerId` | Trước đây là tab duy nhất đứng ngoài `WorkContext` |
| ✅ | Gỡ hai chú thích trong ngoặc ở form HĐTD | `(duy nhất trong khách hàng)` và `(HĐTD)` |

**Thứ tự triển khai quan trọng và ngược với migration 36:** migration 37 `DROP TABLE
CreditCards` nên phải **sửa mã trước, chạy migration sau**. Bảy tệp đọc bảng cũ đã gỡ hết
trước khi chạy.

**Một test cũ viết lại thay vì sửa cho qua.** Nó khẳng định `clusterExposure` cộng hạn mức
cấp *chứ không cộng dư nợ thẻ*. Mô hình mới **không có** cột dư nợ thẻ nên tính chất đó do
cấu trúc bảo đảm, test mất ý nghĩa. Đổi thành ba khẳng định thật của mô hình mới: ba
thương hiệu tính một lần, thẻ ghi nợ tính 0, hợp đồng đã đóng tính 0.

### Ngày hiệu lực HĐTD và ô tra số hợp đồng

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | `computeLimitGroups` đọc ngày từ HĐTD cha | Thêm `getContractDates`, tra qua `CreditContractId`. 7 test. Xem §25 |
| ✅ | Ô tra "Số Hợp Đồng Tín Dụng" chưa bao giờ hoạt động | Nó **mở sai hồ sơ khách hàng** mà không báo gì |

Đo được 4 KUNN lệch ngày kết thúc trên 102 KUNN, trong đó **hai khoản lệch theo chiều nguy
hiểm**: bản sao dài hơn hạn thật nên hệ thống chào hạn mức trên HĐTD đã hết hiệu lực mà
không có nhãn nào.

### Gốc mỗi kỳ khai theo GNN

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Đo bước làm tròn thật của danh mục | 28 khoản nói 10.000, 0 khoản nói khác. Xem §4 |
| ✅ | Cột `MonthlyPrincipalAmount` + ô nhập + chốt chặn | Migration 36, 39 test mới. Xem §1 |
| ✅ | Nối tham số `customMonthlyPrincipal` đang chết | Có từ 30/07/2026 nhưng chưa ai truyền |
| ⬜ | Chạy migration 36 | **Chặn đường** — chưa chạy thì lưu KUNN đổ lỗi |

### Truy nguyên "tiến trình 30/07"

Nghi vấn ban đầu: `PaymentDate = 2026-07-30` đồng loạt và `ActualPaidInterest = 0`
ở toàn bộ kỳ đã thu, nghi có một tiến trình tự động ghi sai.

**Không có tiến trình nào.** Không script, không cron, không endpoint — toàn bộ lịch
sử git không có tệp nào ngoài `src/` từng ghi vào `RepaymentSchedules`; `api/` đã
kiểm chứng chưa từng được gọi; `scratch/*.py` bị xoá 30/07 chỉ đụng `Customers`,
`Collaterals` và khoá ngoại; `LoanSchedules` của WPF rỗng.

Thủ phạm là **chính nút "Đánh dấu TT"** trong bản app chạy ngày 30/07 (`7f159b8`):

```
IsPaid: !s.IsPaid, PaymentDate: !s.IsPaid ? new Date().toISOString().split('T')[0] : null
```

Nó ghi **đúng hai cột** và dập ngày bấm nút. Màn hình khi ấy **không có ô nhập số
tiền nào** — modal ghi nhận thanh toán mới sinh ra 13:43 ngày 31/07 (`b0d6de9`).

Hai hệ quả:

- `ActualPaidInterest = 0` ở mọi kỳ đã thu là **tất yếu**, không phải bí ẩn. Giả
  định "dùng thẳng `InterestAmount`" trong `reports/01` là đúng.
- `PaymentDate` của các kỳ đó là **ngày nhập liệu, không phải ngày hạch toán**.

Đo phân bố `PaymentDate` (1.064 kỳ đã thu): gần như mọi ngày có **số kỳ bằng số KUNN**
— mỗi KUNN thu một kỳ, đúng hình dạng thu nợ hàng tháng thật. Chỉ bốn ngày lệch khuôn:

| Ngày | Số kỳ | Số KUNN |
| :--- | ---: | ---: |
| 2026-07-31 | 162 | 6 |
| 2026-07-30 | 158 | 9 |
| 2025-06-16 | 13 | 3 |
| 2024-09-24 | 2 | 1 |

Vùng nghi vấn vì thế **không phải 898 kỳ mà là 320 kỳ trên 15 KUNN**.

Kiểm chứng quyết định (`reports/09` phần 2–3): **0 kỳ nào bị tích khi ngày đến hạn
còn ở tương lai**, tiền gốc khai khống = 0. Nghĩa là hôm đó banker **nạp lịch sử trả
nợ của các khoản cũ** — nghiệp vụ đúng, chỉ `PaymentDate` là rác.

Sáu KUNN đối chiếu được đều `IsSettled = false` và mới tích kỳ 1→37 của khoản 84 kỳ
— đúng hình dạng nạp lịch sử một phần. Dư nợ khớp, lệch 15.000–259.000đ ở bốn khoản
do `CurrentBalance` được lưu **trước** khi migration 18 làm tròn lại gốc từng kỳ.
Không phải tiền mất — nhưng khẳng định `CurrentBalance` là **giá trị dẫn xuất bị
đóng băng**, nguồn đúng là Σ gốc các kỳ đã thu.

⚠️ Còn 9 KUNN chưa đối chiếu được vì bị INNER JOIN loại — cần kiểm xem có phải kỳ
mồ côi trỏ tới khoản vay đã xoá.

### Bảng tính hạn mức — dựng lại theo đúng hình dạng bảng tính HM

Bản đầu là form xếp dọc từng khối, gắn khách hàng, gắn HĐTD và lưu vào cơ sở dữ liệu.
Banker phản hồi: nhập phải cuộn lên cuộn xuống, mất hẳn cái lợi của bảng tính; và
đây chỉ là **công cụ nhập liệu cho tờ trình**, không liên quan hồ sơ tín dụng.

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Giao diện dựng lại theo lưới hai cột | Năm khối đúng vị trí file gốc. Khối `b` và `c` trong **cùng một bảng** để cột `Đvt` thẳng hàng; `table-fixed` + `colgroup` |
| ✅ | Bỏ lưu trữ, bỏ chọn khách hàng và HĐTD | Migration 34 xoá `BusinessPlans`, `BusinessPlanDebts` và hai hàm kèm theo. Đo trước khi xoá: 0 phương án / 0 dòng dư nợ; sau khi xoá không bảng nào hở RLS |
| ✅ | Kỳ kế hoạch dự phóng theo hệ số | `planDriversOf`, mặc định 1,5. Gõ đè từng dòng qua `planOverrides`; gõ đè bằng 0 là con số thật. Lãi vay **không** nhân hệ số |
| ✅ | Giá vốn nhập bằng số tiền | Mọi cột `%/DT` và `Tăng/giảm` thành công thức. Không còn ô phần trăm nào ngoài lãi suất từng khoản vay và trần DTI |
| ✅ | Số trong bảng phân cách nhất quán | `MoneyCell` giữ chuỗi đang gõ trong state riêng, định dạng lại khi rời ô |

Hai hệ quả đã chấp nhận: đóng tab là mất số đã nhập, và khả năng bảo đảm của TSĐB
thành ô nhập tay vì không còn khách hàng để `totalUsableCapacity` đọc tài sản.

Ba phụ lục xuất ra **không đổi một dòng nào**.

### Dọn tàn dư WPF

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Migration 35 xoá sáu bảng WPF | Xem §6 |
| ✅ | Gỡ nhánh đọc `[RATE_HISTORY:` từ `Note` | Migration 24 đã dọn dữ liệu về 0; `LoanContracts.RateHistory` là cột thật của 18 KUNN |
| ✅ | Ghi bảng ánh xạ WPF ↔ web vào `CONVENTIONS.md` §13 | Kèm cảnh báo WPF đi vòng qua RLS |
| ✅ | Sửa bốn mục tài liệu ghi sai trạng thái | `[PENALTY_RATE:` ghi ⚠️ chờ quyết định trong khi migration 29 đã xong; `PostLoanControls` và migration 26 ghi chưa chạy trong khi database đã sạch |

## 09/08/2026

### Tab Khách hàng — lưu trữ hồ sơ và ba lỗi ở nút xoá

Câu hỏi ban đầu: tách hồ sơ khách hàng đã tất toán ra khỏi danh sách. Chốt lại là
**không** kéo dư nợ vào tab Khách hàng — nó là danh bạ hồ sơ, thêm KUNN và HĐTD vào
là biến nó thành bản sao của tab Khoản vay. Vì vậy trạng thái này là **cờ thủ công**
trên chính hồ sơ, và cố ý gọi là "lưu trữ" chứ không phải "đã tất toán".

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Migration 32 — `Customers.ArchivedAt` | Một cột mang cả cờ lẫn ngày. `NULL` là đang làm việc. Kiểm chứng: `timestamptz`, nullable, 49 đang làm việc / 0 đã lưu trữ |
| ✅ | `customerStatus.ts` | Lọc và đếm ba nhóm, 17 test |
| ✅ | Bộ lọc ở tab Khách hàng | *Đang làm việc / Đã lưu trữ / Tất cả*, mặc định nhóm đầu, kèm số đếm |
| ✅ | Chốt chống trôi cờ ở `api.ts` | `saveContractAPI` và `saveCreditContractAPI` tự xoá `ArchivedAt` khi ghi hợp đồng cho khách đang lưu trữ |
| ✅ | Nút xoá KH — sửa ba lỗi | Xem §23 |
| ✅ | Ràng buộc số liệu trên hồ sơ | CCCD 12 số, CMND 9 số, điện thoại 10 số, áp cho cả trường KHLQ. Chặn hai tầng: ô nhập không gõ thừa được, lúc lưu gom đủ mọi lỗi một lượt. 23 test. Đo trước khi đặt luật: 14/14 CCCD và 11/11 điện thoại đều đúng chuẩn |
| ✅ | Điện thoại và số tài khoản nhận nhiều số | Tách theo `;` `,` `/` `\|` và xuống dòng, gom về `" / "`. Luật 10 số áp cho **từng số**. CCCD vẫn một giá trị |
| ✅ | Tờ chào lãi suất — bỏ dòng đối tượng lặp và khối phạm vi | Tiêu đề đã ghi "dành cho KHCN" |
| ✅ | Tờ chào lãi suất — tên file theo chuẩn | `LS NGAN HAN KHCN` · `LS TDH KHCN` · `LS HUY DONG`. Tên đi vào `<title>` nên hộp thoại in gợi ý đúng tên PDF |
| ✅ | Tờ chào lãi suất — xuất ra hình ảnh | `htmlToPng.ts` dùng `<foreignObject>` + canvas, không thêm thư viện ngoài. Ảnh **luôn đúng khổ A4**. Bản đầu bị cắt vì bộ định dạng khai trên `body` mà trong `foreignObject` không có `body`; sửa bằng lớp `.rate-sheet-root`. 13 test |
| ✅ | Migration 33 — `CreditContractId` đổi sang `ON DELETE RESTRICT` | Migration 14 đặt `SET NULL`, migration 23 đặt `SET NOT NULL` — nhánh `SET NULL` **không bao giờ chạy được**, chỉ để lại lỗi 23502 tiếng Anh |
| ✅ | `deleteContractAPI` thêm `.select()` | Cùng lỗi #3 của nút xoá KH |
| ✅ | Dịch lỗi 23503 sang tiếng Việt | `deleteCreditContractAPI` nêu đúng số KUNN đang vướng |

Chốt chống trôi áp cho **cả sửa lẫn tạo mới**: sửa một KUNN của khách đang lưu trữ
cũng là đang làm việc với khách đó, cờ lúc ấy đã sai rồi. Kiểm chứng có chủ đích:
lưu trữ → lưu HĐTD → cờ tự bỏ (48/1 → 49/0).

Tên khoá ngoại do Postgres tự đặt lúc `ADD COLUMN ... REFERENCES` nên migration 33
**tra theo quan hệ rồi mới xoá**, không viết cứng tên vào script.

### Phương án kinh doanh & Hạn mức — thay bộ bốn file Excel

Banker đang dùng `BẢNG TÍNH HM.xlsx` làm bảng làm việc và ba file `TINH HINH TAI CHINH`,
`KET QUA KINH DOANH`, `CapHanMucTinDung` làm phụ lục — nhưng ba phụ lục chỉ là **liên
kết ngoài** trỏ về bảng gốc, và đã trôi khỏi nhau: phụ lục KQKD giữ doanh thu 908
trđ/tháng trong khi bảng gốc hiện chỉ còn 128. Trong hệ thống là một nguồn dữ liệu,
ba bản in. Đối tượng là **khách hàng cá nhân và hộ kinh doanh**, không phải doanh nghiệp.

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | `businessPlan.ts` — toàn bộ công thức | 43 test. Hai kỳ đi qua **cùng một hàm** `computePeriod` nên không thể lệch công thức như file gốc |
| ✅ | `xlsxWriter.ts` — sinh tệp .xlsx thật | ZIP dạng store + CRC32 tự tính, sáu thành phần OOXML kể cả `styles.xml`. Không thêm thư viện ngoài. 30 test, kiểm chứng bằng cách cho **openpyxl** đọc lại tệp sinh ra |
| ✅ | Định dạng phụ lục khớp bản gốc | Times New Roman 11, kẻ khung toàn bộ, tiêu đề tô nền `DCE6F1`, `#,##0` · `0%` · `#,##0.0`, độ rộng riêng từng cột |
| ✅ | `businessPlanExport.ts` — ba phụ lục | 27 test trên **mô hình dòng**, không trên chuỗi HTML. Nguyên văn nhãn từng dòng (kể cả `b6` ghi "Chi phí khác" nhưng nạp khấu hao), nguyên văn tiêu đề cột (kể cả dấu cách cuối ở `"Tăng/giảm "`). Đã phạm một lần và sửa lại trong ngày |
| ✅ | Tab **Phương án kinh doanh** | Hai chế độ, đơn vị nhập trđ/đồng đổi được, 4 test dựng màn hình |
| ✅ | Rút `totalUsableCapacity` về `collateralMath.ts` | Đã có 4 chỗ cùng `reduce(usableCapacity)`; gom trước khi thêm chỗ thứ năm |

**Bảy lỗi của file Excel gốc, đã sửa trong hệ thống:**

| # | Lỗi trong file | Cách xử lý |
| :--- | :--- | :--- |
| 1 | `D27 = D18+D23+F24` cộng **Vốn góp** (khoản mục nguồn vốn) vào Tổng tài sản. Không lộ ra vì vốn chủ sở hữu là số dư nên hai vế vẫn cân | Bỏ hẳn Vốn góp khỏi đầu vào. Phụ lục vẫn in dòng đó, giá trị 0 |
| 2 | Lãi vay có **hai con số không khớp**: `D6` = 48 trđ tính từ bảng dư nợ, còn dòng lãi vay trong bảng chi phí để 0 nhập tay | Bảng `BusinessPlanDebts` là nguồn duy nhất |
| 3 | LNTT hai kỳ **hai công thức khác nhau**: `E7 = E3-E4-E5-E6-J19-J21` bỏ sót chi phí mặt bằng và chi phí khác | Hai kỳ dùng chung `computePeriod`, có test khoá |
| 4 | `D3 = D10*3,4` rồi `D13 = D3/D10 = 3,4` — vòng quay là giả định gõ tay chạy ngược | Doanh thu là đầu vào, vòng quay tính ra |
| 5 | Lãi suất 8%/năm nhúng cứng trong `*8/100/12` | Lãi suất theo từng khoản vay |
| 6 | `ROUNDUP(.../12,0)` làm tròn lên tới hàng triệu ở từng dòng rồi lấy số đã tròn đi tính tỷ trọng và nhân ngược ×12 | Tính trên số gốc, chỉ làm tròn khi hiển thị |
| 7 | `SUM(C4:C8)` của phụ lục KQKD cộng thiếu dòng chi phí cuối | Tổng gộp đủ bảy dòng, có test |

**Một tính chất phát hiện khi viết test:** `Tổng nhu cầu vốn bằng tiền` **không phụ
thuộc lãi vay**. Rút gọn `c1 = DTT − KH − LV − LNTT` ra đúng
`giá vốn + nhân công + mặt bằng + điện nước + chi phí khác` — tức các khoản chi bằng
tiền, đúng như tên gọi. Hệ quả: lỗi #2 làm sai lợi nhuận trình lên nhưng **không**
làm sai hạn mức. Đã khoá bằng test.

**Thêm cho khách hàng cá nhân, bảng Excel gốc không có:** khối thu chi hộ gia đình
(thu nhập ngoài kinh doanh, chi phí sinh hoạt, nghĩa vụ nợ đang trả, trần DTI).
Nguồn trả nợ = `(LNST + khấu hao)/12 + thu nhập khác − chi phí sinh hoạt`, đưa qua
`dtiMaxMonthlyPayment` rồi quy ra hạn mức bằng `pvAnnuityFactor` — cả hai hàm đã có
sẵn. `MaxDtiPercent = 0` nghĩa là **chưa khai**, và khi đó khả năng vay theo dòng
tiền trả về 0 chứ không suy đoán. Trần mặc định 60% ở `DEFAULT_MAX_DTI_PERCENT`.

**Không có cột khả năng bảo đảm của TSĐB.** Con số đó tính bằng `totalUsableCapacity`
từ chính tài sản của khách và tụt về 0 khi định giá hết hiệu lực; lưu lại là đóng
băng một bản sao — đúng kiểu sai lầm mà ba phụ lục Excel đang mắc.

Kiểm chứng trên trình duyệt thật: tạo phương án cho LÊ NGỌC QUẾ HÂN, đối chiếu tay
toàn bộ số (tổng chi phí 81 trđ/tháng, LNTT 19 trđ/tháng, nhu cầu vốn bằng tiền 852
trđ, vòng quay 2,7 vòng, nhu cầu một vòng 319,5 trđ), lưu xuống Supabase rồi nạp lại
đúng số. **Bản thử đã xoá khỏi cơ sở dữ liệu.**

## 07/08/2026

### Thẻ tín dụng — ba trường hợp mở thẻ

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Thẻ vào chốt kiểm soát TSĐB | Trước đó `checkCollateralCapacity` chỉ nhận `LoanContract[]`; thẻ tiêu tốn 0đ khả năng bảo đảm nên chốt báo xanh trong khi cụm đã vượt trần |
| ✅ | Trần sản phẩm 90% cho thẻ trên sổ tiết kiệm | `CARD_STK_LTV_PERCENT`, cố ý đè bảng LTV cho vay |
| ✅ | Chặn lưu khi vượt trần, mở bằng ô xác nhận ngoại lệ | Cột riêng `IsLtvException` / `LtvExceptionReason`, migration 27 |
| ✅ | Gỡ bản LTV thứ tư trong `CreditCardView` | Nó nhận cả định giá hết hiệu lực, khác `usableCapacity` |
| ✅ | Sửa `saveCreditCardAPI` không gỡ được liên kết TSBĐ | `if (dbPayload.CollateralId)` là kiểm falsy nên gán `null` không lưu |
| ✅ | Sửa cấp thẻ mới luôn hỏng | Cột `Limit` `NOT NULL` không bao giờ được ghi — cấp thẻ từ web chưa từng chạy |

### Sự cố: nút Đồng bộ kỳ cuối làm hỏng dữ liệu

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Gỡ hẳn nút và mục Bảo trì dữ liệu | Nó lấy `ContractEndDate` (hạn HĐTD) làm ngày đáo hạn KUNN |
| ✅ | Gỡ quy tắc kéo kỳ cuối về ngày đáo hạn | Quy tắc sai, do đọc ngược bằng chứng — xem `CONVENTIONS.md` §2 |
| ✅ | Gỡ cùng fallback đó khỏi đường lưu bình thường | Hai chỗ trong `LoanPortfolioView`, hỏng cả khi không bấm nút |

### Lịch thu nợ

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Rút công thức nghĩa vụ kỳ về `scheduleView.ts` | Ba bản trong `.tsx` đã trôi dạt: kỳ miễn phạt cho dòng và tổng cột lệch nhau |
| ✅ | Bố cục hai cột từ `xl`, phiếu chi tiết bám theo | |
