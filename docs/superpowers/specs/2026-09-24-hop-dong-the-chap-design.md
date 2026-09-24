# Hợp đồng thế chấp (HĐTC) theo khách hàng

Ngày: 2026-09-24 · Trạng thái: chờ duyệt spec

## Brief

**Mục tiêu:** Banker lưu và tra được các hợp đồng thế chấp của từng khách hàng: số hợp đồng, công chứng, đăng ký giao dịch bảo đảm, tài sản nào đang thế chấp, và hợp đồng đó bảo đảm cho những HĐTD nào. Khi HĐTD được tái cấp, HĐTC cũ vẫn gắn được sang HĐTD mới, không phải nhập lại.

**Phạm vi:**

- LÀM:
  - Ba bảng mới (HĐTC và hai bảng nối), trigger toàn vẹn, RLS.
  - Màn "Hợp đồng thế chấp" theo khách hàng: bảng có phân trang (10 dòng/trang), lọc, tìm, form thêm/sửa/xóa.
  - Hiện ngược chỉ đọc: dòng "HĐTC: …" trên từng HĐTD ở màn Hợp đồng tín dụng; cột "HĐTC" ở màn Tài sản bảo đảm.
- KHÔNG LÀM:
  - Đính kèm bản scan HĐTC (Supabase + R2). Để đợt sau.
  - Đụng cột `CreditContracts.CollateralIds` và mọi phép tính hạn mức/LTV đang đọc nó.
  - Tự dựng HĐTC từ dữ liệu cũ.
  - Xuất biểu mẫu HĐTC ra Word.

**Tầng:**

| Tầng | Nội dung |
| :--- | :--- |
| migration | `supabase/migrations/58_hop_dong_the_chap.sql` |
| types | `MortgageContract` trong `src/types/index.ts`, cập nhật `database.types.ts` |
| lib | `src/lib/mortgageContract.ts`: kiểm tra form, lọc/tìm, dựng nhãn |
| lib/api | `src/lib/api/mortgageContractApi.ts`: đọc/ghi HĐTC cùng hai bảng nối |
| hooks | `src/hooks/useMortgageContractController.ts` |
| components | `src/components/mortgage/` (bảng, thanh tìm, form), `src/components/views/MortgageContractView.tsx` |

**Kiểm chứng:**

- Vitest cho lib, API (Supabase giả), form và màn hình, route và thanh bên.
- Migration chạy trên nhánh Supabase thử trước: kiểm 3 trigger và RLS vai trò banker.
- `npm test`, `npm run build`.
- Chụp màn mới bằng Edge chạy ẩn trên trang thử với dữ liệu giả.

**Rủi ro đã biết:**

- Áp migration lên CSDL thật khó đảo ngược. Hỏi người dùng trước khi áp. Migration phải áp trước khi deploy code.
- `CreditContracts.CollateralIds` và bảng nối HĐTC ↔ tài sản là hai nguồn độc lập, có thể lệch nhau. Chấp nhận trong đợt này, ghi vào tài liệu nghiệp vụ.

## Nghiệp vụ

- Một HĐTC gồm **một hoặc nhiều tài sản bảo đảm** và bảo đảm cho **một hoặc nhiều HĐTD**. Quan hệ nhiều–nhiều ở cả hai phía.
- Bên thế chấp có thể là chính khách hàng hoặc bên thứ ba, ví dụ cha mẹ thế chấp tài sản cho con vay. Tài sản vẫn ghi dưới hồ sơ khách hàng (`Collaterals.CustomerId`), chỉ tên bên thế chấp là khác.
- HĐTC chưa giải chấp thì không xóa được.
- Tài sản hay HĐTD đang nằm trong một HĐTC thì không xóa được. Muốn xóa phải gỡ khỏi HĐTC trước.
- Chỉ nối tài sản và HĐTD **của cùng khách hàng** với HĐTC.
- Xóa khách hàng bị chặn khi khách còn HĐTC, cùng cơ chế đang chặn khi còn KUNN, HĐTD, tài sản hay thẻ (`customerDeleteBlockers`). Người dùng phải giải chấp và xóa HĐTC trước.
- Tái cấp: HĐTD mới được tick thêm vào HĐTC đang có. HĐTD cũ đã đóng vẫn chọn được, có nhãn "Đã đóng".

## Dữ liệu

### `MortgageContracts`

| Cột | Kiểu | Ghi chú |
| :--- | :--- | :--- |
| `Id` | integer identity | khóa chính |
| `CustomerId` | integer NOT NULL | → `Customers.Id`, ON DELETE CASCADE |
| `MortgageNumber` | text NOT NULL | UNIQUE (`CustomerId`, `MortgageNumber`) |
| `SignedDate` | date | ngày ký |
| `Pledgor` | text | bên thế chấp; NULL = chính khách hàng |
| `MaxSecuredAmount` | numeric | giá trị nghĩa vụ bảo đảm tối đa; CHECK ≥ 0 |
| `NotaryNumber` | text | số công chứng |
| `NotaryDate` | date | |
| `NotaryOffice` | text | tổ chức công chứng |
| `RegistrationDate` | date | ngày đăng ký giao dịch bảo đảm |
| `RegistrationOffice` | text | cơ quan đăng ký |
| `IsReleased` | boolean NOT NULL DEFAULT false | đã giải chấp |
| `ReleasedDate` | date | CHECK: `IsReleased` thì phải có `ReleasedDate` |
| `Note` | text | |
| `CreatedAt` | timestamptz DEFAULT now() | |

Chỉ mục trên `CustomerId`.

### Bảng nối

| Bảng | Cột | Khóa ngoại |
| :--- | :--- | :--- |
| `MortgageContractCollaterals` | `MortgageContractId`, `CollateralId` | → `MortgageContracts` ON DELETE CASCADE; → `Collaterals` NO ACTION |
| `MortgageContractCreditContracts` | `MortgageContractId`, `CreditContractId` | → `MortgageContracts` ON DELETE CASCADE; → `CreditContracts` NO ACTION |

Khóa chính kép (`MortgageContractId`, `…Id`). Chỉ mục trên cột phía tài sản/HĐTD để tra ngược.

Khóa ngoại phía tài sản/HĐTD dùng **NO ACTION** chứ không phải RESTRICT. NO ACTION kiểm ở cuối câu lệnh, nên khi xóa cả khách hàng thì chuỗi xóa theo (khách → HĐTC → bảng nối, khách → tài sản) chạy xong mà không vướng. Xóa riêng lẻ một tài sản đang được thế chấp vẫn bị chặn.

### Trigger

1. **Cùng khách hàng** (BEFORE INSERT OR UPDATE trên hai bảng nối): `CustomerId` của tài sản/HĐTD phải bằng `CustomerId` của HĐTC. Sai thì báo lỗi tiếng Việt.
2. **Chặn xóa HĐTC chưa giải chấp** (BEFORE DELETE trên `MortgageContracts`): báo lỗi tiếng Việt nếu `IsReleased = false`. Riêng trường hợp xóa theo khách hàng (cascade từ `Customers`) thì cho qua, vì chỉ admin xóa được khách và việc xóa khách là cố ý. Phân biệt bằng `pg_trigger_depth() > 1`.

### RLS

- `MortgageContracts`: ALL qua `can_access_customer("CustomerId")`, giống `Collaterals`.
- Hai bảng nối: ALL qua `EXISTS` HĐTC cha có `can_access_customer("CustomerId")`.

Migration có khối tự kiểm cuối tệp: đếm bảng, trigger, policy vừa tạo. Chạy lại nhiều lần an toàn (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`).

## Mã nguồn

### Kiểu (`src/types/index.ts`)

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
  CollateralIds: number[];       // dựng từ bảng nối khi đọc
  CreditContractIds: number[];   // dựng từ bảng nối khi đọc
}
```

### `src/lib/mortgageContract.ts` (hàm thuần)

- `validateMortgageContract(draft, existing)`: trả danh sách lỗi.
  - thiếu số;
  - trùng số trong cùng khách;
  - giải chấp mà thiếu ngày;
  - ngày giải chấp trước ngày ký;
  - giá trị tối đa âm.
- `filterMortgageContracts(list, { status, query })`:
  - `status` là `active` | `released` | `all`, mặc định `active`;
  - `query` tìm không phân biệt hoa thường, bỏ dấu, trên số HĐTC và bên thế chấp.
- `collateralLabels(ids, collaterals)`, `creditContractLabels(ids, creditContracts)`: dựng nhãn kiểu "TS-01, TS-03", bỏ qua id không còn tồn tại.
- `mortgagesOfCollateral(collateralId, list)`, `mortgagesOfCreditContract(creditContractId, list)`: tra ngược cho hai màn hiện ngược.
- `linkDiff(before, after)`: trả `{ add, remove }` để API chỉ ghi phần thay đổi của bảng nối.
- `paginate(list, page, pageSize)`: trả `{ rows, page, totalPages }`, kẹp `page` vào `[1, totalPages]` (danh sách rỗng vẫn là 1 trang).

### `src/lib/api/mortgageContractApi.ts`

- `fetchMortgageContractsAPI(customerId)`: đọc HĐTC kèm hai bảng nối (embed Supabase), trả `MortgageContract[]` đã có `CollateralIds`, `CreditContractIds`.
- `saveMortgageContractAPI(draft, before?)`: upsert HĐTC, rồi dùng `linkDiff` để insert/delete hai bảng nối.
  - Lỗi ở bước bảng nối thì ném lỗi lên, không nuốt.
  - Thông báo nói rõ phần HĐTC đã lưu và phần nào chưa.
- `deleteMortgageContractAPI(id)`: xóa. Lỗi trigger (chưa giải chấp) hiện nguyên văn tiếng Việt cho người dùng.

### Giao diện

- **Định tuyến:**
  - Thêm `'mortgage-contracts'` vào `CUSTOMER_SCOPED_SCREENS` (`customerRoutes.ts`), `ROUTE_OF` (`routes.ts`), `App.tsx`.
  - Thêm vào thanh bên ở nhóm `nav.groupRecords`, ngay sau "Tài sản bảo đảm". Biểu tượng `FileSignature`, khóa i18n `nav.mortgageContracts`.
- **`MortgageContractView`:**
  - Thanh tìm: nút "Thêm HĐTC", ô tìm, lọc trạng thái.
  - `MortgageContractTable`, theo mẫu `CollateralTable` (bảng tự dựng, phân trang 10 dòng, "Trang x / y (Tổng n HĐTC)"), vì `DataTable` dùng chung chưa có phân trang. Các cột: Số HĐTC, Ngày ký, Bên thế chấp, Giá trị bảo đảm tối đa, Tài sản, HĐTD được bảo đảm, Trạng thái. Bấm dòng thì mở form.
  - Trang hiện tại nằm ở controller; đổi bộ lọc hay từ khóa thì về trang 1.
- **`MortgageContractForm` (panel trượt):**
  - Bốn nhóm theo quy ước bỏ viền lồng (thanh màu trái + tiêu đề):
    1. Hợp đồng.
    2. Công chứng và đăng ký.
    3. Tài sản và HĐTD được bảo đảm: danh sách tick, chỉ của khách đang chọn.
    4. Trạng thái giải chấp và ghi chú.
  - Nút Xóa bị khóa khi chưa giải chấp, kèm dòng giải thích.
  - Tiền nhập qua `formatMoneyInput`.
- **Hiện ngược, chỉ đọc:**
  - `KunnAccordionItem` (màn Hợp đồng tín dụng) thêm dòng "HĐTC: số…, số…" khi có.
  - `CollateralTable` thêm cột "HĐTC".
  - Cả hai lấy danh sách qua controller của màn tương ứng, gọi `fetchMortgageContractsAPI` một lần theo khách.

### Tài liệu

- `references/collateral-ltv.md`, ở cả `.agents/` và `.claude/`:
  - thêm mục HĐTC, gồm mô hình dữ liệu, các quy tắc toàn vẹn;
  - ghi rõ `CreditContracts.CollateralIds` và bảng nối là hai nguồn độc lập.
- Nhật ký `docs/progress/2026-09.md`.

## Thứ tự triển khai

1. Migration và kiểu TS.
2. lib cùng test.
3. API cùng test.
4. Controller, màn hình, form, route, thanh bên.
5. Hiện ngược ở màn HĐTD và màn Tài sản bảo đảm.
6. Chạy migration trên nhánh Supabase thử. Hỏi người dùng rồi mới áp CSDL thật.
7. Tài liệu nghiệp vụ, nhật ký.
