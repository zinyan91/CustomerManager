import { describe, it, expect, beforeEach } from 'vitest';
import { fetchInventoryItemsDb, saveInventoryItemDb, deleteInventoryItemDb } from '../inventoryDb';
import type { InventoryItem } from '../inventory';

describe('inventoryDb store and API fallback', () => {
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

  it('should save and fetch items locally when DB is fallback', async () => {
    const item: InventoryItem = {
      id: 'inv-test-1',
      code: 'SP01',
      name: 'Lúa Nếp 5421',
      unit: 'Bao',
      unitPrice: 350000,
      beginningQty: 10,
      importQty: 50,
      exportQty: 10,
    };

    await saveInventoryItemDb(item, 'Nông sản');
    const items = await fetchInventoryItemsDb();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].name).toBe('Lúa Nếp 5421');
  });

  it('should delete item from store', async () => {
    const item: InventoryItem = {
      id: 'inv-test-2',
      code: 'SP02',
      name: 'Gạo ST25',
      unit: 'Kg',
      unitPrice: 28000,
      beginningQty: 100,
      importQty: 0,
      exportQty: 20,
    };

    await saveInventoryItemDb(item);
    let items = await fetchInventoryItemsDb();
    expect(items.find(i => i.id === 'inv-test-2')).toBeTruthy();

    await deleteInventoryItemDb('inv-test-2');
    items = await fetchInventoryItemsDb();
    expect(items.find(i => i.id === 'inv-test-2')).toBeFalsy();
  });
});
