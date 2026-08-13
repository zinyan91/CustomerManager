import { describe, it, expect, beforeEach } from 'vitest';
import {
  fetchPurchaseStatementsDb, savePurchaseStatementDb, deletePurchaseStatementDb,
  fetchRetailInvoicesDb, saveRetailInvoiceDb, deleteRetailInvoiceDb,
  type SavedPurchaseStatement, type SavedRetailInvoice,
} from '../statementDb';

describe('statementDb store and Supabase fallback', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k in store) delete store[k];
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
      length: 0,
      key: () => null,
    };
  });

  it('should save and fetch Purchase Statements locally on DB fallback', async () => {
    const stmt: SavedPurchaseStatement = {
      id: 'stmt-test-1',
      sellerInfo: {
        sellerName: 'Nguyễn Văn B',
        sellerAddress: 'Tây Ninh',
        sellerBankAcc: 'STK: 12345678',
        sellerIdCard: '079188291029',
        buyerName: 'Trần Thị A',
        buyerIdCard: '079188001122',
        statementDateStr: '2026-08-13',
      },
      items: [
        { id: '1', dateStr: '13/08/2026', itemName: 'Lúa Jasmine 85', unit: 'Tấn', qty: 5, unitPrice: 8500000 },
      ],
      statementDate: '2026-08-13',
    };

    await savePurchaseStatementDb(stmt);
    const list = await fetchPurchaseStatementsDb();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].sellerInfo.sellerName).toBe('Nguyễn Văn B');

    await deletePurchaseStatementDb('stmt-test-1');
    const updated = await fetchPurchaseStatementsDb();
    expect(updated.find(s => s.id === 'stmt-test-1')).toBeFalsy();
  });

  it('should save and fetch Retail Invoices locally on DB fallback', async () => {
    const inv: SavedRetailInvoice = {
      id: 'inv-test-1',
      invoiceNo: 'HD001',
      invoiceDate: '2026-08-13',
      headerInfo: {
        buyerName: 'Chị Hoa',
        buyerAddress: 'Hà Nội',
        shopName: 'Cửa hàng Mỹ Phẩm',
        invoiceDateStr: '2026-08-13',
      },
      items: [
        { id: '1', itemName: 'Son môi YSL', unit: 'Thỏi', qty: 2, unitPrice: 850000 },
      ],
    };

    await saveRetailInvoiceDb(inv);
    const list = await fetchRetailInvoicesDb();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].headerInfo.buyerName).toBe('Chị Hoa');

    await deleteRetailInvoiceDb('inv-test-1');
    const updated = await fetchRetailInvoicesDb();
    expect(updated.find(i => i.id === 'inv-test-1')).toBeFalsy();
  });
});
