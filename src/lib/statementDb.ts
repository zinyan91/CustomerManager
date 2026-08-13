import { supabase } from './supabase';
import type { StatementSellerInfo, StatementItem, RetailInvoiceHeader, RetailInvoiceItem } from './statement';

const STATEMENT_STORAGE_KEY = 'customer_manager_statements_db';
const RETAIL_INVOICE_STORAGE_KEY = 'customer_manager_retail_invoices_db';

function safeLocalStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
  return null;
}

export interface SavedPurchaseStatement {
  id: string;
  sellerInfo: StatementSellerInfo;
  items: StatementItem[];
  statementDate: string;
  createdAt?: string;
}

export interface SavedRetailInvoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  headerInfo: RetailInvoiceHeader;
  items: RetailInvoiceItem[];
  discount?: number;
  note?: string;
  paymentMethod?: string;
  createdAt?: string;
}

// --- 1. BẢNG KÊ MUA BÁN (PurchaseStatements) ---

export async function fetchPurchaseStatementsDb(): Promise<SavedPurchaseStatement[]> {
  try {
    const { data, error } = await supabase
      .from('PurchaseStatements')
      .select('*')
      .order('CreatedAt', { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) {
      const statements: SavedPurchaseStatement[] = data.map((d: any) => ({
        id: d.Id,
        sellerInfo: {
          sellerName: d.SellerName || '',
          sellerAddress: d.SellerAddress || '',
          sellerIdCard: d.SellerIdCard || '',
          sellerBankAcc: d.SellerBankAcc || '',
          paymentMethod: (d.PaymentMethod as any) || 'transfer',
          buyerName: d.BuyerName || '',
          buyerIdCard: d.BuyerIdCard || '',
          statementDateStr: d.StatementDate || new Date().toISOString().split('T')[0],
        },
        items: Array.isArray(d.Items) ? d.Items : [],
        statementDate: d.StatementDate || new Date().toISOString().split('T')[0],
        createdAt: d.CreatedAt,
      }));

      const storage = safeLocalStorage();
      if (storage) storage.setItem(STATEMENT_STORAGE_KEY, JSON.stringify(statements));
      return statements;
    }
  } catch (err) {
    console.warn('Supabase fetchPurchaseStatementsDb warning (using local fallback):', err);
  }

  const storage = safeLocalStorage();
  const cached = storage ? storage.getItem(STATEMENT_STORAGE_KEY) : null;
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  return [];
}

export async function savePurchaseStatementDb(stmt: SavedPurchaseStatement): Promise<void> {
  const current = await fetchPurchaseStatementsDb();
  const idx = current.findIndex(s => s.id === stmt.id);
  if (idx >= 0) {
    current[idx] = stmt;
  } else {
    current.unshift(stmt);
  }
  const storage = safeLocalStorage();
  if (storage) storage.setItem(STATEMENT_STORAGE_KEY, JSON.stringify(current));

  try {
    const payload = {
      Id: stmt.id,
      SellerName: stmt.sellerInfo.sellerName,
      SellerAddress: stmt.sellerInfo.sellerAddress || '',
      SellerIdCard: stmt.sellerInfo.sellerIdCard || '',
      SellerBankAcc: stmt.sellerInfo.sellerBankAcc || '',
      PaymentMethod: stmt.sellerInfo.paymentMethod || 'transfer',
      BuyerName: stmt.sellerInfo.buyerName || '',
      BuyerIdCard: stmt.sellerInfo.buyerIdCard || '',
      StatementDate: stmt.statementDate || stmt.sellerInfo.statementDateStr || new Date().toISOString().split('T')[0],
      Items: stmt.items,
      UpdatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('PurchaseStatements').upsert(payload);
    if (error) console.warn('Supabase upsert PurchaseStatements warning:', error);
  } catch (err) {
    console.warn('Supabase savePurchaseStatementDb error:', err);
  }
}

export async function deletePurchaseStatementDb(id: string): Promise<void> {
  const current = await fetchPurchaseStatementsDb();
  const updated = current.filter(s => s.id !== id);
  const storage = safeLocalStorage();
  if (storage) storage.setItem(STATEMENT_STORAGE_KEY, JSON.stringify(updated));

  try {
    const { error } = await supabase.from('PurchaseStatements').delete().eq('Id', id);
    if (error) console.warn('Supabase delete PurchaseStatements warning:', error);
  } catch (err) {
    console.warn('Supabase deletePurchaseStatementDb error:', err);
  }
}

// --- 2. HÓA ĐƠN BÁN LẺ (RetailInvoices) ---

export async function fetchRetailInvoicesDb(): Promise<SavedRetailInvoice[]> {
  try {
    const { data, error } = await supabase
      .from('RetailInvoices')
      .select('*')
      .order('CreatedAt', { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) {
      const invoices: SavedRetailInvoice[] = data.map((d: any) => ({
        id: d.Id,
        invoiceNo: d.InvoiceNo || d.Id,
        invoiceDate: d.InvoiceDate || new Date().toISOString().split('T')[0],
        headerInfo: {
          buyerName: d.CustomerName || '',
          buyerAddress: d.CustomerAddress || '',
          shopName: 'SALON & SPA MINH THƯ',
          invoiceDateStr: d.InvoiceDate || new Date().toISOString().split('T')[0],
        },
        items: Array.isArray(d.Items) ? d.Items : [],
        discount: Number(d.Discount || 0),
        note: d.Note || '',
        paymentMethod: d.PaymentMethod || 'cash',
        createdAt: d.CreatedAt,
      }));

      const storage = safeLocalStorage();
      if (storage) storage.setItem(RETAIL_INVOICE_STORAGE_KEY, JSON.stringify(invoices));
      return invoices;
    }
  } catch (err) {
    console.warn('Supabase fetchRetailInvoicesDb warning (using local fallback):', err);
  }

  const storage = safeLocalStorage();
  const cached = storage ? storage.getItem(RETAIL_INVOICE_STORAGE_KEY) : null;
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  return [];
}

export async function saveRetailInvoiceDb(inv: SavedRetailInvoice): Promise<void> {
  const current = await fetchRetailInvoicesDb();
  const idx = current.findIndex(i => i.id === inv.id);
  if (idx >= 0) {
    current[idx] = inv;
  } else {
    current.unshift(inv);
  }
  const storage = safeLocalStorage();
  if (storage) storage.setItem(RETAIL_INVOICE_STORAGE_KEY, JSON.stringify(current));

  try {
    const payload = {
      Id: inv.id,
      InvoiceNo: inv.invoiceNo,
      InvoiceDate: inv.invoiceDate || new Date().toISOString().split('T')[0],
      CustomerName: inv.headerInfo.buyerName || '',
      CustomerAddress: inv.headerInfo.buyerAddress || '',
      PaymentMethod: inv.paymentMethod || 'cash',
      Items: inv.items,
      Discount: inv.discount || 0,
      Note: inv.note || '',
      UpdatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('RetailInvoices').upsert(payload);
    if (error) console.warn('Supabase upsert RetailInvoices warning:', error);
  } catch (err) {
    console.warn('Supabase saveRetailInvoiceDb error:', err);
  }
}

export async function deleteRetailInvoiceDb(id: string): Promise<void> {
  const current = await fetchRetailInvoicesDb();
  const updated = current.filter(i => i.id !== id);
  const storage = safeLocalStorage();
  if (storage) storage.setItem(RETAIL_INVOICE_STORAGE_KEY, JSON.stringify(updated));

  try {
    const { error } = await supabase.from('RetailInvoices').delete().eq('Id', id);
    if (error) console.warn('Supabase delete RetailInvoices warning:', error);
  } catch (err) {
    console.warn('Supabase deleteRetailInvoiceDb error:', err);
  }
}
