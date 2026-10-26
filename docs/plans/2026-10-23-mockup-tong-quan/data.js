// Dữ liệu mẫu cho mockup. Mọi tổng đều tính từ các dòng bên dưới, không gõ tay.
window.MOCK = (() => {
  const today = '2026-10-23';

  const HMTD = 'Hạn mức tín dụng';
  const CVTL = 'Cho vay từng lần';
  const CC = 'Cầm cố sổ tiết kiệm';
  const HMTL = 'Hạn mức tín dụng từng lần';


  const contracts = [
    { id: 1, kh: 'Cty TNHH Gỗ Minh Khang', so: 'KU-2025/0418', method: HMTD, outstanding: 1850000000, storedGroup: 1 },
    { id: 2, kh: 'Cty TNHH Gỗ Minh Khang', so: 'KU-2025/0107', method: HMTD, outstanding: 620000000, storedGroup: 1 },
    { id: 3, kh: 'Cty CP Xây lắp Tân Phú', so: 'KU-2025/0233', method: HMTD, outstanding: 4500000000, storedGroup: 1 },
    { id: 4, kh: 'Cty CP Xây lắp Tân Phú', so: 'KU-2025/0390', method: HMTL, outstanding: 2300000000, storedGroup: 1 },
    { id: 5, kh: 'Cty TNHH Nông sản Đồng Xanh', so: 'KU-2025/0155', method: HMTD, outstanding: 3600000000, storedGroup: 1 },
    { id: 6, kh: 'Cty TNHH TM Hải Nam', so: 'KU-2026/0021', method: HMTD, outstanding: 2750000000, storedGroup: 1 },
    { id: 7, kh: 'Cty TNHH TM Hải Nam', so: 'KU-2026/0094', method: HMTL, outstanding: 1200000000, storedGroup: 1 },
    { id: 8, kh: 'Nguyễn Thị Thu Hà', so: 'HĐ-2023/1187', method: CVTL, outstanding: 1540000000, storedGroup: 1 },
    { id: 9, kh: 'Trần Văn Lộc', so: 'HĐ-2024/0562', method: CVTL, outstanding: 380000000, storedGroup: 1 },
    { id: 10, kh: 'Hộ KD Phạm Thị Mai', so: 'HĐ-2025/0219', method: CVTL, outstanding: 260000000, storedGroup: 1 },
    { id: 11, kh: 'Lê Quang Vinh', so: 'HĐ-2024/0831', method: CVTL, outstanding: 900000000, storedGroup: 1 },
    { id: 12, kh: 'Đỗ Minh Tuấn', so: 'HĐ-2025/0640', method: CVTL, outstanding: 450000000, storedGroup: 1 },
    { id: 13, kh: 'Vũ Thị Hồng Nhung', so: 'HĐ-2026/0118', method: CVTL, outstanding: 2100000000, storedGroup: 1 },
    { id: 14, kh: 'Bùi Đức Thắng', so: 'HĐ-2025/0977', method: CVTL, outstanding: 720000000, storedGroup: 1 },
    { id: 15, kh: 'Hoàng Văn Sơn', so: 'CC-2026/0045', method: CC, outstanding: 300000000, storedGroup: 1 },
    { id: 16, kh: 'Ngô Thị Lan', so: 'CC-2026/0071', method: CC, outstanding: 150000000, storedGroup: 1 },
    { id: 17, kh: 'Đặng Quốc Huy', so: 'CC-2026/0102', method: CC, outstanding: 480000000, storedGroup: 1 },
    { id: 18, kh: 'Cty TNHH Cơ khí Thành Đạt', so: 'KU-2025/0301', method: HMTD, outstanding: 1380000000, storedGroup: 1 },
    { id: 19, kh: 'Cty TNHH Cơ khí Thành Đạt', so: 'KU-2026/0058', method: HMTL, outstanding: 950000000, storedGroup: 1 },
    { id: 20, kh: 'Phan Thị Kim Oanh', so: 'HĐ-2025/0412', method: CVTL, outstanding: 1150000000, storedGroup: 1 },
    { id: 21, kh: 'Trịnh Văn Hùng', so: 'HĐ-2026/0201', method: CVTL, outstanding: 640000000, storedGroup: 1 },
    { id: 22, kh: 'Cty TNHH Gỗ Minh Khang', so: 'KU-2025/0512', method: HMTL, outstanding: 1400000000, storedGroup: 1 },
  ];

  // Kỳ trả nợ chưa trả: đã quá hạn, hoặc đến hạn trong 30 ngày tới.
  const periods = [
    { contract: 1, ky: 10, due: '2026-10-11', goc: 250000000, lai: 18420000 },
    { contract: 9, ky: 9, due: '2026-10-17', goc: 15000000, lai: 4125000 },
    { contract: 8, ky: 34, due: '2026-10-25', goc: 20000000, lai: 6380000 },
    { contract: 3, ky: 6, due: '2026-10-28', goc: 500000000, lai: 41250000 },
    { contract: 10, ky: 11, due: '2026-10-30', goc: 8000000, lai: 2140000 },
    { contract: 11, ky: 22, due: '2026-11-05', goc: 12500000, lai: 3900000 },
    { contract: 5, ky: 8, due: '2026-11-10', goc: 300000000, lai: 27600000 },
    { contract: 12, ky: 13, due: '2026-11-15', goc: 10000000, lai: 2875000 },
    { contract: 6, ky: 3, due: '2026-11-20', goc: 0, lai: 15300000 },
  ];

  // Khế ước nhận nợ đáo hạn trong 30 ngày.
  const kunn = [
    { contract: 7, due: '2026-10-31', outstanding: 1200000000 },
    { contract: 19, due: '2026-11-08', outstanding: 950000000 },
    { contract: 4, due: '2026-11-19', outstanding: 2300000000 },
  ];

  // Hợp đồng tín dụng (hạn mức) hết hiệu lực trong 30 ngày.
  const hmtd = [
    { kh: 'Cty TNHH Gỗ Minh Khang', so: 'HĐTD-2025/0031', expiry: '2026-11-02', limit: 3000000000 },
    { kh: 'Cty TNHH Cơ khí Thành Đạt', so: 'HĐTD-2025/0058', expiry: '2026-11-18', limit: 3000000000 },
  ];

  // Tài sản bảo đảm quá kỳ định giá lại.
  const tsbd = [
    { kh: 'Cty TNHH Nông sản Đồng Xanh', ten: 'QSDĐ thửa 112, tờ 7, Đồng Xoài', lastValued: '2025-10-14', value: 6400000000 },
  ];

  const otherCollaterals = [
    9800000000, 6400000000, 5600000000, 3100000000, 2900000000, 1850000000,
    1200000000, 950000000, 1600000000, 820000000, 2600000000, 340000000, 180000000, 560000000,
    1950000000, 1400000000, 900000000,
  ];

  const cardLimits = [100000000, 50000000, 200000000, 80000000, 150000000, 60000000, 100000000,
    120000000, 50000000, 70000000, 100000000, 90000000, 40000000, 50000000];

  // Khách hàng của tài khoản. hdtd/tsbd: đã có HĐTD / TSBĐ; related: có KHLQ hoặc hôn phối.
  const C = (cif, kh, type, phone, idNo, idDate, opts = {}) => ({ cif, kh, type, phone, idNo, idDate, archived: false, related: false, hdtd: true, tsbd: true, ...opts });
  const customers = [
    C('0012874', 'Cty TNHH Gỗ Minh Khang', 'Doanh nghiệp', '0274 3612 448', '3702145871', '2014-06-12'),
    C('0013305', 'Cty CP Xây lắp Tân Phú', 'Doanh nghiệp', '0274 3829 106', '3700981264', '2009-03-02'),
    C('0014120', 'Cty TNHH Nông sản Đồng Xanh', 'Doanh nghiệp', '0271 3887 590', '3801126743', '2016-09-21'),
    C('0015467', 'Cty TNHH TM Hải Nam', 'Doanh nghiệp', '0274 3756 221', '3702580934', '2018-01-15'),
    C('0016012', 'Cty TNHH Cơ khí Thành Đạt', 'Doanh nghiệp', '0274 3901 377', '3702917458', '2019-07-08'),
    C('0011958', 'Nguyễn Thị Thu Hà', 'Cá nhân', '0908 214 573', '074186002931', '2021-04-19', { related: true }),
    C('0012230', 'Trần Văn Lộc', 'Cá nhân', '0913 562 018', '074082001574', '2021-08-03'),
    C('0016588', 'Hộ KD Phạm Thị Mai', 'Hộ kinh doanh', '0937 405 862', '074179004418', '2022-02-11', { related: true }),
    C('0013871', 'Lê Quang Vinh', 'Cá nhân', '0909 871 334', '074090003265', '2021-11-25', { related: true }),
    C('0015902', 'Đỗ Minh Tuấn', 'Cá nhân', '0976 230 519', '074095006102', '2022-06-30'),
    C('0017214', 'Vũ Thị Hồng Nhung', 'Cá nhân', '0918 337 260', '074188007735', '2023-01-09', { related: true }),
    C('0016143', 'Bùi Đức Thắng', 'Cá nhân', '0903 118 945', '074087005521', '2021-12-14'),
    C('0017530', 'Hoàng Văn Sơn', 'Cá nhân', '0938 612 077', '074078002840', '2021-05-27', { hdtd: false }),
    C('0017611', 'Ngô Thị Lan', 'Cá nhân', '0965 774 203', '074184009917', '2022-09-05', { hdtd: false }),
    C('0017688', 'Đặng Quốc Huy', 'Cá nhân', '0912 905 648', '074091008362', '2023-03-22', { hdtd: false }),
    C('0016290', 'Phan Thị Kim Oanh', 'Cá nhân', '0907 451 386', '074183006214', '2022-04-18', { related: true }),
    C('0017402', 'Trịnh Văn Hùng', 'Cá nhân', '0989 166 532', '074089004475', '2023-02-07'),
    C('0017815', 'Cty TNHH Bao bì Phú Thịnh', 'Doanh nghiệp', '0274 3668 912', '3703114829', '2020-10-02', { tsbd: false }),
    C('0017842', 'Lâm Thị Ngọc Bích', 'Cá nhân', '0934 208 671', '074190001358', '2024-01-16', { hdtd: false, tsbd: false }),
    C('0017866', 'Huỳnh Tấn Phát', 'Cá nhân', '0919 640 285', '074085007193', '2022-12-01', { hdtd: false, tsbd: false, related: true }),
    C('0017903', 'Cty CP Dược phẩm An Khang', 'Doanh nghiệp', '0274 3555 640', '3703209456', '2021-06-11', { tsbd: false }),
    C('0010455', 'Mai Văn Thành', 'Cá nhân', '0903 552 914', '074076000822', '2021-03-30', { archived: true }),
    C('0010721', 'Cty TNHH Vận tải Thuận An', 'Doanh nghiệp', '0274 3720 118', '3700645127', '2008-11-19', { archived: true }),
    C('0011049', 'Tạ Thị Hoa', 'Cá nhân', '0977 316 405', '074180003609', '2021-07-22', { archived: true, related: true }),
  ];

  // Hồ sơ chi tiết của khách hàng đang mở ở các trang HĐTD, Khoản vay, TSBĐ.
  const focus = {
    cif: '0012874',
    hdtd: [
      { so: 'HĐTD-2025/0031', method: HMTD, limit: 3000000000, signed: '2025-11-02', expiry: '2026-11-02', purpose: 'Bổ sung vốn lưu động sản xuất đồ gỗ nội thất', kunn: [1, 2] },
      { so: 'HĐTD-2025/0112', method: HMTL, limit: 1600000000, signed: '2025-05-16', expiry: '2030-05-16', purpose: 'Đầu tư máy CNC 5 trục cho xưởng Tân Uyên', kunn: [22] },
    ],
    // Giải ngân của từng KUNN, theo id khế ước.
    kunn: {
      1: { amount: 2350000000, rate: 8.2, disbursed: '2025-12-11', end: '2027-05-11', hdtd: 'HĐTD-2025/0031' },
      2: { amount: 620000000, rate: 8.2, disbursed: '2026-08-14', end: '2027-02-14', hdtd: 'HĐTD-2025/0031' },
      22: { amount: 1600000000, rate: 9.1, disbursed: '2025-05-23', end: '2030-05-16', hdtd: 'HĐTD-2025/0112' },
    },
    // Lịch trả nợ KU-2025/0418: ân hạn gốc 7 kỳ, từ kỳ 8 trả 250 triệu gốc mỗi tháng.
    scheduleOf: 1,
    schedule: [
      { ky: 8, due: '2026-08-11', goc: 250000000, lai: 21840000, paid: '2026-08-11' },
      { ky: 9, due: '2026-09-11', goc: 250000000, lai: 19920000, paid: '2026-09-12' },
      { ky: 10, due: '2026-10-11', goc: 250000000, lai: 18420000, paid: null },
      { ky: 11, due: '2026-11-11', goc: 250000000, lai: 16130000, paid: null },
      { ky: 12, due: '2026-12-11', goc: 250000000, lai: 14240000, paid: null },
    ],
    // ltv: tỷ lệ cho vay tối đa (%); value null khi chưa định giá.
    assets: [
      { ma: 'TS-0874-01', ten: 'QSDĐ và nhà xưởng, thửa 245 tờ 12', dc: 'KCN Tân Uyên, Bình Dương', loai: 'Bất động sản', value: 4200000000, ltv: 70, valued: '2026-03-14', next: '2027-03-14', hdtc: 'HĐTC-2025/0031-01' },
      { ma: 'TS-0874-02', ten: 'Máy CNC 5 trục Biesse Rover', dc: 'Xưởng Tân Uyên', loai: 'Máy móc thiết bị', value: 1850000000, ltv: 60, valued: '2025-05-20', next: '2026-05-20', hdtc: 'HĐTC-2025/0112-01' },
      { ma: 'TS-0874-03', ten: 'Xe tải Hino FL 15 tấn, 61C-428.17', dc: 'Bãi xe công ty', loai: 'Phương tiện vận tải', value: 980000000, ltv: 60, valued: '2025-11-05', next: '2026-11-05', hdtc: 'HĐTC-2025/0031-02' },
      { ma: 'TS-0874-04', ten: 'Hàng tồn kho gỗ thành phẩm', dc: 'Kho số 2, Tân Uyên', loai: 'Hàng tồn kho', value: null, ltv: 50, valued: null, next: null, hdtc: null },
    ],
  };
  const collaterals = [...otherCollaterals, ...focus.assets.filter((a) => a.value).map((a) => a.value)];

  return { today, customers, focus, contracts, periods, kunn, hmtd, tsbd, collaterals, cardLimits, methods: [HMTD, CVTL, CC, HMTL] };
})();
