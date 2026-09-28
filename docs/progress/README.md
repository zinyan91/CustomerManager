# Nhật ký tiến độ — quy tắc ghi

Mỗi tháng **một tệp**: `docs/progress/YYYY-MM.md` (ví dụ `2026-09.md`).
Sang tháng mới thì tạo tệp mới, **không** ghi tiếp vào tháng cũ.

Lịch sử trước 09/2026 nằm ở [`archive-truoc-2026-09.md`](./archive-truoc-2026-09.md) — chỉ tra cứu, không ghi thêm.

---

## Khi nào phải ghi

Ghi **ngay sau khi hoàn thành một việc và đã kiểm chứng** — trước khi commit, không để dồn cuối tuần.

Việc phải ghi: sửa logic tiền · đổi cấu trúc dữ liệu hoặc migration · thêm/bỏ màn hình hoặc route · đổi quy chuẩn dùng chung · sửa lỗi ảnh hưởng số liệu.

Việc **không** cần ghi: sửa lỗi chính tả, đổi khoảng cách giao diện, đổi tên biến nội bộ.

---

## Khuôn một mục — chép nguyên, điền đủ 5 dòng

```markdown
## YYYY-MM-DD — Tiêu đề việc, một dòng, nói rõ kết quả
**Chạm:** đường/dẫn/tệp1.ts · đường/dẫn/tệp2.tsx
**Vì sao:** vấn đề có thật đang phải giải, không phải mô tả lại tiêu đề
**Đã làm:** thay đổi cụ thể, người khác đọc là hình dung được
**Kiểm chứng:** lệnh đã chạy + kết quả thật (vd: npm test 2108 pass · npm run build pass)
**Còn mở:** việc chưa xong, hoặc ghi "không"
```

## Ba quy tắc bắt buộc

1. **Mục mới đặt lên đầu tệp**, ngay dưới tiêu đề tháng. Đọc từ trên xuống là từ mới tới cũ.
2. **Khóa là ngày**, không đánh số `§`, `0.1`, `0.x`. Cùng một ngày có nhiều việc thì mỗi việc một mục riêng, tiêu đề khác nhau.
3. **Dòng `Kiểm chứng` phải là kết quả đã chạy thật.** Chưa chạy thì ghi "chưa kiểm chứng" — tuyệt đối không ghi số liệu phỏng đoán.

---

## Liên quan

- Việc phải làm **trước** khi gõ dòng code đầu tiên: [`.agents/rules/truoc-khi-code.md`](../../.agents/rules/truoc-khi-code.md)
- Quy chuẩn kiến trúc SRP/SoC: luật chung `D:/agent-kit/rules/20-kien-truc-va-ma.md`
