// Types for Corporate Financial Statements under Circular 133/2016/TT-BTC

export interface FinancialLineItem {
  id: string;
  code: string; // Mã số (e.g. '100', '110', '01')
  note?: string; // Thuyết minh
  name: string; // Tên chỉ tiêu
  isHeader?: boolean; // Tiêu đề nhóm (A, B, I, II)
  isFormula?: boolean; // Dòng tự động tính (không cho nhập thủ công)
  indent?: number; // Cấp bậc thụt lề (0, 1, 2)
  isNegative?: boolean; // Các khoản ghi giảm hoặc số âm như hao mòn, dự phòng, cổ phiếu quỹ
  currentPeriod: number; // Số cuối năm / Kỳ này
  previousPeriod: number; // Số đầu năm / Kỳ trước
}

// Mẫu B01a - DNNVV: Báo cáo tình hình tài chính (Ngắn hạn / Dài hạn)
export interface B01aStatement {
  companyName: string;
  taxCode: string;
  address: string;
  periodYear: number;
  periodType: 'year' | 'quarter';
  quarter?: number;
  items: FinancialLineItem[];
}

// Mẫu B02 - DNNVV: Báo cáo kết quả hoạt động kinh doanh
export interface B02Statement {
  companyName: string;
  taxCode: string;
  address: string;
  periodYear: number;
  periodType: 'year' | 'quarter';
  quarter?: number;
  items: FinancialLineItem[];
}

// Mẫu B01b - DNNVV: Báo cáo tình hình tài chính theo tính thanh khoản giảm dần
export interface B01bStatement {
  companyName: string;
  taxCode: string;
  address: string;
  periodYear: number;
  periodType: 'year' | 'quarter';
  quarter?: number;
  items: FinancialLineItem[];
}

export interface CorporateFinancialProfile {
  id: string;
  name: string;
  taxCode: string;
  address: string;
  year: number;
  updatedAt: string;
  b01a: B01aStatement;
  b02: B02Statement;
  b01b: B01bStatement;
}

export interface FinancialRatios {
  currentRatio: number; // Tài sản ngắn hạn / Nợ ngắn hạn
  quickRatio: number; // (TSNH - Hàng tồn kho) / Nợ ngắn hạn
  cashRatio: number; // Tiền và TĐT / Nợ ngắn hạn
  debtToAssets: number; // Tổng nợ / Tổng tài sản (%)
  debtToEquity: number; // Tổng nợ / Vốn CSH (%)
  inventoryTurnover: number; // Giá vốn / HTK bình quân (vòng)
  grossMargin: number; // LN gộp / Doanh thu thuần (%)
  operatingMargin: number; // LN thuần HĐKD / Doanh thu thuần (%)
  netProfitMargin: number; // LN sau thuế / Doanh thu thuần (%)
  roa: number; // LN sau thuế / Tổng tài sản (%)
  roe: number; // LN sau thuế / Vốn CSH (%)
}
