# Bộ biểu mẫu theo Hồ sơ — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng tầng lõi thuần (registry, adapter, reducer) cho hệ "hồ sơ nhiều giấy tờ", kèm test đầy đủ, mà chưa đụng UI — làm nền an toàn cho việc rắp UI và migrate ở các plan sau.

**Architecture:** Mỗi giấy tờ là một `DocTemplate` tự chứa, sinh HTML bằng cách map `(DossierCommon, specific)` → object `DocumentDraft` cũ rồi gọi lại `buildDocumentHtml` đang chạy đúng (adapter `toLegacyParams`). Danh mục (`Dossier`) là cấu hình liệt kê các `DocTemplate`. State của controller được tách thành một reducer thuần. Toàn bộ tầng này là hàm thuần → test bằng vitest, không cần React.

**Tech Stack:** TypeScript, React (types only ở plan này), vitest.

**Spec:** [docs/superpowers/specs/2026-09-07-bo-bieu-mau-ho-so-design.md](../specs/2026-09-07-bo-bieu-mau-ho-so-design.md)

## Global Constraints

- Không sửa [src/lib/documentHtml.ts](../../../src/lib/documentHtml.ts) — chỉ tái dùng qua adapter. Output HTML phải **y hệt** bản hiện tại cho cùng dữ liệu.
- Không thêm dependency mới.
- Test chạy bằng `npm run test` (vitest). Đặt test cạnh nguồn trong `__tests__/` theo quy ước repo.
- TypeScript phải sạch: `npx tsc --noEmit -p tsconfig.json` không lỗi sau mỗi task.
- Đặt tên tiếng Anh cho code (khớp phần còn lại của codebase); chuỗi hiển thị tiếng Việt.
- Phạm vi plan này: chỉ 3 giấy tờ có sẵn builder — `sale_contract`, `payment_request_sale`, `cam_ket` — và một danh mục "Giải ngân". "Bảng kê mua hàng" và các mẫu khác thuộc plan sau.

---

## File Structure

- `src/components/documents/registry/types.ts` — Party, LineItem, DossierCommon, Attachment, DocTemplate, Dossier + factory `emptyParty`, `emptyCommon`.
- `src/components/documents/registry/legacyDraft.ts` — `baseDraft()` trả về `DocumentDraft` đầy đủ với giá trị trung tính.
- `src/components/documents/registry/templates/saleContract.ts` — `SaleSpecific`, `saleContractTemplate: DocTemplate<SaleSpecific>`.
- `src/components/documents/registry/templates/paymentRequestSale.ts` — `PaymentSpecific`, `paymentRequestSaleTemplate`.
- `src/components/documents/registry/templates/camKet.ts` — `CamKetSpecific`, `camKetTemplate`.
- `src/components/documents/registry/templates/index.ts` — `TEMPLATE_BY_ID: Record<string, DocTemplate<any>>`.
- `src/components/documents/registry/dossiers.ts` — `DOSSIERS: Dossier[]`.
- `src/hooks/documentDossierReducer.ts` — state + reducer thuần.
- Tests: `.../registry/__tests__/*.test.ts`, `src/hooks/__tests__/documentDossierReducer.test.ts`.

Các file cũ (`documentHtml.ts`, `forms/*`, `useDocumentTemplateController.ts`) **giữ nguyên** ở plan này.

---

## Task 1: Registry types & factories

**Files:**
- Create: `src/components/documents/registry/types.ts`
- Test: `src/components/documents/registry/__tests__/types.test.ts`

**Interfaces:**
- Consumes: `PaymentStageItem`, `SaleItem` từ [src/components/documents/DocumentForm.tsx](../../../src/components/documents/DocumentForm.tsx).
- Produces: `Party`, `LineItem`, `DossierCommon`, `Attachment`, `DocTemplate<S>`, `Dossier`, `emptyParty()`, `emptyCommon()`.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/documents/registry/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import { emptyParty, emptyCommon } from '../types';

describe('registry factories', () => {
  it('emptyParty has all string fields blank', () => {
    expect(emptyParty()).toEqual({
      name: '', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '',
    });
  });

  it('emptyCommon has two parties, empty collections and blank scalars', () => {
    const c = emptyCommon();
    expect(c.partyA).toEqual(emptyParty());
    expect(c.partyB).toEqual(emptyParty());
    expect(c.stages).toEqual([]);
    expect(c.items).toEqual([]);
    expect(c.bank).toEqual({ owner: '', accNo: '', name: '', branch: '' });
    expect(c.totalAmount).toBe('');
    expect(c.contractDate).toBe('');
  });

  it('emptyCommon returns a fresh object each call (no shared refs)', () => {
    const a = emptyCommon();
    const b = emptyCommon();
    a.items.push({ id: 'x', name: 'n', unit: 'u', quantity: 1, price: 1 });
    expect(b.items).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/documents/registry/__tests__/types.test.ts`
Expected: FAIL — Cannot find module `../types`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/documents/registry/types.ts
import type { ComponentType } from 'react';
import type { PaymentStageItem, SaleItem } from '../DocumentForm';

export interface Party {
  name: string; cccd: string; cccdDate: string;
  cccdPlace: string; address: string; birthYear: string;
}

export interface LineItem {
  id: string; name: string; unit: string;
  quantity: number; price: number; note?: string;
}

export interface DossierCommon {
  partyA: Party;
  partyB: Party;
  contractDate: string;
  startDate: string;
  endDate: string;
  bank: { owner: string; accNo: string; name: string; branch: string };
  totalAmount: string;
  stages: PaymentStageItem[];
  items: LineItem[];
}

export interface Attachment {
  title: string;
  filename: string;
  html: string;
}

export interface DocTemplate<S> {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  specificDefaults: S;
  buildHtml: (common: DossierCommon, specific: S) => string;
  attachments?: (common: DossierCommon, specific: S) => Attachment[];
}

export interface Dossier {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  commonDefaults?: Partial<DossierCommon>;
  documents: Array<{ templateId: string; optional?: boolean }>;
}

export function emptyParty(): Party {
  return { name: '', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
}

export function emptyCommon(): DossierCommon {
  return {
    partyA: emptyParty(),
    partyB: emptyParty(),
    contractDate: '',
    startDate: '',
    endDate: '',
    bank: { owner: '', accNo: '', name: '', branch: '' },
    totalAmount: '',
    stages: [],
    items: [],
  };
}
```

Note: `LineItem` cố ý tương thích cấu trúc với `SaleItem` (`{id,name,unit,quantity,price}`); `SaleItem` import ở trên để tài liệu hoá quan hệ và bảo đảm kiểu khớp khi map `common.items` → `saleItems`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/documents/registry/__tests__/types.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/documents/registry/types.ts src/components/documents/registry/__tests__/types.test.ts
git commit -m "feat(docs-registry): kiểu dữ liệu & factory cho hệ hồ sơ biểu mẫu"
```

---

## Task 2: `baseDraft()` — nền DocumentDraft đầy đủ

**Files:**
- Create: `src/components/documents/registry/legacyDraft.ts`
- Test: `src/components/documents/registry/__tests__/legacyDraft.test.ts`

**Interfaces:**
- Consumes: `DocumentDraft`, `DEFAULT_DEPOSIT_CONTRACT` (xem dưới).
- Produces: `baseDraft(): DocumentDraft` — mọi field bắt buộc có giá trị trung tính; adapter sẽ ghi đè field liên quan.

Lý do: `buildDocumentHtml` nhận `DocumentDraft` với **rất nhiều** field bắt buộc (mb*, lh*, const*, sale*, pay*, deposit…). Mỗi adapter chỉ điền phần liên quan, nên cần một nền đầy đủ để spread lên.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/documents/registry/__tests__/legacyDraft.test.ts
import { describe, it, expect } from 'vitest';
import { baseDraft } from '../legacyDraft';

describe('baseDraft', () => {
  it('provides every required DocumentDraft scalar as empty string', () => {
    const d = baseDraft();
    expect(d.saleBuyerName).toBe('');
    expect(d.mbPartyAName).toBe('');
    expect(d.constPartyAName).toBe('');
    expect(d.payBankOwner).toBe('');
  });

  it('provides empty arrays and neutral enums', () => {
    const d = baseDraft();
    expect(d.saleItems).toEqual([]);
    expect(d.constItems).toEqual([]);
    expect(d.payStages).toEqual([]);
    expect(d.salePayMethod).toBe('cash');
    expect(d.payMethodType).toBe('transfer');
    expect(d.recipientTitle).toBe('Ông');
  });

  it('returns a fresh object (arrays not shared)', () => {
    const a = baseDraft();
    a.saleItems.push({ id: '1', name: 'x', unit: 'u', quantity: 1, price: 1 });
    expect(baseDraft().saleItems).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/documents/registry/__tests__/legacyDraft.test.ts`
Expected: FAIL — Cannot find module `../legacyDraft`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/documents/registry/legacyDraft.ts
import type { DocumentDraft } from '../../../lib/documentHtml';
import { DEFAULT_DEPOSIT_CONTRACT } from '../depositContract';

export function baseDraft(): DocumentDraft {
  return {
    mbContractDate: '', mbPartyAName: '', mbPartyACccd: '', mbPartyACccdDate: '',
    mbPartyAAddress: '', mbPartyBName: '', mbPartyBCccd: '', mbPartyBCccdDate: '',
    mbPartyBAddress: '', mbLocation: '', mbStartDate: '', mbEndDate: '',
    mbMonthlyPrice: '', mbDepositAmount: '',
    lhFloors: '', lhLandArea: '', lhHouseArea: '', lhHandoverDate: '', lhPaymentDay: '',
    constContractDate: '', constPartyAName: '', constPartyACccd: '', constPartyAAddress: '',
    constPartyBName: '', constPartyBCccd: '', constSiteAddress: '', constStartDate: '',
    constEndDate: '', constTotalPrice: '', constDepositStage1: '', constStage2Amount: '',
    constWarrantyMonths: '', constItems: [],
    saleContractDate: '', saleBuyerName: '', saleBuyerAddress: '', saleSellerName: '',
    saleSellerCccd: '', saleSellerCccdDate: '', saleSellerCccdPlace: '',
    salePayMethod: 'cash', saleBankOwner: '', saleBankAccNo: '', saleBankName: '',
    saleBankBranch: '', salePaymentStage1: '', saleItems: [],
    saleStartDate: '', saleEndDate: '',
    deposit: DEFAULT_DEPOSIT_CONTRACT,
    payMethodType: 'transfer', payCashName: '', payCashCccd: '', payCashCccdDate: '',
    payCashCccdPlace: '', payBankOwner: '', payBankAccNo: '', payBankName: '',
    payBankBranch: '', payStages: [],
    recipientTitle: 'Ông',
    constDurationMonths: '', lhTermLabel: '',
  };
}
```

Lưu ý: nếu `tsc` báo thiếu/thừa field so với `DocumentDraft`, sửa cho khớp interface tại [src/lib/documentHtml.ts:66](../../../src/lib/documentHtml.ts) — đây là nguồn chân lý.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/documents/registry/__tests__/legacyDraft.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output (chứng minh `baseDraft` khớp `DocumentDraft`).

- [ ] **Step 6: Commit**

```bash
git add src/components/documents/registry/legacyDraft.ts src/components/documents/registry/__tests__/legacyDraft.test.ts
git commit -m "feat(docs-registry): baseDraft đầy đủ field cho adapter legacy"
```

---

## Task 3: `sale_contract` template + golden test

**Files:**
- Create: `src/components/documents/registry/templates/saleContract.ts`
- Test: `src/components/documents/registry/__tests__/saleContract.test.ts`

**Interfaces:**
- Consumes: `DocTemplate`, `DossierCommon` (Task 1); `baseDraft` (Task 2); `buildDocumentHtml` từ [src/lib/documentHtml.ts](../../../src/lib/documentHtml.ts); `ShoppingCart` từ `lucide-react`.
- Produces: `SaleSpecific`, `saleContractTemplate: DocTemplate<SaleSpecific>`, `saleToLegacyParams(common, specific): DocumentDraft`.

Map: bên A = bên mua, bên B = bên bán. `common.items` → `saleItems`. `common.stages[0].amount` không dùng cho HĐ mua bán; `salePaymentStage1` là field riêng.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/documents/registry/__tests__/saleContract.test.ts
import { describe, it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { saleContractTemplate, saleToLegacyParams } from '../templates/saleContract';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-09';
  c.partyA = { name: 'NGÔ NHỊ ĐẠT', cccd: '', cccdDate: '', cccdPlace: '',
    address: 'Bình Đường, An Bình, Tp. Dĩ An, Bình Dương', birthYear: '' };
  c.partyB = { name: 'TRẦN THỊ PHƯƠNG', cccd: '0791 7802 5859', cccdDate: '29/11/2021',
    cccdPlace: 'Cục Cảnh sát QLHC về TTXH', address: '', birthYear: '' };
  c.bank = { owner: 'TRẦN THỊ PHƯƠNG', accNo: '0123456789',
    name: 'Vietcombank', branch: 'Chi nhánh TP.HCM' };
  c.startDate = '2026-04-09';
  c.endDate = '2027-04-08';
  c.items = [
    { id: '1', name: 'Lúa Jasmine 85', unit: 'Tấn', quantity: 25, price: 8500000 },
    { id: '2', name: 'Gạo ST25', unit: 'Tấn', quantity: 15, price: 22000000 },
  ];
  return c;
}

const sampleSpecific = { payMethod: 'cash' as const, paymentStage1: '100.000.000' };

it('saleToLegacyParams maps common+specific into the right legacy fields', () => {
  const d = saleToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.saleContractDate).toBe('2026-04-09');
  expect(d.saleBuyerName).toBe('NGÔ NHỊ ĐẠT');
  expect(d.saleBuyerAddress).toBe('Bình Đường, An Bình, Tp. Dĩ An, Bình Dương');
  expect(d.saleSellerName).toBe('TRẦN THỊ PHƯƠNG');
  expect(d.saleSellerCccd).toBe('0791 7802 5859');
  expect(d.salePayMethod).toBe('cash');
  expect(d.saleBankOwner).toBe('TRẦN THỊ PHƯƠNG');
  expect(d.saleItems).toHaveLength(2);
  expect(d.salePaymentStage1).toBe('100.000.000');
});

it('buildHtml output equals the legacy builder for the same data (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('sale_contract', {
    ...baseDraft(),
    saleContractDate: '2026-04-09',
    saleBuyerName: 'NGÔ NHỊ ĐẠT',
    saleBuyerAddress: 'Bình Đường, An Bình, Tp. Dĩ An, Bình Dương',
    saleSellerName: 'TRẦN THỊ PHƯƠNG',
    saleSellerCccd: '0791 7802 5859',
    saleSellerCccdDate: '29/11/2021',
    saleSellerCccdPlace: 'Cục Cảnh sát QLHC về TTXH',
    salePayMethod: 'cash',
    saleBankOwner: 'TRẦN THỊ PHƯƠNG',
    saleBankAccNo: '0123456789',
    saleBankName: 'Vietcombank',
    saleBankBranch: 'Chi nhánh TP.HCM',
    saleStartDate: '2026-04-09',
    saleEndDate: '2027-04-08',
    salePaymentStage1: '100.000.000',
    saleItems: common.items,
  });
  const actual = saleContractTemplate.buildHtml(common, sampleSpecific);
  expect(actual).toBe(expected);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/documents/registry/__tests__/saleContract.test.ts`
Expected: FAIL — Cannot find module `../templates/saleContract`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/documents/registry/templates/saleContract.ts
import { ShoppingCart } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface SaleSpecific {
  payMethod: 'cash' | 'transfer';
  paymentStage1: string;
}

export function saleToLegacyParams(common: DossierCommon, specific: SaleSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    saleContractDate: common.contractDate,
    saleBuyerName: common.partyA.name,
    saleBuyerAddress: common.partyA.address,
    saleSellerName: common.partyB.name,
    saleSellerCccd: common.partyB.cccd,
    saleSellerCccdDate: common.partyB.cccdDate,
    saleSellerCccdPlace: common.partyB.cccdPlace,
    salePayMethod: specific.payMethod,
    saleBankOwner: common.bank.owner,
    saleBankAccNo: common.bank.accNo,
    saleBankName: common.bank.name,
    saleBankBranch: common.bank.branch,
    saleStartDate: common.startDate,
    saleEndDate: common.endDate,
    salePaymentStage1: specific.paymentStage1,
    saleItems: common.items,
  };
}

export const saleContractTemplate: DocTemplate<SaleSpecific> = {
  id: 'sale_contract',
  label: 'HĐ Mua Bán Hàng Hóa',
  icon: ShoppingCart,
  specificDefaults: { payMethod: 'cash', paymentStage1: '' },
  buildHtml: (common, specific) =>
    buildDocumentHtml('sale_contract', saleToLegacyParams(common, specific)),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/documents/registry/__tests__/saleContract.test.ts`
Expected: PASS (2 tests). Nếu golden lệch: so sánh field còn thiếu trong map và bổ sung vào `saleToLegacyParams` (đừng sửa builder cũ).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/documents/registry/templates/saleContract.ts src/components/documents/registry/__tests__/saleContract.test.ts
git commit -m "feat(docs-registry): template HĐ mua bán qua adapter + golden test"
```

---

## Task 4: `payment_request_sale` template + golden test

**Files:**
- Create: `src/components/documents/registry/templates/paymentRequestSale.ts`
- Test: `src/components/documents/registry/__tests__/paymentRequestSale.test.ts`

**Interfaces:**
- Consumes: như Task 3; `CreditCard` từ `lucide-react`; `PaymentStageItem` từ `../../DocumentForm`.
- Produces: `PaymentSpecific`, `paymentRequestSaleTemplate`, `paymentToLegacyParams`.

Builder `payment_request_sale` dùng (đã đọc [documentHtml.ts:730-840](../../../src/lib/documentHtml.ts)): `saleBuyerName`, `saleSellerName`, `saleContractDate`, `saleItems` (để tính tổng), `payStages`, `payMethodType`, `recipientTitle`, và các `payCash*`/`payBank*`. Map: người mua = partyA, người bán = partyB, `stages` chung → `payStages`, `items` chung → `saleItems`.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/documents/registry/__tests__/paymentRequestSale.test.ts
import { describe, it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { paymentRequestSaleTemplate, paymentToLegacyParams } from '../templates/paymentRequestSale';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-09';
  c.partyA = { name: 'NGÔ NHỊ ĐẠT', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.partyB = { name: 'TRẦN THỊ PHƯƠNG', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.bank = { owner: 'ĐỖ THỊ LAN ANH', accNo: '0123456789', name: 'Vietcombank', branch: 'Chi nhánh TP.HCM' };
  c.items = [{ id: '1', name: 'Lúa', unit: 'Tấn', quantity: 25, price: 8500000 }];
  c.stages = [
    { id: '1', stageName: 'Đợt 1', amount: '53.700.000', status: 'paid', note: '' },
    { id: '2', stageName: 'Đợt 2', amount: '950.000.000', status: 'current', note: '' },
  ];
  return c;
}

const sampleSpecific = {
  payMethodType: 'transfer' as const,
  recipientTitle: 'Ông' as const,
  cashName: '', cashCccd: '', cashCccdDate: '', cashCccdPlace: '',
};

it('paymentToLegacyParams maps shared stages/items and parties', () => {
  const d = paymentToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.saleBuyerName).toBe('NGÔ NHỊ ĐẠT');
  expect(d.saleSellerName).toBe('TRẦN THỊ PHƯƠNG');
  expect(d.payStages).toHaveLength(2);
  expect(d.saleItems).toHaveLength(1);
  expect(d.payBankOwner).toBe('ĐỖ THỊ LAN ANH');
  expect(d.payMethodType).toBe('transfer');
  expect(d.recipientTitle).toBe('Ông');
});

it('buildHtml equals legacy builder for the same data (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('payment_request_sale', {
    ...baseDraft(),
    saleContractDate: '2026-04-09',
    saleBuyerName: 'NGÔ NHỊ ĐẠT',
    saleSellerName: 'TRẦN THỊ PHƯƠNG',
    saleItems: common.items,
    payStages: common.stages,
    payMethodType: 'transfer',
    recipientTitle: 'Ông',
    payBankOwner: 'ĐỖ THỊ LAN ANH',
    payBankAccNo: '0123456789',
    payBankName: 'Vietcombank',
    payBankBranch: 'Chi nhánh TP.HCM',
  });
  const actual = paymentRequestSaleTemplate.buildHtml(common, sampleSpecific);
  expect(actual).toBe(expected);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/documents/registry/__tests__/paymentRequestSale.test.ts`
Expected: FAIL — Cannot find module `../templates/paymentRequestSale`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/documents/registry/templates/paymentRequestSale.ts
import { CreditCard } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface PaymentSpecific {
  payMethodType: 'cash' | 'transfer';
  recipientTitle: 'Ông' | 'Bà';
  cashName: string;
  cashCccd: string;
  cashCccdDate: string;
  cashCccdPlace: string;
}

export function paymentToLegacyParams(common: DossierCommon, specific: PaymentSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    saleContractDate: common.contractDate,
    saleBuyerName: common.partyA.name,
    saleSellerName: common.partyB.name,
    saleItems: common.items,
    payStages: common.stages,
    payMethodType: specific.payMethodType,
    recipientTitle: specific.recipientTitle,
    payCashName: specific.cashName,
    payCashCccd: specific.cashCccd,
    payCashCccdDate: specific.cashCccdDate,
    payCashCccdPlace: specific.cashCccdPlace,
    payBankOwner: common.bank.owner,
    payBankAccNo: common.bank.accNo,
    payBankName: common.bank.name,
    payBankBranch: common.bank.branch,
  };
}

export const paymentRequestSaleTemplate: DocTemplate<PaymentSpecific> = {
  id: 'payment_request_sale',
  label: 'Đề Nghị TT (Mua Bán)',
  icon: CreditCard,
  specificDefaults: {
    payMethodType: 'transfer', recipientTitle: 'Ông',
    cashName: '', cashCccd: '', cashCccdDate: '', cashCccdPlace: '',
  },
  buildHtml: (common, specific) =>
    buildDocumentHtml('payment_request_sale', paymentToLegacyParams(common, specific)),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/documents/registry/__tests__/paymentRequestSale.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/documents/registry/templates/paymentRequestSale.ts src/components/documents/registry/__tests__/paymentRequestSale.test.ts
git commit -m "feat(docs-registry): template Đề nghị TT (mua bán) qua adapter + golden test"
```

---

## Task 5: `cam_ket` template (dùng buildGiayCamKetHtml)

**Files:**
- Create: `src/components/documents/registry/templates/camKet.ts`
- Test: `src/components/documents/registry/__tests__/camKet.test.ts`

**Interfaces:**
- Consumes: `buildGiayCamKetHtml` từ [src/lib/documentHtml.ts](../../../src/lib/documentHtml.ts) (chữ ký: `{ hoTen, cccd, ngayCap, noiCap, ngayLap }`, xem cách dùng ở [DocumentTemplateView.tsx:113](../../../src/components/views/DocumentTemplateView.tsx)); `FileSignature` từ `lucide-react`.
- Produces: `CamKetSpecific` (rỗng — mọi field lấy từ common), `camKetTemplate`.

Giấy Cam kết lấy thông tin bên bán (partyB) từ common. Không có field riêng → `SpecificForm` không cần (Task UI plan sau).

- [ ] **Step 1: Write the failing test**

```ts
// src/components/documents/registry/__tests__/camKet.test.ts
import { describe, it, expect } from 'vitest';
import { buildGiayCamKetHtml } from '../../../../lib/documentHtml';
import { emptyCommon } from '../types';
import { camKetTemplate } from '../templates/camKet';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-09';
  c.partyB = { name: 'TRẦN THỊ PHƯƠNG', cccd: '0791 7802 5859', cccdDate: '29/11/2021',
    cccdPlace: 'Cục Cảnh sát QLHC về TTXH', address: '', birthYear: '' };
  return c;
}

it('buildHtml equals buildGiayCamKetHtml for the same seller data (golden)', () => {
  const common = sampleCommon();
  const expected = buildGiayCamKetHtml({
    hoTen: 'TRẦN THỊ PHƯƠNG',
    cccd: '0791 7802 5859',
    ngayCap: '29/11/2021',
    noiCap: 'Cục Cảnh sát QLHC về TTXH',
    ngayLap: '2026-04-09',
  });
  expect(camKetTemplate.buildHtml(common, {})).toBe(expected);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/documents/registry/__tests__/camKet.test.ts`
Expected: FAIL — Cannot find module `../templates/camKet`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/documents/registry/templates/camKet.ts
import { FileSignature } from 'lucide-react';
import { buildGiayCamKetHtml } from '../../../../lib/documentHtml';
import type { DocTemplate } from '../types';

export type CamKetSpecific = Record<string, never>;

export const camKetTemplate: DocTemplate<CamKetSpecific> = {
  id: 'cam_ket',
  label: 'Giấy Cam Kết',
  icon: FileSignature,
  specificDefaults: {},
  buildHtml: (common) =>
    buildGiayCamKetHtml({
      hoTen: common.partyB.name,
      cccd: common.partyB.cccd,
      ngayCap: common.partyB.cccdDate,
      noiCap: common.partyB.cccdPlace,
      ngayLap: common.contractDate,
    }),
};
```

Nếu `buildGiayCamKetHtml` chưa được `export` từ documentHtml.ts, thêm `export` cho hàm đó (đây là export bổ sung, không đổi logic).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/documents/registry/__tests__/camKet.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/documents/registry/templates/camKet.ts src/components/documents/registry/__tests__/camKet.test.ts src/lib/documentHtml.ts
git commit -m "feat(docs-registry): template Giấy cam kết qua buildGiayCamKetHtml"
```

---

## Task 6: Template index + dossier registry + integrity test

**Files:**
- Create: `src/components/documents/registry/templates/index.ts`
- Create: `src/components/documents/registry/dossiers.ts`
- Test: `src/components/documents/registry/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: 3 template ở Task 3-5.
- Produces: `TEMPLATE_BY_ID: Record<string, DocTemplate<any>>`; `DOSSIERS: Dossier[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/documents/registry/__tests__/registry.test.ts
import { describe, it, expect } from 'vitest';
import { TEMPLATE_BY_ID } from '../templates';
import { DOSSIERS } from '../dossiers';

it('every dossier document references an existing template', () => {
  for (const dossier of DOSSIERS) {
    for (const doc of dossier.documents) {
      expect(TEMPLATE_BY_ID[doc.templateId], `missing template ${doc.templateId}`).toBeDefined();
    }
  }
});

it('template ids are unique and match their map key', () => {
  for (const [key, tpl] of Object.entries(TEMPLATE_BY_ID)) {
    expect(tpl.id).toBe(key);
  }
});

it('dossier ids are unique', () => {
  const ids = DOSSIERS.map(d => d.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it('Giải ngân dossier lists the three pilot documents in order', () => {
  const giaiNgan = DOSSIERS.find(d => d.id === 'giai_ngan');
  expect(giaiNgan?.documents.map(d => d.templateId)).toEqual([
    'sale_contract', 'payment_request_sale', 'cam_ket',
  ]);
  expect(giaiNgan?.documents.find(d => d.templateId === 'cam_ket')?.optional).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/documents/registry/__tests__/registry.test.ts`
Expected: FAIL — Cannot find module `../templates` or `../dossiers`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/documents/registry/templates/index.ts
import type { DocTemplate } from '../types';
import { saleContractTemplate } from './saleContract';
import { paymentRequestSaleTemplate } from './paymentRequestSale';
import { camKetTemplate } from './camKet';

export const TEMPLATE_BY_ID: Record<string, DocTemplate<any>> = {
  [saleContractTemplate.id]: saleContractTemplate,
  [paymentRequestSaleTemplate.id]: paymentRequestSaleTemplate,
  [camKetTemplate.id]: camKetTemplate,
};
```

```ts
// src/components/documents/registry/dossiers.ts
import { FolderOpen } from 'lucide-react';
import type { Dossier } from './types';

export const DOSSIERS: Dossier[] = [
  {
    id: 'giai_ngan',
    label: 'Hồ sơ giải ngân',
    icon: FolderOpen,
    documents: [
      { templateId: 'sale_contract' },
      { templateId: 'payment_request_sale' },
      { templateId: 'cam_ket', optional: true },
    ],
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/documents/registry/__tests__/registry.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/documents/registry/templates/index.ts src/components/documents/registry/dossiers.ts src/components/documents/registry/__tests__/registry.test.ts
git commit -m "feat(docs-registry): map template + danh mục Giải ngân + test toàn vẹn"
```

---

## Task 7: Dossier reducer thuần + test luồng state

**Files:**
- Create: `src/hooks/documentDossierReducer.ts`
- Test: `src/hooks/__tests__/documentDossierReducer.test.ts`

**Interfaces:**
- Consumes: `DossierCommon`, `emptyCommon` (Task 1); `TEMPLATE_BY_ID` (Task 6); `DOSSIERS` (Task 6).
- Produces:
  - `DossierState { activeDossierId: string; activeDocId: string; common: DossierCommon; specificByDocId: Record<string, unknown>; excludedDocIds: string[] }`
  - `initDossierState(dossierId: string): DossierState`
  - `dossierReducer(state, action): DossierState` với actions:
    - `{ type: 'selectDossier'; dossierId: string }`
    - `{ type: 'selectDoc'; docId: string }`
    - `{ type: 'patchCommon'; patch: Partial<DossierCommon> }`
    - `{ type: 'patchSpecific'; docId: string; patch: Record<string, unknown> }`
    - `{ type: 'toggleOptional'; docId: string }`

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/__tests__/documentDossierReducer.test.ts
import { describe, it, expect } from 'vitest';
import { initDossierState, dossierReducer } from '../documentDossierReducer';

describe('dossierReducer', () => {
  it('initializes with first doc active and specific slices for each doc', () => {
    const s = initDossierState('giai_ngan');
    expect(s.activeDossierId).toBe('giai_ngan');
    expect(s.activeDocId).toBe('sale_contract');
    expect(Object.keys(s.specificByDocId).sort()).toEqual(
      ['cam_ket', 'payment_request_sale', 'sale_contract'],
    );
    expect(s.excludedDocIds).toEqual([]);
  });

  it('selectDoc keeps common intact (fill once, flow to all)', () => {
    let s = initDossierState('giai_ngan');
    s = dossierReducer(s, { type: 'patchCommon', patch: { totalAmount: '1.000.000' } });
    s = dossierReducer(s, { type: 'selectDoc', docId: 'payment_request_sale' });
    expect(s.activeDocId).toBe('payment_request_sale');
    expect(s.common.totalAmount).toBe('1.000.000');
  });

  it('patchSpecific updates only the targeted doc slice', () => {
    let s = initDossierState('giai_ngan');
    s = dossierReducer(s, { type: 'patchSpecific', docId: 'sale_contract', patch: { paymentStage1: '50' } });
    expect((s.specificByDocId.sale_contract as any).paymentStage1).toBe('50');
    expect((s.specificByDocId.payment_request_sale as any).paymentStage1).toBeUndefined();
  });

  it('selectDossier reloads common (previous edits dropped)', () => {
    let s = initDossierState('giai_ngan');
    s = dossierReducer(s, { type: 'patchCommon', patch: { totalAmount: '999' } });
    s = dossierReducer(s, { type: 'selectDossier', dossierId: 'giai_ngan' });
    expect(s.common.totalAmount).toBe('');
  });

  it('toggleOptional adds/removes a doc from excluded list', () => {
    let s = initDossierState('giai_ngan');
    s = dossierReducer(s, { type: 'toggleOptional', docId: 'cam_ket' });
    expect(s.excludedDocIds).toEqual(['cam_ket']);
    s = dossierReducer(s, { type: 'toggleOptional', docId: 'cam_ket' });
    expect(s.excludedDocIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/documentDossierReducer.test.ts`
Expected: FAIL — Cannot find module `../documentDossierReducer`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/hooks/documentDossierReducer.ts
import type { DossierCommon } from '../components/documents/registry/types';
import { emptyCommon } from '../components/documents/registry/types';
import { TEMPLATE_BY_ID } from '../components/documents/registry/templates';
import { DOSSIERS } from '../components/documents/registry/dossiers';

export interface DossierState {
  activeDossierId: string;
  activeDocId: string;
  common: DossierCommon;
  specificByDocId: Record<string, unknown>;
  excludedDocIds: string[];
}

export type DossierAction =
  | { type: 'selectDossier'; dossierId: string }
  | { type: 'selectDoc'; docId: string }
  | { type: 'patchCommon'; patch: Partial<DossierCommon> }
  | { type: 'patchSpecific'; docId: string; patch: Record<string, unknown> }
  | { type: 'toggleOptional'; docId: string };

function dossierById(id: string) {
  const d = DOSSIERS.find(x => x.id === id);
  if (!d) throw new Error(`Unknown dossier: ${id}`);
  return d;
}

export function initDossierState(dossierId: string): DossierState {
  const dossier = dossierById(dossierId);
  const common = { ...emptyCommon(), ...(dossier.commonDefaults ?? {}) };
  const specificByDocId: Record<string, unknown> = {};
  for (const doc of dossier.documents) {
    const tpl = TEMPLATE_BY_ID[doc.templateId];
    specificByDocId[doc.templateId] = structuredClone(tpl.specificDefaults);
  }
  return {
    activeDossierId: dossierId,
    activeDocId: dossier.documents[0].templateId,
    common,
    specificByDocId,
    excludedDocIds: [],
  };
}

export function dossierReducer(state: DossierState, action: DossierAction): DossierState {
  switch (action.type) {
    case 'selectDossier':
      return initDossierState(action.dossierId);
    case 'selectDoc':
      return { ...state, activeDocId: action.docId };
    case 'patchCommon':
      return { ...state, common: { ...state.common, ...action.patch } };
    case 'patchSpecific':
      return {
        ...state,
        specificByDocId: {
          ...state.specificByDocId,
          [action.docId]: { ...(state.specificByDocId[action.docId] as object), ...action.patch },
        },
      };
    case 'toggleOptional': {
      const has = state.excludedDocIds.includes(action.docId);
      return {
        ...state,
        excludedDocIds: has
          ? state.excludedDocIds.filter(id => id !== action.docId)
          : [...state.excludedDocIds, action.docId],
      };
    }
    default:
      return state;
  }
}
```

Note: `structuredClone` có sẵn trong Node 18+ và trình duyệt hiện đại → an toàn cho vitest và app.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/documentDossierReducer.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Type-check + full test suite**

Run: `npx tsc --noEmit -p tsconfig.json && npm run test`
Expected: tsc no output; toàn bộ vitest xanh (bao gồm test cũ).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/documentDossierReducer.ts src/hooks/__tests__/documentDossierReducer.test.ts
git commit -m "feat(docs-registry): reducer thuần cho luồng state hồ sơ + test"
```

---

## Self-Review

**Spec coverage:**
- Mô hình dữ liệu (spec §4) → Task 1 (types), Task 2 (baseDraft nền adapter).
- Adapter tái dùng builder cũ (spec §7.1) → Task 3, 4, 5 (mỗi template + golden test).
- Registry template/dossier (spec §4.2, §4.3) → Task 6.
- State & luồng (spec §5) → Task 7 (reducer thuần, đủ 5 hành vi: chọn danh mục nạp lại common, chọn tờ giữ common, patch common/specific, toggle optional).
- Kiểm thử (spec §8): golden (Task 3-5), toàn vẹn registry (Task 6), reducer (Task 7), adapter mapping (Task 3-4). *UI thật (spec §8.5) thuộc Plan 2.*
- **Ngoài phạm vi Plan 1** (đúng chủ ý): UI (selector 2 tầng, CommonInfoForm, tích hợp DocumentTemplateView), legacy-wrap 8 mẫu, "Bảng kê mua hàng" (builder mới), migrate các danh mục khác → **Plan 2 & 3**.

**Placeholder scan:** Không có TBD/TODO; mọi step code có nội dung thật; golden test độc lập (dựng draft kỳ vọng bằng tay, không gọi lại adapter → không tautology).

**Type consistency:** `DocTemplate<S>`, `DossierCommon`, `baseDraft(): DocumentDraft`, `saleToLegacyParams`/`paymentToLegacyParams` nhất quán giữa các task; `TEMPLATE_BY_ID`/`DOSSIERS` dùng thống nhất ở Task 6 và Task 7; id `'giai_ngan'`, `'sale_contract'`, `'payment_request_sale'`, `'cam_ket'` khớp giữa dossiers.ts, templates và test.

**Điểm cần xác nhận khi chạy:** (1) `buildGiayCamKetHtml` có được export chưa (Task 5 xử lý); (2) `DocumentDraft` field khớp `baseDraft` (Task 2 type-check bắt).

---

## Execution Handoff

Plan 1 (Foundation) hoàn tất. Plan 2 (UI: selector 2 tầng + CommonInfoForm + tích hợp DocumentTemplateView + legacy-wrap 8 mẫu + Bảng kê) và Plan 3 (migrate các danh mục còn lại) sẽ viết sau khi Plan 1 chạy xong và xác nhận kiến trúc đứng vững.
