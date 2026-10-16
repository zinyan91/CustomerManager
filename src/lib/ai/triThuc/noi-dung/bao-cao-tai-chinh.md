---
id: bao-cao-tai-chinh
tieuDe: BCTC và Thẩm định kinh tế - tài chính
moTa: Mẫu B01a/B02/B01b, đọc sao kê, bóc tách dòng tiền, đối chiếu thuế, hạn mức TT 39, rủi ro ngành
nhom: Báo cáo tài chính và Thẩm định
tuKhoa: [bctc, báo cáo tài chính, sao kê, dòng tiền, tỷ số tài chính, tt 133, tt 39, hạn mức, đối soát, cân đối kế toán, kết quả kinh doanh]
trang: [/tools/corporate-financial]
nguon: [src/lib/corporateFinancialFormulas.ts, src/lib/corporateFinancialDefaults.ts, src/lib/ai/financialContext.ts, src/components/views/CorporateFinancialView.tsx]
---
# Báo cáo tài chính & Thẩm định kinh tế - tài chính

BCTC doanh nghiệp chuẩn TT 133/2016/TT-BTC kết hợp thẩm định tín dụng ngân hàng theo TT 39/2016/TT-NHNN.

## Biểu mẫu cốt lõi
- B01a: Tài sản ngắn hạn (100), Tài sản dài hạn (200), Nợ phải trả (300), Vốn CSH (400). Cân đối: Mã 270 (Tổng TS) = Mã 440 (Tổng nguồn vốn). Lệch cân đối là sai sót hoặc số liệu bất thường.
- B02: Doanh thu (01), Giá vốn (11), Doanh thu TC (21), Chi phí lãi vay (23), Chi phí quản lý (25), Lợi nhuận trước thuế (50), Lợi nhuận sau thuế (60).
- B01b: Báo cáo tình hình tài chính theo thanh khoản giảm dần.

## Tỷ số tài chính
- Thanh khoản: Hiện hành = TSNH / Nợ ngắn hạn (≥ 1,2); Nhanh = (Tiền + Phải thu) / Nợ ngắn hạn (≥ 0,8); Tiền mặt = Tiền / Nợ ngắn hạn.
- Đòn bẩy: Nợ / Tổng tài sản (D/A); Nợ / Vốn CSH (D/E, cảnh báo khi > 3); Vốn lưu động ròng NWC = TSNH - Nợ ngắn hạn (NWC âm là lấy ngắn nuôi dài).
- Hiệu quả: Vòng quay tồn kho (Giá vốn / Tồn kho BQ); Vòng quay phải thu (Doanh thu / Phải thu BQ); Chu kỳ ngân quỹ CCC = Ngày tồn kho + Ngày thu tiền - Ngày trả tiền.
- Sinh lời: Biên gộp, Biên ròng, ROA, ROE (DuPont: ROE = Biên ròng × Vòng quay TS × Đòn bẩy).

## Đọc sao kê ngân hàng & Tam giác đối soát
- Bóc tách sao kê: Tổng doanh số ghi có (tiền vào), ghi nợ (tiền ra), số dư bình quân, dòng tiền thuần theo tháng.
- Tam giác đối soát: So khớp Doanh thu B02 vs Doanh số ghi có ngân hàng vs Tờ khai thuế GTGT / Hóa đơn điện tử. Ghi có thấp hơn B02 cảnh báo doanh thu ảo; ghi có cao hơn cần bóc tách tiền vay, nộp mặt, chuyển nội bộ.
- Rủi ro dòng tiền: Tiền luân chuyển lòng vòng (round-tripping) qua công ty liên kết; tiền về bị rút mặt ngay; doanh số qua ngân hàng tài trợ không đạt cam kết.

## Thẩm định hạn mức vốn lưu động (TT 39/2016)
- Nhu cầu VLĐ = Chi phí SXKD chu kỳ × (Chu kỳ ngân quỹ CCC / 365). Vốn tự có tham gia tối thiểu 20-30%.
- Hạn mức tín dụng = Nhu cầu VLĐ - Vốn tự có - Vay TCTD khác - Nợ nhà cung cấp.

## Đặc thù ngành & Cảnh báo sớm
- Sản xuất: Khấu hao lớn, rủi ro tồn kho nguyên liệu và hao hụt.
- Thương mại: Vòng quay nhanh, biên lãi mỏng, nhạy cảm công nợ.
- Xây dựng: Tồn kho dở dang cao, thu tiền theo nghiệm thu, bảo lãnh, đọng vốn CĐT.
- Cảnh báo: Lợi nhuận dương nhưng CFO âm liên tục, ICR = EBIT / Lãi vay < 1,5, CIC nhảy nhóm nợ.
