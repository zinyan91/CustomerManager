import type {
  B01aStatement,
  B01bStatement,
  B02Statement,
  CorporateFinancialProfile,
  FinancialLineItem,
} from '../types/corporateFinancial';

/** Khóa localStorage lưu bản nháp BCTC; dùng chung giữa màn BCTC và trợ lý AI. */
export const CORPORATE_FINANCIAL_STORAGE_KEY = 'customer_manager_corporate_financial_v1';

export const DEFAULT_B01A_TEMPLATE: Omit<FinancialLineItem, 'currentPeriod' | 'previousPeriod'>[] = [
  // PHẦN I - TÀI SẢN
  { id: 'b01a_100', code: '100', name: 'A. TÀI SẢN NGẮN HẠN', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b01a_110', code: '110', note: 'V.01', name: 'I. Tiền và các khoản tương đương tiền', isHeader: false, indent: 1 },
  { id: 'b01a_120', code: '120', note: 'V.02', name: 'II. Đầu tư tài chính ngắn hạn', isHeader: false, indent: 1 },
  { id: 'b01a_130', code: '130', name: 'III. Các khoản phải thu ngắn hạn', isHeader: false, isFormula: true, indent: 1 },
  { id: 'b01a_131', code: '131', note: 'V.03', name: '1. Phải thu của khách hàng', indent: 2 },
  { id: 'b01a_132', code: '132', note: 'V.04', name: '2. Trả trước cho người bán', indent: 2 },
  { id: 'b01a_133', code: '133', note: 'V.05', name: '3. Phải thu khác', indent: 2 },
  { id: 'b01a_134', code: '134', note: 'V.06', name: '4. Dự phòng phải thu khó đòi (*)', isNegative: true, indent: 2 },
  { id: 'b01a_140', code: '140', name: 'IV. Hàng tồn kho', isHeader: false, isFormula: true, indent: 1 },
  { id: 'b01a_141', code: '141', note: 'V.07', name: '1. Hàng tồn kho', indent: 2 },
  { id: 'b01a_142', code: '142', note: 'V.08', name: '2. Dự phòng giảm giá hàng tồn kho (*)', isNegative: true, indent: 2 },
  { id: 'b01a_150', code: '150', note: 'V.09', name: 'V. Tài sản ngắn hạn khác', isHeader: false, indent: 1 },

  { id: 'b01a_200', code: '200', name: 'B. TÀI SẢN DÀI HẠN', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b01a_210', code: '210', note: 'V.10', name: 'I. Các khoản phải thu dài hạn', isHeader: false, indent: 1 },
  { id: 'b01a_220', code: '220', name: 'II. Tài sản cố định', isHeader: false, isFormula: true, indent: 1 },
  { id: 'b01a_221', code: '221', note: 'V.11', name: '1. Nguyên giá', indent: 2 },
  { id: 'b01a_222', code: '222', note: 'V.12', name: '2. Giá trị hao mòn luỹ kế (*)', isNegative: true, indent: 2 },
  { id: 'b01a_230', code: '230', note: 'V.13', name: 'III. Bất động sản đầu tư', isHeader: false, indent: 1 },
  { id: 'b01a_240', code: '240', note: 'V.14', name: 'IV. Xây dựng cơ bản dở dang', isHeader: false, indent: 1 },
  { id: 'b01a_250', code: '250', note: 'V.15', name: 'V. Đầu tư tài chính dài hạn', isHeader: false, indent: 1 },
  { id: 'b01a_260', code: '260', note: 'V.16', name: 'VI. Tài sản dài hạn khác', isHeader: false, indent: 1 },

  { id: 'b01a_270', code: '270', name: 'TỔNG CỘNG TÀI SẢN (270 = 100 + 200)', isHeader: true, isFormula: true, indent: 0 },

  // PHẦN II - NGUỒN VỐN
  { id: 'b01a_300', code: '300', name: 'C. NỢ PHẢI TRẢ', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b01a_310', code: '310', name: 'I. Nợ ngắn hạn', isHeader: false, isFormula: true, indent: 1 },
  { id: 'b01a_311', code: '311', note: 'V.17', name: '1. Phải trả người bán ngắn hạn', indent: 2 },
  { id: 'b01a_312', code: '312', note: 'V.18', name: '2. Người mua trả tiền trước ngắn hạn', indent: 2 },
  { id: 'b01a_313', code: '313', note: 'V.19', name: '3. Thuế và các khoản phải nộp Nhà nước', indent: 2 },
  { id: 'b01a_314', code: '314', note: 'V.20', name: '4. Phải trả người lao động', indent: 2 },
  { id: 'b01a_315', code: '315', note: 'V.21', name: '5. Vay và nợ thuê tài chính ngắn hạn', indent: 2 },
  { id: 'b01a_316', code: '316', note: 'V.22', name: '6. Phải trả ngắn hạn khác', indent: 2 },
  { id: 'b01a_330', code: '330', name: 'II. Nợ dài hạn', isHeader: false, isFormula: true, indent: 1 },
  { id: 'b01a_331', code: '331', note: 'V.23', name: '1. Vay và nợ thuê tài chính dài hạn', indent: 2 },
  { id: 'b01a_332', code: '332', note: 'V.24', name: '2. Phải trả dài hạn khác', indent: 2 },

  { id: 'b01a_400', code: '400', name: 'D. VỐN CHỦ SỞ HỮU', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b01a_411', code: '411', note: 'V.25', name: '1. Vốn góp của chủ sở hữu', indent: 1 },
  { id: 'b01a_412', code: '412', note: 'V.26', name: '2. Thặng dư vốn cổ phần', indent: 1 },
  { id: 'b01a_413', code: '413', note: 'V.27', name: '3. Vốn khác của chủ sở hữu', indent: 1 },
  { id: 'b01a_414', code: '414', note: 'V.28', name: '4. Cổ phiếu quỹ (*)', isNegative: true, indent: 1 },
  { id: 'b01a_415', code: '415', note: 'V.29', name: '5. Chênh lệch tỷ giá hối đoái', indent: 1 },
  { id: 'b01a_416', code: '416', note: 'V.30', name: '6. Các quỹ thuộc vốn chủ sở hữu', indent: 1 },
  { id: 'b01a_417', code: '417', note: 'V.31', name: '7. Lợi nhuận sau thuế chưa phân phối', indent: 1 },

  { id: 'b01a_440', code: '440', name: 'TỔNG CỘNG NGUỒN VỐN (440 = 300 + 400)', isHeader: true, isFormula: true, indent: 0 },
];

export const DEFAULT_B02_TEMPLATE: Omit<FinancialLineItem, 'currentPeriod' | 'previousPeriod'>[] = [
  { id: 'b02_01', code: '01', note: 'VI.01', name: '1. Doanh thu bán hàng và cung cấp dịch vụ', isHeader: false, indent: 0 },
  { id: 'b02_02', code: '02', note: 'VI.02', name: '2. Các khoản giảm trừ doanh thu', isNegative: true, indent: 0 },
  { id: 'b02_10', code: '10', name: '3. Doanh thu thuần về bán hàng và CCDV (10 = 01 - 02)', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b02_11', code: '11', note: 'VI.03', name: '4. Giá vốn hàng bán', indent: 0 },
  { id: 'b02_20', code: '20', name: '5. Lợi nhuận gộp về bán hàng và CCDV (20 = 10 - 11)', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b02_21', code: '21', note: 'VI.04', name: '6. Doanh thu hoạt động tài chính', indent: 0 },
  { id: 'b02_22', code: '22', note: 'VI.05', name: '7. Chi phí tài chính', indent: 0 },
  { id: 'b02_23', code: '23', name: '- Trong đó: Chi phí lãi vay', indent: 1 },
  { id: 'b02_24', code: '24', note: 'VI.06', name: '8. Chi phí bán hàng và chi phí QLDN', indent: 0 },
  { id: 'b02_30', code: '30', name: '9. Lợi nhuận thuần từ HĐKD (30 = 20 + 21 - 22 - 24)', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b02_31', code: '31', note: 'VI.07', name: '10. Thu nhập khác', indent: 0 },
  { id: 'b02_32', code: '32', note: 'VI.08', name: '11. Chi phí khác', indent: 0 },
  { id: 'b02_40', code: '40', name: '12. Lợi nhuận khác (40 = 31 - 32)', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b02_50', code: '50', name: '13. Tổng lợi nhuận kế toán trước thuế (50 = 30 + 40)', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b02_51', code: '51', note: 'VI.09', name: '14. Chi phí thuế thu nhập doanh nghiệp', indent: 0 },
  { id: 'b02_60', code: '60', name: '15. Lợi nhuận sau thuế TNDN (60 = 50 - 51)', isHeader: true, isFormula: true, indent: 0 },
];

export const DEFAULT_B01B_TEMPLATE: Omit<FinancialLineItem, 'currentPeriod' | 'previousPeriod'>[] = [
  // TÀI SẢN THEO TÍNH THANH KHOẢN GIẢM DẦN
  { id: 'b01b_110', code: '110', note: 'V.01', name: 'I. Tiền và các khoản tương đương tiền', isHeader: false, indent: 0 },
  { id: 'b01b_120', code: '120', note: 'V.02', name: 'II. Đầu tư tài chính', isHeader: false, indent: 0 },
  { id: 'b01b_130', code: '130', name: 'III. Các khoản phải thu', isHeader: false, isFormula: true, indent: 0 },
  { id: 'b01b_131', code: '131', note: 'V.03', name: '1. Phải thu của khách hàng', indent: 1 },
  { id: 'b01b_132', code: '132', note: 'V.04', name: '2. Trả trước cho người bán', indent: 1 },
  { id: 'b01b_133', code: '133', note: 'V.05', name: '3. Phải thu khác', indent: 1 },
  { id: 'b01b_134', code: '134', note: 'V.06', name: '4. Dự phòng phải thu khó đòi (*)', isNegative: true, indent: 1 },
  { id: 'b01b_140', code: '140', name: 'IV. Hàng tồn kho', isHeader: false, isFormula: true, indent: 0 },
  { id: 'b01b_141', code: '141', note: 'V.07', name: '1. Hàng tồn kho', indent: 1 },
  { id: 'b01b_142', code: '142', note: 'V.08', name: '2. Dự phòng giảm giá hàng tồn kho (*)', isNegative: true, indent: 1 },
  { id: 'b01b_150', code: '150', name: 'V. Tài sản cố định và BĐS đầu tư', isHeader: false, isFormula: true, indent: 0 },
  { id: 'b01b_151', code: '151', note: 'V.11', name: '1. Nguyên giá', indent: 1 },
  { id: 'b01b_152', code: '152', note: 'V.12', name: '2. Giá trị hao mòn luỹ kế (*)', isNegative: true, indent: 1 },
  { id: 'b01b_153', code: '153', note: 'V.13', name: '3. Bất động sản đầu tư', indent: 1 },
  { id: 'b01b_160', code: '160', note: 'V.16', name: 'VI. Tài sản khác', isHeader: false, indent: 0 },
  { id: 'b01b_200', code: '200', name: 'TỔNG CỘNG TÀI SẢN (200 = 110 + 120 + 130 + 140 + 150 + 160)', isHeader: true, isFormula: true, indent: 0 },

  // NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU
  { id: 'b01b_300', code: '300', name: 'VII. NỢ PHẢI TRẢ', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b01b_310', code: '310', note: 'V.17', name: '1. Phải trả người bán', indent: 1 },
  { id: 'b01b_320', code: '320', note: 'V.18', name: '2. Người mua trả tiền trước', indent: 1 },
  { id: 'b01b_330', code: '330', note: 'V.19', name: '3. Thuế và các khoản phải nộp Nhà nước', indent: 1 },
  { id: 'b01b_340', code: '340', note: 'V.20', name: '4. Phải trả người lao động', indent: 1 },
  { id: 'b01b_350', code: '350', note: 'V.21', name: '5. Vay và nợ thuê tài chính', indent: 1 },
  { id: 'b01b_360', code: '360', note: 'V.22', name: '6. Phải trả khác', indent: 1 },

  { id: 'b01b_400', code: '400', name: 'VIII. VỐN CHỦ SỞ HỮU', isHeader: true, isFormula: true, indent: 0 },
  { id: 'b01b_410', code: '410', note: 'V.25', name: '1. Vốn góp của chủ sở hữu', indent: 1 },
  { id: 'b01b_420', code: '420', note: 'V.30', name: '2. Các quỹ thuộc vốn chủ sở hữu', indent: 1 },
  { id: 'b01b_430', code: '430', note: 'V.31', name: '3. Lợi nhuận sau thuế chưa phân phối', indent: 1 },
  { id: 'b01b_440', code: '440', note: 'V.27', name: '4. Vốn khác và cổ phiếu quỹ (*)', isNegative: true, indent: 1 },

  { id: 'b01b_500', code: '500', name: 'TỔNG CỘNG NGUỒN VỐN (500 = 300 + 400)', isHeader: true, isFormula: true, indent: 0 },
];

export function createEmptyB01a(year = new Date().getFullYear()): B01aStatement {
  return {
    companyName: 'CÔNG TY TNHH PHÁT TRIỂN THƯƠNG MẠI Á CHÂU',
    taxCode: '0316889988',
    address: '123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    periodYear: year,
    periodType: 'year',
    items: DEFAULT_B01A_TEMPLATE.map(t => ({
      ...t,
      currentPeriod: 0,
      previousPeriod: 0,
    })),
  };
}

export function createEmptyB02(year = new Date().getFullYear()): B02Statement {
  return {
    companyName: 'CÔNG TY TNHH PHÁT TRIỂN THƯƠNG MẠI Á CHÂU',
    taxCode: '0316889988',
    address: '123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    periodYear: year,
    periodType: 'year',
    items: DEFAULT_B02_TEMPLATE.map(t => ({
      ...t,
      currentPeriod: 0,
      previousPeriod: 0,
    })),
  };
}

export function createEmptyB01b(year = new Date().getFullYear()): B01bStatement {
  return {
    companyName: 'CÔNG TY TNHH PHÁT TRIỂN THƯƠNG MẠI Á CHÂU',
    taxCode: '0316889988',
    address: '123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    periodYear: year,
    periodType: 'year',
    items: DEFAULT_B01B_TEMPLATE.map(t => ({
      ...t,
      currentPeriod: 0,
      previousPeriod: 0,
    })),
  };
}

// Dữ liệu mẫu thực tế của 1 doanh nghiệp SME để người dùng dễ quan sát và thẩm định
export function createSampleCorporateProfile(): CorporateFinancialProfile {
  const currentYear = new Date().getFullYear();
  const b01a = createEmptyB01a(currentYear);
  const b02 = createEmptyB02(currentYear);
  const b01b = createEmptyB01b(currentYear);

  // Điền số liệu mẫu B01a (Đơn vị: VNĐ)
  const set01a = (code: string, cur: number, prev: number) => {
    const it = b01a.items.find(i => i.code === code);
    if (it) {
      it.currentPeriod = cur;
      it.previousPeriod = prev;
    }
  };
  set01a('110', 1_250_000_000, 850_000_000); // Tiền
  set01a('120', 500_000_000, 300_000_000); // ĐT ngắn hạn
  set01a('131', 2_400_000_000, 1_950_000_000); // Phải thu KH
  set01a('132', 450_000_000, 320_000_000); // Trả trước NB
  set01a('133', 120_000_000, 80_000_000); // Phải thu khác
  set01a('134', -50_000_000, -30_000_000); // Dự phòng PT khó đòi
  set01a('141', 3_600_000_000, 2_800_000_000); // Hàng tồn kho
  set01a('142', 0, 0); // Dự phòng HTK
  set01a('150', 80_000_000, 50_000_000); // TSNH khác
  set01a('210', 200_000_000, 200_000_000); // Phải thu dài hạn
  set01a('221', 4_500_000_000, 3_800_000_000); // Nguyên giá TSCĐ
  set01a('222', -1_200_000_000, -850_000_000); // Khấu hao lũy kế
  set01a('230', 0, 0); // BĐS ĐT
  set01a('240', 350_000_000, 150_000_000); // XDCB dở dang
  set01a('250', 0, 0); // ĐT dài hạn
  set01a('260', 100_000_000, 80_000_000); // TSDLH khác

  // Nguồn vốn B01a
  set01a('311', 1_850_000_000, 1_420_000_000); // Phải trả người bán
  set01a('312', 320_000_000, 250_000_000); // Người mua trả tiền trước
  set01a('313', 180_000_000, 140_000_000); // Thuế
  set01a('314', 150_000_000, 120_000_000); // Phải trả NLĐ
  set01a('315', 2_500_000_000, 1_800_000_000); // Vay ngắn hạn
  set01a('316', 50_000_000, 40_000_000); // Phải trả NH khác
  set01a('331', 1_200_000_000, 1_500_000_000); // Vay dài hạn
  set01a('332', 0, 0); // Phải trả DH khác
  set01a('411', 5_000_000_000, 4_000_000_000); // Vốn góp
  set01a('412', 0, 0); // Thặng dư
  set01a('413', 0, 0); // Vốn khác
  set01a('414', 0, 0); // Cổ phiếu quỹ
  set01a('415', 0, 0); // CL tỷ giá
  set01a('416', 200_000_000, 150_000_000); // Quỹ
  set01a('417', 850_000_000, 280_000_000); // LNST chưa phân phối

  // Điền số liệu mẫu B02
  const set02 = (code: string, cur: number, prev: number) => {
    const it = b02.items.find(i => i.code === code);
    if (it) {
      it.currentPeriod = cur;
      it.previousPeriod = prev;
    }
  };
  set02('01', 18_500_000_000, 14_200_000_000); // Doanh thu
  set02('02', 250_000_000, 180_000_000); // Giảm trừ DT
  set02('11', 13_800_000_000, 10_650_000_000); // Giá vốn
  set02('21', 85_000_000, 45_000_000); // Doanh thu tài chính
  set02('22', 420_000_000, 360_000_000); // Chi phí tài chính
  set02('23', 380_000_000, 320_000_000); // Chi phí lãi vay
  set02('24', 2_850_000_000, 2_250_000_000); // CP bán hàng & QLDN
  set02('31', 40_000_000, 25_000_000); // Thu nhập khác
  set02('32', 15_000_000, 10_000_000); // Chi phí khác
  set02('51', 258_000_000, 162_000_000); // Chi phí thuế TNDN

  // Điền số liệu mẫu B01b
  const set01b = (code: string, cur: number, prev: number) => {
    const it = b01b.items.find(i => i.code === code);
    if (it) {
      it.currentPeriod = cur;
      it.previousPeriod = prev;
    }
  };
  set01b('110', 1_250_000_000, 850_000_000);
  set01b('120', 500_000_000, 300_000_000);
  set01b('131', 2_400_000_000, 1_950_000_000);
  set01b('132', 450_000_000, 320_000_000);
  set01b('133', 120_000_000, 80_000_000);
  set01b('134', -50_000_000, -30_000_000);
  set01b('141', 3_600_000_000, 2_800_000_000);
  set01b('142', 0, 0);
  set01b('151', 4_500_000_000, 3_800_000_000);
  set01b('152', -1_200_000_000, -850_000_000);
  set01b('153', 0, 0);
  set01b('160', 730_000_000, 510_000_000); // TS khác = XDCB + TSDLH + TSNH khác + Phải thu dài hạn

  set01b('310', 1_850_000_000, 1_420_000_000);
  set01b('320', 320_000_000, 250_000_000);
  set01b('330', 180_000_000, 140_000_000);
  set01b('340', 150_000_000, 120_000_000);
  set01b('350', 3_700_000_000, 3_300_000_000); // Tổng vay ngắn + dài
  set01b('360', 50_000_000, 40_000_000);
  set01b('410', 5_000_000_000, 4_000_000_000);
  set01b('420', 200_000_000, 150_000_000);
  set01b('430', 850_000_000, 280_000_000);
  set01b('440', 0, 0);

  return {
    id: 'sample_corporate_01',
    name: 'CÔNG TY TNHH PHÁT TRIỂN THƯƠNG MẠI Á CHÂU',
    taxCode: '0316889988',
    address: '123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    year: currentYear,
    updatedAt: new Date().toISOString(),
    b01a,
    b02,
    b01b,
  };
}
