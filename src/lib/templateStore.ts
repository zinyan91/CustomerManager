import { INVENTORY_TEMPLATES, type InventoryCategoryTemplate, type TemplateItem } from '../data/inventoryTemplates';
import { supabase } from './supabase';

const STORAGE_KEY = 'customer_manager_inventory_templates_v1';

function getStorage(): Storage | null {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

export function loadInventoryTemplates(): InventoryCategoryTemplate[] {
  const storage = getStorage();
  if (!storage) return INVENTORY_TEMPLATES;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('loadInventoryTemplates storage parse error:', err);
  }
  return INVENTORY_TEMPLATES;
}

export function saveInventoryTemplates(templates: InventoryCategoryTemplate[]): void {
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }
}

export function addInventoryTemplate(
  name: string,
  items: TemplateItem[]
): { templates: InventoryCategoryTemplate[]; newTemplate: InventoryCategoryTemplate } {
  const current = loadInventoryTemplates();
  const newId = `tpl_custom_${Date.now()}`;
  const newTemplate: InventoryCategoryTemplate = {
    id: newId,
    name: name.trim() || 'Ngành hàng mới',
    items: items || [],
  };
  const updated = [...current, newTemplate];
  saveInventoryTemplates(updated);

  // Sync to Supabase in background
  saveInventoryTemplateToCloud(newTemplate).catch(err => {
    console.warn('saveInventoryTemplateToCloud background error:', err);
  });

  return { templates: updated, newTemplate };
}

export function updateInventoryTemplate(
  id: string,
  name: string,
  items: TemplateItem[]
): InventoryCategoryTemplate[] {
  const current = loadInventoryTemplates();
  let updatedTemplate: InventoryCategoryTemplate | undefined;
  const updated = current.map(t => {
    if (t.id === id) {
      updatedTemplate = { ...t, name: name.trim(), items };
      return updatedTemplate;
    }
    return t;
  });
  saveInventoryTemplates(updated);

  if (updatedTemplate) {
    saveInventoryTemplateToCloud(updatedTemplate).catch(err => {
      console.warn('saveInventoryTemplateToCloud background error:', err);
    });
  }

  return updated;
}

export function deleteInventoryTemplate(id: string): InventoryCategoryTemplate[] {
  const current = loadInventoryTemplates();
  const updated = current.filter(t => t.id !== id);
  const result = updated.length > 0 ? updated : INVENTORY_TEMPLATES;
  saveInventoryTemplates(result);

  // Delete from Supabase in background
  deleteInventoryTemplateFromCloud(id).catch(err => {
    console.warn('deleteInventoryTemplateFromCloud background error:', err);
  });

  return result;
}

export function resetInventoryTemplates(): InventoryCategoryTemplate[] {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(STORAGE_KEY);
  }
  return INVENTORY_TEMPLATES;
}

// --- Cloud Sync Helpers (Supabase PostgreSQL) ---

export async function fetchInventoryTemplatesFromCloud(): Promise<InventoryCategoryTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('InventoryCategoryTemplates')
      .select('*')
      .order('CreatedAt', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return loadInventoryTemplates();

    const cloudList: InventoryCategoryTemplate[] = data.map(row => ({
      id: row.Id,
      name: row.Name,
      items: Array.isArray(row.Items) ? row.Items : [],
    }));

    const currentLocal = loadInventoryTemplates();
    const map = new Map<string, InventoryCategoryTemplate>();

    // Builtin first
    INVENTORY_TEMPLATES.forEach(t => map.set(t.id, t));
    // Local
    currentLocal.forEach(t => map.set(t.id, t));
    // Cloud
    cloudList.forEach(t => map.set(t.id, t));

    const finalMerged = Array.from(map.values());
    saveInventoryTemplates(finalMerged);
    return finalMerged;
  } catch (err) {
    console.warn('fetchInventoryTemplatesFromCloud fallback to local:', err);
    return loadInventoryTemplates();
  }
}

export async function saveInventoryTemplateToCloud(tpl: InventoryCategoryTemplate): Promise<void> {
  try {
    const payload = {
      Id: tpl.id,
      Name: tpl.name,
      Items: tpl.items,
      UpdatedAt: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('InventoryCategoryTemplates')
      .upsert([payload]);
    if (error) throw error;
  } catch (err) {
    console.warn('saveInventoryTemplateToCloud error:', err);
  }
}

export async function deleteInventoryTemplateFromCloud(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('InventoryCategoryTemplates')
      .delete()
      .eq('Id', id);
    if (error) throw error;
  } catch (err) {
    console.warn('deleteInventoryTemplateFromCloud error:', err);
  }
}
