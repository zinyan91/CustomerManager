---
id: tsbd-ltv
tieuDe: Tài sản bảo đảm, định giá và LTV
moTa: LTV theo loại tài sản, sức cấp tối đa, hiệu lực định giá, kiểm tra vượt tài sản bảo đảm
nhom: Hồ sơ tín dụng
tuKhoa: [tài sản bảo đảm, tsbd, tsđb, ltv, định giá, sức cấp, hiệu lực định giá, sổ tiết kiệm, tài sản hạn chế, vượt tài sản]
trang: [/collaterals]
nguon: [src/lib/collateralMath.ts, src/lib/creditLimit.ts, src/components/collateral/CollateralForm.tsx, src/components/collateral/CollateralTable.tsx, src/hooks/useCollateralController.ts, src/components/creditContract/CreditContractFormModal.tsx]
---
# Tài sản bảo đảm, định giá và LTV

## Công thức
- Sức cấp tối đa = giá trị định giá × LTV / 100. Giá trị định giá lấy ô định giá, bằng 0 thì lấy giá trị ghi nhận.
- LTV dùng giá trị đã nhập tay nếu có (kể cả 0). Chưa nhập thì lấy mặc định theo loại.
- Mặc định theo loại (khớp tên đầy đủ hoặc đầu tên; bỏ tiền tố "BĐS -"; không nhận ra thì 80%): Loại 1 80; Loại 2 70; Loại 3 60; Loại 4 55; Hạn chế nhận TS 0; Sổ tiết kiệm 100; STK khác 90; Giấy tờ 80; Phương tiện 70; Máy móc 60; Hàng hóa 50; Quyền tài sản 50.

## Form tài sản
Chọn "Phân loại Tài sản bảo đảm" thì ô "Tỷ lệ LTV" được đặt lại theo mặc định (mất giá trị sửa tay). Sáu lựa chọn trên form cho mặc định: Bất động sản đất ở 80; Bất động sản khác 80; Phương tiện vận tải 70; Tiền gửi / Sổ tiết kiệm 80; Máy móc thiết bị 60; Tài sản khác 80.
Loại thuộc diện hạn chế nhận có LTV 0%; gán LTV lớn hơn 0 thì hệ thống hỏi "Trình ngoại lệ — Cần phê duyệt" và bảng đánh dấu ngoại lệ.

## Hiệu lực định giá
- Hết hạn = ngày định giá + số tháng hiệu lực (mặc định 12 nếu không khai).
- Trạng thái: Chưa định giá (không có ngày); Hết hiệu lực (qua hạn); Sắp hết hạn (còn 60 ngày trở xuống); Đang hiệu lực.
- Định giá hết hiệu lực hoặc chưa định giá thì sức cấp khả dụng bằng 0. Sắp hết hạn vẫn dùng được.

## Kiểm tra vượt tài sản bảo đảm
Các hợp đồng và thẻ dùng chung tài sản gộp thành một cụm. Nghĩa vụ của cụm = hạn mức các hợp đồng xoay vòng (hạn mức dùng chung tính một lần) + dư nợ các khoản vay từng lần + hạn mức đã cấp của thẻ. So với tổng sức cấp khả dụng của cụm; vượt thì báo số tiền vượt, và nêu tài sản nào hết hiệu lực hoặc chưa định giá.

## Thẻ tín dụng thế chấp sổ tiết kiệm
Trần thẻ = 90% giá trị sổ, bằng 0 nếu định giá không dùng được. Chỉ áp cho loại tên bắt đầu bằng "Sổ tiết kiệm" hoặc "STK".

## Chỗ dễ sai
- Cột "Sức cấp tối đa" trong bảng tài sản không xét hiệu lực định giá; màn hợp đồng tín dụng và kiểm tra vượt thì có xét. Tài sản hết hiệu lực vẫn hiện sức cấp ở bảng nhưng bằng 0 khi cấp hạn mức.
- Chọn "Tiền gửi / Sổ tiết kiệm" trên form cho LTV 80% và không được coi là sổ tiết kiệm khi tính trần thẻ. Mức 100% và 90% chỉ áp cho loại tên "Sổ tiết kiệm" hoặc "STK khác".
