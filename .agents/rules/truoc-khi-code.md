---
description: Việc bắt buộc phải làm TRƯỚC khi gõ dòng code đầu tiên — checklist điều kiện và mẫu brief làm rõ đầu bài.
---

# Trước Khi Code

Tệp này chặn hai lỗi tốn kém nhất của dự án: **code xong mới phát hiện hiểu sai đầu bài**, và **đặt code sai tầng rồi phải làm lại**.

Đọc hết tệp này mất chưa tới hai phút. Không được bỏ qua vì "việc nhỏ".

---

## Phần A — Checklist bắt buộc

Làm tuần tự. Chưa xong bước trên thì chưa được sang bước dưới.

### 1. Nắm nghiệp vụ

- [ ] Gọi skill `/tin-dung` (nguồn: `D:/agent-kit/skills/tin-dung/SKILL.md`) và đọc phần cốt lõi.
- [ ] Mở đúng tệp trong `D:/agent-kit/skills/tin-dung/references/` cho mảng đang làm (bảng điều hướng ở mục 1 của `SKILL.md`).
- [ ] **Đối chiếu `src/` để xác nhận.** Tài liệu cập nhật chậm hơn mã nguồn và **thường xuyên trôi** — `SKILL.md` tự quy định: *mâu thuẫn thì tin code, rồi sửa tài liệu*. Đừng kết luận về phạm vi hay kiến trúc chỉ dựa trên tài liệu.

### 2. Xác định tầng đặt code

Theo luật chung SRP/SoC (`D:/agent-kit/rules/20-kien-truc-va-ma.md`) — trả lời dứt khoát **trước** khi mở trình soạn thảo:

| Thứ đang viết | Đặt ở |
| :--- | :--- |
| Công thức, thuật toán, biến đổi dữ liệu thuần | `src/lib/` |
| Trạng thái màn hình, gọi Supabase, side-effect | `src/hooks/`, `src/context/` |
| Hiển thị, nhận props, phát callback | `src/components/` |
| Kiểu dữ liệu nghiệp vụ dùng chung | `src/types/` — **không** khai trong component |

- [ ] Đã chọn tầng, và tầng đó không phụ thuộc ngược lên tầng trên nó.

### 3. Kiểm tra trước khi sửa

- [ ] Đã đọc mã hiện có ở chỗ sắp sửa — không sửa mù.
- [ ] Nếu đụng **tiền, lãi, gốc, LTV, hạn mức, nhóm nợ**: **viết test trước** (Red-Green-Refactor), bắt buộc phủ bất biến `Σ(gốc các kỳ) = tiền vay giải ngân`.
- [ ] Nếu đổi cấu trúc dữ liệu: đã tạo migration trong `supabase/migrations/`, và **áp trên Supabase trước khi deploy mã**.

### 4. Sau khi code xong

- [ ] `npm test && npm run build` — **cả hai phải xanh**.
- [ ] Kiểm chứng thực tế thứ vừa sửa: tệp xuất mở được, giao diện đúng, CSDL phản hồi đúng.
- [ ] Ghi mục mới vào [`docs/progress/YYYY-MM.md`](../../docs/progress/README.md).
- [ ] Nếu quy tắc nghiệp vụ thay đổi: cập nhật `D:/agent-kit/skills/tin-dung/references/` rồi commit ở repo `agent-kit` — skill `tin-dung` chỉ còn **một** bản, ở đó.

---

## Phần B — Mẫu brief đầu bài

**Chép sáu ô dưới đây và điền đủ trước khi gõ dòng code đầu tiên.** Ô nào không trả lời được nghĩa là chưa đủ hiểu để bắt đầu — hỏi lại, đừng đoán.

```markdown
**Mục tiêu:**       Xong việc này thì điều gì khác đi? Nói theo kết quả người dùng thấy,
                    không nói theo tệp sẽ sửa.
**Phạm vi:**        LÀM: ...
                    KHÔNG LÀM: ...
**Tệp dự kiến chạm:** liệt kê đường dẫn. Nhiều hơn 5 tệp thì cân nhắc tách việc.
**Tầng:**           lib / hooks / components / types / migration — chọn dứt khoát.
**Kiểm chứng bằng gì:** lệnh nào, số liệu nào, mở tệp nào ra xem thì biết là đúng.
**Rủi ro đã biết:** chỗ nào dễ sai, dữ liệu nào có thể mất, quy tắc vàng nào dễ vi phạm.
```

### Vì sao hai ô này quan trọng nhất

- **`KHÔNG LÀM`** — chặn việc nở phạm vi. Không có ô này thì một yêu cầu sửa lỗi dễ biến thành đợt tái cấu trúc không ai yêu cầu.
- **`Kiểm chứng bằng gì`** — chặn tình trạng báo xong mà không ai chứng minh được. Trả lời được ô này *trước khi code* thì mới biết code xong phải chạy gì.

---

## Quy tắc vàng dễ vi phạm nhất

Chi tiết đầy đủ ở mục 4 của skill `/tin-dung` (`D:/agent-kit/skills/tin-dung/SKILL.md`). Bốn điều hay bị quên nhất:

1. **Không dùng `||` khi `0` là giá trị hợp lệ.** `parseFloat('0') || 80` cho ra `80` — biến tài sản LTV 0% thành 80%.
2. **Cấm `toISOString().split('T')[0]`** để lấy hôm nay — trước 07:00 giờ VN trả về ngày hôm qua. Dùng `todayIso()`.
3. **Không nuốt lỗi.** `catch` rỗng làm giao diện báo thành công trong khi dữ liệu đã mất.
4. **Không nhét dữ liệu nghiệp vụ vào `Note`.** Mỗi thông tin nghiệp vụ phải có cột riêng.
