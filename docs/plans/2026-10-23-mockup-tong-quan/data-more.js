// Dữ liệu mẫu bổ sung cho các trang Tín dụng, Tổng quan, Phân tích. Tổng và tỷ lệ tính ở trang, không gõ tay.
window.MORE = {
  // Hợp đồng thế chấp của Cty TNHH Gỗ Minh Khang; assets: mã TSBĐ trong data.js.
  mortgages: [
    { so: 'HĐTC-2025/0031-01', signed: '2025-11-02', owner: null, maxSecured: 2940000000, assets: ['TS-0874-01'], hdtd: ['HĐTD-2025/0031'], notary: 'CC 4512/2025, VPCC Tân Uyên', notaryDate: '2025-11-03', gdbd: '2025-11-05', released: null },
    { so: 'HĐTC-2025/0031-02', signed: '2025-11-02', owner: 'Nguyễn Văn Khang', maxSecured: 588000000, assets: ['TS-0874-03'], hdtd: ['HĐTD-2025/0031'], notary: 'CC 4513/2025, VPCC Tân Uyên', notaryDate: '2025-11-03', gdbd: '2025-11-06', released: null },
    { so: 'HĐTC-2025/0112-01', signed: '2025-05-16', owner: null, maxSecured: 1110000000, assets: ['TS-0874-02'], hdtd: ['HĐTD-2025/0112'], notary: 'CC 1877/2025, VPCC Dĩ An', notaryDate: '2025-05-19', gdbd: '2025-05-21', released: null },
    { so: 'HĐTC-2023/0410-01', signed: '2023-04-10', owner: null, maxSecured: 720000000, assets: [], assetNote: 'Xe tải Isuzu 8 tấn 61C-115.02', hdtd: ['HĐTD-2023/0410'], notary: 'CC 0962/2023, VPCC Tân Uyên', notaryDate: '2023-04-11', gdbd: '2023-04-13', released: '2025-10-28' },
  ],

  // Người thụ hưởng giải ngân.
  payees: [
    { name: 'Trần Thị Mỹ Linh', idNo: '074186011245', idDate: '2021-06-14', idPlace: 'Cục CS QLHC về TTXH', accounts: [['1903 6524 8810 18', 'Techcombank', 'CN Bình Dương'], ['0601 2584 7731', 'Sacombank', 'PGD Thuận An']], used: 3 },
    { name: 'Lê Hoàng Phúc', idNo: '079083004512', idDate: '2022-01-20', idPlace: 'Cục CS QLHC về TTXH', accounts: [['0071 0004 52119', 'Vietcombank', 'CN Sóng Thần']], used: 2 },
    { name: 'Phạm Quốc Bảo', idNo: '074090007821', idDate: '2021-09-03', idPlace: 'Cục CS QLHC về TTXH', accounts: [['2141 0000 735 286', 'BIDV', 'CN Bình Dương']], used: 1 },
    { name: 'Nguyễn Thị Kim Ngân', idNo: '074185002317', idDate: '2023-03-11', idPlace: 'Cục CS QLHC về TTXH', accounts: [['1027 4458 920', 'VietinBank', 'CN KCN Bình Dương'], ['0981 2207 345', 'MB', 'CN Bình Dương']], used: 2 },
    { name: 'Võ Minh Trí', idNo: '074092003156', idDate: '2021-12-28', idPlace: 'Cục CS QLHC về TTXH', accounts: [['0371 0002 98144', 'Vietbank', 'CN Bình Dương']], used: 1 },
    { name: 'Đinh Thị Thu Trang', idNo: '079187009034', idDate: '2022-07-05', idPlace: 'Cục CS QLHC về TTXH', accounts: [['8800 1234 6672', 'ACB', 'CN Dĩ An']], used: 0 },
  ],

  // Giải ngân 30 ngày gần nhất, theo người thụ hưởng ở trên.
  disbursements: [
    { kunn: 'KU-2026/0058', kh: 'Cty TNHH Cơ khí Thành Đạt', payee: 'Trần Thị Mỹ Linh', content: 'Thanh toán thép tấm theo HĐ 118/TĐ', account: '1903 6524 8810 18 · Techcombank', date: '2026-10-12', amount: 950000000 },
    { kunn: 'HĐ-2026/0201', kh: 'Trịnh Văn Hùng', payee: 'Lê Hoàng Phúc', content: 'Nhận chuyển nhượng nhà đất theo HĐCN 2210', account: '0071 0004 52119 · Vietcombank', date: '2026-10-06', amount: 640000000 },
    { kunn: 'KU-2025/0390', kh: 'Cty CP Xây lắp Tân Phú', payee: 'Nguyễn Thị Kim Ngân', content: 'Thanh toán vật tư xây dựng đợt 3', account: '1027 4458 920 · VietinBank', date: '2026-09-30', amount: 2300000000 },
  ],

  // Hợp đồng thẻ của khách hàng Nguyễn Thị Thu Hà (CIF 0011958).
  cardCif: '0011958',
  cards: [
    { so: 'HĐT-2026/0218', product: 'Vietbank Visa Platinum', holder: 'Nguyễn Thị Thu Hà', related: false, policy: 'A2_KHCN_TSBD_BDS', asset: 'Căn hộ B2-1205, The Habitat', limit: 200000000, issued: '2026-02-24', months: 60, closed: false, secondary: 'Phạm Minh Đức (chồng)' },
    { so: 'HĐT-2026/0219', product: 'Vietbank Visa Classic', holder: 'Phạm Minh Đức', related: true, policy: 'B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK', asset: null, limit: 50000000, issued: '2026-02-24', months: 60, closed: false, secondary: null },
    { so: 'HĐT-2022/0907', product: 'Vietbank Napas ghi nợ', holder: 'Nguyễn Thị Thu Hà', related: false, policy: null, asset: null, limit: 0, issued: '2022-09-15', months: 60, closed: true, secondary: null },
  ],

  // Đợt kiểm soát sau vay; kind: mdsdv | ksv | ts.
  checks: [
    { cif: '0012874', kind: 'mdsdv', scope: 'KU-2026/0107 · giải ngân 14/08/2026', period: 'Đợt 1', due: '2026-10-14', done: null },
    { cif: '0013305', kind: 'ksv', scope: 'HĐTD-2025/0233', period: 'Quý III/2026', due: '2026-10-15', done: null },
    { cif: '0012874', kind: 'ts', scope: 'TS-0874-02 Máy CNC 5 trục', period: '12 tháng', due: '2026-10-20', done: null },
    { cif: '0015467', kind: 'ksv', scope: 'HĐTD-2026/0021', period: 'Quý III/2026', due: '2026-10-31', done: null },
    { cif: '0016012', kind: 'mdsdv', scope: 'KU-2026/0058 · giải ngân 12/10/2026', period: 'Đợt 1', due: '2026-11-11', done: null },
    { cif: '0014120', kind: 'ts', scope: 'QSDĐ thửa 112, tờ 7', period: '12 tháng', due: '2026-11-14', done: null },
    { cif: '0017214', kind: 'ksv', scope: 'HĐ-2026/0118', period: '6 tháng', due: '2027-01-09', done: null },
    { cif: '0011958', kind: 'ts', scope: 'Căn hộ B2-1205, The Habitat', period: '12 tháng', due: '2027-02-24', done: null },
    { cif: '0013305', kind: 'mdsdv', scope: 'KU-2025/0390 · giải ngân 30/09/2026', period: 'Đợt 1', due: '2026-10-30', done: '2026-10-08', result: 'Đạt' },
    { cif: '0015902', kind: 'ksv', scope: 'HĐ-2025/0640', period: '6 tháng', due: '2026-10-05', done: '2026-10-02', result: 'Đạt' },
    { cif: '0016588', kind: 'ts', scope: 'Nhà phố 42 Nguyễn Văn Tiết', period: '12 tháng', due: '2026-09-28', done: '2026-09-25', result: 'Cần theo dõi' },
  ],

  // KPI team theo tháng (triệu đồng, trừ thẻ). plan/actual: 10 tháng 2026.
  team: { name: 'Team KHDN Bình Dương 2', month: '2026-10' },
  kpis: [
    { name: 'Dư nợ cho vay cuối kỳ', unit: 'triệu', plan: [24000, 24600, 25200, 25800, 26400, 27000, 27600, 28200, 28800, 29400], actual: [23850, 24700, 25150, 25300, 26100, 27350, 27200, 28050, 29620, 29620] },
    { name: 'Huy động vốn cuối kỳ', unit: 'triệu', plan: [18000, 18400, 18800, 19200, 19600, 20000, 20400, 20800, 21200, 21600], actual: [17600, 18100, 18900, 19050, 19400, 19800, 20650, 20100, 20900, 21950] },
    { name: 'Thẻ tín dụng phát hành mới', unit: 'thẻ', plan: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], actual: [3, 5, 4, 2, 4, 6, 3, 4, 5, 2] },
    { name: 'Thu phí dịch vụ', unit: 'triệu', plan: [60, 60, 65, 65, 70, 70, 75, 75, 80, 80], actual: [52, 64, 61, 70, 66, 74, 79, 71, 88, 47] },
    { name: 'Doanh thu bảo hiểm', unit: 'triệu', plan: [40, 40, 40, 45, 45, 45, 50, 50, 50, 55], actual: [35, 48, 22, 51, 40, 47, 56, 38, 62, 31] },
  ],
  members: [
    { name: 'Lê Thanh Tâm', role: 'RM', debt: 9840, deposit: 6200, cards: 1, fees: 18 },
    { name: 'Ngô Bảo Châu', role: 'RM', debt: 7310, deposit: 5480, cards: 0, fees: 9 },
    { name: 'Phan Thị Hạnh', role: 'RM', debt: 6150, deposit: 4970, cards: 1, fees: 11 },
    { name: 'Trương Minh Khoa', role: 'RBO', debt: 4020, deposit: 3610, cards: 0, fees: 6 },
    { name: 'Đỗ Ngọc Ánh', role: 'RBO', debt: 2300, deposit: 1690, cards: 0, fees: 3 },
  ],

  // Hồ sơ tiến độ tháng 10/2026 (số tiền: VNĐ).
  progress: [
    { who: 'Lê Thanh Tâm', kh: 'Cty TNHH Gỗ Minh Khang', kind: 'Hiện hữu', type: 'Tái cấp', term: 'Ngắn hạn', amount: 3000000000, cards: 0, fees: 0, ins: 0, stage: 'Đang lập tờ trình' },
    { who: 'Lê Thanh Tâm', kh: 'Cty TNHH Bao bì Phú Thịnh', kind: 'Hiện hữu', type: 'Mới', term: 'Ngắn hạn', amount: 2500000000, cards: 0, fees: 12500000, ins: 0, stage: 'Chờ phê duyệt' },
    { who: 'Ngô Bảo Châu', kh: 'Cty CP Dược phẩm An Khang', kind: 'Hiện hữu', type: 'Mới', term: 'Dài hạn', amount: 4200000000, cards: 0, fees: 0, ins: 18600000, stage: 'Đã gửi định giá' },
    { who: 'Ngô Bảo Châu', kh: 'Lâm Thị Ngọc Bích', kind: 'Hiện hữu', type: 'Mới', term: 'Dài hạn', amount: 1800000000, cards: 1, fees: 18000000, ins: 9200000, stage: 'Đang công chứng' },
    { who: 'Phan Thị Hạnh', kh: 'Huỳnh Tấn Phát', kind: 'Hiện hữu', type: 'Mới', term: 'Dài hạn', amount: 950000000, cards: 1, fees: 9500000, ins: 4800000, stage: 'Đã giải ngân' },
    { who: 'Phan Thị Hạnh', kh: 'Cty TNHH Cơ khí Thành Đạt', kind: 'Hiện hữu', type: 'Tái cấp tăng thêm', term: 'Ngắn hạn', amount: 1000000000, cards: 0, fees: 5000000, ins: 0, stage: 'Đã có phê duyệt' },
    { who: 'Trương Minh Khoa', kh: 'Trần Quốc Việt', kind: 'Mới', type: 'Mới', term: 'Dài hạn', amount: 1200000000, cards: 0, fees: 0, ins: 0, stage: 'Thu thập hồ sơ' },
    { who: 'Trương Minh Khoa', kh: 'Hộ KD Phạm Thị Mai', kind: 'Hiện hữu', type: 'Ngắn hạn chuyển Trung dài hạn', term: 'Dài hạn', amount: 600000000, cards: 0, fees: 3000000, ins: 2100000, stage: 'Đã trình ký' },
    { who: 'Đỗ Ngọc Ánh', kh: 'Nguyễn Hữu Nghĩa', kind: 'Mới', type: 'Mới', term: 'Ngắn hạn', amount: 500000000, cards: 1, fees: 2500000, ins: 0, stage: 'Mới nhận hồ sơ' },
  ],
  stages: ['Mới nhận hồ sơ', 'Thu thập hồ sơ', 'Đã gửi định giá', 'Đang lập tờ trình', 'Đã trình ký', 'Đã trình HO', 'Chờ phê duyệt', 'Đã có phê duyệt', 'Đang công chứng', 'Chờ giải ngân', 'Đã giải ngân'],

  // Phương án kinh doanh của Gỗ Minh Khang (triệu đồng). Kỳ thực hiện 2025, kỳ kế hoạch 2026–2027.
  plan: {
    years: ['2025', '2026–2027'],
    revenue: [68400, 79000],
    cashCost: [62930, 72680],
    netProfit: [3420, 4110],
    turnover: [3.0, 3.2],
    equity: [8200, 9100],
    otherBanks: [6000, 6500],
    payables: [3800, 4100],
  },

  // BCTC Gỗ Minh Khang năm 2025 theo TT 133 (triệu đồng): [số cuối năm, số đầu năm].
  bctc: {
    year: 2025,
    assets: [
      ['110', 'Tiền và các khoản tương đương tiền', 2150, 1800],
      ['130', 'Các khoản phải thu', 9800, 8900],
      ['140', 'Hàng tồn kho', 12600, 11200],
      ['150', 'Tài sản cố định', 14200, 13100],
      ['180', 'Tài sản khác', 750, 700],
    ],
    current: ['110', '130', '140'],
    liabilities: [
      ['311', 'Phải trả người bán', 4100, 3800],
      ['313', 'Thuế và các khoản phải nộp Nhà nước', 600, 500],
      ['320', 'Vay và nợ thuê tài chính', 14900, 13600],
      ['319', 'Phải trả khác', 400, 400],
    ],
    equity: [
      ['411', 'Vốn góp của chủ sở hữu', 15000, 15000],
      ['417', 'Lợi nhuận sau thuế chưa phân phối', 4500, 2400],
    ],
    income: { revenue: [68400, 61200], cogs: [56090, 50450], net: [3420, 2860] },
  },
};
