---
id: hop-dong-tin-dung
tieuDe: Hợp đồng tín dụng (HĐTD)
moTa: Hạn mức, khả dụng giải ngân, hiệu lực, số KUNN, đóng và xóa HĐTD, quy tắc sản phẩm
nhom: Hồ sơ tín dụng
tuKhoa: [hợp đồng tín dụng, hdtd, hạn mức, khả dụng giải ngân, kunn, số kunn, đóng hdtd, xoay vòng, cho vay từng lần]
trang: [/credit-contracts]
nguon: [src/lib/creditContract.ts, src/lib/loanProductRules.ts, src/lib/kunnForm.ts, src/hooks/useCreditContractController.ts, src/components/creditContract/CreditContractFormModal.tsx, src/components/creditContract/KunnAccordionItem.tsx]
---
# Hợp đồng tín dụng

Chọn "Khách hàng tác nghiệp" để xem HĐTD của khách; "TẠO HỢP ĐỒNG" để thêm. Mỗi HĐTD hiện Hạn mức cấp, Dư nợ hiện tại, Khả dụng giải ngân và bảng khoản vay (KUNN).

## Tạo và sửa
- Bắt buộc có số HĐTD và ít nhất một tài sản bảo đảm.
- Các ô: Phương thức cho vay, Hạn mức cấp, Thời hạn vay tối đa (tháng, không bị kiểm), ngày hiệu lực và hết hạn, Mục đích sử dụng vốn.
- "Khả năng bảo đảm" tính theo tài sản đang chọn trong form (chỉ tài sản còn hiệu lực định giá), bằng 0 khi chưa chọn. "Tỷ lệ bảo đảm" = khả năng đó / tổng hạn mức các HĐTD của khách. "Thiếu TSBĐ" chỉ cảnh báo, không chặn lưu, và chỉ hiện khi khả năng lớn hơn 0 và hạn mức nhập vượt nó.

## Khả dụng giải ngân
- Hạn mức xoay vòng (Hạn mức tín dụng, Hạn mức thẻ tín dụng): hạn mức trừ dư nợ các KUNN chưa tất toán; tất toán xong dùng lại được.
- Loại khác (Cho vay từng lần, Cầm cố sổ tiết kiệm): hạn mức trừ tổng đã giải ngân, kể cả khoản đã tất toán; hết là hết.
- Khả dụng bằng 0 khi HĐTD đã đóng, hết hiệu lực, chưa hiệu lực hoặc hết hạn mức.
- Trạng thái: ĐÃ ĐÓNG, HẾT HIỆU LỰC, CHƯA HIỆU LỰC, SẮP HẾT HẠN (còn ≤ 30 ngày), ĐANG HIỆU LỰC.

## Đóng và xóa
Chỉ đóng ("Tất toán HĐTD") được khi mọi KUNN đã tất toán; "Mở lại HĐTD" cho giải ngân tiếp. Chỉ xóa được HĐTD không còn KUNN nào (kể cả đã tất toán) và không nằm trong HĐTC.

## Số KUNN và giải ngân
"Giải ngân từ HĐTD" điền sẵn số KUNN dạng số HĐTD/GNN-01, GNN-02… = số KUNN đã có cộng 1; đã xóa bớt KUNN thì số gợi ý có thể trùng. Trùng số (không phân biệt hoa thường) thì không lưu được.
Nút khóa khi HĐTD đóng, hết hoặc chưa hiệu lực, hay hết khả dụng; HĐTD đã đóng cũng không chọn được trong form KUNN. Chỉ cảnh báo: giải ngân ngoài thời gian hiệu lực, kỳ hạn KUNN ngoài khoảng của sản phẩm. KUNN đáo hạn sau ngày hết hiệu lực HĐTD thì sau khi tất toán không giải ngân lại được.

## Quy tắc theo sản phẩm
- Hạn mức tín dụng: xoay vòng, mục đích cố định Kinh doanh; thông lệ HĐTD 12 hoặc 24 tháng, mỗi KUNN 3 đến 12 tháng.
- Cho vay từng lần: không xoay vòng, kỳ hạn 60 đến 360 tháng, ân hạn gốc 6, 12, 15, 18, 24 hoặc 36 tháng; mục đích tiêu dùng, xây sửa nhà, mua bất động sản, mua nhà hình thành trong tương lai.
- Kỳ hạn KUNN ngoài khoảng: cảnh báo cần phê duyệt ngoại lệ.
