import type { KqkdColumn, KqkdRow, KqkdSheet } from '../../types/businessResult';

/**
 * Bảng mẫu gộp hai bảng số liệu người dùng gửi ngày 10/11/2026:
 * "Báo cáo nhanh kết quả kinh doanh" (tới 19/10/2026) và bảng chỉ tiêu theo tháng (31/03 – 30/09/2026).
 * Ô trùng mốc mà hai bảng lệch nhau thì lấy theo báo cáo nhanh (bảng mới hơn);
 * bảng chỉ tiêu theo tháng bù các mốc 31/03, 30/04, 30/06, chỉ tiêu CASA 2026 và dòng Lợi nhuận.
 * Hiển thị khi chưa ai lưu bảng lên hệ thống.
 */

const PERIODS = [
  ['c20251231', '31/12/2025'],
  ['c20260331', '31/03/2026'],
  ['c20260430', '30/04/2026'],
  ['c20260531', '31/05/2026'],
  ['c20260630', '30/06/2026'],
  ['c20260731', '31/07/2026'],
  ['c20260831', '31/08/2026'],
  ['c20260930', '30/09/2026'],
  ['c20261016', '16/10/2026'],
  ['c20261019', '19/10/2026'],
] as const;

const PLAN = 'plan2026';

const COLUMNS: KqkdColumn[] = [
  ...PERIODS.map(([id, label]): KqkdColumn => ({ id, kind: 'value', label })),
  { id: 'diffWeek', kind: 'diff', label: '+/- tuần', minuend: 'c20261019', subtrahend: 'c20261016' },
  { id: 'diff0831', kind: 'diff', label: '+/- 31/08', minuend: 'c20261019', subtrahend: 'c20260831' },
  { id: 'diff0930', kind: 'diff', label: '+/- 30/09', minuend: 'c20261019', subtrahend: 'c20260930' },
  { id: 'diffYear', kind: 'diff', label: '+/- 31/12/2025', minuend: 'c20261019', subtrahend: 'c20251231' },
  { id: PLAN, kind: 'value', label: 'KH 2026' },
  { id: 'gap2026', kind: 'gap', label: 'GAP 2026', plan: PLAN },
];

type Cells = (number | null)[];

/** Mười ô theo đúng thứ tự PERIODS, rồi kế hoạch 2026. */
function row(id: string, label: string, unit: string, cells: Cells, plan: number | null, opts: Partial<KqkdRow> = {}): KqkdRow {
  const values: Record<string, number | null> = {};
  PERIODS.forEach(([colId], i) => {
    const v = cells[i];
    if (v !== null && v !== undefined) values[colId] = v;
  });
  if (plan !== null) values[PLAN] = plan;
  return { id, label, unit, sub: false, cumulative: false, values, ...opts };
}

const _ = null;
const TR = 'Triệu đồng';
const flow = { cumulative: true };
const subFlow = { sub: true, cumulative: true };

const ROWS: KqkdRow[] = [
  //                                                  31/12/25  31/03   30/04   31/05   30/06   31/07   31/08   30/09   16/10   19/10     KH 2026
  row('duNo', 'Dư nợ', TR,                           [459_954, 442_626, 431_125, 422_960, 409_671, 388_124, 357_622, 357_080, 352_958, 353_316], 591_591),
  row('huyDong', 'Huy động', TR,                     [396_337, 382_336, 382_157, 376_704, 396_592, 389_562, 408_872, 405_397, 410_002, 411_845], 709_212),
  row('the', 'Thẻ tín dụng', 'Thẻ',                  [121, 10, 22, 33, 46, 58, 61, 78, 85, 85], 140),
  row('baoHiem', 'BHNT / PNT', TR,                   [230, 30, 60, 98, 113, 178, 551, 772, 888, 912], 1_339),
  row('soKh', 'Số lượng KH', 'KH',                   [2_129, 2_202, 2_217, 2_325, 2_426, 2_528, 2_563, 2_656, 2_680, 2_682], 3_843),
  row('casa', 'CASA bình quân', TR,                  [15_363, 16_025, 16_980, 12_880, 19_472, 13_277, 12_239, 13_230, 10_706, 10_440], 30_356),
  row('thuPhi', 'Thu phí', TR,                       [_, _, _, _, _, 26, 24, 23, 6.3, _], _, flow),
  row('thuPhiSoDep', 'Tài khoản số đẹp', TR,         [_, _, _, _, _, 7.7, 6, 0, 5, _], _, subFlow),
  row('thuPhiQuay', 'Phí dịch vụ tại quầy', TR,      [_, _, _, _, _, 18.2, 18, 23, 1.3, _], _, subFlow),
  row('thuNhapLai', 'Thu nhập từ lãi', TR,           [_, _, _, _, _, 859, 987, _, _, _], _, flow),
  row('thuLaiChoVay', 'Thu từ cho vay', TR,          [_, _, _, _, _, 421, 462, _, _, _], _, subFlow),
  row('thuLaiHuyDong', 'Thu từ huy động', TR,        [_, _, _, _, _, 438, 525, _, _, _], _, subFlow),
  row('thuNhapDv', 'Thu nhập từ dịch vụ', TR,        [_, _, _, _, _, 44, 21, _, _, _], _, flow),
  row('thuDichVu', 'Thu từ dịch vụ', TR,             [_, _, _, _, _, 38, 17, _, _, _], _, subFlow),
  row('thuNgoaiHoi', 'Thu KD ngoại hối', TR,         [_, _, _, _, _, 5, _, _, _, _], _, subFlow),
  row('thuBaoLanh', 'Thu bảo lãnh', TR,              [_, _, _, _, _, 2, 4, _, _, _], _, subFlow),
  row('toi', 'Tổng thu nhập (TOI)', TR,              [_, _, _, _, _, 903, 1_008, _, _, _], 18_923, flow),
  row('lnttTh', 'LNTT (TH)', TR,                     [_, _, _, 1_359, _, -649, 477, _, _, _], _, flow),
  row('lnttLk', 'LNTT (LK)', TR,                     [_, _, _, 4_976, _, 4_327, 4_804, _, _, _], 9_228),
  row('loiNhuan', 'Lợi nhuận', TR,                   [_, 421, 898, -212, 4_169, -573, 2_133, 2_251, _, _], 9_568),
];

export function defaultKqkdSheet(): KqkdSheet {
  return {
    title: 'BÁO CÁO NHANH KẾT QUẢ KINH DOANH',
    subtitle: 'Kết quả kinh doanh lũy kế',
    unitNote: 'ĐVT: Triệu đồng, thẻ, khách hàng',
    columns: COLUMNS.map(c => ({ ...c })),
    rows: ROWS.map(r => ({ ...r, values: { ...r.values } })),
  };
}
