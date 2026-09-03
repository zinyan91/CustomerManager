import { useState, useEffect, useCallback } from 'react';
import {
  type ShoppingPreset,
  type ShoppingFloor,
  type ShoppingRoom,
  type ShoppingItem,
  type CatalogItem,
  DEFAULT_PRESET,
  DEFAULT_CATALOG_ITEMS,
} from '../lib/shoppingChecklist';

const STORAGE_ACTIVE_PRESET = 'cm_shopping_active_preset_v1';
const STORAGE_PRESETS_LIST = 'cm_shopping_presets_list_v1';
const STORAGE_CATALOG = 'cm_shopping_catalog_v1';

export function useShoppingChecklist() {
  const [preset, setPreset] = useState<ShoppingPreset>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_PRESET);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_PRESET;
  });

  const [savedPresets, setSavedPresets] = useState<ShoppingPreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PRESETS_LIST);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [DEFAULT_PRESET];
  });

  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CATALOG);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_CATALOG_ITEMS;
  });

  // Auto-save active preset
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_PRESET, JSON.stringify(preset));
    } catch {
      // ignore
    }
  }, [preset]);

  // Auto-save presets list
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRESETS_LIST, JSON.stringify(savedPresets));
    } catch {
      // ignore
    }
  }, [savedPresets]);

  // Auto-save catalog
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CATALOG, JSON.stringify(catalog));
    } catch {
      // ignore
    }
  }, [catalog]);

  // --- PRESET ACTIONS ---
  const updatePresetName = useCallback((name: string) => {
    setPreset(prev => ({ ...prev, name, updatedAt: new Date().toISOString() }));
  }, []);

  const saveCurrentPreset = useCallback((name: string, description?: string) => {
    const newPreset: ShoppingPreset = {
      ...preset,
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim() || preset.name,
      description: description || preset.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSavedPresets(prev => [newPreset, ...prev.filter(p => p.id !== newPreset.id)]);
    setPreset(newPreset);
    return newPreset;
  }, [preset]);

  const loadPreset = useCallback((presetId: string) => {
    const found = savedPresets.find(p => p.id === presetId);
    if (found) {
      setPreset(JSON.parse(JSON.stringify(found)));
    }
  }, [savedPresets]);

  const deletePreset = useCallback((presetId: string) => {
    setSavedPresets(prev => prev.filter(p => p.id !== presetId));
  }, []);

  const resetToDefault = useCallback(() => {
    setPreset(JSON.parse(JSON.stringify(DEFAULT_PRESET)));
  }, []);

  // --- FLOOR ACTIONS ---
  const addFloor = useCallback((name?: string) => {
    setPreset(prev => {
      const floorCount = prev.floors.length;
      const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][floorCount] || `${floorCount + 1}`;
      const newFloor: ShoppingFloor = {
        id: `floor_${Date.now()}`,
        name: name?.trim() || `${roman}. Tầng ${floorCount + 1}`,
        rooms: [
          {
            id: `room_${Date.now()}_1`,
            name: '1. Phòng chính',
            items: [],
          },
        ],
      };
      return {
        ...prev,
        floors: [...prev.floors, newFloor],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const updateFloorName = useCallback((floorId: string, name: string) => {
    setPreset(prev => ({
      ...prev,
      floors: prev.floors.map(f => (f.id === floorId ? { ...f, name } : f)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeFloor = useCallback((floorId: string) => {
    setPreset(prev => ({
      ...prev,
      floors: prev.floors.filter(f => f.id !== floorId),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // --- ROOM ACTIONS ---
  const addRoom = useCallback((floorId: string, name?: string) => {
    setPreset(prev => ({
      ...prev,
      floors: prev.floors.map(f => {
        if (f.id !== floorId) return f;
        const newRoom: ShoppingRoom = {
          id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: name?.trim() || `${f.rooms.length + 1}. Phòng mới`,
          items: [],
        };
        return {
          ...f,
          rooms: [...f.rooms, newRoom],
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateRoomName = useCallback((floorId: string, roomId: string, name: string) => {
    setPreset(prev => ({
      ...prev,
      floors: prev.floors.map(f => {
        if (f.id !== floorId) return f;
        return {
          ...f,
          rooms: f.rooms.map(r => (r.id === roomId ? { ...r, name } : r)),
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeRoom = useCallback((floorId: string, roomId: string) => {
    setPreset(prev => ({
      ...prev,
      floors: prev.floors.map(f => {
        if (f.id !== floorId) return f;
        return {
          ...f,
          rooms: f.rooms.filter(r => r.id !== roomId),
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // --- ITEM ACTIONS ---
  const addItem = useCallback((floorId: string, roomId: string, init?: Partial<ShoppingItem>) => {
    const newItem: ShoppingItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: init?.name || '',
      unit: init?.unit || 'Bộ/Cái',
      quantity: init?.quantity !== undefined ? init.quantity : 1,
      unitPrice: init?.unitPrice !== undefined ? init.unitPrice : 0,
      note: init?.note || '',
    };
    setPreset(prev => ({
      ...prev,
      floors: prev.floors.map(f => {
        if (f.id !== floorId) return f;
        return {
          ...f,
          rooms: f.rooms.map(r => {
            if (r.id !== roomId) return r;
            return {
              ...r,
              items: [...r.items, newItem],
            };
          }),
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateItem = useCallback(
    (floorId: string, roomId: string, itemId: string, patch: Partial<ShoppingItem>) => {
      setPreset(prev => ({
        ...prev,
        floors: prev.floors.map(f => {
          if (f.id !== floorId) return f;
          return {
            ...f,
            rooms: f.rooms.map(r => {
              if (r.id !== roomId) return r;
              return {
                ...r,
                items: r.items.map(it => (it.id === itemId ? { ...it, ...patch } : it)),
              };
            }),
          };
        }),
        updatedAt: new Date().toISOString(),
      }));
    },
    []
  );

  const removeItem = useCallback((floorId: string, roomId: string, itemId: string) => {
    setPreset(prev => ({
      ...prev,
      floors: prev.floors.map(f => {
        if (f.id !== floorId) return f;
        return {
          ...f,
          rooms: f.rooms.map(r => {
            if (r.id !== roomId) return r;
            return {
              ...r,
              items: r.items.filter(it => it.id !== itemId),
            };
          }),
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const addItemsFromCatalog = useCallback(
    (floorId: string, roomId: string, items: CatalogItem[]) => {
      const newItems: ShoppingItem[] = items.map(cat => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: cat.name,
        unit: cat.unit || 'Bộ/Cái',
        quantity: 1,
        unitPrice: cat.defaultPrice || 0,
        note: cat.note || '',
      }));

      setPreset(prev => ({
        ...prev,
        floors: prev.floors.map(f => {
          if (f.id !== floorId) return f;
          return {
            ...f,
            rooms: f.rooms.map(r => {
              if (r.id !== roomId) return r;
              return {
                ...r,
                items: [...r.items, ...newItems],
              };
            }),
          };
        }),
        updatedAt: new Date().toISOString(),
      }));
    },
    []
  );

  // --- CATALOG ACTIONS ---
  const addCatalogItem = useCallback((item: Omit<CatalogItem, 'id'>) => {
    const newItem: CatalogItem = {
      ...item,
      id: `cat_${Date.now()}`,
    };
    setCatalog(prev => [newItem, ...prev]);
    return newItem;
  }, []);

  const updateCatalogItem = useCallback((id: string, patch: Partial<CatalogItem>) => {
    setCatalog(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const removeCatalogItem = useCallback((id: string) => {
    setCatalog(prev => prev.filter(c => c.id !== id));
  }, []);

  return {
    preset,
    savedPresets,
    catalog,
    // Preset
    updatePresetName,
    saveCurrentPreset,
    loadPreset,
    deletePreset,
    resetToDefault,
    // Floors
    addFloor,
    updateFloorName,
    removeFloor,
    // Rooms
    addRoom,
    updateRoomName,
    removeRoom,
    // Items
    addItem,
    updateItem,
    removeItem,
    addItemsFromCatalog,
    // Catalog
    addCatalogItem,
    updateCatalogItem,
    removeCatalogItem,
  };
}
