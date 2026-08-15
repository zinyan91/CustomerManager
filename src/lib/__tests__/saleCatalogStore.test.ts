import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSaleCatalogs,
  saveSaleCatalog,
  deleteSaleCatalog,
  resetSaleCatalogs,
  BUILTIN_SALE_CATALOGS,
  type SaleCatalogProfile,
} from '../saleCatalogStore';

describe('saleCatalogStore', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k in store) delete store[k];
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
      length: 0,
      key: () => null,
    };
  });

  it('loads builtin catalogs when storage is empty', () => {
    const list = loadSaleCatalogs();
    expect(list.length).toBe(BUILTIN_SALE_CATALOGS.length);
    expect(list.some(c => c.id === 'wood-furniture')).toBe(true);
    expect(list.some(c => c.id === 'grocery-supermarket')).toBe(true);
    expect(list.some(c => c.id === 'spa-cosmetics')).toBe(true);
    expect(list.some(c => c.id === 'building-materials')).toBe(true);
    expect(list.some(c => c.id === 'agriculture-feed')).toBe(true);
  });

  it('can add a new custom catalog profile', () => {
    const custom: SaleCatalogProfile = {
      id: 'custom-hardware-store',
      name: '🔩 Cửa Hàng Kim Khí & Điện Nước',
      category: 'Kim khí',
      items: [
        { id: 'h-1', name: 'Máy khoan bê tông Bosch', unit: 'Bộ', quantity: 5, price: 2100000 },
        { id: 'h-2', name: 'Ống nhựa Tiền Phong D90', unit: 'Cây 4m', quantity: 50, price: 145000 },
      ],
    };

    const updated = saveSaleCatalog(custom);
    expect(updated.some(c => c.id === 'custom-hardware-store')).toBe(true);

    const reloaded = loadSaleCatalogs();
    const found = reloaded.find(c => c.id === 'custom-hardware-store');
    expect(found).toBeDefined();
    expect(found?.items.length).toBe(2);
    expect(found?.items[0].name).toBe('Máy khoan bê tông Bosch');
  });

  it('can update an existing catalog profile', () => {
    const custom: SaleCatalogProfile = {
      id: 'custom-clothing',
      name: '👗 Shop Quần Áo Thời Trang',
      category: 'May mặc',
      items: [
        { id: 'c-1', name: 'Áo thun cotton', unit: 'Cái', quantity: 100, price: 150000 },
      ],
    };
    saveSaleCatalog(custom);

    // Update with more items
    const updatedCustom: SaleCatalogProfile = {
      ...custom,
      name: '👗 Shop Thời Trang Nam Nữ',
      items: [
        ...custom.items,
        { id: 'c-2', name: 'Quần jeans co giãn', unit: 'Cái', quantity: 80, price: 320000 },
      ],
    };
    const afterUpdate = saveSaleCatalog(updatedCustom);
    const found = afterUpdate.find(c => c.id === 'custom-clothing');
    expect(found?.name).toBe('👗 Shop Thời Trang Nam Nữ');
    expect(found?.items.length).toBe(2);
  });

  it('can delete a custom catalog', () => {
    const custom: SaleCatalogProfile = {
      id: 'to-delete',
      name: 'Tạm',
      category: 'Khác',
      items: [],
    };
    saveSaleCatalog(custom);
    expect(loadSaleCatalogs().some(c => c.id === 'to-delete')).toBe(true);

    deleteSaleCatalog('to-delete');
    expect(loadSaleCatalogs().some(c => c.id === 'to-delete')).toBe(false);
  });

  it('can reset to builtin defaults', () => {
    saveSaleCatalog({ id: 'temp-1', name: 'Temp', category: 'Temp', items: [] });
    expect(loadSaleCatalogs().length).toBe(BUILTIN_SALE_CATALOGS.length + 1);

    const resetList = resetSaleCatalogs();
    expect(resetList.length).toBe(BUILTIN_SALE_CATALOGS.length);
    expect(loadSaleCatalogs().some(c => c.id === 'temp-1')).toBe(false);
  });
});
