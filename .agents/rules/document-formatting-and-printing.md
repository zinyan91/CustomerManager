---
description: Quy chuẩn bắt buộc về căn lề, định dạng văn bản, bảng biểu, in ấn/PDF và xuất Excel theo chuẩn kế toán & hành chính Việt Nam.
---

# Quy Chuẩn Định Dạng Văn Bản, Bảng Biểu, In Ấn & Xuất Excel

> **QUY TẮC CỐT LÕI TỪ NGƯỜI DÙNG**:
> - Càng đơn giản, rõ ràng, thực dụng càng tốt. Tuyệt đối **không màu mè lòe loẹt**.
> - Tuyệt đối **không tự ý thêm các chú thích thừa thãi** (như ngày lập tùy tiện, dòng subtitle rườm rà, "Bằng chữ: ...") trừ khi có quy định pháp quy bắt buộc.
> - Bảng biểu phải chuẩn chỉ, phân chia kích thước cột cân đối, không bên dài ngoằng bên cụt lủn.

---

## 1. Quy Chuẩn Bản In & Xuất PDF (Print / PDF Standards)

### A. Khổ Giấy & Căn Lề Chuẩn (Page Setup & Margins)
Tuân thủ quy định tại **Nghị định 30/2020/NĐ-CP** về công tác văn thư:
- **Khổ giấy:** A4 dọc (`size: A4 portrait;`) cho hầu hết biểu mẫu và báo cáo tài chính; chỉ dùng A4 ngang (`size: A4 landscape;`) khi bảng có trên 8 cột số liệu.
- **Căn lề trang in chuẩn:**
  - Lề trên (Top): `12mm - 15mm`
  - Lề dưới (Bottom): `12mm - 15mm`
  - Lề trái (Left): `15mm - 20mm` (để chừa gáy đóng tập/kẹp hồ sơ)
  - Lề phải (Right): `10mm - 15mm`
- **Triệt tiêu Header/Footer mặc định của trình duyệt:**
  - Thiết lập `@page { margin: 12mm 15mm; }`
  - `@media print { html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; } }`
  - Đặt `<title></title>` rỗng khi mở cửa sổ in tạm thời để tránh in tiêu đề và URL web lên đầu trang.

### B. Typography & Màu Sắc
- **Phông chữ chuẩn hành chính:** Ưu tiên `"Times New Roman", Times, serif` (văn bản hành chính, kế toán) hoặc `Arial, Helvetica, sans-serif` (bảng kê kỹ thuật).
- **Cỡ chữ:** Tiêu đề lớn `12pt - 14pt` (đậm); Tiêu đề nhóm `10pt - 11pt` (đậm); Thân bảng `8pt - 9pt`; Ghi chú phụ/số cột `7.5pt - 8pt` (nghiêng).
- **Màu sắc:** 100% Đen Trắng / Grayscale (`#000`, viền `#000` mảnh `1px solid #000`, nền header xám nhạt `#f1f5f9` hoặc `#f3f4f6`). Tuyệt đối không dùng các màu xanh, đỏ, vàng sặc sỡ trong bản in.

### C. Ngắt Trang & Chống Rớt Chữ (Pagination & Orphan Prevention)
- **Khối chữ ký:** Bắt buộc đặt `page-break-inside: avoid;` để toàn bộ ngày tháng và các cột chữ ký luôn nằm chung một trang, không bị ngắt đôi.
- **Tiêu đề nhóm/phòng:** Phải ngắn gọn để nằm gọn trên 1 dòng duy nhất, không để rớt chữ lẻ loi xuống dòng thứ 2.
- **Kiểm soát phân trang:** Phải tính toán số dòng hiển thị trên mỗi trang (ví dụ 28-32 dòng/trang) để tránh tạo ra trang trắng hoặc trang cuối chỉ có 1-2 dòng trơ trọi.

---

## 2. Quy Chuẩn Bảng Biểu (Table Layout Standards)

### A. Phân Chia Kích Thước Cột (Column Widths)
- **Cột STT / Mã số:** Rộng `6% - 8%`, căn giữa.
- **Cột Thuyết minh / ĐVT:** Rộng `8% - 10%`, căn giữa.
- **Cột Tên / Chỉ tiêu:** Rộng `40% - 50%`, căn trái, có thụt lề (indent `12px - 16px` mỗi cấp) cho các mục con.
- **Cột Số liệu / Thành tiền:** Rộng `15% - 20%`, căn phải, font số `tabular-nums` thẳng hàng dọc.

### B. Dòng TỔNG CỘNG (Total Row Rule)
- **Quy tắc tuyệt đối:** Dòng TỔNG CỘNG **bắt buộc phải là hàng cuối cùng của bảng tính (`<tr><td colspan="...">TỔNG CỘNG</td><td>Số tiền</td></tr>`)**.
- Cột số tiền của dòng Tổng cộng phải **thẳng hàng dọc 100%** với cột Số tiền/Thành tiền của các dòng phía trên.
- **Nghiêm cấm:** Không bao giờ biến dòng Tổng cộng thành một hộp nổi (floating card), một div độc lập hoặc một bảng rời làm lệch cột so với bảng chính.

---

## 3. Quy Chuẩn Xuất File Excel (.xlsx)

1. **Định dạng số kế toán:**
   - Sử dụng chuẩn: `numFmt: '#,##0;(#,##0);"-"'`
   - Số dương: phân cách hàng nghìn bằng dấu phẩy `,` (ví dụ `1,250,000,000`)
   - Số âm: hiển thị trong ngoặc đơn `(1,250,000,000)`
   - Số 0: hiển thị dấu gạch ngang `-`
2. **Độ rộng cột (Column Widths):**
   - Phải thiết lập `colWidths` đủ rộng (ví dụ tên chỉ tiêu: `42-48`, số tiền: `20-24`) để không bị lỗi tràn viền hoặc hiển thị lỗi `###`.
3. **Đa Sheet:**
   - Khi xuất bộ tài liệu gồm nhiều biểu mẫu (ví dụ BCTC TT 133 gồm B01a, B02, B01b), phải xuất trong **1 file Excel duy nhất** chứa các sheet tương ứng với tên sheet rõ ràng.

---

## 4. Khối Ký Tên Chuẩn Pháp Quy Việt Nam

```html
<div class="sig-date">Lập, ngày ..... tháng ..... năm .....</div>
<div class="sig-section">
  <div class="sig-col">
    <strong>NGƯỜI LẬP BIỂU</strong>
    <em>(Ký, họ tên)</em>
  </div>
  <div class="sig-col">
    <strong>KẾ TOÁN TRƯỞNG</strong>
    <em>(Ký, họ tên)</em>
  </div>
  <div class="sig-col">
    <strong>GIÁM ĐỐC / ĐẠI DIỆN PHÁP LUẬT</strong>
    <em>(Ký, họ tên, đóng dấu)</em>
  </div>
</div>
```
