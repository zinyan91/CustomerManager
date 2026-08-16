# Panel due trên dashboard đọc theo lịch trả nợ thật — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel "đóng kỳ due của tháng" trên dashboard ngừng suy ngày đến hạn từ ngày kỷ niệm hợp đồng, chuyển sang đọc kỳ chưa trả sớm nhất trong `RepaymentSchedules`.

**Architecture:** Một hàm thuần trong `src/lib/duePeriod.ts` quy một mảng kỳ trả nợ về một trạng thái (`overdue` / `upcoming` / `none`). Một hàm API mới nạp lịch trả nợ của nhiều hợp đồng cùng lúc, có phân trang. `DashboardView` gọi hai thứ đó thay cho `monthlyDueInfo`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, @testing-library/react, Supabase JS v2.

## Global Constraints

- Mã nguồn **không có chú thích**. Phần "vì sao" viết vào `CONVENTIONS.md` hoặc spec, không viết vào code.
- Logic nghiệp vụ phải là **hàm thuần trong `src/lib/`**, không viết trong component.
- **Không dùng `||` khi 0 là giá trị hợp lệ.** Kiểm `null` / `undefined` / `NaN` tường minh.
- **Không nuốt lỗi.** Lỗi nạp dữ liệu phải hiện ra cho người dùng, không được để màn hình trông như đã tải đủ.
- Một quy tắc nghiệp vụ chỉ cài ở **một** nơi. Cần dùng lại thì import.
- Ngưỡng "sắp đến hạn" là **5 ngày**, giữ nguyên như panel đang chạy.
- Kỳ còn nợ ⇔ `IsPaid = false`. **Không** đối chiếu `ActualPaidAmount` — cột này rỗng trên toàn bộ dữ liệu thật (836/836 dòng bằng 0).
- Lệnh chạy test: `npx vitest run <đường-dẫn>`. Lệnh chạy đủ: `npm test`. Đóng gói: `npm run build`.

**Spec:** `docs/superpowers/specs/2026-08-16-dashboard-due-theo-lich-tra-no-design.md`

---

## Cấu trúc tệp

| Tệp | Trạng thái | Trách nhiệm |
| :--- | :--- | :--- |
| `src/lib/duePeriod.ts` | Tạo mới | Kiểu `DuePeriodRow`, hàm `isPeriodOutstanding`, `contractDueState` |
| `src/lib/__tests__/duePeriod.test.ts` | Tạo mới | Test cho hai hàm trên |
| `src/lib/utils.ts` | Sửa | Thêm `chunk` dùng chung |
| `src/lib/__tests__/utils.test.ts` | Tạo mới nếu chưa có | Test cho `chunk` |
| `src/lib/api/loanContractApi.ts` | Sửa | Thêm `fetchSchedulesForContractsAPI` |
| `src/components/dashboard/DueSectionPanel.tsx` | Sửa | Thêm prop `notice` |
| `src/components/views/DashboardView.tsx` | Sửa | Nạp lịch, dựng danh sách, cột mới, bộ lọc |

`duePeriod.ts` tách riêng khỏi `dueList.ts`: `dueList.ts` đang lo việc lọc/đếm/in danh sách nói chung, còn `duePeriod.ts` lo riêng việc đọc kỳ trả nợ. Hai trách nhiệm khác nhau, đừng dồn một tệp.

---

### Task 1: Hàm thuần `contractDueState`

**Files:**
- Create: `src/lib/duePeriod.ts`
- Test: `src/lib/__tests__/duePeriod.test.ts`

**Interfaces:**
- Consumes: `daysUntil`, `toIsoDate` từ `src/lib/utils.ts`; kiểu `RepaymentSchedule` từ `src/types`.
- Produces:
  - `type DuePeriodRow = Pick<RepaymentSchedule, 'Id' | 'ContractId' | 'PeriodNumber' | 'DueDate' | 'TotalAmount' | 'IsPaid'>`
  - `const UPCOMING_DAYS = 5`
  - `function isPeriodOutstanding(period: Pick<DuePeriodRow, 'IsPaid'>): boolean`
  - `function contractDueState(periods: DuePeriodRow[], todayIso?: string): ContractDueState`
  - `interface ContractDueState { kind: 'overdue' | 'upcoming' | 'none'; period: DuePeriodRow | null; dueDateIso: string | null; daysLeft: number | null }`

- [ ] **Bước 1: Viết test trước**

Tạo `src/lib/__tests__/duePeriod.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isPeriodOutstanding, contractDueState, type DuePeriodRow } from '../duePeriod';

const ky = (over: Partial<DuePeriodRow> & { PeriodNumber: number; DueDate: string }): DuePeriodRow => ({
  Id: over.PeriodNumber,
  ContractId: 1,
  TotalAmount: 1_000_000,
  IsPaid: false,
  ...over,
});

describe('isPeriodOutstanding', () => {
  it('chưa đánh dấu trả thì còn nợ', () => {
    expect(isPeriodOutstanding({ IsPaid: false })).toBe(true);
  });

  it('đã đánh dấu trả thì xong', () => {
    expect(isPeriodOutstanding({ IsPaid: true })).toBe(false);
  });
});

describe('contractDueState', () => {
  it('không có kỳ nào thì không hiện', () => {
    const r = contractDueState([], '2026-08-16');
    expect(r.kind).toBe('none');
    expect(r.period).toBeNull();
  });

  it('mọi kỳ đã trả thì không hiện', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-07-01', IsPaid: true }),
      ky({ PeriodNumber: 2, DueDate: '2026-08-01', IsPaid: true }),
    ], '2026-08-16');
    expect(r.kind).toBe('none');
  });

  it('kỳ còn nợ đã qua hạn thì báo quá hạn theo số ngày âm', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-08-01' }),
    ], '2026-08-16');
    expect(r.kind).toBe('overdue');
    expect(r.daysLeft).toBe(-15);
    expect(r.dueDateIso).toBe('2026-08-01');
    expect(r.period?.PeriodNumber).toBe(1);
  });

  it('nhiều kỳ còn nợ thì lấy kỳ có hạn sớm nhất', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 3, DueDate: '2026-09-01' }),
      ky({ PeriodNumber: 1, DueDate: '2026-06-01' }),
      ky({ PeriodNumber: 2, DueDate: '2026-07-01' }),
    ], '2026-08-16');
    expect(r.period?.PeriodNumber).toBe(1);
    expect(r.dueDateIso).toBe('2026-06-01');
  });

  it('kỳ đã trả không được chen lên trước kỳ còn nợ', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-05-01', IsPaid: true }),
      ky({ PeriodNumber: 2, DueDate: '2026-08-20' }),
    ], '2026-08-16');
    expect(r.kind).toBe('upcoming');
    expect(r.period?.PeriodNumber).toBe(2);
  });

  it('đến hạn đúng hôm nay là sắp đến hạn 0 ngày, không phải quá hạn', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-08-16' }),
    ], '2026-08-16');
    expect(r.kind).toBe('upcoming');
    expect(r.daysLeft).toBe(0);
  });

  it('đến hạn đúng ngưỡng 5 ngày vẫn hiện', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-08-21' }),
    ], '2026-08-16');
    expect(r.kind).toBe('upcoming');
    expect(r.daysLeft).toBe(5);
  });

  it('xa hơn 5 ngày thì không hiện', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '2026-08-22' }),
    ], '2026-08-16');
    expect(r.kind).toBe('none');
    expect(r.daysLeft).toBe(6);
  });

  it('kỳ không có ngày đến hạn thì bỏ qua, không làm hỏng cả hợp đồng', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '' }),
      ky({ PeriodNumber: 2, DueDate: '2026-08-01' }),
    ], '2026-08-16');
    expect(r.kind).toBe('overdue');
    expect(r.period?.PeriodNumber).toBe(2);
  });

  it('đọc được ngày kiểu dd/mm/yyyy', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 1, DueDate: '01/08/2026' }),
    ], '2026-08-16');
    expect(r.dueDateIso).toBe('2026-08-01');
    expect(r.daysLeft).toBe(-15);
  });

  it('ca Đặng Bá Nhân: đã đóng kỳ tháng 8, kỳ sau 01/09, hôm nay 16/08 thì không hiện', () => {
    const r = contractDueState([
      ky({ PeriodNumber: 7, DueDate: '2026-07-01', IsPaid: true }),
      ky({ PeriodNumber: 8, DueDate: '2026-08-01', IsPaid: true }),
      ky({ PeriodNumber: 9, DueDate: '2026-09-01' }),
    ], '2026-08-16');
    expect(r.kind).toBe('none');
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó đỏ**

Chạy: `npx vitest run src/lib/__tests__/duePeriod.test.ts`

Kỳ vọng: FAIL — không tìm thấy module `../duePeriod`.

- [ ] **Bước 3: Viết bản cài đặt tối thiểu**

Tạo `src/lib/duePeriod.ts`:

```ts
import type { RepaymentSchedule } from '../types';
import { daysUntil, toIsoDate } from './utils';

export type DuePeriodRow = Pick<
  RepaymentSchedule,
  'Id' | 'ContractId' | 'PeriodNumber' | 'DueDate' | 'TotalAmount' | 'IsPaid'
>;

export type DueKind = 'overdue' | 'upcoming' | 'none';

export interface ContractDueState {
  kind: DueKind;
  period: DuePeriodRow | null;
  dueDateIso: string | null;
  daysLeft: number | null;
}

export const UPCOMING_DAYS = 5;

const KHONG_HIEN: ContractDueState = {
  kind: 'none',
  period: null,
  dueDateIso: null,
  daysLeft: null,
};

export function isPeriodOutstanding(period: Pick<DuePeriodRow, 'IsPaid'>): boolean {
  return !period.IsPaid;
}

export function contractDueState(
  periods: DuePeriodRow[],
  todayIso?: string
): ContractDueState {
  const conNo = periods
    .filter(isPeriodOutstanding)
    .map(period => ({ period, iso: toIsoDate(period.DueDate) }))
    .filter((x): x is { period: DuePeriodRow; iso: string } => x.iso !== null)
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const sommest = conNo[0];
  if (!sommest) return KHONG_HIEN;

  const daysLeft = daysUntil(sommest.iso, todayIso);
  if (daysLeft === null) return KHONG_HIEN;

  const kind: DueKind =
    daysLeft < 0 ? 'overdue' : daysLeft <= UPCOMING_DAYS ? 'upcoming' : 'none';

  return { kind, period: sommest.period, dueDateIso: sommest.iso, daysLeft };
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npx vitest run src/lib/__tests__/duePeriod.test.ts`

Kỳ vọng: PASS, 13 test.

- [ ] **Bước 5: Commit**

```bash
git add src/lib/duePeriod.ts src/lib/__tests__/duePeriod.test.ts
git commit -m "feat(dashboard): hàm thuần quy hợp đồng về trạng thái kỳ trả nợ còn nợ"
```

---

### Task 2: Hàm API nạp lịch trả nợ nhiều hợp đồng

**Files:**
- Modify: `src/lib/utils.ts` (thêm `chunk` vào cuối tệp)
- Modify: `src/lib/api/loanContractApi.ts` (thêm hàm mới sau `fetchRepaymentSchedulesAPI`, khoảng dòng 146)
- Test: `src/lib/__tests__/chunk.test.ts`

**Interfaces:**
- Consumes: `DuePeriodRow` từ Task 1; `supabase` từ `src/lib/supabase.ts`.
- Produces:
  - `function chunk<T>(items: T[], size: number): T[][]` trong `src/lib/utils.ts`
  - `async function fetchSchedulesForContractsAPI(contractIds: number[]): Promise<DuePeriodRow[]>` trong `src/lib/api/loanContractApi.ts`, **ném lỗi** khi truy vấn hỏng

Hàm này phải phân trang. Supabase trả tối đa 1000 dòng mỗi truy vấn, dữ liệu thật đang có 6.705 dòng lịch của hợp đồng chưa tất toán — không phân trang là mất dữ liệu âm thầm, hợp đồng sẽ hiện sai thành "chưa có lịch".

- [ ] **Bước 1: Viết test trước cho `chunk`**

Tạo `src/lib/__tests__/chunk.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { chunk } from '../utils';

describe('chunk', () => {
  it('chia đúng lô và giữ nguyên thứ tự', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('mảng rỗng ra mảng rỗng', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('lô lớn hơn số phần tử thì ra một lô', () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });

  it('kích thước lô không hợp lệ thì gom về một lô, không lặp vô hạn', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
    expect(chunk([1, 2, 3], -5)).toEqual([[1, 2, 3]]);
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó đỏ**

Chạy: `npx vitest run src/lib/__tests__/chunk.test.ts`

Kỳ vọng: FAIL — `chunk` không được export từ `../utils`.

- [ ] **Bước 3: Thêm `chunk` vào `src/lib/utils.ts`**

Thêm vào cuối tệp:

```ts
export function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  if (!Number.isFinite(size) || size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npx vitest run src/lib/__tests__/chunk.test.ts`

Kỳ vọng: PASS, 4 test.

- [ ] **Bước 5: Thêm hàm API**

Trong `src/lib/api/loanContractApi.ts`, thêm import ở đầu tệp:

```ts
import { chunk } from '../utils';
import type { DuePeriodRow } from '../duePeriod';
```

Thêm hàm ngay sau `fetchRepaymentSchedulesAPI`:

```ts
const SCHEDULE_COLUMNS = 'Id, ContractId, PeriodNumber, DueDate, TotalAmount, IsPaid';
const SCHEDULE_PAGE = 1000;
const CONTRACT_LOT = 200;

export async function fetchSchedulesForContractsAPI(
  contractIds: number[]
): Promise<DuePeriodRow[]> {
  if (contractIds.length === 0) return [];

  const all: DuePeriodRow[] = [];

  for (const lot of chunk(contractIds, CONTRACT_LOT)) {
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('RepaymentSchedules')
        .select(SCHEDULE_COLUMNS)
        .in('ContractId', lot)
        .order('Id', { ascending: true })
        .range(from, from + SCHEDULE_PAGE - 1);

      if (error) {
        throw new Error(`Không nạp được lịch trả nợ: ${error.message}`);
      }
      if (!data || data.length === 0) break;

      all.push(...(data as unknown as DuePeriodRow[]));
      if (data.length < SCHEDULE_PAGE) break;
      from += SCHEDULE_PAGE;
    }
  }

  return all;
}
```

Hàm này **ném lỗi** thay vì trả mảng rỗng như `fetchRepaymentSchedulesAPI` bên trên. Trả mảng rỗng khi hỏng sẽ khiến dashboard hiểu nhầm là mọi hợp đồng đều chưa có lịch — báo sai mà không ai biết. Task 4 bắt lỗi này và hiện ra cho người dùng.

- [ ] **Bước 6: Kiểm tra biên dịch**

Chạy: `npm run build`

Kỳ vọng: build sạch, không lỗi kiểu.

- [ ] **Bước 7: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/chunk.test.ts src/lib/api/loanContractApi.ts
git commit -m "feat(api): nạp lịch trả nợ nhiều hợp đồng, chia lô và phân trang"
```

---

### Task 3: Prop `notice` cho `DueSectionPanel`

**Files:**
- Modify: `src/components/dashboard/DueSectionPanel.tsx`

**Interfaces:**
- Produces: prop tuỳ chọn `notice?: React.ReactNode` trên `DueSectionPanelProps<T>`, hiển thị ngay dưới thanh tiêu đề của panel.

Panel hiện không có chỗ nào để nói "N hợp đồng chưa có lịch trả nợ" hay "không nạp được lịch". Không có chỗ đó thì hai tình huống này biến mất không dấu vết.

- [ ] **Bước 1: Thêm prop vào interface**

Trong `src/components/dashboard/DueSectionPanel.tsx`, thêm vào `DueSectionPanelProps<T>` (sau `emptyText`):

```tsx
  notice?: React.ReactNode;
```

- [ ] **Bước 2: Nhận prop trong tham số hàm**

Thêm `notice,` vào danh sách tham số được rã ra của `DueSectionPanel`.

- [ ] **Bước 3: Hiển thị**

Ngay sau khối `</div>` đóng thanh tiêu đề (khối `border-b border-line pb-2`), thêm:

```tsx
      {notice && (
        <div className="text-[11px] text-warn font-semibold">{notice}</div>
      )}
```

- [ ] **Bước 4: Kiểm tra không làm hỏng panel đang có**

Chạy: `npm run build && npx vitest run src/components/__tests__`

Kỳ vọng: build sạch, mọi test component đang có vẫn xanh. Ba panel KUNN / HĐTD / TSBĐ không truyền `notice` nên không đổi gì.

- [ ] **Bước 5: Commit**

```bash
git add src/components/dashboard/DueSectionPanel.tsx
git commit -m "feat(dashboard): chỗ hiện ghi chú trên panel danh sách đến hạn"
```

---

### Task 4: Nối vào `DashboardView`

**Files:**
- Modify: `src/components/views/DashboardView.tsx`

**Interfaces:**
- Consumes: `contractDueState`, `DuePeriodRow` (Task 1); `fetchSchedulesForContractsAPI` (Task 2); prop `notice` (Task 3); `filterByDue`, `countByDue` có sẵn trong `src/lib/dueList.ts`.
- Produces: không có gì cho task sau.

- [ ] **Bước 1: Thêm import và state**

Thêm vào cụm import:

```tsx
import { fetchSchedulesForContractsAPI } from '../../lib/api';
import { contractDueState, type DuePeriodRow } from '../../lib/duePeriod';
```

Bỏ `monthlyDueInfo` khỏi cụm import từ `../../lib/dueList` — sau task này không còn chỗ nào dùng nó ở đây nữa. Giữ nguyên `filterByDue`, `countByDue`, `DueFilter`.

Thêm state cạnh các state đang có (khoảng dòng 29):

```tsx
  const [duePeriods, setDuePeriods] = useState<DuePeriodRow[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [dueMonthFilter, setDueMonthFilter] = useState<DueFilter>('all');
```

- [ ] **Bước 2: Nạp lịch trả nợ trong `fetchDashboardData`**

Trong `fetchDashboardData`, sau `setCardContracts(resCard);`, thêm:

```tsx
      const idsChuaTatToan = resCon
        .filter(c => !c.IsSettled)
        .map(c => c.Id);

      try {
        setDuePeriods(await fetchSchedulesForContractsAPI(idsChuaTatToan));
        setScheduleError(null);
      } catch (err) {
        setDuePeriods([]);
        setScheduleError(err instanceof Error ? err.message : 'Không nạp được lịch trả nợ.');
      }
```

Đặt trong `try` riêng để lịch trả nợ hỏng không kéo sập cả dashboard, nhưng vẫn báo ra chứ không im lặng.

- [ ] **Bước 3: Gom lịch theo hợp đồng**

Thêm cạnh `customerMap` (khoảng dòng 56):

```tsx
  const periodsByContract = useMemo(() => {
    const map = new Map<number, DuePeriodRow[]>();
    duePeriods.forEach(p => {
      const at = map.get(p.ContractId);
      if (at) at.push(p);
      else map.set(p.ContractId, [p]);
    });
    return map;
  }, [duePeriods]);
```

- [ ] **Bước 4: Thay cách dựng `dueInMonthList`**

Trong khối `useMemo` dựng bốn danh sách, thay đoạn `monthList` hiện tại bằng:

```tsx
    const monthList = activeContracts.map(c => {
      const cus = customerMap.get(c.CustomerId);
      const state = contractDueState(periodsByContract.get(c.Id) || []);
      return { contract: c, customer: cus, state };
    }).filter(item => item.state.kind !== 'none')
      .sort((a, b) => (a.state.daysLeft ?? 0) - (b.state.daysLeft ?? 0));

    const thieuLich = activeContracts
      .filter(c => (periodsByContract.get(c.Id) || []).length === 0).length;
```

Thêm `thieuLich` vào giá trị trả về của `useMemo` (cạnh `dueInMonthList: monthList,`):

```tsx
      hopDongThieuLich: thieuLich,
```

Thêm `hopDongThieuLich` vào danh sách rã ra ở đầu `useMemo`, và thêm `periodsByContract` vào mảng phụ thuộc của `useMemo` này.

- [ ] **Bước 5: Đổi định nghĩa cột**

Thay `dueInMonthColumns` bằng:

```tsx
  type DueInMonthItem = (typeof dueInMonthList)[number];
  const dueInMonthColumns: AdaptiveColumn<DueInMonthItem>[] = [
    { key: 'kh', label: 'Khách hàng vay', priority: 3, render: i => <span className="font-bold">{i.customer?.FullName || 'N/A'}</span> },
    { key: 'cif', label: 'Mã CIF', priority: 3, render: i => <span className="font-mono text-accent">{i.customer?.CifKh || 'N/A'}</span> },
    { key: 'so', label: 'Số HĐTD / KUNN', priority: 2, render: i => <span className="font-mono">{i.contract.ContractNumber}</span> },
    { key: 'ky', label: 'Kỳ số', priority: 2, align: 'center',
      render: i => <span className="font-mono font-bold">{i.state.period?.PeriodNumber ?? ''}</span> },
    { key: 'tienKy', label: 'Số tiền kỳ này', priority: 1, align: 'right',
      render: i => <span className="font-mono font-bold text-warn">{fmtMoney(i.state.period?.TotalAmount ?? 0)}</span> },
    { key: 'duNo', label: 'Dư nợ hiện hữu', priority: 1, align: 'right',
      render: i => <span className="font-mono">{fmtMoney(i.contract.CurrentBalance ?? i.contract.LoanAmount ?? i.contract.ContractAmount ?? 0)}</span> },
    { key: 'ngayDue', label: 'Ngày đến hạn due', priority: 1, align: 'center',
      render: i => <span className="font-bold text-accent">{fmtDate(i.state.dueDateIso)}</span> },
    { key: 'han', label: 'Hạn còn lại', priority: 1, align: 'center', render: i => {
      const dl = i.state.daysLeft ?? 0;
      return <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${dueBadgeClass(dl, 2)}`}>{dueBadgeText(dl)}</span>;
    } },
  ];
```

- [ ] **Bước 6: Lọc và đếm**

Cạnh `kunnRows` / `kunnCount`, thêm:

```tsx
  const dueMonthRows = filterByDue(dueInMonthList, dueMonthFilter, i => i.state.daysLeft);
  const dueMonthCount = countByDue(dueInMonthList, i => i.state.daysLeft);
```

- [ ] **Bước 7: Cập nhật panel**

Thay khối `alertConsoleTab === 'due_month'` bằng:

```tsx
        {alertConsoleTab === 'due_month' && (
          <DueSectionPanel
            icon={Calendar}
            tone="warn"
            title="1. Khách hàng chuẩn bị đóng kỳ due của tháng"
            counts={dueMonthCount}
            filter={dueMonthFilter}
            onFilterChange={setDueMonthFilter}
            notice={
              scheduleError
                ? `Không nạp được lịch trả nợ: ${scheduleError}. Danh sách bên dưới chưa đầy đủ.`
                : hopDongThieuLich > 0
                  ? `${hopDongThieuLich} hợp đồng chưa có lịch trả nợ, không xét được.`
                  : undefined
            }
            rows={dueMonthRows}
            rowKey={i => i.contract.Id}
            cardTitle={i => i.customer?.FullName || 'N/A'}
            cardSubtitle={i => i.customer?.CifKh || ''}
            emptyText="Không có kỳ trả nợ nào đang quá hạn hoặc sắp đến hạn."
            cardBg={cardBg}
            columns={dueInMonthColumns}
          />
        )}
```

- [ ] **Bước 8: Chạy đủ test và build**

Chạy: `npm test && npm run build && npm run lint`

Kỳ vọng: mọi test xanh, build sạch, lint 0 error.

Nếu có test nào đỏ vì bám vào cột cũ của panel due, sửa test theo giao diện mới — đừng sửa ngược code cho khớp test cũ.

- [ ] **Bước 9: Commit**

```bash
git add src/components/views/DashboardView.tsx
git commit -m "fix(dashboard): panel due đọc kỳ chưa trả thật thay vì ngày kỷ niệm hợp đồng"
```

---

### Task 5: Kiểm chứng trên trình duyệt

**Files:** không sửa tệp nào.

Test đơn vị chỉ chứng minh hàm đúng. Nó không chứng minh dashboard hiển thị đúng, không chứng minh truy vấn nạp đủ 6.705 dòng, và không chứng minh RLS cho banker thấy đúng phần của mình.

- [ ] **Bước 1: Mở dashboard**

Dùng `preview_start` với cấu hình dev server của dự án, mở tab dashboard.

- [ ] **Bước 2: Kiểm tra không có lỗi**

Đọc console và network của trang. Kỳ vọng: không có lỗi đỏ, các truy vấn `RepaymentSchedules` trả 200.

- [ ] **Bước 3: Đối chiếu ca gốc**

Tìm khách hàng **Đặng Bá Nhân** trên panel số 1.

Kỳ vọng: **không xuất hiện** ở panel due (đã đóng kỳ tháng 8). Vẫn xuất hiện ở panel KUNN với hạn 25/08/2026 và panel HĐTD với trạng thái đã hết hạn từ 24/07/2026.

- [ ] **Bước 4: Kiểm tra số dòng nạp về**

Trong console trang: `performance.getEntriesByType('resource').filter(r => r.name.includes('RepaymentSchedules')).length`

Kỳ vọng: có ít nhất 7 lượt gọi phân trang (6.705 dòng ÷ 1000). Nếu chỉ có 1 lượt, phân trang không chạy — quay lại Task 2.

- [ ] **Bước 5: Thử bộ lọc**

Bấm lần lượt `Tất cả` / `Sắp đến hạn` / `Đã hết hạn`. Kỳ vọng: số dòng đổi theo, tổng hai nhóm bằng nhóm `Tất cả`.

- [ ] **Bước 6: Chụp màn hình panel due** để đính kèm khi báo cáo xong việc.

- [ ] **Bước 7: Cập nhật `PROGRESS.md`** theo quy trình sửa logic tiền của dự án, rồi commit.

```bash
git add PROGRESS.md
git commit -m "docs: ghi nhận panel due đọc theo lịch trả nợ thật"
```

---

## Thứ tự phụ thuộc

```
Task 1 (hàm thuần)  ─┐
                     ├─→ Task 4 (nối vào dashboard) ─→ Task 5 (kiểm chứng)
Task 2 (API)        ─┤
Task 3 (prop notice)─┘
```

Task 1, 2, 3 độc lập nhau, làm song song được. Task 2 cần kiểu `DuePeriodRow` của Task 1 nên nếu làm song song thì thống nhất kiểu trước.
