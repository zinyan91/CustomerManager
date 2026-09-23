# Trung Tâm Báo Cáo Excel — Kế Hoạch Thực Thi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gom năm báo cáo Excel về một màn có thanh chọn bên trái và bộ lọc kỳ hạn ba mốc, xuất một workbook nhiều sheet trong một lần bấm.

**Architecture:** Một registry khai báo năm báo cáo, mỗi mục tự biết cách nạp dữ liệu và dựng sheet của mình; màn hình chỉ render từ registry nên thêm báo cáo thứ sáu về sau không phải đụng màn. Phân loại kỳ hạn tách thành tệp thuần riêng, nhập hằng số từ `duePeriod.ts` thay vì chép, để không sinh ra hai định nghĩa trôi khỏi nhau.

**Tech Stack:** React 19 · TypeScript · Vite · TailwindCSS 4 · Vitest · Supabase · `xlsxWriter.ts` (bộ ghi `.xlsx` tự viết trong dự án).

**Spec:** [docs/superpowers/specs/2026-09-23-trung-tam-bao-cao-excel-design.md](../specs/2026-09-23-trung-tam-bao-cao-excel-design.md)

## Global Constraints

- **Ngày hôm nay:** luôn dùng `todayIso()` từ `src/lib/utils.ts`. Cấm tuyệt đối `toISOString().split('T')[0]` — trước 07:00 giờ VN nó trả về ngày hôm qua.
- **Giá trị `0` là số thật:** không dùng `||` để đặt mặc định cho tiền, LTV, số ngày. Phân biệt rõ `0` và `null`/`undefined`.
- **Nhóm nợ phải tính sống:** dùng `Math.max(DebtGroup đã lưu, getAutoDebtGroupInfo(...).debtGroup)`. Cấm đọc thẳng cột `LoanContract.DebtGroup`.
- **Không sửa `src/lib/duePeriod.ts`** và không đổi hành vi đếm của `DashboardView` / `DueSectionPanel`.
- **Không đụng** `dueList.ts`, nút xuất cũ ở `DashboardView` và `CustomerListView`.
- **Logic tiền nằm ở `src/lib/`**, không nhúng phép tính vào `.tsx`.
- **Giao diện:** bảng màu grayscale/slate; không dùng `backdrop-blur-md` trở lên (đã bị vô hiệu toàn cục trong `index.css`); thanh trái theo quy ước de-nesting — một lớp thẻ ngoài, mục con dùng thanh màu trái, không lồng viền trong viền.
- **Trước khi commit mỗi task:** `npm test && npm run build` đều phải xanh.
- **Ghi nhật ký:** sau task cuối, thêm một mục vào `docs/progress/2026-09.md` theo khuôn `docs/progress/README.md`.
- **Commit message:** tiếng Việt không dấu, dạng conventional commits, kết thúc bằng dòng `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

## Review Focus

Năm tình huống spec ngụ ý nhưng dễ rơi khỏi test. Mỗi dòng đã được gắn test vào task sở hữu mã.

1. **Mốc ngày chưa khai** (`KunnDueDate`, `ContractEndDate`, `AppraisalExpiryDate` là `null` — rất phổ biến trong dữ liệu thật): phải xếp `'none'` và hiện ô ngày trống, không được vỡ hay ra `NaN`. → Task 1 + mỗi builder.
2. **Số tiền bằng `0` so với `null`**: `0` phải hiện `0`, `null` phải hiện trống; không được lẫn nhau. → Task 4.
3. **Một báo cáo nạp lỗi**: các sheet còn lại vẫn phải xuất được, lỗi được ghi `console.error` và báo cho người dùng, không nuốt. → Task 9.
4. **Không tích báo cáo nào**: nút xuất vô hiệu, tuyệt đối không tải về tệp rỗng. → Task 9.
5. **Tên sheet quá 31 ký tự hoặc chứa ký tự Excel cấm**: phải đi qua `sanitizeSheetName`, nếu không Excel từ chối mở tệp. → Task 8.

---

## Cấu trúc tệp

| Tệp | Trách nhiệm |
| :--- | :--- |
| `src/lib/reports/dueBucket.ts` | Phân bốn mốc kỳ hạn. Hàm thuần. |
| `src/lib/reports/sheetStyles.ts` | Bộ style ô dùng chung cho năm builder. |
| `src/lib/reports/types.ts` | `ReportId`, `ReportDef`, `ReportLoadContext`, `ReportRowSet`. |
| `src/lib/reports/builders/dueSheet.ts` | R2 — nợ due. |
| `src/lib/reports/builders/kunnSheet.ts` | R3 — KUNN. |
| `src/lib/reports/builders/creditSheet.ts` | R4 — HĐTD. |
| `src/lib/reports/builders/collateralSheet.ts` | R5 — tài sản bảo đảm. |
| `src/lib/reports/builders/portfolioSheet.ts` | R1 — danh mục đang vay. |
| `src/lib/reports/registry.ts` | Gom năm mục, gộp workbook. |
| `src/hooks/useReportCenterController.ts` | Trạng thái chọn báo cáo, bộ lọc, nạp và xuất. |
| `src/components/reports/ReportRail.tsx` | Thanh chọn báo cáo bên trái. |
| `src/components/views/ReportCenterView.tsx` | Màn ghép rail + tùy chọn + nút xuất. |

---

## Task 1: Phân loại kỳ hạn ba mốc

**Files:**
- Create: `src/lib/reports/dueBucket.ts`
- Test: `src/lib/reports/__tests__/dueBucket.test.ts`

**Interfaces:**
- Consumes: `UPCOMING_DAYS` từ `src/lib/duePeriod.ts`; `daysUntil` từ `src/lib/utils.ts`.
- Produces: `DueBucket`, `DueBucketFilter`, `REPORT_UPCOMING_DAYS`, `DUE_BUCKET_LABELS`, `dueBucketOf(dateIso, todayIso?)`, `daysLeftOf(dateIso, todayIso?)`, `matchesBucket(bucket, filter)`.

- [ ] **Step 1: Viết test thất bại**

```ts
import { describe, it, expect } from 'vitest';
import {
  dueBucketOf, daysLeftOf, matchesBucket,
  REPORT_UPCOMING_DAYS, DUE_BUCKET_LABELS,
} from '../dueBucket';
import { UPCOMING_DAYS } from '../../duePeriod';

const HOM_NAY = '2026-09-23';

describe('dueBucketOf — bon moc ky han', () => {
  it('qua han khi ngay den han da troi qua', () => {
    expect(dueBucketOf('2026-09-22', HOM_NAY)).toBe('overdue');
    expect(dueBucketOf('2026-01-01', HOM_NAY)).toBe('overdue');
  });

  it('toi han tu dung hom nay den het ngay thu 5', () => {
    expect(dueBucketOf('2026-09-23', HOM_NAY)).toBe('due');
    expect(dueBucketOf('2026-09-28', HOM_NAY)).toBe('due');
  });

  it('sap toi han tu ngay thu 6 den ngay thu 30', () => {
    expect(dueBucketOf('2026-09-29', HOM_NAY)).toBe('upcoming');
    expect(dueBucketOf('2026-10-23', HOM_NAY)).toBe('upcoming');
  });

  it('xa hon 30 ngay thi khong xep moc nao', () => {
    expect(dueBucketOf('2026-10-24', HOM_NAY)).toBe('none');
  });

  it('ngay chua khai hoac khong doc duoc deu ra none, khong nem loi', () => {
    expect(dueBucketOf(null, HOM_NAY)).toBe('none');
    expect(dueBucketOf(undefined, HOM_NAY)).toBe('none');
    expect(dueBucketOf('', HOM_NAY)).toBe('none');
    expect(dueBucketOf('khong-phai-ngay', HOM_NAY)).toBe('none');
  });

  it('lay hang so tu duePeriod chu khong chep so 5 ra', () => {
    expect(UPCOMING_DAYS).toBe(5);
    expect(REPORT_UPCOMING_DAYS).toBe(30);
  });
});

describe('daysLeftOf — so ngay mang dau', () => {
  it('am khi qua han, duong khi con han, 0 khi dung hom nay', () => {
    expect(daysLeftOf('2026-09-20', HOM_NAY)).toBe(-3);
    expect(daysLeftOf('2026-09-23', HOM_NAY)).toBe(0);
    expect(daysLeftOf('2026-09-30', HOM_NAY)).toBe(7);
  });

  it('tra null khi khong doc duoc ngay, khong tra NaN', () => {
    expect(daysLeftOf(null, HOM_NAY)).toBeNull();
    expect(daysLeftOf('rac', HOM_NAY)).toBeNull();
  });
});

describe('matchesBucket — bo loc', () => {
  it('bo loc all nhan moi moc', () => {
    expect(matchesBucket('overdue', 'all')).toBe(true);
    expect(matchesBucket('none', 'all')).toBe(true);
  });

  it('bo loc cu the chi nhan dung moc do', () => {
    expect(matchesBucket('overdue', 'overdue')).toBe(true);
    expect(matchesBucket('due', 'overdue')).toBe(false);
  });
});

describe('DUE_BUCKET_LABELS', () => {
  it('co du nhan tieng Viet cho bon moc', () => {
    expect(DUE_BUCKET_LABELS.overdue).toBe('Quá hạn');
    expect(DUE_BUCKET_LABELS.due).toBe('Tới hạn');
    expect(DUE_BUCKET_LABELS.upcoming).toBe('Sắp tới hạn');
    expect(DUE_BUCKET_LABELS.none).toBe('Chưa tới hạn');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/reports/__tests__/dueBucket.test.ts`
Expected: FAIL — không tìm thấy mô-đun `../dueBucket`.

- [ ] **Step 3: Viết cài đặt tối thiểu**

```ts
import { UPCOMING_DAYS } from '../duePeriod';
import { daysUntil } from '../utils';

export type DueBucket = 'overdue' | 'due' | 'upcoming' | 'none';
export type DueBucketFilter = 'all' | DueBucket;

export const REPORT_UPCOMING_DAYS = 30;

export const DUE_BUCKET_LABELS: Record<DueBucket, string> = {
  overdue: 'Quá hạn',
  due: 'Tới hạn',
  upcoming: 'Sắp tới hạn',
  none: 'Chưa tới hạn',
};

export function daysLeftOf(dateIso: string | null | undefined, todayIso?: string): number | null {
  return daysUntil(dateIso, todayIso);
}

export function dueBucketOf(dateIso: string | null | undefined, todayIso?: string): DueBucket {
  const soNgay = daysUntil(dateIso, todayIso);
  if (soNgay === null) return 'none';
  if (soNgay < 0) return 'overdue';
  if (soNgay <= UPCOMING_DAYS) return 'due';
  if (soNgay <= REPORT_UPCOMING_DAYS) return 'upcoming';
  return 'none';
}

export function matchesBucket(bucket: DueBucket, filter: DueBucketFilter): boolean {
  return filter === 'all' || bucket === filter;
}
```

- [ ] **Step 4: Chạy test để xác nhận đạt**

Run: `npx vitest run src/lib/reports/__tests__/dueBucket.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/dueBucket.ts src/lib/reports/__tests__/dueBucket.test.ts
git commit -m "feat(reports): them phan loai ky han ba moc cho bao cao"
```

---

## Task 2: Style ô và kiểu dữ liệu chung

**Files:**
- Create: `src/lib/reports/sheetStyles.ts`
- Create: `src/lib/reports/types.ts`
- Test: `src/lib/reports/__tests__/sheetStyles.test.ts`

**Interfaces:**
- Consumes: `XlsxStyle`, `XlsxCell` từ `src/lib/xlsxWriter.ts`.
- Produces: `ST` (bộ style), `headerRow(labels)`, `textCell`, `moneyCell`, `numCell`; và các kiểu `ReportId`, `ReportLoadContext`, `ReportRowSet`, `ReportDef`.

- [ ] **Step 1: Viết test thất bại**

```ts
import { describe, it, expect } from 'vitest';
import { ST, headerRow, textCell, moneyCell, numCell } from '../sheetStyles';

describe('sheetStyles', () => {
  it('headerRow dung style tieu de va dung so cot', () => {
    const row = headerRow(['STT', 'Ho ten', 'So tien']);
    expect(row).toHaveLength(3);
    expect(row[0].value).toBe('STT');
    expect(row[0].style?.bold).toBe(true);
  });

  it('moneyCell giu so 0 la so that, khong bien thanh rong', () => {
    const o = moneyCell(0);
    expect(o.value).toBe(0);
    expect(o.numeric).toBe(true);
  });

  it('moneyCell voi null tra o rong, khong phai so 0', () => {
    const o = moneyCell(null);
    expect(o.value).toBe('');
    expect(o.numeric).toBeUndefined();
  });

  it('numCell giu so 0 va xu ly null giong moneyCell', () => {
    expect(numCell(0).value).toBe(0);
    expect(numCell(null).value).toBe('');
  });

  it('textCell voi null tra chuoi rong', () => {
    expect(textCell(null).value).toBe('');
    expect(textCell('ABC').value).toBe('ABC');
  });

  it('bo style co du cac bien the can dung', () => {
    expect(ST.headerCenter.bold).toBe(true);
    expect(ST.money.numFmt).toBe('#,##0;(#,##0);"-"');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/reports/__tests__/sheetStyles.test.ts`
Expected: FAIL — không tìm thấy `../sheetStyles`.

- [ ] **Step 3: Viết cài đặt**

`src/lib/reports/sheetStyles.ts`:

```ts
import type { XlsxCell, XlsxStyle } from '../xlsxWriter';

const HEADER_FILL = 'FFE8E8E8';
export const NUM_FMT_ACCOUNTING = '#,##0;(#,##0);"-"';

export const ST = {
  headerCenter: { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true } as XlsxStyle,
  headerLeft: { bold: true, align: 'left', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true } as XlsxStyle,
  center: { align: 'center', vAlign: 'center', border: true } as XlsxStyle,
  left: { align: 'left', vAlign: 'center', border: true } as XlsxStyle,
  money: { align: 'right', vAlign: 'center', numFmt: NUM_FMT_ACCOUNTING, border: true } as XlsxStyle,
  title: { bold: true, align: 'center', vAlign: 'center' } as XlsxStyle,
};

export function headerRow(labels: string[]): XlsxCell[] {
  return labels.map(label => ({ value: label, style: ST.headerCenter }));
}

export function textCell(value: string | null | undefined, style: XlsxStyle = ST.left): XlsxCell {
  return { value: value ?? '', style };
}

export function moneyCell(value: number | null | undefined): XlsxCell {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { value: '', style: ST.money };
  }
  return { value, numeric: true, style: ST.money };
}

export function numCell(value: number | null | undefined, style: XlsxStyle = ST.center): XlsxCell {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { value: '', style };
  }
  return { value, numeric: true, style };
}
```

`src/lib/reports/types.ts`:

```ts
import type { XlsxSheet } from '../xlsxWriter';
import type { DueBucketFilter } from './dueBucket';

export type ReportId = 'portfolio' | 'due' | 'kunn' | 'credit' | 'collateral';

export interface ReportLoadContext {
  todayIso: string;
}

export interface ReportRowSet {
  rows: unknown[];
}

export interface ReportDef {
  id: ReportId;
  name: string;
  shortName: string;
  sheetName: string;
  supportsDueFilter: boolean;
  dueFieldLabel: string;
  load(ctx: ReportLoadContext): Promise<ReportRowSet>;
  buildSheet(data: ReportRowSet, filter: DueBucketFilter, ctx: ReportLoadContext): XlsxSheet;
}
```

> **Chú ý về kiểu — đọc kỹ trước khi viết Task 8.** Các builder ở Task 3–7 nhận **mảng hàng** (`DueSheetRow[]`, `KunnSheetRow[]`…), còn `ReportDef.buildSheet` nhận **`ReportRowSet`** để registry đồng nhất kiểu. Chỗ nối nằm trong registry: mỗi mục tự ép kiểu mảng của mình.
>
> ```ts
> buildSheet: (data, filter, ctx) => buildDueSheet(data.rows as DueSheetRow[], filter, ctx),
> ```
>
> Đừng đổi chữ ký builder cho khớp `ReportRowSet` — builder giữ kiểu cụ thể thì test của nó mới bắt được sai cột.

- [ ] **Step 4: Chạy test để xác nhận đạt**

Run: `npx vitest run src/lib/reports/__tests__/sheetStyles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/sheetStyles.ts src/lib/reports/types.ts src/lib/reports/__tests__/sheetStyles.test.ts
git commit -m "feat(reports): them style o dung chung va kieu du lieu cho registry bao cao"
```

---

## Task 3: Báo cáo nợ due (R2)

**Files:**
- Create: `src/lib/reports/builders/dueSheet.ts`
- Test: `src/lib/reports/__tests__/dueSheet.test.ts`

**Interfaces:**
- Consumes: `dueBucketOf`, `daysLeftOf`, `matchesBucket`, `DUE_BUCKET_LABELS` (Task 1); `ST`, `headerRow`, `textCell`, `moneyCell`, `numCell` (Task 2); `getAutoDebtGroupInfo` từ `src/lib/loanMath.ts`.
- Produces: `DueSheetRow`, `buildDueSheet(rows, filter, ctx)`, `liveDebtGroup(stored, schedules, todayIso)`.

- [ ] **Step 1: Viết test thất bại**

```ts
import { describe, it, expect } from 'vitest';
import { buildDueSheet, liveDebtGroup, type DueSheetRow } from '../builders/dueSheet';

const CTX = { todayIso: '2026-09-23' };

function row(over: Partial<DueSheetRow> = {}): DueSheetRow {
  return {
    cif: '0001', customerName: 'NGUYEN VAN A', kunnNumber: 'KUNN-01',
    periodNumber: 3, dueDate: '2026-09-25',
    principal: 1_000_000, interest: 50_000, total: 1_050_000,
    outstanding: 9_000_000, storedDebtGroup: 1, overdueSchedules: [],
    ...over,
  };
}

describe('buildDueSheet', () => {
  it('dung du bo cot theo dung thu tu', () => {
    const sheet = buildDueSheet([row()], 'all', CTX);
    expect(sheet.rows[0].map(c => c.value)).toEqual([
      'STT', 'Mã CIF', 'Họ tên KH', 'Số KUNN', 'Kỳ số', 'Ngày đến hạn',
      'Số ngày', 'Trạng thái', 'Gốc kỳ', 'Lãi kỳ', 'Tổng kỳ',
      'Dư nợ hiện hữu', 'Nhóm nợ',
    ]);
  });

  it('loc dung theo moc ky han', () => {
    const data = [
      row({ kunnNumber: 'QH', dueDate: '2026-09-20' }),
      row({ kunnNumber: 'TH', dueDate: '2026-09-25' }),
      row({ kunnNumber: 'SAP', dueDate: '2026-10-10' }),
    ];
    const chiQuaHan = buildDueSheet(data, 'overdue', CTX);
    expect(chiQuaHan.rows).toHaveLength(2);
    expect(chiQuaHan.rows[1][3].value).toBe('QH');
  });

  it('so ngay mang dau am khi qua han', () => {
    const sheet = buildDueSheet([row({ dueDate: '2026-09-20' })], 'all', CTX);
    expect(sheet.rows[1][6].value).toBe(-3);
  });

  it('ngay den han chua khai van ra dong, o ngay de trong', () => {
    const sheet = buildDueSheet([row({ dueDate: null })], 'all', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1][5].value).toBe('');
    expect(sheet.rows[1][7].value).toBe('Chưa tới hạn');
  });

  it('danh sach rong van ra sheet co hang tieu de', () => {
    const sheet = buildDueSheet([], 'all', CTX);
    expect(sheet.rows).toHaveLength(1);
    expect(sheet.name).toBeTruthy();
  });
});

describe('liveDebtGroup — nhom no tinh song', () => {
  it('lay nhom cao hon giua nhom luu va nhom tu tinh', () => {
    const quaHan100Ngay = [
      { Id: 1, ContractId: 1, PeriodNumber: 1, DueDate: '2026-06-15', TotalAmount: 1000, IsPaid: false },
    ] as any[];
    expect(liveDebtGroup(1, quaHan100Ngay, '2026-09-23')).toBe(3);
  });

  it('giu nhom luu khi nhom luu cao hon nhom tu tinh', () => {
    expect(liveDebtGroup(4, [], '2026-09-23')).toBe(4);
  });

  it('khong co lich qua han va khong co nhom luu thi la nhom 1', () => {
    expect(liveDebtGroup(undefined, [], '2026-09-23')).toBe(1);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/reports/__tests__/dueSheet.test.ts`
Expected: FAIL — không tìm thấy `../builders/dueSheet`.

- [ ] **Step 3: Viết cài đặt**

```ts
import type { XlsxSheet } from '../../xlsxWriter';
import type { RepaymentSchedule } from '../../../types';
import { getAutoDebtGroupInfo } from '../../loanMath';
import { fmtDate } from '../../utils';
import { dueBucketOf, daysLeftOf, matchesBucket, DUE_BUCKET_LABELS, type DueBucketFilter } from '../dueBucket';
import { ST, headerRow, textCell, moneyCell, numCell } from '../sheetStyles';
import type { ReportLoadContext } from '../types';

export interface DueSheetRow {
  cif: string;
  customerName: string;
  kunnNumber: string;
  periodNumber: number | null;
  dueDate: string | null;
  principal: number | null;
  interest: number | null;
  total: number | null;
  outstanding: number | null;
  storedDebtGroup?: number;
  overdueSchedules: RepaymentSchedule[];
}

const COT = [
  'STT', 'Mã CIF', 'Họ tên KH', 'Số KUNN', 'Kỳ số', 'Ngày đến hạn',
  'Số ngày', 'Trạng thái', 'Gốc kỳ', 'Lãi kỳ', 'Tổng kỳ',
  'Dư nợ hiện hữu', 'Nhóm nợ',
];

export function liveDebtGroup(
  stored: number | undefined,
  overdueSchedules: RepaymentSchedule[],
  todayIso: string
): number {
  const tuTinh = getAutoDebtGroupInfo(overdueSchedules, todayIso).debtGroup;
  return Math.max(stored ?? 1, tuTinh);
}

export function buildDueSheet(
  rows: DueSheetRow[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): XlsxSheet {
  const loc = rows.filter(r => matchesBucket(dueBucketOf(r.dueDate, ctx.todayIso), filter));

  const body = loc.map((r, i) => {
    const bucket = dueBucketOf(r.dueDate, ctx.todayIso);
    return [
      numCell(i + 1),
      textCell(r.cif, ST.center),
      textCell(r.customerName),
      textCell(r.kunnNumber, ST.center),
      numCell(r.periodNumber),
      textCell(r.dueDate ? fmtDate(r.dueDate) : '', ST.center),
      numCell(daysLeftOf(r.dueDate, ctx.todayIso)),
      textCell(DUE_BUCKET_LABELS[bucket], ST.center),
      moneyCell(r.principal),
      moneyCell(r.interest),
      moneyCell(r.total),
      moneyCell(r.outstanding),
      numCell(liveDebtGroup(r.storedDebtGroup, r.overdueSchedules, ctx.todayIso)),
    ];
  });

  return {
    name: 'No due',
    rows: [headerRow(COT), ...body],
    colWidths: [5, 10, 26, 16, 7, 13, 9, 13, 15, 13, 15, 16, 9],
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận đạt**

Run: `npx vitest run src/lib/reports/__tests__/dueSheet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/builders/dueSheet.ts src/lib/reports/__tests__/dueSheet.test.ts
git commit -m "feat(reports): them bao cao no due voi nhom no tinh song"
```

---

## Task 4: Báo cáo KUNN (R3)

**Files:**
- Create: `src/lib/reports/builders/kunnSheet.ts`
- Test: `src/lib/reports/__tests__/kunnSheet.test.ts`

**Interfaces:**
- Consumes: như Task 3, cộng `liveDebtGroup` từ `../builders/dueSheet`.
- Produces: `KunnSheetRow`, `buildKunnSheet(rows, filter, ctx)`.

- [ ] **Step 1: Viết test thất bại**

```ts
import { describe, it, expect } from 'vitest';
import { buildKunnSheet, type KunnSheetRow } from '../builders/kunnSheet';

const CTX = { todayIso: '2026-09-23' };

function row(over: Partial<KunnSheetRow> = {}): KunnSheetRow {
  return {
    cif: '0001', customerName: 'NGUYEN VAN A',
    kunnNumber: 'KUNN-01', creditContractNumber: 'HDTD-01',
    loanMethod: 'Từng lần', disbursementDate: '2026-01-10',
    kunnDueDate: '2026-09-25', loanAmount: 500_000_000,
    outstanding: 300_000_000, interestRate: 9.5,
    storedDebtGroup: 1, overdueSchedules: [],
    ...over,
  };
}

describe('buildKunnSheet', () => {
  it('dung du bo cot theo dung thu tu', () => {
    const sheet = buildKunnSheet([row()], 'all', CTX);
    expect(sheet.rows[0].map(c => c.value)).toEqual([
      'STT', 'Mã CIF', 'Họ tên KH', 'Số KUNN', 'Số HĐTD gốc', 'Phương thức vay',
      'Ngày giải ngân', 'Ngày đáo hạn KUNN', 'Số ngày', 'Trạng thái',
      'Số tiền nhận nợ', 'Dư nợ hiện hữu', 'Lãi suất', 'Nhóm nợ',
    ]);
  });

  it('loc theo KunnDueDate chu khong phai ngay giai ngan', () => {
    const data = [
      row({ kunnNumber: 'A', kunnDueDate: '2026-09-20', disbursementDate: '2026-10-20' }),
      row({ kunnNumber: 'B', kunnDueDate: '2026-12-31', disbursementDate: '2026-09-20' }),
    ];
    const sheet = buildKunnSheet(data, 'overdue', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1][3].value).toBe('A');
  });

  it('du no bang 0 van hien so 0, khong bi bien thanh o rong', () => {
    const sheet = buildKunnSheet([row({ outstanding: 0 })], 'all', CTX);
    expect(sheet.rows[1][11].value).toBe(0);
  });

  it('du no chua khai (null) thi de o trong, khong phai so 0', () => {
    const sheet = buildKunnSheet([row({ outstanding: null })], 'all', CTX);
    expect(sheet.rows[1][11].value).toBe('');
  });

  it('ngay dao han chua khai van ra dong', () => {
    const sheet = buildKunnSheet([row({ kunnDueDate: null })], 'all', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1][7].value).toBe('');
  });

  it('danh sach rong van ra sheet co hang tieu de', () => {
    expect(buildKunnSheet([], 'all', CTX).rows).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/reports/__tests__/kunnSheet.test.ts`
Expected: FAIL — không tìm thấy `../builders/kunnSheet`.

- [ ] **Step 3: Viết cài đặt**

```ts
import type { XlsxSheet } from '../../xlsxWriter';
import type { RepaymentSchedule } from '../../../types';
import { fmtDate } from '../../utils';
import { dueBucketOf, daysLeftOf, matchesBucket, DUE_BUCKET_LABELS, type DueBucketFilter } from '../dueBucket';
import { ST, headerRow, textCell, moneyCell, numCell } from '../sheetStyles';
import { liveDebtGroup } from './dueSheet';
import type { ReportLoadContext } from '../types';

export interface KunnSheetRow {
  cif: string;
  customerName: string;
  kunnNumber: string;
  creditContractNumber: string | null;
  loanMethod: string | null;
  disbursementDate: string | null;
  kunnDueDate: string | null;
  loanAmount: number | null;
  outstanding: number | null;
  interestRate: number | null;
  storedDebtGroup?: number;
  overdueSchedules: RepaymentSchedule[];
}

const COT = [
  'STT', 'Mã CIF', 'Họ tên KH', 'Số KUNN', 'Số HĐTD gốc', 'Phương thức vay',
  'Ngày giải ngân', 'Ngày đáo hạn KUNN', 'Số ngày', 'Trạng thái',
  'Số tiền nhận nợ', 'Dư nợ hiện hữu', 'Lãi suất', 'Nhóm nợ',
];

export function buildKunnSheet(
  rows: KunnSheetRow[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): XlsxSheet {
  const loc = rows.filter(r => matchesBucket(dueBucketOf(r.kunnDueDate, ctx.todayIso), filter));

  const body = loc.map((r, i) => {
    const bucket = dueBucketOf(r.kunnDueDate, ctx.todayIso);
    return [
      numCell(i + 1),
      textCell(r.cif, ST.center),
      textCell(r.customerName),
      textCell(r.kunnNumber, ST.center),
      textCell(r.creditContractNumber, ST.center),
      textCell(r.loanMethod),
      textCell(r.disbursementDate ? fmtDate(r.disbursementDate) : '', ST.center),
      textCell(r.kunnDueDate ? fmtDate(r.kunnDueDate) : '', ST.center),
      numCell(daysLeftOf(r.kunnDueDate, ctx.todayIso)),
      textCell(DUE_BUCKET_LABELS[bucket], ST.center),
      moneyCell(r.loanAmount),
      moneyCell(r.outstanding),
      numCell(r.interestRate),
      numCell(liveDebtGroup(r.storedDebtGroup, r.overdueSchedules, ctx.todayIso)),
    ];
  });

  return {
    name: 'KUNN',
    rows: [headerRow(COT), ...body],
    colWidths: [5, 10, 26, 16, 16, 14, 13, 15, 9, 13, 16, 16, 9, 9],
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận đạt**

Run: `npx vitest run src/lib/reports/__tests__/kunnSheet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/builders/kunnSheet.ts src/lib/reports/__tests__/kunnSheet.test.ts
git commit -m "feat(reports): them bao cao KUNN loc theo ngay dao han khe uoc"
```

---

## Task 5: Báo cáo HĐTD (R4)

**Files:**
- Create: `src/lib/reports/builders/creditSheet.ts`
- Test: `src/lib/reports/__tests__/creditSheet.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 2.
- Produces: `CreditSheetRow`, `buildCreditSheet(rows, filter, ctx)`.

Ba cột hạn mức đã được tính sẵn ở tầng nạp dữ liệu (Task 9) bằng `computeCreditLimit`; builder chỉ trình bày, không tự tính lại.

- [ ] **Step 1: Viết test thất bại**

```ts
import { describe, it, expect } from 'vitest';
import { buildCreditSheet, type CreditSheetRow } from '../builders/creditSheet';

const CTX = { todayIso: '2026-09-23' };

function row(over: Partial<CreditSheetRow> = {}): CreditSheetRow {
  return {
    cif: '0001', customerName: 'NGUYEN VAN A',
    hdtdNumber: 'HDTD-01', approvalCode: 'PD-2026-01',
    loanMethod: 'Hạn mức', startDate: '2026-01-01', endDate: '2026-10-01',
    granted: 1_000_000_000, used: 400_000_000, available: 600_000_000,
    ...over,
  };
}

describe('buildCreditSheet', () => {
  it('dung du bo cot theo dung thu tu', () => {
    const sheet = buildCreditSheet([row()], 'all', CTX);
    expect(sheet.rows[0].map(c => c.value)).toEqual([
      'STT', 'Mã CIF', 'Họ tên KH', 'Số HĐTD', 'Mã phê duyệt', 'Phương thức vay',
      'Ngày hiệu lực', 'Ngày hết hiệu lực', 'Số ngày', 'Trạng thái',
      'Mức cấp', 'Đã sử dụng', 'Còn khả dụng',
    ]);
  });

  it('loc theo ngay het hieu luc hop dong', () => {
    const data = [
      row({ hdtdNumber: 'SAP', endDate: '2026-10-15' }),
      row({ hdtdNumber: 'XA', endDate: '2027-01-01' }),
    ];
    const sheet = buildCreditSheet(data, 'upcoming', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1][3].value).toBe('SAP');
  });

  it('con kha dung bang 0 van hien 0', () => {
    const sheet = buildCreditSheet([row({ available: 0 })], 'all', CTX);
    expect(sheet.rows[1][12].value).toBe(0);
  });

  it('ngay het hieu luc chua khai van ra dong', () => {
    const sheet = buildCreditSheet([row({ endDate: null })], 'all', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1][7].value).toBe('');
  });

  it('danh sach rong van ra sheet co hang tieu de', () => {
    expect(buildCreditSheet([], 'all', CTX).rows).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/reports/__tests__/creditSheet.test.ts`
Expected: FAIL — không tìm thấy `../builders/creditSheet`.

- [ ] **Step 3: Viết cài đặt**

```ts
import type { XlsxSheet } from '../../xlsxWriter';
import { fmtDate } from '../../utils';
import { dueBucketOf, daysLeftOf, matchesBucket, DUE_BUCKET_LABELS, type DueBucketFilter } from '../dueBucket';
import { ST, headerRow, textCell, moneyCell, numCell } from '../sheetStyles';
import type { ReportLoadContext } from '../types';

export interface CreditSheetRow {
  cif: string;
  customerName: string;
  hdtdNumber: string;
  approvalCode: string | null;
  loanMethod: string | null;
  startDate: string | null;
  endDate: string | null;
  granted: number | null;
  used: number | null;
  available: number | null;
}

const COT = [
  'STT', 'Mã CIF', 'Họ tên KH', 'Số HĐTD', 'Mã phê duyệt', 'Phương thức vay',
  'Ngày hiệu lực', 'Ngày hết hiệu lực', 'Số ngày', 'Trạng thái',
  'Mức cấp', 'Đã sử dụng', 'Còn khả dụng',
];

export function buildCreditSheet(
  rows: CreditSheetRow[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): XlsxSheet {
  const loc = rows.filter(r => matchesBucket(dueBucketOf(r.endDate, ctx.todayIso), filter));

  const body = loc.map((r, i) => {
    const bucket = dueBucketOf(r.endDate, ctx.todayIso);
    return [
      numCell(i + 1),
      textCell(r.cif, ST.center),
      textCell(r.customerName),
      textCell(r.hdtdNumber, ST.center),
      textCell(r.approvalCode, ST.center),
      textCell(r.loanMethod),
      textCell(r.startDate ? fmtDate(r.startDate) : '', ST.center),
      textCell(r.endDate ? fmtDate(r.endDate) : '', ST.center),
      numCell(daysLeftOf(r.endDate, ctx.todayIso)),
      textCell(DUE_BUCKET_LABELS[bucket], ST.center),
      moneyCell(r.granted),
      moneyCell(r.used),
      moneyCell(r.available),
    ];
  });

  return {
    name: 'HDTD',
    rows: [headerRow(COT), ...body],
    colWidths: [5, 10, 26, 16, 14, 14, 13, 15, 9, 13, 16, 16, 16],
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận đạt**

Run: `npx vitest run src/lib/reports/__tests__/creditSheet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/builders/creditSheet.ts src/lib/reports/__tests__/creditSheet.test.ts
git commit -m "feat(reports): them bao cao HDTD loc theo ngay het hieu luc"
```

---

## Task 6: Báo cáo tài sản bảo đảm (R5)

**Files:**
- Create: `src/lib/reports/builders/collateralSheet.ts`
- Test: `src/lib/reports/__tests__/collateralSheet.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 2.
- Produces: `CollateralSheetRow`, `buildCollateralSheet(rows, filter, ctx)`.

- [ ] **Step 1: Viết test thất bại**

```ts
import { describe, it, expect } from 'vitest';
import { buildCollateralSheet, type CollateralSheetRow } from '../builders/collateralSheet';

const CTX = { todayIso: '2026-09-23' };

function row(over: Partial<CollateralSheetRow> = {}): CollateralSheetRow {
  return {
    cif: '0001', customerName: 'NGUYEN VAN A',
    assetCode: 'TS-01', assetType: 'BĐS Loại 1', address: '12 Lê Lợi',
    appraisalDate: '2025-10-01', tenorMonths: 12, expiryDate: '2026-10-01',
    appraisedValue: 2_000_000_000, ltvPercent: 80, maxLoan: 1_600_000_000,
    ...over,
  };
}

describe('buildCollateralSheet', () => {
  it('dung du bo cot theo dung thu tu', () => {
    const sheet = buildCollateralSheet([row()], 'all', CTX);
    expect(sheet.rows[0].map(c => c.value)).toEqual([
      'STT', 'Mã CIF', 'Họ tên KH', 'Mã tài sản', 'Loại tài sản', 'Địa chỉ',
      'Ngày định giá', 'Hiệu lực (tháng)', 'Ngày hết hiệu lực', 'Số ngày',
      'Trạng thái', 'Giá trị định giá', 'LTV (%)', 'Hạn mức tối đa',
    ]);
  });

  it('loc theo ngay het hieu luc chung thu dinh gia', () => {
    const data = [
      row({ assetCode: 'HET', expiryDate: '2026-09-01' }),
      row({ assetCode: 'CON', expiryDate: '2027-05-01' }),
    ];
    const sheet = buildCollateralSheet(data, 'overdue', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1][3].value).toBe('HET');
  });

  it('tai san han che nhan co LTV 0 phai hien so 0, khong phai o rong', () => {
    const sheet = buildCollateralSheet([row({ ltvPercent: 0, maxLoan: 0 })], 'all', CTX);
    expect(sheet.rows[1][12].value).toBe(0);
    expect(sheet.rows[1][13].value).toBe(0);
  });

  it('chung thu chua khai ngay het hieu luc van ra dong', () => {
    const sheet = buildCollateralSheet([row({ expiryDate: null })], 'all', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1][8].value).toBe('');
  });

  it('danh sach rong van ra sheet co hang tieu de', () => {
    expect(buildCollateralSheet([], 'all', CTX).rows).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/reports/__tests__/collateralSheet.test.ts`
Expected: FAIL — không tìm thấy `../builders/collateralSheet`.

- [ ] **Step 3: Viết cài đặt**

```ts
import type { XlsxSheet } from '../../xlsxWriter';
import { fmtDate } from '../../utils';
import { dueBucketOf, daysLeftOf, matchesBucket, DUE_BUCKET_LABELS, type DueBucketFilter } from '../dueBucket';
import { ST, headerRow, textCell, moneyCell, numCell } from '../sheetStyles';
import type { ReportLoadContext } from '../types';

export interface CollateralSheetRow {
  cif: string;
  customerName: string;
  assetCode: string | null;
  assetType: string | null;
  address: string | null;
  appraisalDate: string | null;
  tenorMonths: number | null;
  expiryDate: string | null;
  appraisedValue: number | null;
  ltvPercent: number | null;
  maxLoan: number | null;
}

const COT = [
  'STT', 'Mã CIF', 'Họ tên KH', 'Mã tài sản', 'Loại tài sản', 'Địa chỉ',
  'Ngày định giá', 'Hiệu lực (tháng)', 'Ngày hết hiệu lực', 'Số ngày',
  'Trạng thái', 'Giá trị định giá', 'LTV (%)', 'Hạn mức tối đa',
];

export function buildCollateralSheet(
  rows: CollateralSheetRow[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): XlsxSheet {
  const loc = rows.filter(r => matchesBucket(dueBucketOf(r.expiryDate, ctx.todayIso), filter));

  const body = loc.map((r, i) => {
    const bucket = dueBucketOf(r.expiryDate, ctx.todayIso);
    return [
      numCell(i + 1),
      textCell(r.cif, ST.center),
      textCell(r.customerName),
      textCell(r.assetCode, ST.center),
      textCell(r.assetType),
      textCell(r.address),
      textCell(r.appraisalDate ? fmtDate(r.appraisalDate) : '', ST.center),
      numCell(r.tenorMonths),
      textCell(r.expiryDate ? fmtDate(r.expiryDate) : '', ST.center),
      numCell(daysLeftOf(r.expiryDate, ctx.todayIso)),
      textCell(DUE_BUCKET_LABELS[bucket], ST.center),
      moneyCell(r.appraisedValue),
      numCell(r.ltvPercent),
      moneyCell(r.maxLoan),
    ];
  });

  return {
    name: 'Tai san bao dam',
    rows: [headerRow(COT), ...body],
    colWidths: [5, 10, 26, 14, 18, 30, 13, 13, 15, 9, 13, 18, 9, 18],
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận đạt**

Run: `npx vitest run src/lib/reports/__tests__/collateralSheet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/builders/collateralSheet.ts src/lib/reports/__tests__/collateralSheet.test.ts
git commit -m "feat(reports): them bao cao tai san bao dam loc theo hieu luc chung thu"
```

---

## Task 7: Báo cáo danh mục đang vay (R1)

**Files:**
- Create: `src/lib/reports/builders/portfolioSheet.ts`
- Test: `src/lib/reports/__tests__/portfolioSheet.test.ts`

**Interfaces:**
- Consumes: `buildActivePortfolioData`, `CustomerPortfolioExportParams` từ `src/lib/customerPortfolioExport.ts`.
- Produces: `buildPortfolioSheet(params, ctx)` — không nhận bộ lọc kỳ hạn vì R1 là ảnh chụp toàn danh mục.

- [ ] **Step 1: Viết test thất bại**

```ts
import { describe, it, expect } from 'vitest';
import { buildPortfolioSheet } from '../builders/portfolioSheet';

const CTX = { todayIso: '2026-09-23' };

const RONG = { customers: [], contracts: [], creditContracts: [], collaterals: [] } as any;

describe('buildPortfolioSheet', () => {
  it('tra ve mot sheet co ten va hang tieu de', () => {
    const sheet = buildPortfolioSheet(RONG, CTX);
    expect(sheet.name).toBeTruthy();
    expect(sheet.rows.length).toBeGreaterThan(0);
  });

  it('danh muc rong khong nem loi', () => {
    expect(() => buildPortfolioSheet(RONG, CTX)).not.toThrow();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/reports/__tests__/portfolioSheet.test.ts`
Expected: FAIL — không tìm thấy `../builders/portfolioSheet`.

- [ ] **Step 3: Viết cài đặt**

Đọc `src/lib/customerPortfolioExport.ts` để lấy đúng bộ cột của sheet tổng hợp hiện hành, rồi dựng lại cùng bộ cột đó từ `buildActivePortfolioData`. Không sửa `customerPortfolioExport.ts`.

```ts
import type { XlsxSheet } from '../../xlsxWriter';
import {
  buildActivePortfolioData,
  type CustomerPortfolioExportParams,
} from '../../customerPortfolioExport';
import { ST, headerRow, textCell, moneyCell, numCell } from '../sheetStyles';
import type { ReportLoadContext } from '../types';

const COT = [
  'STT', 'Mã CIF KH', 'Họ tên KH', 'Phương thức vay', 'Số KUNN (GNN)',
  'Số HĐTD gốc', 'Tổng mức cấp (VNĐ)', 'Số tiền nhận nợ (VNĐ)',
  'Dư nợ hiện hữu (VNĐ)', 'Lãi suất (%/năm)',
];

export function buildPortfolioSheet(
  params: CustomerPortfolioExportParams,
  ctx: ReportLoadContext
): XlsxSheet {
  const data = buildActivePortfolioData({ ...params, todayStr: ctx.todayIso });

  const body = data.kunnRows.map((r, i) => [
    numCell(i + 1),
    textCell(r.cifKh, ST.center),
    textCell(r.customerName),
    textCell(r.loanMethod),
    textCell(r.kunnNumber, ST.center),
    textCell(r.creditContractNumber, ST.center),
    moneyCell(r.grantedAmount),
    moneyCell(r.loanAmount),
    moneyCell(r.outstanding),
    numCell(r.interestRate),
  ]);

  return {
    name: 'Danh muc dang vay',
    rows: [headerRow(COT), ...body],
    colWidths: [5, 12, 26, 14, 16, 16, 18, 18, 18, 11],
  };
}
```

> **Lưu ý cho người thực thi:** tên thuộc tính trong `PortfolioKunnRowData` phải đọc từ `src/lib/customerPortfolioExport.ts:27` và dùng đúng tên có thật. Nếu tên khác với đoạn trên, sửa theo mã nguồn — mã nguồn là chuẩn.

- [ ] **Step 4: Chạy test để xác nhận đạt**

Run: `npx vitest run src/lib/reports/__tests__/portfolioSheet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/builders/portfolioSheet.ts src/lib/reports/__tests__/portfolioSheet.test.ts
git commit -m "feat(reports): them bao cao danh muc dang vay dung lai du lieu san co"
```

---

## Task 8: Registry và gộp workbook

**Files:**
- Create: `src/lib/reports/registry.ts`
- Test: `src/lib/reports/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: năm builder ở Task 3–7; `buildMultiSheetXlsx`, `sanitizeSheetName` từ `src/lib/xlsxWriter.ts`.
- Produces: `REPORTS: ReportDef[]`, `reportById(id)`, `buildReportWorkbook(sheets)`.

- [ ] **Step 1: Viết test thất bại**

```ts
import { describe, it, expect } from 'vitest';
import { REPORTS, reportById, buildReportWorkbook } from '../registry';

describe('REPORTS — toan ven registry', () => {
  it('co dung nam bao cao', () => {
    expect(REPORTS).toHaveLength(5);
  });

  it('id khong trung nhau', () => {
    const ids = REPORTS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ten sheet khong trung va khong qua 31 ky tu', () => {
    const names = REPORTS.map(r => r.sheetName);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) {
      expect(n.length, `ten sheet "${n}" dai qua 31 ky tu`).toBeLessThanOrEqual(31);
      expect(/[[\]:*?/\\]/.test(n), `ten sheet "${n}" chua ky tu Excel cam`).toBe(false);
    }
  });

  it('moi muc co du nhan va ham', () => {
    for (const r of REPORTS) {
      expect(r.name.trim().length, `${r.id} thieu ten`).toBeGreaterThan(0);
      expect(r.shortName.trim().length, `${r.id} thieu ten ngan`).toBeGreaterThan(0);
      expect(typeof r.load, `${r.id} thieu ham load`).toBe('function');
      expect(typeof r.buildSheet, `${r.id} thieu ham buildSheet`).toBe('function');
    }
  });

  it('chi bao cao danh muc la khong co bo loc ky han', () => {
    const khongLoc = REPORTS.filter(r => !r.supportsDueFilter).map(r => r.id);
    expect(khongLoc).toEqual(['portfolio']);
  });

  it('reportById tra dung muc, tra undefined khi id la', () => {
    expect(reportById('kunn')?.id).toBe('kunn');
    expect(reportById('khong-co' as never)).toBeUndefined();
  });
});

describe('buildReportWorkbook', () => {
  it('gop dung so sheet va giu thu tu', () => {
    const bytes = buildReportWorkbook([
      { name: 'A', rows: [[{ value: 'x' }]] },
      { name: 'B', rows: [[{ value: 'y' }]] },
    ]);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('ten sheet qua dai bi cat con 31 ky tu', () => {
    const dai = 'B'.repeat(50);
    const bytes = buildReportWorkbook([{ name: dai, rows: [[{ value: 'x' }]] }]);
    expect(bytes.length).toBeGreaterThan(22);
  });

  it('khong co sheet nao thi nem loi ro rang, khong tra tep rong', () => {
    expect(() => buildReportWorkbook([])).toThrow(/khong co sheet/i);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/reports/__tests__/registry.test.ts`
Expected: FAIL — không tìm thấy `../registry`.

- [ ] **Step 3: Viết cài đặt**

```ts
import { buildMultiSheetXlsx, sanitizeSheetName, type XlsxSheet } from '../xlsxWriter';
import type { ReportDef, ReportId } from './types';

// Mỗi mục khai báo load() và buildSheet() của riêng nó.
// Phần load() được nối vào tầng dữ liệu ở Task 9.
export const REPORTS: ReportDef[] = [
  /* portfolio, due, kunn, credit, collateral — xem Task 9 để biết phần load() */
];

export function reportById(id: ReportId): ReportDef | undefined {
  return REPORTS.find(r => r.id === id);
}

export function buildReportWorkbook(sheets: XlsxSheet[]): Uint8Array {
  if (sheets.length === 0) {
    throw new Error('Khong co sheet nao de xuat');
  }
  const antoan = sheets.map(s => ({ ...s, name: sanitizeSheetName(s.name) }));
  return buildMultiSheetXlsx(antoan);
}
```

> **Lưu ý cho người thực thi:** phần `load()` của từng mục cần hàm nạp dữ liệu, mà các hàm đó được viết ở Task 9. Ở task này hãy khai báo đủ năm mục với `name`, `shortName`, `sheetName`, `supportsDueFilter`, `dueFieldLabel`, `buildSheet` trỏ tới builder tương ứng, và `load` tạm trả `{ rows: [] }`. Task 9 sẽ nối `load` vào hàm nạp thật.

Năm mục khai báo như sau:

```ts
{ id: 'portfolio',  name: 'Danh mục đang vay',   shortName: 'Danh mục',  sheetName: 'Danh muc dang vay',  supportsDueFilter: false, dueFieldLabel: '—' },
{ id: 'due',        name: 'Báo cáo nợ due',       shortName: 'Nợ due',    sheetName: 'No due',             supportsDueFilter: true,  dueFieldLabel: 'Ngày đến hạn kỳ trả' },
{ id: 'kunn',       name: 'Danh sách KUNN',       shortName: 'KUNN',      sheetName: 'KUNN',               supportsDueFilter: true,  dueFieldLabel: 'Ngày đáo hạn KUNN' },
{ id: 'credit',     name: 'Danh sách HĐTD',       shortName: 'HĐTD',      sheetName: 'HDTD',               supportsDueFilter: true,  dueFieldLabel: 'Ngày hết hiệu lực HĐ' },
{ id: 'collateral', name: 'Tài sản bảo đảm',      shortName: 'Tài sản',   sheetName: 'Tai san bao dam',    supportsDueFilter: true,  dueFieldLabel: 'Ngày hết hiệu lực chứng thư' },
```

- [ ] **Step 4: Chạy test để xác nhận đạt**

Run: `npx vitest run src/lib/reports/__tests__/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/registry.ts src/lib/reports/__tests__/registry.test.ts
git commit -m "feat(reports): them registry nam bao cao va ham gop workbook"
```

---

## Task 9: Tầng nạp dữ liệu và controller

**Files:**
- Create: `src/lib/reports/loaders.ts`
- Modify: `src/lib/reports/registry.ts` — nối `load()` thật vào năm mục
- Create: `src/hooks/useReportCenterController.ts`
- Test: `src/lib/reports/__tests__/loaders.test.ts`

**Interfaces:**
- Consumes: `fetchCustomersAPI`, `fetchContractsAPI`, `fetchAllCreditContractsAPI`, `fetchCollateralsAPI`, `fetchOutstandingSchedulesAPI`; `computeCreditLimit` từ `src/lib/creditLimit.ts`; `dueCutoffIso` từ `src/lib/duePeriod.ts`.
- Produces: `loadDueRows(ctx)`, `loadKunnRows(ctx)`, `loadCreditRows(ctx)`, `loadCollateralRows(ctx)`, `loadPortfolioParams(ctx)`; hook `useReportCenterController()` trả `{ selected, toggle, filter, setFilter, exporting, error, exportSelected }`.

- [ ] **Step 1: Viết test thất bại cho phần gộp lỗi**

```ts
import { describe, it, expect, vi } from 'vitest';
import { gatherSheets } from '../loaders';

const CTX = { todayIso: '2026-09-23' };

describe('gatherSheets — mot bao cao loi khong lam hong ca tep', () => {
  it('bao cao loi bi bo qua, cac sheet con lai van ra', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const defs = [
      { id: 'a', sheetName: 'A', load: async () => ({ rows: [] }), buildSheet: () => ({ name: 'A', rows: [[{ value: 'x' }]] }) },
      { id: 'b', sheetName: 'B', load: async () => { throw new Error('mat ket noi'); }, buildSheet: () => ({ name: 'B', rows: [] }) },
    ] as any[];

    const { sheets, failed } = await gatherSheets(defs, 'all', CTX);

    expect(sheets).toHaveLength(1);
    expect(sheets[0].name).toBe('A');
    expect(failed).toEqual(['b']);
    expect(spy).toHaveBeenCalled();
  });

  it('moi bao cao deu loi thi khong tra sheet nao', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const defs = [
      { id: 'a', sheetName: 'A', load: async () => { throw new Error('loi'); }, buildSheet: () => ({ name: 'A', rows: [] }) },
    ] as any[];

    const { sheets, failed } = await gatherSheets(defs, 'all', CTX);

    expect(sheets).toHaveLength(0);
    expect(failed).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/reports/__tests__/loaders.test.ts`
Expected: FAIL — không tìm thấy `../loaders`.

- [ ] **Step 3: Viết `gatherSheets` và các hàm nạp**

```ts
export async function gatherSheets(
  defs: ReportDef[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): Promise<{ sheets: XlsxSheet[]; failed: ReportId[] }> {
  const ketQua = await Promise.all(
    defs.map(async def => {
      try {
        const data = await def.load(ctx);
        return { sheet: def.buildSheet(data, def.supportsDueFilter ? filter : 'all', ctx), id: def.id };
      } catch (err) {
        console.error(`Nap bao cao ${def.id} that bai:`, err);
        return { sheet: null, id: def.id };
      }
    })
  );

  return {
    sheets: ketQua.filter(r => r.sheet !== null).map(r => r.sheet as XlsxSheet),
    failed: ketQua.filter(r => r.sheet === null).map(r => r.id),
  };
}
```

Các hàm nạp dữ liệu, mỗi hàm gọi API sẵn có rồi ánh xạ sang kiểu hàng của builder tương ứng. `loadKunnRows` viết đầy đủ dưới đây làm mẫu; bốn hàm còn lại theo đúng khuôn này.

```ts
import { fetchCustomersAPI } from '../api/customerApi';
import { fetchContractsAPI, fetchOutstandingSchedulesAPI } from '../api/loanContractApi';
import { dueCutoffIso } from '../duePeriod';
import type { KunnSheetRow } from './builders/kunnSheet';
import type { ReportLoadContext, ReportRowSet } from './types';

export async function loadKunnRows(ctx: ReportLoadContext): Promise<ReportRowSet> {
  const [customers, contracts] = await Promise.all([
    fetchCustomersAPI(),
    fetchContractsAPI(),
  ]);

  const dangVay = contracts.filter(c => !c.IsSettled);
  const theoKh = new Map(customers.map(k => [k.Id, k]));

  // Lịch trả nợ quá hạn, gom theo khoản vay, dùng để tính nhóm nợ sống.
  const lichQuaHan = await fetchOutstandingSchedulesAPI(
    dangVay.map(c => c.Id),
    dueCutoffIso(ctx.todayIso)
  );
  const theoKhoan = new Map<number, typeof lichQuaHan>();
  for (const ky of lichQuaHan) {
    const list = theoKhoan.get(ky.ContractId) ?? [];
    list.push(ky);
    theoKhoan.set(ky.ContractId, list);
  }

  const rows: KunnSheetRow[] = dangVay.map(c => {
    const kh = theoKh.get(c.CustomerId);
    return {
      cif: kh?.CifKh ?? '',
      customerName: kh?.FullName ?? '',
      kunnNumber: c.ContractNumber,
      creditContractNumber: c.CreditLimitCode ?? null,
      loanMethod: c.LoanMethod ?? null,
      disbursementDate: c.DisbursementDate ?? null,
      kunnDueDate: c.KunnDueDate ?? null,
      loanAmount: c.LoanAmount ?? null,
      outstanding: c.CurrentBalance ?? null,
      interestRate: c.InterestRate ?? null,
      storedDebtGroup: c.DebtGroup,
      overdueSchedules: (theoKhoan.get(c.Id) ?? []) as never,
    };
  });

  return { rows };
}
```

Ba điểm bắt buộc cho bốn hàm còn lại:

- `loadDueRows` dựng một hàng cho **mỗi kỳ trả nợ chưa thanh toán** (không phải mỗi khoản vay), và cũng kèm `overdueSchedules` như trên.
- `loadCreditRows` lấy ba cột hạn mức từ `computeCreditLimit(cacKunnCuaHdtdDo)` trong `src/lib/creditLimit.ts`, không tự cộng trừ — tự tính lại sẽ sinh định nghĩa dư nợ thứ hai lệch với Dashboard.
- `loadCollateralRows` tính `maxLoan = appraisedValue * ltvPercent / 100`. Khi `ltvPercent` là `0` (tài sản hạn chế nhận) thì kết quả phải là `0`; viết `const ltv = c.LtvPercent ?? null` rồi kiểm `null` tường minh, **không** `c.LtvPercent || 80`.

- [ ] **Step 4: Nối `load()` thật vào registry và chạy test**

Run: `npx vitest run src/lib/reports/__tests__/`
Expected: PASS toàn bộ thư mục.

- [ ] **Step 5: Viết controller**

```ts
export function useReportCenterController() {
  const [selected, setSelected] = useState<ReportId[]>(['portfolio']);
  const [filter, setFilter] = useState<DueBucketFilter>('all');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((id: ReportId) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, []);

  const exportSelected = useCallback(async () => {
    if (selected.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const ctx = { todayIso: todayIso() };
      const defs = REPORTS.filter(r => selected.includes(r.id));
      const { sheets, failed } = await gatherSheets(defs, filter, ctx);

      if (sheets.length === 0) {
        setError('Không xuất được báo cáo nào. Vui lòng kiểm tra kết nối và thử lại.');
        return;
      }
      if (failed.length > 0) {
        setError(`Đã xuất ${sheets.length} báo cáo. Không nạp được: ${failed.join(', ')}.`);
      }

      downloadBytes(buildReportWorkbook(sheets), `BaoCao_${ctx.todayIso}.xlsx`, MIME_XLSX);
    } finally {
      setExporting(false);
    }
  }, [selected, filter]);

  return { selected, toggle, filter, setFilter, exporting, error, exportSelected };
}
```

- [ ] **Step 6: Chạy test và build**

Run: `npm test && npm run build`
Expected: cả hai xanh.

- [ ] **Step 7: Commit**

```bash
git add src/lib/reports/loaders.ts src/lib/reports/registry.ts src/hooks/useReportCenterController.ts src/lib/reports/__tests__/loaders.test.ts
git commit -m "feat(reports): them tang nap du lieu va controller, mot bao cao loi khong lam hong ca tep"
```

---

## Task 10: Màn hình, thanh trái và điều hướng

**Files:**
- Create: `src/components/reports/ReportRail.tsx`
- Create: `src/components/views/ReportCenterView.tsx`
- Modify: `src/App.tsx` — thêm route `/hub/reports`
- Modify: `src/lib/routes.ts` — thêm `'/hub/reports': 'reports'` vào `HUB_SUBROUTES`, thêm `reports: '/reports'` vào `ROUTE_OF`
- Modify: `src/lib/navigation.ts` — thêm `'reports'` vào `ScreenId`
- Modify: `src/lib/hubTasks.ts` — thêm thẻ và **sửa nhãn đếm của nhóm `credit`**
- Test: `src/components/views/__tests__/ReportCenterView.test.tsx`

**Interfaces:**
- Consumes: `useReportCenterController` (Task 9); `REPORTS` (Task 8); `DUE_BUCKET_LABELS` (Task 1).
- Produces: màn `/hub/reports`.

- [ ] **Step 1: Viết test thất bại**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ReportCenterView } from '../ReportCenterView';

afterEach(cleanup);

describe('ReportCenterView', () => {
  it('hien du nam bao cao tren thanh trai', () => {
    render(<ReportCenterView />);
    expect(screen.getByText('Danh mục')).toBeTruthy();
    expect(screen.getByText('Nợ due')).toBeTruthy();
    expect(screen.getByText('KUNN')).toBeTruthy();
    expect(screen.getByText('HĐTD')).toBeTruthy();
    expect(screen.getByText('Tài sản')).toBeTruthy();
  });

  it('bo chon het thi nut xuat bi vo hieu, khong tai tep rong', () => {
    render(<ReportCenterView />);
    fireEvent.click(screen.getByText('Danh mục'));
    const nut = screen.getByRole('button', { name: /Xuất Excel/i });
    expect(nut.hasAttribute('disabled')).toBe(true);
  });

  it('bo loc ky han co du bon lua chon va muc tat ca', () => {
    render(<ReportCenterView />);
    expect(screen.getByText('Tất cả')).toBeTruthy();
    expect(screen.getByText('Quá hạn')).toBeTruthy();
    expect(screen.getByText('Tới hạn')).toBeTruthy();
    expect(screen.getByText('Sắp tới hạn')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/components/views/__tests__/ReportCenterView.test.tsx`
Expected: FAIL — không tìm thấy `../ReportCenterView`.

- [ ] **Step 3: Viết `ReportRail` và `ReportCenterView`**

`ReportRail` render danh sách từ `REPORTS`, mỗi mục là một nút có thanh màu bên trái, trạng thái chọn đổi nền nhạt. Một lớp thẻ bao ngoài duy nhất, **không** bọc thêm viền cho từng mục. Trên màn hẹp (`< lg`) rail xếp thành hàng ngang cuộn được.

`ReportCenterView` ghép rail bên trái, cột phải gồm hàng nút lọc kỳ hạn (`Tất cả` + ba nhãn từ `DUE_BUCKET_LABELS`, bỏ `none`), vùng thông báo lỗi, và nút `Xuất Excel` có `disabled={selected.length === 0 || exporting}`.

- [ ] **Step 4: Chạy test để xác nhận đạt**

Run: `npx vitest run src/components/views/__tests__/ReportCenterView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Nối điều hướng**

Thêm `reports` vào `ScreenId` trong `navigation.ts`; thêm `reports: '/reports'` vào `ROUTE_OF`; thêm `'/hub/reports': 'reports'` vào `HUB_SUBROUTES`; thêm route lazy trong `App.tsx` dưới `DedicatedWorkspaceLayout`; thêm thẻ vào `HUB_TASKS` nhóm `credit` với `path: '/hub/reports'`; **sửa `badge` của nhóm `credit` từ `'5 tác vụ'` thành `'6 tác vụ'`**.

- [ ] **Step 6: Chạy toàn bộ test và build**

Run: `npm test && npm run build`
Expected: cả hai xanh. Bộ test `hubTasks` hiện có sẽ tự bắt nếu quên sửa nhãn đếm hoặc quên ánh xạ.

- [ ] **Step 7: Ghi nhật ký và commit**

Thêm một mục vào `docs/progress/2026-09.md` theo khuôn `docs/progress/README.md`, rồi:

```bash
git add -A
git commit -m "feat(reports): them man trung tam bao cao voi thanh chon trai va bo loc ky han"
```

---

## Ghi chú cho người thực thi

- **Mã nguồn là chuẩn.** Nếu tên thuộc tính hay chữ ký hàm trong kế hoạch lệch với `src/`, tin mã nguồn và sửa theo. Tài liệu dự án cập nhật chậm hơn mã.
- **Không nới phạm vi.** Không sửa `duePeriod.ts`, `dueList.ts`, `customerPortfolioExport.ts`, và không gỡ nút xuất cũ ở Dashboard hay Danh sách khách hàng.
- **Không nuốt lỗi.** Mọi `catch` phải ghi `console.error` theo pattern của `src/lib/api/`.
