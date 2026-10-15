---
id: the-tin-dung
tieuDe: Thẻ tín dụng (hợp đồng thẻ)
moTa: Lập hợp đồng thẻ, số HĐ thẻ, mã chính sách, hạn mức, thẻ phụ, thẻ ghi nợ, đóng hợp đồng
nhom: Hồ sơ tín dụng
tuKhoa: [thẻ tín dụng, hợp đồng thẻ, thẻ phụ, thẻ ghi nợ, mã chính sách thẻ, hạn mức thẻ, số hợp đồng thẻ, nat]
trang: [/credit-cards]
nguon: [src/lib/cardContract.ts, src/lib/cardPolicyRules.ts, src/hooks/useCardContractController.ts, src/components/views/CardContractView.tsx, src/components/card/CardContractModal.tsx]
---
# Thẻ tín dụng

Chọn "Khách hàng tác nghiệp" để xem hợp đồng thẻ của khách; "Thêm hợp đồng thẻ mới" để mở thẻ tín dụng hoặc thẻ ghi nợ. Dòng "Tổng hạn mức thẻ tín dụng đã cấp" cộng hạn mức của các hợp đồng chưa đóng; thẻ ghi nợ tính 0.

## Form hợp đồng thẻ
- Số HĐ Thẻ bắt buộc đúng dạng NAT/năm 4 số/số thứ tự, ví dụ NAT/2026/001, và không trùng hợp đồng khác (không phân biệt hoa thường).
- Chủ thẻ chính: Khách hàng hoặc Khách hàng liên quan (vợ/chồng), kèm họ tên.
- Sản phẩm thẻ đăng ký: chọn ít nhất một trong Vietbank Mastercard Lifecare, Mastercard Happy, Visa Luxury, Visa My Style, Napas (thẻ tín dụng) và Thẻ ghi nợ ATM.
- Phân loại TSBĐ cho thẻ: Không có TSBĐ; TSBĐ bằng tiền gửi tại Vietbank; Khoản cấp tín dụng có TSBĐ (BĐS, xe…). Loại "Khoản cấp tín dụng có TSBĐ" bắt buộc gán tài sản; loại tiền gửi thì không bắt buộc.
- Mã chính sách phát hành thẻ: bắt buộc với thẻ tín dụng. Mỗi mã chỉ áp cho một loại TSBĐ; chọn lệch loại thì báo lỗi bảo chọn lại mã hoặc loại. Nguồn chính sách là Quyết định 1017/2025/QĐ-TGĐ, tra ở màn Tra cứu chính sách thẻ.
- Hạn mức cấp thẻ: thẻ tín dụng phải lớn hơn 0 và nằm trong mức tối thiểu và tối đa của mã chính sách (thông báo nêu mức). Thẻ ghi nợ: ô hạn mức bị khóa, không có hạn mức.
- Thẻ phụ: tối đa 2 mỗi thẻ chính, mỗi thẻ phụ bắt buộc có họ tên và mối quan hệ (Bố/Mẹ, Anh/Chị/Em, Khác).
- Thời hạn thẻ cố định 60 tháng; ngày hết hạn = ngày phát hành cộng 60 tháng.
- "Đánh dấu Hợp đồng thẻ ĐÃ ĐÓNG" loại hợp đồng khỏi tổng hạn mức đã cấp.

## Chỗ dễ sai
- Không lưu được vì số HĐ thẻ viết sai dạng, thiếu mã chính sách hoặc mã chính sách không khớp loại TSBĐ.
- Form chỉ kiểm hạn mức theo mã chính sách, không đối chiếu với sức cấp của tài sản bảo đảm đã chọn.
