import {
  DEFAULT_STATEMENT_TEMPLATES, DEFAULT_RETAIL_INVOICE_TEMPLATES,
  type StatementTemplate, type RetailInvoiceTemplate, type StatementItem, type RetailInvoiceItem,
} from './statement';
import { supabase } from './supabase';

const STATEMENT_STORAGE_KEY = 'customer_manager_statement_templates_v1';
const INVOICE_STORAGE_KEY = 'customer_manager_retail_invoice_templates_v1';

function getStorage(): Storage | null {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

// --- 1. STATEMENT TEMPLATES ---
export function loadStatementTemplates(): StatementTemplate[] {
  const storage = getStorage();
  if (!storage) return DEFAULT_STATEMENT_TEMPLATES;
  try {
    const raw = storage.getItem(STATEMENT_STORAGE_KEY);
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
  const storage = getStorage();
  if (storage) {
    storage.setItem(STATEMENT_STORAGE_KEY, JSON.stringify(templates));
  }
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

  // Sync to Supabase in background
  saveStatementTemplateToCloud(newTemplate, 'purchase_statement').catch(err => {
    console.warn('saveStatementTemplateToCloud background error:', err);
  });

  return { templates: updated, newTemplate };
}

export function updateStatementTemplate(
  id: string,
  name: string,
  sellerInfo: any,
  items: Omit<StatementItem, 'id'>[]
): StatementTemplate[] {
  const current = loadStatementTemplates();
  let updatedTemplate: StatementTemplate | undefined;
  const updated = current.map(t => {
    if (t.id === id) {
      updatedTemplate = { ...t, name: name.trim(), sellerInfo, items };
      return updatedTemplate;
    }
    return t;
  });
  saveStatementTemplates(updated);

  if (updatedTemplate) {
    saveStatementTemplateToCloud(updatedTemplate, 'purchase_statement').catch(err => {
      console.warn('saveStatementTemplateToCloud background error:', err);
    });
  }

  return updated;
}

export function deleteStatementTemplate(id: string): StatementTemplate[] {
  const current = loadStatementTemplates();
  const updated = current.filter(t => t.id !== id);
  const result = updated.length > 0 ? updated : DEFAULT_STATEMENT_TEMPLATES;
  saveStatementTemplates(result);

  deleteStatementTemplateFromCloud(id).catch(err => {
    console.warn('deleteStatementTemplateFromCloud background error:', err);
  });

  return result;
}

export function resetStatementTemplates(): StatementTemplate[] {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(STATEMENT_STORAGE_KEY);
  }
  return DEFAULT_STATEMENT_TEMPLATES;
}

// --- 2. RETAIL INVOICE TEMPLATES ---
export function loadRetailInvoiceTemplates(): RetailInvoiceTemplate[] {
  const storage = getStorage();
  if (!storage) return DEFAULT_RETAIL_INVOICE_TEMPLATES;
  try {
    const raw = storage.getItem(INVOICE_STORAGE_KEY);
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
  const storage = getStorage();
  if (storage) {
    storage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(templates));
  }
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

  saveStatementTemplateToCloud({
    id: newTemplate.id,
    name: newTemplate.name,
    sellerInfo: newTemplate.headerInfo,
    items: newTemplate.items,
  }, 'retail_invoice').catch(err => {
    console.warn('saveRetailInvoiceTemplateToCloud background error:', err);
  });

  return { templates: updated, newTemplate };
}

export function updateRetailInvoiceTemplate(
  id: string,
  name: string,
  headerInfo: any,
  items: Omit<RetailInvoiceItem, 'id'>[]
): RetailInvoiceTemplate[] {
  const current = loadRetailInvoiceTemplates();
  let updatedTemplate: RetailInvoiceTemplate | undefined;
  const updated = current.map(t => {
    if (t.id === id) {
      updatedTemplate = { ...t, name: name.trim(), headerInfo, items };
      return updatedTemplate;
    }
    return t;
  });
  saveRetailInvoiceTemplates(updated);

  if (updatedTemplate) {
    saveStatementTemplateToCloud({
      id: updatedTemplate.id,
      name: updatedTemplate.name,
      sellerInfo: updatedTemplate.headerInfo,
      items: updatedTemplate.items,
    }, 'retail_invoice').catch(err => {
      console.warn('saveRetailInvoiceTemplateToCloud background error:', err);
    });
  }

  return updated;
}

export function deleteRetailInvoiceTemplate(id: string): RetailInvoiceTemplate[] {
  const current = loadRetailInvoiceTemplates();
  const updated = current.filter(t => t.id !== id);
  const result = updated.length > 0 ? updated : DEFAULT_RETAIL_INVOICE_TEMPLATES;
  saveRetailInvoiceTemplates(result);

  deleteStatementTemplateFromCloud(id).catch(err => {
    console.warn('deleteStatementTemplateFromCloud background error:', err);
  });

  return result;
}

export function resetRetailInvoiceTemplates(): RetailInvoiceTemplate[] {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(INVOICE_STORAGE_KEY);
  }
  return DEFAULT_RETAIL_INVOICE_TEMPLATES;
}

// --- Cloud Sync Helpers (Supabase PostgreSQL) ---

export async function fetchStatementTemplatesFromCloud(): Promise<StatementTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('StatementTemplates')
      .select('*')
      .eq('Kind', 'purchase_statement')
      .order('CreatedAt', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return loadStatementTemplates();

    const cloudList: StatementTemplate[] = data.map(row => ({
      id: row.Id,
      name: row.Name,
      sellerInfo: row.SellerInfo || {},
      items: Array.isArray(row.Items) ? row.Items : [],
    }));

    const currentLocal = loadStatementTemplates();
    const map = new Map<string, StatementTemplate>();

    DEFAULT_STATEMENT_TEMPLATES.forEach(t => map.set(t.id, t));
    currentLocal.forEach(t => map.set(t.id, t));
    cloudList.forEach(t => map.set(t.id, t));

    const finalMerged = Array.from(map.values());
    saveStatementTemplates(finalMerged);
    return finalMerged;
  } catch (err) {
    console.warn('fetchStatementTemplatesFromCloud fallback to local:', err);
    return loadStatementTemplates();
  }
}

export async function fetchRetailInvoiceTemplatesFromCloud(): Promise<RetailInvoiceTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('StatementTemplates')
      .select('*')
      .eq('Kind', 'retail_invoice')
      .order('CreatedAt', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return loadRetailInvoiceTemplates();

    const cloudList: RetailInvoiceTemplate[] = data.map(row => ({
      id: row.Id,
      name: row.Name,
      headerInfo: row.SellerInfo || {},
      items: Array.isArray(row.Items) ? row.Items : [],
    }));

    const currentLocal = loadRetailInvoiceTemplates();
    const map = new Map<string, RetailInvoiceTemplate>();

    DEFAULT_RETAIL_INVOICE_TEMPLATES.forEach(t => map.set(t.id, t));
    currentLocal.forEach(t => map.set(t.id, t));
    cloudList.forEach(t => map.set(t.id, t));

    const finalMerged = Array.from(map.values());
    saveRetailInvoiceTemplates(finalMerged);
    return finalMerged;
  } catch (err) {
    console.warn('fetchRetailInvoiceTemplatesFromCloud fallback to local:', err);
    return loadRetailInvoiceTemplates();
  }
}

export async function saveStatementTemplateToCloud(
  tpl: { id: string; name: string; sellerInfo: any; items: any[] },
  kind: 'purchase_statement' | 'retail_invoice'
): Promise<void> {
  try {
    const payload = {
      Id: tpl.id,
      Kind: kind,
      Name: tpl.name,
      SellerInfo: tpl.sellerInfo || {},
      Items: tpl.items || [],
      UpdatedAt: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('StatementTemplates')
      .upsert([payload]);
    if (error) throw error;
  } catch (err) {
    console.warn('saveStatementTemplateToCloud error:', err);
  }
}

export async function deleteStatementTemplateFromCloud(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('StatementTemplates')
      .delete()
      .eq('Id', id);
    if (error) throw error;
  } catch (err) {
    console.warn('deleteStatementTemplateFromCloud error:', err);
  }
}
