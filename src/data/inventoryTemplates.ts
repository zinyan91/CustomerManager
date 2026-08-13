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

export const INVENTORY_TEMPLATES: InventoryCategoryTemplate[] = [
  {
    "id": "htk-lua-gao",
    "name": "HTK Lúa Gạo",
    "items": [
      {
        "code": "RICE001",
        "name": "Gạo ST25",
        "unit": "Kg",
        "unitPrice": 32000.0,
        "beginningQty": 4096.0,
        "importQty": 1510.0,
        "exportQty": 1081.0
      },
      {
        "code": "RICE002",
        "name": "Gạo tám thơm Hải Hậu",
        "unit": "Kg",
        "unitPrice": 25000.0,
        "beginningQty": 1146.0,
        "importQty": 1042.0,
        "exportQty": 297.0
      },
      {
        "code": "RICE003",
        "name": "Gạo nếp cái hoa vàng Yên Bái",
        "unit": "Kg",
        "unitPrice": 28000.0,
        "beginningQty": 3808.0,
        "importQty": 1428.0,
        "exportQty": 889.0
      },
      {
        "code": "RICE004",
        "name": "Gạo lứt đỏ Quảng Trị",
        "unit": "Kg",
        "unitPrice": 35000.0,
        "beginningQty": 4927.0,
        "importQty": 1425.0,
        "exportQty": 307.0
      },
      {
        "code": "RICE005",
        "name": "Gạo Jasmine Thái",
        "unit": "Kg",
        "unitPrice": 27000.0,
        "beginningQty": 953.0,
        "importQty": 1421.0,
        "exportQty": 395.0
      },
      {
        "code": "RICE006",
        "name": "Gạo Hương Lài An Giang",
        "unit": "Kg",
        "unitPrice": 26000.0,
        "beginningQty": 3163.0,
        "importQty": 1469.0,
        "exportQty": 4129.0
      },
      {
        "code": "RICE007",
        "name": "Gạo Bắc Hương Hà Nam",
        "unit": "Kg",
        "unitPrice": 24000.0,
        "beginningQty": 2017.0,
        "importQty": 548.0,
        "exportQty": 1630.0
      },
      {
        "code": "RICE008",
        "name": "Gạo Đài Loan xuất khẩu",
        "unit": "Kg",
        "unitPrice": 29000.0,
        "beginningQty": 3235.0,
        "importQty": 1452.0,
        "exportQty": 3398.0
      },
      {
        "code": "RICE009",
        "name": "Gạo nếp than Sóc Trăng",
        "unit": "Kg",
        "unitPrice": 32000.0,
        "beginningQty": 1612.0,
        "importQty": 556.0,
        "exportQty": 1399.0
      },
      {
        "code": "RICE010",
        "name": "Gạo tấm Long An",
        "unit": "Kg",
        "unitPrice": 20000.0,
        "beginningQty": 2505.0,
        "importQty": 466.0,
        "exportQty": 1179.0
      },
      {
        "code": "RICE011",
        "name": "Gạo hữu cơ VinEco",
        "unit": "Kg",
        "unitPrice": 40000.0,
        "beginningQty": 2222.0,
        "importQty": 568.0,
        "exportQty": 1138.0
      },
      {
        "code": "RICE012",
        "name": "Gạo trắng thông thường",
        "unit": "Kg",
        "unitPrice": 22000.0,
        "beginningQty": 2794.0,
        "importQty": 1141.0,
        "exportQty": 830.0
      },
      {
        "code": "RICE013",
        "name": "Gạo Nhật nhập khẩu",
        "unit": "Kg",
        "unitPrice": 45000.0,
        "beginningQty": 3574.0,
        "importQty": 514.0,
        "exportQty": 2962.0
      },
      {
        "code": "RICE014",
        "name": "Gạo Campuchia đặc sản",
        "unit": "Kg",
        "unitPrice": 30000.0,
        "beginningQty": 4666.0,
        "importQty": 1900.0,
        "exportQty": 2784.0
      },
      {
        "code": "RICE015",
        "name": "Gạo nếp lứt Hà Nội",
        "unit": "Kg",
        "unitPrice": 34000.0,
        "beginningQty": 2552.0,
        "importQty": 1843.0,
        "exportQty": 2812.0
      },
      {
        "code": "RICE016",
        "name": "Gạo tẻ dẻo Thái Bình",
        "unit": "Kg",
        "unitPrice": 26000.0,
        "beginningQty": 754.0,
        "importQty": 679.0,
        "exportQty": 1288.0
      },
      {
        "code": "RICE017",
        "name": "Gạo Thái Hom Mali",
        "unit": "Kg",
        "unitPrice": 38000.0,
        "beginningQty": 1095.0,
        "importQty": 372.0,
        "exportQty": 592.0
      },
      {
        "code": "RICE018",
        "name": "Gạo hữu cơ Sông Hồng",
        "unit": "Kg",
        "unitPrice": 42000.0,
        "beginningQty": 3863.0,
        "importQty": 1965.0,
        "exportQty": 4073.0
      },
      {
        "code": "RICE019",
        "name": "Gạo Điện Biên",
        "unit": "Kg",
        "unitPrice": 23000.0,
        "beginningQty": 3884.0,
        "importQty": 1495.0,
        "exportQty": 779.0
      },
      {
        "code": "RICE020",
        "name": "Gạo thơm Đặc Sản Cần Thơ",
        "unit": "Kg",
        "unitPrice": 27000.0,
        "beginningQty": 1044.0,
        "importQty": 920.0,
        "exportQty": 366.0
      },
      {
        "code": "RICE021",
        "name": "Gạo lứt tím Huế",
        "unit": "Kg",
        "unitPrice": 36000.0,
        "beginningQty": 1272.0,
        "importQty": 1370.0,
        "exportQty": 1367.0
      },
      {
        "code": "RICE022",
        "name": "Gạo nếp cái hoa vàng Bắc Ninh",
        "unit": "Kg",
        "unitPrice": 28000.0,
        "beginningQty": 4132.0,
        "importQty": 1478.0,
        "exportQty": 2962.0
      },
      {
        "code": "RICE023",
        "name": "Gạo ST24",
        "unit": "Kg",
        "unitPrice": 31000.0,
        "beginningQty": 4880.0,
        "importQty": 1011.0,
        "exportQty": 5214.0
      },
      {
        "code": "RICE024",
        "name": "Gạo Hương Sen",
        "unit": "Kg",
        "unitPrice": 29000.0,
        "beginningQty": 837.0,
        "importQty": 1395.0,
        "exportQty": 2071.0
      },
      {
        "code": "RICE025",
        "name": "Gạo tẻ thường",
        "unit": "Kg",
        "unitPrice": 21000.0,
        "beginningQty": 4622.0,
        "importQty": 471.0,
        "exportQty": 4539.0
      },
      {
        "code": "RICE026",
        "name": "Gạo nếp trắng miền Tây",
        "unit": "Kg",
        "unitPrice": 26000.0,
        "beginningQty": 2733.0,
        "importQty": 1508.0,
        "exportQty": 1150.0
      },
      {
        "code": "RICE027",
        "name": "Gạo lứt đen",
        "unit": "Kg",
        "unitPrice": 37000.0,
        "beginningQty": 3324.0,
        "importQty": 1724.0,
        "exportQty": 1242.0
      },
      {
        "code": "RICE028",
        "name": "Gạo nương Tây Bắc",
        "unit": "Kg",
        "unitPrice": 33000.0,
        "beginningQty": 658.0,
        "importQty": 713.0,
        "exportQty": 762.0
      },
      {
        "code": "RICE029",
        "name": "Gạo Nàng Hương Chợ Đào",
        "unit": "Kg",
        "unitPrice": 35000.0,
        "beginningQty": 1569.0,
        "importQty": 895.0,
        "exportQty": 894.0
      },
      {
        "code": "RICE030",
        "name": "Gạo thơm Sóc Trăng",
        "unit": "Kg",
        "unitPrice": 27000.0,
        "beginningQty": 2067.0,
        "importQty": 384.0,
        "exportQty": 1426.0
      },
      {
        "code": "RICE031",
        "name": "Gạo Nhật Japonica",
        "unit": "Kg",
        "unitPrice": 46000.0,
        "beginningQty": 2142.0,
        "importQty": 1218.0,
        "exportQty": 1554.0
      },
      {
        "code": "RICE032",
        "name": "Gạo nếp Thái",
        "unit": "Kg",
        "unitPrice": 29000.0,
        "beginningQty": 1488.0,
        "importQty": 1158.0,
        "exportQty": 232.0
      },
      {
        "code": "RICE033",
        "name": "Gạo ST21",
        "unit": "Kg",
        "unitPrice": 30000.0,
        "beginningQty": 4373.0,
        "importQty": 697.0,
        "exportQty": 431.0
      },
      {
        "code": "RICE034",
        "name": "Gạo thơm Vĩnh Long",
        "unit": "Kg",
        "unitPrice": 27500.0,
        "beginningQty": 1150.0,
        "importQty": 977.0,
        "exportQty": 1240.0
      },
      {
        "code": "RICE035",
        "name": "Gạo hữu cơ Cà Mau",
        "unit": "Kg",
        "unitPrice": 41500.0,
        "beginningQty": 2283.0,
        "importQty": 760.0,
        "exportQty": 552.0
      },
      {
        "code": "RICE036",
        "name": "Gạo nếp Bắc Giang",
        "unit": "Kg",
        "unitPrice": 28500.0,
        "beginningQty": 4475.0,
        "importQty": 1895.0,
        "exportQty": 4229.0
      },
      {
        "code": "RICE037",
        "name": "Gạo Basmati Ấn Độ",
        "unit": "Kg",
        "unitPrice": 48000.0,
        "beginningQty": 3550.0,
        "importQty": 1704.0,
        "exportQty": 2244.0
      },
      {
        "code": "RICE038",
        "name": "Gạo Koshihikari Nhật",
        "unit": "Kg",
        "unitPrice": 47000.0,
        "beginningQty": 4080.0,
        "importQty": 620.0,
        "exportQty": 3754.0
      },
      {
        "code": "RICE039",
        "name": "Gạo Jasmine Việt Nam",
        "unit": "Kg",
        "unitPrice": 26500.0,
        "beginningQty": 2545.0,
        "importQty": 986.0,
        "exportQty": 105.0
      },
      {
        "code": "RICE040",
        "name": "Gạo lứt đỏ hữu cơ",
        "unit": "Kg",
        "unitPrice": 36500.0,
        "beginningQty": 3389.0,
        "importQty": 559.0,
        "exportQty": 3444.0
      },
      {
        "code": "RICE041",
        "name": "Gạo ST22",
        "unit": "Kg",
        "unitPrice": 30500.0,
        "beginningQty": 2272.0,
        "importQty": 393.0,
        "exportQty": 2186.0
      },
      {
        "code": "RICE042",
        "name": "Gạo trắng miền Trung",
        "unit": "Kg",
        "unitPrice": 23000.0,
        "beginningQty": 2510.0,
        "importQty": 1370.0,
        "exportQty": 953.0
      },
      {
        "code": "RICE043",
        "name": "Gạo đỏ Điện Biên",
        "unit": "Kg",
        "unitPrice": 35500.0,
        "beginningQty": 3159.0,
        "importQty": 1719.0,
        "exportQty": 4326.0
      },
      {
        "code": "RICE044",
        "name": "Gạo Đài Thơm 8",
        "unit": "Kg",
        "unitPrice": 25500.0,
        "beginningQty": 4627.0,
        "importQty": 889.0,
        "exportQty": 3096.0
      },
      {
        "code": "RICE045",
        "name": "Gạo trắng Long An",
        "unit": "Kg",
        "unitPrice": 23500.0,
        "beginningQty": 3739.0,
        "importQty": 1768.0,
        "exportQty": 1940.0
      },
      {
        "code": "RICE046",
        "name": "Gạo nếp nương Sơn La",
        "unit": "Kg",
        "unitPrice": 34500.0,
        "beginningQty": 522.0,
        "importQty": 358.0,
        "exportQty": 442.0
      },
      {
        "code": "RICE047",
        "name": "Gạo dẻo Thái Bình",
        "unit": "Kg",
        "unitPrice": 27500.0,
        "beginningQty": 1531.0,
        "importQty": 313.0,
        "exportQty": 406.0
      },
      {
        "code": "RICE048",
        "name": "Gạo Hương Lài Campuchia",
        "unit": "Kg",
        "unitPrice": 31500.0,
        "beginningQty": 936.0,
        "importQty": 1703.0,
        "exportQty": 459.0
      },
      {
        "code": "RICE049",
        "name": "Gạo nếp than Lào Cai",
        "unit": "Kg",
        "unitPrice": 32500.0,
        "beginningQty": 584.0,
        "importQty": 1266.0,
        "exportQty": 602.0
      },
      {
        "code": "RICE050",
        "name": "Gạo thơm Mỹ",
        "unit": "Kg",
        "unitPrice": 29000.0,
        "beginningQty": 3864.0,
        "importQty": 507.0,
        "exportQty": 2947.0
      },
      {
        "code": "RICE051",
        "name": "Gạo ST19",
        "unit": "Kg",
        "unitPrice": 29500.0,
        "beginningQty": 4522.0,
        "importQty": 1555.0,
        "exportQty": 3782.0
      },
      {
        "code": "RICE052",
        "name": "Gạo tấm Thái Lan",
        "unit": "Kg",
        "unitPrice": 22500.0,
        "beginningQty": 1777.0,
        "importQty": 1103.0,
        "exportQty": 1570.0
      },
      {
        "code": "RICE053",
        "name": "Gạo dẻo Hà Tĩnh",
        "unit": "Kg",
        "unitPrice": 26500.0,
        "beginningQty": 4739.0,
        "importQty": 1780.0,
        "exportQty": 1275.0
      },
      {
        "code": "RICE054",
        "name": "Gạo lứt tím than",
        "unit": "Kg",
        "unitPrice": 37500.0,
        "beginningQty": 2869.0,
        "importQty": 1493.0,
        "exportQty": 3175.0
      },
      {
        "code": "RICE055",
        "name": "Gạo hữu cơ Đồng Tháp",
        "unit": "Kg",
        "unitPrice": 42500.0,
        "beginningQty": 2702.0,
        "importQty": 205.0,
        "exportQty": 1463.0
      },
      {
        "code": "RICE056",
        "name": "Gạo ST18",
        "unit": "Kg",
        "unitPrice": 28500.0,
        "beginningQty": 1540.0,
        "importQty": 1005.0,
        "exportQty": 486.0
      },
      {
        "code": "RICE057",
        "name": "Gạo nếp cái Bắc Kạn",
        "unit": "Kg",
        "unitPrice": 29000.0,
        "beginningQty": 2492.0,
        "importQty": 694.0,
        "exportQty": 784.0
      },
      {
        "code": "RICE058",
        "name": "Gạo ST15",
        "unit": "Kg",
        "unitPrice": 27500.0,
        "beginningQty": 4290.0,
        "importQty": 701.0,
        "exportQty": 3320.0
      },
      {
        "code": "RICE059",
        "name": "Gạo hữu cơ Quảng Nam",
        "unit": "Kg",
        "unitPrice": 41000.0,
        "beginningQty": 1310.0,
        "importQty": 1921.0,
        "exportQty": 2208.0
      },
      {
        "code": "RICE060",
        "name": "Gạo tám Điện Biên",
        "unit": "Kg",
        "unitPrice": 24500.0,
        "beginningQty": 2116.0,
        "importQty": 930.0,
        "exportQty": 615.0
      },
      {
        "code": "RICE061",
        "name": "Gạo đỏ hữu cơ Huế",
        "unit": "Kg",
        "unitPrice": 35000.0,
        "beginningQty": 4382.0,
        "importQty": 1289.0,
        "exportQty": 1015.0
      },
      {
        "code": "RICE062",
        "name": "Gạo trắng An Giang",
        "unit": "Kg",
        "unitPrice": 24000.0,
        "beginningQty": 3384.0,
        "importQty": 1818.0,
        "exportQty": 3482.0
      },
      {
        "code": "RICE063",
        "name": "Gạo lứt vàng",
        "unit": "Kg",
        "unitPrice": 36000.0,
        "beginningQty": 3671.0,
        "importQty": 978.0,
        "exportQty": 2340.0
      },
      {
        "code": "RICE064",
        "name": "Gạo thơm Lào",
        "unit": "Kg",
        "unitPrice": 30000.0,
        "beginningQty": 3518.0,
        "importQty": 893.0,
        "exportQty": 2245.0
      },
      {
        "code": "RICE065",
        "name": "Gạo ST14",
        "unit": "Kg",
        "unitPrice": 26500.0,
        "beginningQty": 1029.0,
        "importQty": 366.0,
        "exportQty": 464.0
      },
      {
        "code": "RICE066",
        "name": "Gạo thơm Bắc Giang",
        "unit": "Kg",
        "unitPrice": 27500.0,
        "beginningQty": 4478.0,
        "importQty": 674.0,
        "exportQty": 1410.0
      },
      {
        "code": "RICE067",
        "name": "Gạo hữu cơ Bình Định",
        "unit": "Kg",
        "unitPrice": 40500.0,
        "beginningQty": 1226.0,
        "importQty": 1736.0,
        "exportQty": 815.0
      },
      {
        "code": "RICE068",
        "name": "Gạo Đài Loan hữu cơ",
        "unit": "Kg",
        "unitPrice": 49000.0,
        "beginningQty": 2696.0,
        "importQty": 1475.0,
        "exportQty": 3376.0
      },
      {
        "code": "RICE069",
        "name": "Gạo ST12",
        "unit": "Kg",
        "unitPrice": 26000.0,
        "beginningQty": 2357.0,
        "importQty": 1683.0,
        "exportQty": 1098.0
      },
      {
        "code": "RICE070",
        "name": "Gạo trắng Hậu Giang",
        "unit": "Kg",
        "unitPrice": 23500.0,
        "beginningQty": 4008.0,
        "importQty": 1337.0,
        "exportQty": 2878.0
      },
      {
        "code": "RICE071",
        "name": "Gạo nếp than Đắk Lắk",
        "unit": "Kg",
        "unitPrice": 33000.0,
        "beginningQty": 4731.0,
        "importQty": 240.0,
        "exportQty": 1041.0
      },
      {
        "code": "RICE072",
        "name": "Gạo trắng Tiền Giang",
        "unit": "Kg",
        "unitPrice": 24500.0,
        "beginningQty": 4343.0,
        "importQty": 508.0,
        "exportQty": 4055.0
      }
    ]
  },
  {
    "id": "htk-spa",
    "name": "HTK Spa",
    "items": [
      {
        "code": "SPA001",
        "name": "Tinh dầu oải hương",
        "unit": "Chai",
        "unitPrice": 150000.0,
        "beginningQty": 79.0,
        "importQty": 38.0,
        "exportQty": 86.0
      },
      {
        "code": "SPA002",
        "name": "Muối tắm Himalaya",
        "unit": "Gói",
        "unitPrice": 120000.0,
        "beginningQty": 65.0,
        "importQty": 44.0,
        "exportQty": 44.0
      },
      {
        "code": "SPA003",
        "name": "Sáp dưỡng thể",
        "unit": "Hộp",
        "unitPrice": 180000.0,
        "beginningQty": 37.0,
        "importQty": 11.0,
        "exportQty": 6.0
      },
      {
        "code": "SPA004",
        "name": "Nến thơm hương trà xanh",
        "unit": "Hũ",
        "unitPrice": 100000.0,
        "beginningQty": 45.0,
        "importQty": 44.0,
        "exportQty": 27.0
      },
      {
        "code": "SPA005",
        "name": "Sữa tắm dưỡng ẩm",
        "unit": "Chai",
        "unitPrice": 200000.0,
        "beginningQty": 92.0,
        "importQty": 49.0,
        "exportQty": 53.0
      },
      {
        "code": "SPA006",
        "name": "Dầu massage",
        "unit": "Chai",
        "unitPrice": 250000.0,
        "beginningQty": 21.0,
        "importQty": 38.0,
        "exportQty": 29.0
      },
      {
        "code": "SPA007",
        "name": "Kem dưỡng da ban đêm",
        "unit": "Hũ",
        "unitPrice": 300000.0,
        "beginningQty": 66.0,
        "importQty": 27.0,
        "exportQty": 68.0
      },
      {
        "code": "SPA008",
        "name": "Mặt nạ đất sét",
        "unit": "Hũ",
        "unitPrice": 220000.0,
        "beginningQty": 30.0,
        "importQty": 44.0,
        "exportQty": 30.0
      },
      {
        "code": "SPA009",
        "name": "Serum vitamin C",
        "unit": "Chai",
        "unitPrice": 350000.0,
        "beginningQty": 55.0,
        "importQty": 11.0,
        "exportQty": 29.0
      },
      {
        "code": "SPA010",
        "name": "Bông tẩy trang",
        "unit": "Gói",
        "unitPrice": 50000.0,
        "beginningQty": 79.0,
        "importQty": 40.0,
        "exportQty": 44.0
      },
      {
        "code": "SPA011",
        "name": "Sữa rửa mặt dịu nhẹ",
        "unit": "Chai",
        "unitPrice": 180000.0,
        "beginningQty": 39.0,
        "importQty": 12.0,
        "exportQty": 38.0
      },
      {
        "code": "SPA012",
        "name": "Tẩy tế bào chết",
        "unit": "Hũ",
        "unitPrice": 200000.0,
        "beginningQty": 30.0,
        "importQty": 7.0,
        "exportQty": 24.0
      },
      {
        "code": "SPA013",
        "name": "Kem chống nắng SPF50+",
        "unit": "Chai",
        "unitPrice": 320000.0,
        "beginningQty": 29.0,
        "importQty": 25.0,
        "exportQty": 32.0
      },
      {
        "code": "SPA014",
        "name": "Dầu gội thảo dược",
        "unit": "Chai",
        "unitPrice": 210000.0,
        "beginningQty": 63.0,
        "importQty": 30.0,
        "exportQty": 48.0
      },
      {
        "code": "SPA015",
        "name": "Tinh dầu tràm",
        "unit": "Chai",
        "unitPrice": 160000.0,
        "beginningQty": 70.0,
        "importQty": 25.0,
        "exportQty": 37.0
      },
      {
        "code": "SPA016",
        "name": "Mặt nạ giấy dưỡng ẩm",
        "unit": "Hộp",
        "unitPrice": 90000.0,
        "beginningQty": 74.0,
        "importQty": 7.0,
        "exportQty": 75.0
      },
      {
        "code": "SPA017",
        "name": "Sáp thơm phòng",
        "unit": "Hũ",
        "unitPrice": 120000.0,
        "beginningQty": 20.0,
        "importQty": 46.0,
        "exportQty": 31.0
      },
      {
        "code": "SPA018",
        "name": "Găng tay tẩy tế bào chết",
        "unit": "Cặp",
        "unitPrice": 80000.0,
        "beginningQty": 18.0,
        "importQty": 37.0,
        "exportQty": 25.0
      },
      {
        "code": "SPA019",
        "name": "Kem dưỡng mắt",
        "unit": "Hũ",
        "unitPrice": 280000.0,
        "beginningQty": 83.0,
        "importQty": 18.0,
        "exportQty": 4.0
      },
      {
        "code": "SPA020",
        "name": "Nước hoa hồng",
        "unit": "Chai",
        "unitPrice": 230000.0,
        "beginningQty": 75.0,
        "importQty": 5.0,
        "exportQty": 34.0
      },
      {
        "code": "SPA021",
        "name": "Dầu dừa nguyên chất",
        "unit": "Chai",
        "unitPrice": 180000.0,
        "beginningQty": 80.0,
        "importQty": 5.0,
        "exportQty": 43.0
      },
      {
        "code": "SPA022",
        "name": "Máy xông mặt",
        "unit": "Chiếc",
        "unitPrice": 700000.0,
        "beginningQty": 57.0,
        "importQty": 16.0,
        "exportQty": 37.0
      },
      {
        "code": "SPA023",
        "name": "Đá massage nóng",
        "unit": "Bộ",
        "unitPrice": 400000.0,
        "beginningQty": 43.0,
        "importQty": 27.0,
        "exportQty": 16.0
      },
      {
        "code": "SPA024",
        "name": "Muối ngâm chân",
        "unit": "Gói",
        "unitPrice": 150000.0,
        "beginningQty": 58.0,
        "importQty": 30.0,
        "exportQty": 82.0
      },
      {
        "code": "SPA025",
        "name": "Dụng cụ massage mặt",
        "unit": "Chiếc",
        "unitPrice": 300000.0,
        "beginningQty": 93.0,
        "importQty": 31.0,
        "exportQty": 78.0
      },
      {
        "code": "SPA026",
        "name": "Gel lột mụn",
        "unit": "Tuýp",
        "unitPrice": 90000.0,
        "beginningQty": 48.0,
        "importQty": 28.0,
        "exportQty": 63.0
      },
      {
        "code": "SPA027",
        "name": "Xịt khoáng dưỡng ẩm",
        "unit": "Chai",
        "unitPrice": 250000.0,
        "beginningQty": 76.0,
        "importQty": 49.0,
        "exportQty": 29.0
      },
      {
        "code": "SPA028",
        "name": "Lotion dưỡng thể",
        "unit": "Chai",
        "unitPrice": 270000.0,
        "beginningQty": 95.0,
        "importQty": 25.0,
        "exportQty": 22.0
      },
      {
        "code": "SPA029",
        "name": "Kem ủ tóc",
        "unit": "Hũ",
        "unitPrice": 220000.0,
        "beginningQty": 59.0,
        "importQty": 34.0,
        "exportQty": 41.0
      },
      {
        "code": "SPA030",
        "name": "Son dưỡng môi",
        "unit": "Thỏi",
        "unitPrice": 150000.0,
        "beginningQty": 77.0,
        "importQty": 11.0,
        "exportQty": 8.0
      },
      {
        "code": "SPA031",
        "name": "Tinh dầu oải hương",
        "unit": "Chai",
        "unitPrice": 150000.0,
        "beginningQty": 35.0,
        "importQty": 30.0,
        "exportQty": 37.0
      },
      {
        "code": "SPA032",
        "name": "Muối tắm Himalaya",
        "unit": "Gói",
        "unitPrice": 120000.0,
        "beginningQty": 43.0,
        "importQty": 21.0,
        "exportQty": 40.0
      },
      {
        "code": "SPA033",
        "name": "Sáp dưỡng thể",
        "unit": "Hộp",
        "unitPrice": 180000.0,
        "beginningQty": 74.0,
        "importQty": 11.0,
        "exportQty": 10.0
      },
      {
        "code": "SPA034",
        "name": "Nến thơm hương trà xanh",
        "unit": "Hũ",
        "unitPrice": 100000.0,
        "beginningQty": 35.0,
        "importQty": 36.0,
        "exportQty": 40.0
      },
      {
        "code": "SPA035",
        "name": "Sữa tắm dưỡng ẩm",
        "unit": "Chai",
        "unitPrice": 200000.0,
        "beginningQty": 61.0,
        "importQty": 17.0,
        "exportQty": 20.0
      },
      {
        "code": "SPA036",
        "name": "Dầu massage",
        "unit": "Chai",
        "unitPrice": 250000.0,
        "beginningQty": 45.0,
        "importQty": 17.0,
        "exportQty": 24.0
      },
      {
        "code": "SPA037",
        "name": "Kem dưỡng da ban đêm",
        "unit": "Hũ",
        "unitPrice": 300000.0,
        "beginningQty": 51.0,
        "importQty": 38.0,
        "exportQty": 33.0
      },
      {
        "code": "SPA038",
        "name": "Mặt nạ đất sét",
        "unit": "Hũ",
        "unitPrice": 220000.0,
        "beginningQty": 73.0,
        "importQty": 16.0,
        "exportQty": 4.0
      },
      {
        "code": "SPA039",
        "name": "Serum vitamin C",
        "unit": "Chai",
        "unitPrice": 350000.0,
        "beginningQty": 45.0,
        "importQty": 35.0,
        "exportQty": 65.0
      },
      {
        "code": "SPA040",
        "name": "Bông tẩy trang",
        "unit": "Gói",
        "unitPrice": 50000.0,
        "beginningQty": 88.0,
        "importQty": 8.0,
        "exportQty": 15.0
      },
      {
        "code": "SPA041",
        "name": "Sữa rửa mặt dịu nhẹ",
        "unit": "Chai",
        "unitPrice": 180000.0,
        "beginningQty": 50.0,
        "importQty": 9.0,
        "exportQty": 44.0
      },
      {
        "code": "SPA042",
        "name": "Tẩy tế bào chết",
        "unit": "Hũ",
        "unitPrice": 200000.0,
        "beginningQty": 10.0,
        "importQty": 23.0,
        "exportQty": 21.0
      },
      {
        "code": "SPA043",
        "name": "Kem chống nắng SPF50+",
        "unit": "Chai",
        "unitPrice": 320000.0,
        "beginningQty": 53.0,
        "importQty": 9.0,
        "exportQty": 33.0
      },
      {
        "code": "SPA044",
        "name": "Dầu gội thảo dược",
        "unit": "Chai",
        "unitPrice": 210000.0,
        "beginningQty": 58.0,
        "importQty": 21.0,
        "exportQty": 24.0
      },
      {
        "code": "SPA045",
        "name": "Tinh dầu tràm",
        "unit": "Chai",
        "unitPrice": 160000.0,
        "beginningQty": 77.0,
        "importQty": 32.0,
        "exportQty": 8.0
      },
      {
        "code": "SPA046",
        "name": "Mặt nạ giấy dưỡng ẩm",
        "unit": "Hộp",
        "unitPrice": 90000.0,
        "beginningQty": 45.0,
        "importQty": 9.0,
        "exportQty": 23.0
      },
      {
        "code": "SPA047",
        "name": "Sáp thơm phòng",
        "unit": "Hũ",
        "unitPrice": 120000.0,
        "beginningQty": 44.0,
        "importQty": 12.0,
        "exportQty": 6.0
      },
      {
        "code": "SPA048",
        "name": "Găng tay tẩy tế bào chết",
        "unit": "Cặp",
        "unitPrice": 80000.0,
        "beginningQty": 97.0,
        "importQty": 14.0,
        "exportQty": 39.0
      },
      {
        "code": "SPA049",
        "name": "Kem dưỡng mắt",
        "unit": "Hũ",
        "unitPrice": 280000.0,
        "beginningQty": 63.0,
        "importQty": 14.0,
        "exportQty": 23.0
      },
      {
        "code": "SPA050",
        "name": "Nước hoa hồng",
        "unit": "Chai",
        "unitPrice": 230000.0,
        "beginningQty": 69.0,
        "importQty": 27.0,
        "exportQty": 73.0
      },
      {
        "code": "SPA051",
        "name": "Dầu dừa nguyên chất",
        "unit": "Chai",
        "unitPrice": 180000.0,
        "beginningQty": 36.0,
        "importQty": 30.0,
        "exportQty": 12.0
      },
      {
        "code": "SPA052",
        "name": "Máy xông mặt",
        "unit": "Chiếc",
        "unitPrice": 700000.0,
        "beginningQty": 65.0,
        "importQty": 47.0,
        "exportQty": 5.0
      },
      {
        "code": "SPA053",
        "name": "Đá massage nóng",
        "unit": "Bộ",
        "unitPrice": 400000.0,
        "beginningQty": 75.0,
        "importQty": 6.0,
        "exportQty": 45.0
      },
      {
        "code": "SPA054",
        "name": "Muối ngâm chân",
        "unit": "Gói",
        "unitPrice": 150000.0,
        "beginningQty": 90.0,
        "importQty": 35.0,
        "exportQty": 27.0
      },
      {
        "code": "SPA055",
        "name": "Dụng cụ massage mặt",
        "unit": "Chiếc",
        "unitPrice": 300000.0,
        "beginningQty": 17.0,
        "importQty": 38.0,
        "exportQty": 48.0
      },
      {
        "code": "SPA056",
        "name": "Gel lột mụn",
        "unit": "Tuýp",
        "unitPrice": 90000.0,
        "beginningQty": 23.0,
        "importQty": 28.0,
        "exportQty": 16.0
      },
      {
        "code": "SPA057",
        "name": "Xịt khoáng dưỡng ẩm",
        "unit": "Chai",
        "unitPrice": 250000.0,
        "beginningQty": 52.0,
        "importQty": 38.0,
        "exportQty": 16.0
      },
      {
        "code": "SPA058",
        "name": "Lotion dưỡng thể",
        "unit": "Chai",
        "unitPrice": 270000.0,
        "beginningQty": 82.0,
        "importQty": 21.0,
        "exportQty": 26.0
      },
      {
        "code": "SPA059",
        "name": "Kem ủ tóc",
        "unit": "Hũ",
        "unitPrice": 220000.0,
        "beginningQty": 65.0,
        "importQty": 16.0,
        "exportQty": 65.0
      },
      {
        "code": "SPA060",
        "name": "Son dưỡng môi",
        "unit": "Thỏi",
        "unitPrice": 150000.0,
        "beginningQty": 70.0,
        "importQty": 20.0,
        "exportQty": 60.0
      },
      {
        "code": "SPA061",
        "name": "Tinh dầu oải hương",
        "unit": "Chai",
        "unitPrice": 150000.0,
        "beginningQty": 53.0,
        "importQty": 22.0,
        "exportQty": 25.0
      },
      {
        "code": "SPA062",
        "name": "Muối tắm Himalaya",
        "unit": "Gói",
        "unitPrice": 120000.0,
        "beginningQty": 61.0,
        "importQty": 9.0,
        "exportQty": 42.0
      },
      {
        "code": "SPA063",
        "name": "Sáp dưỡng thể",
        "unit": "Hộp",
        "unitPrice": 180000.0,
        "beginningQty": 28.0,
        "importQty": 14.0,
        "exportQty": 14.0
      },
      {
        "code": "SPA064",
        "name": "Nến thơm hương trà xanh",
        "unit": "Hũ",
        "unitPrice": 100000.0,
        "beginningQty": 95.0,
        "importQty": 41.0,
        "exportQty": 91.0
      },
      {
        "code": "SPA065",
        "name": "Sữa tắm dưỡng ẩm",
        "unit": "Chai",
        "unitPrice": 200000.0,
        "beginningQty": 40.0,
        "importQty": 46.0,
        "exportQty": 47.0
      },
      {
        "code": "SPA066",
        "name": "Dầu massage",
        "unit": "Chai",
        "unitPrice": 250000.0,
        "beginningQty": 13.0,
        "importQty": 42.0,
        "exportQty": 12.0
      },
      {
        "code": "SPA067",
        "name": "Kem dưỡng da ban đêm",
        "unit": "Hũ",
        "unitPrice": 300000.0,
        "beginningQty": 54.0,
        "importQty": 40.0,
        "exportQty": 88.0
      },
      {
        "code": "SPA068",
        "name": "Mặt nạ đất sét",
        "unit": "Hũ",
        "unitPrice": 220000.0,
        "beginningQty": 59.0,
        "importQty": 35.0,
        "exportQty": 39.0
      },
      {
        "code": "SPA069",
        "name": "Serum vitamin C",
        "unit": "Chai",
        "unitPrice": 350000.0,
        "beginningQty": 95.0,
        "importQty": 40.0,
        "exportQty": 22.0
      },
      {
        "code": "SPA070",
        "name": "Bông tẩy trang",
        "unit": "Gói",
        "unitPrice": 50000.0,
        "beginningQty": 44.0,
        "importQty": 38.0,
        "exportQty": 14.0
      },
      {
        "code": "SPA071",
        "name": "Sữa rửa mặt dịu nhẹ",
        "unit": "Chai",
        "unitPrice": 180000.0,
        "beginningQty": 16.0,
        "importQty": 25.0,
        "exportQty": 4.0
      },
      {
        "code": "SPA072",
        "name": "Tẩy tế bào chết",
        "unit": "Hũ",
        "unitPrice": 200000.0,
        "beginningQty": 18.0,
        "importQty": 19.0,
        "exportQty": 26.0
      },
      {
        "code": "SPA073",
        "name": "Kem chống nắng SPF50+",
        "unit": "Chai",
        "unitPrice": 320000.0,
        "beginningQty": 75.0,
        "importQty": 11.0,
        "exportQty": 35.0
      },
      {
        "code": "SPA074",
        "name": "Dầu gội thảo dược",
        "unit": "Chai",
        "unitPrice": 210000.0,
        "beginningQty": 18.0,
        "importQty": 35.0,
        "exportQty": 9.0
      },
      {
        "code": "SPA075",
        "name": "Tinh dầu tràm",
        "unit": "Chai",
        "unitPrice": 160000.0,
        "beginningQty": 58.0,
        "importQty": 47.0,
        "exportQty": 9.0
      },
      {
        "code": "SPA076",
        "name": "Mặt nạ giấy dưỡng ẩm",
        "unit": "Hộp",
        "unitPrice": 90000.0,
        "beginningQty": 49.0,
        "importQty": 11.0,
        "exportQty": 53.0
      },
      {
        "code": "SPA077",
        "name": "Sáp thơm phòng",
        "unit": "Hũ",
        "unitPrice": 120000.0,
        "beginningQty": 21.0,
        "importQty": 46.0,
        "exportQty": 11.0
      },
      {
        "code": "SPA078",
        "name": "Găng tay tẩy tế bào chết",
        "unit": "Cặp",
        "unitPrice": 80000.0,
        "beginningQty": 30.0,
        "importQty": 31.0,
        "exportQty": 36.0
      },
      {
        "code": "SPA079",
        "name": "Kem dưỡng mắt",
        "unit": "Hũ",
        "unitPrice": 280000.0,
        "beginningQty": 55.0,
        "importQty": 27.0,
        "exportQty": 77.0
      },
      {
        "code": "SPA080",
        "name": "Nước hoa hồng",
        "unit": "Chai",
        "unitPrice": 230000.0,
        "beginningQty": 56.0,
        "importQty": 22.0,
        "exportQty": 57.0
      }
    ]
  },
  {
    "id": "htk-tap-hoa",
    "name": "HTK Tạp Hoá",
    "items": [
      {
        "code": "TPH001",
        "name": "Gạo ST25",
        "unit": "Kg",
        "unitPrice": 28000.0,
        "beginningQty": 60.0,
        "importQty": 122.0,
        "exportQty": 85.0
      },
      {
        "code": "TPH002",
        "name": "Nước mắm Nam Ngư",
        "unit": "Chai",
        "unitPrice": 20000.0,
        "beginningQty": 86.0,
        "importQty": 117.0,
        "exportQty": 167.0
      },
      {
        "code": "TPH003",
        "name": "Dầu ăn Tường An",
        "unit": "Lít",
        "unitPrice": 45000.0,
        "beginningQty": 211.0,
        "importQty": 132.0,
        "exportQty": 178.0
      },
      {
        "code": "TPH004",
        "name": "Bột ngọt Ajinomoto",
        "unit": "Gói",
        "unitPrice": 35000.0,
        "beginningQty": 295.0,
        "importQty": 147.0,
        "exportQty": 329.0
      },
      {
        "code": "TPH005",
        "name": "Đường cát trắng",
        "unit": "Kg",
        "unitPrice": 25000.0,
        "beginningQty": 246.0,
        "importQty": 113.0,
        "exportQty": 114.0
      },
      {
        "code": "TPH006",
        "name": "Muối i-ốt",
        "unit": "Kg",
        "unitPrice": 10000.0,
        "beginningQty": 253.0,
        "importQty": 69.0,
        "exportQty": 180.0
      },
      {
        "code": "TPH007",
        "name": "Sữa tươi Vinamilk",
        "unit": "Hộp",
        "unitPrice": 15000.0,
        "beginningQty": 175.0,
        "importQty": 79.0,
        "exportQty": 110.0
      },
      {
        "code": "TPH008",
        "name": "Bánh quy Cosy",
        "unit": "Gói",
        "unitPrice": 40000.0,
        "beginningQty": 106.0,
        "importQty": 74.0,
        "exportQty": 125.0
      },
      {
        "code": "TPH009",
        "name": "Mì gói Hảo Hảo",
        "unit": "Thùng",
        "unitPrice": 110000.0,
        "beginningQty": 72.0,
        "importQty": 83.0,
        "exportQty": 55.0
      },
      {
        "code": "TPH010",
        "name": "Cà phê G7",
        "unit": "Hộp",
        "unitPrice": 70000.0,
        "beginningQty": 300.0,
        "importQty": 133.0,
        "exportQty": 277.0
      },
      {
        "code": "TPH011",
        "name": "Trà xanh Lipton",
        "unit": "Hộp",
        "unitPrice": 55000.0,
        "beginningQty": 158.0,
        "importQty": 124.0,
        "exportQty": 19.0
      },
      {
        "code": "TPH012",
        "name": "Nước ngọt Coca-Cola",
        "unit": "Chai",
        "unitPrice": 12000.0,
        "beginningQty": 243.0,
        "importQty": 121.0,
        "exportQty": 160.0
      },
      {
        "code": "TPH013",
        "name": "Bột giặt Omo",
        "unit": "Gói",
        "unitPrice": 75000.0,
        "beginningQty": 289.0,
        "importQty": 149.0,
        "exportQty": 208.0
      },
      {
        "code": "TPH014",
        "name": "Nước rửa chén Sunlight",
        "unit": "Chai",
        "unitPrice": 30000.0,
        "beginningQty": 113.0,
        "importQty": 48.0,
        "exportQty": 115.0
      },
      {
        "code": "TPH015",
        "name": "Kem đánh răng P/S",
        "unit": "Tuýp",
        "unitPrice": 25000.0,
        "beginningQty": 80.0,
        "importQty": 83.0,
        "exportQty": 153.0
      },
      {
        "code": "TPH016",
        "name": "Băng vệ sinh Diana",
        "unit": "Gói",
        "unitPrice": 40000.0,
        "beginningQty": 215.0,
        "importQty": 97.0,
        "exportQty": 181.0
      },
      {
        "code": "TPH017",
        "name": "Dầu gội Clear Men",
        "unit": "Chai",
        "unitPrice": 99000.0,
        "beginningQty": 299.0,
        "importQty": 40.0,
        "exportQty": 48.0
      },
      {
        "code": "TPH018",
        "name": "Sữa đặc Ông Thọ",
        "unit": "Lon",
        "unitPrice": 25000.0,
        "beginningQty": 280.0,
        "importQty": 25.0,
        "exportQty": 102.0
      },
      {
        "code": "TPH019",
        "name": "Trứng gà ta",
        "unit": "Chục",
        "unitPrice": 40000.0,
        "beginningQty": 300.0,
        "importQty": 114.0,
        "exportQty": 195.0
      },
      {
        "code": "TPH020",
        "name": "Nước suối Lavie",
        "unit": "Chai",
        "unitPrice": 5000.0,
        "beginningQty": 144.0,
        "importQty": 48.0,
        "exportQty": 38.0
      },
      {
        "code": "TPH021",
        "name": "Giấy vệ sinh Pulppy",
        "unit": "Cuộn",
        "unitPrice": 12000.0,
        "beginningQty": 164.0,
        "importQty": 40.0,
        "exportQty": 86.0
      },
      {
        "code": "TPH022",
        "name": "Chanh tươi",
        "unit": "Kg",
        "unitPrice": 25000.0,
        "beginningQty": 141.0,
        "importQty": 142.0,
        "exportQty": 110.0
      },
      {
        "code": "TPH023",
        "name": "Hành tím",
        "unit": "Kg",
        "unitPrice": 35000.0,
        "beginningQty": 204.0,
        "importQty": 26.0,
        "exportQty": 89.0
      },
      {
        "code": "TPH024",
        "name": "Tỏi Lý Sơn",
        "unit": "Kg",
        "unitPrice": 55000.0,
        "beginningQty": 227.0,
        "importQty": 94.0,
        "exportQty": 100.0
      },
      {
        "code": "TPH025",
        "name": "Bột mì đa dụng",
        "unit": "Gói",
        "unitPrice": 30000.0,
        "beginningQty": 156.0,
        "importQty": 132.0,
        "exportQty": 257.0
      },
      {
        "code": "TPH026",
        "name": "Sốt mayonnaise",
        "unit": "Chai",
        "unitPrice": 45000.0,
        "beginningQty": 210.0,
        "importQty": 127.0,
        "exportQty": 262.0
      },
      {
        "code": "TPH027",
        "name": "Dầu hào Maggi",
        "unit": "Chai",
        "unitPrice": 40000.0,
        "beginningQty": 141.0,
        "importQty": 74.0,
        "exportQty": 103.0
      },
      {
        "code": "TPH028",
        "name": "Mắm tôm Thanh Hương",
        "unit": "Chai",
        "unitPrice": 30000.0,
        "beginningQty": 52.0,
        "importQty": 103.0,
        "exportQty": 48.0
      },
      {
        "code": "TPH029",
        "name": "Bột cacao Nestle",
        "unit": "Hộp",
        "unitPrice": 90000.0,
        "beginningQty": 116.0,
        "importQty": 51.0,
        "exportQty": 106.0
      },
      {
        "code": "TPH030",
        "name": "Ngũ cốc Calbee",
        "unit": "Gói",
        "unitPrice": 120000.0,
        "beginningQty": 197.0,
        "importQty": 24.0,
        "exportQty": 103.0
      },
      {
        "code": "TPH031",
        "name": "Gạo ST25",
        "unit": "Kg",
        "unitPrice": 28000.0,
        "beginningQty": 68.0,
        "importQty": 142.0,
        "exportQty": 108.0
      },
      {
        "code": "TPH032",
        "name": "Nước mắm Nam Ngư",
        "unit": "Chai",
        "unitPrice": 20000.0,
        "beginningQty": 224.0,
        "importQty": 146.0,
        "exportQty": 238.0
      },
      {
        "code": "TPH033",
        "name": "Dầu ăn Tường An",
        "unit": "Lít",
        "unitPrice": 45000.0,
        "beginningQty": 60.0,
        "importQty": 88.0,
        "exportQty": 81.0
      },
      {
        "code": "TPH034",
        "name": "Bột ngọt Ajinomoto",
        "unit": "Gói",
        "unitPrice": 35000.0,
        "beginningQty": 187.0,
        "importQty": 78.0,
        "exportQty": 187.0
      },
      {
        "code": "TPH035",
        "name": "Đường cát trắng",
        "unit": "Kg",
        "unitPrice": 25000.0,
        "beginningQty": 90.0,
        "importQty": 35.0,
        "exportQty": 98.0
      },
      {
        "code": "TPH036",
        "name": "Muối i-ốt",
        "unit": "Kg",
        "unitPrice": 10000.0,
        "beginningQty": 290.0,
        "importQty": 60.0,
        "exportQty": 152.0
      },
      {
        "code": "TPH037",
        "name": "Sữa tươi Vinamilk",
        "unit": "Hộp",
        "unitPrice": 15000.0,
        "beginningQty": 138.0,
        "importQty": 37.0,
        "exportQty": 66.0
      },
      {
        "code": "TPH038",
        "name": "Bánh quy Cosy",
        "unit": "Gói",
        "unitPrice": 40000.0,
        "beginningQty": 237.0,
        "importQty": 50.0,
        "exportQty": 249.0
      },
      {
        "code": "TPH039",
        "name": "Mì gói Hảo Hảo",
        "unit": "Thùng",
        "unitPrice": 110000.0,
        "beginningQty": 238.0,
        "importQty": 20.0,
        "exportQty": 203.0
      },
      {
        "code": "TPH040",
        "name": "Cà phê G7",
        "unit": "Hộp",
        "unitPrice": 70000.0,
        "beginningQty": 74.0,
        "importQty": 56.0,
        "exportQty": 90.0
      },
      {
        "code": "TPH041",
        "name": "Trà xanh Lipton",
        "unit": "Hộp",
        "unitPrice": 55000.0,
        "beginningQty": 287.0,
        "importQty": 60.0,
        "exportQty": 283.0
      },
      {
        "code": "TPH042",
        "name": "Nước ngọt Coca-Cola",
        "unit": "Chai",
        "unitPrice": 12000.0,
        "beginningQty": 118.0,
        "importQty": 95.0,
        "exportQty": 67.0
      },
      {
        "code": "TPH043",
        "name": "Bột giặt Omo",
        "unit": "Gói",
        "unitPrice": 75000.0,
        "beginningQty": 116.0,
        "importQty": 94.0,
        "exportQty": 69.0
      },
      {
        "code": "TPH044",
        "name": "Nước rửa chén Sunlight",
        "unit": "Chai",
        "unitPrice": 30000.0,
        "beginningQty": 190.0,
        "importQty": 99.0,
        "exportQty": 190.0
      },
      {
        "code": "TPH045",
        "name": "Kem đánh răng P/S",
        "unit": "Tuýp",
        "unitPrice": 25000.0,
        "beginningQty": 87.0,
        "importQty": 145.0,
        "exportQty": 192.0
      },
      {
        "code": "TPH046",
        "name": "Băng vệ sinh Diana",
        "unit": "Gói",
        "unitPrice": 40000.0,
        "beginningQty": 266.0,
        "importQty": 103.0,
        "exportQty": 119.0
      },
      {
        "code": "TPH047",
        "name": "Dầu gội Clear Men",
        "unit": "Chai",
        "unitPrice": 99000.0,
        "beginningQty": 192.0,
        "importQty": 34.0,
        "exportQty": 70.0
      },
      {
        "code": "TPH048",
        "name": "Sữa đặc Ông Thọ",
        "unit": "Lon",
        "unitPrice": 25000.0,
        "beginningQty": 289.0,
        "importQty": 113.0,
        "exportQty": 101.0
      },
      {
        "code": "TPH049",
        "name": "Trứng gà ta",
        "unit": "Chục",
        "unitPrice": 40000.0,
        "beginningQty": 99.0,
        "importQty": 115.0,
        "exportQty": 118.0
      },
      {
        "code": "TPH050",
        "name": "Nước suối Lavie",
        "unit": "Chai",
        "unitPrice": 5000.0,
        "beginningQty": 293.0,
        "importQty": 52.0,
        "exportQty": 188.0
      },
      {
        "code": "TPH051",
        "name": "Giấy vệ sinh Pulppy",
        "unit": "Cuộn",
        "unitPrice": 12000.0,
        "beginningQty": 95.0,
        "importQty": 36.0,
        "exportQty": 48.0
      },
      {
        "code": "TPH052",
        "name": "Chanh tươi",
        "unit": "Kg",
        "unitPrice": 25000.0,
        "beginningQty": 243.0,
        "importQty": 143.0,
        "exportQty": 195.0
      },
      {
        "code": "TPH053",
        "name": "Hành tím",
        "unit": "Kg",
        "unitPrice": 35000.0,
        "beginningQty": 279.0,
        "importQty": 50.0,
        "exportQty": 215.0
      },
      {
        "code": "TPH054",
        "name": "Tỏi Lý Sơn",
        "unit": "Kg",
        "unitPrice": 55000.0,
        "beginningQty": 263.0,
        "importQty": 137.0,
        "exportQty": 216.0
      },
      {
        "code": "TPH055",
        "name": "Bột mì đa dụng",
        "unit": "Gói",
        "unitPrice": 30000.0,
        "beginningQty": 300.0,
        "importQty": 54.0,
        "exportQty": 285.0
      },
      {
        "code": "TPH056",
        "name": "Sốt mayonnaise",
        "unit": "Chai",
        "unitPrice": 45000.0,
        "beginningQty": 235.0,
        "importQty": 149.0,
        "exportQty": 165.0
      },
      {
        "code": "TPH057",
        "name": "Dầu hào Maggi",
        "unit": "Chai",
        "unitPrice": 40000.0,
        "beginningQty": 143.0,
        "importQty": 75.0,
        "exportQty": 110.0
      },
      {
        "code": "TPH058",
        "name": "Mắm tôm Thanh Hương",
        "unit": "Chai",
        "unitPrice": 30000.0,
        "beginningQty": 197.0,
        "importQty": 82.0,
        "exportQty": 199.0
      },
      {
        "code": "TPH059",
        "name": "Bột cacao Nestle",
        "unit": "Hộp",
        "unitPrice": 90000.0,
        "beginningQty": 56.0,
        "importQty": 70.0,
        "exportQty": 52.0
      },
      {
        "code": "TPH060",
        "name": "Ngũ cốc Calbee",
        "unit": "Gói",
        "unitPrice": 120000.0,
        "beginningQty": 106.0,
        "importQty": 27.0,
        "exportQty": 111.0
      },
      {
        "code": "TPH061",
        "name": "Gạo ST25",
        "unit": "Kg",
        "unitPrice": 28000.0,
        "beginningQty": 138.0,
        "importQty": 52.0,
        "exportQty": 89.0
      },
      {
        "code": "TPH062",
        "name": "Nước mắm Nam Ngư",
        "unit": "Chai",
        "unitPrice": 20000.0,
        "beginningQty": 164.0,
        "importQty": 116.0,
        "exportQty": 55.0
      },
      {
        "code": "TPH063",
        "name": "Dầu ăn Tường An",
        "unit": "Lít",
        "unitPrice": 45000.0,
        "beginningQty": 243.0,
        "importQty": 102.0,
        "exportQty": 152.0
      },
      {
        "code": "TPH064",
        "name": "Bột ngọt Ajinomoto",
        "unit": "Gói",
        "unitPrice": 35000.0,
        "beginningQty": 93.0,
        "importQty": 84.0,
        "exportQty": 88.0
      },
      {
        "code": "TPH065",
        "name": "Đường cát trắng",
        "unit": "Kg",
        "unitPrice": 25000.0,
        "beginningQty": 162.0,
        "importQty": 112.0,
        "exportQty": 88.0
      },
      {
        "code": "TPH066",
        "name": "Muối i-ốt",
        "unit": "Kg",
        "unitPrice": 10000.0,
        "beginningQty": 236.0,
        "importQty": 62.0,
        "exportQty": 210.0
      },
      {
        "code": "TPH067",
        "name": "Sữa tươi Vinamilk",
        "unit": "Hộp",
        "unitPrice": 15000.0,
        "beginningQty": 99.0,
        "importQty": 100.0,
        "exportQty": 57.0
      },
      {
        "code": "TPH068",
        "name": "Bánh quy Cosy",
        "unit": "Gói",
        "unitPrice": 40000.0,
        "beginningQty": 277.0,
        "importQty": 23.0,
        "exportQty": 118.0
      },
      {
        "code": "TPH069",
        "name": "Mì gói Hảo Hảo",
        "unit": "Thùng",
        "unitPrice": 110000.0,
        "beginningQty": 252.0,
        "importQty": 141.0,
        "exportQty": 319.0
      },
      {
        "code": "TPH070",
        "name": "Cà phê G7",
        "unit": "Hộp",
        "unitPrice": 70000.0,
        "beginningQty": 243.0,
        "importQty": 132.0,
        "exportQty": 244.0
      },
      {
        "code": "TPH071",
        "name": "Trà xanh Lipton",
        "unit": "Hộp",
        "unitPrice": 55000.0,
        "beginningQty": 161.0,
        "importQty": 146.0,
        "exportQty": 98.0
      },
      {
        "code": "TPH072",
        "name": "Nước ngọt Coca-Cola",
        "unit": "Chai",
        "unitPrice": 12000.0,
        "beginningQty": 249.0,
        "importQty": 107.0,
        "exportQty": 248.0
      },
      {
        "code": "TPH073",
        "name": "Bột giặt Omo",
        "unit": "Gói",
        "unitPrice": 75000.0,
        "beginningQty": 207.0,
        "importQty": 111.0,
        "exportQty": 269.0
      },
      {
        "code": "TPH074",
        "name": "Nước rửa chén Sunlight",
        "unit": "Chai",
        "unitPrice": 30000.0,
        "beginningQty": 56.0,
        "importQty": 71.0,
        "exportQty": 36.0
      },
      {
        "code": "TPH075",
        "name": "Kem đánh răng P/S",
        "unit": "Tuýp",
        "unitPrice": 25000.0,
        "beginningQty": 151.0,
        "importQty": 117.0,
        "exportQty": 199.0
      },
      {
        "code": "TPH076",
        "name": "Băng vệ sinh Diana",
        "unit": "Gói",
        "unitPrice": 40000.0,
        "beginningQty": 245.0,
        "importQty": 68.0,
        "exportQty": 96.0
      },
      {
        "code": "TPH077",
        "name": "Dầu gội Clear Men",
        "unit": "Chai",
        "unitPrice": 99000.0,
        "beginningQty": 179.0,
        "importQty": 53.0,
        "exportQty": 98.0
      },
      {
        "code": "TPH078",
        "name": "Sữa đặc Ông Thọ",
        "unit": "Lon",
        "unitPrice": 25000.0,
        "beginningQty": 202.0,
        "importQty": 96.0,
        "exportQty": 139.0
      },
      {
        "code": "TPH079",
        "name": "Trứng gà ta",
        "unit": "Chục",
        "unitPrice": 40000.0,
        "beginningQty": 172.0,
        "importQty": 134.0,
        "exportQty": 134.0
      },
      {
        "code": "TPH080",
        "name": "Nước suối Lavie",
        "unit": "Chai",
        "unitPrice": 5000.0,
        "beginningQty": 152.0,
        "importQty": 34.0,
        "exportQty": 34.0
      }
    ]
  },
  {
    "id": "htk-quan-ao-nu",
    "name": "HTK Quần Áo Nữ",
    "items": [
      {
        "code": "CLTNU001",
        "name": "Đầm suông họa tiết",
        "unit": "Chiếc",
        "unitPrice": 350000.0,
        "beginningQty": 62.0,
        "importQty": 50.0,
        "exportQty": 34.0
      },
      {
        "code": "CLTNU002",
        "name": "Đầm ôm body",
        "unit": "Chiếc",
        "unitPrice": 420000.0,
        "beginningQty": 27.0,
        "importQty": 36.0,
        "exportQty": 42.0
      },
      {
        "code": "CLTNU003",
        "name": "Chân váy xếp ly",
        "unit": "Chiếc",
        "unitPrice": 250000.0,
        "beginningQty": 23.0,
        "importQty": 31.0,
        "exportQty": 43.0
      },
      {
        "code": "CLTNU004",
        "name": "Chân váy jean",
        "unit": "Chiếc",
        "unitPrice": 270000.0,
        "beginningQty": 34.0,
        "importQty": 21.0,
        "exportQty": 48.0
      },
      {
        "code": "CLTNU005",
        "name": "Chân váy midi",
        "unit": "Chiếc",
        "unitPrice": 290000.0,
        "beginningQty": 108.0,
        "importQty": 67.0,
        "exportQty": 156.0
      },
      {
        "code": "CLTNU006",
        "name": "Áo sơ mi nữ công sở",
        "unit": "Chiếc",
        "unitPrice": 260000.0,
        "beginningQty": 146.0,
        "importQty": 46.0,
        "exportQty": 99.0
      },
      {
        "code": "CLTNU007",
        "name": "Áo sơ mi nữ tay phồng",
        "unit": "Chiếc",
        "unitPrice": 280000.0,
        "beginningQty": 125.0,
        "importQty": 63.0,
        "exportQty": 178.0
      },
      {
        "code": "CLTNU008",
        "name": "Áo thun nữ crop-top",
        "unit": "Chiếc",
        "unitPrice": 200000.0,
        "beginningQty": 116.0,
        "importQty": 71.0,
        "exportQty": 176.0
      },
      {
        "code": "CLTNU009",
        "name": "Áo thun nữ oversize",
        "unit": "Chiếc",
        "unitPrice": 180000.0,
        "beginningQty": 148.0,
        "importQty": 78.0,
        "exportQty": 107.0
      },
      {
        "code": "CLTNU010",
        "name": "Quần jean nữ baggy",
        "unit": "Chiếc",
        "unitPrice": 390000.0,
        "beginningQty": 123.0,
        "importQty": 29.0,
        "exportQty": 46.0
      },
      {
        "code": "CLTNU011",
        "name": "Quần jean nữ skinny",
        "unit": "Chiếc",
        "unitPrice": 360000.0,
        "beginningQty": 106.0,
        "importQty": 69.0,
        "exportQty": 82.0
      },
      {
        "code": "CLTNU012",
        "name": "Quần short nữ năng động",
        "unit": "Chiếc",
        "unitPrice": 190000.0,
        "beginningQty": 35.0,
        "importQty": 80.0,
        "exportQty": 45.0
      },
      {
        "code": "CLTNU013",
        "name": "Áo khoác len nữ dáng dài",
        "unit": "Chiếc",
        "unitPrice": 420000.0,
        "beginningQty": 22.0,
        "importQty": 55.0,
        "exportQty": 24.0
      },
      {
        "code": "CLTNU014",
        "name": "Áo khoác dạ nữ",
        "unit": "Chiếc",
        "unitPrice": 750000.0,
        "beginningQty": 37.0,
        "importQty": 60.0,
        "exportQty": 44.0
      },
      {
        "code": "CLTNU015",
        "name": "Áo blazer nữ sang trọng",
        "unit": "Chiếc",
        "unitPrice": 650000.0,
        "beginningQty": 88.0,
        "importQty": 33.0,
        "exportQty": 45.0
      },
      {
        "code": "CLTNU016",
        "name": "Váy maxi đi biển",
        "unit": "Chiếc",
        "unitPrice": 550000.0,
        "beginningQty": 134.0,
        "importQty": 63.0,
        "exportQty": 27.0
      },
      {
        "code": "CLTNU017",
        "name": "Váy xòe công chúa",
        "unit": "Chiếc",
        "unitPrice": 480000.0,
        "beginningQty": 59.0,
        "importQty": 68.0,
        "exportQty": 29.0
      },
      {
        "code": "CLTNU018",
        "name": "Bộ đồ thể thao nữ",
        "unit": "Bộ",
        "unitPrice": 450000.0,
        "beginningQty": 124.0,
        "importQty": 59.0,
        "exportQty": 146.0
      },
      {
        "code": "CLTNU019",
        "name": "Bộ vest nữ công sở",
        "unit": "Bộ",
        "unitPrice": 1200000.0,
        "beginningQty": 83.0,
        "importQty": 27.0,
        "exportQty": 10.0
      },
      {
        "code": "CLTNU020",
        "name": "Áo len cổ lọ nữ",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 34.0,
        "importQty": 12.0,
        "exportQty": 6.0
      },
      {
        "code": "CLTNU021",
        "name": "Áo khoác gió nữ",
        "unit": "Chiếc",
        "unitPrice": 370000.0,
        "beginningQty": 64.0,
        "importQty": 67.0,
        "exportQty": 98.0
      },
      {
        "code": "CLTNU022",
        "name": "Đầm babydoll dễ thương",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 107.0,
        "importQty": 29.0,
        "exportQty": 38.0
      },
      {
        "code": "CLTNU023",
        "name": "Áo sơ mi voan nữ",
        "unit": "Chiếc",
        "unitPrice": 280000.0,
        "beginningQty": 47.0,
        "importQty": 40.0,
        "exportQty": 57.0
      },
      {
        "code": "CLTNU024",
        "name": "Áo kiểu nữ trễ vai",
        "unit": "Chiếc",
        "unitPrice": 290000.0,
        "beginningQty": 47.0,
        "importQty": 66.0,
        "exportQty": 51.0
      },
      {
        "code": "CLTNU025",
        "name": "Quần culottes nữ",
        "unit": "Chiếc",
        "unitPrice": 350000.0,
        "beginningQty": 59.0,
        "importQty": 10.0,
        "exportQty": 10.0
      },
      {
        "code": "CLTNU026",
        "name": "Áo khoác cardigan nữ",
        "unit": "Chiếc",
        "unitPrice": 340000.0,
        "beginningQty": 95.0,
        "importQty": 65.0,
        "exportQty": 100.0
      },
      {
        "code": "CLTNU027",
        "name": "Áo khoác phao nữ",
        "unit": "Chiếc",
        "unitPrice": 850000.0,
        "beginningQty": 147.0,
        "importQty": 56.0,
        "exportQty": 121.0
      },
      {
        "code": "CLTNU028",
        "name": "Áo giữ nhiệt nữ",
        "unit": "Chiếc",
        "unitPrice": 260000.0,
        "beginningQty": 70.0,
        "importQty": 63.0,
        "exportQty": 46.0
      },
      {
        "code": "CLTNU029",
        "name": "Đầm dự tiệc cao cấp",
        "unit": "Chiếc",
        "unitPrice": 1500000.0,
        "beginningQty": 125.0,
        "importQty": 46.0,
        "exportQty": 60.0
      },
      {
        "code": "CLTNU030",
        "name": "Áo blazer nữ kẻ caro",
        "unit": "Chiếc",
        "unitPrice": 680000.0,
        "beginningQty": 23.0,
        "importQty": 40.0,
        "exportQty": 29.0
      },
      {
        "code": "CLTNU031",
        "name": "Đầm suông họa tiết",
        "unit": "Chiếc",
        "unitPrice": 350000.0,
        "beginningQty": 136.0,
        "importQty": 51.0,
        "exportQty": 46.0
      },
      {
        "code": "CLTNU032",
        "name": "Đầm ôm body",
        "unit": "Chiếc",
        "unitPrice": 420000.0,
        "beginningQty": 33.0,
        "importQty": 72.0,
        "exportQty": 48.0
      },
      {
        "code": "CLTNU033",
        "name": "Chân váy xếp ly",
        "unit": "Chiếc",
        "unitPrice": 250000.0,
        "beginningQty": 90.0,
        "importQty": 34.0,
        "exportQty": 90.0
      },
      {
        "code": "CLTNU034",
        "name": "Chân váy jean",
        "unit": "Chiếc",
        "unitPrice": 270000.0,
        "beginningQty": 132.0,
        "importQty": 52.0,
        "exportQty": 89.0
      },
      {
        "code": "CLTNU035",
        "name": "Chân váy midi",
        "unit": "Chiếc",
        "unitPrice": 290000.0,
        "beginningQty": 35.0,
        "importQty": 48.0,
        "exportQty": 26.0
      },
      {
        "code": "CLTNU036",
        "name": "Áo sơ mi nữ công sở",
        "unit": "Chiếc",
        "unitPrice": 260000.0,
        "beginningQty": 53.0,
        "importQty": 27.0,
        "exportQty": 18.0
      },
      {
        "code": "CLTNU037",
        "name": "Áo sơ mi nữ tay phồng",
        "unit": "Chiếc",
        "unitPrice": 280000.0,
        "beginningQty": 77.0,
        "importQty": 60.0,
        "exportQty": 28.0
      },
      {
        "code": "CLTNU038",
        "name": "Áo thun nữ crop-top",
        "unit": "Chiếc",
        "unitPrice": 200000.0,
        "beginningQty": 146.0,
        "importQty": 78.0,
        "exportQty": 19.0
      },
      {
        "code": "CLTNU039",
        "name": "Áo thun nữ oversize",
        "unit": "Chiếc",
        "unitPrice": 180000.0,
        "beginningQty": 72.0,
        "importQty": 10.0,
        "exportQty": 73.0
      },
      {
        "code": "CLTNU040",
        "name": "Quần jean nữ baggy",
        "unit": "Chiếc",
        "unitPrice": 390000.0,
        "beginningQty": 94.0,
        "importQty": 13.0,
        "exportQty": 29.0
      },
      {
        "code": "CLTNU041",
        "name": "Quần jean nữ skinny",
        "unit": "Chiếc",
        "unitPrice": 360000.0,
        "beginningQty": 110.0,
        "importQty": 63.0,
        "exportQty": 99.0
      },
      {
        "code": "CLTNU042",
        "name": "Quần short nữ năng động",
        "unit": "Chiếc",
        "unitPrice": 190000.0,
        "beginningQty": 86.0,
        "importQty": 72.0,
        "exportQty": 73.0
      },
      {
        "code": "CLTNU043",
        "name": "Áo khoác len nữ dáng dài",
        "unit": "Chiếc",
        "unitPrice": 420000.0,
        "beginningQty": 40.0,
        "importQty": 54.0,
        "exportQty": 35.0
      },
      {
        "code": "CLTNU044",
        "name": "Áo khoác dạ nữ",
        "unit": "Chiếc",
        "unitPrice": 750000.0,
        "beginningQty": 70.0,
        "importQty": 74.0,
        "exportQty": 60.0
      },
      {
        "code": "CLTNU045",
        "name": "Áo blazer nữ sang trọng",
        "unit": "Chiếc",
        "unitPrice": 650000.0,
        "beginningQty": 34.0,
        "importQty": 58.0,
        "exportQty": 29.0
      },
      {
        "code": "CLTNU046",
        "name": "Váy maxi đi biển",
        "unit": "Chiếc",
        "unitPrice": 550000.0,
        "beginningQty": 105.0,
        "importQty": 21.0,
        "exportQty": 62.0
      },
      {
        "code": "CLTNU047",
        "name": "Váy xòe công chúa",
        "unit": "Chiếc",
        "unitPrice": 480000.0,
        "beginningQty": 71.0,
        "importQty": 42.0,
        "exportQty": 62.0
      },
      {
        "code": "CLTNU048",
        "name": "Bộ đồ thể thao nữ",
        "unit": "Bộ",
        "unitPrice": 450000.0,
        "beginningQty": 88.0,
        "importQty": 27.0,
        "exportQty": 66.0
      },
      {
        "code": "CLTNU049",
        "name": "Bộ vest nữ công sở",
        "unit": "Bộ",
        "unitPrice": 1200000.0,
        "beginningQty": 122.0,
        "importQty": 76.0,
        "exportQty": 94.0
      },
      {
        "code": "CLTNU050",
        "name": "Áo len cổ lọ nữ",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 130.0,
        "importQty": 28.0,
        "exportQty": 142.0
      },
      {
        "code": "CLTNU051",
        "name": "Áo khoác gió nữ",
        "unit": "Chiếc",
        "unitPrice": 370000.0,
        "beginningQty": 82.0,
        "importQty": 71.0,
        "exportQty": 113.0
      },
      {
        "code": "CLTNU052",
        "name": "Đầm babydoll dễ thương",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 33.0,
        "importQty": 11.0,
        "exportQty": 14.0
      },
      {
        "code": "CLTNU053",
        "name": "Áo sơ mi voan nữ",
        "unit": "Chiếc",
        "unitPrice": 280000.0,
        "beginningQty": 121.0,
        "importQty": 80.0,
        "exportQty": 86.0
      },
      {
        "code": "CLTNU054",
        "name": "Áo kiểu nữ trễ vai",
        "unit": "Chiếc",
        "unitPrice": 290000.0,
        "beginningQty": 99.0,
        "importQty": 65.0,
        "exportQty": 28.0
      },
      {
        "code": "CLTNU055",
        "name": "Quần culottes nữ",
        "unit": "Chiếc",
        "unitPrice": 350000.0,
        "beginningQty": 141.0,
        "importQty": 19.0,
        "exportQty": 23.0
      },
      {
        "code": "CLTNU056",
        "name": "Áo khoác cardigan nữ",
        "unit": "Chiếc",
        "unitPrice": 340000.0,
        "beginningQty": 94.0,
        "importQty": 35.0,
        "exportQty": 120.0
      },
      {
        "code": "CLTNU057",
        "name": "Áo khoác phao nữ",
        "unit": "Chiếc",
        "unitPrice": 850000.0,
        "beginningQty": 127.0,
        "importQty": 54.0,
        "exportQty": 67.0
      },
      {
        "code": "CLTNU058",
        "name": "Áo giữ nhiệt nữ",
        "unit": "Chiếc",
        "unitPrice": 260000.0,
        "beginningQty": 110.0,
        "importQty": 70.0,
        "exportQty": 114.0
      },
      {
        "code": "CLTNU059",
        "name": "Đầm dự tiệc cao cấp",
        "unit": "Chiếc",
        "unitPrice": 1500000.0,
        "beginningQty": 128.0,
        "importQty": 38.0,
        "exportQty": 37.0
      },
      {
        "code": "CLTNU060",
        "name": "Áo blazer nữ kẻ caro",
        "unit": "Chiếc",
        "unitPrice": 680000.0,
        "beginningQty": 75.0,
        "importQty": 77.0,
        "exportQty": 58.0
      },
      {
        "code": "CLTNU061",
        "name": "Đầm suông họa tiết",
        "unit": "Chiếc",
        "unitPrice": 350000.0,
        "beginningQty": 93.0,
        "importQty": 52.0,
        "exportQty": 112.0
      },
      {
        "code": "CLTNU062",
        "name": "Đầm ôm body",
        "unit": "Chiếc",
        "unitPrice": 420000.0,
        "beginningQty": 68.0,
        "importQty": 76.0,
        "exportQty": 50.0
      },
      {
        "code": "CLTNU063",
        "name": "Chân váy xếp ly",
        "unit": "Chiếc",
        "unitPrice": 250000.0,
        "beginningQty": 47.0,
        "importQty": 12.0,
        "exportQty": 21.0
      },
      {
        "code": "CLTNU064",
        "name": "Chân váy jean",
        "unit": "Chiếc",
        "unitPrice": 270000.0,
        "beginningQty": 54.0,
        "importQty": 70.0,
        "exportQty": 25.0
      },
      {
        "code": "CLTNU065",
        "name": "Chân váy midi",
        "unit": "Chiếc",
        "unitPrice": 290000.0,
        "beginningQty": 73.0,
        "importQty": 36.0,
        "exportQty": 79.0
      },
      {
        "code": "CLTNU066",
        "name": "Áo sơ mi nữ công sở",
        "unit": "Chiếc",
        "unitPrice": 260000.0,
        "beginningQty": 71.0,
        "importQty": 13.0,
        "exportQty": 57.0
      },
      {
        "code": "CLTNU067",
        "name": "Áo sơ mi nữ tay phồng",
        "unit": "Chiếc",
        "unitPrice": 280000.0,
        "beginningQty": 105.0,
        "importQty": 44.0,
        "exportQty": 129.0
      },
      {
        "code": "CLTNU068",
        "name": "Áo thun nữ crop-top",
        "unit": "Chiếc",
        "unitPrice": 200000.0,
        "beginningQty": 51.0,
        "importQty": 31.0,
        "exportQty": 32.0
      },
      {
        "code": "CLTNU069",
        "name": "Áo thun nữ oversize",
        "unit": "Chiếc",
        "unitPrice": 180000.0,
        "beginningQty": 21.0,
        "importQty": 63.0,
        "exportQty": 53.0
      },
      {
        "code": "CLTNU070",
        "name": "Quần jean nữ baggy",
        "unit": "Chiếc",
        "unitPrice": 390000.0,
        "beginningQty": 121.0,
        "importQty": 24.0,
        "exportQty": 135.0
      },
      {
        "code": "CLTNU071",
        "name": "Quần jean nữ skinny",
        "unit": "Chiếc",
        "unitPrice": 360000.0,
        "beginningQty": 117.0,
        "importQty": 52.0,
        "exportQty": 153.0
      },
      {
        "code": "CLTNU072",
        "name": "Quần short nữ năng động",
        "unit": "Chiếc",
        "unitPrice": 190000.0,
        "beginningQty": 126.0,
        "importQty": 44.0,
        "exportQty": 21.0
      },
      {
        "code": "CLTNU073",
        "name": "Áo khoác len nữ dáng dài",
        "unit": "Chiếc",
        "unitPrice": 420000.0,
        "beginningQty": 120.0,
        "importQty": 61.0,
        "exportQty": 124.0
      },
      {
        "code": "CLTNU074",
        "name": "Áo khoác dạ nữ",
        "unit": "Chiếc",
        "unitPrice": 750000.0,
        "beginningQty": 96.0,
        "importQty": 50.0,
        "exportQty": 61.0
      },
      {
        "code": "CLTNU075",
        "name": "Áo blazer nữ sang trọng",
        "unit": "Chiếc",
        "unitPrice": 650000.0,
        "beginningQty": 94.0,
        "importQty": 65.0,
        "exportQty": 64.0
      },
      {
        "code": "CLTNU076",
        "name": "Váy maxi đi biển",
        "unit": "Chiếc",
        "unitPrice": 550000.0,
        "beginningQty": 53.0,
        "importQty": 37.0,
        "exportQty": 68.0
      },
      {
        "code": "CLTNU077",
        "name": "Váy xòe công chúa",
        "unit": "Chiếc",
        "unitPrice": 480000.0,
        "beginningQty": 81.0,
        "importQty": 78.0,
        "exportQty": 138.0
      },
      {
        "code": "CLTNU078",
        "name": "Bộ đồ thể thao nữ",
        "unit": "Bộ",
        "unitPrice": 450000.0,
        "beginningQty": 73.0,
        "importQty": 23.0,
        "exportQty": 50.0
      },
      {
        "code": "CLTNU079",
        "name": "Bộ vest nữ công sở",
        "unit": "Bộ",
        "unitPrice": 1200000.0,
        "beginningQty": 58.0,
        "importQty": 57.0,
        "exportQty": 10.0
      },
      {
        "code": "CLTNU080",
        "name": "Áo len cổ lọ nữ",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 103.0,
        "importQty": 27.0,
        "exportQty": 17.0
      }
    ]
  },
  {
    "id": "htk-quan-ao-nam",
    "name": "HTK Quần Áo Nam",
    "items": [
      {
        "code": "CLTN001",
        "name": "Áo thun nam basic",
        "unit": "Chiếc",
        "unitPrice": 120000.0,
        "beginningQty": 54.0,
        "importQty": 53.0,
        "exportQty": 13.0
      },
      {
        "code": "CLTN002",
        "name": "Áo thun nam cổ tròn",
        "unit": "Chiếc",
        "unitPrice": 150000.0,
        "beginningQty": 36.0,
        "importQty": 50.0,
        "exportQty": 34.0
      },
      {
        "code": "CLTN003",
        "name": "Áo thun nam thể thao",
        "unit": "Chiếc",
        "unitPrice": 180000.0,
        "beginningQty": 118.0,
        "importQty": 43.0,
        "exportQty": 54.0
      },
      {
        "code": "CLTN004",
        "name": "Áo sơ mi nam dài tay",
        "unit": "Chiếc",
        "unitPrice": 250000.0,
        "beginningQty": 94.0,
        "importQty": 60.0,
        "exportQty": 7.0
      },
      {
        "code": "CLTN005",
        "name": "Áo sơ mi nam ngắn tay",
        "unit": "Chiếc",
        "unitPrice": 230000.0,
        "beginningQty": 127.0,
        "importQty": 40.0,
        "exportQty": 89.0
      },
      {
        "code": "CLTN006",
        "name": "Áo polo nam cotton",
        "unit": "Chiếc",
        "unitPrice": 200000.0,
        "beginningQty": 24.0,
        "importQty": 22.0,
        "exportQty": 18.0
      },
      {
        "code": "CLTN007",
        "name": "Áo polo nam cao cấp",
        "unit": "Chiếc",
        "unitPrice": 280000.0,
        "beginningQty": 66.0,
        "importQty": 54.0,
        "exportQty": 33.0
      },
      {
        "code": "CLTN008",
        "name": "Quần jeans nam slim fit",
        "unit": "Chiếc",
        "unitPrice": 350000.0,
        "beginningQty": 70.0,
        "importQty": 53.0,
        "exportQty": 91.0
      },
      {
        "code": "CLTN009",
        "name": "Quần jeans nam ống suông",
        "unit": "Chiếc",
        "unitPrice": 370000.0,
        "beginningQty": 142.0,
        "importQty": 64.0,
        "exportQty": 131.0
      },
      {
        "code": "CLTN010",
        "name": "Quần kaki nam ống đứng",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 56.0,
        "importQty": 18.0,
        "exportQty": 58.0
      },
      {
        "code": "CLTN011",
        "name": "Quần kaki nam co giãn",
        "unit": "Chiếc",
        "unitPrice": 340000.0,
        "beginningQty": 88.0,
        "importQty": 17.0,
        "exportQty": 58.0
      },
      {
        "code": "CLTN012",
        "name": "Quần short nam thể thao",
        "unit": "Chiếc",
        "unitPrice": 180000.0,
        "beginningQty": 146.0,
        "importQty": 42.0,
        "exportQty": 82.0
      },
      {
        "code": "CLTN013",
        "name": "Quần short nam jean",
        "unit": "Chiếc",
        "unitPrice": 210000.0,
        "beginningQty": 34.0,
        "importQty": 80.0,
        "exportQty": 65.0
      },
      {
        "code": "CLTN014",
        "name": "Áo khoác bomber nam",
        "unit": "Chiếc",
        "unitPrice": 450000.0,
        "beginningQty": 72.0,
        "importQty": 54.0,
        "exportQty": 113.0
      },
      {
        "code": "CLTN015",
        "name": "Áo khoác jean nam",
        "unit": "Chiếc",
        "unitPrice": 480000.0,
        "beginningQty": 133.0,
        "importQty": 27.0,
        "exportQty": 102.0
      },
      {
        "code": "CLTN016",
        "name": "Áo khoác da nam",
        "unit": "Chiếc",
        "unitPrice": 850000.0,
        "beginningQty": 108.0,
        "importQty": 62.0,
        "exportQty": 33.0
      },
      {
        "code": "CLTN017",
        "name": "Áo hoodie nam có nón",
        "unit": "Chiếc",
        "unitPrice": 420000.0,
        "beginningQty": 91.0,
        "importQty": 60.0,
        "exportQty": 52.0
      },
      {
        "code": "CLTN018",
        "name": "Áo hoodie nam trơn",
        "unit": "Chiếc",
        "unitPrice": 400000.0,
        "beginningQty": 140.0,
        "importQty": 72.0,
        "exportQty": 174.0
      },
      {
        "code": "CLTN019",
        "name": "Áo len nam cổ tròn",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 136.0,
        "importQty": 51.0,
        "exportQty": 109.0
      },
      {
        "code": "CLTN020",
        "name": "Áo vest nam công sở",
        "unit": "Chiếc",
        "unitPrice": 890000.0,
        "beginningQty": 150.0,
        "importQty": 47.0,
        "exportQty": 16.0
      },
      {
        "code": "CLTN021",
        "name": "Bộ đồ thể thao nam",
        "unit": "Bộ",
        "unitPrice": 550000.0,
        "beginningQty": 100.0,
        "importQty": 33.0,
        "exportQty": 127.0
      },
      {
        "code": "CLTN022",
        "name": "Bộ vest nam cao cấp",
        "unit": "Bộ",
        "unitPrice": 1500000.0,
        "beginningQty": 86.0,
        "importQty": 29.0,
        "exportQty": 16.0
      },
      {
        "code": "CLTN023",
        "name": "Quần tây nam công sở",
        "unit": "Chiếc",
        "unitPrice": 400000.0,
        "beginningQty": 40.0,
        "importQty": 69.0,
        "exportQty": 101.0
      },
      {
        "code": "CLTN024",
        "name": "Áo giữ nhiệt nam",
        "unit": "Chiếc",
        "unitPrice": 270000.0,
        "beginningQty": 143.0,
        "importQty": 11.0,
        "exportQty": 16.0
      },
      {
        "code": "CLTN025",
        "name": "Áo khoác gió nam",
        "unit": "Chiếc",
        "unitPrice": 380000.0,
        "beginningQty": 94.0,
        "importQty": 16.0,
        "exportQty": 8.0
      },
      {
        "code": "CLTN026",
        "name": "Áo sơ mi flannel nam",
        "unit": "Chiếc",
        "unitPrice": 260000.0,
        "beginningQty": 44.0,
        "importQty": 16.0,
        "exportQty": 5.0
      },
      {
        "code": "CLTN027",
        "name": "Áo ba lỗ nam",
        "unit": "Chiếc",
        "unitPrice": 140000.0,
        "beginningQty": 54.0,
        "importQty": 40.0,
        "exportQty": 38.0
      },
      {
        "code": "CLTN028",
        "name": "Áo blazer nam lịch lãm",
        "unit": "Chiếc",
        "unitPrice": 980000.0,
        "beginningQty": 93.0,
        "importQty": 35.0,
        "exportQty": 87.0
      },
      {
        "code": "CLTN029",
        "name": "Quần jogger nam",
        "unit": "Chiếc",
        "unitPrice": 310000.0,
        "beginningQty": 83.0,
        "importQty": 58.0,
        "exportQty": 79.0
      },
      {
        "code": "CLTN030",
        "name": "Áo khoác dù nam",
        "unit": "Chiếc",
        "unitPrice": 450000.0,
        "beginningQty": 33.0,
        "importQty": 80.0,
        "exportQty": 19.0
      },
      {
        "code": "CLTN031",
        "name": "Áo thun nam basic",
        "unit": "Chiếc",
        "unitPrice": 120000.0,
        "beginningQty": 66.0,
        "importQty": 15.0,
        "exportQty": 66.0
      },
      {
        "code": "CLTN032",
        "name": "Áo thun nam cổ tròn",
        "unit": "Chiếc",
        "unitPrice": 150000.0,
        "beginningQty": 100.0,
        "importQty": 11.0,
        "exportQty": 8.0
      },
      {
        "code": "CLTN033",
        "name": "Áo thun nam thể thao",
        "unit": "Chiếc",
        "unitPrice": 180000.0,
        "beginningQty": 144.0,
        "importQty": 70.0,
        "exportQty": 86.0
      },
      {
        "code": "CLTN034",
        "name": "Áo sơ mi nam dài tay",
        "unit": "Chiếc",
        "unitPrice": 250000.0,
        "beginningQty": 33.0,
        "importQty": 10.0,
        "exportQty": 24.0
      },
      {
        "code": "CLTN035",
        "name": "Áo sơ mi nam ngắn tay",
        "unit": "Chiếc",
        "unitPrice": 230000.0,
        "beginningQty": 86.0,
        "importQty": 10.0,
        "exportQty": 67.0
      },
      {
        "code": "CLTN036",
        "name": "Áo polo nam cotton",
        "unit": "Chiếc",
        "unitPrice": 200000.0,
        "beginningQty": 57.0,
        "importQty": 24.0,
        "exportQty": 41.0
      },
      {
        "code": "CLTN037",
        "name": "Áo polo nam cao cấp",
        "unit": "Chiếc",
        "unitPrice": 280000.0,
        "beginningQty": 134.0,
        "importQty": 25.0,
        "exportQty": 64.0
      },
      {
        "code": "CLTN038",
        "name": "Quần jeans nam slim fit",
        "unit": "Chiếc",
        "unitPrice": 350000.0,
        "beginningQty": 100.0,
        "importQty": 50.0,
        "exportQty": 82.0
      },
      {
        "code": "CLTN039",
        "name": "Quần jeans nam ống suông",
        "unit": "Chiếc",
        "unitPrice": 370000.0,
        "beginningQty": 83.0,
        "importQty": 27.0,
        "exportQty": 23.0
      },
      {
        "code": "CLTN040",
        "name": "Quần kaki nam ống đứng",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 93.0,
        "importQty": 57.0,
        "exportQty": 91.0
      },
      {
        "code": "CLTN041",
        "name": "Quần kaki nam co giãn",
        "unit": "Chiếc",
        "unitPrice": 340000.0,
        "beginningQty": 110.0,
        "importQty": 78.0,
        "exportQty": 165.0
      },
      {
        "code": "CLTN042",
        "name": "Quần short nam thể thao",
        "unit": "Chiếc",
        "unitPrice": 180000.0,
        "beginningQty": 90.0,
        "importQty": 49.0,
        "exportQty": 104.0
      },
      {
        "code": "CLTN043",
        "name": "Quần short nam jean",
        "unit": "Chiếc",
        "unitPrice": 210000.0,
        "beginningQty": 127.0,
        "importQty": 64.0,
        "exportQty": 165.0
      },
      {
        "code": "CLTN044",
        "name": "Áo khoác bomber nam",
        "unit": "Chiếc",
        "unitPrice": 450000.0,
        "beginningQty": 125.0,
        "importQty": 68.0,
        "exportQty": 125.0
      },
      {
        "code": "CLTN045",
        "name": "Áo khoác jean nam",
        "unit": "Chiếc",
        "unitPrice": 480000.0,
        "beginningQty": 91.0,
        "importQty": 10.0,
        "exportQty": 35.0
      },
      {
        "code": "CLTN046",
        "name": "Áo khoác da nam",
        "unit": "Chiếc",
        "unitPrice": 850000.0,
        "beginningQty": 40.0,
        "importQty": 58.0,
        "exportQty": 38.0
      },
      {
        "code": "CLTN047",
        "name": "Áo hoodie nam có nón",
        "unit": "Chiếc",
        "unitPrice": 420000.0,
        "beginningQty": 123.0,
        "importQty": 53.0,
        "exportQty": 65.0
      },
      {
        "code": "CLTN048",
        "name": "Áo hoodie nam trơn",
        "unit": "Chiếc",
        "unitPrice": 400000.0,
        "beginningQty": 52.0,
        "importQty": 78.0,
        "exportQty": 59.0
      },
      {
        "code": "CLTN049",
        "name": "Áo len nam cổ tròn",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 29.0,
        "importQty": 69.0,
        "exportQty": 44.0
      },
      {
        "code": "CLTN050",
        "name": "Áo vest nam công sở",
        "unit": "Chiếc",
        "unitPrice": 890000.0,
        "beginningQty": 62.0,
        "importQty": 37.0,
        "exportQty": 10.0
      },
      {
        "code": "CLTN051",
        "name": "Bộ đồ thể thao nam",
        "unit": "Bộ",
        "unitPrice": 550000.0,
        "beginningQty": 43.0,
        "importQty": 25.0,
        "exportQty": 7.0
      },
      {
        "code": "CLTN052",
        "name": "Bộ vest nam cao cấp",
        "unit": "Bộ",
        "unitPrice": 1500000.0,
        "beginningQty": 137.0,
        "importQty": 68.0,
        "exportQty": 71.0
      },
      {
        "code": "CLTN053",
        "name": "Quần tây nam công sở",
        "unit": "Chiếc",
        "unitPrice": 400000.0,
        "beginningQty": 135.0,
        "importQty": 30.0,
        "exportQty": 77.0
      },
      {
        "code": "CLTN054",
        "name": "Áo giữ nhiệt nam",
        "unit": "Chiếc",
        "unitPrice": 270000.0,
        "beginningQty": 90.0,
        "importQty": 74.0,
        "exportQty": 42.0
      },
      {
        "code": "CLTN055",
        "name": "Áo khoác gió nam",
        "unit": "Chiếc",
        "unitPrice": 380000.0,
        "beginningQty": 139.0,
        "importQty": 13.0,
        "exportQty": 33.0
      },
      {
        "code": "CLTN056",
        "name": "Áo sơ mi flannel nam",
        "unit": "Chiếc",
        "unitPrice": 260000.0,
        "beginningQty": 94.0,
        "importQty": 42.0,
        "exportQty": 68.0
      },
      {
        "code": "CLTN057",
        "name": "Áo ba lỗ nam",
        "unit": "Chiếc",
        "unitPrice": 140000.0,
        "beginningQty": 140.0,
        "importQty": 13.0,
        "exportQty": 105.0
      },
      {
        "code": "CLTN058",
        "name": "Áo blazer nam lịch lãm",
        "unit": "Chiếc",
        "unitPrice": 980000.0,
        "beginningQty": 96.0,
        "importQty": 25.0,
        "exportQty": 99.0
      },
      {
        "code": "CLTN059",
        "name": "Quần jogger nam",
        "unit": "Chiếc",
        "unitPrice": 310000.0,
        "beginningQty": 69.0,
        "importQty": 27.0,
        "exportQty": 73.0
      },
      {
        "code": "CLTN060",
        "name": "Áo khoác dù nam",
        "unit": "Chiếc",
        "unitPrice": 450000.0,
        "beginningQty": 136.0,
        "importQty": 68.0,
        "exportQty": 151.0
      },
      {
        "code": "CLTN061",
        "name": "Áo thun nam basic",
        "unit": "Chiếc",
        "unitPrice": 120000.0,
        "beginningQty": 105.0,
        "importQty": 43.0,
        "exportQty": 12.0
      },
      {
        "code": "CLTN062",
        "name": "Áo thun nam cổ tròn",
        "unit": "Chiếc",
        "unitPrice": 150000.0,
        "beginningQty": 88.0,
        "importQty": 44.0,
        "exportQty": 63.0
      },
      {
        "code": "CLTN063",
        "name": "Áo thun nam thể thao",
        "unit": "Chiếc",
        "unitPrice": 180000.0,
        "beginningQty": 42.0,
        "importQty": 43.0,
        "exportQty": 12.0
      },
      {
        "code": "CLTN064",
        "name": "Áo sơ mi nam dài tay",
        "unit": "Chiếc",
        "unitPrice": 250000.0,
        "beginningQty": 112.0,
        "importQty": 41.0,
        "exportQty": 78.0
      },
      {
        "code": "CLTN065",
        "name": "Áo sơ mi nam ngắn tay",
        "unit": "Chiếc",
        "unitPrice": 230000.0,
        "beginningQty": 24.0,
        "importQty": 46.0,
        "exportQty": 23.0
      },
      {
        "code": "CLTN066",
        "name": "Áo polo nam cotton",
        "unit": "Chiếc",
        "unitPrice": 200000.0,
        "beginningQty": 50.0,
        "importQty": 33.0,
        "exportQty": 36.0
      },
      {
        "code": "CLTN067",
        "name": "Áo polo nam cao cấp",
        "unit": "Chiếc",
        "unitPrice": 280000.0,
        "beginningQty": 23.0,
        "importQty": 48.0,
        "exportQty": 41.0
      },
      {
        "code": "CLTN068",
        "name": "Quần jeans nam slim fit",
        "unit": "Chiếc",
        "unitPrice": 350000.0,
        "beginningQty": 82.0,
        "importQty": 61.0,
        "exportQty": 13.0
      },
      {
        "code": "CLTN069",
        "name": "Quần jeans nam ống suông",
        "unit": "Chiếc",
        "unitPrice": 370000.0,
        "beginningQty": 73.0,
        "importQty": 47.0,
        "exportQty": 96.0
      },
      {
        "code": "CLTN070",
        "name": "Quần kaki nam ống đứng",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 149.0,
        "importQty": 51.0,
        "exportQty": 11.0
      },
      {
        "code": "CLTN071",
        "name": "Quần kaki nam co giãn",
        "unit": "Chiếc",
        "unitPrice": 340000.0,
        "beginningQty": 148.0,
        "importQty": 40.0,
        "exportQty": 114.0
      },
      {
        "code": "CLTN072",
        "name": "Quần short nam thể thao",
        "unit": "Chiếc",
        "unitPrice": 180000.0,
        "beginningQty": 72.0,
        "importQty": 13.0,
        "exportQty": 45.0
      },
      {
        "code": "CLTN073",
        "name": "Quần short nam jean",
        "unit": "Chiếc",
        "unitPrice": 210000.0,
        "beginningQty": 144.0,
        "importQty": 62.0,
        "exportQty": 107.0
      },
      {
        "code": "CLTN074",
        "name": "Áo khoác bomber nam",
        "unit": "Chiếc",
        "unitPrice": 450000.0,
        "beginningQty": 106.0,
        "importQty": 54.0,
        "exportQty": 29.0
      },
      {
        "code": "CLTN075",
        "name": "Áo khoác jean nam",
        "unit": "Chiếc",
        "unitPrice": 480000.0,
        "beginningQty": 150.0,
        "importQty": 78.0,
        "exportQty": 34.0
      },
      {
        "code": "CLTN076",
        "name": "Áo khoác da nam",
        "unit": "Chiếc",
        "unitPrice": 850000.0,
        "beginningQty": 92.0,
        "importQty": 51.0,
        "exportQty": 75.0
      },
      {
        "code": "CLTN077",
        "name": "Áo hoodie nam có nón",
        "unit": "Chiếc",
        "unitPrice": 420000.0,
        "beginningQty": 138.0,
        "importQty": 33.0,
        "exportQty": 12.0
      },
      {
        "code": "CLTN078",
        "name": "Áo hoodie nam trơn",
        "unit": "Chiếc",
        "unitPrice": 400000.0,
        "beginningQty": 70.0,
        "importQty": 66.0,
        "exportQty": 49.0
      },
      {
        "code": "CLTN079",
        "name": "Áo len nam cổ tròn",
        "unit": "Chiếc",
        "unitPrice": 320000.0,
        "beginningQty": 99.0,
        "importQty": 46.0,
        "exportQty": 37.0
      },
      {
        "code": "CLTN080",
        "name": "Áo vest nam công sở",
        "unit": "Chiếc",
        "unitPrice": 890000.0,
        "beginningQty": 139.0,
        "importQty": 24.0,
        "exportQty": 149.0
      }
    ]
  },
  {
    "id": "htk-vlxd",
    "name": "HTK VLXD",
    "items": [
      {
        "code": "VLXD001",
        "name": "Xi măng Hà Tiên PCB40",
        "unit": "Tấn",
        "unitPrice": 1700000.0,
        "beginningQty": 75.0,
        "importQty": 53.0,
        "exportQty": 115.0
      },
      {
        "code": "VLXD002",
        "name": "Xi măng INSEE",
        "unit": "Tấn",
        "unitPrice": 1750000.0,
        "beginningQty": 144.0,
        "importQty": 27.0,
        "exportQty": 63.0
      },
      {
        "code": "VLXD003",
        "name": "Xi măng Vicem Hoàng Thạch",
        "unit": "Tấn",
        "unitPrice": 1650000.0,
        "beginningQty": 272.0,
        "importQty": 99.0,
        "exportQty": 293.0
      },
      {
        "code": "VLXD004",
        "name": "Cát xây tô loại 1",
        "unit": "m³",
        "unitPrice": 210000.0,
        "beginningQty": 301.0,
        "importQty": 31.0,
        "exportQty": 100.0
      },
      {
        "code": "VLXD005",
        "name": "Cát bê tông rửa",
        "unit": "m³",
        "unitPrice": 275000.0,
        "beginningQty": 59.0,
        "importQty": 95.0,
        "exportQty": 117.0
      },
      {
        "code": "VLXD006",
        "name": "Đá mi bụi",
        "unit": "m³",
        "unitPrice": 260000.0,
        "beginningQty": 369.0,
        "importQty": 45.0,
        "exportQty": 397.0
      },
      {
        "code": "VLXD007",
        "name": "Đá 4x6",
        "unit": "m³",
        "unitPrice": 310000.0,
        "beginningQty": 426.0,
        "importQty": 90.0,
        "exportQty": 20.0
      },
      {
        "code": "VLXD008",
        "name": "Đá xanh đen 1x2",
        "unit": "m³",
        "unitPrice": 330000.0,
        "beginningQty": 295.0,
        "importQty": 67.0,
        "exportQty": 192.0
      },
      {
        "code": "VLXD009",
        "name": "Gạch Tuynel Bình Dương",
        "unit": "Viên",
        "unitPrice": 1300.0,
        "beginningQty": 241.0,
        "importQty": 44.0,
        "exportQty": 12.0
      },
      {
        "code": "VLXD010",
        "name": "Gạch Đồng Nai",
        "unit": "Viên",
        "unitPrice": 1200.0,
        "beginningQty": 352.0,
        "importQty": 20.0,
        "exportQty": 210.0
      },
      {
        "code": "VLXD011",
        "name": "Gạch block",
        "unit": "Viên",
        "unitPrice": 1500.0,
        "beginningQty": 413.0,
        "importQty": 26.0,
        "exportQty": 397.0
      },
      {
        "code": "VLXD012",
        "name": "Thép cuộn Pomina Ø6",
        "unit": "Kg",
        "unitPrice": 16500.0,
        "beginningQty": 341.0,
        "importQty": 32.0,
        "exportQty": 315.0
      },
      {
        "code": "VLXD013",
        "name": "Thép cây Việt Nhật Ø12",
        "unit": "Kg",
        "unitPrice": 17000.0,
        "beginningQty": 363.0,
        "importQty": 68.0,
        "exportQty": 20.0
      },
      {
        "code": "VLXD014",
        "name": "Thép Hòa Phát Ø8",
        "unit": "Kg",
        "unitPrice": 16000.0,
        "beginningQty": 208.0,
        "importQty": 73.0,
        "exportQty": 199.0
      },
      {
        "code": "VLXD015",
        "name": "Thép ống mạ kẽm 2 inch",
        "unit": "Cây",
        "unitPrice": 280000.0,
        "beginningQty": 286.0,
        "importQty": 41.0,
        "exportQty": 62.0
      },
      {
        "code": "VLXD016",
        "name": "Tôn lạnh màu Hoa Sen",
        "unit": "Tấm",
        "unitPrice": 150000.0,
        "beginningQty": 59.0,
        "importQty": 70.0,
        "exportQty": 72.0
      },
      {
        "code": "VLXD017",
        "name": "Tôn kẽm Đông Á",
        "unit": "Tấm",
        "unitPrice": 140000.0,
        "beginningQty": 488.0,
        "importQty": 52.0,
        "exportQty": 460.0
      },
      {
        "code": "VLXD018",
        "name": "Sơn Jotun Essence",
        "unit": "Lít",
        "unitPrice": 280000.0,
        "beginningQty": 335.0,
        "importQty": 49.0,
        "exportQty": 147.0
      },
      {
        "code": "VLXD019",
        "name": "Sơn Dulux Weathershield",
        "unit": "Lít",
        "unitPrice": 350000.0,
        "beginningQty": 276.0,
        "importQty": 21.0,
        "exportQty": 50.0
      },
      {
        "code": "VLXD020",
        "name": "Ngói màu SCG",
        "unit": "Viên",
        "unitPrice": 12000.0,
        "beginningQty": 485.0,
        "importQty": 50.0,
        "exportQty": 93.0
      },
      {
        "code": "VLXD021",
        "name": "Ngói Đồng Tâm",
        "unit": "Viên",
        "unitPrice": 11000.0,
        "beginningQty": 315.0,
        "importQty": 98.0,
        "exportQty": 379.0
      },
      {
        "code": "VLXD022",
        "name": "Xi măng trắng Sông Gianh",
        "unit": "Tấn",
        "unitPrice": 1900000.0,
        "beginningQty": 188.0,
        "importQty": 80.0,
        "exportQty": 83.0
      },
      {
        "code": "VLXD023",
        "name": "Cát đen san lấp",
        "unit": "m³",
        "unitPrice": 180000.0,
        "beginningQty": 376.0,
        "importQty": 38.0,
        "exportQty": 186.0
      },
      {
        "code": "VLXD024",
        "name": "Sơn Nippon Matex",
        "unit": "Lít",
        "unitPrice": 260000.0,
        "beginningQty": 51.0,
        "importQty": 83.0,
        "exportQty": 72.0
      },
      {
        "code": "VLXD025",
        "name": "Gỗ ván ép công nghiệp",
        "unit": "Tấm",
        "unitPrice": 320000.0,
        "beginningQty": 212.0,
        "importQty": 85.0,
        "exportQty": 112.0
      },
      {
        "code": "VLXD026",
        "name": "Gỗ MDF phủ melamine",
        "unit": "Tấm",
        "unitPrice": 450000.0,
        "beginningQty": 122.0,
        "importQty": 99.0,
        "exportQty": 64.0
      },
      {
        "code": "VLXD027",
        "name": "Ống nhựa Bình Minh Ø90",
        "unit": "Mét",
        "unitPrice": 55000.0,
        "beginningQty": 188.0,
        "importQty": 34.0,
        "exportQty": 30.0
      },
      {
        "code": "VLXD028",
        "name": "Ống nhựa Tiền Phong Ø110",
        "unit": "Mét",
        "unitPrice": 65000.0,
        "beginningQty": 381.0,
        "importQty": 30.0,
        "exportQty": 259.0
      },
      {
        "code": "VLXD029",
        "name": "Keo dán gạch Weber",
        "unit": "Bao",
        "unitPrice": 250000.0,
        "beginningQty": 375.0,
        "importQty": 39.0,
        "exportQty": 244.0
      },
      {
        "code": "VLXD030",
        "name": "Kính cường lực 8mm",
        "unit": "M²",
        "unitPrice": 750000.0,
        "beginningQty": 169.0,
        "importQty": 33.0,
        "exportQty": 133.0
      },
      {
        "code": "VLXD031",
        "name": "Xi măng Nghi Sơn",
        "unit": "Tấn",
        "unitPrice": 1800000.0,
        "beginningQty": 478.0,
        "importQty": 20.0,
        "exportQty": 463.0
      },
      {
        "code": "VLXD032",
        "name": "Xi măng Bút Sơn",
        "unit": "Tấn",
        "unitPrice": 1720000.0,
        "beginningQty": 264.0,
        "importQty": 96.0,
        "exportQty": 101.0
      },
      {
        "code": "VLXD033",
        "name": "Gạch không nung",
        "unit": "Viên",
        "unitPrice": 1400.0,
        "beginningQty": 180.0,
        "importQty": 74.0,
        "exportQty": 87.0
      },
      {
        "code": "VLXD034",
        "name": "Cát vàng hạt lớn",
        "unit": "m³",
        "unitPrice": 290000.0,
        "beginningQty": 408.0,
        "importQty": 78.0,
        "exportQty": 233.0
      },
      {
        "code": "VLXD035",
        "name": "Đá 0x4",
        "unit": "m³",
        "unitPrice": 280000.0,
        "beginningQty": 444.0,
        "importQty": 64.0,
        "exportQty": 12.0
      },
      {
        "code": "VLXD036",
        "name": "Gạch bê tông nhẹ",
        "unit": "Viên",
        "unitPrice": 1600.0,
        "beginningQty": 429.0,
        "importQty": 49.0,
        "exportQty": 125.0
      },
      {
        "code": "VLXD037",
        "name": "Thép hộp vuông 50x50",
        "unit": "Cây",
        "unitPrice": 290000.0,
        "beginningQty": 139.0,
        "importQty": 79.0,
        "exportQty": 189.0
      },
      {
        "code": "VLXD038",
        "name": "Thép hộp chữ nhật 60x120",
        "unit": "Cây",
        "unitPrice": 480000.0,
        "beginningQty": 357.0,
        "importQty": 48.0,
        "exportQty": 394.0
      },
      {
        "code": "VLXD039",
        "name": "Tôn lạnh mạ màu BlueScope",
        "unit": "Tấm",
        "unitPrice": 160000.0,
        "beginningQty": 82.0,
        "importQty": 84.0,
        "exportQty": 114.0
      },
      {
        "code": "VLXD040",
        "name": "Tôn sóng ngói",
        "unit": "Tấm",
        "unitPrice": 190000.0,
        "beginningQty": 123.0,
        "importQty": 67.0,
        "exportQty": 104.0
      },
      {
        "code": "VLXD041",
        "name": "Sơn Kova chống thấm",
        "unit": "Lít",
        "unitPrice": 380000.0,
        "beginningQty": 305.0,
        "importQty": 79.0,
        "exportQty": 248.0
      },
      {
        "code": "VLXD042",
        "name": "Sơn Jotun Majestic",
        "unit": "Lít",
        "unitPrice": 400000.0,
        "beginningQty": 142.0,
        "importQty": 27.0,
        "exportQty": 80.0
      },
      {
        "code": "VLXD043",
        "name": "Ngói màu Nhật Bản",
        "unit": "Viên",
        "unitPrice": 12500.0,
        "beginningQty": 211.0,
        "importQty": 56.0,
        "exportQty": 28.0
      },
      {
        "code": "VLXD044",
        "name": "Ngói đất nung",
        "unit": "Viên",
        "unitPrice": 10500.0,
        "beginningQty": 417.0,
        "importQty": 99.0,
        "exportQty": 506.0
      },
      {
        "code": "VLXD045",
        "name": "Ống thép đen Ø114",
        "unit": "Mét",
        "unitPrice": 75000.0,
        "beginningQty": 488.0,
        "importQty": 61.0,
        "exportQty": 209.0
      },
      {
        "code": "VLXD046",
        "name": "Ống thép mạ kẽm Ø168",
        "unit": "Mét",
        "unitPrice": 120000.0,
        "beginningQty": 241.0,
        "importQty": 73.0,
        "exportQty": 242.0
      },
      {
        "code": "VLXD047",
        "name": "Cửa nhôm Xingfa",
        "unit": "Bộ",
        "unitPrice": 3200000.0,
        "beginningQty": 313.0,
        "importQty": 45.0,
        "exportQty": 243.0
      },
      {
        "code": "VLXD048",
        "name": "Cửa kính cường lực 10mm",
        "unit": "M²",
        "unitPrice": 850000.0,
        "beginningQty": 67.0,
        "importQty": 63.0,
        "exportQty": 36.0
      },
      {
        "code": "VLXD049",
        "name": "Ván gỗ công nghiệp MFC",
        "unit": "Tấm",
        "unitPrice": 420000.0,
        "beginningQty": 81.0,
        "importQty": 77.0,
        "exportQty": 124.0
      },
      {
        "code": "VLXD050",
        "name": "Tấm ốp tường PVC",
        "unit": "Tấm",
        "unitPrice": 600000.0,
        "beginningQty": 495.0,
        "importQty": 63.0,
        "exportQty": 485.0
      },
      {
        "code": "VLXD051",
        "name": "Tấm cách nhiệt XPS",
        "unit": "Tấm",
        "unitPrice": 720000.0,
        "beginningQty": 351.0,
        "importQty": 62.0,
        "exportQty": 55.0
      },
      {
        "code": "VLXD052",
        "name": "Lưới thép hàn D4",
        "unit": "M²",
        "unitPrice": 45000.0,
        "beginningQty": 140.0,
        "importQty": 63.0,
        "exportQty": 154.0
      },
      {
        "code": "VLXD053",
        "name": "Lưới thép hàn D6",
        "unit": "M²",
        "unitPrice": 85000.0,
        "beginningQty": 417.0,
        "importQty": 21.0,
        "exportQty": 58.0
      },
      {
        "code": "VLXD054",
        "name": "Keo chống thấm Sika",
        "unit": "Lít",
        "unitPrice": 290000.0,
        "beginningQty": 194.0,
        "importQty": 70.0,
        "exportQty": 159.0
      },
      {
        "code": "VLXD055",
        "name": "Gỗ lim Nam Phi",
        "unit": "M³",
        "unitPrice": 18000000.0,
        "beginningQty": 98.0,
        "importQty": 21.0,
        "exportQty": 69.0
      },
      {
        "code": "VLXD056",
        "name": "Gỗ căm xe",
        "unit": "M³",
        "unitPrice": 20000000.0,
        "beginningQty": 413.0,
        "importQty": 95.0,
        "exportQty": 215.0
      },
      {
        "code": "VLXD057",
        "name": "Gạch men 60x60",
        "unit": "M²",
        "unitPrice": 185000.0,
        "beginningQty": 243.0,
        "importQty": 83.0,
        "exportQty": 292.0
      },
      {
        "code": "VLXD058",
        "name": "Gạch giả đá 30x60",
        "unit": "M²",
        "unitPrice": 200000.0,
        "beginningQty": 450.0,
        "importQty": 26.0,
        "exportQty": 307.0
      },
      {
        "code": "VLXD059",
        "name": "Gạch mosaic thủy tinh",
        "unit": "M²",
        "unitPrice": 650000.0,
        "beginningQty": 77.0,
        "importQty": 48.0,
        "exportQty": 63.0
      },
      {
        "code": "VLXD060",
        "name": "Đá granite tự nhiên",
        "unit": "M²",
        "unitPrice": 1250000.0,
        "beginningQty": 244.0,
        "importQty": 79.0,
        "exportQty": 142.0
      },
      {
        "code": "VLXD061",
        "name": "Đá marble nhập khẩu",
        "unit": "M²",
        "unitPrice": 2300000.0,
        "beginningQty": 229.0,
        "importQty": 53.0,
        "exportQty": 176.0
      },
      {
        "code": "VLXD062",
        "name": "Vật liệu cách âm Rockwool",
        "unit": "M³",
        "unitPrice": 1450000.0,
        "beginningQty": 205.0,
        "importQty": 46.0,
        "exportQty": 58.0
      },
      {
        "code": "VLXD063",
        "name": "Xốp cách nhiệt EPS",
        "unit": "M³",
        "unitPrice": 1100000.0,
        "beginningQty": 200.0,
        "importQty": 82.0,
        "exportQty": 148.0
      },
      {
        "code": "VLXD064",
        "name": "Bulong neo M16",
        "unit": "Kg",
        "unitPrice": 65000.0,
        "beginningQty": 162.0,
        "importQty": 98.0,
        "exportQty": 32.0
      },
      {
        "code": "VLXD065",
        "name": "Bulong nở sắt M12",
        "unit": "Cái",
        "unitPrice": 18000.0,
        "beginningQty": 458.0,
        "importQty": 28.0,
        "exportQty": 302.0
      },
      {
        "code": "VLXD066",
        "name": "Bulong hóa chất Hilti",
        "unit": "Cái",
        "unitPrice": 95000.0,
        "beginningQty": 302.0,
        "importQty": 30.0,
        "exportQty": 31.0
      },
      {
        "code": "VLXD067",
        "name": "Phụ kiện nhôm kính",
        "unit": "Bộ",
        "unitPrice": 550000.0,
        "beginningQty": 131.0,
        "importQty": 50.0,
        "exportQty": 25.0
      },
      {
        "code": "VLXD068",
        "name": "Sàn gỗ công nghiệp 12mm",
        "unit": "M²",
        "unitPrice": 320000.0,
        "beginningQty": 355.0,
        "importQty": 48.0,
        "exportQty": 333.0
      },
      {
        "code": "VLXD069",
        "name": "Sàn nhựa giả gỗ SPC",
        "unit": "M²",
        "unitPrice": 280000.0,
        "beginningQty": 454.0,
        "importQty": 75.0,
        "exportQty": 390.0
      },
      {
        "code": "VLXD070",
        "name": "Bê tông thương phẩm M250",
        "unit": "M³",
        "unitPrice": 1450000.0,
        "beginningQty": 291.0,
        "importQty": 49.0,
        "exportQty": 66.0
      },
      {
        "code": "VLXD071",
        "name": "Bê tông thương phẩm M300",
        "unit": "M³",
        "unitPrice": 1550000.0,
        "beginningQty": 500.0,
        "importQty": 67.0,
        "exportQty": 546.0
      },
      {
        "code": "VLXD072",
        "name": "Bê tông nhẹ EPS",
        "unit": "M³",
        "unitPrice": 1800000.0,
        "beginningQty": 343.0,
        "importQty": 53.0,
        "exportQty": 90.0
      },
      {
        "code": "VLXD073",
        "name": "Tấm xi măng Cemboard 12mm",
        "unit": "Tấm",
        "unitPrice": 520000.0,
        "beginningQty": 67.0,
        "importQty": 64.0,
        "exportQty": 59.0
      },
      {
        "code": "VLXD074",
        "name": "Tấm trần thạch cao Gyproc",
        "unit": "Tấm",
        "unitPrice": 230000.0,
        "beginningQty": 419.0,
        "importQty": 45.0,
        "exportQty": 34.0
      },
      {
        "code": "VLXD075",
        "name": "Bông khoáng Rockwool",
        "unit": "M³",
        "unitPrice": 1650000.0,
        "beginningQty": 158.0,
        "importQty": 62.0,
        "exportQty": 100.0
      },
      {
        "code": "VLXD076",
        "name": "Bông thủy tinh cách nhiệt",
        "unit": "M³",
        "unitPrice": 1450000.0,
        "beginningQty": 355.0,
        "importQty": 45.0,
        "exportQty": 94.0
      },
      {
        "code": "VLXD077",
        "name": "Sơn epoxy chống trượt",
        "unit": "Lít",
        "unitPrice": 450000.0,
        "beginningQty": 250.0,
        "importQty": 72.0,
        "exportQty": 137.0
      },
      {
        "code": "VLXD078",
        "name": "Sơn chống cháy Jotun",
        "unit": "Lít",
        "unitPrice": 750000.0,
        "beginningQty": 369.0,
        "importQty": 68.0,
        "exportQty": 32.0
      },
      {
        "code": "VLXD079",
        "name": "Cọc bê tông ly tâm D300",
        "unit": "Mét",
        "unitPrice": 450000.0,
        "beginningQty": 476.0,
        "importQty": 52.0,
        "exportQty": 484.0
      },
      {
        "code": "VLXD080",
        "name": "Cọc bê tông ly tâm D400",
        "unit": "Mét",
        "unitPrice": 650000.0,
        "beginningQty": 277.0,
        "importQty": 100.0,
        "exportQty": 138.0
      }
    ]
  },
  {
    "id": "htk-thung-carton",
    "name": "HTK Thùng Carton",
    "items": [
      {
        "code": "CT001",
        "name": "Carton sóng B 25x20x15cm",
        "unit": "Cái",
        "unitPrice": 48629.0,
        "beginningQty": 619.0,
        "importQty": 309.0,
        "exportQty": 53.0
      },
      {
        "code": "CT002",
        "name": "Carton 5 lớp 50x40x30cm",
        "unit": "Cái",
        "unitPrice": 39606.0,
        "beginningQty": 706.0,
        "importQty": 38.0,
        "exportQty": 512.0
      },
      {
        "code": "CT003",
        "name": "Carton chịu lực 45x35x25cm",
        "unit": "Cái",
        "unitPrice": 6560.0,
        "beginningQty": 113.0,
        "importQty": 265.0,
        "exportQty": 365.0
      },
      {
        "code": "CT004",
        "name": "Thùng carton in logo 50x40x35cm",
        "unit": "Cái",
        "unitPrice": 8867.0,
        "beginningQty": 560.0,
        "importQty": 330.0,
        "exportQty": 546.0
      },
      {
        "code": "CT005",
        "name": "Thùng carton ghép nối 60x50x45cm",
        "unit": "Cái",
        "unitPrice": 33005.0,
        "beginningQty": 91.0,
        "importQty": 127.0,
        "exportQty": 148.0
      },
      {
        "code": "CT006",
        "name": "Carton sóng A 60x50x40cm",
        "unit": "Cái",
        "unitPrice": 48673.0,
        "beginningQty": 582.0,
        "importQty": 403.0,
        "exportQty": 985.0
      },
      {
        "code": "CT007",
        "name": "Carton 3 lớp 30x20x15cm",
        "unit": "Cái",
        "unitPrice": 25970.0,
        "beginningQty": 871.0,
        "importQty": 158.0,
        "exportQty": 715.0
      },
      {
        "code": "CT008",
        "name": "Thùng carton có quai 35x30x25cm",
        "unit": "Cái",
        "unitPrice": 5672.0,
        "beginningQty": 467.0,
        "importQty": 379.0,
        "exportQty": 568.0
      },
      {
        "code": "CT009",
        "name": "Hộp carton nắp gài 30x25x20cm",
        "unit": "Cái",
        "unitPrice": 34745.0,
        "beginningQty": 816.0,
        "importQty": 114.0,
        "exportQty": 584.0
      },
      {
        "code": "CT010",
        "name": "Carton 3 lớp 20x15x10cm",
        "unit": "Cái",
        "unitPrice": 27487.0,
        "beginningQty": 917.0,
        "importQty": 31.0,
        "exportQty": 272.0
      },
      {
        "code": "CT011",
        "name": "Carton chống thấm 55x45x35cm",
        "unit": "Cái",
        "unitPrice": 21303.0,
        "beginningQty": 675.0,
        "importQty": 459.0,
        "exportQty": 953.0
      },
      {
        "code": "CT012",
        "name": "Carton 3 lớp 40x30x20cm",
        "unit": "Cái",
        "unitPrice": 10663.0,
        "beginningQty": 210.0,
        "importQty": 48.0,
        "exportQty": 196.0
      },
      {
        "code": "CT013",
        "name": "Carton sóng B 25x20x15cm",
        "unit": "Cái",
        "unitPrice": 38718.0,
        "beginningQty": 704.0,
        "importQty": 304.0,
        "exportQty": 382.0
      },
      {
        "code": "CT014",
        "name": "Carton 5 lớp 50x40x30cm",
        "unit": "Cái",
        "unitPrice": 10013.0,
        "beginningQty": 442.0,
        "importQty": 259.0,
        "exportQty": 336.0
      },
      {
        "code": "CT015",
        "name": "Carton chịu lực 45x35x25cm",
        "unit": "Cái",
        "unitPrice": 16246.0,
        "beginningQty": 896.0,
        "importQty": 213.0,
        "exportQty": 163.0
      },
      {
        "code": "CT016",
        "name": "Thùng carton in logo 50x40x35cm",
        "unit": "Cái",
        "unitPrice": 19477.0,
        "beginningQty": 642.0,
        "importQty": 440.0,
        "exportQty": 22.0
      },
      {
        "code": "CT017",
        "name": "Thùng carton ghép nối 60x50x45cm",
        "unit": "Cái",
        "unitPrice": 36553.0,
        "beginningQty": 292.0,
        "importQty": 366.0,
        "exportQty": 254.0
      },
      {
        "code": "CT018",
        "name": "Carton sóng A 60x50x40cm",
        "unit": "Cái",
        "unitPrice": 12703.0,
        "beginningQty": 477.0,
        "importQty": 269.0,
        "exportQty": 131.0
      },
      {
        "code": "CT019",
        "name": "Carton 3 lớp 30x20x15cm",
        "unit": "Cái",
        "unitPrice": 35853.0,
        "beginningQty": 207.0,
        "importQty": 299.0,
        "exportQty": 54.0
      },
      {
        "code": "CT020",
        "name": "Thùng carton có quai 35x30x25cm",
        "unit": "Cái",
        "unitPrice": 6555.0,
        "beginningQty": 90.0,
        "importQty": 369.0,
        "exportQty": 154.0
      },
      {
        "code": "CT021",
        "name": "Hộp carton nắp gài 30x25x20cm",
        "unit": "Cái",
        "unitPrice": 14878.0,
        "beginningQty": 483.0,
        "importQty": 458.0,
        "exportQty": 37.0
      },
      {
        "code": "CT022",
        "name": "Carton 3 lớp 20x15x10cm",
        "unit": "Cái",
        "unitPrice": 37844.0,
        "beginningQty": 506.0,
        "importQty": 282.0,
        "exportQty": 777.0
      },
      {
        "code": "CT023",
        "name": "Carton chống thấm 55x45x35cm",
        "unit": "Cái",
        "unitPrice": 35920.0,
        "beginningQty": 876.0,
        "importQty": 203.0,
        "exportQty": 332.0
      },
      {
        "code": "CT024",
        "name": "Carton 3 lớp 40x30x20cm",
        "unit": "Cái",
        "unitPrice": 32506.0,
        "beginningQty": 198.0,
        "importQty": 265.0,
        "exportQty": 165.0
      },
      {
        "code": "CT025",
        "name": "Carton sóng B 25x20x15cm",
        "unit": "Cái",
        "unitPrice": 35054.0,
        "beginningQty": 845.0,
        "importQty": 448.0,
        "exportQty": 1001.0
      },
      {
        "code": "CT026",
        "name": "Carton 5 lớp 50x40x30cm",
        "unit": "Cái",
        "unitPrice": 19474.0,
        "beginningQty": 569.0,
        "importQty": 424.0,
        "exportQty": 450.0
      },
      {
        "code": "CT027",
        "name": "Carton chịu lực 45x35x25cm",
        "unit": "Cái",
        "unitPrice": 15325.0,
        "beginningQty": 232.0,
        "importQty": 108.0,
        "exportQty": 140.0
      },
      {
        "code": "CT028",
        "name": "Thùng carton in logo 50x40x35cm",
        "unit": "Cái",
        "unitPrice": 23326.0,
        "beginningQty": 656.0,
        "importQty": 154.0,
        "exportQty": 190.0
      },
      {
        "code": "CT029",
        "name": "Thùng carton ghép nối 60x50x45cm",
        "unit": "Cái",
        "unitPrice": 29364.0,
        "beginningQty": 867.0,
        "importQty": 250.0,
        "exportQty": 111.0
      },
      {
        "code": "CT030",
        "name": "Carton sóng A 60x50x40cm",
        "unit": "Cái",
        "unitPrice": 30611.0,
        "beginningQty": 624.0,
        "importQty": 264.0,
        "exportQty": 34.0
      },
      {
        "code": "CT031",
        "name": "Carton 3 lớp 30x20x15cm",
        "unit": "Cái",
        "unitPrice": 20603.0,
        "beginningQty": 804.0,
        "importQty": 129.0,
        "exportQty": 109.0
      },
      {
        "code": "CT032",
        "name": "Thùng carton có quai 35x30x25cm",
        "unit": "Cái",
        "unitPrice": 48442.0,
        "beginningQty": 518.0,
        "importQty": 58.0,
        "exportQty": 574.0
      },
      {
        "code": "CT033",
        "name": "Hộp carton nắp gài 30x25x20cm",
        "unit": "Cái",
        "unitPrice": 16834.0,
        "beginningQty": 863.0,
        "importQty": 285.0,
        "exportQty": 679.0
      },
      {
        "code": "CT034",
        "name": "Carton 3 lớp 20x15x10cm",
        "unit": "Cái",
        "unitPrice": 12994.0,
        "beginningQty": 659.0,
        "importQty": 220.0,
        "exportQty": 265.0
      },
      {
        "code": "CT035",
        "name": "Carton chống thấm 55x45x35cm",
        "unit": "Cái",
        "unitPrice": 27502.0,
        "beginningQty": 869.0,
        "importQty": 272.0,
        "exportQty": 1059.0
      },
      {
        "code": "CT036",
        "name": "Carton 3 lớp 40x30x20cm",
        "unit": "Cái",
        "unitPrice": 47360.0,
        "beginningQty": 797.0,
        "importQty": 290.0,
        "exportQty": 30.0
      },
      {
        "code": "CT037",
        "name": "Carton sóng B 25x20x15cm",
        "unit": "Cái",
        "unitPrice": 23668.0,
        "beginningQty": 608.0,
        "importQty": 241.0,
        "exportQty": 597.0
      },
      {
        "code": "CT038",
        "name": "Carton 5 lớp 50x40x30cm",
        "unit": "Cái",
        "unitPrice": 15424.0,
        "beginningQty": 840.0,
        "importQty": 214.0,
        "exportQty": 544.0
      },
      {
        "code": "CT039",
        "name": "Carton chịu lực 45x35x25cm",
        "unit": "Cái",
        "unitPrice": 40831.0,
        "beginningQty": 107.0,
        "importQty": 74.0,
        "exportQty": 7.0
      },
      {
        "code": "CT040",
        "name": "Thùng carton in logo 50x40x35cm",
        "unit": "Cái",
        "unitPrice": 49295.0,
        "beginningQty": 867.0,
        "importQty": 452.0,
        "exportQty": 1026.0
      },
      {
        "code": "CT041",
        "name": "Thùng carton ghép nối 60x50x45cm",
        "unit": "Cái",
        "unitPrice": 15219.0,
        "beginningQty": 599.0,
        "importQty": 82.0,
        "exportQty": 183.0
      },
      {
        "code": "CT042",
        "name": "Carton sóng A 60x50x40cm",
        "unit": "Cái",
        "unitPrice": 9010.0,
        "beginningQty": 127.0,
        "importQty": 123.0,
        "exportQty": 25.0
      },
      {
        "code": "CT043",
        "name": "Carton 3 lớp 30x20x15cm",
        "unit": "Cái",
        "unitPrice": 13506.0,
        "beginningQty": 85.0,
        "importQty": 225.0,
        "exportQty": 233.0
      },
      {
        "code": "CT044",
        "name": "Thùng carton có quai 35x30x25cm",
        "unit": "Cái",
        "unitPrice": 14260.0,
        "beginningQty": 372.0,
        "importQty": 112.0,
        "exportQty": 273.0
      },
      {
        "code": "CT045",
        "name": "Hộp carton nắp gài 30x25x20cm",
        "unit": "Cái",
        "unitPrice": 33850.0,
        "beginningQty": 173.0,
        "importQty": 199.0,
        "exportQty": 284.0
      },
      {
        "code": "CT046",
        "name": "Carton 3 lớp 20x15x10cm",
        "unit": "Cái",
        "unitPrice": 30061.0,
        "beginningQty": 732.0,
        "importQty": 70.0,
        "exportQty": 11.0
      },
      {
        "code": "CT047",
        "name": "Carton chống thấm 55x45x35cm",
        "unit": "Cái",
        "unitPrice": 25564.0,
        "beginningQty": 840.0,
        "importQty": 489.0,
        "exportQty": 723.0
      },
      {
        "code": "CT048",
        "name": "Carton 3 lớp 40x30x20cm",
        "unit": "Cái",
        "unitPrice": 40055.0,
        "beginningQty": 367.0,
        "importQty": 153.0,
        "exportQty": 155.0
      },
      {
        "code": "CT049",
        "name": "Carton sóng B 25x20x15cm",
        "unit": "Cái",
        "unitPrice": 11033.0,
        "beginningQty": 871.0,
        "importQty": 62.0,
        "exportQty": 104.0
      },
      {
        "code": "CT050",
        "name": "Carton 5 lớp 50x40x30cm",
        "unit": "Cái",
        "unitPrice": 9125.0,
        "beginningQty": 804.0,
        "importQty": 53.0,
        "exportQty": 0.0
      },
      {
        "code": "CT051",
        "name": "Carton chịu lực 45x35x25cm",
        "unit": "Cái",
        "unitPrice": 18545.0,
        "beginningQty": 54.0,
        "importQty": 352.0,
        "exportQty": 190.0
      },
      {
        "code": "CT052",
        "name": "Thùng carton in logo 50x40x35cm",
        "unit": "Cái",
        "unitPrice": 30746.0,
        "beginningQty": 834.0,
        "importQty": 156.0,
        "exportQty": 645.0
      },
      {
        "code": "CT053",
        "name": "Thùng carton ghép nối 60x50x45cm",
        "unit": "Cái",
        "unitPrice": 21436.0,
        "beginningQty": 273.0,
        "importQty": 125.0,
        "exportQty": 240.0
      },
      {
        "code": "CT054",
        "name": "Carton sóng A 60x50x40cm",
        "unit": "Cái",
        "unitPrice": 32912.0,
        "beginningQty": 975.0,
        "importQty": 206.0,
        "exportQty": 1042.0
      },
      {
        "code": "CT055",
        "name": "Carton 3 lớp 30x20x15cm",
        "unit": "Cái",
        "unitPrice": 14124.0,
        "beginningQty": 555.0,
        "importQty": 383.0,
        "exportQty": 11.0
      },
      {
        "code": "CT056",
        "name": "Thùng carton có quai 35x30x25cm",
        "unit": "Cái",
        "unitPrice": 19841.0,
        "beginningQty": 549.0,
        "importQty": 324.0,
        "exportQty": 386.0
      },
      {
        "code": "CT057",
        "name": "Hộp carton nắp gài 30x25x20cm",
        "unit": "Cái",
        "unitPrice": 12548.0,
        "beginningQty": 523.0,
        "importQty": 340.0,
        "exportQty": 66.0
      },
      {
        "code": "CT058",
        "name": "Carton 3 lớp 20x15x10cm",
        "unit": "Cái",
        "unitPrice": 40237.0,
        "beginningQty": 575.0,
        "importQty": 103.0,
        "exportQty": 631.0
      },
      {
        "code": "CT059",
        "name": "Carton chống thấm 55x45x35cm",
        "unit": "Cái",
        "unitPrice": 21193.0,
        "beginningQty": 841.0,
        "importQty": 268.0,
        "exportQty": 268.0
      },
      {
        "code": "CT060",
        "name": "Carton 3 lớp 40x30x20cm",
        "unit": "Cái",
        "unitPrice": 28394.0,
        "beginningQty": 605.0,
        "importQty": 451.0,
        "exportQty": 360.0
      }
    ]
  },
  {
    "id": "htk-laptop",
    "name": "HTK Laptop",
    "items": [
      {
        "code": "LT001",
        "name": "Acer Nitro 5",
        "unit": "Bộ",
        "unitPrice": 18745355.0,
        "beginningQty": 37.0,
        "importQty": 32.0,
        "exportQty": 38.0
      },
      {
        "code": "LT002",
        "name": "Dell XPS 13",
        "unit": "Bộ",
        "unitPrice": 53868557.0,
        "beginningQty": 32.0,
        "importQty": 19.0,
        "exportQty": 40.0
      },
      {
        "code": "LT003",
        "name": "Lenovo IdeaPad 5",
        "unit": "Bộ",
        "unitPrice": 36475908.0,
        "beginningQty": 50.0,
        "importQty": 1.0,
        "exportQty": 43.0
      },
      {
        "code": "LT004",
        "name": "Toshiba Dynabook Tecra A50",
        "unit": "Bộ",
        "unitPrice": 46219016.0,
        "beginningQty": 56.0,
        "importQty": 14.0,
        "exportQty": 16.0
      },
      {
        "code": "LT005",
        "name": "MacBook Air M1",
        "unit": "Bộ",
        "unitPrice": 22639786.0,
        "beginningQty": 67.0,
        "importQty": 0.0,
        "exportQty": 39.0
      },
      {
        "code": "LT006",
        "name": "Microsoft Surface Pro 9",
        "unit": "Bộ",
        "unitPrice": 36379117.0,
        "beginningQty": 39.0,
        "importQty": 6.0,
        "exportQty": 13.0
      },
      {
        "code": "LT007",
        "name": "Acer Chromebook Spin 713",
        "unit": "Bộ",
        "unitPrice": 16872773.0,
        "beginningQty": 95.0,
        "importQty": 14.0,
        "exportQty": 43.0
      },
      {
        "code": "LT008",
        "name": "Gigabyte Aero 16",
        "unit": "Bộ",
        "unitPrice": 34988008.0,
        "beginningQty": 35.0,
        "importQty": 45.0,
        "exportQty": 1.0
      },
      {
        "code": "LT009",
        "name": "Razer Blade 15",
        "unit": "Bộ",
        "unitPrice": 45307144.0,
        "beginningQty": 33.0,
        "importQty": 43.0,
        "exportQty": 53.0
      },
      {
        "code": "LT010",
        "name": "Dell XPS 15",
        "unit": "Bộ",
        "unitPrice": 19529944.0,
        "beginningQty": 43.0,
        "importQty": 47.0,
        "exportQty": 27.0
      },
      {
        "code": "LT011",
        "name": "MSI Stealth 15M",
        "unit": "Bộ",
        "unitPrice": 26422339.0,
        "beginningQty": 43.0,
        "importQty": 33.0,
        "exportQty": 55.0
      },
      {
        "code": "LT012",
        "name": "Microsoft Surface Laptop 5",
        "unit": "Bộ",
        "unitPrice": 45916160.0,
        "beginningQty": 44.0,
        "importQty": 2.0,
        "exportQty": 30.0
      },
      {
        "code": "LT013",
        "name": "MSI GE76 Raider",
        "unit": "Bộ",
        "unitPrice": 34102621.0,
        "beginningQty": 27.0,
        "importQty": 21.0,
        "exportQty": 39.0
      },
      {
        "code": "LT014",
        "name": "Huawei MateBook X Pro",
        "unit": "Bộ",
        "unitPrice": 47568610.0,
        "beginningQty": 81.0,
        "importQty": 41.0,
        "exportQty": 121.0
      },
      {
        "code": "LT015",
        "name": "MSI Katana GF66",
        "unit": "Bộ",
        "unitPrice": 16017699.0,
        "beginningQty": 39.0,
        "importQty": 26.0,
        "exportQty": 19.0
      },
      {
        "code": "LT016",
        "name": "Lenovo Legion 5",
        "unit": "Bộ",
        "unitPrice": 41305314.0,
        "beginningQty": 18.0,
        "importQty": 2.0,
        "exportQty": 5.0
      },
      {
        "code": "LT017",
        "name": "Acer Predator Helios 300",
        "unit": "Bộ",
        "unitPrice": 19043184.0,
        "beginningQty": 40.0,
        "importQty": 38.0,
        "exportQty": 58.0
      },
      {
        "code": "LT018",
        "name": "Gigabyte Aorus 17",
        "unit": "Bộ",
        "unitPrice": 19186830.0,
        "beginningQty": 23.0,
        "importQty": 31.0,
        "exportQty": 46.0
      },
      {
        "code": "LT019",
        "name": "Samsung Galaxy Book3 Pro",
        "unit": "Bộ",
        "unitPrice": 21898550.0,
        "beginningQty": 6.0,
        "importQty": 21.0,
        "exportQty": 13.0
      },
      {
        "code": "LT020",
        "name": "HP Spectre x360",
        "unit": "Bộ",
        "unitPrice": 52757745.0,
        "beginningQty": 23.0,
        "importQty": 40.0,
        "exportQty": 0.0
      },
      {
        "code": "LT021",
        "name": "LG Gram 14",
        "unit": "Bộ",
        "unitPrice": 33805559.0,
        "beginningQty": 97.0,
        "importQty": 28.0,
        "exportQty": 79.0
      },
      {
        "code": "LT022",
        "name": "Alienware x15 R2",
        "unit": "Bộ",
        "unitPrice": 46356866.0,
        "beginningQty": 98.0,
        "importQty": 28.0,
        "exportQty": 37.0
      },
      {
        "code": "LT023",
        "name": "MSI Summit E13 Flip",
        "unit": "Bộ",
        "unitPrice": 45356583.0,
        "beginningQty": 76.0,
        "importQty": 44.0,
        "exportQty": 8.0
      },
      {
        "code": "LT024",
        "name": "Asus TUF Gaming F15",
        "unit": "Bộ",
        "unitPrice": 21755746.0,
        "beginningQty": 33.0,
        "importQty": 0.0,
        "exportQty": 18.0
      },
      {
        "code": "LT025",
        "name": "Huawei MateBook D16",
        "unit": "Bộ",
        "unitPrice": 42524255.0,
        "beginningQty": 16.0,
        "importQty": 35.0,
        "exportQty": 11.0
      },
      {
        "code": "LT026",
        "name": "Acer TravelMate P2",
        "unit": "Bộ",
        "unitPrice": 35559495.0,
        "beginningQty": 29.0,
        "importQty": 0.0,
        "exportQty": 6.0
      },
      {
        "code": "LT027",
        "name": "Dell Latitude 7420",
        "unit": "Bộ",
        "unitPrice": 43765896.0,
        "beginningQty": 54.0,
        "importQty": 35.0,
        "exportQty": 2.0
      },
      {
        "code": "LT028",
        "name": "Razer Blade Stealth 13",
        "unit": "Bộ",
        "unitPrice": 54162437.0,
        "beginningQty": 67.0,
        "importQty": 1.0,
        "exportQty": 63.0
      },
      {
        "code": "LT029",
        "name": "Samsung Notebook 9 Pro",
        "unit": "Bộ",
        "unitPrice": 37460000.0,
        "beginningQty": 76.0,
        "importQty": 6.0,
        "exportQty": 11.0
      },
      {
        "code": "LT030",
        "name": "Acer Swift 5",
        "unit": "Bộ",
        "unitPrice": 20529262.0,
        "beginningQty": 85.0,
        "importQty": 42.0,
        "exportQty": 84.0
      },
      {
        "code": "LT031",
        "name": "LG Gram 16",
        "unit": "Bộ",
        "unitPrice": 35803436.0,
        "beginningQty": 57.0,
        "importQty": 29.0,
        "exportQty": 20.0
      },
      {
        "code": "LT032",
        "name": "MacBook Pro M2",
        "unit": "Bộ",
        "unitPrice": 25588199.0,
        "beginningQty": 6.0,
        "importQty": 9.0,
        "exportQty": 1.0
      },
      {
        "code": "LT033",
        "name": "Acer Aspire 7",
        "unit": "Bộ",
        "unitPrice": 27917078.0,
        "beginningQty": 37.0,
        "importQty": 31.0,
        "exportQty": 37.0
      },
      {
        "code": "LT034",
        "name": "Asus ExpertBook B9",
        "unit": "Bộ",
        "unitPrice": 19354221.0,
        "beginningQty": 10.0,
        "importQty": 20.0,
        "exportQty": 24.0
      },
      {
        "code": "LT035",
        "name": "Samsung Galaxy Book2 360",
        "unit": "Bộ",
        "unitPrice": 51293362.0,
        "beginningQty": 97.0,
        "importQty": 7.0,
        "exportQty": 43.0
      },
      {
        "code": "LT036",
        "name": "Lenovo ThinkPad X1 Carbon",
        "unit": "Bộ",
        "unitPrice": 30066746.0,
        "beginningQty": 43.0,
        "importQty": 0.0,
        "exportQty": 30.0
      },
      {
        "code": "LT037",
        "name": "Samsung Galaxy Book Go",
        "unit": "Bộ",
        "unitPrice": 23503448.0,
        "beginningQty": 5.0,
        "importQty": 13.0,
        "exportQty": 7.0
      },
      {
        "code": "LT038",
        "name": "HP Elite Dragonfly",
        "unit": "Bộ",
        "unitPrice": 29497110.0,
        "beginningQty": 58.0,
        "importQty": 11.0,
        "exportQty": 53.0
      },
      {
        "code": "LT039",
        "name": "Asus Vivobook 15",
        "unit": "Bộ",
        "unitPrice": 37443595.0,
        "beginningQty": 6.0,
        "importQty": 37.0,
        "exportQty": 21.0
      },
      {
        "code": "LT040",
        "name": "HP ZBook Fury 16",
        "unit": "Bộ",
        "unitPrice": 27258142.0,
        "beginningQty": 49.0,
        "importQty": 3.0,
        "exportQty": 41.0
      },
      {
        "code": "LT041",
        "name": "MacBook Pro M1",
        "unit": "Bộ",
        "unitPrice": 52241331.0,
        "beginningQty": 68.0,
        "importQty": 43.0,
        "exportQty": 45.0
      },
      {
        "code": "LT042",
        "name": "Panasonic Toughbook 55",
        "unit": "Bộ",
        "unitPrice": 57369659.0,
        "beginningQty": 17.0,
        "importQty": 32.0,
        "exportQty": 37.0
      },
      {
        "code": "LT043",
        "name": "Dell Inspiron 14",
        "unit": "Bộ",
        "unitPrice": 35152199.0,
        "beginningQty": 15.0,
        "importQty": 50.0,
        "exportQty": 27.0
      },
      {
        "code": "LT044",
        "name": "Vaio SX14",
        "unit": "Bộ",
        "unitPrice": 39944477.0,
        "beginningQty": 46.0,
        "importQty": 5.0,
        "exportQty": 13.0
      },
      {
        "code": "LT045",
        "name": "Razer Blade 14",
        "unit": "Bộ",
        "unitPrice": 17654209.0,
        "beginningQty": 59.0,
        "importQty": 13.0,
        "exportQty": 25.0
      },
      {
        "code": "LT046",
        "name": "HP Envy 13",
        "unit": "Bộ",
        "unitPrice": 21300962.0,
        "beginningQty": 14.0,
        "importQty": 44.0,
        "exportQty": 26.0
      },
      {
        "code": "LT047",
        "name": "HP Omen 16",
        "unit": "Bộ",
        "unitPrice": 53775861.0,
        "beginningQty": 72.0,
        "importQty": 48.0,
        "exportQty": 94.0
      },
      {
        "code": "LT048",
        "name": "Alienware m17 R5",
        "unit": "Bộ",
        "unitPrice": 37753729.0,
        "beginningQty": 10.0,
        "importQty": 40.0,
        "exportQty": 45.0
      },
      {
        "code": "LT049",
        "name": "Lenovo IdeaPad Gaming 3",
        "unit": "Bộ",
        "unitPrice": 15987942.0,
        "beginningQty": 97.0,
        "importQty": 7.0,
        "exportQty": 13.0
      },
      {
        "code": "LT050",
        "name": "MSI Creator Z16",
        "unit": "Bộ",
        "unitPrice": 52407773.0,
        "beginningQty": 72.0,
        "importQty": 26.0,
        "exportQty": 15.0
      },
      {
        "code": "LT051",
        "name": "Asus Zenbook 14 OLED",
        "unit": "Bộ",
        "unitPrice": 32668519.0,
        "beginningQty": 41.0,
        "importQty": 30.0,
        "exportQty": 33.0
      },
      {
        "code": "LT052",
        "name": "MSI Modern 14",
        "unit": "Bộ",
        "unitPrice": 35535218.0,
        "beginningQty": 8.0,
        "importQty": 26.0,
        "exportQty": 2.0
      },
      {
        "code": "LT053",
        "name": "MacBook Air M2",
        "unit": "Bộ",
        "unitPrice": 20181489.0,
        "beginningQty": 23.0,
        "importQty": 37.0,
        "exportQty": 54.0
      },
      {
        "code": "LT054",
        "name": "HP Pavilion 15",
        "unit": "Bộ",
        "unitPrice": 49430766.0,
        "beginningQty": 72.0,
        "importQty": 36.0,
        "exportQty": 1.0
      },
      {
        "code": "LT055",
        "name": "Asus ROG Zephyrus G14",
        "unit": "Bộ",
        "unitPrice": 15716691.0,
        "beginningQty": 63.0,
        "importQty": 47.0,
        "exportQty": 82.0
      },
      {
        "code": "LT056",
        "name": "Fujitsu Lifebook U9311",
        "unit": "Bộ",
        "unitPrice": 26895093.0,
        "beginningQty": 9.0,
        "importQty": 33.0,
        "exportQty": 26.0
      },
      {
        "code": "LT057",
        "name": "Asus ProArt Studiobook 16",
        "unit": "Bộ",
        "unitPrice": 25737052.0,
        "beginningQty": 65.0,
        "importQty": 19.0,
        "exportQty": 58.0
      },
      {
        "code": "LT058",
        "name": "Lenovo Yoga 9i",
        "unit": "Bộ",
        "unitPrice": 44382091.0,
        "beginningQty": 15.0,
        "importQty": 48.0,
        "exportQty": 11.0
      },
      {
        "code": "LT059",
        "name": "Razer Book 13",
        "unit": "Bộ",
        "unitPrice": 35080168.0,
        "beginningQty": 55.0,
        "importQty": 26.0,
        "exportQty": 9.0
      },
      {
        "code": "LT060",
        "name": "Lenovo ThinkPad T14",
        "unit": "Bộ",
        "unitPrice": 40277787.0,
        "beginningQty": 21.0,
        "importQty": 5.0,
        "exportQty": 7.0
      }
    ]
  }
];
