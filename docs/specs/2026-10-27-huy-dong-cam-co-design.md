# Tab Huy động & Cầm cố: thiết kế

Ngày 27/10/2026. Mockup đã duyệt hướng: [docs/plans/2026-10-27-mockup-huy-dong-cam-co/index.html](../plans/2026-10-27-mockup-huy-dong-cam-co/index.html).

## Vì sao làm

Khoản vay cầm cố sổ tiết kiệm (STK) hiện đi chung luồng HĐTD → KUNN → TSBĐ với vay có tài sản là bất động sản hoặc động sản. Luồng đó không hợp với cầm cố STK:

- Người vay chọn thời hạn theo số ngày, trong khi HĐTD/KUNN tính kỳ hạn theo tháng.
- HĐTD cầm cố kiêm luôn KUNN, nên không có tầng KUNN riêng.
- Gốc và lãi trả một lần vào ngày cuối, không có lịch trả nợ.
- Tài sản bảo đảm là sổ tiết kiệm của chính ngân hàng. Banker cần biết khách đang có những sổ nào và mỗi sổ đang bảo đảm cho khoản vay nào.

Vì vậy tách thành một tab riêng, quản lý cả sổ tiết kiệm (huy động) lẫn khoản vay cầm cố.

## Mục tiêu

1. **Màn hình Sổ tiết kiệm** của một khách hàng: danh sách sổ, chi tiết từng sổ, sổ đang bảo đảm cho khoản vay nào và còn trống bao nhiêu để cầm cố.
2. **Màn hình Khoản vay cầm cố** của một khách hàng: danh sách khoản vay, chi tiết từng khoản, khoản đó được bảo đảm bởi những sổ nào, và thao tác trả nợ.
3. **Quan hệ dữ liệu:** một khách có nhiều sổ và nhiều khoản vay. Giữa sổ và khoản vay là quan hệ nhiều–nhiều.
4. **Chuyển dữ liệu cũ:** mọi khoản vay đang nhập dạng HĐTD có `LoanMethod = 'Cầm cố sổ tiết kiệm'` chuyển sang tab mới.
5. **Tổng hợp không hụt:** Dashboard, danh mục cho vay, phân nhóm nợ và báo cáo vẫn cộng dư nợ cầm cố, lấy từ nguồn mới.

## Không làm (đợt này)

- Sổ của người thứ ba đứng ra cầm cố. Đợt này chỉ làm sổ của chính khách hàng.
- Tái tục sổ tự động khi đáo hạn.
- Phí trả nợ trước hạn.
- In hợp đồng cầm cố hoặc mẫu biểu mới. Nút "In HĐ cầm cố" trong mockup chưa làm.
- Liên kết STK với hợp đồng thẻ tín dụng (`CardContracts.CollateralKind = 'TIEN_GUI'`).
- Nối số dư huy động vào KPI forecast.

## Nghiệp vụ đã chốt với người dùng

| Điểm | Quy tắc |
| --- | --- |
| Thời hạn vay | Người vay chọn tùy ý theo số ngày. Lưu ngày giải ngân và ngày đến hạn; số ngày tính từ hai ngày đó. |
| Hợp đồng | Một số hợp đồng cầm cố, kiêm luôn KUNN. |
| Phương thức trả | Gốc và lãi trả cuối kỳ. |
| Lãi | `gốc × lãi suất năm × số ngày / 365`, làm tròn đồng, giống `accruedInterest` trong `src/lib/stkPledge.ts`. |
| Trả trước một phần | Thu lãi trên **toàn bộ** dư nợ tính đến ngày trả, cộng phần gốc trả. Kỳ sau tính lãi từ ngày trả, trên dư nợ còn lại. |
| Trả toàn bộ trước hạn | Lãi tính đến ngày trả. Khoản vay tất toán, các liên kết sổ được giải chấp. |
| Trả khi đến hạn | Gốc và lãi vào ngày đến hạn. |
| Tất toán sổ để cấn trừ | Tiền sổ (gốc + lãi) trừ nợ phải trả (gốc + lãi đến ngày trả). Còn dư thì trả khách, thiếu thì khách nộp thêm. Tất toán trước ngày đáo hạn: lãi sổ tính theo lãi suất không kỳ hạn (`DEFAULT_NON_TERM_RATE_ANNUAL` = 0,20%/năm). |

## Quyết định của người viết (người dùng chưa phản đối)

- **Liên kết sổ–khoản vay ghi phần gốc vay mà sổ đó bảo đảm** (`PrincipalCovered`). Tổng `PrincipalCovered` của một khoản vay bằng số tiền vay.
- **Còn trống để cầm cố của một sổ** = giá trị sổ khi đáo hạn trừ nghĩa vụ đang chiếm. Nghĩa vụ của một khoản vay (dư nợ gốc + lãi đến ngày đến hạn) chia cho các sổ theo tỷ lệ `PrincipalCovered`. Trần LTV theo `calcStkPledge`: VND và CCTG 100%, ngoại tệ 90%. Vượt trần thì cảnh báo, không chặn cứng, vì có thể có phê duyệt ngoại lệ (giống `checkTenorRange` trong `loanProductRules.ts`).
- **Ngày đến hạn khoản vay không vượt ngày đáo hạn sớm nhất của các sổ bảo đảm.** Vượt thì cảnh báo, không chặn.
- **Tất toán sổ đang bảo đảm cho khoản vay khác** cũng chỉ cảnh báo, và liệt kê các khoản vay bị ảnh hưởng.
- **Dư nợ và ngày tính lãi gần nhất là số tính ra, không lưu.** Dư nợ = số tiền vay − Σ gốc đã trả. Ngày tính lãi gần nhất = ngày trả gần nhất, hoặc ngày giải ngân nếu chưa trả lần nào. Lưu thêm hai số này sẽ có lúc lệch với lịch sử trả nợ.
- **Trả sau ngày đến hạn:** lãi trong hạn tính đến ngày đến hạn. Phần quá hạn tính bằng `calcOverduePenalty` (`stkPledge.ts`), lãi quá hạn gốc = 150% lãi suất trong hạn, giống khoản vay thường.
- **Quyền xem tab** theo phân hệ `credit` có sẵn trong `src/lib/modules.ts`, như mọi màn hình tín dụng khác. Không tạo khoá phân hệ mới.
- **Nhóm nợ tính sống** từ số ngày quá hạn bằng `debtGroupFromOverdueDays` (`src/lib/loanMath.ts`), không lưu cột nhóm nợ.
- **Tên tab:** "Huy động & Cầm cố", nằm trong nhóm Tín dụng của menu, ngay dưới "Hợp đồng thế chấp".

## Dữ liệu

Bảng mới. Đặt tên PascalCase và dùng `bigint` identity như các bảng hiện có (xem `37_hop_dong_the.sql`). RLS theo cùng mẫu với bảng khách hàng hiện có.

**`SavingsBooks`**: sổ tiết kiệm / tiền gửi có kỳ hạn
- `CustomerId` FK `Customers`, `BookNumber` (duy nhất sau khi chuẩn hoá, như `CardContracts`)
- `DepositType` (`tg_vnd` | `tg_foreign` | `cctg`, theo `PledgeDepositType`), `Currency`, `ExchangeRate` (chỉ dùng cho ngoại tệ)
- `Amount`, `InterestRate`, `OpenDate`, `Tenor`, `TenorUnit` (theo `TenorUnit`), `MaturityDate` (tính bằng `addTenor`, lưu để lọc và sắp xếp)
- `InterestPaymentMethod` (`end_term` | `periodic` | `upfront`), `PaidInterest` (lãi đã chi, cho lãnh lãi định kỳ hoặc lãnh trước)
- `IsClosed`, `ClosedDate`, `ClosingInterest`, `Note`
- Các cột cho phép NULL nếu dữ liệu chuyển từ TSBĐ cũ không có (ngày gửi, lãi suất, kỳ hạn). Giao diện đánh dấu những sổ còn thiếu thông tin.

**`PledgeLoans`**: khoản vay cầm cố (HĐTD kiêm KUNN)
- `CustomerId`, `ContractNumber` (duy nhất sau khi chuẩn hoá), `Amount`, `InterestRate`, `DisbursementDate`, `DueDate`
- `LoanPurpose` (dùng `LOAN_PURPOSES`), `IsClosed`, `ClosedDate`, `ClosedHow`, `Note`
- `LegacyCreditContractId`, `LegacyLoanContractId`: để truy vết bản ghi gốc khi chuyển dữ liệu

**`PledgeLoanSavingsBooks`**: liên kết nhiều–nhiều
- `PledgeLoanId`, `SavingsBookId`, `PrincipalCovered`, `ReleasedDate` (giải chấp)

**`PledgeLoanRepayments`**: lịch sử trả nợ
- `PledgeLoanId`, `RepaymentDate`, `Kind` (`partial` | `full` | `due` | `offset`), `PrincipalPaid`, `InterestPaid`, `OffsetSavingsBookId` (khi `Kind = offset`), `Note`
- Ràng buộc CHECK: `offset` phải có `OffsetSavingsBookId`; tiền không âm.

## Chuyển dữ liệu cũ

Migration **không phá huỷ**: không xoá HĐTD, KUNN hay TSBĐ cũ.

1. Tạo nhánh backup trước khi làm.
2. Đếm trước bằng truy vấn chỉ đọc: số HĐTD có `LoanMethod = 'Cầm cố sổ tiết kiệm'`, số KUNN dưới chúng, số TSBĐ loại sổ tiết kiệm (`isSavingsBookAsset` trong `collateralMath.ts`) đang gắn với chúng. **Báo số đếm cho người dùng và chờ duyệt trước khi ghi vào database thật.**
3. Mỗi KUNN thành một `PledgeLoans`: số tiền = `ContractAmount`, lãi suất = `NormalInterestRate` (đổi đơn vị nếu cần), giải ngân = `DisbursementDate`, đến hạn = `ContractEndDate`. HĐTD không có KUNN thì lấy từ chính HĐTD. Phần gốc đã trả (`TotalPrincipalPaid`) thành một dòng `PledgeLoanRepayments` để dư nợ tính ra khớp `CurrentPrincipalBalance`.
4. Mỗi TSBĐ loại sổ tiết kiệm đang gắn thành một `SavingsBooks`: số sổ lấy từ `AssetCode`, số tiền từ `Value` hoặc `AppraisedValue`. Những trường cũ không có thì để NULL.
5. Liên kết lấy từ `LoanContracts.CollateralId` hoặc `CreditContracts.CollateralIds`. Một sổ cho nhiều khoản thì `PrincipalCovered` = số tiền vay; một khoản nhiều sổ thì chia theo giá trị sổ, và đánh dấu để banker kiểm lại.
6. Đánh dấu bản ghi cũ đã chuyển bằng cột mới `MovedToPledgeLoanId` trên `CreditContracts` và `LoanContracts`. Mọi chỗ đọc HĐTD/KUNN bỏ qua bản ghi có cột này, để không đếm hai lần.
7. Đối soát sau migration: số khoản vay, tổng số tiền vay, tổng dư nợ trước và sau phải khớp từng đồng.
8. Bỏ "Cầm cố sổ tiết kiệm" khỏi danh sách phương thức vay khi tạo HĐTD mới (`useCreditContractController.ts`, `kunnForm.ts`). Giữ trong `loanProductRules.ts` để bản ghi cũ vẫn hiển thị đúng.

## Tổng hợp ở các màn hình khác

Mọi chỗ đang cộng dư nợ từ `LoanContracts` phải cộng thêm dư nợ `PledgeLoans` chưa tất toán: Dashboard (tổng dư nợ, thống kê theo phương thức vay, nhóm nợ; giá trị sổ bảo đảm cộng vào giá trị TSBĐ để LTV bình quân không lệch), báo cáo danh mục (`customerPortfolioExport.ts`), báo cáo đến hạn. Màn hình KUNN theo khách (`LoanPortfolioView`) không đổi, vì khoản cầm cố đã có tab riêng. Khi lập kế hoạch, dùng grep để kê đủ các chỗ này, bắt đầu từ `DashboardView.tsx`, `LoanPortfolioView.tsx` và `src/lib/reports/`.

## Kiến trúc mã

- `src/lib/pledgeLoan.ts`: hàm thuần, gồm dư nợ, ngày tính lãi gần nhất, lãi đến một ngày, nghĩa vụ đến hạn, phân bổ nghĩa vụ cho từng sổ, còn trống của sổ, tính toán từng kiểu trả nợ, các cảnh báo. Dùng lại `accruedInterest`, `addTenor` và hằng số lãi không kỳ hạn trong `stkPledge.ts`. Viết test trước. Bất biến phải phủ: Σ gốc đã trả + dư nợ = số tiền vay, và còn trống + Σ nghĩa vụ phân bổ = giá trị sổ.
- `src/lib/api/savingsBookApi.ts`, `src/lib/api/pledgeLoanApi.ts`: gọi Supabase.
- `src/hooks/useSavingsBooks.ts`, `src/hooks/usePledgeLoans.ts`: trạng thái màn hình.
- `src/components/views/SavingsPledgeView.tsx` cùng các component con trong `src/components/savingsPledge/`: bảng, khung chi tiết, form sổ, form khoản vay, hộp thoại trả nợ.
- Kiểu dữ liệu đặt trong `src/types/`, cập nhật `database.types.ts`.

## Giao diện

Theo mockup và [workspace-visual-conventions.md](workspace-visual-conventions.md). Thẻ KPI dùng `data-metric-tone`: tiền gửi dùng sắc `collateral`, cảnh báo đáo hạn hoặc đến hạn dùng `warn`. Trạng thái luôn có nhãn chữ. Ô còn trống bị âm thì tô màu `neg`.

## Kiểm chứng

- `npm test && npm run build` xanh. Test của `pledgeLoan.ts` có các con số trong mockup làm ca mẫu.
- Migration chạy trên bản sao hoặc dry-run chỉ đọc, đối soát số đếm, rồi người dùng duyệt mới áp lên database thật.
- Mở app: tạo sổ, tạo khoản vay gắn hai sổ, thử bốn kiểu trả nợ. Kiểm Dashboard: tổng dư nợ trước và sau khi chuyển dữ liệu phải bằng nhau.

## Rủi ro

- Đếm dư nợ hai lần, hoặc mất dư nợ, nếu bỏ sót một chỗ đọc `LoanContracts` khi lọc `MovedToPledgeLoanId`.
- Đơn vị lãi suất cũ (phần trăm hay số thập phân) khác với bảng mới.
- TSBĐ cũ thiếu ngày gửi và lãi suất, nên còn trống để cầm cố chưa tính được cho tới khi banker bổ sung.
