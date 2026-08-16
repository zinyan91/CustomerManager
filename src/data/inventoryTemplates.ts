import rawTemplates from './inventoryTemplates.json';

export interface TemplateItem {
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  beginningQty: number;
  importQty: number;
  exportQty: number;
}

export interface InventoryCategoryTemplate {
  id: string;
  name: string;
  items: TemplateItem[];
}

export const INVENTORY_TEMPLATES: InventoryCategoryTemplate[] =
  rawTemplates as InventoryCategoryTemplate[];
