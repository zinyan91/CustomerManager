import {
  DEFAULT_STATEMENT_TEMPLATES, DEFAULT_RETAIL_INVOICE_TEMPLATES,
  type StatementTemplate, type RetailInvoiceTemplate, type StatementItem, type RetailInvoiceItem,
} from './statement';

const STATEMENT_STORAGE_KEY = 'customer_manager_statement_templates_v1';
const INVOICE_STORAGE_KEY = 'customer_manager_retail_invoice_templates_v1';

// --- 1. STATEMENT TEMPLATES ---
export function loadStatementTemplates(): StatementTemplate[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_STATEMENT_TEMPLATES;
  }
  try {
    const raw = window.localStorage.getItem(STATEMENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {}
  return DEFAULT_STATEMENT_TEMPLATES;
}

export function saveStatementTemplates(templates: StatementTemplate[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STATEMENT_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {}
}

export function addStatementTemplate(
  name: string,
  sellerInfo: any,
  items: Omit<StatementItem, 'id'>[]
): { templates: StatementTemplate[]; newTemplate: StatementTemplate } {
  const current = loadStatementTemplates();
  const newId = `stmt_tpl_${Date.now()}`;
  const newTemplate: StatementTemplate = {
    id: newId,
    name: name.trim() || 'Bảng kê mới',
    sellerInfo: sellerInfo || {},
    items: items || [],
  };
  const updated = [...current, newTemplate];
  saveStatementTemplates(updated);
  return { templates: updated, newTemplate };
}

export function updateStatementTemplate(
  id: string,
  name: string,
  sellerInfo: any,
  items: Omit<StatementItem, 'id'>[]
): StatementTemplate[] {
  const current = loadStatementTemplates();
  const updated = current.map(t => (t.id === id ? { ...t, name: name.trim(), sellerInfo, items } : t));
  saveStatementTemplates(updated);
  return updated;
}

export function deleteStatementTemplate(id: string): StatementTemplate[] {
  const current = loadStatementTemplates();
  const updated = current.filter(t => t.id !== id);
  const result = updated.length > 0 ? updated : DEFAULT_STATEMENT_TEMPLATES;
  saveStatementTemplates(result);
  return result;
}

export function resetStatementTemplates(): StatementTemplate[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STATEMENT_STORAGE_KEY);
    } catch (err) {}
  }
  return DEFAULT_STATEMENT_TEMPLATES;
}

// --- 2. RETAIL INVOICE TEMPLATES ---
export function loadRetailInvoiceTemplates(): RetailInvoiceTemplate[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_RETAIL_INVOICE_TEMPLATES;
  }
  try {
    const raw = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {}
  return DEFAULT_RETAIL_INVOICE_TEMPLATES;
}

export function saveRetailInvoiceTemplates(templates: RetailInvoiceTemplate[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {}
}

export function addRetailInvoiceTemplate(
  name: string,
  headerInfo: any,
  items: Omit<RetailInvoiceItem, 'id'>[]
): { templates: RetailInvoiceTemplate[]; newTemplate: RetailInvoiceTemplate } {
  const current = loadRetailInvoiceTemplates();
  const newId = `ret_inv_tpl_${Date.now()}`;
  const newTemplate: RetailInvoiceTemplate = {
    id: newId,
    name: name.trim() || 'Hóa đơn mẫu mới',
    headerInfo: headerInfo || {},
    items: items || [],
  };
  const updated = [...current, newTemplate];
  saveRetailInvoiceTemplates(updated);
  return { templates: updated, newTemplate };
}

export function updateRetailInvoiceTemplate(
  id: string,
  name: string,
  headerInfo: any,
  items: Omit<RetailInvoiceItem, 'id'>[]
): RetailInvoiceTemplate[] {
  const current = loadRetailInvoiceTemplates();
  const updated = current.map(t => (t.id === id ? { ...t, name: name.trim(), headerInfo, items } : t));
  saveRetailInvoiceTemplates(updated);
  return updated;
}

export function deleteRetailInvoiceTemplate(id: string): RetailInvoiceTemplate[] {
  const current = loadRetailInvoiceTemplates();
  const updated = current.filter(t => t.id !== id);
  const result = updated.length > 0 ? updated : DEFAULT_RETAIL_INVOICE_TEMPLATES;
  saveRetailInvoiceTemplates(result);
  return result;
}

export function resetRetailInvoiceTemplates(): RetailInvoiceTemplate[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(INVOICE_STORAGE_KEY);
    } catch (err) {}
  }
  return DEFAULT_RETAIL_INVOICE_TEMPLATES;
}
