# Hợp đồng thế chấp (HĐTC) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm màn "Hợp đồng thế chấp" theo khách hàng. Mỗi HĐTC gắn nhiều tài sản bảo đảm và nhiều HĐTD, có trigger toàn vẹn và RLS. Hai màn HĐTD và Tài sản bảo đảm hiện ngược, chỉ đọc.

**Architecture:**
- **Dữ liệu:** một bảng `MortgageContracts` và hai bảng nối, có khóa ngoại thật. Quyền đi theo khách hàng qua `can_access_customer`.
- **Logic thuần** (kiểm tra, lọc, nhãn, chênh lệch liên kết, phân trang) nằm ở `src/lib/mortgageContract.ts`.
- **API** đọc HĐTC kèm hai bảng nối bằng embed của PostgREST, và ghi bảng nối theo chênh lệch.
- **Màn hình** theo mẫu màn Tài sản bảo đảm: controller hook, bảng tự dựng có phân trang, form dạng ngăn kéo `Dialog`.

**Tech Stack:** React 19 + TypeScript + Vite, TailwindCSS 4, Supabase (PostgreSQL + RLS), Vitest + Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-24-hop-dong-the-chap-design.md`

## Global Constraints

- Tầng: công thức/biến đổi thuần ở `src/lib/`; trạng thái và gọi Supabase ở `src/hooks/` và `src/lib/api/`; hiển thị ở `src/components/`; kiểu dùng chung ở `src/types/`. Không khai kiểu nghiệp vụ trong component.
- Không dùng `||` khi `0` là giá trị hợp lệ. Dùng `??` hoặc kiểm `null`/`undefined` tường minh.
- Không nuốt lỗi: không có `catch` rỗng ở luồng lưu/xóa.
- Không nhét dữ liệu nghiệp vụ vào `Note`.
- Tiền nhập qua `formatMoneyInput` / `parseMoneyInput` (`src/lib/utils.ts`). Hiển thị qua `fmtMoney`.
- Ngày hiển thị qua `fmtDate`. Không dùng `toISOString().split('T')[0]`; hôm nay là `todayIso()`.
- Giao diện: bảng màu grayscale/slate. Nhóm con dùng thanh màu trái + tiêu đề, không viền lồng. `backdrop-blur-md` trở lên bị vô hiệu toàn cục.
- Migration: tệp `supabase/migrations/58_hop_dong_the_chap.sql`, chạy lại nhiều lần an toàn. Áp lên CSDL thật **chỉ sau khi hỏi người dùng**, và trước khi deploy code.
- Mọi thông báo lỗi cho người dùng viết tiếng Việt.
- Commit message kết thúc bằng `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Nhánh làm việc: `feat/hop-dong-the-chap`.

## Review Focus

1. **Lưu HĐTC mới xong nhưng ghi bảng nối lỗi.** Người dùng bấm Lưu lần nữa phải thành **cập nhật** HĐTC vừa tạo, không được chèn trùng và báo "số đã tồn tại". Test ở Task 3 (lỗi mang `mortgageId`) và Task 5 (controller chuyển form sang chế độ sửa).
2. **Xóa tài sản hay HĐTD đang nằm trong một HĐTC** phải ra thông báo tiếng Việt dễ hiểu, không lộ lỗi khóa ngoại tiếng Anh của Postgres. Riêng HĐTD không được báo nhầm "còn 0 KUNN". Test ở Task 2 (`mortgageLinkErrorMessage`) và Task 3.
3. **Xóa khách hàng còn HĐTC** phải bị chặn bằng thông báo cùng kiểu với KUNN, HĐTD, tài sản. Test ở Task 3 (`customerDeleteBlockers`).
4. **Đổi khách hàng trên thanh khách hàng khi dữ liệu khách cũ về muộn**, không được hiện HĐTC của khách cũ. Test ở Task 4 (token nạp dữ liệu). Form đang mở cũng phải đóng khi đổi khách (effect theo `customerId` trong controller).
5. **Đổi bộ lọc hoặc từ khóa khi đang ở trang 3** phải về trang 1, không để trang trống. Test ở Task 2 (`paginate` kẹp trang) và Task 4.

---

## File Structure

| Tệp | Tạo/Sửa | Trách nhiệm |
| :--- | :--- | :--- |
| `supabase/migrations/58_hop_dong_the_chap.sql` | Tạo | 3 bảng, khóa ngoại, trigger, RLS, tự kiểm |
| `src/types/index.ts` | Sửa | `MortgageContract` |
| `src/types/database.types.ts` | Sửa | 3 bảng mới |
| `src/lib/mortgageContract.ts` | Tạo | Hàm thuần |
| `src/lib/__tests__/mortgageContract.test.ts` | Tạo | Test hàm thuần |
| `src/lib/api/mortgageContractApi.ts` | Tạo | Đọc/ghi/xóa HĐTC |
| `src/lib/api/__tests__/mortgageContractApi.test.ts` | Tạo | Test API với Supabase giả |
| `src/lib/api.ts` | Sửa | Xuất API mới |
| `src/lib/api/collateralApi.ts` | Sửa | Thông báo khi xóa tài sản đang thế chấp |
| `src/lib/api/creditContractApi.ts` | Sửa | Thông báo khi xóa HĐTD đang được bảo đảm |
| `src/lib/customerStatus.ts`, `src/lib/api/customerApi.ts` | Sửa | Chặn xóa khách còn HĐTC |
| `src/lib/navigation.ts`, `src/lib/routes.ts`, `src/lib/customerRoutes.ts`, `src/lib/i18n.ts`, `src/App.tsx` | Sửa | Màn mới |
| `src/hooks/useMortgageContractController.ts` | Tạo | Trạng thái màn |
| `src/components/mortgage/MortgageContractToolbar.tsx` | Tạo | Nút thêm, tìm, lọc |
| `src/components/mortgage/MortgageContractTable.tsx` | Tạo | Bảng + phân trang |
| `src/components/mortgage/MortgageContractForm.tsx` | Tạo | Form ngăn kéo |
| `src/components/views/MortgageContractView.tsx` | Tạo | Ghép màn |
| `src/components/__tests__/MortgageContractView.test.tsx` | Tạo | Test màn + form |
| `src/hooks/useCreditContractController.ts`, `src/components/views/CreditContractView.tsx`, `src/components/creditContract/KunnAccordionItem.tsx` | Sửa | Dòng "HĐTC: …" |
| `src/hooks/useCollateralController.ts`, `src/components/views/CollateralView.tsx`, `src/components/collateral/CollateralTable.tsx` | Sửa | Cột "HĐTC" |
| `.agents/skills/tin-dung/references/collateral-ltv.md` + bản `.claude/` | Sửa | Tài liệu nghiệp vụ |
| `docs/progress/2026-09.md` | Sửa | Nhật ký |

---

### Task 1: Migration và kiểu dữ liệu

**Files:**
- Create: `supabase/migrations/58_hop_dong_the_chap.sql`
- Modify: `src/types/index.ts` (thêm sau `interface ContractCollateral`)
- Modify: `src/types/database.types.ts` (thêm 3 bảng, cạnh khối `Collaterals`)

**Interfaces:**
- Produces:
  - Kiểu `MortgageContract` (xem Step 2).
  - Tên bảng `MortgageContracts`, `MortgageContractCollaterals`, `MortgageContractCreditContracts`.
  - Tên khóa ngoại `fk_mortgage_link_collateral`, `fk_mortgage_link_credit_contract`.
  - Tên ràng buộc duy nhất `uq_mortgage_number`.

- [ ] **Step 1: Viết migration**

```sql
-- =====================================================================
-- 58 · Hợp đồng thế chấp (HĐTC)
-- =====================================================================
-- Một HĐTC gồm nhiều tài sản bảo đảm và bảo đảm cho nhiều HĐTD (nhiều–nhiều
-- cả hai phía). Khi HĐTD được tái cấp, HĐTD mới được gắn thêm vào HĐTC cũ.
--
-- Toàn vẹn đặt ở CSDL, không trông vào giao diện:
--   · chỉ nối tài sản / HĐTD cùng khách hàng với HĐTC        (trigger)
--   · không xoá HĐTC chưa giải chấp                           (trigger)
--   · không xoá tài sản / HĐTD đang nằm trong một HĐTC        (khoá ngoại NO ACTION)
--   · đã giải chấp thì phải có ngày giải chấp                 (CHECK)
--
-- Khoá ngoại phía tài sản / HĐTD là NO ACTION (kiểm cuối câu lệnh) để chuỗi
-- xoá theo khách hàng (khách → HĐTC → bảng nối, khách → tài sản) không vướng.
--
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public."MortgageContracts" (
  "Id"                 integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "CustomerId"         integer NOT NULL REFERENCES public."Customers"("Id") ON DELETE CASCADE,
  "MortgageNumber"     text    NOT NULL CHECK (btrim("MortgageNumber") <> ''),
  "SignedDate"         date,
  "Pledgor"            text,
  "MaxSecuredAmount"   numeric CHECK ("MaxSecuredAmount" IS NULL OR "MaxSecuredAmount" >= 0),
  "NotaryNumber"       text,
  "NotaryDate"         date,
  "NotaryOffice"       text,
  "RegistrationDate"   date,
  "RegistrationOffice" text,
  "IsReleased"         boolean NOT NULL DEFAULT false,
  "ReleasedDate"       date,
  "Note"               text,
  "CreatedAt"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mortgage_released_has_date CHECK (NOT "IsReleased" OR "ReleasedDate" IS NOT NULL),
  CONSTRAINT uq_mortgage_number UNIQUE ("CustomerId", "MortgageNumber")
);

COMMENT ON TABLE public."MortgageContracts" IS
  'Hợp đồng thế chấp. Tài sản và HĐTD được bảo đảm nằm ở hai bảng nối. Độc lập với CreditContracts.CollateralIds (hạn mức/LTV vẫn đọc cột đó).';
COMMENT ON COLUMN public."MortgageContracts"."Pledgor" IS
  'Bên thế chấp khi là bên thứ ba. NULL = chính khách hàng.';

CREATE INDEX IF NOT EXISTS idx_mortgage_contracts_customer
  ON public."MortgageContracts" ("CustomerId");

CREATE TABLE IF NOT EXISTS public."MortgageContractCollaterals" (
  "MortgageContractId" integer NOT NULL
    REFERENCES public."MortgageContracts"("Id") ON DELETE CASCADE,
  "CollateralId"       bigint  NOT NULL,
  PRIMARY KEY ("MortgageContractId", "CollateralId"),
  CONSTRAINT fk_mortgage_link_collateral FOREIGN KEY ("CollateralId")
    REFERENCES public."Collaterals"("Id") ON DELETE NO ACTION
);
CREATE INDEX IF NOT EXISTS idx_mortgage_collaterals_collateral
  ON public."MortgageContractCollaterals" ("CollateralId");

CREATE TABLE IF NOT EXISTS public."MortgageContractCreditContracts" (
  "MortgageContractId" integer NOT NULL
    REFERENCES public."MortgageContracts"("Id") ON DELETE CASCADE,
  "CreditContractId"   bigint  NOT NULL,
  PRIMARY KEY ("MortgageContractId", "CreditContractId"),
  CONSTRAINT fk_mortgage_link_credit_contract FOREIGN KEY ("CreditContractId")
    REFERENCES public."CreditContracts"("Id") ON DELETE NO ACTION
);
CREATE INDEX IF NOT EXISTS idx_mortgage_credit_contracts_credit_contract
  ON public."MortgageContractCreditContracts" ("CreditContractId");


-- ---------------------------------------------------------------------
-- Trigger 1: chỉ nối tài sản / HĐTD cùng khách hàng với HĐTC
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mortgage_link_same_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  mortgage_customer integer;
  target_customer   integer;
BEGIN
  SELECT "CustomerId" INTO mortgage_customer
    FROM public."MortgageContracts" WHERE "Id" = NEW."MortgageContractId";

  IF TG_TABLE_NAME = 'MortgageContractCollaterals' THEN
    SELECT "CustomerId" INTO target_customer
      FROM public."Collaterals" WHERE "Id" = NEW."CollateralId";
  ELSE
    SELECT "CustomerId" INTO target_customer
      FROM public."CreditContracts" WHERE "Id" = NEW."CreditContractId";
  END IF;

  IF target_customer IS DISTINCT FROM mortgage_customer THEN
    RAISE EXCEPTION 'Không gắn được: tài sản / HĐTD không thuộc khách hàng của hợp đồng thế chấp này.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mortgage_collaterals_same_customer ON public."MortgageContractCollaterals";
CREATE TRIGGER trg_mortgage_collaterals_same_customer
  BEFORE INSERT OR UPDATE ON public."MortgageContractCollaterals"
  FOR EACH ROW EXECUTE FUNCTION public.mortgage_link_same_customer();

DROP TRIGGER IF EXISTS trg_mortgage_credit_contracts_same_customer ON public."MortgageContractCreditContracts";
CREATE TRIGGER trg_mortgage_credit_contracts_same_customer
  BEFORE INSERT OR UPDATE ON public."MortgageContractCreditContracts"
  FOR EACH ROW EXECUTE FUNCTION public.mortgage_link_same_customer();


-- ---------------------------------------------------------------------
-- Trigger 2: không xoá HĐTC chưa giải chấp
-- ---------------------------------------------------------------------
-- pg_trigger_depth() > 1 nghĩa là đang bị xoá theo dây chuyền từ Customers
-- (chỉ admin xoá được khách, và việc đó là cố ý) — cho qua.
CREATE OR REPLACE FUNCTION public.mortgage_block_delete_unreleased()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT OLD."IsReleased" AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION 'Không xoá được HĐTC "%": hợp đồng chưa giải chấp. Ghi nhận giải chấp trước.', OLD."MortgageNumber";
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_mortgage_block_delete_unreleased ON public."MortgageContracts";
CREATE TRIGGER trg_mortgage_block_delete_unreleased
  BEFORE DELETE ON public."MortgageContracts"
  FOR EACH ROW EXECUTE FUNCTION public.mortgage_block_delete_unreleased();


-- ---------------------------------------------------------------------
-- RLS — suy quyền theo khách hàng, giống Collaterals
-- ---------------------------------------------------------------------
ALTER TABLE public."MortgageContracts"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MortgageContractCollaterals"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MortgageContractCreditContracts" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mortgage_contracts_all" ON public."MortgageContracts";
CREATE POLICY "mortgage_contracts_all" ON public."MortgageContracts"
  FOR ALL
  USING (public.can_access_customer("CustomerId"))
  WITH CHECK (public.can_access_customer("CustomerId"));

DROP POLICY IF EXISTS "mortgage_collaterals_all" ON public."MortgageContractCollaterals";
CREATE POLICY "mortgage_collaterals_all" ON public."MortgageContractCollaterals"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public."MortgageContracts" m
    WHERE m."Id" = "MortgageContractId" AND public.can_access_customer(m."CustomerId")))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public."MortgageContracts" m
    WHERE m."Id" = "MortgageContractId" AND public.can_access_customer(m."CustomerId")));

DROP POLICY IF EXISTS "mortgage_credit_contracts_all" ON public."MortgageContractCreditContracts";
CREATE POLICY "mortgage_credit_contracts_all" ON public."MortgageContractCreditContracts"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public."MortgageContracts" m
    WHERE m."Id" = "MortgageContractId" AND public.can_access_customer(m."CustomerId")))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public."MortgageContracts" m
    WHERE m."Id" = "MortgageContractId" AND public.can_access_customer(m."CustomerId")));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."MortgageContracts" TO authenticated;
GRANT SELECT, INSERT, DELETE ON public."MortgageContractCollaterals" TO authenticated;
GRANT SELECT, INSERT, DELETE ON public."MortgageContractCreditContracts" TO authenticated;


-- ---------------------------------------------------------------------
-- Tự kiểm: đủ 3 bảng, 3 trigger, 3 policy, RLS bật
-- ---------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public'
     AND tablename IN ('MortgageContracts','MortgageContractCollaterals','MortgageContractCreditContracts')) AS so_bang_3,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN (
     'trg_mortgage_collaterals_same_customer','trg_mortgage_credit_contracts_same_customer',
     'trg_mortgage_block_delete_unreleased')) AS so_trigger_3,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname IN (
     'mortgage_contracts_all','mortgage_collaterals_all','mortgage_credit_contracts_all')) AS so_policy_3,
  (SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname IN
     ('MortgageContracts','MortgageContractCollaterals','MortgageContractCreditContracts')) AS rls_bat;
```

Trước khi viết, kiểm `Collaterals."Id"` và `CreditContracts."Id"` là `integer` hay `bigint`. Cột nối khai `bigint` thì khóa ngoại tới `integer` vẫn hợp lệ trong Postgres, nhưng phải chắc chắn không phải `uuid`. Kiểm bằng:

```bash
grep -n '"Id"' supabase/migrations/14_credit_contracts.sql | head -3
grep -n "bigint REFERENCES \"Collaterals\"" supabase/migrations/37_hop_dong_the.sql
```

Expected: `CreditContracts."Id"` là `integer GENERATED …`; `37_hop_dong_the.sql` tham chiếu `Collaterals("Id")` bằng `bigint`, tức `Id` là số.

Kiểm thêm quyền đang cấp theo cách nào ở các bảng khác: `grep -n "GRANT" supabase/migrations/14_credit_contracts.sql supabase/migrations/37_hop_dong_the.sql`. Nếu các migration trước không `GRANT` tường minh, bỏ ba dòng `GRANT` ở trên cho khớp quy ước.

- [ ] **Step 2: Thêm kiểu `MortgageContract` vào `src/types/index.ts`**, ngay sau khối `export interface ContractCollateral { … }`:

```ts
export interface MortgageContract {
  Id: number;
  CustomerId: number;
  MortgageNumber: string;
  SignedDate?: string | null;
  Pledgor?: string | null;
  MaxSecuredAmount?: number | null;
  NotaryNumber?: string | null;
  NotaryDate?: string | null;
  NotaryOffice?: string | null;
  RegistrationDate?: string | null;
  RegistrationOffice?: string | null;
  IsReleased: boolean;
  ReleasedDate?: string | null;
  Note?: string | null;
  CreatedAt?: string;
  CollateralIds: number[];
  CreditContractIds: number[];
}
```

- [ ] **Step 3: Thêm 3 bảng vào `src/types/database.types.ts`**, ngay sau khối `Collaterals: { … };`, theo đúng khuôn `Row` / `Insert` / `Update` của khối đó:

```ts
      MortgageContracts: {
        Row: {
          Id: number;
          CustomerId: number;
          MortgageNumber: string;
          SignedDate: string | null;
          Pledgor: string | null;
          MaxSecuredAmount: number | null;
          NotaryNumber: string | null;
          NotaryDate: string | null;
          NotaryOffice: string | null;
          RegistrationDate: string | null;
          RegistrationOffice: string | null;
          IsReleased: boolean;
          ReleasedDate: string | null;
          Note: string | null;
          CreatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['MortgageContracts']['Row'], 'Id' | 'CreatedAt'> & {
          Id?: number;
          CreatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['MortgageContracts']['Insert']>;
      };

      MortgageContractCollaterals: {
        Row: { MortgageContractId: number; CollateralId: number };
        Insert: { MortgageContractId: number; CollateralId: number };
        Update: Partial<{ MortgageContractId: number; CollateralId: number }>;
      };

      MortgageContractCreditContracts: {
        Row: { MortgageContractId: number; CreditContractId: number };
        Insert: { MortgageContractId: number; CreditContractId: number };
        Update: Partial<{ MortgageContractId: number; CreditContractId: number }>;
      };
```

- [ ] **Step 4: Kiểm tra kiểu**

Run: `npx tsc -b`
Expected: không có lỗi.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/58_hop_dong_the_chap.sql src/types/index.ts src/types/database.types.ts
git commit -m "feat(the-chap): migration va kieu du lieu hop dong the chap

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Hàm thuần `mortgageContract.ts`

**Files:**
- Create: `src/lib/mortgageContract.ts`
- Test: `src/lib/__tests__/mortgageContract.test.ts`

**Interfaces:**
- Consumes: `MortgageContract`, `Collateral`, `CreditContract` từ `src/types`; `normalizeVi` từ `src/lib/mdsdv.ts`; `toIsoDate` từ `src/lib/utils.ts`.
- Produces:
  - `type MortgageStatusFilter = 'active' | 'released' | 'all'`
  - `type MortgageContractDraft = Omit<MortgageContract, 'Id' | 'CreatedAt'> & { Id?: number }`
  - `emptyMortgageDraft(customerId: number): MortgageContractDraft`
  - `validateMortgageContract(draft: MortgageContractDraft, existing: MortgageContract[]): string[]`
  - `filterMortgageContracts(list: MortgageContract[], opts: { status: MortgageStatusFilter; query: string }): MortgageContract[]`
  - `collateralLabels(ids: number[], collaterals: Collateral[]): string[]`
  - `creditContractLabels(ids: number[], creditContracts: CreditContract[]): string[]`
  - `mortgagesOfCollateral(collateralId: number, list: MortgageContract[]): MortgageContract[]`
  - `mortgagesOfCreditContract(creditContractId: number, list: MortgageContract[]): MortgageContract[]`
  - `linkDiff(before: number[], after: number[]): { add: number[]; remove: number[] }`
  - `paginate<T>(list: T[], page: number, pageSize: number): { rows: T[]; page: number; totalPages: number }`
  - `mortgageLinkErrorMessage(error: { code?: string; message?: string } | null | undefined, target: 'collateral' | 'credit_contract'): string | null`

- [ ] **Step 1: Viết test đỏ**

```ts
import { describe, it, expect } from 'vitest';
import {
  emptyMortgageDraft, validateMortgageContract, filterMortgageContracts,
  collateralLabels, creditContractLabels, mortgagesOfCollateral, mortgagesOfCreditContract,
  linkDiff, paginate, mortgageLinkErrorMessage,
} from '../mortgageContract';
import type { Collateral, CreditContract, MortgageContract } from '../../types';

function hdtc(p: Partial<MortgageContract> & Pick<MortgageContract, 'Id' | 'MortgageNumber'>): MortgageContract {
  return { CustomerId: 7, IsReleased: false, CollateralIds: [], CreditContractIds: [], ...p };
}

describe('validateMortgageContract', () => {
  const base = { ...emptyMortgageDraft(7), MortgageNumber: 'HĐTC-01/2026' };

  it('bản nháp hợp lệ không có lỗi', () => {
    expect(validateMortgageContract(base, [])).toEqual([]);
  });

  it('thiếu số HĐTC', () => {
    expect(validateMortgageContract({ ...base, MortgageNumber: '   ' }, [])).toContain('Số HĐTC là bắt buộc.');
  });

  it('trùng số trong cùng khách, không phân biệt hoa thường và khoảng trắng', () => {
    const errors = validateMortgageContract({ ...base, MortgageNumber: ' hđtc-01/2026 ' },
      [hdtc({ Id: 1, MortgageNumber: 'HĐTC-01/2026' })]);
    expect(errors.join()).toMatch(/đã có ở khách hàng này/);
  });

  it('trùng số với chính nó khi sửa thì không tính', () => {
    expect(validateMortgageContract({ ...base, Id: 1 }, [hdtc({ Id: 1, MortgageNumber: 'HĐTC-01/2026' })])).toEqual([]);
  });

  it('trùng số ở khách khác thì không tính', () => {
    expect(validateMortgageContract(base, [hdtc({ Id: 1, CustomerId: 8, MortgageNumber: 'HĐTC-01/2026' })])).toEqual([]);
  });

  it('giá trị tối đa âm', () => {
    expect(validateMortgageContract({ ...base, MaxSecuredAmount: -1 }, [])).toContain('Giá trị bảo đảm tối đa không được âm.');
  });

  it('giá trị tối đa bằng 0 là hợp lệ', () => {
    expect(validateMortgageContract({ ...base, MaxSecuredAmount: 0 }, [])).toEqual([]);
  });

  it('giải chấp mà thiếu ngày', () => {
    expect(validateMortgageContract({ ...base, IsReleased: true }, [])).toContain('Đã giải chấp thì phải có ngày giải chấp.');
  });

  it('ngày giải chấp trước ngày ký', () => {
    const d = { ...base, IsReleased: true, SignedDate: '2026-05-10', ReleasedDate: '2026-05-01' };
    expect(validateMortgageContract(d, [])).toContain('Ngày giải chấp không được trước ngày ký.');
  });
});

describe('filterMortgageContracts', () => {
  const list = [
    hdtc({ Id: 1, MortgageNumber: 'HĐTC-01', Pledgor: 'Trần Thị Phương' }),
    hdtc({ Id: 2, MortgageNumber: 'HĐTC-02', IsReleased: true, ReleasedDate: '2026-01-01' }),
  ];

  it('mặc định chỉ HĐTC đang hiệu lực', () => {
    expect(filterMortgageContracts(list, { status: 'active', query: '' }).map(m => m.Id)).toEqual([1]);
  });

  it('lọc đã giải chấp và tất cả', () => {
    expect(filterMortgageContracts(list, { status: 'released', query: '' }).map(m => m.Id)).toEqual([2]);
    expect(filterMortgageContracts(list, { status: 'all', query: '' })).toHaveLength(2);
  });

  it('tìm không dấu theo số và bên thế chấp', () => {
    expect(filterMortgageContracts(list, { status: 'all', query: 'phuong' }).map(m => m.Id)).toEqual([1]);
    expect(filterMortgageContracts(list, { status: 'all', query: 'hdtc-02' }).map(m => m.Id)).toEqual([2]);
  });
});

describe('nhãn và tra ngược', () => {
  const cols = [{ Id: 3, CustomerId: 7, AssetCode: 'TS-03' }, { Id: 4, CustomerId: 7, AssetType: 'BĐS - Loại 1' }] as Collateral[];
  const ccs = [{ Id: 9, CustomerId: 7, HdtdNumber: '2002/HDTD/9653222' }] as CreditContract[];

  it('dựng nhãn tài sản, bỏ id không còn tồn tại', () => {
    expect(collateralLabels([3, 4, 99], cols)).toEqual(['TS-03', 'BĐS - Loại 1']);
  });

  it('dựng nhãn HĐTD', () => {
    expect(creditContractLabels([9, 99], ccs)).toEqual(['2002/HDTD/9653222']);
  });

  it('tra HĐTC theo tài sản và theo HĐTD', () => {
    const list = [hdtc({ Id: 1, MortgageNumber: 'A', CollateralIds: [3], CreditContractIds: [9] }),
      hdtc({ Id: 2, MortgageNumber: 'B', CollateralIds: [4] })];
    expect(mortgagesOfCollateral(3, list).map(m => m.Id)).toEqual([1]);
    expect(mortgagesOfCreditContract(9, list).map(m => m.Id)).toEqual([1]);
    expect(mortgagesOfCreditContract(10, list)).toEqual([]);
  });
});

describe('linkDiff', () => {
  it('chỉ trả phần thêm và phần bỏ, không lặp', () => {
    expect(linkDiff([1, 2, 3], [2, 3, 4, 4])).toEqual({ add: [4], remove: [1] });
    expect(linkDiff([], [])).toEqual({ add: [], remove: [] });
  });
});

describe('paginate', () => {
  const list = Array.from({ length: 23 }, (_, i) => i + 1);

  it('cắt đúng trang', () => {
    expect(paginate(list, 3, 10)).toEqual({ rows: [21, 22, 23], page: 3, totalPages: 3 });
  });

  it('trang vượt quá thì kẹp về trang cuối, trang < 1 về trang 1', () => {
    expect(paginate(list, 9, 10).page).toBe(3);
    expect(paginate(list, 0, 10).page).toBe(1);
  });

  it('danh sách rỗng vẫn là 1 trang', () => {
    expect(paginate([], 4, 10)).toEqual({ rows: [], page: 1, totalPages: 1 });
  });
});

describe('mortgageLinkErrorMessage', () => {
  it('lỗi khoá ngoại tài sản đang thế chấp', () => {
    const e = { code: '23503', message: 'update or delete on table "Collaterals" violates foreign key constraint "fk_mortgage_link_collateral" on table "MortgageContractCollaterals"' };
    expect(mortgageLinkErrorMessage(e, 'collateral')).toMatch(/đang nằm trong hợp đồng thế chấp/);
  });

  it('lỗi khoá ngoại HĐTD đang được bảo đảm', () => {
    const e = { code: '23503', message: 'violates foreign key constraint "fk_mortgage_link_credit_contract"' };
    expect(mortgageLinkErrorMessage(e, 'credit_contract')).toMatch(/đang được bảo đảm bởi hợp đồng thế chấp/);
  });

  it('lỗi khoá ngoại khác (vd KUNN) thì trả null', () => {
    expect(mortgageLinkErrorMessage({ code: '23503', message: 'fk_loan_contracts_credit_contract' }, 'credit_contract')).toBeNull();
    expect(mortgageLinkErrorMessage(null, 'collateral')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/lib/__tests__/mortgageContract.test.ts`
Expected: FAIL, "Cannot find module '../mortgageContract'".

- [ ] **Step 3: Viết `src/lib/mortgageContract.ts`**

```ts
import type { Collateral, CreditContract, MortgageContract } from '../types';
import { normalizeVi } from './mdsdv';
import { toIsoDate } from './utils';

export type MortgageStatusFilter = 'active' | 'released' | 'all';

export type MortgageContractDraft = Omit<MortgageContract, 'Id' | 'CreatedAt'> & { Id?: number };

export function emptyMortgageDraft(customerId: number): MortgageContractDraft {
  return {
    CustomerId: customerId,
    MortgageNumber: '',
    SignedDate: null,
    Pledgor: null,
    MaxSecuredAmount: null,
    NotaryNumber: null,
    NotaryDate: null,
    NotaryOffice: null,
    RegistrationDate: null,
    RegistrationOffice: null,
    IsReleased: false,
    ReleasedDate: null,
    Note: null,
    CollateralIds: [],
    CreditContractIds: [],
  };
}

export function validateMortgageContract(draft: MortgageContractDraft, existing: MortgageContract[]): string[] {
  const errors: string[] = [];
  const number = draft.MortgageNumber.trim();

  if (!number) {
    errors.push('Số HĐTC là bắt buộc.');
  } else {
    const key = number.toLowerCase();
    const duplicate = existing.some(m =>
      m.CustomerId === draft.CustomerId && m.Id !== draft.Id && m.MortgageNumber.trim().toLowerCase() === key);
    if (duplicate) errors.push(`Số HĐTC "${number}" đã có ở khách hàng này.`);
  }

  if (draft.MaxSecuredAmount !== null && draft.MaxSecuredAmount !== undefined && draft.MaxSecuredAmount < 0) {
    errors.push('Giá trị bảo đảm tối đa không được âm.');
  }

  if (draft.IsReleased) {
    const released = toIsoDate(draft.ReleasedDate);
    const signed = toIsoDate(draft.SignedDate);
    if (!released) errors.push('Đã giải chấp thì phải có ngày giải chấp.');
    else if (signed && released < signed) errors.push('Ngày giải chấp không được trước ngày ký.');
  }

  return errors;
}

export function filterMortgageContracts(
  list: MortgageContract[],
  { status, query }: { status: MortgageStatusFilter; query: string }
): MortgageContract[] {
  const q = normalizeVi(query);
  return list.filter(m => {
    if (status === 'active' && m.IsReleased) return false;
    if (status === 'released' && !m.IsReleased) return false;
    if (!q) return true;
    return normalizeVi(m.MortgageNumber).includes(q) || normalizeVi(m.Pledgor).includes(q);
  });
}

export function collateralLabels(ids: number[], collaterals: Collateral[]): string[] {
  const byId = new Map(collaterals.map(c => [c.Id, c]));
  return ids.flatMap(id => {
    const c = byId.get(id);
    return c ? [c.AssetCode || c.AssetType || `TS #${c.Id}`] : [];
  });
}

export function creditContractLabels(ids: number[], creditContracts: CreditContract[]): string[] {
  const byId = new Map(creditContracts.map(c => [c.Id, c]));
  return ids.flatMap(id => {
    const c = byId.get(id);
    return c ? [c.HdtdNumber] : [];
  });
}

export function mortgagesOfCollateral(collateralId: number, list: MortgageContract[]): MortgageContract[] {
  return list.filter(m => m.CollateralIds.includes(collateralId));
}

export function mortgagesOfCreditContract(creditContractId: number, list: MortgageContract[]): MortgageContract[] {
  return list.filter(m => m.CreditContractIds.includes(creditContractId));
}

export function linkDiff(before: number[], after: number[]): { add: number[]; remove: number[] } {
  const was = new Set(before);
  const now = new Set(after);
  return {
    add: [...now].filter(id => !was.has(id)),
    remove: [...was].filter(id => !now.has(id)),
  };
}

export function paginate<T>(list: T[], page: number, pageSize: number): { rows: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return { rows: list.slice((current - 1) * pageSize, current * pageSize), page: current, totalPages };
}

const LINK_CONSTRAINT = {
  collateral: 'fk_mortgage_link_collateral',
  credit_contract: 'fk_mortgage_link_credit_contract',
} as const;

export function mortgageLinkErrorMessage(
  error: { code?: string; message?: string } | null | undefined,
  target: 'collateral' | 'credit_contract'
): string | null {
  if (!error || error.code !== '23503' || !error.message?.includes(LINK_CONSTRAINT[target])) return null;
  return target === 'collateral'
    ? 'Không thể xoá: tài sản đang nằm trong hợp đồng thế chấp. Gỡ tài sản khỏi HĐTC trước.'
    : 'Không xoá được HĐTD: hợp đồng đang được bảo đảm bởi hợp đồng thế chấp. Gỡ HĐTD khỏi HĐTC trước.';
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/__tests__/mortgageContract.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mortgageContract.ts src/lib/__tests__/mortgageContract.test.ts
git commit -m "feat(the-chap): ham thuan kiem tra, loc, nhan, phan trang HDTC

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: API HĐTC, thông báo khi xóa, chặn xóa khách còn HĐTC

**Files:**
- Create: `src/lib/api/mortgageContractApi.ts`
- Test: `src/lib/api/__tests__/mortgageContractApi.test.ts`
- Modify: `src/lib/api.ts` (thêm `export * from './api/mortgageContractApi';`)
- Modify: `src/lib/api/collateralApi.ts` (`deleteCollateralAPI`, dòng `if (error) throw error;`)
- Modify: `src/lib/api/creditContractApi.ts` (`deleteCreditContractAPI`, nhánh `error.code === '23503'`)
- Modify: `src/lib/customerStatus.ts` (`CustomerLinkCounts`, `BLOCKER_LABEL`)
- Modify: `src/lib/api/customerApi.ts` (`fetchCustomerLinkCountsAPI`)
- Test: `src/lib/__tests__/customerStatus.test.ts`

**Interfaces:**
- Consumes: `linkDiff`, `mortgageLinkErrorMessage`, `MortgageContractDraft` từ Task 2.
- Produces:
  - `fetchMortgageContractsAPI(customerId?: number): Promise<MortgageContract[]>`. Bỏ `customerId` thì đọc mọi HĐTC mà RLS cho phép.
  - `saveMortgageContractAPI(draft: MortgageContractDraft, before?: MortgageContract | null): Promise<number>`. Trả `Id` của HĐTC.
  - `deleteMortgageContractAPI(id: number): Promise<void>`
  - `class MortgageLinkSaveError extends Error { mortgageId: number }`
  - `CustomerLinkCounts.mortgages: number`

- [ ] **Step 1: Viết test đỏ cho API**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result = { data?: unknown; error?: { code?: string; message: string } | null };

function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order', 'insert', 'update', 'delete', 'single']) {
    b[m] = vi.fn(() => b);
  }
  b.then = (ok: (v: Result) => unknown, fail: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, ...result }).then(ok, fail);
  return b as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<Result>;
}

const queue: Record<string, ReturnType<typeof builder>[]> = {};
const fromMock = vi.fn((table: string) => {
  const next = queue[table]?.shift();
  if (!next) throw new Error(`Không có builder giả cho bảng ${table}`);
  return next;
});

vi.mock('../../supabase', () => ({ supabase: { from: (t: string) => fromMock(t) } }));

import {
  fetchMortgageContractsAPI, saveMortgageContractAPI, deleteMortgageContractAPI, MortgageLinkSaveError,
} from '../mortgageContractApi';
import { emptyMortgageDraft } from '../../mortgageContract';
import type { MortgageContract } from '../../../types';

function enqueue(table: string, ...results: Result[]) {
  const made = results.map(builder);
  queue[table] = [...(queue[table] ?? []), ...made];
  return made;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(queue)) delete queue[k];
});

describe('fetchMortgageContractsAPI', () => {
  it('đọc kèm hai bảng nối và dựng mảng id', async () => {
    const [b] = enqueue('MortgageContracts', { data: [{
      Id: 1, CustomerId: 7, MortgageNumber: 'HĐTC-01', IsReleased: false, MaxSecuredAmount: '2500000000',
      MortgageContractCollaterals: [{ CollateralId: 3 }, { CollateralId: 4 }],
      MortgageContractCreditContracts: [{ CreditContractId: 9 }],
    }] });

    const list = await fetchMortgageContractsAPI(7);

    expect(b.select).toHaveBeenCalledWith(expect.stringContaining('MortgageContractCollaterals(CollateralId)'));
    expect(b.eq).toHaveBeenCalledWith('CustomerId', 7);
    expect(list[0]).toMatchObject({ Id: 1, CollateralIds: [3, 4], CreditContractIds: [9], MaxSecuredAmount: 2500000000 });
    expect(list[0]).not.toHaveProperty('MortgageContractCollaterals');
  });

  it('không truyền khách thì không lọc theo khách', async () => {
    const [b] = enqueue('MortgageContracts', { data: [] });
    await fetchMortgageContractsAPI();
    expect(b.eq).not.toHaveBeenCalled();
  });

  it('lỗi thì ném ra, không nuốt', async () => {
    enqueue('MortgageContracts', { error: { message: 'mất mạng' } });
    await expect(fetchMortgageContractsAPI(7)).rejects.toThrow(/Không nạp được danh sách HĐTC: mất mạng/);
  });
});

describe('saveMortgageContractAPI', () => {
  const before: MortgageContract = {
    Id: 5, CustomerId: 7, MortgageNumber: 'HĐTC-01', IsReleased: false, CollateralIds: [3, 4], CreditContractIds: [9],
  };

  it('tạo mới: chèn HĐTC rồi chèn liên kết', async () => {
    const [head] = enqueue('MortgageContracts', { data: { Id: 11 } });
    const [cols] = enqueue('MortgageContractCollaterals', {});
    const [ccs] = enqueue('MortgageContractCreditContracts', {});

    const draft = { ...emptyMortgageDraft(7), MortgageNumber: ' HĐTC-02 ', CollateralIds: [3], CreditContractIds: [9] };
    const id = await saveMortgageContractAPI(draft);

    expect(id).toBe(11);
    expect(head.insert).toHaveBeenCalledWith([expect.objectContaining({ MortgageNumber: 'HĐTC-02', CustomerId: 7 })]);
    expect(head.insert.mock.calls[0][0][0]).not.toHaveProperty('CollateralIds');
    expect(cols.insert).toHaveBeenCalledWith([{ MortgageContractId: 11, CollateralId: 3 }]);
    expect(ccs.insert).toHaveBeenCalledWith([{ MortgageContractId: 11, CreditContractId: 9 }]);
  });

  it('sửa: chỉ ghi phần liên kết thay đổi', async () => {
    const [head] = enqueue('MortgageContracts', { data: { Id: 5 } });
    const [colRemove, colAdd] = enqueue('MortgageContractCollaterals', {}, {});

    await saveMortgageContractAPI({ ...before, CollateralIds: [4, 6] }, before);

    expect(head.update).toHaveBeenCalled();
    expect(head.eq).toHaveBeenCalledWith('Id', 5);
    expect(colRemove.delete).toHaveBeenCalled();
    expect(colRemove.eq).toHaveBeenCalledWith('MortgageContractId', 5);
    expect(colRemove.in).toHaveBeenCalledWith('CollateralId', [3]);
    expect(colAdd.insert).toHaveBeenCalledWith([{ MortgageContractId: 5, CollateralId: 6 }]);
    expect(fromMock).not.toHaveBeenCalledWith('MortgageContractCreditContracts');
  });

  it('chưa giải chấp thì ngày giải chấp bị xoá trắng khi lưu', async () => {
    const [head] = enqueue('MortgageContracts', { data: { Id: 5 } });
    await saveMortgageContractAPI({ ...before, IsReleased: false, ReleasedDate: '2026-01-01' }, before);
    expect(head.update).toHaveBeenCalledWith(expect.objectContaining({ ReleasedDate: null }));
  });

  it('trùng số: thông báo tiếng Việt', async () => {
    enqueue('MortgageContracts', { error: { code: '23505', message: 'duplicate key value violates unique constraint "uq_mortgage_number"' } });
    await expect(saveMortgageContractAPI({ ...emptyMortgageDraft(7), MortgageNumber: 'HĐTC-01' }))
      .rejects.toThrow('Số HĐTC "HĐTC-01" đã có ở khách hàng này!');
  });

  it('HĐTC đã lưu nhưng liên kết lỗi: ném MortgageLinkSaveError mang id', async () => {
    enqueue('MortgageContracts', { data: { Id: 11 } });
    enqueue('MortgageContractCollaterals', { error: { message: 'Không gắn được: tài sản / HĐTD không thuộc khách hàng' } });

    const err = await saveMortgageContractAPI({ ...emptyMortgageDraft(7), MortgageNumber: 'HĐTC-02', CollateralIds: [3] })
      .catch(e => e);

    expect(err).toBeInstanceOf(MortgageLinkSaveError);
    expect(err.mortgageId).toBe(11);
    expect(err.message).toMatch(/Đã lưu HĐTC "HĐTC-02" nhưng chưa lưu được danh sách tài sản\/HĐTD/);
  });
});

describe('deleteMortgageContractAPI', () => {
  it('lỗi trigger chưa giải chấp: giữ nguyên thông báo tiếng Việt', async () => {
    enqueue('MortgageContracts', { error: { code: 'P0001', message: 'Không xoá được HĐTC "HĐTC-01": hợp đồng chưa giải chấp. Ghi nhận giải chấp trước.' } });
    await expect(deleteMortgageContractAPI(5)).rejects.toThrow(/chưa giải chấp/);
  });

  it('không xoá được dòng nào: báo không có quyền', async () => {
    enqueue('MortgageContracts', { data: [] });
    await expect(deleteMortgageContractAPI(5)).rejects.toThrow(/không có quyền hoặc hợp đồng đã bị xoá/);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/lib/api/__tests__/mortgageContractApi.test.ts`
Expected: FAIL, "Cannot find module '../mortgageContractApi'".

- [ ] **Step 3: Viết `src/lib/api/mortgageContractApi.ts`**

```ts
import { supabase } from '../supabase';
import type { MortgageContract } from '../../types';
import { linkDiff, type MortgageContractDraft } from '../mortgageContract';

const SELECT = '*, MortgageContractCollaterals(CollateralId), MortgageContractCreditContracts(CreditContractId)';

type MortgageRow = Omit<MortgageContract, 'CollateralIds' | 'CreditContractIds' | 'MaxSecuredAmount'> & {
  MaxSecuredAmount?: number | string | null;
  MortgageContractCollaterals?: { CollateralId: number | string }[] | null;
  MortgageContractCreditContracts?: { CreditContractId: number | string }[] | null;
};

export class MortgageLinkSaveError extends Error {
  mortgageId: number;
  constructor(message: string, mortgageId: number) {
    super(message);
    this.name = 'MortgageLinkSaveError';
    this.mortgageId = mortgageId;
  }
}

function fromRow(row: MortgageRow): MortgageContract {
  const { MortgageContractCollaterals, MortgageContractCreditContracts, MaxSecuredAmount, ...rest } = row;
  return {
    ...rest,
    MaxSecuredAmount: MaxSecuredAmount === null || MaxSecuredAmount === undefined ? null : Number(MaxSecuredAmount),
    CollateralIds: (MortgageContractCollaterals ?? []).map(l => Number(l.CollateralId)),
    CreditContractIds: (MortgageContractCreditContracts ?? []).map(l => Number(l.CreditContractId)),
  };
}

export async function fetchMortgageContractsAPI(customerId?: number): Promise<MortgageContract[]> {
  let query = supabase.from('MortgageContracts').select(SELECT).order('Id', { ascending: false });
  if (customerId !== undefined) query = query.eq('CustomerId', customerId);
  const { data, error } = await query;
  if (error) throw new Error(`Không nạp được danh sách HĐTC: ${error.message}`);
  return ((data ?? []) as MortgageRow[]).map(fromRow);
}

async function syncLinks(
  table: 'MortgageContractCollaterals' | 'MortgageContractCreditContracts',
  column: 'CollateralId' | 'CreditContractId',
  mortgageId: number,
  before: number[],
  after: number[]
): Promise<void> {
  const { add, remove } = linkDiff(before, after);
  if (remove.length > 0) {
    const { error } = await supabase.from(table).delete().eq('MortgageContractId', mortgageId).in(column, remove);
    if (error) throw new Error(error.message);
  }
  if (add.length > 0) {
    const { error } = await supabase.from(table).insert(add.map(id => ({ MortgageContractId: mortgageId, [column]: id })));
    if (error) throw new Error(error.message);
  }
}

export async function saveMortgageContractAPI(
  draft: MortgageContractDraft,
  before?: MortgageContract | null
): Promise<number> {
  const number = draft.MortgageNumber.trim();
  if (!draft.CustomerId) throw new Error('Khách hàng là bắt buộc!');
  if (!number) throw new Error('Số HĐTC là bắt buộc!');

  const { CollateralIds, CreditContractIds, Id, ...fields } = draft;
  const clean = {
    ...fields,
    MortgageNumber: number,
    ReleasedDate: fields.IsReleased ? fields.ReleasedDate ?? null : null,
  };

  const { data, error } = Id
    ? await supabase.from('MortgageContracts').update(clean).eq('Id', Id).select('Id').single()
    : await supabase.from('MortgageContracts').insert([clean]).select('Id').single();

  if (error) {
    if (error.code === '23505') throw new Error(`Số HĐTC "${number}" đã có ở khách hàng này!`);
    throw new Error(error.message);
  }

  const mortgageId = Number((data as { Id: number }).Id);
  try {
    await syncLinks('MortgageContractCollaterals', 'CollateralId', mortgageId, before?.CollateralIds ?? [], CollateralIds);
    await syncLinks('MortgageContractCreditContracts', 'CreditContractId', mortgageId, before?.CreditContractIds ?? [], CreditContractIds);
  } catch (err) {
    throw new MortgageLinkSaveError(
      `Đã lưu HĐTC "${number}" nhưng chưa lưu được danh sách tài sản/HĐTD: ${(err as Error).message}`,
      mortgageId
    );
  }
  return mortgageId;
}

export async function deleteMortgageContractAPI(id: number): Promise<void> {
  const { data, error } = await supabase.from('MortgageContracts').delete().eq('Id', id).select('Id');
  if (error) throw new Error(error.message);
  if (!data || (data as unknown[]).length === 0) {
    throw new Error('Không xoá được HĐTC: không có quyền hoặc hợp đồng đã bị xoá.');
  }
}
```

Thêm vào `src/lib/api.ts`, sau dòng `export * from './api/creditContractApi';`:

```ts
export * from './api/mortgageContractApi';
```

- [ ] **Step 4: Chạy test API, xác nhận xanh**

Run: `npx vitest run src/lib/api/__tests__/mortgageContractApi.test.ts`
Expected: PASS.

- [ ] **Step 5: Test đỏ cho chặn xóa khách còn HĐTC**, thêm vào `describe('customerDeleteBlockers', …)` trong `src/lib/__tests__/customerStatus.test.ts`:

```ts
  it('khách còn hợp đồng thế chấp cũng bị chặn xoá', () => {
    expect(customerDeleteBlockers({ mortgages: 2 })).toEqual(['2 hợp đồng thế chấp']);
  });
```

Run: `npx vitest run src/lib/__tests__/customerStatus.test.ts`
Expected: FAIL (lỗi kiểu hoặc trả `[]`).

- [ ] **Step 6: Sửa `src/lib/customerStatus.ts` và `src/lib/api/customerApi.ts`**

Trong `CustomerLinkCounts`, thêm dòng `mortgages: number;` sau `cards: number;`. Trong `BLOCKER_LABEL`, thêm sau dòng `cards`:

```ts
  { key: 'mortgages', noun: 'hợp đồng thế chấp' },
```

Trong `fetchCustomerLinkCountsAPI`:

```ts
export async function fetchCustomerLinkCountsAPI(customerId: number): Promise<CustomerLinkCounts> {
  const [kunn, hdtd, collaterals, cards, mortgages] = await Promise.all([
    countRowsFor('LoanContracts', customerId),
    countRowsFor('CreditContracts', customerId),
    countRowsFor('Collaterals', customerId),
    countRowsFor('CardContracts', customerId),
    countRowsFor('MortgageContracts', customerId),
  ]);
  return { kunn, hdtd, collaterals, cards, mortgages };
}
```

- [ ] **Step 7: Thông báo tiếng Việt khi xóa tài sản / HĐTD đang nằm trong HĐTC**

Trong `deleteCollateralAPI` (`src/lib/api/collateralApi.ts`), thay dòng `if (error) throw error;` sau lệnh xóa bằng:

```ts
  if (error) throw new Error(mortgageLinkErrorMessage(error, 'collateral') ?? error.message);
```

Trong `deleteCreditContractAPI` (`src/lib/api/creditContractApi.ts`), đặt kiểm HĐTC **trước** nhánh đếm KUNN:

```ts
  if (error) {
    const mortgageMessage = mortgageLinkErrorMessage(error, 'credit_contract');
    if (mortgageMessage) throw new Error(mortgageMessage);
    if (error.code === '23503') {
      const n = await countKunnOfCreditContractAPI(id);
      throw new Error(`Không xoá được HĐTD: còn ${n} KUNN đang gắn với hợp đồng này. Xoá KUNN trước.`);
    }
    throw error;
  }
```

Thêm vào đầu mỗi tệp: `import { mortgageLinkErrorMessage } from '../mortgageContract';`.

- [ ] **Step 8: Chạy các test liên quan + kiểm kiểu**

Run: `npx vitest run src/lib/__tests__/customerStatus.test.ts src/lib/api src/lib/__tests__/mortgageContract.test.ts && npx tsc -b`
Expected: PASS, không lỗi kiểu. Nếu `tsc` báo chỗ khác dựng `CustomerLinkCounts` thiếu `mortgages`, thêm `mortgages: 0` vào chỗ đó.

- [ ] **Step 9: Commit**

```bash
git add src/lib/api/mortgageContractApi.ts src/lib/api/__tests__/mortgageContractApi.test.ts src/lib/api.ts \
  src/lib/api/collateralApi.ts src/lib/api/creditContractApi.ts src/lib/customerStatus.ts \
  src/lib/api/customerApi.ts src/lib/__tests__/customerStatus.test.ts
git commit -m "feat(the-chap): API doc/ghi/xoa HDTC, chan xoa khach va thong bao khi xoa TS/HDTD dang the chap

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Màn danh sách HĐTC (route, thanh bên, controller, bảng)

**Files:**
- Modify: `src/lib/navigation.ts` (`ScreenId`, import icon, mục mới sau `collaterals`)
- Modify: `src/lib/routes.ts` (`ROUTE_OF`)
- Modify: `src/lib/customerRoutes.ts` (`CUSTOMER_SCOPED_SCREENS`)
- Modify: `src/lib/i18n.ts` (`nav.mortgageContracts` ở cả vi và en)
- Modify: `src/App.tsx` (lazy import + 2 route)
- Create: `src/hooks/useMortgageContractController.ts`
- Create: `src/components/mortgage/MortgageContractToolbar.tsx`
- Create: `src/components/mortgage/MortgageContractTable.tsx`
- Create: `src/components/views/MortgageContractView.tsx`
- Test: `src/components/__tests__/MortgageContractView.test.tsx`
- Modify tests: `src/lib/__tests__/customerRoutes.test.ts`, `src/lib/__tests__/navigation.test.ts`, `src/components/__tests__/routing.test.tsx`

**Interfaces:**
- Consumes: Task 2 (`filterMortgageContracts`, `paginate`, `collateralLabels`, `creditContractLabels`, `emptyMortgageDraft`, `validateMortgageContract`, `MortgageStatusFilter`, `MortgageContractDraft`); Task 3 (`fetchMortgageContractsAPI`, `saveMortgageContractAPI`, `deleteMortgageContractAPI`, `MortgageLinkSaveError`); `fetchCollateralsByCustomerAPI`, `fetchCreditContractsByCustomerAPI`, `useSelectedCustomerId`, `useConfirm`.
- Produces: `useMortgageContractController()` trả:
  ```ts
  {
    customerId: number | null;
    loading: boolean;
    mortgages: MortgageContract[];
    collaterals: Collateral[];
    creditContracts: CreditContract[];
    status: MortgageStatusFilter; setStatus(s: MortgageStatusFilter): void;
    query: string; setQuery(q: string): void;
    filtered: MortgageContract[];
    paged: { rows: MortgageContract[]; page: number; totalPages: number };
    setPage(p: number): void;
    draft: MortgageContractDraft | null; setDraft(d: MortgageContractDraft): void;
    formErrors: string[];
    saving: boolean;
    openNew(): void; openEdit(m: MortgageContract): void; closeForm(): void;
    save(): Promise<void>;
    remove(m: MortgageContract): Promise<void>;
    notification: { type: 'success' | 'error'; message: string } | null;
    setNotification(t: { type: 'success' | 'error'; message: string } | null): void;
  }
  ```
  Và `MORTGAGE_PAGE_SIZE = 10`. Controller không import gì từ `src/components/` (kể cả kiểu), để tầng hook không phụ thuộc ngược lên tầng hiển thị.

- [ ] **Step 1: Sửa các test định tuyến trước (đỏ)**

`src/lib/__tests__/customerRoutes.test.ts`: đổi tên hai test "năm màn" thành "sáu màn", và danh sách mong đợi thành:

```ts
      ['collaterals', 'credit-cards', 'credit-contracts', 'loans', 'mortgage-contracts', 'post-loan']
```

`src/lib/__tests__/navigation.test.ts`: trong `giữ đúng bộ id mà App.tsx đang xử lý`, danh sách mong đợi thành:

```ts
    expect(NAV_ITEMS.map(i => i.id).sort()).toEqual([
      'business-plan', 'calculators', 'collaterals',
      'credit-cards', 'credit-contracts', 'customers', 'dashboard', 'hub', 'inventory',
      'loans', 'mortgage-contracts', 'post-loan',
      'rate-quote', 'settings',
    ]);
```

`src/components/__tests__/routing.test.tsx`: thêm mock cạnh mock `CollateralView`:

```tsx
vi.mock('../views/MortgageContractView', () => ({ MortgageContractView: () => <div>MAN:mortgage-contracts</div> }));
```

Thêm vào mảng `CAP`:

```ts
    ['/customers/55/mortgage-contracts', 'mortgage-contracts'],
```

Run: `npx vitest run src/lib/__tests__/customerRoutes.test.ts src/lib/__tests__/navigation.test.ts src/components/__tests__/routing.test.tsx`
Expected: FAIL ở các test vừa sửa.

- [ ] **Step 2: Đăng ký màn**

`src/lib/navigation.ts`:
- Thêm `FileSignature` vào dòng import `lucide-react`.
- Trong `ScreenId`, thêm `| 'mortgage-contracts'` ngay sau `'collaterals'`.
- Thêm mục ngay sau mục `collaterals`:

```ts
      { id: 'mortgage-contracts', labelKey: 'nav.mortgageContracts', groupKey: 'nav.groupRecords', icon: FileSignature, path: ROUTE_OF['mortgage-contracts'], keywords: ['hop dong the chap', 'hdtc', 'the chap', 'mortgage'] },
```

`src/lib/routes.ts`, sau `collaterals: '/collaterals',`:

```ts
  'mortgage-contracts': '/mortgage-contracts',
```

`src/lib/customerRoutes.ts`:

```ts
export const CUSTOMER_SCOPED_SCREENS = [
  'credit-contracts', 'loans', 'collaterals', 'mortgage-contracts', 'credit-cards', 'post-loan',
] as const;
```

`src/lib/i18n.ts`: sau `'nav.collaterals': 'Định giá TSĐB',` thêm `'nav.mortgageContracts': 'Hợp đồng thế chấp',`. Sau `'nav.collaterals': 'Collateral valuation',` thêm `'nav.mortgageContracts': 'Mortgage contracts',`.

`src/App.tsx`:
- Thêm dòng lazy sau dòng `CollateralView`:

```tsx
const MortgageContractView = lazy(() => import('./components/views/MortgageContractView').then(m => ({ default: m.MortgageContractView })));
```

- Thêm route phẳng sau route phẳng `ROUTE_OF.collaterals`:

```tsx
        <Route path={ROUTE_OF['mortgage-contracts']} element={<Suspense fallback={<ViewSkeleton />}><MortgageContractView /></Suspense>} />
```

- Thêm route lồng sau route lồng `collaterals`:

```tsx
        <Route path={`/customers/:customerId${ROUTE_OF['mortgage-contracts']}`} element={<Suspense fallback={<ViewSkeleton />}><MortgageContractView /></Suspense>} />
```

- [ ] **Step 3: Viết test màn (đỏ)** `src/components/__tests__/MortgageContractView.test.tsx`

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import type { MortgageContract } from '../../types';

const api = vi.hoisted(() => ({
  fetchMortgageContractsAPI: vi.fn(),
  fetchCollateralsByCustomerAPI: vi.fn(),
  fetchCreditContractsByCustomerAPI: vi.fn(),
  saveMortgageContractAPI: vi.fn(),
  deleteMortgageContractAPI: vi.fn(),
  MortgageLinkSaveError: class MortgageLinkSaveError extends Error {
    mortgageId: number;
    constructor(message: string, mortgageId: number) { super(message); this.mortgageId = mortgageId; }
  },
}));
vi.mock('../../lib/api', () => api);
const confirmMock = vi.hoisted(() => vi.fn());
vi.mock('../../context/ConfirmContext', () => ({ useConfirm: () => confirmMock }));

import { MortgageContractView } from '../views/MortgageContractView';

const hdtc = (p: Partial<MortgageContract> & Pick<MortgageContract, 'Id' | 'MortgageNumber'>): MortgageContract =>
  ({ CustomerId: 7, IsReleased: false, CollateralIds: [], CreditContractIds: [], ...p });

const DoiKhach = () => {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate('/customers/8/mortgage-contracts')}>đổi khách</button>;
};

function dung(path = '/customers/7/mortgage-contracts') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/customers/:customerId/mortgage-contracts" element={<><DoiKhach /><MortgageContractView /></>} />
        <Route path="/mortgage-contracts" element={<MortgageContractView />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  api.fetchCollateralsByCustomerAPI.mockResolvedValue([{ Id: 3, CustomerId: 7, AssetCode: 'TS-03' }]);
  api.fetchCreditContractsByCustomerAPI.mockResolvedValue([{ Id: 9, CustomerId: 7, HdtdNumber: '2002/HDTD/9653222' }]);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('MortgageContractView — danh sách', () => {
  it('chưa chọn khách thì nhắc chọn khách, không gọi API', () => {
    dung('/mortgage-contracts');
    expect(screen.getByText(/Chọn khách hàng/)).toBeTruthy();
    expect(api.fetchMortgageContractsAPI).not.toHaveBeenCalled();
  });

  it('hiện HĐTC đang hiệu lực kèm nhãn tài sản và HĐTD; ẩn HĐTC đã giải chấp', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([
      hdtc({ Id: 1, MortgageNumber: 'HĐTC-01', CollateralIds: [3], CreditContractIds: [9] }),
      hdtc({ Id: 2, MortgageNumber: 'HĐTC-02', IsReleased: true, ReleasedDate: '2026-01-01' }),
    ]);
    dung();
    expect(await screen.findByText('HĐTC-01')).toBeTruthy();
    expect(screen.getByText('TS-03')).toBeTruthy();
    expect(screen.getByText('2002/HDTD/9653222')).toBeTruthy();
    expect(screen.queryByText('HĐTC-02')).toBeNull();
    expect(api.fetchMortgageContractsAPI).toHaveBeenCalledWith(7);
  });

  it('phân trang 10 dòng; đổi lọc thì về trang 1', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => hdtc({ Id: i + 1, MortgageNumber: `HĐTC-${String(i + 1).padStart(2, '0')}` })));
    dung();
    expect(await screen.findByText(/Trang 1 \/ 2/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getByText(/Trang 2 \/ 2/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Lọc trạng thái'), { target: { value: 'all' } });
    expect(screen.getByText(/Trang 1 \/ 2/)).toBeTruthy();
  });

  it('lỗi nạp danh sách thì hiện thông báo, không trắng màn', async () => {
    api.fetchMortgageContractsAPI.mockRejectedValue(new Error('Không nạp được danh sách HĐTC: mất mạng'));
    dung();
    expect(await screen.findByText(/mất mạng/)).toBeTruthy();
  });

  it('dữ liệu khách cũ về muộn không đè dữ liệu khách mới', async () => {
    let traKhachCu: (v: MortgageContract[]) => void = () => {};
    api.fetchMortgageContractsAPI
      .mockImplementationOnce(() => new Promise(r => { traKhachCu = r; }))
      .mockResolvedValueOnce([hdtc({ Id: 9, CustomerId: 8, MortgageNumber: 'HĐTC-KHACH-MOI' })]);
    dung('/customers/7/mortgage-contracts');
    fireEvent.click(screen.getByRole('button', { name: 'đổi khách' }));
    expect(await screen.findByText('HĐTC-KHACH-MOI')).toBeTruthy();
    traKhachCu([hdtc({ Id: 1, MortgageNumber: 'HĐTC-KHACH-CU' })]);
    await waitFor(() => expect(screen.queryByText('HĐTC-KHACH-CU')).toBeNull());
    expect(api.fetchMortgageContractsAPI).toHaveBeenNthCalledWith(2, 8);
  });
});
```

Run: `npx vitest run src/components/__tests__/MortgageContractView.test.tsx`
Expected: FAIL, "Cannot find module '../views/MortgageContractView'".

- [ ] **Step 4: Viết controller** `src/hooks/useMortgageContractController.ts`

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchMortgageContractsAPI, fetchCollateralsByCustomerAPI, fetchCreditContractsByCustomerAPI,
  saveMortgageContractAPI, deleteMortgageContractAPI, MortgageLinkSaveError,
} from '../lib/api';
import {
  emptyMortgageDraft, filterMortgageContracts, paginate, validateMortgageContract,
  type MortgageContractDraft, type MortgageStatusFilter,
} from '../lib/mortgageContract';
import { useSelectedCustomerId } from './useSelectedCustomerId';
import { useConfirm } from '../context/ConfirmContext';
import type { Collateral, CreditContract, MortgageContract } from '../types';

export const MORTGAGE_PAGE_SIZE = 10;

type Notice = { type: 'success' | 'error'; message: string };

export function useMortgageContractController() {
  const customerId = useSelectedCustomerId();
  const confirm = useConfirm();

  const [mortgages, setMortgages] = useState<MortgageContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [creditContracts, setCreditContracts] = useState<CreditContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatusState] = useState<MortgageStatusFilter>('active');
  const [query, setQueryState] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MortgageContract | null>(null);
  const [draft, setDraft] = useState<MortgageContractDraft | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<Notice | null>(null);
  const tokenRef = useRef(0);

  const load = useCallback(async (id: number | null): Promise<MortgageContract[]> => {
    const token = ++tokenRef.current;
    if (id === null) {
      setMortgages([]); setCollaterals([]); setCreditContracts([]);
      return [];
    }
    setLoading(true);
    try {
      const [list, cols, ccs] = await Promise.all([
        fetchMortgageContractsAPI(id),
        fetchCollateralsByCustomerAPI(id),
        fetchCreditContractsByCustomerAPI(id),
      ]);
      if (tokenRef.current !== token) return [];
      setMortgages(list); setCollaterals(cols); setCreditContracts(ccs);
      return list;
    } catch (err) {
      if (tokenRef.current === token) setNotification({ type: 'error', message: (err as Error).message });
      return [];
    } finally {
      if (tokenRef.current === token) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDraft(null); setEditing(null); setFormErrors([]); setPage(1);
    load(customerId);
  }, [customerId, load]);

  const setStatus = useCallback((s: MortgageStatusFilter) => { setStatusState(s); setPage(1); }, []);
  const setQuery = useCallback((q: string) => { setQueryState(q); setPage(1); }, []);

  const filtered = useMemo(() => filterMortgageContracts(mortgages, { status, query }), [mortgages, status, query]);
  const paged = useMemo(() => paginate(filtered, page, MORTGAGE_PAGE_SIZE), [filtered, page]);

  const openNew = useCallback(() => {
    if (customerId === null) return;
    setEditing(null); setDraft(emptyMortgageDraft(customerId)); setFormErrors([]);
  }, [customerId]);

  const openEdit = useCallback((m: MortgageContract) => {
    setEditing(m);
    setDraft({ ...m, CollateralIds: [...m.CollateralIds], CreditContractIds: [...m.CreditContractIds] });
    setFormErrors([]);
  }, []);

  const closeForm = useCallback(() => { setDraft(null); setEditing(null); setFormErrors([]); }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    const errors = validateMortgageContract(draft, mortgages);
    setFormErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      await saveMortgageContractAPI(draft, editing);
      setNotification({ type: 'success', message: `Đã lưu HĐTC "${draft.MortgageNumber.trim()}".` });
      closeForm();
      await load(customerId);
    } catch (err) {
      setNotification({ type: 'error', message: (err as Error).message });
      if (err instanceof MortgageLinkSaveError) {
        const list = await load(customerId);
        const saved = list.find(m => m.Id === err.mortgageId) ?? null;
        setEditing(saved);
        setDraft(d => (d ? { ...d, Id: err.mortgageId } : d));
      }
    } finally {
      setSaving(false);
    }
  }, [draft, editing, mortgages, closeForm, load, customerId]);

  const remove = useCallback(async (m: MortgageContract) => {
    if (!m.IsReleased) {
      setNotification({ type: 'error', message: 'HĐTC chưa giải chấp nên chưa xoá được. Ghi nhận giải chấp trước.' });
      return;
    }
    const ok = await confirm({
      title: 'Xoá hợp đồng thế chấp',
      message: `XOÁ VĨNH VIỄN HĐTC "${m.MortgageNumber}"?\n\nHành động này KHÔNG THỂ hoàn tác.`,
      confirmText: 'Xoá HĐTC',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMortgageContractAPI(m.Id);
      setNotification({ type: 'success', message: `Đã xoá HĐTC "${m.MortgageNumber}".` });
      if (draft?.Id === m.Id) closeForm();
      await load(customerId);
    } catch (err) {
      setNotification({ type: 'error', message: (err as Error).message });
    }
  }, [confirm, draft, closeForm, load, customerId]);

  return {
    customerId, loading, mortgages, collaterals, creditContracts,
    status, setStatus, query, setQuery, filtered, paged, setPage,
    draft, setDraft, formErrors, saving,
    openNew, openEdit, closeForm, save, remove,
    notification, setNotification,
  };
}
```

- [ ] **Step 5: Viết thanh công cụ** `src/components/mortgage/MortgageContractToolbar.tsx`

```tsx
import React from 'react';
import { Plus, Search } from 'lucide-react';
import type { MortgageStatusFilter } from '../../lib/mortgageContract';

const INPUT = 'rounded-xl px-3 py-2 text-xs border border-line/70 bg-surface/80 focus:border-accent';

export const MortgageContractToolbar: React.FC<{
  status: MortgageStatusFilter;
  onStatus: (s: MortgageStatusFilter) => void;
  query: string;
  onQuery: (q: string) => void;
  onNew: () => void;
}> = ({ status, onStatus, query, onQuery, onNew }) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={onNew}
      className="flex items-center gap-1.5 bg-accent hover:opacity-90 text-accent-ink px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
    >
      <Plus className="w-3.5 h-3.5" /><span>Thêm HĐTC</span>
    </button>
    <div className="relative flex-1 min-w-[200px]">
      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        aria-label="Tìm HĐTC"
        placeholder="Tìm theo số HĐTC hoặc bên thế chấp"
        value={query}
        onChange={e => onQuery(e.target.value)}
        className={`${INPUT} w-full pl-8`}
      />
    </div>
    <select
      aria-label="Lọc trạng thái"
      value={status}
      onChange={e => onStatus(e.target.value as MortgageStatusFilter)}
      className={INPUT}
    >
      <option value="active">Đang hiệu lực</option>
      <option value="released">Đã giải chấp</option>
      <option value="all">Tất cả</option>
    </select>
  </div>
);
```

- [ ] **Step 6: Viết bảng** `src/components/mortgage/MortgageContractTable.tsx`

```tsx
import React from 'react';
import type { Collateral, CreditContract, MortgageContract } from '../../types';
import { collateralLabels, creditContractLabels } from '../../lib/mortgageContract';
import { fmtDate, fmtMoney } from '../../lib/utils';

const HEAD = 'px-4 py-3 whitespace-nowrap';
const CELL = 'px-4 py-3';

export const MortgageContractTable: React.FC<{
  rows: MortgageContract[];
  page: number;
  totalPages: number;
  total: number;
  collaterals: Collateral[];
  creditContracts: CreditContract[];
  onOpen: (m: MortgageContract) => void;
  onPage: (p: number) => void;
}> = ({ rows, page, totalPages, total, collaterals, creditContracts, onOpen, onPage }) => (
  <div className="rounded-2xl border border-line/70 bg-panel overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-surface border-b border-line/80 text-[10px] uppercase font-bold tracking-[0.11em] text-ink-faint">
          <tr>
            <th className={HEAD}>Số HĐTC</th>
            <th className={HEAD}>Ngày ký</th>
            <th className={HEAD}>Bên thế chấp</th>
            <th className={`${HEAD} text-right`}>Giá trị bảo đảm tối đa</th>
            <th className={HEAD}>Tài sản</th>
            <th className={HEAD}>HĐTD được bảo đảm</th>
            <th className={HEAD}>Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {rows.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-10 text-ink-faint">Chưa có hợp đồng thế chấp.</td></tr>
          ) : rows.map(m => (
            <tr key={m.Id} onClick={() => onOpen(m)} className="cursor-pointer hover:bg-panel-muted/40">
              <td className={`${CELL} font-mono font-bold text-ink`}>{m.MortgageNumber}</td>
              <td className={`${CELL} font-mono`}>{m.SignedDate ? fmtDate(m.SignedDate) : '—'}</td>
              <td className={CELL}>{m.Pledgor || 'Chính khách hàng'}</td>
              <td className={`${CELL} text-right font-mono`}>
                {m.MaxSecuredAmount === null || m.MaxSecuredAmount === undefined ? '—' : fmtMoney(m.MaxSecuredAmount)}
              </td>
              <td className={CELL}>
                <div className="flex flex-wrap gap-1">
                  {collateralLabels(m.CollateralIds, collaterals).map(l => <span key={l} className="font-mono">{l}</span>)}
                </div>
              </td>
              <td className={CELL}>
                <div className="flex flex-wrap gap-1">
                  {creditContractLabels(m.CreditContractIds, creditContracts).map(l => <span key={l} className="font-mono">{l}</span>)}
                </div>
              </td>
              <td className={CELL}>
                {m.IsReleased
                  ? <span className="text-ink-muted">Đã giải chấp{m.ReleasedDate ? ` · ${fmtDate(m.ReleasedDate)}` : ''}</span>
                  : <span className="font-semibold text-ink">Đang hiệu lực</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {totalPages > 1 && (
      <div className="p-3 border-t border-line/60 flex items-center justify-between text-xs">
        <span className="text-ink-faint text-[11px]">
          Trang <strong className="text-ink">{page}</strong> / {totalPages} (Tổng {total} HĐTC)
        </span>
        <div className="flex gap-1.5">
          <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onPage(page - 1)}
            className="px-2.5 py-1 rounded-lg border border-line disabled:opacity-40 cursor-pointer">‹</button>
          <button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => onPage(page + 1)}
            className="px-2.5 py-1 rounded-lg border border-line disabled:opacity-40 cursor-pointer">›</button>
        </div>
      </div>
    )}
  </div>
);
```

Test ở Step 3 tìm chuỗi "Trang 1 / 2", nhưng số trang nằm trong `<strong>`. Nếu `findByText(/Trang 1 \/ 2/)` không khớp vì văn bản bị tách qua nhiều phần tử, đổi truy vấn trong test sang matcher hàm: `screen.findByText((_, el) => el?.tagName === 'SPAN' && /Trang 1 \/ 2/.test(el.textContent ?? ''))`.

- [ ] **Step 7: Viết màn** `src/components/views/MortgageContractView.tsx`

Bản này chưa có form. Task 5 sẽ gắn form vào.

```tsx
import React from 'react';
import { FileSignature } from 'lucide-react';
import { Toast } from '../Toast';
import { EmptyState } from '../ui/FeedbackStates';
import { MortgageContractToolbar } from '../mortgage/MortgageContractToolbar';
import { MortgageContractTable } from '../mortgage/MortgageContractTable';
import { useMortgageContractController } from '../../hooks/useMortgageContractController';

export const MortgageContractView: React.FC = () => {
  const c = useMortgageContractController();

  if (c.customerId === null) {
    return (
      <EmptyState
        icon={FileSignature}
        title="Chọn khách hàng"
        description="Chọn khách hàng ở thanh khách hàng phía trên để xem hợp đồng thế chấp."
      />
    );
  }

  return (
    <div className="space-y-4 font-app">
      <Toast toast={c.notification} onDismiss={() => c.setNotification(null)} />
      <MortgageContractToolbar
        status={c.status} onStatus={c.setStatus}
        query={c.query} onQuery={c.setQuery}
        onNew={c.openNew}
      />
      <MortgageContractTable
        rows={c.paged.rows} page={c.paged.page} totalPages={c.paged.totalPages} total={c.filtered.length}
        collaterals={c.collaterals} creditContracts={c.creditContracts}
        onOpen={c.openEdit} onPage={c.setPage}
      />
    </div>
  );
};
```

- [ ] **Step 8: Chạy test, xác nhận xanh**

Run: `npx vitest run src/components/__tests__/MortgageContractView.test.tsx src/lib/__tests__/customerRoutes.test.ts src/lib/__tests__/navigation.test.ts src/components/__tests__/routing.test.tsx && npx tsc -b`
Expected: PASS, không lỗi kiểu.

- [ ] **Step 9: Commit**

```bash
git add src/lib/navigation.ts src/lib/routes.ts src/lib/customerRoutes.ts src/lib/i18n.ts src/App.tsx \
  src/hooks/useMortgageContractController.ts src/components/mortgage src/components/views/MortgageContractView.tsx \
  src/components/__tests__/MortgageContractView.test.tsx src/lib/__tests__/customerRoutes.test.ts \
  src/lib/__tests__/navigation.test.ts src/components/__tests__/routing.test.tsx
git commit -m "feat(the-chap): man danh sach hop dong the chap theo khach hang

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Form thêm/sửa/xóa HĐTC

**Files:**
- Create: `src/components/mortgage/MortgageContractForm.tsx`
- Modify: `src/components/views/MortgageContractView.tsx` (gắn form)
- Test: `src/components/__tests__/MortgageContractView.test.tsx` (thêm `describe` form)

**Interfaces:**
- Consumes: controller Task 4 (`draft`, `setDraft`, `formErrors`, `saving`, `save`, `remove`, `closeForm`, `collaterals`, `creditContracts`, `mortgages`); `DateInput` (`src/components/DateInput`); `formatMoneyInput`, `parseMoneyInput`; `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` (`src/components/ui/Dialog`).
- Produces: `MortgageContractForm` với props:
  ```ts
  {
    draft: MortgageContractDraft;
    original: MortgageContract | null;
    errors: string[];
    saving: boolean;
    collaterals: Collateral[];
    creditContracts: CreditContract[];
    onChange(d: MortgageContractDraft): void;
    onSave(): void;
    onDelete(m: MortgageContract): void;
    onClose(): void;
  }
  ```

- [ ] **Step 1: Viết test đỏ**, thêm vào cuối `MortgageContractView.test.tsx`

```tsx
describe('MortgageContractView — form', () => {
  it('thêm mới: chỉ liệt kê tài sản/HĐTD của khách, tick rồi lưu gọi API với id đã chọn', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([]);
    api.saveMortgageContractAPI.mockResolvedValue(11);
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Thêm HĐTC/ }));

    fireEvent.change(screen.getByLabelText('Số HĐTC'), { target: { value: 'HĐTC-05' } });
    fireEvent.click(screen.getByLabelText('TS-03'));
    fireEvent.click(screen.getByLabelText('2002/HDTD/9653222'));
    fireEvent.change(screen.getByLabelText('Giá trị bảo đảm tối đa (VNĐ)'), { target: { value: '2500000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu HĐTC' }));

    await waitFor(() => expect(api.saveMortgageContractAPI).toHaveBeenCalled());
    const [draft, before] = api.saveMortgageContractAPI.mock.calls[0];
    expect(draft).toMatchObject({
      CustomerId: 7, MortgageNumber: 'HĐTC-05', CollateralIds: [3], CreditContractIds: [9], MaxSecuredAmount: 2500000000,
    });
    expect(before).toBeNull();
  });

  it('thiếu số HĐTC thì hiện lỗi, không gọi API', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([]);
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Thêm HĐTC/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu HĐTC' }));
    expect(await screen.findByText('Số HĐTC là bắt buộc.')).toBeTruthy();
    expect(api.saveMortgageContractAPI).not.toHaveBeenCalled();
  });

  it('HĐTC chưa giải chấp: nút Xoá bị khoá kèm giải thích', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([hdtc({ Id: 1, MortgageNumber: 'HĐTC-01' })]);
    dung();
    fireEvent.click(await screen.findByText('HĐTC-01'));
    const nutXoa = screen.getByRole('button', { name: 'Xoá HĐTC' }) as HTMLButtonElement;
    expect(nutXoa.disabled).toBe(true);
    expect(screen.getByText(/Chưa giải chấp nên chưa xoá được/)).toBeTruthy();
  });

  it('HĐTC đã giải chấp: xác nhận rồi xoá', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([
      hdtc({ Id: 2, MortgageNumber: 'HĐTC-02', IsReleased: true, ReleasedDate: '2026-01-01' })]);
    api.deleteMortgageContractAPI.mockResolvedValue(undefined);
    confirmMock.mockResolvedValue(true);
    dung();
    fireEvent.change(await screen.findByLabelText('Lọc trạng thái'), { target: { value: 'all' } });
    fireEvent.click(await screen.findByText('HĐTC-02'));
    fireEvent.click(screen.getByRole('button', { name: 'Xoá HĐTC' }));
    await waitFor(() => expect(api.deleteMortgageContractAPI).toHaveBeenCalledWith(2));
  });

  it('lưu HĐTC mới lỗi ở bước liên kết: lần lưu sau là cập nhật HĐTC vừa tạo', async () => {
    const { MortgageLinkSaveError } = api;
    api.fetchMortgageContractsAPI
      .mockResolvedValueOnce([])
      .mockResolvedValue([hdtc({ Id: 11, MortgageNumber: 'HĐTC-05' })]);
    api.saveMortgageContractAPI
      .mockRejectedValueOnce(new MortgageLinkSaveError('Đã lưu HĐTC "HĐTC-05" nhưng chưa lưu được danh sách tài sản/HĐTD: lỗi', 11))
      .mockResolvedValueOnce(11);
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Thêm HĐTC/ }));
    fireEvent.change(screen.getByLabelText('Số HĐTC'), { target: { value: 'HĐTC-05' } });
    fireEvent.click(screen.getByLabelText('TS-03'));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu HĐTC' }));
    expect(await screen.findByText(/chưa lưu được danh sách tài sản/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Lưu HĐTC' }));
    await waitFor(() => expect(api.saveMortgageContractAPI).toHaveBeenCalledTimes(2));
    const [draft2, before2] = api.saveMortgageContractAPI.mock.calls[1];
    expect(draft2.Id).toBe(11);
    expect(before2).toMatchObject({ Id: 11 });
  });
});
```

Test cuối dùng lớp `MortgageLinkSaveError` có sẵn trong mock `api` (khai ở Task 4 Step 3). Controller import lớp này từ `../lib/api` (đã bị mock), nên `instanceof` trong controller so với đúng lớp giả đó.

Run: `npx vitest run src/components/__tests__/MortgageContractView.test.tsx`
Expected: FAIL ở `describe` form (chưa có nút "Thêm HĐTC" mở form / chưa có form).

- [ ] **Step 2: Viết form** `src/components/mortgage/MortgageContractForm.tsx`

```tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { DateInput } from '../DateInput';
import { formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import type { MortgageContractDraft } from '../../lib/mortgageContract';
import type { Collateral, CreditContract, MortgageContract } from '../../types';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="pl-3.5 border-l-2 border-line-strong">
    <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-ink">{title}</div>
    {children}
  </div>
);

function toggle(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
}

export const MortgageContractForm: React.FC<{
  draft: MortgageContractDraft;
  original: MortgageContract | null;
  errors: string[];
  saving: boolean;
  collaterals: Collateral[];
  creditContracts: CreditContract[];
  onChange: (d: MortgageContractDraft) => void;
  onSave: () => void;
  onDelete: (m: MortgageContract) => void;
  onClose: () => void;
}> = ({ draft, original, errors, saving, collaterals, creditContracts, onChange, onSave, onDelete, onClose }) => {
  const set = (p: Partial<MortgageContractDraft>) => onChange({ ...draft, ...p });
  const text = (v: string) => (v.trim() === '' ? null : v);
  const canDelete = Boolean(original?.IsReleased);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent variant="drawer" size="lg">
        <DialogHeader>
          <DialogTitle>{original ? `Sửa HĐTC ${original.MortgageNumber}` : 'Thêm hợp đồng thế chấp'}</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-5 text-xs overflow-y-auto">
          {errors.length > 0 && (
            <ul className="text-neg space-y-0.5" role="alert">
              {errors.map(e => <li key={e}>{e}</li>)}
            </ul>
          )}

          <Group title="Hợp đồng">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="mc-number" className={LABEL}>Số HĐTC</label>
                <input id="mc-number" className={INPUT} value={draft.MortgageNumber}
                  onChange={e => set({ MortgageNumber: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>Ngày ký</label>
                <DateInput value={draft.SignedDate ?? ''} onChange={v => set({ SignedDate: v || null })} className={INPUT} />
              </div>
              <div>
                <label htmlFor="mc-pledgor" className={LABEL}>Bên thế chấp (để trống nếu là chính khách hàng)</label>
                <input id="mc-pledgor" className={INPUT} value={draft.Pledgor ?? ''}
                  onChange={e => set({ Pledgor: text(e.target.value) })} />
              </div>
              <div>
                <label htmlFor="mc-max" className={LABEL}>Giá trị bảo đảm tối đa (VNĐ)</label>
                <input id="mc-max" className={`${INPUT} font-mono text-right`}
                  value={draft.MaxSecuredAmount === null || draft.MaxSecuredAmount === undefined ? '' : formatMoneyInput(String(draft.MaxSecuredAmount))}
                  onChange={e => set({ MaxSecuredAmount: e.target.value.trim() === '' ? null : parseMoneyInput(e.target.value) })} />
              </div>
            </div>
          </Group>

          <Group title="Công chứng và đăng ký giao dịch bảo đảm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="mc-notary-no" className={LABEL}>Số công chứng</label>
                <input id="mc-notary-no" className={INPUT} value={draft.NotaryNumber ?? ''}
                  onChange={e => set({ NotaryNumber: text(e.target.value) })} />
              </div>
              <div>
                <label className={LABEL}>Ngày công chứng</label>
                <DateInput value={draft.NotaryDate ?? ''} onChange={v => set({ NotaryDate: v || null })} className={INPUT} />
              </div>
              <div>
                <label htmlFor="mc-notary-office" className={LABEL}>Tổ chức công chứng</label>
                <input id="mc-notary-office" className={INPUT} value={draft.NotaryOffice ?? ''}
                  onChange={e => set({ NotaryOffice: text(e.target.value) })} />
              </div>
              <div>
                <label className={LABEL}>Ngày đăng ký GDBĐ</label>
                <DateInput value={draft.RegistrationDate ?? ''} onChange={v => set({ RegistrationDate: v || null })} className={INPUT} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="mc-reg-office" className={LABEL}>Cơ quan đăng ký</label>
                <input id="mc-reg-office" className={INPUT} value={draft.RegistrationOffice ?? ''}
                  onChange={e => set({ RegistrationOffice: text(e.target.value) })} />
              </div>
            </div>
          </Group>

          <Group title="Tài sản và HĐTD được bảo đảm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <fieldset>
                <legend className={LABEL}>Tài sản bảo đảm</legend>
                {collaterals.length === 0 && <p className="text-ink-faint">Khách chưa có tài sản.</p>}
                {collaterals.map(c => {
                  const label = c.AssetCode || c.AssetType || `TS #${c.Id}`;
                  return (
                    <label key={c.Id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                      <input type="checkbox" checked={draft.CollateralIds.includes(c.Id)}
                        onChange={() => set({ CollateralIds: toggle(draft.CollateralIds, c.Id) })} />
                      <span className="font-mono">{label}</span>
                    </label>
                  );
                })}
              </fieldset>
              <fieldset>
                <legend className={LABEL}>HĐTD được bảo đảm</legend>
                {creditContracts.length === 0 && <p className="text-ink-faint">Khách chưa có HĐTD.</p>}
                {creditContracts.map(cc => (
                  <label key={cc.Id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" checked={draft.CreditContractIds.includes(cc.Id)}
                      onChange={() => set({ CreditContractIds: toggle(draft.CreditContractIds, cc.Id) })} />
                    <span className="font-mono">{cc.HdtdNumber}</span>
                    {cc.IsClosed && <span className="text-ink-faint">(Đã đóng)</span>}
                  </label>
                ))}
              </fieldset>
            </div>
          </Group>

          <Group title="Giải chấp và ghi chú">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={draft.IsReleased}
                  onChange={e => set({ IsReleased: e.target.checked, ReleasedDate: e.target.checked ? draft.ReleasedDate : null })} />
                <span>Đã giải chấp</span>
              </label>
              {draft.IsReleased && (
                <div>
                  <label className={LABEL}>Ngày giải chấp</label>
                  <DateInput value={draft.ReleasedDate ?? ''} onChange={v => set({ ReleasedDate: v || null })} className={INPUT} />
                </div>
              )}
              <div className="sm:col-span-2">
                <label htmlFor="mc-note" className={LABEL}>Ghi chú</label>
                <textarea id="mc-note" className={INPUT} rows={2} value={draft.Note ?? ''}
                  onChange={e => set({ Note: text(e.target.value) })} />
              </div>
            </div>
          </Group>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60">
            {original ? (
              <div className="flex items-center gap-2">
                <button type="button" disabled={!canDelete} onClick={() => onDelete(original)}
                  className="px-3 py-2 rounded-xl border border-neg/30 text-neg text-xs font-bold disabled:opacity-40 cursor-pointer">
                  Xoá HĐTC
                </button>
                {!canDelete && <span className="text-[11px] text-ink-faint">Chưa giải chấp nên chưa xoá được.</span>}
              </div>
            ) : <span />}
            <button type="button" disabled={saving} onClick={onSave}
              className="px-4 py-2 rounded-xl bg-accent text-accent-ink text-xs font-bold disabled:opacity-50 cursor-pointer">
              Lưu HĐTC
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

Trước khi viết, mở `src/components/DateInput.tsx` để xác nhận props là `value: string`, `onChange: (v: string) => void`, `className?`. Nếu khác, sửa ba chỗ gọi `DateInput` cho khớp. Mở `src/components/ui/Dialog.tsx` để xác nhận `DialogContent` nhận `variant="drawer"` và `DialogHeader`/`DialogTitle` có mặt (đã thấy ở dòng 28 và 50). Nếu `DateInput` không nhận `aria-label`, test không cần tìm các ô ngày.

- [ ] **Step 3: Gắn form vào màn**

Trong `MortgageContractView.tsx`, thêm import:

```tsx
import { MortgageContractForm } from '../mortgage/MortgageContractForm';
```

và thêm sau `<MortgageContractTable … />`:

```tsx
      {c.draft && (
        <MortgageContractForm
          draft={c.draft}
          original={c.mortgages.find(m => m.Id === c.draft?.Id) ?? null}
          errors={c.formErrors}
          saving={c.saving}
          collaterals={c.collaterals}
          creditContracts={c.creditContracts}
          onChange={c.setDraft}
          onSave={c.save}
          onDelete={c.remove}
          onClose={c.closeForm}
        />
      )}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/components/__tests__/MortgageContractView.test.tsx && npx tsc -b`
Expected: PASS, không lỗi kiểu.

- [ ] **Step 5: Commit**

```bash
git add src/components/mortgage/MortgageContractForm.tsx src/components/views/MortgageContractView.tsx \
  src/components/__tests__/MortgageContractView.test.tsx
git commit -m "feat(the-chap): form them/sua/xoa hop dong the chap

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Hiện ngược ở màn HĐTD và màn Tài sản bảo đảm

**Files:**
- Modify: `src/components/creditContract/KunnAccordionItem.tsx` (props; khối "Collateral Tag Badges")
- Modify: `src/hooks/useCreditContractController.ts` (`loadCustomer`: `Promise.all` và state)
- Modify: `src/components/views/CreditContractView.tsx` (chỗ render `<KunnAccordionItem`, dòng ~205)
- Modify: `src/components/collateral/CollateralTable.tsx` (props, `<thead>`, cột mới, `colSpan`)
- Modify: `src/hooks/useCollateralController.ts` (`fetchData`)
- Modify: `src/components/views/CollateralView.tsx` (`<CollateralTable`)
- Test: `src/components/__tests__/KunnAccordionItem.test.tsx`

**Interfaces:**
- Consumes: `fetchMortgageContractsAPI` (Task 3); `mortgagesOfCollateral`, `mortgagesOfCreditContract` (Task 2).
- Produces:
  - `KunnAccordionItem` nhận thêm prop tùy chọn `mortgageNumbers?: string[]`.
  - `CollateralTable` nhận thêm prop tùy chọn `mortgageNumbersOf?: (collateralId: number) => string[]`.

- [ ] **Step 1: Test đỏ cho dòng "HĐTC"**, thêm vào `KunnAccordionItem.test.tsx`

```tsx
describe('dòng hợp đồng thế chấp', () => {
  it('HĐTD có HĐTC thì hiện "HĐTC:" kèm số', () => {
    const cc = hdtd({});
    const summary = summarizeCreditContracts([cc], [], { today: HOM_NAY })[0];
    render(
      <KunnAccordionItem
        contractSummary={summary} collaterals={[]} isExpanded={false} onToggleExpand={() => {}}
        getKunnsForContract={() => []} outstandingOf={() => 0}
        onDisburse={() => {}} onEdit={() => {}} onDelete={() => {}} today={HOM_NAY}
        mortgageNumbers={['HĐTC-01', 'HĐTC-02']}
      />
    );
    expect(screen.getByText('HĐTC:')).toBeTruthy();
    expect(screen.getByText('HĐTC-01, HĐTC-02')).toBeTruthy();
  });

  it('không có HĐTC thì không hiện dòng này', () => {
    dungThe(hdtd({}), []);
    expect(screen.queryByText('HĐTC:')).toBeNull();
  });
});
```

Run: `npx vitest run src/components/__tests__/KunnAccordionItem.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Sửa `KunnAccordionItem.tsx`**

- Trong `interface KunnAccordionItemProps`, thêm `mortgageNumbers?: string[];`.
- Thêm `mortgageNumbers = [],` vào danh sách tham số.
- Ngay **sau** khối `{/* Collateral Tag Badges */} … )}` (trước thẻ `</div>` đóng phần thân thẻ), thêm:

```tsx
        {mortgageNumbers.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
            <span className="font-bold text-ink-faint text-xs">HĐTC:</span>
            <span className="font-mono text-ink">{mortgageNumbers.join(', ')}</span>
          </div>
        )}
```

- [ ] **Step 3: Nạp HĐTC ở màn HĐTD**

Trong `useCreditContractController.ts`:
- Thêm `fetchMortgageContractsAPI` vào import từ `'../lib/api'`, và `import type { MortgageContract } from '../types';` (gộp vào dòng import types sẵn có nếu có).
- Thêm state `const [mortgages, setMortgages] = useState<MortgageContract[]>([]);`.
- Trong `loadCustomer`:
  - Nhánh `!c`: gọi thêm `setMortgages([])`.
  - Đổi `Promise.all` thành:

```ts
      const [ccs, ks, cols, mcs] = await Promise.all([
        fetchCreditContractsByCustomerAPI(c.Id),
        fetchContractsByCustomerAPI(c.Id),
        fetchCollateralsByCustomerAPI(c.Id),
        fetchMortgageContractsAPI(c.Id).catch(() => [] as MortgageContract[]),
      ]);
```

  - Thêm `setMortgages(mcs);` cạnh `setCollaterals(cols);`.
- Trả `mortgages` trong object `return { … }`.

`.catch(() => [])` ở đây có chủ đích: màn HĐTD không được hỏng chỉ vì dòng HĐTC chỉ-đọc không nạp được (ví dụ migration chưa áp). Ghi chú điều này bằng một comment ngắn ngay trên dòng đó:

```ts
        // Dòng HĐTC chỉ để tham khảo: nạp lỗi thì màn HĐTD vẫn chạy, không có dòng này.
```

Trong `CreditContractView.tsx`:
- Lấy thêm `mortgages` từ `useCreditContractController()`.
- Thêm import `import { mortgagesOfCreditContract } from '../../lib/mortgageContract';`.
- Thêm prop vào `<KunnAccordionItem`:

```tsx
                    mortgageNumbers={mortgagesOfCreditContract(contractSummary.contract.Id, mortgages).map(m => m.MortgageNumber)}
```

- [ ] **Step 4: Cột "HĐTC" ở màn Tài sản bảo đảm**

`CollateralTable.tsx`:
- Thêm vào `CollateralTableProps`: `mortgageNumbersOf?: (collateralId: number) => string[];`.
- Thêm `mortgageNumbersOf,` vào danh sách tham số.
- Trong `<thead>`, thêm trước `<th …>TRẠNG THÁI</th>`:

```tsx
              <th className="px-4 py-3 whitespace-nowrap">HĐTC</th>
```

- Trong mỗi hàng, thêm trước ô trạng thái (comment trạng thái trong vòng `paginatedCollaterals.map`):

```tsx
                    <td className="px-4 py-3.5 font-mono text-[11px] text-ink">
                      {(mortgageNumbersOf?.(c.Id) ?? []).join(', ') || <span className="text-ink-faint">—</span>}
                    </td>
```

- Đổi `colSpan={10}` của hàng "chưa có dữ liệu" thành `colSpan={11}`. Đổi `colSpan={4}` ở `tfoot` (ô "Hiển thị x / y TSBĐ") thành `colSpan={5}`.

`useCollateralController.ts`:
- Thêm `fetchMortgageContractsAPI` vào import từ `'../lib/api'`, `mortgagesOfCollateral` từ `'../lib/mortgageContract'`, và kiểu `MortgageContract`.
- Thêm state `const [mortgages, setMortgages] = useState<MortgageContract[]>([]);`.
- Trong `fetchData`, đổi `Promise.all` thành:

```ts
      const [colList, custList, mcs] = await Promise.all([
        fetchCollateralsAPI(),
        fetchCustomersAPI(),
        // Cột HĐTC chỉ để tham khảo: nạp lỗi thì bảng TSBĐ vẫn hiện, cột để trống.
        fetchMortgageContractsAPI().catch(() => [] as MortgageContract[]),
      ]);
      setCollaterals(colList);
      setCustomers(custList);
      setMortgages(mcs);
```

- Thêm và trả trong object `return`:

```ts
  const mortgageNumbersOf = useCallback(
    (collateralId: number) => mortgagesOfCollateral(collateralId, mortgages).map(m => m.MortgageNumber),
    [mortgages]
  );
```

`CollateralView.tsx`: lấy thêm `mortgageNumbersOf` từ controller và truyền `mortgageNumbersOf={mortgageNumbersOf}` vào `<CollateralTable`.

- [ ] **Step 5: Chạy test liên quan + kiểm kiểu**

Run: `npx vitest run src/components/__tests__/KunnAccordionItem.test.tsx src/components/__tests__/CollateralView.phamVi.test.tsx src/components/__tests__/CollateralView.tongHopTheoKhach.test.tsx src/components/__tests__/CreditContractView.dinhTuyen.test.tsx && npx tsc -b`
Expected: PASS. Nếu các test màn `CollateralView` / `CreditContractView` mock `../../lib/api` mà thiếu `fetchMortgageContractsAPI`, thêm `fetchMortgageContractsAPI: vi.fn().mockResolvedValue([])` vào mock đó.

- [ ] **Step 6: Commit**

```bash
git add src/components/creditContract/KunnAccordionItem.tsx src/hooks/useCreditContractController.ts \
  src/components/views/CreditContractView.tsx src/components/collateral/CollateralTable.tsx \
  src/hooks/useCollateralController.ts src/components/views/CollateralView.tsx src/components/__tests__
git commit -m "feat(the-chap): hien HDTC o man HDTD va cot HDTC o man tai san bao dam

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Kiểm thử migration trên CSDL, tài liệu, nhật ký, kiểm chứng cuối

**Files:**
- Modify: `.agents/skills/tin-dung/references/collateral-ltv.md` và `.claude/skills/tin-dung/references/collateral-ltv.md` (bản `.claude` bị `.gitignore`, cần `git add -f`)
- Modify: `docs/progress/2026-09.md`

**Interfaces:**
- Consumes: migration Task 1.

- [ ] **Step 1: Hỏi người dùng trước khi đụng CSDL.** Trình bày hai lựa chọn và dừng chờ trả lời:
  - **(a)** Tạo nhánh Supabase để thử (`mcp__plugin_supabase_supabase__create_branch`). Nhánh này có thể tính phí theo gói.
  - **(b)** Áp thẳng migration lên project thật bằng `apply_migration`, rồi chạy kịch bản kiểm ở Step 2 **trong một giao dịch có `ROLLBACK`**, nên không để lại dữ liệu thử.

  Lấy `project_id` bằng `mcp__plugin_supabase_supabase__list_projects`.

- [ ] **Step 2: Áp migration và chạy kịch bản kiểm** (chỉ sau khi người dùng đồng ý)

Áp nội dung `58_hop_dong_the_chap.sql` bằng `apply_migration` (name: `hop_dong_the_chap`). Kết quả khối tự kiểm phải là `so_bang_3 = 3, so_trigger_3 = 3, so_policy_3 = 3, rls_bat = true`.

Chạy bằng `execute_sql`. Đây là kịch bản kiểm trigger và khóa ngoại, cả khối rollback:

```sql
BEGIN;
DO $$
DECLARE
  kh_a integer; kh_b integer; ts_b bigint; ts_a bigint; hd_a bigint; mc integer;
BEGIN
  SELECT "Id" INTO kh_a FROM public."Customers" ORDER BY "Id" LIMIT 1;
  SELECT "Id" INTO kh_b FROM public."Customers" WHERE "Id" <> kh_a ORDER BY "Id" LIMIT 1;
  SELECT "Id" INTO ts_a FROM public."Collaterals" WHERE "CustomerId" = kh_a LIMIT 1;
  SELECT "Id" INTO ts_b FROM public."Collaterals" WHERE "CustomerId" = kh_b LIMIT 1;
  SELECT "Id" INTO hd_a FROM public."CreditContracts" WHERE "CustomerId" = kh_a LIMIT 1;

  INSERT INTO public."MortgageContracts" ("CustomerId", "MortgageNumber") VALUES (kh_a, 'KIEM-THU-58') RETURNING "Id" INTO mc;

  -- 1. nối chéo khách phải lỗi
  BEGIN
    INSERT INTO public."MortgageContractCollaterals" VALUES (mc, ts_b);
    RAISE EXCEPTION 'SAI: nối chéo khách không bị chặn';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'SAI:%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 1: %', SQLERRM;
  END;

  -- 2. nối đúng khách thì được
  IF ts_a IS NOT NULL THEN INSERT INTO public."MortgageContractCollaterals" VALUES (mc, ts_a); END IF;
  IF hd_a IS NOT NULL THEN INSERT INTO public."MortgageContractCreditContracts" VALUES (mc, hd_a); END IF;

  -- 3. xoá tài sản đang thế chấp phải lỗi khoá ngoại
  IF ts_a IS NOT NULL THEN
    BEGIN
      DELETE FROM public."Collaterals" WHERE "Id" = ts_a;
      RAISE EXCEPTION 'SAI: xoá tài sản đang thế chấp không bị chặn';
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'OK 3: %', SQLERRM;
    END;
  END IF;

  -- 4. xoá HĐTC chưa giải chấp phải lỗi
  BEGIN
    DELETE FROM public."MortgageContracts" WHERE "Id" = mc;
    RAISE EXCEPTION 'SAI: xoá HĐTC chưa giải chấp không bị chặn';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'SAI:%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 4: %', SQLERRM;
  END;

  -- 5. giải chấp thiếu ngày phải lỗi CHECK
  BEGIN
    UPDATE public."MortgageContracts" SET "IsReleased" = true WHERE "Id" = mc;
    RAISE EXCEPTION 'SAI: giải chấp thiếu ngày không bị chặn';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK 5: %', SQLERRM;
  END;

  -- 6. giải chấp đủ ngày rồi xoá được, bảng nối xoá theo
  UPDATE public."MortgageContracts" SET "IsReleased" = true, "ReleasedDate" = current_date WHERE "Id" = mc;
  DELETE FROM public."MortgageContracts" WHERE "Id" = mc;
  IF EXISTS (SELECT 1 FROM public."MortgageContractCollaterals" WHERE "MortgageContractId" = mc) THEN
    RAISE EXCEPTION 'SAI: bảng nối không xoá theo';
  END IF;
  RAISE NOTICE 'OK 6';
END $$;
ROLLBACK;
```

Expected: không có dòng `SAI:`; các NOTICE `OK 1`, `OK 4`, `OK 5`, `OK 6` (thêm `OK 3` nếu khách đầu tiên có tài sản). Nếu CSDL chưa có hai khách, hoặc khách đầu không có tài sản/HĐTD, ghi rõ bước nào không chạy được vào nhật ký, **không** ghi là đã kiểm.

Sau đó chạy `mcp__plugin_supabase_supabase__get_advisors` (type `security`) và xác nhận không có cảnh báo mới về 3 bảng này (RLS tắt, policy thiếu, function `search_path`).

- [ ] **Step 3: Tài liệu nghiệp vụ.** Thêm vào cuối `references/collateral-ltv.md` (trước mục "Sổ tra hàm" nếu có), rồi chép sang bản `.claude`:

```markdown
## Hợp đồng thế chấp (HĐTC)

HĐTC lưu ở `MortgageContracts` (migration 58). Một HĐTC gồm **nhiều tài sản** (`MortgageContractCollaterals`) và bảo đảm cho **nhiều HĐTD** (`MortgageContractCreditContracts`). Khi HĐTD được tái cấp, HĐTD mới được gắn thêm vào HĐTC cũ, không phải nhập lại.

Quy tắc toàn vẹn nằm ở CSDL:

- Chỉ nối tài sản / HĐTD **cùng khách hàng** với HĐTC (trigger `mortgage_link_same_customer`).
- **Không xoá HĐTC chưa giải chấp** (trigger `mortgage_block_delete_unreleased`), trừ khi bị xoá theo dây chuyền từ `Customers`.
- **Không xoá tài sản / HĐTD đang nằm trong HĐTC**, kể cả HĐTC đã giải chấp (khoá ngoại NO ACTION `fk_mortgage_link_collateral`, `fk_mortgage_link_credit_contract`). `mortgageLinkErrorMessage` (`mortgageContract.ts`) đổi lỗi này sang tiếng Việt.
- Giải chấp phải có ngày giải chấp (CHECK).
- Xoá khách hàng bị chặn khi còn HĐTC (`customerDeleteBlockers`), như với KUNN / HĐTD / TSBĐ / thẻ.

**Hai nguồn độc lập:** `CreditContracts.CollateralIds` (chuỗi CSV) vẫn là nguồn cho hạn mức và LTV. Bảng nối HĐTC ↔ tài sản là nguồn pháp lý riêng. Hai nguồn **có thể lệch nhau** và hiện chưa có gì đối chiếu tự động.
```

Chép sang `.claude`:

```bash
cp .agents/skills/tin-dung/references/collateral-ltv.md .claude/skills/tin-dung/references/collateral-ltv.md
```

- [ ] **Step 4: Kiểm chứng toàn bộ**

Run: `npm test && npm run build && npx oxlint src/lib/mortgageContract.ts src/lib/api/mortgageContractApi.ts src/hooks/useMortgageContractController.ts src/components/mortgage src/components/views/MortgageContractView.tsx`
Expected: toàn bộ test pass, build pass, lint không lỗi mới.

Chụp màn: dựng trang thử tạm `.harness/harness.html` + `.harness/harness.tsx`. Trang thử render `MortgageContractTable` với 12 HĐTC giả (có HĐTC đã giải chấp, có bên thứ ba) và `MortgageContractForm` mở sẵn. Chạy `npx vite --port 5199 --strictPort` và chụp bằng Edge chạy ẩn (`msedge --headless=new --user-data-dir=D:/cm-shots/edge --screenshot=D:/cm-shots/...png`), profile Edge đặt **ngoài** repo. Xem ảnh, rồi xoá `.harness`, `D:/cm-shots` và tắt vite.

- [ ] **Step 5: Nhật ký** — thêm mục mới lên đầu `docs/progress/2026-09.md` theo khuôn 5 dòng. Dòng Kiểm chứng ghi số test thật, kết quả kịch bản SQL thật, và kết quả advisors.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/tin-dung/references/collateral-ltv.md docs/progress/2026-09.md
git add -f .claude/skills/tin-dung/references/collateral-ltv.md
git commit -m "docs(the-chap): tai lieu nghiep vu HDTC va nhat ky

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
