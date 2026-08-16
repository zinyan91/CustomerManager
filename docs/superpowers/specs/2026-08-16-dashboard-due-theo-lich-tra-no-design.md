# Dashboard: panel due đọc theo lịch trả nợ thật

Ngày lập: 16/08/2026

## Vấn đề

Panel "Khách hàng chuẩn bị đóng kỳ due của tháng" báo quá hạn cho khách đã đóng tiền.

Ca cụ thể — khách hàng Đặng Bá Nhân, ngày 16/08/2026:

- Đã đóng kỳ due tháng 8
- KUNN đến hạn 25/08/2026
- HĐTD đã hết hạn 24/07/2026

Dashboard hiển thị "quá hạn due tháng này 15 ngày". Sai — tiền đã vào.

## Nguyên nhân

`DashboardView.tsx:139` tính ngày đến hạn bằng **ngày kỷ niệm** suy ra từ hợp đồng:

```
monthlyDueInfo(c.RepaymentStartDate || c.DisbursementDate || c.ContractStartDate)
```

Màn hình chỉ nạp `Customers`, `Collaterals`, `LoanContracts`, `CardContracts` — **không nạp `RepaymentSchedules`**. Không có dữ liệu để biết kỳ nào đã thu, nên cứ qua ngày kỷ niệm là báo quá hạn.

Hai panel KUNN và HĐTD đọc thẳng từ cột trên hợp đồng nên không dính lỗi này.

## Số đo trên dữ liệu thật (16/08/2026)

| Phép đếm | Kết quả | Ảnh hưởng tới thiết kế |
| :--- | ---: | :--- |
| Dòng lịch trả nợ của hợp đồng chưa tất toán | 6.705 | Nạp về client thoải mái, không cần view/RPC |
| Kỳ `IsPaid` nhưng `ActualPaidAmount` là `null` | 0 | Bỏ quy tắc "tin vào tick" |
| Hợp đồng chưa tất toán không có dòng lịch nào | 0 | Vẫn giữ bộ đếm phòng ngừa |
| Giá trị phân biệt của `ActualPaidAmount` trên kỳ đã trả | chỉ `0.00`, 836 dòng | **Bỏ toàn bộ đối chiếu số tiền** |

Phát hiện quyết định: `ActualPaidAmount` **chưa từng được ghi số thật**. Toàn bộ mã nguồn chỉ chạm tới nó ở hai chỗ chép lại khi sinh lịch (`useLoanPortfolioController.ts:504` và `:593`), không có màn hình nào cho banker nhập số tiền thực thu.

Quy tắc "thu thiếu thì vẫn còn nợ" đúng về nghiệp vụ nhưng không áp được lên cột rỗng: áp vào sẽ biến cả 836 kỳ đã thu thành còn nợ, sai nặng hơn lỗi đang có.

## Phương án đã chọn

Nạp lịch trả nợ hàng loạt về client, quy đổi trạng thái bằng hàm thuần trong `src/lib/`.

Hai phương án bị loại:

- **View/RPC trong Postgres** — nhẹ đường truyền nhưng quy tắc "kỳ nào còn nợ" sẽ tồn tại hai bản, một trong SQL một trong TypeScript. Dự án đã trả giá cho đúng kiểu trùng lặp này. Chỉ cân nhắc lại nếu số dòng phình lớn; hiện 6.705 dòng nên chưa cần.
- **Suy từ `CurrentBalance`** — dư nợ không cho biết kỳ nào đã thu, không trả lời được câu hỏi đang sai.

## Luồng dữ liệu

```
fetchContractsAPI()  →  lọc chưa tất toán  →  fetchSchedulesForContractsAPI(ids)
                                                        ↓
                                          contractDueState(schedules, today)
                                                        ↓
                                       { quá hạn | sắp đến hạn | không hiện }
```

Thành phần mới:

| Thành phần | Nơi đặt | Trách nhiệm |
| :--- | :--- | :--- |
| `fetchSchedulesForContractsAPI(contractIds)` | `src/lib/api/loanContractApi.ts` | Lấy lịch trả nợ của nhiều hợp đồng, chia lô để không vượt giới hạn độ dài truy vấn |
| `contractDueState(schedules, todayIso)` | `src/lib/` (hàm thuần) | Quy một hợp đồng về một trạng thái |

Logic không viết trong component. RLS tự lọc theo `banker` / `admin` như các truy vấn hiện có.

## Quy tắc

**Một kỳ còn nợ khi `IsPaid = false`.** Không đối chiếu số tiền — xem phần số đo.

**Trạng thái hợp đồng** lấy theo kỳ còn nợ có `DueDate` sớm nhất:

| Kỳ còn nợ sớm nhất | Trạng thái | Nhóm |
| :--- | :--- | :--- |
| Hạn đã qua | Quá hạn N ngày | Đã quá hạn |
| Hạn đúng hôm nay | Còn 0 ngày | Sắp đến hạn |
| Hạn trong 5 ngày tới | Còn N ngày | Sắp đến hạn |
| Hạn xa hơn 5 ngày | — | Không hiện |
| Không còn kỳ nào | — | Không hiện |

Ngưỡng 5 ngày giữ như panel đang chạy.

Hợp đồng không có dòng lịch nào: không xếp vào nhóm nào, đếm riêng và ghi số lượng ở đầu panel. Hiện là 0 hợp đồng, giữ bộ đếm để hợp đồng mới tạo chưa sinh lịch không biến mất khỏi dashboard mà không ai biết.

## Hiển thị

Panel số 1 giữ nguyên vị trí trên màn hình.

**Tách hai nhóm bằng cơ chế có sẵn.** Ba panel KUNN, HĐTD, TSBĐ đã có bộ lọc `Tất cả / Sắp đến hạn / Đã hết hạn` kèm dòng đếm `N sắp đến · M quá hạn`. Panel due là panel duy nhất thiếu. Lắp bộ lọc này vào, không đẻ thêm kiểu tương tác mới.

**Cột:**

| Cột | Thay đổi |
| :--- | :--- |
| Ngày đến hạn due | Lấy `DueDate` của kỳ còn nợ sớm nhất, thay cho ngày kỷ niệm |
| Kỳ số | Thêm mới |
| Số tiền kỳ này | Thêm mới |
| Dư nợ hiện hữu | Giữ |
| Hạn còn lại | Giữ badge |

Thêm "Kỳ số" và "Số tiền kỳ này" vì khi thấy "quá hạn 15 ngày" thì câu hỏi kế tiếp luôn là kỳ nào, bao nhiêu tiền — hiện phải mở từng hồ sơ mới biết.

Sắp xếp: quá hạn lâu nhất lên đầu.

**Hệ quả:** số cảnh báo tổng ở `DashboardView.tsx:399` cộng độ dài bốn danh sách, sau khi sửa sẽ giảm vì hồ sơ đã đóng kỳ không còn bị đếm. Đây là kết quả đúng.

## Test

Viết test trước, theo quy trình sửa logic tiền của dự án. Hàm thuần nên không cần cơ sở dữ liệu.

| Ca | Kỳ vọng |
| :--- | :--- |
| `IsPaid = false` | Còn nợ |
| `IsPaid = true` | Xong |
| Nhiều kỳ còn nợ | Lấy kỳ có `DueDate` sớm nhất |
| Kỳ còn nợ đến hạn đúng hôm nay | Nhóm sắp đến hạn, 0 ngày — không phải quá hạn |
| Kỳ còn nợ cách hơn 5 ngày | Không hiện |
| Không còn kỳ nào còn nợ | Không hiện |
| Không có dòng lịch nào | Không hiện, đếm vào nhóm chưa có lịch |

Thêm một test hồi quy đặt tên theo ca gốc: đã đóng kỳ tháng 8, kỳ kế tiếp 01/09, hôm nay 16/08 → hợp đồng không xuất hiện ở panel due.

**Kiểm chứng ngoài test đơn vị:** chạy dev server, mở dashboard, đối chiếu trực tiếp hồ sơ Đặng Bá Nhân. Test xanh chỉ chứng minh hàm đúng, không chứng minh màn hình đúng.

## Không cần migration

Lọc ở client, lược đồ giữ nguyên.

## Ngoài phạm vi

**Bắt kỳ thu thiếu.** Cần trước hết một đường cho banker nhập số tiền thực thu; hiện không có màn hình nào làm việc đó nên `ActualPaidAmount` rỗng suốt. Là hạng mục riêng, không gộp vào bản sửa lỗi này.

**Lỗi độc lập cần sửa trước khi làm hạng mục trên:** `s.ActualPaidAmount || 0` ở `useLoanPortfolioController.ts:504` và `:593` ghi đè `null` thành `0`, xoá ranh giới giữa "chưa nhập" và "thu 0đ". Không cản bản sửa này, nhưng sẽ cản việc nhập số tiền thực thu.
