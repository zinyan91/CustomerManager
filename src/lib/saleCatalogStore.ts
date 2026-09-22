import type { SaleItem } from '../types/documents';
import { supabase } from './supabase';

export interface SaleCatalogProfile {
  id: string;
  name: string;
  category: string;
  isBuiltin?: boolean;
  items: SaleItem[];
}

export const BUILTIN_SALE_CATALOGS: SaleCatalogProfile[] = [
  {
    id: 'spa-cosmetics',
    name: '💆 Spa & Mỹ Phẩm Làm Đẹp',
    category: 'Mỹ phẩm / Spa',
    isBuiltin: true,
    items: [
      { id: 'spa-1', name: 'Dầu gội phục hồi Keratin', unit: 'Chai', quantity: 100, price: 250000 },
      { id: 'spa-2', name: 'Dầu xả chuyên dụng Salon', unit: 'Chai', quantity: 120, price: 250000 },
      { id: 'spa-3', name: 'Thuốc nhuộm tóc cao cấp', unit: 'Tuýp', quantity: 120, price: 120000 },
      { id: 'spa-4', name: 'Thuốc uốn tóc Collagen', unit: 'Lọ', quantity: 100, price: 150000 },
      { id: 'spa-5', name: 'Thuốc duỗi tóc siêu mượt', unit: 'Lọ', quantity: 120, price: 180000 },
      { id: 'spa-6', name: 'Hấp dầu / kem ủ tóc phục hồi', unit: 'Hũ', quantity: 250, price: 350000 },
      { id: 'spa-7', name: 'Serum dưỡng tóc Argan Oil', unit: 'Chai', quantity: 250, price: 450000 },
      { id: 'spa-8', name: 'Gôm xịt tóc giữ nếp cứng', unit: 'Chai', quantity: 260, price: 120000 },
      { id: 'spa-9', name: 'Lược chải tóc chuyên dụng', unit: 'Cái', quantity: 260, price: 50000 },
      { id: 'spa-10', name: 'Sữa rửa mặt tạo bọt dưỡng ẩm', unit: 'Tuýp', quantity: 170, price: 200000 },
      { id: 'spa-11', name: 'Toner cân bằng & dịu da', unit: 'Chai', quantity: 200, price: 380000 },
      { id: 'spa-12', name: 'Serum dưỡng trắng & mờ thâm', unit: 'Chai', quantity: 230, price: 380000 },
      { id: 'spa-13', name: 'Mặt nạ tế bào gốc dưỡng ẩm sâu', unit: 'Hộp', quantity: 230, price: 200000 },
    ],
  },
  {
    id: 'wood-furniture',
    name: '🪵 Xưởng Gỗ & Đồ Gỗ Nội Thất',
    category: 'Gỗ / Nội thất',
    isBuiltin: true,
    items: [
      { id: 'wood-1', name: 'Gỗ Gõ Đỏ xẻ phách sấy khô', unit: 'm³', quantity: 12, price: 38000000 },
      { id: 'wood-2', name: 'Gỗ Sồi Trắng nhập khẩu (White Oak)', unit: 'm³', quantity: 18, price: 22500000 },
      { id: 'wood-3', name: 'Bộ bàn ghế phòng khách sofa gỗ Gõ Đỏ (6 món)', unit: 'Bộ', quantity: 2, price: 68000000 },
      { id: 'wood-4', name: 'Bộ bàn ăn 8 ghế gỗ Căm Xe mặt liền', unit: 'Bộ', quantity: 3, price: 35000000 },
      { id: 'wood-5', name: 'Giường ngủ 1m8 x 2m gỗ Sồi Nga cao cấp', unit: 'Cái', quantity: 5, price: 12500000 },
      { id: 'wood-6', name: 'Tủ quần áo 4 cánh gỗ Gõ Đỏ nguyên khối', unit: 'Cái', quantity: 3, price: 28000000 },
      { id: 'wood-7', name: 'Kệ tivi phòng khách 2m2 gỗ Hương Đá', unit: 'Cái', quantity: 4, price: 14500000 },
      { id: 'wood-8', name: 'Tủ thờ gia tiên gỗ Mít ta chạm rồng', unit: 'Cái', quantity: 2, price: 24000000 },
    ],
  },
  {
    id: 'grocery-supermarket',
    name: '🛒 Cửa Hàng Tạp Hóa & Siêu Thị Mini',
    category: 'Bách hóa / Tiêu dùng',
    isBuiltin: true,
    items: [
      { id: 'groc-1', name: 'Gạo ST25 Ông Cua chính hãng', unit: 'Bao 25kg', quantity: 150, price: 850000 },
      { id: 'groc-2', name: 'Dầu ăn thực vật cao cấp Simply 5L', unit: 'Thùng 4 can', quantity: 80, price: 920000 },
      { id: 'groc-3', name: 'Nước mắm Nam Ngư Đệ Nhị 900ml', unit: 'Thùng 15 chai', quantity: 60, price: 360000 },
      { id: 'groc-4', name: 'Bia Heineken Silver 330ml', unit: 'Thùng 24 lon', quantity: 120, price: 435000 },
      { id: 'groc-5', name: 'Bia Tiger Crystal 330ml', unit: 'Thùng 24 lon', quantity: 150, price: 395000 },
      { id: 'groc-6', name: 'Sữa tươi tiệt trùng Vinamilk có đường 1L', unit: 'Thùng 12 hộp', quantity: 70, price: 390000 },
      { id: 'groc-7', name: 'Bột ngọt Vedan gói 1kg', unit: 'Gói', quantity: 200, price: 58000 },
      { id: 'groc-8', name: 'Đường tinh luyện Biên Hòa Pure 1kg', unit: 'Thùng 20 gói', quantity: 50, price: 520000 },
      { id: 'groc-9', name: 'Nước giặt OMO Matic cửa trước túi 3.6kg', unit: 'Thùng 4 túi', quantity: 60, price: 680000 },
      { id: 'groc-10', name: 'Nước xả vải Comfort đậm đặc túi 3.2L', unit: 'Thùng 4 túi', quantity: 50, price: 640000 },
    ],
  },
  {
    id: 'building-materials',
    name: '🧱 Vật Liệu Xây Dựng & Sắt Thép',
    category: 'Vật liệu xây dựng',
    isBuiltin: true,
    items: [
      { id: 'vlxd-1', name: 'Xi măng Hà Tiên PCB40 đa dụng', unit: 'Tấn (20 bao)', quantity: 30, price: 1850000 },
      { id: 'vlxd-2', name: 'Thép cuộn Pomina Ø6/Ø8', unit: 'Tấn', quantity: 10, price: 15800000 },
      { id: 'vlxd-3', name: 'Thép cây gân Pomina D10 (Cây 11.7m)', unit: 'Cây', quantity: 350, price: 118000 },
      { id: 'vlxd-4', name: 'Thép cây gân Pomina D16 (Cây 11.7m)', unit: 'Cây', quantity: 200, price: 305000 },
      { id: 'vlxd-5', name: 'Cát vàng xây tô sàng kỹ loại 1', unit: 'm³', quantity: 80, price: 380000 },
      { id: 'vlxd-6', name: 'Đá 1x2 xanh Đồng Nai', unit: 'm³', quantity: 60, price: 450000 },
      { id: 'vlxd-7', name: 'Gạch ống Tuynel 4 lỗ 8x8x18cm', unit: 'Thiên (1.000 v)', quantity: 25, price: 1250000 },
      { id: 'vlxd-8', name: 'Sơn nước lót ngoại thất chống kiềm Dulux Weathershield 18L', unit: 'Thùng', quantity: 15, price: 2650000 },
    ],
  },
  {
    id: 'agriculture-feed',
    name: '🌾 Nông Sản & Thức Ăn Chăn Nuôi',
    category: 'Nông nghiệp / Thức ăn chăn nuôi',
    isBuiltin: true,
    items: [
      { id: 'agri-1', name: 'Cám hỗn hợp cho heo thịt vỗ béo C.P 954', unit: 'Bao 25kg', quantity: 200, price: 345000 },
      { id: 'agri-2', name: 'Cám gà thịt cao cấp Cargill 5111', unit: 'Bao 25kg', quantity: 150, price: 325000 },
      { id: 'agri-3', name: 'Thức ăn cho vịt đẻ trứng GreenFeed 321', unit: 'Bao 25kg', quantity: 120, price: 310000 },
      { id: 'agri-4', name: 'Bắp hạt sấy khô loại 1 nhập khẩu', unit: 'Tấn', quantity: 15, price: 7600000 },
      { id: 'agri-5', name: 'Khô đậu tương ép viên giàu đạm (Đậu nành)', unit: 'Tấn', quantity: 10, price: 13500000 },
      { id: 'agri-6', name: 'Phân bón NPK Đầu Trâu 20-20-15+TE', unit: 'Bao 50kg', quantity: 80, price: 920000 },
      { id: 'agri-7', name: 'Phân bón đạm Urê Hạt Trong Cà Mau', unit: 'Bao 50kg', quantity: 60, price: 580000 },
    ],
  },
];

const STORAGE_KEY = 'CUSTOMER_MANAGER_SALE_CATALOGS_V1';

function getStorage(): Storage | null {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

export function loadSaleCatalogs(): SaleCatalogProfile[] {
  const storage = getStorage();
  if (!storage) return BUILTIN_SALE_CATALOGS;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      storage.setItem(STORAGE_KEY, JSON.stringify(BUILTIN_SALE_CATALOGS));
      return BUILTIN_SALE_CATALOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load sale catalogs from storage:', err);
  }
  return BUILTIN_SALE_CATALOGS;
}

export function saveSaleCatalog(profile: SaleCatalogProfile): SaleCatalogProfile[] {
  const current = loadSaleCatalogs();
  const existingIdx = current.findIndex(c => c.id === profile.id);

  let updated: SaleCatalogProfile[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = profile;
  } else {
    updated = [profile, ...current];
  }

  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Đồng bộ lên Supabase Cloud trong background (non-blocking)
  saveSaleCatalogToCloud(profile).catch(err => {
    console.warn('Lưu Supabase sale catalog background:', err);
  });

  return updated;
}

export function deleteSaleCatalog(id: string): SaleCatalogProfile[] {
  const current = loadSaleCatalogs();
  const updated = current.filter(c => c.id !== id);
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Xóa trên Supabase Cloud trong background
  deleteSaleCatalogFromCloud(id).catch(err => {
    console.warn('Xóa Supabase sale catalog background:', err);
  });

  return updated;
}

export function resetSaleCatalogs(): SaleCatalogProfile[] {
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(BUILTIN_SALE_CATALOGS));
  }
  return BUILTIN_SALE_CATALOGS;
}

// --- Cloud Sync Helpers (Supabase PostgreSQL) ---

export async function fetchSaleCatalogsFromCloud(): Promise<SaleCatalogProfile[]> {
  try {
    const { data, error } = await supabase
      .from('SaleCatalogProfiles')
      .select('*')
      .order('CreatedAt', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return loadSaleCatalogs();

    const cloudList: SaleCatalogProfile[] = data.map(row => ({
      id: row.Id,
      name: row.Name,
      category: row.Category,
      isBuiltin: row.IsBuiltin,
      items: Array.isArray(row.Items) ? row.Items : [],
    }));

    // Hợp nhất dữ liệu đám mây với các mẫu mặc định
    const currentLocal = loadSaleCatalogs();
    const mergedMap = new Map<string, SaleCatalogProfile>();

    // Nạp builtin trước
    BUILTIN_SALE_CATALOGS.forEach(c => mergedMap.set(c.id, c));
    // Nạp local
    currentLocal.forEach(c => mergedMap.set(c.id, c));
    // Nạp cloud đè lên
    cloudList.forEach(c => mergedMap.set(c.id, c));

    const finalMerged = Array.from(mergedMap.values());
    const storage = getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(finalMerged));
    }
    return finalMerged;
  } catch (err) {
    console.warn('fetchSaleCatalogsFromCloud fallback to local:', err);
    return loadSaleCatalogs();
  }
}

export async function saveSaleCatalogToCloud(profile: SaleCatalogProfile): Promise<void> {
  try {
    const payload = {
      Id: profile.id,
      Name: profile.name,
      Category: profile.category,
      IsBuiltin: profile.isBuiltin ?? false,
      Items: profile.items,
      UpdatedAt: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('SaleCatalogProfiles')
      .upsert([payload]);
    if (error) throw error;
  } catch (err) {
    console.warn('saveSaleCatalogToCloud error:', err);
  }
}

export async function deleteSaleCatalogFromCloud(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('SaleCatalogProfiles')
      .delete()
      .eq('Id', id);
    if (error) throw error;
  } catch (err) {
    console.warn('deleteSaleCatalogFromCloud error:', err);
  }
}
