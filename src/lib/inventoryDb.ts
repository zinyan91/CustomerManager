import { supabase } from './supabase';
import type { InventoryItem } from './inventory';

const INVENTORY_STORAGE_KEY = 'customer_manager_inventory_db';

function safeLocalStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
  return null;
}

export async function fetchInventoryItemsDb(categoryName?: string): Promise<InventoryItem[]> {
  try {
    let query = supabase.from('InventoryItems').select('*');
    if (categoryName) {
      query = query.eq('CategoryName', categoryName);
    }
    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase fetch timeout')), 2500)
    );
    const { data, error } = (await Promise.race([query, timeoutPromise])) as any;
    if (error) throw error;
    if (data) {
      const items: InventoryItem[] = data.map((d: any) => ({
        id: d.Id,
        code: d.Code || `SP${d.Id}`,
        name: d.Name || d.ItemName || '',
        unit: d.Unit || 'Kg',
        unitPrice: Number(d.UnitPrice || 0),
        beginningQty: Number(d.BeginningQty || 0),
        importQty: Number(d.ImportQty || 0),
        exportQty: Number(d.ExportQty || 0),
      }));

      const storage = safeLocalStorage();
      if (storage) {
        if (!categoryName) {
          storage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
        }
      }
      return items;
    }
  } catch (err) {
    console.warn('Supabase fetchInventoryItemsDb warning (using local fallback):', err);
  }

  // Fallback to local storage if network or DB table not yet reachable
  const storage = safeLocalStorage();
  const cached = storage ? storage.getItem(INVENTORY_STORAGE_KEY) : null;
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  return [];
}

export async function saveInventoryItemDb(item: InventoryItem, categoryName = 'HTK Lúa Gạo'): Promise<void> {
  const storage = safeLocalStorage();
  if (storage) {
    try {
      const cached = storage.getItem(INVENTORY_STORAGE_KEY);
      const current: InventoryItem[] = cached ? JSON.parse(cached) : [];
      const idx = current.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        current[idx] = item;
      } else {
        current.push(item);
      }
      storage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(current));
    } catch {
      // ignore
    }
  }

  // Sync to Supabase Database
  try {
    const payload = {
      Id: item.id,
      CategoryName: categoryName,
      Code: item.code,
      Name: item.name,
      Unit: item.unit,
      UnitPrice: item.unitPrice,
      BeginningQty: item.beginningQty,
      ImportQty: item.importQty,
      ExportQty: item.exportQty,
      UpdatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('InventoryItems').upsert(payload);
    if (error) console.warn('Supabase upsert InventoryItems warning:', error);
  } catch (err) {
    console.warn('Supabase saveInventoryItemDb error:', err);
  }
}

export async function saveAllInventoryItemsDb(items: InventoryItem[], categoryName = 'HTK Lúa Gạo'): Promise<void> {
  const storage = safeLocalStorage();
  if (storage) {
    storage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
  }

  try {
    const payload = items.map(item => ({
      Id: item.id,
      CategoryName: categoryName,
      Code: item.code,
      Name: item.name,
      Unit: item.unit,
      UnitPrice: item.unitPrice,
      BeginningQty: item.beginningQty,
      ImportQty: item.importQty,
      ExportQty: item.exportQty,
      UpdatedAt: new Date().toISOString(),
    }));

    const { error } = await supabase.from('InventoryItems').upsert(payload);
    if (error) console.warn('Supabase upsert all InventoryItems warning:', error);
  } catch (err) {
    console.warn('Supabase saveAllInventoryItemsDb error:', err);
  }
}

export async function deleteInventoryItemDb(itemId: string): Promise<void> {
  const storage = safeLocalStorage();
  if (storage) {
    try {
      const cached = storage.getItem(INVENTORY_STORAGE_KEY);
      if (cached) {
        const current: InventoryItem[] = JSON.parse(cached);
        const updated = current.filter(i => i.id !== itemId);
        storage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  }

  try {
    const { error } = await supabase.from('InventoryItems').delete().eq('Id', itemId);
    if (error) console.warn('Supabase delete InventoryItems warning:', error);
  } catch (err) {
    console.warn('Supabase deleteInventoryItemDb error:', err);
  }
}
