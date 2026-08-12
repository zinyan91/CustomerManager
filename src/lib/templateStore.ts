import { INVENTORY_TEMPLATES, type InventoryCategoryTemplate, type TemplateItem } from '../data/inventoryTemplates';

const STORAGE_KEY = 'customer_manager_inventory_templates_v1';

export function loadInventoryTemplates(): InventoryCategoryTemplate[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return INVENTORY_TEMPLATES;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {}
  return INVENTORY_TEMPLATES;
}

export function saveInventoryTemplates(templates: InventoryCategoryTemplate[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {}
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
  return { templates: updated, newTemplate };
}

export function updateInventoryTemplate(
  id: string,
  name: string,
  items: TemplateItem[]
): InventoryCategoryTemplate[] {
  const current = loadInventoryTemplates();
  const updated = current.map(t => (t.id === id ? { ...t, name: name.trim(), items } : t));
  saveInventoryTemplates(updated);
  return updated;
}

export function deleteInventoryTemplate(id: string): InventoryCategoryTemplate[] {
  const current = loadInventoryTemplates();
  const updated = current.filter(t => t.id !== id);
  const result = updated.length > 0 ? updated : INVENTORY_TEMPLATES;
  saveInventoryTemplates(result);
  return result;
}

export function resetInventoryTemplates(): InventoryCategoryTemplate[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {}
  }
  return INVENTORY_TEMPLATES;
}
