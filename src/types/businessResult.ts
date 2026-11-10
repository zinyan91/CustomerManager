/**
 * Bảng "Báo cáo nhanh kết quả kinh doanh" nhập tay trong Trung tâm Báo cáo Excel.
 * Một bảng dùng chung cho cả hệ thống, lưu nguyên khối JSON ở "BusinessResultSheets".
 */

/** Cột nhập số liệu (một mốc ngày, hoặc kế hoạch năm). */
export interface KqkdValueColumn {
  id: string;
  kind: 'value';
  label: string;
}

/** Cột tự tính: cột minuend trừ cột subtrahend, trống nếu một trong hai ô trống. */
export interface KqkdDiffColumn {
  id: string;
  kind: 'diff';
  label: string;
  minuend: string;
  subtrahend: string;
}

/**
 * Cột GAP: kế hoạch trừ thực hiện.
 * Thực hiện của dòng "số dư" là ô có số gần nhất; của dòng "cộng dồn" là tổng các mốc.
 */
export interface KqkdGapColumn {
  id: string;
  kind: 'gap';
  label: string;
  plan: string;
}

export type KqkdColumn = KqkdValueColumn | KqkdDiffColumn | KqkdGapColumn;

export interface KqkdRow {
  id: string;
  label: string;
  unit: string;
  /** Dòng chi tiết của dòng chính phía trên: không đánh STT, in nghiêng. */
  sub: boolean;
  /** true: số phát sinh trong kỳ, GAP so với tổng các mốc. false: số dư, GAP so với mốc gần nhất. */
  cumulative: boolean;
  values: Record<string, number | null>;
}

export interface KqkdSheet {
  title: string;
  subtitle: string;
  unitNote: string;
  columns: KqkdColumn[];
  rows: KqkdRow[];
}

export interface KqkdRecord {
  sheet: KqkdSheet;
  /** Số phiên bản đang lưu; null khi chưa ai lưu (đang hiển thị bảng mẫu). */
  version: number | null;
  updatedAt: string | null;
}
