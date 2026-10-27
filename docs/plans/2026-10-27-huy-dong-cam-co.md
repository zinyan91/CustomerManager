# Tab Huy động & Cầm cố: kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách khoản vay cầm cố sổ tiết kiệm khỏi luồng HĐTD/KUNN/TSBĐ, thành tab riêng quản lý sổ tiết kiệm và khoản vay cầm cố của từng khách hàng, kèm chuyển dữ liệu cũ.

**Architecture:** Bốn bảng mới (`SavingsBooks`, `PledgeLoans`, `PledgeLoanSavingsBooks`, `PledgeLoanRepayments`), cùng hai hàm SQL ghi nguyên khối cho thao tác lưu khoản vay và ghi nhận trả nợ. Dư nợ, lãi và còn trống để cầm cố tính bằng hàm thuần trong `src/lib/`. Màn hình theo mẫu Hợp đồng thẻ (`CardContractView` + `useCardContractController`). Bản ghi cũ đã chuyển được đánh dấu và lọc ngay tại tầng API.

**Tech Stack:** React + TypeScript + Vite, Supabase (Postgres, RLS), Vitest, PGlite cho test migration.

**Spec:** [docs/specs/2026-10-27-huy-dong-cam-co-design.md](../specs/2026-10-27-huy-dong-cam-co-design.md) · Mockup: [docs/plans/2026-10-27-mockup-huy-dong-cam-co/index.html](2026-10-27-mockup-huy-dong-cam-co/index.html)

## Global Constraints

- Làm đủ checklist trong `.agents/rules/truoc-khi-code.md` trước khi bắt đầu. Đụng tới tiền hay lãi thì viết test trước.
- Lãi: `Math.round(gốc × lãi suất năm × số ngày / 365)`, dùng `accruedInterest` trong `src/lib/stkPledge.ts`.
- Lãi suất lưu trong database theo **phần trăm** (6.5 nghĩa là 6,5%/năm), giống `LoanContracts.NormalInterestRate`. Hàm trong `src/lib/` nhận phần trăm và tự chia 100.
- Lãi suất không kỳ hạn khi tất toán sổ trước hạn: `DEFAULT_NON_TERM_RATE_ANNUAL` (0.002).
- LTV: VND và CCTG 100%, ngoại tệ 90%.
- Lấy ngày hôm nay bằng `todayIso()`. Cấm `toISOString().split('T')[0]`. Không dùng `||` cho số mà 0 là giá trị hợp lệ.
- Migration không phá huỷ. **Không áp lên Supabase thật khi người dùng chưa duyệt**: người dùng tự chạy trong SQL Editor.
- Mỗi migration có tệp rollback trong `supabase/rollbacks/` và một test PGlite.
- Giao diện theo mockup và `docs/specs/workspace-visual-conventions.md`. Không thêm chữ phụ, tooltip hay subtitle ngoài mockup.
- Chữ trên giao diện bằng tiếng Việt, giữ đúng nhãn của mockup: "Sổ tiết kiệm", "Khoản vay cầm cố", "Thêm sổ tiết kiệm", "Tạo khoản vay cầm cố", "Trả nợ", "Ghi nhận trả nợ", "Trả trước một phần", "Trả toàn bộ trước hạn", "Trả khi đến hạn", "Tất toán sổ để cấn trừ".
- Lỗi hiện nguyên thông điệp từ server. Trạng thái rỗng không được trông giống trạng thái lỗi.
- `npm test && npm run build` xanh trước mỗi commit. Commit kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Trả trước một phần với gốc trả ≥ dư nợ hoặc ≤ 0.** Phải báo lỗi và không ghi nhận. Đã trả hết thì người dùng phải chọn "Trả toàn bộ trước hạn". Test ở Task 2 và trong hàm SQL ở Task 1.
2. **Ngày trả trước ngày tính lãi gần nhất, hoặc trước ngày giải ngân.** Phải báo lỗi, không ra lãi âm. Test ở Task 2.
3. **Sổ thiếu lãi suất, ngày gửi hoặc kỳ hạn** (dữ liệu chuyển từ TSBĐ cũ). Còn trống để cầm cố hiện "–", không hiện 0, và không cộng vào KPI "Còn trống". Test ở Task 2.
4. **Bản ghi cũ đã chuyển vẫn lọt vào Dashboard**, làm dư nợ bị đếm hai lần. Test ở Task 4 bằng cách kiểm bộ lọc trên mọi hàm fetch.
5. **Gọi trả nợ hai lần cho khoản vay đã tất toán** (bấm đúp, hai tab). Hàm SQL phải từ chối khi `IsClosed = true`. Test PGlite ở Task 1.

---

## File Structure

| Tệp | Trách nhiệm |
| --- | --- |
| `supabase/migrations/76_huy_dong_cam_co.sql` | Bảng, ràng buộc, RLS, cột đánh dấu, hàm `save_pledge_loan`, `record_pledge_repayment` |
| `supabase/rollbacks/76_huy_dong_cam_co_rollback.sql` | Gỡ migration 76 |
| `supabase/migrations/77_chuyen_cam_co_cu.sql` | Chuyển dữ liệu cũ, có đối soát |
| `supabase/rollbacks/77_chuyen_cam_co_cu_rollback.sql` | Gỡ dữ liệu đã chuyển, xoá dấu |
| `src/types/savingsPledge.ts` | Kiểu `SavingsBook`, `PledgeLoan`, `PledgeLoanLink`, `PledgeLoanRepayment`, `PledgeRepaymentKind` |
| `src/lib/savingsBook.ts` | Đáo hạn, giá trị sổ, phân bổ nghĩa vụ, còn trống |
| `src/lib/pledgeLoan.ts` | Dư nợ, lãi, quá hạn, trạng thái, báo giá trả nợ, cảnh báo |
| `src/lib/pledgePortfolio.ts` | Tổng hợp cho Dashboard, dòng báo cáo đến hạn |
| `src/lib/api/savingsBookApi.ts`, `src/lib/api/pledgeLoanApi.ts` | Gọi Supabase |
| `src/hooks/useSavingsPledgeData.ts` | Tải và ghi dữ liệu của một khách |
| `src/hooks/useSavingsPledgeController.ts` | Tab, dòng đang chọn, form, hộp thoại |
| `src/components/views/SavingsPledgeView.tsx` | Khung màn hình |
| `src/components/savingsPledge/*` | Bảng, khung chi tiết, KPI, form sổ, form khoản vay, hộp thoại trả nợ |

---

### Task 1: Migration 76 (schema, RLS, hàm ghi)

**Files:**
- Create: `supabase/migrations/76_huy_dong_cam_co.sql`, `supabase/rollbacks/76_huy_dong_cam_co_rollback.sql`
- Create: `src/types/savingsPledge.ts`; Modify: `src/types/index.ts` (re-export), `src/types/database.types.ts` (thêm bốn bảng và các cột đánh dấu)
- Test: `src/lib/__tests__/huyDongCamCoMigration.test.ts`

**Interfaces:**
- Produces (TS, `src/types/savingsPledge.ts`, tên cột trùng tên bảng):
  - `PledgeRepaymentKind = 'partial' | 'full' | 'due' | 'offset'`
  - `SavingsBook { Id; CustomerId; BookNumber; DepositType: PledgeDepositType; Currency: string; ExchangeRate: number | null; Amount: number; InterestRate: number | null; OpenDate: string | null; Tenor: number | null; TenorUnit: TenorUnit | null; MaturityDate: string | null; InterestPaymentMethod: DepositInterestPaymentMethod; PaidInterest: number; IsClosed: boolean; ClosedDate: string | null; ClosingInterest: number | null; MovedFromCollateralId: number | null; Note: string | null; CreatedAt: string }`
  - `PledgeLoan { Id; CustomerId; ContractNumber; Amount; InterestRate; DisbursementDate; DueDate; LoanPurpose: string | null; IsClosed; ClosedDate: string | null; ClosedHow: PledgeRepaymentKind | null; LegacyCreditContractId: number | null; LegacyLoanContractId: number | null; Note: string | null; CreatedAt: string }`
  - `PledgeLoanLink { Id; PledgeLoanId; SavingsBookId; PrincipalCovered: number; ReleasedDate: string | null }`
  - `PledgeLoanRepayment { Id; PledgeLoanId; RepaymentDate; Kind: PledgeRepaymentKind; PrincipalPaid; InterestPaid; PenaltyPaid; OffsetSavingsBookId: number | null; Note: string | null; CreatedAt: string }`
  - `PledgeBundle { loans: PledgeLoan[]; links: PledgeLoanLink[]; repayments: PledgeLoanRepayment[]; books: SavingsBook[] }`
- Produces (SQL, `SECURITY INVOKER` để RLS vẫn áp):
  - `public.save_pledge_loan(p_loan jsonb, p_links jsonb) RETURNS bigint`: thêm khoản vay nếu `p_loan->>'Id'` rỗng, ngược lại cập nhật; thay toàn bộ liên kết chưa giải chấp. Trả về Id.
  - `public.record_pledge_repayment(p_loan_id bigint, p_repayment jsonb, p_book_closing_interest numeric) RETURNS bigint`: thêm dòng trả nợ. Với `full`/`due`/`offset`: đặt `IsClosed`, `ClosedDate`, `ClosedHow` của khoản vay và `ReleasedDate` cho mọi liên kết. Với `offset`: tất toán thêm sổ `OffsetSavingsBookId` (`IsClosed`, `ClosedDate`, `ClosingInterest = p_book_closing_interest`).
- Cột đánh dấu: `CreditContracts."MovedToPledgeLoanId"`, `LoanContracts."MovedToPledgeLoanId"` (bigint, FK `PledgeLoans`, NULL), `Collaterals."MovedToSavingsBookId"` (bigint, FK `SavingsBooks`, NULL).

Các ràng buộc bắt buộc ở database:
- `BookNumber`, `ContractNumber` duy nhất theo `lower(btrim(...))`, như `CardContracts_CardContractNumber_key` ở migration 37.
- `Amount > 0`. Tiền trả, `PrincipalCovered`, `PaidInterest` không âm. `DueDate > DisbursementDate`. `DepositType`, `TenorUnit`, `InterestPaymentMethod`, `Kind` nằm trong tập giá trị hợp lệ.
- `Kind = 'offset'` thì `OffsetSavingsBookId` khác NULL.
- Liên kết duy nhất theo (`PledgeLoanId`, `SavingsBookId`). Sổ phải cùng `CustomerId` với khoản vay: kiểm trong `save_pledge_loan`, báo lỗi `Sổ ... không thuộc khách hàng của khoản vay`.
- `record_pledge_repayment` từ chối khi khoản vay đã tất toán (`Khoản vay đã tất toán`), và khi `partial` có `PrincipalPaid` ≤ 0 hoặc ≥ dư nợ (`Gốc trả trước một phần phải lớn hơn 0 và nhỏ hơn dư nợ`). Dư nợ = `Amount − Σ PrincipalPaid`.
- RLS: bật trên cả bốn bảng. `SavingsBooks` và `PledgeLoans` dùng `public.can_access_customer("CustomerId")`. Hai bảng con dùng hàm `public.can_access_pledge_loan(bigint)` (SECURITY DEFINER, mẫu `can_access_card_contract` ở migration 37). `REVOKE ALL ... FROM anon`.

- [ ] **Step 1: Viết test PGlite thất bại.** Dựng database theo mẫu `src/lib/__tests__/customerTransferRls.test.ts`: role, `auth.uid()`, các bảng `Customers`/`CreditContracts`/`LoanContracts`/`Collaterals` tối thiểu, `can_access_customer` giả. Các ca test:
  - `chu so huu tao va doc duoc so, nguoi la khong thay`
  - `save_pledge_loan tao khoan vay va 2 lien ket, so khac khach bi tu choi`
  - `record_pledge_repayment partial ghi dong tra, khoan vay van mo`
  - `partial voi goc >= du no bi tu choi`
  - `full dong khoan vay va giai chap moi lien ket`
  - `offset dong ca so va luu ClosingInterest`
  - `tra no lan hai tren khoan da tat toan bi tu choi`
  - `BookNumber trung sau chuan hoa bi tu choi`
  - `anon khong doc duoc bang nao`
  - `rollback go sach, chay lai migration duoc`
- [ ] **Step 2:** `npx vitest run src/lib/__tests__/huyDongCamCoMigration.test.ts`. Kỳ vọng FAIL vì chưa có tệp migration.
- [ ] **Step 3:** Viết migration 76 và rollback 76, kèm chú thích ở đầu tệp nói vì sao tách bảng (theo lối migration 37). Viết kiểu TS và cập nhật `database.types.ts`.
- [ ] **Step 4:** Chạy lại test. Kỳ vọng PASS. Chạy `npx tsc --noEmit`, kỳ vọng sạch.
- [ ] **Step 5:** Commit `feat: schema huy động và cầm cố sổ tiết kiệm (migration 76)`.

### Task 2: Hàm thuần cho sổ và khoản vay

**Files:**
- Create: `src/lib/savingsBook.ts`, `src/lib/pledgeLoan.ts`
- Test: `src/lib/__tests__/savingsBook.test.ts`, `src/lib/__tests__/pledgeLoan.test.ts`

**Interfaces:**
- Consumes: kiểu ở Task 1; `accruedInterest`, `addTenor`, `DEFAULT_NON_TERM_RATE_ANNUAL`, `calcOverduePenalty` từ `stkPledge.ts`; `diffDays` từ `calcMath.ts`; `debtGroupFromOverdueDays` từ `loanMath.ts`.
- Produces (`savingsBook.ts`):
  - `savingsMaturityDate(b: SavingsBook): string | null`: `b.MaturityDate`, nếu thiếu thì tính bằng `addTenor`; thiếu dữ liệu thì `null`.
  - `savingsPrincipalVnd(b): number`: `Amount × ExchangeRate` với ngoại tệ.
  - `savingsPledgeCapacity(b): number | null`: ngoại tệ = 90% gốc quy đổi. `end_term` = gốc + lãi đến đáo hạn. `periodic`/`upfront` = gốc − `PaidInterest`. Thiếu lãi suất, ngày gửi hoặc kỳ hạn thì `null` (riêng ngoại tệ không cần lãi suất).
  - `allocateObligations(loans: PledgeLoan[], links: PledgeLoanLink[], repayments: PledgeLoanRepayment[]): Map<number, BookAllocation[]>`, với `BookAllocation { pledgeLoanId: number; contractNumber: string; principalCovered: number; obligation: number; dueDate: string }`. Chỉ tính khoản vay chưa tất toán và liên kết chưa giải chấp. `obligation = round(obligationAtDue(loan) × PrincipalCovered / Σ PrincipalCovered của khoản đó)`.
  - `savingsFreeCapacity(b, allocations: BookAllocation[]): number | null`: `capacity − Σ obligation`, có thể âm; `null` khi capacity là `null`.
- Produces (`pledgeLoan.ts`):
  - `outstandingPrincipal(loan, repayments): number`
  - `lastInterestDate(loan, repayments): string`: ngày trả gần nhất, hoặc `DisbursementDate` nếu chưa trả.
  - `interestBetween(principal: number, ratePercent: number, from: string, to: string): number`
  - `obligationAtDue(loan, repayments): number`: dư nợ + lãi từ `lastInterestDate` đến `DueDate`.
  - `overdueDays(loan, repayments, asOf: string): number`: 0 nếu đã tất toán, dư nợ bằng 0, hoặc chưa qua `DueDate`.
  - `pledgeLoanDebtGroup(loan, repayments, asOf): number`
  - `pledgeLoanStatus(loan, repayments, asOf): { tone: 'pos' | 'warn' | 'neg' | 'mute'; label: string }`, nhãn theo mockup: "Đã tất toán", "Quá hạn N ngày", "Đến hạn sau N ngày" (≤ 30 ngày), "Trong hạn".
  - `quoteRepayment(input: RepaymentQuoteInput): RepaymentQuote`, với
    - `RepaymentQuoteInput { loan; repayments; kind: PledgeRepaymentKind; date: string; principal?: number; offsetBook?: SavingsBook; offsetBookOtherLoans?: string[] }`
    - `RepaymentQuote { ok: boolean; error?: string; interest: number; principal: number; principalPenalty: number; interestPenalty: number; total: number; remainingPrincipal: number; nextInterestFrom: string | null; offset?: { early: boolean; savingsRatePercent: number; savingsInterest: number; savingsTotal: number; balance: number }; warnings: string[] }`
    - `kind = 'due'` thì ngày trả lấy `loan.DueDate`. `full`/`due`/`offset` trả toàn bộ dư nợ. Ngày trả sau `DueDate`: lãi trong hạn tính đến `DueDate`, phạt bằng `calcOverduePenalty` (phạt gốc 150% lãi suất, phạt lãi 10%/năm). `balance` dương nghĩa là trả lại khách, âm nghĩa là khách nộp thêm.
    - Cảnh báo, giữ nguyên câu của mockup: tất toán trước đáo hạn ("Tất toán trước ngày đáo hạn dd/mm/yyyy: lãi sổ tính theo lãi suất không kỳ hạn."); sổ còn bảo đảm khoản khác ("Sổ X còn bảo đảm cho Y. Tất toán sổ phải xử lý cả khoản đó.").
  - `pledgeLoanWarnings(loan, links, books): string[]`: "Ngày đến hạn vượt ngày đáo hạn sớm nhất của sổ bảo đảm.", và "Nghĩa vụ vượt khả năng bảo đảm của sổ X." khi còn trống âm.

- [ ] **Step 1: Viết test thất bại.** Dữ liệu là bộ mẫu trong mockup: sổ 001 (500.000.000, 5,2%, 15/04/2026, 12 tháng), sổ 002 (300.000.000, 4,7%, 02/08/2026, 6 tháng), khoản 0418 (400.000.000, 6,5%, 20/06/2026 → 15/02/2027, liên kết sổ 001 với 400.000.000), khoản 0907 (350.000.000, 6,2%, 07/09/2026 → 02/02/2027, liên kết sổ 002 với 290.000.000 và sổ 001 với 60.000.000). Các khẳng định:
  - `interestBetween(400000000, 6.5, '2026-06-20', '2026-10-27') === 9189041`
  - `obligationAtDue(khoản 0418, []) === 417095890`; `obligationAtDue(khoản 0907, []) === 358798904`
  - `savingsPledgeCapacity(sổ 001) === 526000000`; `savingsPledgeCapacity(sổ 002) === 307107945`
  - `savingsFreeCapacity(sổ 002, ...) === 9817425`
  - Bất biến: với mọi sổ, `free + Σ obligation === capacity`. Với mọi khoản vay, `Σ PrincipalPaid + outstandingPrincipal === Amount`.
  - Trả trước một phần 100.000.000 vào 27/10/2026 trên khoản 0418: `interest 9189041`, `total 109189041`, `remainingPrincipal 300000000`, `nextInterestFrom '2026-10-27'`. Sau đó `lastInterestDate === '2026-10-27'`, và lãi đến hạn tính trên 300.000.000.
  - Tất toán sổ 001 để cấn trừ khoản 0418 vào 27/10/2026: `offset.savingsTotal 500534247`, `total 409189041`, `offset.balance 91345206`, `early true`, có cảnh báo nhắc tới `CC-2026-0907`.
  - Trả khoản 0418 vào 25/02/2027 (trễ 10 ngày): `interest 17095890`, `principalPenalty 1068493`, `interestPenalty 46838`, `total 418211221`. `overdueDays === 10`, `pledgeLoanDebtGroup === 2`.
  - Review Focus 1 và 2: partial với gốc 0, với gốc bằng dư nợ, với ngày trả trước `lastInterestDate` đều trả `ok:false` kèm `error`.
  - Review Focus 3: sổ có `InterestRate: null` thì capacity và free là `null`.
  - `pledgeLoanStatus` trả đủ bốn nhãn ở các ngày biên: 30 ngày trước hạn là warn, 31 ngày là pos, ngày hôm sau ngày đến hạn là neg.
- [ ] **Step 2:** `npx vitest run src/lib/__tests__/savingsBook.test.ts src/lib/__tests__/pledgeLoan.test.ts`. Kỳ vọng FAIL.
- [ ] **Step 3:** Viết hai tệp theo chữ ký ở trên.
- [ ] **Step 4:** Chạy lại. Kỳ vọng PASS.
- [ ] **Step 5:** Commit `feat: tính lãi, dư nợ và trả nợ khoản vay cầm cố`.

### Task 3: Tầng API

**Files:**
- Create: `src/lib/api/savingsBookApi.ts`, `src/lib/api/pledgeLoanApi.ts`; Modify: `src/lib/api.ts` (export)
- Test: `src/lib/api/__tests__/pledgeLoanApi.test.ts` (giả `supabase` theo mẫu test sẵn có trong thư mục đó)

**Interfaces:**
- Produces:
  - `fetchSavingsBooksByCustomerAPI(customerId: number): Promise<SavingsBook[]>`
  - `saveSavingsBookAPI(b: Partial<SavingsBook>): Promise<SavingsBook>`: tự tính `MaturityDate` bằng `savingsMaturityDate`.
  - `fetchPledgeLoanBundleByCustomerAPI(customerId: number): Promise<{ loans: PledgeLoan[]; links: PledgeLoanLink[]; repayments: PledgeLoanRepayment[] }>`
  - `fetchAllPledgeLoanBundlesAPI(scope?: OwnerScope): Promise<PledgeBundle>` (mỗi khoản vay kèm `customer` qua `customerEmbed`); dùng `applyOwnerScope` như `fetchCardContractsAPI`.
  - `savePledgeLoanAPI(loan: Partial<PledgeLoan>, links: Array<Pick<PledgeLoanLink, 'SavingsBookId' | 'PrincipalCovered'>>): Promise<number>`: gọi `rpc('save_pledge_loan')`.
  - `recordPledgeRepaymentAPI(loanId: number, r: Omit<PledgeLoanRepayment, 'Id' | 'PledgeLoanId' | 'CreatedAt'>, bookClosingInterest: number | null): Promise<number>`
  - Lỗi trùng số chứng từ (23505) đổi sang câu tiếng Việt: `Số sổ "X" đã tồn tại trên hệ thống.` / `Số HĐ cầm cố "X" đã tồn tại trên hệ thống.`. Mọi lỗi khác ném nguyên thông điệp của server.

- [ ] **Step 1:** Viết test thất bại: `savePledgeLoanAPI` gọi `rpc('save_pledge_loan', { p_loan, p_links })` với đúng tham số; lỗi 23505 đổi thành câu tiếng Việt; lỗi khác giữ nguyên `message`.
- [ ] **Step 2:** Chạy, kỳ vọng FAIL.
- [ ] **Step 3:** Viết hai tệp API.
- [ ] **Step 4:** Chạy, kỳ vọng PASS.
- [ ] **Step 5:** Commit `feat: API sổ tiết kiệm và khoản vay cầm cố`.

### Task 4: Lọc bản ghi đã chuyển và tổng hợp danh mục

**Files:**
- Modify: `src/lib/api/loanContractApi.ts`, `src/lib/api/creditContractApi.ts`, `src/lib/api/collateralApi.ts`: mọi câu `select` dùng để **liệt kê** (không đụng các câu kiểm trùng số chứng từ) thêm `.is('MovedToPledgeLoanId', null)` hoặc `.is('MovedToSavingsBookId', null)`
- Create: `src/lib/pledgePortfolio.ts`; Test: `src/lib/__tests__/pledgePortfolio.test.ts`, `src/lib/api/__tests__/movedRecordsFilter.test.ts`
- Modify: `src/components/views/DashboardView.tsx` (tải thêm `fetchAllPledgeLoanBundlesAPI`, cộng vào tổng dư nợ, số KH có dư nợ, bucket "Cầm cố sổ tiết kiệm" của `loanMethodStats`, `debtGroupStats`)
- Modify: `src/lib/reports/loaders.ts` (`loadDueRows` nối thêm dòng cầm cố; `loadPortfolioParams` tải thêm bundle cầm cố), `src/lib/reports/alertLoader.ts` nếu cảnh báo đến hạn cũng đọc từ KUNN
- Modify: `src/lib/customerPortfolioExport.ts`: thêm `pledge?: PledgeBundle` vào `CustomerPortfolioExportParams`. `buildActivePortfolioData` nối thêm một dòng cho mỗi khoản cầm cố còn mở: số KUNN và số HĐTD đều là `ContractNumber`, phương thức là "Cầm cố sổ tiết kiệm", dư nợ lấy từ `outstandingPrincipal`, TSBĐ là danh sách số sổ, giá trị TSBĐ = Σ `savingsPrincipalVnd`. Trường nào không có nghĩa tương ứng thì để trống. Truyền `pledge` từ `useCustomerPortfolio` và `loadPortfolioParams`.

**Interfaces:**
- Produces (`pledgePortfolio.ts`):
  - `summarizePledgePortfolio(bundle: PledgeBundle, asOf: string): { count: number; outstanding: number; collateralValue: number; customerIds: Set<number>; byDebtGroup: Record<1 | 2 | 3 | 4 | 5, { count: number; amount: number }> }`. `collateralValue` = Σ `savingsPrincipalVnd` của các sổ chưa tất toán đang có liên kết chưa giải chấp, mỗi sổ cộng một lần. Dashboard cộng số này vào `colVal`, để LTV không bị đội lên khi TSBĐ cũ bị lọc ra.
  - `pledgeLoanDueRow(loan, repayments, customer: Pick<Customer, 'Cif' | 'FullName'>): DueSheetRow`, với `kunnNumber = ContractNumber`, `periodNumber = 1`, `dueDate = DueDate`, `principal = outstanding`, `interest` = lãi đến hạn, `total`, `outstanding`, `storedDebtGroup` = nhóm nợ tính sống, `overdueSchedules: []`. Tên trường CIF lấy theo kiểu `Customer` thật.

- [ ] **Step 1:** Viết test thất bại:
  - `summarizePledgePortfolio` trên bộ mẫu, ngày 27/10/2026: `count 2`, `outstanding 750000000`, `collateralValue 800000000` (sổ 001 chỉ cộng một lần), `byDebtGroup[1].amount 750000000`.
  - `buildActivePortfolioData` với `pledge` có thêm 2 dòng, dư nợ 400.000.000 và 350.000.000. Với ngày 25/02/2027 khi khoản 0418 chưa trả: khoản 0418 vào nhóm 2.
  - `movedRecordsFilter`: giả client, gọi lần lượt `fetchContractsStrictAPI`, `fetchContractsByCustomerAPI`, các hàm fetch HĐTD và TSBĐ dùng để liệt kê, khẳng định mỗi hàm gọi `.is('MovedTo…', null)` (Review Focus 4).
- [ ] **Step 2:** Chạy, kỳ vọng FAIL.
- [ ] **Step 3:** Viết `pledgePortfolio.ts`, thêm bộ lọc vào các hàm API, nối vào Dashboard và báo cáo đến hạn. Phần cộng nằm trong `useMemo` sẵn có của Dashboard và chỉ cộng số từ `summarizePledgePortfolio`, không tính lại trong JSX.
- [ ] **Step 4:** `npm test`, kỳ vọng PASS toàn bộ, gồm cả test Dashboard và báo cáo sẵn có.
- [ ] **Step 5:** Commit `feat: dư nợ cầm cố vào Dashboard và báo cáo đến hạn; lọc bản ghi đã chuyển`.

### Task 5: Hooks dữ liệu và điều phối

**Files:**
- Create: `src/hooks/useSavingsPledgeData.ts`, `src/hooks/useSavingsPledgeController.ts`
- Test: `src/hooks/__tests__/useSavingsPledgeController.test.ts` (theo mẫu test hook sẵn có trong thư mục đó)

**Interfaces:**
- Consumes: API ở Task 3, hàm ở Task 2, `useSelectedCustomerId` / `useCustomerNavigate`.
- Produces:
  - `useSavingsPledgeData(customerId: number | null)` → `{ books; loans; links; repayments; loading; error: string | null; reload(); saveBook(b); saveLoan(loan, links); recordRepayment(loanId, quote: RepaymentQuote, kind, date, offsetBookId) }`. Mỗi thao tác ghi xong thì `reload()`. Lỗi giữ nguyên thông điệp.
  - `useSavingsPledgeController()` → `{ customer; customers; setSelectedCustomerId; tab: 'savings' | 'loans'; setTab; selectedBookId; selectBook; selectedLoanId; selectLoan; bookRows; loanRows; bookKpis; loanKpis; bookDetail; loanDetail; bookForm; loanForm; repayDialog; notification; data }`. Các số liệu dẫn xuất (KPI, còn trống, trạng thái, báo giá trả nợ) tính trong `useMemo` bằng hàm Task 2, không tính trong component.
  - `repayDialog`: `{ open; openFor(loanId); close(); kind; setKind; date; setDate; principal; setPrincipal; offsetBookId; setOffsetBookId; quote: RepaymentQuote; submit() }`. `submit` bị vô hiệu khi `!quote.ok`.

- [ ] **Step 1:** Viết test thất bại: KPI "Còn trống để cầm cố" bỏ qua sổ có capacity `null`; đổi `kind` sang `due` thì `date` thành `loan.DueDate`; `submit` không gọi API khi `quote.ok === false`.
- [ ] **Step 2:** Chạy, kỳ vọng FAIL.
- [ ] **Step 3:** Viết hai hook.
- [ ] **Step 4:** Chạy, kỳ vọng PASS.
- [ ] **Step 5:** Commit `feat: hook điều phối tab Huy động & Cầm cố`.

### Task 6: Màn hình và đăng ký tab

**Files:**
- Create: `src/components/views/SavingsPledgeView.tsx`, `src/components/savingsPledge/{SavingsBookTable,SavingsBookDetail,PledgeLoanTable,PledgeLoanDetail,SavingsPledgeKpis,SavingsBookForm,PledgeLoanForm,RepaymentDialog}.tsx`
- Modify: `src/lib/navigation.ts` (`ScreenId` thêm `'savings-pledge'`; mục menu đặt ngay sau `mortgage-contracts`, `labelKey 'nav.savingsPledge'`, icon `PiggyBank`, keywords `['huy dong', 'so tiet kiem', 'stk', 'cam co', 'tien gui']`), `src/lib/routes.ts` (`'savings-pledge': '/savings-pledge'`), `src/lib/i18n.ts` (vi `Huy động & Cầm cố`, en `Deposits & pledge loans`), `src/lib/modules.ts` (`'savings-pledge': 'credit'`), `src/lib/customerRoutes.ts` (thêm vào `CUSTOMER_SCOPED_SCREENS`), `src/lib/workspaceNavigation.ts` (nhóm `credit`, sau `mortgage-contracts`), `src/components/LifecycleStepper.tsx` (thêm `/savings-pledge` vào `isCreditPillar` và vào điều kiện loại trừ của bước CIF; không thêm bước mới), `src/App.tsx` (hai `Route` như `credit-cards`, lazy import)
- Test: `src/components/__tests__/SavingsPledgeView.test.tsx`

**Interfaces:**
- Consumes: `useSavingsPledgeController` ở Task 5. Component chỉ nhận props và phát callback.

Bố cục theo mockup: thanh khách hàng, tiêu đề cùng hai nút, hai tab có số đếm, dải 4 KPI (`data-metric-tone`), bảng bên trái, khung chi tiết bên phải (dồn xuống dưới khi ≤ 1180px). Dùng lớp sẵn có trong `src/lib/uiClasses.ts` (`PANEL`, `BTN_PRIMARY`, `HEADING_SCREEN`…) và token màu của app, không chép CSS của mockup. Form sổ gồm: số sổ, loại tiền gửi, tiền tệ và tỷ giá (chỉ hiện khi chọn ngoại tệ), số tiền, lãi suất, ngày gửi, kỳ hạn và đơn vị, phương thức lãnh lãi, lãi đã chi (chỉ hiện khi lãnh định kỳ hoặc lãnh trước), ghi chú. Form khoản vay gồm: số HĐ cầm cố, số tiền, lãi suất, ngày giải ngân, ngày đến hạn (hiện "N ngày" ngay cạnh), mục đích (`LOAN_PURPOSES`), danh sách sổ chọn kèm phần gốc bảo đảm; tổng phần gốc phải bằng số tiền vay; cảnh báo lấy từ `pledgeLoanWarnings`. Sổ còn thiếu thông tin có pill "Thiếu thông tin" (tone warn) trên dòng.

- [ ] **Step 1:** Viết test thất bại (Testing Library, hook giả): hai tab hiện số đếm; bấm một dòng thì khung chi tiết đổi theo; bấm số sổ trong chi tiết khoản vay thì chuyển tab và chọn đúng sổ; hộp thoại trả nợ hiện `quote.error` và khoá nút "Ghi nhận trả nợ"; trạng thái lỗi tải hiện nguyên thông điệp, khác với trạng thái rỗng.
- [ ] **Step 2:** Chạy, kỳ vọng FAIL.
- [ ] **Step 3:** Viết các component và đăng ký tab.
- [ ] **Step 4:** Chạy `npm test`, kỳ vọng PASS. Chạy thêm `node C:/Users/Zinya/.claude/skills/ui-design/scripts/lint.mjs src/components/savingsPledge src/components/views/SavingsPledgeView.tsx --app --allow shadow` (giữ `shadow` vì thẻ KPI của repo có bóng), kỳ vọng 0 FAIL.
- [ ] **Step 5:** Commit `feat: tab Huy động & Cầm cố`.

### Task 7: Bỏ phương thức cầm cố khỏi luồng HĐTD

**Files:**
- Modify: `src/hooks/useCreditContractController.ts:24`, `src/lib/kunnForm.ts:12`: bỏ `'Cầm cố sổ tiết kiệm'` khỏi danh sách chọn khi **tạo mới**. Khi sửa bản ghi cũ có giá trị đó, giá trị vẫn hiện để không mất dữ liệu.
- Giữ nguyên `src/lib/loanProductRules.ts`.
- Test: bổ sung vào test sẵn có của `kunnForm` / controller HĐTD.

- [ ] **Step 1:** Viết test thất bại: danh sách lựa chọn khi tạo mới không có "Cầm cố sổ tiết kiệm"; khi sửa bản ghi đang mang giá trị đó, lựa chọn vẫn có mặt.
- [ ] **Step 2:** Chạy, kỳ vọng FAIL. **Step 3:** Sửa. **Step 4:** Chạy, kỳ vọng PASS.
- [ ] **Step 5:** Commit `feat: tạo khoản cầm cố STK ở tab riêng, bỏ khỏi HĐTD`.

### Task 8: Migration 77 chuyển dữ liệu cũ

**Files:**
- Create: `supabase/migrations/77_chuyen_cam_co_cu.sql`, `supabase/rollbacks/77_chuyen_cam_co_cu_rollback.sql`
- Test: `src/lib/__tests__/chuyenCamCoCuMigration.test.ts` (PGlite, chạy migration 76 rồi 77)

Thuật toán (trong một transaction):
1. Tập nguồn: HĐTD có `LoanMethod = 'Cầm cố sổ tiết kiệm'` cùng các KUNN thuộc chúng, và KUNN tự mang `LoanMethod` đó; chỉ lấy bản ghi có `MovedToPledgeLoanId IS NULL`.
2. Mỗi KUNN thành một `PledgeLoans`: `ContractNumber` = số KUNN, `Amount = ContractAmount`, `InterestRate = NormalInterestRate` (phần trăm; giá trị ≤ 1 thì nhân 100, như cách `loanMath.ts:195` xử lý), `DisbursementDate`, `DueDate = ContractEndDate`, `IsClosed`/`ClosedDate` theo KUNN, `Legacy*Id`. HĐTD không có KUNN thì lấy số tiền và ngày từ HĐTD. Nếu `TotalPrincipalPaid > 0` và khoản vay còn mở thì thêm một dòng trả `partial` vào ngày `UpdatedAt::date`, ghi chú `Chuyển từ KUNN`.
3. TSBĐ gắn với các khoản đó (qua `LoanContracts.CollateralId` hoặc `CreditContracts.CollateralIds`) thành `SavingsBooks`: `BookNumber = coalesce(AssetCode, 'TSBD-' || Id)`, `Amount = coalesce(Value, AppraisedValue)`, các trường khác để NULL, `MovedFromCollateralId`. Đặt `Collaterals.MovedToSavingsBookId`.
4. Liên kết: khoản vay có một sổ thì `PrincipalCovered = Amount`. Có nhiều sổ thì chia theo tỷ lệ `Amount` của sổ, phần lẻ dồn vào sổ cuối, và thêm `Note = 'Chia tự động khi chuyển, cần kiểm lại'`.
5. Đặt `MovedToPledgeLoanId` cho HĐTD và KUNN nguồn.
6. Đối soát trong cùng transaction: số khoản vay, tổng `Amount`, tổng dư nợ (`Amount − Σ PrincipalPaid` so với `Σ CurrentPrincipalBalance` của nguồn). Lệch thì `RAISE EXCEPTION` để rollback cả khối.
7. Chạy lại lần hai không tạo bản ghi trùng.

- [ ] **Step 1:** Viết test PGlite thất bại: một HĐTD, hai KUNN, ba TSBĐ (một sổ dùng cho cả hai khoản); sau migration có 2 `PledgeLoans`, 3 `SavingsBooks`, đủ liên kết, tổng dư nợ khớp; chạy lại lần hai không đổi số đếm; rollback trả về trạng thái ban đầu; cố tình làm lệch dư nợ thì migration báo lỗi và không ghi gì.
- [ ] **Step 2:** Chạy, kỳ vọng FAIL. **Step 3:** Viết migration và rollback. **Step 4:** Chạy, kỳ vọng PASS.
- [ ] **Step 5:** Commit `feat: migration 77 chuyển khoản cầm cố cũ sang tab mới`.

### Task 9: Áp lên Supabase thật (cần người dùng duyệt), kiểm trên app, ghi tiến độ

- [ ] **Step 1:** Tạo nhánh backup `git branch backup-YYYYMMDD-HHMM`.
- [ ] **Step 2:** Đưa người dùng câu đếm chỉ đọc để chạy trong SQL Editor, rồi báo lại số liệu:
  ```sql
  SELECT
    (SELECT count(*) FROM "CreditContracts" WHERE "LoanMethod" = 'Cầm cố sổ tiết kiệm') AS hdtd,
    (SELECT count(*) FROM "LoanContracts" k LEFT JOIN "CreditContracts" c ON c."Id" = k."CreditContractId"
       WHERE k."LoanMethod" = 'Cầm cố sổ tiết kiệm' OR c."LoanMethod" = 'Cầm cố sổ tiết kiệm') AS kunn,
    (SELECT coalesce(sum(k."CurrentPrincipalBalance"), 0) FROM "LoanContracts" k LEFT JOIN "CreditContracts" c ON c."Id" = k."CreditContractId"
       WHERE (k."LoanMethod" = 'Cầm cố sổ tiết kiệm' OR c."LoanMethod" = 'Cầm cố sổ tiết kiệm') AND NOT k."IsClosed") AS du_no;
  ```
- [ ] **Step 3:** **Dừng lại, chờ người dùng duyệt.** Người dùng chạy migration 76 rồi 77 trong SQL Editor. Sau đó đo bằng truy vấn chỉ đọc: số dòng ở bốn bảng mới và tổng dư nợ phải khớp với số ở Step 2.
- [ ] **Step 4:** Chạy app (`preview_start web`) trên database đã áp. Mở tab với một khách thật, đối chiếu sổ và khoản vay đã chuyển. Tổng dư nợ trên Dashboard trước và sau phải bằng nhau. Chỉ thử tạo sổ, tạo khoản vay hay trả nợ khi người dùng đồng ý ghi dữ liệu thật; nếu không, thử trên database PGlite hoặc dữ liệu thử do người dùng chỉ định.
- [ ] **Step 5:** `npm test && npm run build` xanh. Ghi một mục vào `docs/progress/2026-10.md` theo khuôn trong `docs/progress/README.md`. Cập nhật `D:/agent-kit/skills/tin-dung/references/` (phần cầm cố STK và huy động) và commit ở repo `agent-kit`. Commit tài liệu ở repo này.
- [ ] **Step 6:** Push chỉ khi người dùng bảo. Sau push, xác nhận Vercel đã deploy bản mới (`● Ready`). **Migration 76 và 77 phải được áp trước khi deploy mã**, vì Dashboard sẽ gọi bảng mới.
