import { parseDecimalNumber } from './utils';

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  beginningQty: number;
  importQty: number;
  exportQty: number;
}

export interface ComputedInventoryItem extends InventoryItem {
  beginningValue: number;
  importValue: number;
  exportValue: number;
  endingQty: number;
  endingValue: number;
}

export interface InventorySummary {
  totalItems: number;
  totalBeginningQty: number;
  totalBeginningValue: number;
  totalImportQty: number;
  totalImportValue: number;
  totalExportQty: number;
  totalExportValue: number;
  totalEndingQty: number;
  totalEndingValue: number;
}

export function computeItemRow(item: InventoryItem): ComputedInventoryItem {
  const price = Math.max(0, item.unitPrice || 0);
  const begQty = Math.max(0, item.beginningQty || 0);
  const impQty = Math.max(0, item.importQty || 0);
  const expQty = Math.max(0, item.exportQty || 0);

  const beginningValue = begQty * price;
  const importValue = impQty * price;
  const exportValue = expQty * price;
  const endingQty = begQty + impQty - expQty;
  const endingValue = endingQty * price;

  return {
    ...item,
    unitPrice: price,
    beginningQty: begQty,
    importQty: impQty,
    exportQty: expQty,
    beginningValue,
    importValue,
    exportValue,
    endingQty,
    endingValue,
  };
}

export function computeInventorySummary(items: InventoryItem[]): InventorySummary {
  let totalBeginningQty = 0;
  let totalBeginningValue = 0;
  let totalImportQty = 0;
  let totalImportValue = 0;
  let totalExportQty = 0;
  let totalExportValue = 0;
  let totalEndingQty = 0;
  let totalEndingValue = 0;

  items.forEach(item => {
    const computed = computeItemRow(item);
    totalBeginningQty += computed.beginningQty;
    totalBeginningValue += computed.beginningValue;
    totalImportQty += computed.importQty;
    totalImportValue += computed.importValue;
    totalExportQty += computed.exportQty;
    totalExportValue += computed.exportValue;
    totalEndingQty += computed.endingQty;
    totalEndingValue += computed.endingValue;
  });

  return {
    totalItems: items.length,
    totalBeginningQty,
    totalBeginningValue,
    totalImportQty,
    totalImportValue,
    totalExportQty,
    totalExportValue,
    totalEndingQty,
    totalEndingValue,
  };
}

let itemSeq = 0;
export function nextItemId(): string {
  itemSeq += 1;
  return `inv_${Date.now()}_${itemSeq}`;
}

export function parseInventoryText(text: string): InventoryItem[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: InventoryItem[] = [];

  lines.forEach(line => {
    const cols = line.includes('\t') ? line.split('\t') : line.split(',');
    if (cols.length >= 2) {
      const code = cols[0].trim();
      const name = cols[1].trim();
      if (code.toLowerCase().includes('mã') || name.toLowerCase().includes('tên')) {
        return;
      }
      const unit = cols[2]?.trim() || 'Cái';
      const begQty = parseDecimalNumber(cols[3] || '0');
      const impQty = parseDecimalNumber(cols[5] || cols[4] || '0');
      const expQty = parseDecimalNumber(cols[7] || cols[5] || '0');
      const price = parseDecimalNumber(cols[cols.length - 1] || '0');

      items.push({
        id: nextItemId(),
        code,
        name,
        unit,
        unitPrice: price,
        beginningQty: begQty,
        importQty: impQty,
        exportQty: expQty,
      });
    }
  });

  return items;
}
