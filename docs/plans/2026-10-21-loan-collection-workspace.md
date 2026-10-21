# Quản lý khoản vay và thu nợ

**Mục tiêu:** Giao diện khoản vay liền menu phụ, bảng trả nợ đủ chiều rộng; bộ lọc HĐTD và ngày/lãi phạt hoạt động nhất quán; thu nhanh có lựa chọn trễ 1–9 ngày.
**Phạm vi:** LÀM: bố cục, gọn thanh khách hàng, chi tiết kỳ bên dưới; đồng bộ ngày thu ↔ số ngày quá hạn, phân cách tiền; tính đủ hai cấu phần phạt khi mở hộp và theo ngày đang xét; lựa chọn ngày thu nhanh, xác nhận cả phạt; lọc cả danh sách và KUNN đang xem. KHÔNG LÀM: migration, thay quyền, tự ghi thu nợ hoặc sửa dữ liệu thật, đổi công thức Actual/365 hoặc chính sách lãi.
**Tệp dự kiến chạm:** chia nhóm: lib/paymentCollection và scheduleView + unit test; hooks/usePaymentModal/useCustomerPortfolio/useLoanPortfolioController; components/portfolio (PaymentModal, ScheduleTab, PeriodDetailCard, bộ lọc/tìm KH), LoanPortfolioView và AppLayout; các test tích hợp.
**Tầng:** lib tính ngày/tiền và kiểm tra đầu vào; hooks điều phối dự thảo và lưu; components hiển thị. Giữ API hiện có.
**Kiểm chứng bằng gì:** test đỏ trước cho phạt kỳ chỉ lãi, hệ số 0, ngày qua tháng/năm, mở hộp và sửa hai chiều, dữ liệu thu trước đó, thu nhanh trễ 1–9 ngày, bỏ kỳ tương lai/đã thu/thu một phần, tổng gốc sau tính lại bằng tiền vay; test lọc hai HĐTD và KUNN đang xem; toàn bộ Vitest/build; browser fixture không ghi production.
**Rủi ro đã biết:** ActualPaidInterest đang bao gồm lãi phạt (schedulePaymentStatus); không cộng phạt hai lần. OverdueInterestAmount=0 mặc định của kỳ chưa ghi nhận không chứng minh miễn phạt. Chứng từ đã thu giữ ngày/phạt đã chốt; không hồi tố theo hôm nay. Thu nhanh không được ghi đè thu một phần hoặc tạo ngày thu tương lai. Số ngày lấy từ ngày lịch, không giờ trong ngày.

## Hướng trình bày

Giữ font/token hiện có: sáng #FFFFFF/#0A192F, tối #0A1628/#F0F6FC, viền #C4D1E3/#1E3557, accent #004CB8/#38BDF8. Một vùng nội dung liên tục với menu phụ, đường kẻ chia nhóm, không khung bo góc lớn lồng nhau. Thanh khách hàng chung giữ nhận diện; tìm kiếm nâng cao thu gọn khi đã chọn KH. Tổng mức cấp và HĐTD dùng thanh công cụ ngắn. Bảng lịch trả nợ toàn chiều rộng, bảng chi tiết kỳ nằm dưới. Nút và nhãn theo quy ước chung; chỉ thêm lựa chọn phục vụ sáu yêu cầu.

## Kết quả đọc mã trước khi sửa

- usePaymentModal.open chỉ tính phạt gốc; PaymentModal.onChange tính cả phạt gốc và chậm trả lãi; hai nơi không thống nhất và bỏ hệ số phạt riêng.
- Sửa số ngày chỉ tính phạt, không đổi ngày thu; khi đổi ngày tự gán số tiền thô chưa định dạng.
- resolvePenaltyDue coi 0 mặc định là số chốt, chỉ trả principalPenalty khi tự tính. overdueDaysOfSchedule ưu tiên số lưu kể cả kỳ chưa thu.
- Bộ lọc không cập nhật KUNN đang xem ở tab lịch; sentinel không HĐTD dùng hai cách viết khác nhau.
- Luồng tìm số HĐTD chỉ dò số KUNN; không tra CreditContracts nếu số HĐTD không xuất hiện trong số KUNN.

## Hành vi sau sửa

- Số ngày tại màn theo dõi lấy từ ngày đang xét, cập nhật khi qua ngày hoặc cửa sổ được focus. Kỳ chưa ghi nhận thu tính đủ phạt gốc và phạt chậm trả lãi; hệ số phạt gốc 0 vẫn được giữ. Số 0 mặc định ở kỳ chưa ghi nhận không được coi là chứng từ miễn phạt.
- Kỳ có chứng từ thu (IsPaid, PaymentDate hoặc số thực thu) giữ số phạt đã chốt, kể cả 0. Mở chứng từ ưu tiên ngày thu; chứng từ cũ không có ngày thì suy ra từ ngày đến hạn và số ngày đã lưu. Sửa ngày hoặc số ngày chủ động tính lại phạt và đồng bộ ngày còn lại.
- ActualPaidInterest là tổng lãi thực thu, gồm phạt, đúng với schedulePaymentStatus hiện có. Nhãn ô thu ghi rõ ý nghĩa. Tổng nghĩa vụ là gốc lịch + lãi lịch + phạt; không cộng lại lãi thực thu như một khoản nghĩa vụ.
- Thu nhanh ở trang lịch trả nợ có đúng hạn hoặc trễ 1–9 ngày: ngày ghi nhận = ngày đến hạn + số ngày chọn. Chỉ thu kỳ chưa ghi nhận và ngày ghi nhận không nằm tương lai; không ghi đè thu một phần. Xác nhận liệt kê ngày/phạt từng kỳ và tổng phạt. Helper thu nhanh riêng trên Dashboard giữ nguyên quy tắc hiện có.
- Đọc lịch mới trước thu nhanh; sau xác nhận đối chiếu lại trước ghi. Sau mọi lần lưu, đọc lại và so ngày, trạng thái, số tiền từng kỳ trước khi báo thành công/cập nhật dư nợ.
- Đổi HĐTD trong tab lịch chọn KUNN thuộc HĐTD mới, xóa lịch cũ ngay và bỏ phản hồi nạp trễ; HĐTD rỗng quay về danh sách rỗng. Nhóm không HĐTD dùng cùng một khóa cho nhóm và lọc.

## Kiểm chứng

Vitest 4.682 test/369 tệp đạt; production build đạt. Edge localhost 1440/390, sáng/tối: bố cục liền menu, không tràn trang, chi tiết kỳ dưới bảng; mở hộp có tiền phạt đã phân cách; nhập 9 ngày cho ngày 24/10/2026, đổi ngày 18/10/2026 cho 3 ngày; đổi HĐTD chuyển đúng KUNN; thu nhanh trễ 3 ngày ghi 18/10/2026 và phạt dương, không ghi kỳ tương lai. Toàn bộ Supabase được giả lập trong browser; không ghi production.

## Hành vi sau sửa

- Số ngày tại màn theo dõi lấy từ ngày đang xét, cập nhật khi qua ngày hoặc cửa sổ được focus. Kỳ chưa ghi nhận thu tính đủ phạt gốc và phạt chậm trả lãi; hệ số phạt gốc 0 vẫn được giữ. Số 0 mặc định ở kỳ chưa ghi nhận không được coi là chứng từ miễn phạt.
- Kỳ có chứng từ thu (IsPaid, PaymentDate hoặc số thực thu) giữ số phạt đã chốt, kể cả 0. Mở chứng từ ưu tiên ngày thu; chứng từ cũ không có ngày thì suy ra từ ngày đến hạn và số ngày đã lưu. Sửa ngày hoặc số ngày chủ động tính lại phạt và đồng bộ ngày còn lại.
- ActualPaidInterest là tổng lãi thực thu, gồm phạt, đúng với schedulePaymentStatus hiện có. Nhãn ô thu ghi rõ ý nghĩa. Tổng nghĩa vụ là gốc lịch + lãi lịch + phạt; không cộng lại lãi thực thu như một khoản nghĩa vụ.
- Thu nhanh ở trang lịch trả nợ có đúng hạn hoặc trễ 1–9 ngày: ngày ghi nhận = ngày đến hạn + số ngày chọn. Chỉ thu kỳ chưa ghi nhận và ngày ghi nhận không nằm tương lai; không ghi đè thu một phần. Xác nhận liệt kê ngày/phạt từng kỳ và tổng phạt. Helper thu nhanh riêng trên Dashboard giữ nguyên quy tắc hiện có.
- Đọc lịch mới trước thu nhanh; sau xác nhận đối chiếu lại trước ghi. Sau mọi lần lưu, đọc lại và so ngày, trạng thái, số tiền từng kỳ trước khi báo thành công/cập nhật dư nợ.
- Đổi HĐTD trong tab lịch chọn KUNN thuộc HĐTD mới, xóa lịch cũ ngay và bỏ phản hồi nạp trễ; HĐTD rỗng quay về danh sách rỗng. Nhóm không HĐTD dùng cùng một khóa cho nhóm và lọc.

## Kiểm chứng

Vitest 4.682 test/369 tệp đạt; production build đạt. Edge localhost 1440/390, sáng/tối: bố cục liền menu, không tràn trang, chi tiết kỳ dưới bảng; mở hộp có tiền phạt đã phân cách; nhập 9 ngày cho ngày 24/10/2026, đổi ngày 18/10/2026 cho 3 ngày; đổi HĐTD chuyển đúng KUNN; thu nhanh trễ 3 ngày ghi 18/10/2026 và phạt dương, không ghi kỳ tương lai. Toàn bộ Supabase được giả lập trong browser; không ghi production.
