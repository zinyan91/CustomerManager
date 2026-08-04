# Tiến độ công việc

Cập nhật: 05/08/2026

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
| 🕐 | Bật chính sách mật khẩu Supabase | Hoãn theo quyết định 03/08/2026. Mốc cần làm: **trước khi cấp tài khoản cho nhân viên thật**. Tối thiểu 12 ký tự + Leaked Password Protection |
| 🕐 | Xoá tài khoản thử nghiệm `abc@gmail.com` | Hoãn theo quyết định 03/08/2026. Đây là tài khoản đang hoạt động, mật khẩu yếu, có quyền xem hồ sơ khách hàng thật — khác với hạng mục gia cố ở trên. Nên xử lý khi kết thúc đợt kiểm thử |

## Chất lượng dữ liệu

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Trả việc sinh ID về cho database | Bỏ `max(Id)+1` ở client, đồng bộ sequence |
| ✅ | Đưa dữ liệu nghiệp vụ từ `Note` về cột riêng | 39 hợp đồng, đối chiếu từng dòng với bản sao lưu |
| ✅ | Sửa kiểu cột `CreditCards.IssuanceType` | Cột số nhận chuỗi mô tả nên diện mở thẻ mất mỗi lần lưu |
| ✅ | Gỡ nhánh đọc số HĐTD từ `HdtdDueDate` | Tàn dư thiết kế cũ |
| ✅ | Lịch sử định giá TSĐB | Bảng `CollateralAppraisals` kèm trigger đồng bộ giá trị hiện hành. Đã nạp 55 dòng từ dữ liệu hiện có. Ghi nhận định giá lại qua màn hình Kiểm soát sau vay |
| ✅ | Chỉnh LTV của hai tài sản lệch bậc phân loại | Đã kiểm chứng 04/08/2026: 55 tài sản, mỗi xếp loại chỉ còn một giá trị LTV duy nhất (Loại 1 80% · Loại 2 70% · Loại 3 60% · Loại 4 55%) |
| ⬜ | Xoá bảng `_backup_LoanContracts_Note_20260803` | Sau vài ngày chạy ổn |
| ⬜ | Xoá bảng `PostLoanControls` kế thừa từ WPF | Rỗng và chỉ có 4 cột (`Id`, `CustomerId`, `LastControlDate`, `Result`), không biểu diễn được ba loại kiểm tra theo kỳ nên đã tạo bảng mới thay thế |

## Lỗi tính tiền đã sửa

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | LTV 0% bị đổi thành 80% | `parseFloat('0') \|\| 80`; tài sản hạn chế nhận thành bậc cao nhất |
| ✅ | Gộp 4 bản `getEffectiveLtv` | Cùng một tài sản cho ba hạn mức khác nhau ở ba màn hình |
| ✅ | Trừ đôi tiền trả trước hạn | Tổng gốc thu về hụt so với số cho vay |
| ✅ | Trả trước hạn mất trắng khi kỳ đã tất toán | Dư nợ không giảm |
| ✅ | Phương thức vay đè lên lựa chọn trả gốc | Giao diện ghi "trả đều" nhưng gốc mọi kỳ bằng 0 |
| ✅ | Cộng đôi hạn mức khi nhiều HĐTD chung một HMTD | Thêm tầng `CreditLimitCode` |
| ✅ | Báo động giả khi so mức cấp gốc với TSĐB ở vay từng lần | Vay từng lần phải đối chiếu theo **dư nợ hiện hữu**; hạn mức tín dụng mới đối chiếu theo mức cấp |
| ✅ | Định giá hết hiệu lực vẫn được tính vào khả năng bảo đảm | Định giá chỉ có hiệu lực 6/12/24 tháng; hết hạn thì khả năng bảo đảm bằng 0 và báo cần định giá lại |

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
| ✅ | Công cụ 1 — cột ngày bắt đầu và LS áp dụng từng kỳ | Có ở cả bảng trên màn hình, bản Excel và bản in |
| ✅ | Xoá tài sản bảo đảm | Chặn khi tài sản đang thế chấp cho khoản vay |
| ✅ | Luồng trình ngoại lệ cho tài sản hạn chế nhận | Cảnh báo + nhãn `⚠ NGOẠI LỆ` |
| ✅ | Chốt kiểm soát tổng mức cấp so với TSĐB | Xét theo cụm liên thông hợp đồng ↔ tài sản |
| ✅ | Tầng hạn mức dùng chung cho nhiều HĐTD | `CreditLimitCode` + `CreditLimitAmount` |
| ✅ | Quy tắc sản phẩm theo phương thức vay | Mục đích, kỳ hạn, ân hạn gốc |
| ✅ | Đồng bộ nhãn xếp loại TSĐB | Loại 1–4 và Hạn chế, bỏ tiền tố BĐS và phần trăm trong ngoặc, dùng chung ở Dashboard, bảng TSĐB, thẻ tín dụng |
| ✅ | Phân hệ Kiểm soát sau vay | Ba loại kiểm tra, lịch sinh tự động, ghi nhận kết quả, định giá lại ngay trong đợt kiểm tra hiện trạng tài sản. 29 test cho phần lõi |
| ⬜ | Màn hình quản trị người dùng | **Bắt buộc qua Edge Function** — không đưa `service_role` key vào frontend |

## Kỹ thuật

| | Việc | Ghi chú |
| :--- | :--- | :--- |
| ✅ | Tách logic tài chính ra `src/lib/` dạng hàm thuần | Công cụ 1 bóc thêm `buildLoanSchedule` (calcMath), `scheduleDocHtml`, `printHtmlDoc` — component chỉ còn JSX |
| ✅ | 613 test cho logic tính tiền | `src/lib/__tests__/`. Bất biến Σ(gốc) = số tiền vay được khoá ở mọi tổ hợp: ân hạn, gốc cuối kỳ, nhiều lần trả trước hạn, rút ngắn kỳ hạn, lùi ngày trả nợ |
| ✅ | Gom kiến thức vào `CONVENTIONS.md` và skill `tin-dung` | Mã nguồn không còn chú thích |
| ✅ | Viết lại `README.md` và `web_migration_plan.md` khớp thực tế | |
| 🔄 | Tách nhỏ `LoanPortfolioView` | Còn khoảng 2.200 dòng. Đã bóc hết logic tài chính; phần còn lại là JSX |
| ⬜ | Test cho thành phần giao diện | Hiện chỉ có test logic thuần |
| ⬜ | Đồng bộ realtime, bộ nhớ đệm client | Có trong kế hoạch ban đầu, chưa làm |
| ⬜ | Tên miền riêng | |


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
