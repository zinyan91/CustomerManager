import { describe, it, expect } from 'vitest';
import {
  computeItemAmount,
  computeRoomTotal,
  computeFloorTotal,
  computePresetTotal,
  countPresetItems,
  DEFAULT_PRESET,
  DEFAULT_CATALOG_ITEMS,
  type ShoppingPreset,
} from '../shoppingChecklist';

describe('Shopping Checklist Logic & Seed Data', () => {
  it('correctly computes item, room, floor and preset totals', () => {
    const mockPreset: ShoppingPreset = {
      id: 'test_p',
      name: 'Test Preset',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      floors: [
        {
          id: 'f1',
          name: 'Tầng 1',
          rooms: [
            {
              id: 'r1',
              name: 'Phòng khách',
              items: [
                { id: 'i1', name: 'Sofa', unit: 'Bộ', quantity: 1, unitPrice: 50000000 },
                { id: 'i2', name: 'Bàn trà', unit: 'Cái', quantity: 2, unitPrice: 10000000 },
              ],
            },
          ],
        },
      ],
    };

    expect(computeItemAmount(mockPreset.floors[0].rooms[0].items[0])).toBe(50000000);
    expect(computeItemAmount(mockPreset.floors[0].rooms[0].items[1])).toBe(20000000);
    expect(computeRoomTotal(mockPreset.floors[0].rooms[0])).toBe(70000000);
    expect(computeFloorTotal(mockPreset.floors[0])).toBe(70000000);
    expect(computePresetTotal(mockPreset)).toBe(70000000);
    expect(countPresetItems(mockPreset)).toBe(2);
  });

  it('has valid DEFAULT_PRESET loaded from the user Excel file', () => {
    expect(DEFAULT_PRESET.floors.length).toBe(4);
    const totalItems = countPresetItems(DEFAULT_PRESET);
    expect(totalItems).toBeGreaterThan(50);
    const grandTotal = computePresetTotal(DEFAULT_PRESET);
    expect(grandTotal).toBeGreaterThan(3000000000); // Over 3 billion VND
  });

  it('has preloaded DEFAULT_CATALOG_ITEMS with categorized items', () => {
    expect(DEFAULT_CATALOG_ITEMS.length).toBeGreaterThan(50);
    const categories = new Set(DEFAULT_CATALOG_ITEMS.map(i => i.category));
    expect(categories.has('Phòng khách')).toBe(true);
    expect(categories.has('Bếp & Phòng ăn')).toBe(true);
    expect(categories.has('Phòng ngủ')).toBe(true);
    expect(categories.has('Sân thượng & Cây cảnh')).toBe(true);
  });
});
