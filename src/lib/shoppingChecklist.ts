// Generated data model for Shopping / FF&E Procurement Checklist
export interface ShoppingItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  note?: string;
}

export interface ShoppingRoom {
  id: string;
  name: string;
  items: ShoppingItem[];
}

export interface ShoppingFloor {
  id: string;
  name: string;
  rooms: ShoppingRoom[];
}

export interface ShoppingPreset {
  id: string;
  name: string;
  description?: string;
  floors: ShoppingFloor[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  defaultPrice: number;
  note?: string;
}

export function computeItemAmount(item: ShoppingItem): number {
  return (item.quantity || 0) * (item.unitPrice || 0);
}

export function computeRoomTotal(room: ShoppingRoom): number {
  return room.items.reduce((sum, it) => sum + computeItemAmount(it), 0);
}

export function computeFloorTotal(floor: ShoppingFloor): number {
  return floor.rooms.reduce((sum, r) => sum + computeRoomTotal(r), 0);
}

export function computePresetTotal(preset: ShoppingPreset): number {
  return preset.floors.reduce((sum, f) => sum + computeFloorTotal(f), 0);
}

export function countPresetItems(preset: ShoppingPreset): number {
  return preset.floors.reduce(
    (fSum, f) => fSum + f.rooms.reduce((rSum, r) => rSum + r.items.length, 0),
    0
  );
}

export const DEFAULT_CATALOG_ITEMS: CatalogItem[] = [
  {
    "id": "cat_1",
    "code": "VT-002",
    "name": "Bộ Sofa Đỉnh Đào Gỗ Gõ 10 Món Tay 14",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 180000000,
    "note": ""
  },
  {
    "id": "cat_2",
    "code": "VT-003",
    "name": "Bàn trà gỗ Óc Chó",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 62000000,
    "note": ""
  },
  {
    "id": "cat_3",
    "code": "VT-004",
    "name": "Kệ tivi gỗ Gõ đỏ",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 42000000,
    "note": ""
  },
  {
    "id": "cat_4",
    "code": "VT-005",
    "name": "Tủ rượu trang trí",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 105000000,
    "note": ""
  },
  {
    "id": "cat_5",
    "code": "VT-006",
    "name": "Vách lam gỗ trang trí",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 55000000,
    "note": ""
  },
  {
    "id": "cat_6",
    "code": "VT-007",
    "name": "Tủ giày gỗ Sồi",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 15000000,
    "note": ""
  },
  {
    "id": "cat_7",
    "code": "VT-008",
    "name": "Bàn console + gương",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 22000000,
    "note": ""
  },
  {
    "id": "cat_8",
    "code": "VT-009",
    "name": "Kệ trang trí treo tường",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 12500000,
    "note": ""
  },
  {
    "id": "cat_9",
    "code": "VT-010",
    "name": "Tủ hộc lưu trữ nhỏ",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 15000000,
    "note": ""
  },
  {
    "id": "cat_10",
    "code": "VT-011",
    "name": "4 ghế đơn gỗ (phụ)",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 5500000,
    "note": ""
  },
  {
    "id": "cat_11",
    "code": "VT-012",
    "name": "Bàn thờ gỗ Gõ 1m8",
    "category": "Phòng thờ",
    "unit": "Bộ/Cái",
    "defaultPrice": 65000000,
    "note": ""
  },
  {
    "id": "cat_12",
    "code": "VT-013",
    "name": "Tủ bếp trên + dưới gỗ MDF chống ẩm phủ Melamine",
    "category": "Bếp & Phòng ăn",
    "unit": "Bộ/Cái",
    "defaultPrice": 90000000,
    "note": ""
  },
  {
    "id": "cat_13",
    "code": "VT-014",
    "name": "Mặt bếp đá + ốp tường",
    "category": "Bếp & Phòng ăn",
    "unit": "Bộ/Cái",
    "defaultPrice": 25000000,
    "note": ""
  },
  {
    "id": "cat_14",
    "code": "VT-015",
    "name": "Bàn ăn gỗ Sồi 6 ghế",
    "category": "Bếp & Phòng ăn",
    "unit": "Bộ/Cái",
    "defaultPrice": 28000000,
    "note": ""
  },
  {
    "id": "cat_15",
    "code": "VT-016",
    "name": "Tủ lạnh bọc gỗ + khung trang trí",
    "category": "Bếp & Phòng ăn",
    "unit": "Bộ/Cái",
    "defaultPrice": 15000000,
    "note": ""
  },
  {
    "id": "cat_16",
    "code": "VT-017",
    "name": "Tủ kho đồ khô",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 20000000,
    "note": ""
  },
  {
    "id": "cat_17",
    "code": "VT-018",
    "name": "Tủ bếp mini tầng trệt",
    "category": "Bếp & Phòng ăn",
    "unit": "Bộ/Cái",
    "defaultPrice": 7000000,
    "note": ""
  },
  {
    "id": "cat_18",
    "code": "VT-019",
    "name": "Hệ vách gỗ trang trí + led",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 25000000,
    "note": ""
  },
  {
    "id": "cat_19",
    "code": "VT-020",
    "name": "Bàn đảo bếp nhỏ",
    "category": "Bếp & Phòng ăn",
    "unit": "Bộ/Cái",
    "defaultPrice": 40000000,
    "note": ""
  },
  {
    "id": "cat_20",
    "code": "VT-021",
    "name": "Tủ rượu treo + kệ ly",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 12000000,
    "note": ""
  },
  {
    "id": "cat_21",
    "code": "VT-022",
    "name": "Ghế bar",
    "category": "Bếp & Phòng ăn",
    "unit": "Bộ/Cái",
    "defaultPrice": 2800000,
    "note": ""
  },
  {
    "id": "cat_22",
    "code": "VT-023",
    "name": "Bàn Ăn Gỗ Gõ CN 8 Ghế",
    "category": "Bếp & Phòng ăn",
    "unit": "Bộ/Cái",
    "defaultPrice": 35000000,
    "note": ""
  },
  {
    "id": "cat_23",
    "code": "VT-024",
    "name": "Giường gỗ bọc nệm Óc Chó 1m8",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 75000000,
    "note": ""
  },
  {
    "id": "cat_24",
    "code": "VT-025",
    "name": "Tủ áo gỗ MDF chống ẩm phủ Acrylic – full tường",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 90000000,
    "note": ""
  },
  {
    "id": "cat_25",
    "code": "VT-026",
    "name": "Bàn trang điểm + gương",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 18000000,
    "note": ""
  },
  {
    "id": "cat_26",
    "code": "VT-027",
    "name": "Tab đầu giường",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 6500000,
    "note": ""
  },
  {
    "id": "cat_27",
    "code": "VT-028",
    "name": "Kệ tivi gỗ",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 18000000,
    "note": ""
  },
  {
    "id": "cat_28",
    "code": "VT-029",
    "name": "Tủ sách + kệ trang trí",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 30000000,
    "note": ""
  },
  {
    "id": "cat_29",
    "code": "VT-030",
    "name": "Bàn làm việc gỗ",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 22000000,
    "note": ""
  },
  {
    "id": "cat_30",
    "code": "VT-031",
    "name": "Tủ âm tường chứa vali",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 25000000,
    "note": ""
  },
  {
    "id": "cat_31",
    "code": "VT-032",
    "name": "Vách ốp gỗ sau giường",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 45000000,
    "note": ""
  },
  {
    "id": "cat_32",
    "code": "VT-033",
    "name": "Tủ WC trong phòng (gỗ + kính)",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 25000000,
    "note": ""
  },
  {
    "id": "cat_33",
    "code": "VT-034",
    "name": "Bàn đảo mini + ghế (phòng lớn)",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 25000000,
    "note": ""
  },
  {
    "id": "cat_34",
    "code": "VT-035",
    "name": "Kệ giày nhỏ",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 4500000,
    "note": ""
  },
  {
    "id": "cat_35",
    "code": "VT-036",
    "name": "Kệ gỗ treo tường",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 5000000,
    "note": ""
  },
  {
    "id": "cat_36",
    "code": "VT-037",
    "name": "Tủ trưng bày trang trí",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 25000000,
    "note": ""
  },
  {
    "id": "cat_37",
    "code": "VT-038",
    "name": "Bàn sofa mini",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 15000000,
    "note": ""
  },
  {
    "id": "cat_38",
    "code": "VT-039",
    "name": "Vách gỗ trang trí",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 20000000,
    "note": ""
  },
  {
    "id": "cat_39",
    "code": "VT-040",
    "name": "Tủ áo Acrylic full tường",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 75000000,
    "note": ""
  },
  {
    "id": "cat_40",
    "code": "VT-041",
    "name": "Bàn trang điểm",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 15000000,
    "note": ""
  },
  {
    "id": "cat_41",
    "code": "VT-042",
    "name": "Kệ tivi",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 15000000,
    "note": ""
  },
  {
    "id": "cat_42",
    "code": "VT-043",
    "name": "Bàn học/làm việc",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 20000000,
    "note": ""
  },
  {
    "id": "cat_43",
    "code": "VT-044",
    "name": "Tủ sách",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 18000000,
    "note": ""
  },
  {
    "id": "cat_44",
    "code": "VT-045",
    "name": "Hệ vách ốp gỗ",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 40000000,
    "note": ""
  },
  {
    "id": "cat_45",
    "code": "VT-046",
    "name": "Tủ giày",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 5500000,
    "note": ""
  },
  {
    "id": "cat_46",
    "code": "VT-047",
    "name": "Tủ trang trí",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 22000000,
    "note": ""
  },
  {
    "id": "cat_47",
    "code": "VT-048",
    "name": "Tủ WC",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 22000000,
    "note": ""
  },
  {
    "id": "cat_48",
    "code": "VT-049",
    "name": "Sofa đơn + bàn",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 25000000,
    "note": ""
  },
  {
    "id": "cat_49",
    "code": "VT-050",
    "name": "Kệ treo tường",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 4500000,
    "note": ""
  },
  {
    "id": "cat_50",
    "code": "VT-051",
    "name": "Tủ âm tường",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 25000000,
    "note": ""
  },
  {
    "id": "cat_51",
    "code": "VT-052",
    "name": "Tủ đầu hành lang",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 20000000,
    "note": ""
  },
  {
    "id": "cat_52",
    "code": "VT-053",
    "name": "Giường gỗ bọc nệm Óc Chó 1m6",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 55000000,
    "note": ""
  },
  {
    "id": "cat_53",
    "code": "VT-054",
    "name": "Tủ áo MDF 3 cánh",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 32000000,
    "note": ""
  },
  {
    "id": "cat_54",
    "code": "VT-055",
    "name": "Bàn học + kệ sách",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 18000000,
    "note": ""
  },
  {
    "id": "cat_55",
    "code": "VT-056",
    "name": "Tab giường",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 4000000,
    "note": ""
  },
  {
    "id": "cat_56",
    "code": "VT-057",
    "name": "Vách trang trí",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 18000000,
    "note": ""
  },
  {
    "id": "cat_57",
    "code": "VT-058",
    "name": "Tủ treo góc",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 7000000,
    "note": ""
  },
  {
    "id": "cat_58",
    "code": "VT-059",
    "name": "Giường Sồi 1m6",
    "category": "Phòng ngủ",
    "unit": "Bộ/Cái",
    "defaultPrice": 22000000,
    "note": ""
  },
  {
    "id": "cat_59",
    "code": "VT-060",
    "name": "Tủ thờ phụ",
    "category": "Phòng thờ",
    "unit": "Bộ/Cái",
    "defaultPrice": 25000000,
    "note": ""
  },
  {
    "id": "cat_60",
    "code": "VT-061",
    "name": "Vách CNC + gỗ",
    "category": "Phòng khách",
    "unit": "Bộ/Cái",
    "defaultPrice": 25000000,
    "note": ""
  },
  {
    "id": "cat_61",
    "code": "VT-062",
    "name": "Giá kệ đồ thờ",
    "category": "Phòng thờ",
    "unit": "Bộ/Cái",
    "defaultPrice": 12000000,
    "note": ""
  },
  {
    "id": "cat_62",
    "code": "VT-063",
    "name": "Tủ chứa đồ",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 15000000,
    "note": ""
  },
  {
    "id": "cat_63",
    "code": "VT-064",
    "name": "Tủ đồ giặt",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 15000000,
    "note": ""
  },
  {
    "id": "cat_64",
    "code": "VT-065",
    "name": "Tủ kho đồ",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 12000000,
    "note": ""
  },
  {
    "id": "cat_65",
    "code": "VT-066",
    "name": "Bàn ghế ngoài trời – bộ 1",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 30000000,
    "note": ""
  },
  {
    "id": "cat_66",
    "code": "VT-067",
    "name": "Bàn ghế ngoài trời – bộ 2",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 30000000,
    "note": ""
  },
  {
    "id": "cat_67",
    "code": "VT-068",
    "name": "Bàn ghế ngoài trời – bộ 3",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 30000000,
    "note": ""
  },
  {
    "id": "cat_68",
    "code": "VT-069",
    "name": "Bàn ghế ngoài trời – bộ 4",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 30000000,
    "note": ""
  },
  {
    "id": "cat_69",
    "code": "VT-070",
    "name": "Cây cảnh lớn (lưỡi hổ / đa búp đỏ)",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 850000,
    "note": ""
  },
  {
    "id": "cat_70",
    "code": "VT-071",
    "name": "Chậu cây gỗ trang trí",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 1200000,
    "note": ""
  },
  {
    "id": "cat_71",
    "code": "VT-072",
    "name": "Cây dây leo cho giàn sân thượng",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 450000,
    "note": ""
  },
  {
    "id": "cat_72",
    "code": "VT-073",
    "name": "Bộ chậu xi măng nhẹ",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 380000,
    "note": ""
  },
  {
    "id": "cat_73",
    "code": "VT-074",
    "name": "Cây bonsai nhỏ để bàn",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 550000,
    "note": ""
  },
  {
    "id": "cat_74",
    "code": "VT-075",
    "name": "Cây lộc vừng / bằng lăng chậu lớn",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 6500000,
    "note": ""
  },
  {
    "id": "cat_75",
    "code": "VT-076",
    "name": "Cây ăn quả chậu (chanh, tắc, khế…)",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 1200000,
    "note": ""
  },
  {
    "id": "cat_76",
    "code": "VT-077",
    "name": "Cây tùng La Hán trung",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 4500000,
    "note": ""
  },
  {
    "id": "cat_77",
    "code": "VT-078",
    "name": "Chậu hoa theo mùa (hoa giấy, mười giờ…)",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 150000,
    "note": ""
  },
  {
    "id": "cat_78",
    "code": "VT-079",
    "name": "Thảm cỏ nhân tạo cho khu ngồi nghỉ (≈20m²)",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 250000,
    "note": ""
  },
  {
    "id": "cat_79",
    "code": "VT-080",
    "name": "Giàn tre/trúc làm nền cho cây leo",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 6500000,
    "note": ""
  },
  {
    "id": "cat_80",
    "code": "VT-081",
    "name": "Cây sanh bonsai mini",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 2800000,
    "note": ""
  },
  {
    "id": "cat_81",
    "code": "VT-082",
    "name": "Cây cau nhật (hàng cao)",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 1100000,
    "note": ""
  },
  {
    "id": "cat_82",
    "code": "VT-083",
    "name": "Cây trúc quân tử loại lớn",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 1900000,
    "note": ""
  },
  {
    "id": "cat_83",
    "code": "VT-084",
    "name": "Cây phong thủy kim ngân gốc to",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 2600000,
    "note": ""
  },
  {
    "id": "cat_84",
    "code": "VT-085",
    "name": "Cây dương xỉ Úc (treo tường)",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 250000,
    "note": ""
  },
  {
    "id": "cat_85",
    "code": "VT-086",
    "name": "Combo hoa leo (hoa hồng leo / hoa giấy Nhật)",
    "category": "Khác",
    "unit": "Bộ/Cái",
    "defaultPrice": 450000,
    "note": ""
  },
  {
    "id": "cat_86",
    "code": "VT-087",
    "name": "Cây chuối rẻ quạt trang trí",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 3800000,
    "note": ""
  },
  {
    "id": "cat_87",
    "code": "VT-088",
    "name": "Bộ 10 chậu sứ men xanh cao cấp",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 3500000,
    "note": ""
  },
  {
    "id": "cat_88",
    "code": "VT-089",
    "name": "Cây hồng môn + tiểu cảnh nước mini",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 4800000,
    "note": ""
  },
  {
    "id": "cat_89",
    "code": "VT-090",
    "name": "3 đĩa tiểu cảnh rêu đá",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 650000,
    "note": ""
  },
  {
    "id": "cat_90",
    "code": "VT-091",
    "name": "Cây trầu bà leo cột",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 380000,
    "note": ""
  },
  {
    "id": "cat_91",
    "code": "VT-092",
    "name": "Cây monstera lá xé loại lớn",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 2200000,
    "note": ""
  },
  {
    "id": "cat_92",
    "code": "VT-093",
    "name": "Bộ 5 chậu composite trắng",
    "category": "Sân thượng & Cây cảnh",
    "unit": "Bộ/Cái",
    "defaultPrice": 2700000,
    "note": ""
  }
];

export const DEFAULT_PRESET: ShoppingPreset = {
  id: 'preset_default_villa',
  name: 'Mẫu Nhà Phố 4 Tầng (Gốc từ Excel)',
  description: 'Danh sách chi tiết các vật dụng cần mua cho Tầng Trệt, Tầng 2, Tầng 3 và Tầng 4 Sân Thượng',
  createdAt: '2026-04-01T08:00:00.000Z',
  updatedAt: '2026-04-01T08:00:00.000Z',
  floors: [
  {
    "name": "I. TẦNG TRỆT – PHÒNG KHÁCH + BẾP",
    "rooms": [
      {
        "name": "1. Phòng khách",
        "items": [
          {
            "id": "item_kjn757r97",
            "name": "Bộ Sofa Đỉnh Đào Gỗ Gõ 10 Món Tay 14",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 180000000,
            "note": ""
          },
          {
            "id": "item_tj6a9e4vf",
            "name": "Bàn trà gỗ Óc Chó",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 62000000,
            "note": ""
          },
          {
            "id": "item_g3x2x8tnd",
            "name": "Kệ tivi gỗ Gõ đỏ",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 42000000,
            "note": ""
          },
          {
            "id": "item_4jgmu5q14",
            "name": "Tủ rượu trang trí",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 105000000,
            "note": ""
          },
          {
            "id": "item_5j4kd039s",
            "name": "Vách lam gỗ trang trí",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 55000000,
            "note": ""
          },
          {
            "id": "item_9lo6bwdw0",
            "name": "Tủ giày gỗ Sồi",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 15000000,
            "note": ""
          },
          {
            "id": "item_1y55m7hl3",
            "name": "Bàn console + gương",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 22000000,
            "note": ""
          },
          {
            "id": "item_ua64uut4z",
            "name": "Kệ trang trí treo tường",
            "unit": "Bộ/Cái",
            "quantity": 3,
            "unitPrice": 12500000,
            "note": ""
          },
          {
            "id": "item_nobhcjoed",
            "name": "Tủ hộc lưu trữ nhỏ",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 15000000,
            "note": ""
          },
          {
            "id": "item_iul7worjg",
            "name": "4 ghế đơn gỗ (phụ)",
            "unit": "Bộ/Cái",
            "quantity": 4,
            "unitPrice": 5500000,
            "note": ""
          },
          {
            "id": "item_fzsvqoxvo",
            "name": "Bàn thờ gỗ Gõ 1m8",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 65000000,
            "note": ""
          }
        ],
        "id": "room_1_1"
      },
      {
        "name": "2. Nhà bếp – phòng ăn",
        "items": [
          {
            "id": "item_nf0ab8hhw",
            "name": "Tủ bếp trên + dưới gỗ MDF chống ẩm phủ Melamine",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 90000000,
            "note": ""
          },
          {
            "id": "item_1jx8x0isv",
            "name": "Mặt bếp đá + ốp tường",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 25000000,
            "note": ""
          },
          {
            "id": "item_bu5kimnr3",
            "name": "Bàn ăn gỗ Sồi 6 ghế",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 28000000,
            "note": ""
          },
          {
            "id": "item_z7l2ztkxi",
            "name": "Tủ lạnh bọc gỗ + khung trang trí",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 15000000,
            "note": ""
          },
          {
            "id": "item_h0r68z3ry",
            "name": "Tủ kho đồ khô",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 20000000,
            "note": ""
          },
          {
            "id": "item_4fw2ftmyi",
            "name": "Tủ bếp mini tầng trệt",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 7000000,
            "note": ""
          },
          {
            "id": "item_3imk6ytqs",
            "name": "Hệ vách gỗ trang trí + led",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 25000000,
            "note": ""
          },
          {
            "id": "item_fz61fjyj9",
            "name": "Bàn đảo bếp nhỏ",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 40000000,
            "note": ""
          },
          {
            "id": "item_sqstq5ifk",
            "name": "Tủ rượu treo + kệ ly",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 12000000,
            "note": ""
          },
          {
            "id": "item_qdl3n42tw",
            "name": "Ghế bar",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 2800000,
            "note": ""
          },
          {
            "id": "item_dqv1yzuuq",
            "name": "Bàn Ăn Gỗ Gõ CN 8 Ghế",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 35000000,
            "note": ""
          }
        ],
        "id": "room_1_2"
      }
    ],
    "id": "floor_1"
  },
  {
    "name": "II. Tầng 2 – 2 PHÒNG NGỦ MASTER",
    "rooms": [
      {
        "name": "1. Phòng ngủ Master 1",
        "items": [
          {
            "id": "item_5n14d5wvy",
            "name": "Giường gỗ bọc nệm Óc Chó 1m8",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 75000000,
            "note": ""
          },
          {
            "id": "item_pog6w6h9u",
            "name": "Tủ áo gỗ MDF chống ẩm phủ Acrylic – full tường",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 90000000,
            "note": ""
          },
          {
            "id": "item_dl56le1q4",
            "name": "Bàn trang điểm + gương",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 18000000,
            "note": ""
          },
          {
            "id": "item_rq7uc6hxp",
            "name": "Tab đầu giường",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 6500000,
            "note": ""
          },
          {
            "id": "item_7o6c0bz1d",
            "name": "Kệ tivi gỗ",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 18000000,
            "note": ""
          },
          {
            "id": "item_jhm4v54pl",
            "name": "Tủ sách + kệ trang trí",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 30000000,
            "note": ""
          },
          {
            "id": "item_5t1focbf7",
            "name": "Bàn làm việc gỗ",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 22000000,
            "note": ""
          },
          {
            "id": "item_4bosbler1",
            "name": "Tủ âm tường chứa vali",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 25000000,
            "note": ""
          },
          {
            "id": "item_02hih7uso",
            "name": "Vách ốp gỗ sau giường",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 45000000,
            "note": ""
          },
          {
            "id": "item_t55qcky4v",
            "name": "Tủ WC trong phòng (gỗ + kính)",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 25000000,
            "note": ""
          },
          {
            "id": "item_gkjax3wep",
            "name": "Bàn đảo mini + ghế (phòng lớn)",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 25000000,
            "note": ""
          },
          {
            "id": "item_pwk8r6jku",
            "name": "Kệ giày nhỏ",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 4500000,
            "note": ""
          },
          {
            "id": "item_0s3e0talq",
            "name": "Kệ gỗ treo tường",
            "unit": "Bộ/Cái",
            "quantity": 3,
            "unitPrice": 5000000,
            "note": ""
          },
          {
            "id": "item_c5bcmc3hr",
            "name": "Tủ trưng bày trang trí",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 25000000,
            "note": ""
          },
          {
            "id": "item_qextzwb49",
            "name": "Bàn sofa mini",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 15000000,
            "note": ""
          },
          {
            "id": "item_xb1n2vsst",
            "name": "Vách gỗ trang trí",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 20000000,
            "note": ""
          }
        ],
        "id": "room_2_1"
      },
      {
        "name": "2. Phòng ngủ Master 2",
        "items": [
          {
            "id": "item_fvei9m4io",
            "name": "Giường gỗ bọc nệm Óc Chó 1m8",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 75000000,
            "note": ""
          },
          {
            "id": "item_xdgo3n4rd",
            "name": "Tủ áo Acrylic full tường",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 75000000,
            "note": ""
          },
          {
            "id": "item_i595avtn2",
            "name": "Bàn trang điểm",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 15000000,
            "note": ""
          },
          {
            "id": "item_qbmjxve0q",
            "name": "Tab đầu giường",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 5500000,
            "note": ""
          },
          {
            "id": "item_30arqo80w",
            "name": "Kệ tivi",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 15000000,
            "note": ""
          },
          {
            "id": "item_gq53qj7kv",
            "name": "Bàn học/làm việc",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 20000000,
            "note": ""
          },
          {
            "id": "item_2ol7vihlr",
            "name": "Tủ sách",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 18000000,
            "note": ""
          },
          {
            "id": "item_ilhozol7x",
            "name": "Hệ vách ốp gỗ",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 40000000,
            "note": ""
          },
          {
            "id": "item_56rwcrqv9",
            "name": "Tủ giày",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 5500000,
            "note": ""
          },
          {
            "id": "item_3s5kkejs4",
            "name": "Tủ trang trí",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 22000000,
            "note": ""
          },
          {
            "id": "item_u5lc0tzp6",
            "name": "Tủ WC",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 22000000,
            "note": ""
          },
          {
            "id": "item_bacti66a9",
            "name": "Sofa đơn + bàn",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 25000000,
            "note": ""
          },
          {
            "id": "item_6tjxobn2o",
            "name": "Kệ treo tường",
            "unit": "Bộ/Cái",
            "quantity": 3,
            "unitPrice": 4500000,
            "note": ""
          },
          {
            "id": "item_q6izoum1z",
            "name": "Tủ âm tường",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 25000000,
            "note": ""
          },
          {
            "id": "item_wt495gzzm",
            "name": "Tủ đầu hành lang",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 20000000,
            "note": ""
          }
        ],
        "id": "room_2_2"
      }
    ],
    "id": "floor_2"
  },
  {
    "name": "III. Tầng 3 – 2 PHÒNG NGỦ",
    "rooms": [
      {
        "name": "1. Phòng ngủ 3",
        "items": [
          {
            "id": "item_suncjnbc5",
            "name": "Giường gỗ bọc nệm Óc Chó 1m6",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 55000000,
            "note": ""
          },
          {
            "id": "item_pthkdhekp",
            "name": "Tủ áo MDF 3 cánh",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 32000000,
            "note": ""
          },
          {
            "id": "item_i7hry7z1o",
            "name": "Bàn học + kệ sách",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 18000000,
            "note": ""
          },
          {
            "id": "item_s2dx3ky5k",
            "name": "Tab giường",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 4000000,
            "note": ""
          },
          {
            "id": "item_vmwx42vqf",
            "name": "Kệ tivi",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 12000000,
            "note": ""
          },
          {
            "id": "item_q1li1aylr",
            "name": "Vách trang trí",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 18000000,
            "note": ""
          },
          {
            "id": "item_4uektuuqf",
            "name": "Tủ treo góc",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 7000000,
            "note": ""
          },
          {
            "id": "item_74de2ua3a",
            "name": "Tủ giày",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 5000000,
            "note": ""
          },
          {
            "id": "item_6nu5ml06n",
            "name": "Giường Sồi 1m6",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 22000000,
            "note": ""
          },
          {
            "id": "item_ganjexey2",
            "name": "Tủ áo MDF 3 cánh",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 32000000,
            "note": ""
          },
          {
            "id": "item_83ss7l21n",
            "name": "Bàn học + kệ sách",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 18000000,
            "note": ""
          }
        ],
        "id": "room_3_1"
      },
      {
        "name": "2. Phòng ngủ 4",
        "items": [
          {
            "id": "item_lmvkz1mzz",
            "name": "Giường gỗ bọc nệm Óc Chó 1m6",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 55000000,
            "note": ""
          },
          {
            "id": "item_e1ul82uc2",
            "name": "Tủ áo MDF 3 cánh",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 32000000,
            "note": ""
          },
          {
            "id": "item_zy1axmcol",
            "name": "Bàn học + kệ sách",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 18000000,
            "note": ""
          },
          {
            "id": "item_dfnrbz3wi",
            "name": "Tab giường",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 4000000,
            "note": ""
          },
          {
            "id": "item_yy0wk5x0m",
            "name": "Kệ tivi",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 12000000,
            "note": ""
          },
          {
            "id": "item_t5rjybxty",
            "name": "Vách trang trí",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 18000000,
            "note": ""
          },
          {
            "id": "item_sqloaxmns",
            "name": "Tủ treo góc",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 7000000,
            "note": ""
          },
          {
            "id": "item_pmcn62dy2",
            "name": "Tủ giày",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 5000000,
            "note": ""
          },
          {
            "id": "item_e4w7afgqu",
            "name": "Tủ áo MDF 3 cánh",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 32000000,
            "note": ""
          },
          {
            "id": "item_rk3w7f9a8",
            "name": "Bàn học + kệ sách",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 18000000,
            "note": ""
          }
        ],
        "id": "room_3_2"
      }
    ],
    "id": "floor_3"
  },
  {
    "name": "IV. Tầng 4 – Phòng thờ + Sân thượng",
    "rooms": [
      {
        "id": "room_t4_1",
        "name": "1. Phòng thờ",
        "items": [
          {
            "id": "item_t3byliqxa",
            "name": "Bàn thờ gỗ Gõ 1m8",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 65000000,
            "note": ""
          },
          {
            "id": "item_0pj3xbc14",
            "name": "Tủ thờ phụ",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 25000000,
            "note": ""
          },
          {
            "id": "item_kves8dwhr",
            "name": "Vách CNC + gỗ",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 25000000,
            "note": ""
          },
          {
            "id": "item_f30ojhy1s",
            "name": "Giá kệ đồ thờ",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 12000000,
            "note": ""
          },
          {
            "id": "item_c2o6i74ho",
            "name": "Tủ chứa đồ",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 15000000,
            "note": ""
          },
          {
            "id": "item_ftaet2z8z",
            "name": "Tủ đồ giặt",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 15000000,
            "note": ""
          },
          {
            "id": "item_j7zl18m28",
            "name": "Tủ kho đồ",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 12000000,
            "note": ""
          }
        ]
      },
      {
        "id": "room_t4_2",
        "name": "2. Sân thượng & Cây cảnh ngoài trời",
        "items": [
          {
            "id": "item_btj052zqj",
            "name": "Bàn ghế ngoài trời – bộ 1",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 30000000,
            "note": ""
          },
          {
            "id": "item_cv5giaaqu",
            "name": "Bàn ghế ngoài trời – bộ 2",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 30000000,
            "note": ""
          },
          {
            "id": "item_qya7tv4vu",
            "name": "Bàn ghế ngoài trời – bộ 3",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 30000000,
            "note": ""
          },
          {
            "id": "item_22nib00la",
            "name": "Bàn ghế ngoài trời – bộ 4",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 30000000,
            "note": ""
          },
          {
            "id": "item_4bb6cx9q1",
            "name": "Cây cảnh lớn (lưỡi hổ / đa búp đỏ)",
            "unit": "Bộ/Cái",
            "quantity": 4,
            "unitPrice": 850000,
            "note": ""
          },
          {
            "id": "item_4zo0nxl28",
            "name": "Chậu cây gỗ trang trí",
            "unit": "Bộ/Cái",
            "quantity": 4,
            "unitPrice": 1200000,
            "note": ""
          },
          {
            "id": "item_gi8qh7ol9",
            "name": "Cây dây leo cho giàn sân thượng",
            "unit": "Bộ/Cái",
            "quantity": 6,
            "unitPrice": 450000,
            "note": ""
          },
          {
            "id": "item_aauy4caqi",
            "name": "Bộ chậu xi măng nhẹ",
            "unit": "Bộ/Cái",
            "quantity": 6,
            "unitPrice": 380000,
            "note": ""
          },
          {
            "id": "item_2dncfh170",
            "name": "Cây bonsai nhỏ để bàn",
            "unit": "Bộ/Cái",
            "quantity": 5,
            "unitPrice": 550000,
            "note": ""
          },
          {
            "id": "item_cg1rxdto7",
            "name": "Cây lộc vừng / bằng lăng chậu lớn",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 6500000,
            "note": ""
          },
          {
            "id": "item_yl82iztgm",
            "name": "Cây ăn quả chậu (chanh, tắc, khế…)",
            "unit": "Bộ/Cái",
            "quantity": 4,
            "unitPrice": 1200000,
            "note": ""
          },
          {
            "id": "item_g5p0us0x1",
            "name": "Cây tùng La Hán trung",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 4500000,
            "note": ""
          },
          {
            "id": "item_xx83lanh7",
            "name": "Chậu hoa theo mùa (hoa giấy, mười giờ…)",
            "unit": "Bộ/Cái",
            "quantity": 20,
            "unitPrice": 150000,
            "note": ""
          },
          {
            "id": "item_jx3ievg17",
            "name": "Thảm cỏ nhân tạo cho khu ngồi nghỉ (≈20m²)",
            "unit": "Bộ/Cái",
            "quantity": 20,
            "unitPrice": 250000,
            "note": ""
          },
          {
            "id": "item_yec3m822w",
            "name": "Giàn tre/trúc làm nền cho cây leo",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 6500000,
            "note": ""
          },
          {
            "id": "item_b3jgnvwac",
            "name": "Cây sanh bonsai mini",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 2800000,
            "note": ""
          },
          {
            "id": "item_nqxfacyxu",
            "name": "Cây cau nhật (hàng cao)",
            "unit": "Bộ/Cái",
            "quantity": 3,
            "unitPrice": 1100000,
            "note": ""
          },
          {
            "id": "item_vgbbdptje",
            "name": "Cây trúc quân tử loại lớn",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 1900000,
            "note": ""
          },
          {
            "id": "item_dihmqfj3w",
            "name": "Cây phong thủy kim ngân gốc to",
            "unit": "Bộ/Cái",
            "quantity": 2,
            "unitPrice": 2600000,
            "note": ""
          },
          {
            "id": "item_twtvbdsbq",
            "name": "Cây dương xỉ Úc (treo tường)",
            "unit": "Bộ/Cái",
            "quantity": 8,
            "unitPrice": 250000,
            "note": ""
          },
          {
            "id": "item_jwbp48i6k",
            "name": "Combo hoa leo (hoa hồng leo / hoa giấy Nhật)",
            "unit": "Bộ/Cái",
            "quantity": 4,
            "unitPrice": 450000,
            "note": ""
          },
          {
            "id": "item_0eonqiqsh",
            "name": "Cây chuối rẻ quạt trang trí",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 3800000,
            "note": ""
          },
          {
            "id": "item_anv99iryd",
            "name": "Bộ 10 chậu sứ men xanh cao cấp",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 3500000,
            "note": ""
          },
          {
            "id": "item_z6pqj6sdd",
            "name": "Cây hồng môn + tiểu cảnh nước mini",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 4800000,
            "note": ""
          },
          {
            "id": "item_4d9tmkg70",
            "name": "3 đĩa tiểu cảnh rêu đá",
            "unit": "Bộ/Cái",
            "quantity": 3,
            "unitPrice": 650000,
            "note": ""
          },
          {
            "id": "item_spv0210bn",
            "name": "Cây trầu bà leo cột",
            "unit": "Bộ/Cái",
            "quantity": 3,
            "unitPrice": 380000,
            "note": ""
          },
          {
            "id": "item_blt3tnqls",
            "name": "Cây monstera lá xé loại lớn",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 2200000,
            "note": ""
          },
          {
            "id": "item_aqa0srdgy",
            "name": "Bộ 5 chậu composite trắng",
            "unit": "Bộ/Cái",
            "quantity": 1,
            "unitPrice": 2700000,
            "note": ""
          }
        ]
      }
    ],
    "id": "floor_4"
  }
],
};
