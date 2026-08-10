import { cardPolicyOf, normalizePolicyRef, type CardCollateralKind } from './cardContract';

export interface CardLimitTier {
  fromAmount: number;
  toAmount: number | null;
  maxLimit: number;
}

export interface CardLimitMatrixRow {
  role: string;
  byRating: Record<string, number>;
}

export interface CardLimitMatrix {
  rowLabel: string;
  columnLabel: string;
  ratings: string[];
  rows: CardLimitMatrixRow[];
  note?: string;
}

export interface CardLimitBracket {
  label: string;
  limitRule: string;
  maxLimit: number | null;
  byTitleMaxLimit?: number | null;
}

export interface CardPolicyRule {
  code: string;
  subject: string;
  limitRule: string;
  minLimit: number | null;
  maxLimit: number | null;
  tierBasis?: string;
  tiers?: CardLimitTier[];
  matrix?: CardLimitMatrix;
  brackets?: CardLimitBracket[];
  conditions: string[];
  reassessment: string[];
  documents: string[];
}

export function cardLimitFromMatrix(
  matrix: CardLimitMatrix | undefined,
  role: string,
  rating: string
): number {
  if (!matrix) return 0;
  const r = matrix.rows.find(x => x.role.toLowerCase() === role.trim().toLowerCase());
  if (!r) return 0;
  return r.byRating[rating.trim()] ?? 0;
}

export function cardLimitFromTiers(
  tiers: CardLimitTier[] | undefined,
  basisAmount: number
): number {
  if (!tiers || tiers.length === 0 || basisAmount <= 0) return 0;
  const hit = tiers.find(
    t => basisAmount >= t.fromAmount && (t.toAmount === null || basisAmount < t.toAmount)
  );
  return hit ? hit.maxLimit : 0;
}

export const CARD_STK_LTV_PERCENT = 90;

export const CARD_POLICY_RULES: CardPolicyRule[] = [
  {
    code: 'A1_KHCN_TSBD_TIEN GUI',
    subject:
      'KH cầm cố tiền gửi có kỳ hạn VND và ngoại tệ mở tại Vietbank (bao gồm tiền gửi online có kỳ hạn) để đảm bảo phát hành thẻ cho mình hoặc cho người thứ 3. Bảo lãnh cho người thứ 3 thì người bảo lãnh phải là người Việt Nam. Không áp dụng hợp đồng tiền gửi đối với người nước ngoài.',
    limitRule: '90% × giá trị tiền gửi có kỳ hạn (quy đổi VNĐ)',
    minLimit: 10_000_000,
    maxLimit: null,
    conditions: [
      'Kỳ hạn tiền gửi: từ 01 tháng trở lên.',
      'Tiền gửi ngoại tệ: áp tỷ giá mua chuyển khoản theo Bảng tỷ giá vàng – ngoại tệ tại thời điểm xét cấp hạn mức thẻ.',
    ],
    reassessment: [
      'KH đang còn duy trì TG CKH: không tái đánh giá.',
      'KH nợ quá hạn hoặc tất toán TG CKH: thực hiện tái đánh giá.',
    ],
    documents: [
      'Bản chính chứng chỉ tiền gửi / hợp đồng tiền gửi / sổ tiết kiệm.',
      'Tiền gửi online có kỳ hạn: TTKD bổ sung báo cáo Danh sách tiền gửi xuất từ hệ thống nội bộ.',
      'Chứng từ phong toả số dư tiền gửi có kỳ hạn theo quy định hiện hành.',
      'KH thay đổi TSBĐ: thực hiện mẫu biểu BM06_Hợp đồng sửa đổi, bổ sung hợp đồng phát hành và sử dụng thẻ tín dụng.',
    ],
  },
  {
    code: 'A2_KHCN_TSBD_BDS',
    subject:
      'KH thế chấp BĐS để bảo đảm hạn mức thẻ, hoặc KH phát hành thẻ tín dụng kèm theo khoản vay có TSBĐ tại Vietbank.',
    limitRule: 'LTV tối đa theo quy định hiện hành × giá trị BĐS (do Vietbank định giá)',
    minLimit: 10_000_000,
    maxLimit: 500_000_000,
    conditions: [
      'Việc xét cấp thẻ theo hình thức thế chấp BĐS phải tuân theo quy định cấp tín dụng có tài sản bảo đảm là Bất động sản hiện hành của Vietbank.',
      'Trường hợp phát hành thẻ kèm theo khoản vay: KH đứng tên chủ thẻ chính phải là người đứng tên khoản vay trên hệ thống corebanking.',
    ],
    reassessment: [
      'Khi KH có yêu cầu giải chấp TSBĐ hoặc tất toán khoản vay.',
      'Khi KH có yêu cầu hoán đổi TSBĐ (đổi TSBĐ là BĐS thành TSBĐ khác).',
    ],
    documents: [
      'Giấy chứng nhận quyền sở hữu / sử dụng BĐS.',
      'Các chứng từ hợp lệ theo quy định hiện hành của Vietbank về việc cấp tín dụng có tài sản bảo đảm là Bất động sản.',
    ],
  },
  {
    code: 'B1_KHCN_KHONG TSBD_QHVB_TIEN GUI',
    subject: 'KHCN đang có quan hệ tiền gửi có kỳ hạn tại Vietbank.',
    limitRule: 'Theo bậc số dư tiền gửi có kỳ hạn bình quân 6 tháng gần nhất',
    minLimit: 10_000_000,
    maxLimit: 500_000_000,
    tierBasis: 'Số dư tiền gửi CKH bình quân 6 tháng gần nhất',
    tiers: [
      { fromAmount: 5_000_000_000, toAmount: null, maxLimit: 500_000_000 },
      { fromAmount: 3_000_000_000, toAmount: 5_000_000_000, maxLimit: 300_000_000 },
      { fromAmount: 2_000_000_000, toAmount: 3_000_000_000, maxLimit: 200_000_000 },
      { fromAmount: 1_000_000_000, toAmount: 2_000_000_000, maxLimit: 100_000_000 },
      { fromAmount: 500_000_000, toAmount: 1_000_000_000, maxLimit: 50_000_000 },
      { fromAmount: 300_000_000, toAmount: 500_000_000, maxLimit: 30_000_000 },
      { fromAmount: 200_000_000, toAmount: 300_000_000, maxLimit: 20_000_000 },
      { fromAmount: 100_000_000, toAmount: 200_000_000, maxLimit: 10_000_000 },
    ],
    conditions: [
      'Tổng số dư tiền gửi có kỳ hạn bình quân trong 6 tháng gần nhất tối thiểu 100 triệu đồng.',
      'Tại thời điểm xét cấp hạn mức thẻ tín dụng, KH có tổng số dư tiền gửi có kỳ hạn tại Vietbank tối thiểu 100 triệu đồng.',
      'Số dư tiền gửi làm căn cứ xét cấp hạn mức thẻ đã loại trừ số dư cầm cố, phong toả để đảm bảo cho nghĩa vụ nợ tại Vietbank và TCTD khác.',
    ],
    reassessment: [
      'Thực hiện theo Thông báo 982/2024/TB-TGĐ ngày 19/03/2024 và các văn bản sửa đổi, bổ sung, thay thế theo từng thời kỳ.',
    ],
    documents: [
      'Sao kê số dư bình quân tài khoản tiền gửi có kỳ hạn 06 tháng gần nhất lấy từ báo cáo MIS.',
      'Số dư tiền gửi hiện tại lấy từ hệ thống FBE.',
      'Số dư hiện tại và số dư bình quân tiền gửi có kỳ hạn để xét cấp hạn mức phải loại trừ các khoản cầm cố, bảo lãnh.',
    ],
  },
  {
    code: 'B2_KHCN_KHONG TSBD_QHVB_TIN DUNG',
    subject:
      'KH đang có quan hệ tín dụng tại Vietbank (chỉ áp dụng cho Bên được cấp tín dụng). KH có khoản vay được đảm bảo bằng phương tiện vận tải, BĐS/sạp chợ, quyền tài sản phát sinh từ hợp đồng mua bán/chuyển nhượng BĐS (đối với BĐS thuộc dự án liên kết với Vietbank).',
    limitRule:
      '5% × tổng số tiền vay được duyệt (tính trên HĐTD còn hiệu lực và/hoặc khoản vay đang trình phê duyệt hoặc đã được phê duyệt nhưng chưa ký kết Thoả thuận cấp tín dụng)',
    minLimit: null,
    maxLimit: 100_000_000,
    conditions: [
      'KH đang có quan hệ tín dụng từ 12 tháng trở lên với Vietbank.',
      'Chỉ phát hành thẻ đối với KH có quan hệ tín dụng tại Đơn vị đang quản lý khoản vay của KH (căn cứ thông tin trên FBE).',
      'KH đứng tên chủ thẻ chính là người đứng tên khoản vay trên hệ thống corebanking.',
      'Tỷ lệ thu nhập (DSC) của cá nhân vay không TSBĐ theo Quyết định 1032/2023/QĐ-QLCLTD ngày 10/04/2023 về định hướng tín dụng năm 2023, hoặc các văn bản sửa đổi/thay thế.',
      'Chủ TSBĐ cho các khoản cấp tín dụng không phát sinh nợ quá hạn tại bất kỳ TCTD nào (theo CIC).',
      'KHÔNG áp dụng khi KH phát sinh chậm thanh toán gốc, lãi của tất cả khoản vay còn hiệu lực tại Vietbank từ 05 ngày trở lên trong 12 tháng gần nhất (dựa vào sao kê tài khoản vay) từ 02 lần trở lên.',
      'KHÔNG áp dụng khi KH có khoản vay được cơ cấu nợ.',
    ],
    reassessment: [
      'KH đang còn duy trì khoản vay: không tái đánh giá.',
      'KH tất toán khoản vay: thực hiện tái đánh giá.',
      'KH nợ quá hạn thẻ từ 10 ngày trở lên: TTKD làm việc với KH để bổ sung ký hợp đồng khung đảm bảo cho hạn mức thẻ tín dụng (thực hiện thủ tục chuyển sang có TSBĐ).',
    ],
    documents: ['Sao kê tài khoản vay 12 tháng gần nhất.'],
  },
  {
    code: 'B3_KHCN_KHONG TSBD_QHVB_LANH DAO DN VIP',
    subject:
      'KH là thành viên góp vốn có tỷ lệ vốn góp ≥ 30%, Chủ tịch HĐQT/HĐTV, Tổng Giám đốc/Giám đốc điều hành, Kế toán trưởng/Giám đốc tài chính của doanh nghiệp có xếp hạng KHDN tốt tại Vietbank (theo Thông báo 1808/2023/TB-TGĐ ngày 08/06/2023).',
    limitRule: 'Theo ma trận chức danh × xếp hạng doanh nghiệp',
    minLimit: null,
    maxLimit: 300_000_000,
    matrix: {
      rowLabel: 'Thành phần',
      columnLabel: 'Xếp hạng doanh nghiệp',
      ratings: ['Platinum', 'Diamond', 'Gold', 'Silver', 'Bronze'],
      rows: [
        {
          role: 'Thành viên góp vốn/Chủ tịch HĐQT, HĐTV',
          byRating: {
            Platinum: 300_000_000, Diamond: 250_000_000, Gold: 200_000_000,
            Silver: 150_000_000, Bronze: 100_000_000,
          },
        },
        {
          role: 'Tổng Giám đốc/Giám đốc điều hành',
          byRating: {
            Platinum: 250_000_000, Diamond: 200_000_000, Gold: 150_000_000,
            Silver: 100_000_000, Bronze: 50_000_000,
          },
        },
        {
          role: 'Kế toán trưởng/Giám đốc tài chính',
          byRating: {
            Platinum: 200_000_000, Diamond: 150_000_000, Gold: 100_000_000,
            Silver: 50_000_000, Bronze: 50_000_000,
          },
        },
      ],
      note:
        'Tổng hạn mức cấp cho 01 KHDN không vượt quá 1.000 triệu đồng với doanh nghiệp xếp hạng Platinum, Diamond; và không vượt quá 500 triệu đồng với các xếp hạng doanh nghiệp còn lại.',
    },
    conditions: [
      'KHDN không phát sinh nợ quá nhóm 2 trong 12 tháng gần nhất, nợ nhóm 3 đến nhóm 5 trong 36 tháng gần nhất, không có dư nợ bán cho VAMC / nợ xử lý rủi ro tín dụng trong 36 tháng gần nhất tại Vietbank hoặc các TCTD khác tính đến thời điểm xét duyệt cấp hạn mức thẻ.',
      'Xếp hạng của doanh nghiệp theo tiêu chí xếp loại KHDN tốt của Vietbank từng thời kỳ.',
      'Điều kiện KH cá nhân: theo quy định tại Phụ lục 01.',
    ],
    reassessment: [
      'Thực hiện tái đánh giá HMTTD khi có thay đổi xếp hạng doanh nghiệp.',
      'Áp dụng đối với các trường hợp HMTTD đã cấp duy trì dưới 12 tháng.',
      'Thực hiện tái đánh giá theo nội dung tại Khoản 2 Điều 11 Quy định này.',
    ],
    documents: [
      'Hợp đồng lao động hoặc quyết định công tác.',
      'Danh sách xếp loại KHDN còn hiệu lực tại thời điểm xét cấp hạn mức thẻ tín dụng, do Khối Doanh nghiệp tham mưu và được Tổng giám đốc (hoặc người được uỷ quyền) duyệt thuận.',
    ],
  },
  {
    code: 'B4_KHCN_KHONG TSBD_NGOAITHUNHAP_BAO HIEM',
    subject: 'Khách hàng tham gia các sản phẩm bảo hiểm nhân thọ do Vietbank giới thiệu.',
    limitRule: '02 × tổng phí bảo hiểm định kỳ theo hằng năm',
    minLimit: null,
    maxLimit: 100_000_000,
    conditions: [
      'KH là cá nhân đứng tên trên hợp đồng (bên mua Bảo hiểm).',
      'KH đã tham gia bảo hiểm tối thiểu 01 năm và đã đóng đầy đủ phí bảo hiểm từ 02 năm trở lên.',
      'KH đã thanh toán đủ phí bảo hiểm đến hiện tại (tra cứu tại Trang Hợp đồng bảo hiểm online của KH hoặc các trang thể hiện thông tin liên quan).',
      'Trường hợp năm hiện tại KH thay đổi kỳ đóng phí hoặc được áp dụng điều kiện linh hoạt đóng phí không cố định hàng tháng/quý/năm nhưng vẫn đảm bảo đóng đủ phí trong một năm: KH bổ sung chứng từ thể hiện nội dung này.',
      'Trường hợp KH sở hữu nhiều hợp đồng bảo hiểm: cộng dồn phí đóng bảo hiểm/năm của KH.',
      'KH không sở hữu thẻ tín dụng của quá 03 TCTD khác (không bao gồm thẻ của Vietbank chuẩn bị phát hành).',
      'Trong 01 tháng gần nhất tính đến thời điểm TTKD tra CIC của KH: không quá 03 TCTD tra cứu CIC thẻ tín dụng KH (không bao gồm CIC của Vietbank tra để thẩm định hồ sơ).',
    ],
    reassessment: [
      'Thực hiện tái đánh giá HMTTD định kỳ 12 tháng kể từ ngày cấp HMTTD (theo hành vi và lịch sử sử dụng thẻ).',
    ],
    documents: [
      'Bản sao (kèm bản chụp) Biên lai / Hoá đơn / Phiếu thu / Uỷ nhiệm chi / Sao kê tài khoản thanh toán của Vietbank / Màn hình tra cứu thông tin lịch sử đóng phí bảo hiểm trên Trang Hợp đồng bảo hiểm online của KH / Email xác nhận từ công ty bảo hiểm gửi cho KH: thể hiện thông tin nộp phí bảo hiểm kỳ hiện tại.',
      'Bản sao (kèm bản chụp) Hợp đồng bảo hiểm / Hợp đồng bảo hiểm online thể hiện: hợp đồng bảo hiểm được mua, số hợp đồng bảo hiểm, Bên mua bảo hiểm, ngày hiệu lực hợp đồng, số tiền bảo hiểm, phí bảo hiểm định kỳ, định kỳ trả phí bảo hiểm.',
    ],
  },
  {
    code: 'B5_KHCN_KHONG TSBD_QHVB_LANH DAO VIETBANK GIOI THIEU',
    subject: 'KH do Lãnh đạo Vietbank giới thiệu.',
    limitRule: 'Theo chức danh của người giới thiệu',
    minLimit: null,
    maxLimit: 500_000_000,
    matrix: {
      rowLabel: 'Người giới thiệu',
      columnLabel: 'Hạn mức tối đa',
      ratings: ['Hạn mức tối đa'],
      rows: [
        {
          role: 'Ban Tổng Giám đốc trở lên hoặc tương đương',
          byRating: { 'Hạn mức tối đa': 500_000_000 },
        },
        {
          role: 'Giám đốc/Phó Giám đốc Khối trở lên, Giám đốc Vùng/Khu vực/Trung tâm/Giám đốc Phòng/Ban HO hoặc tương đương',
          byRating: { 'Hạn mức tối đa': 200_000_000 },
        },
      ],
    },
    conditions: [
      'Số lượng KH được giới thiệu tối đa: 05 KH/năm/CBNV (năm thường niên).',
    ],
    reassessment: [],
    documents: [
      'Giấy giới thiệu phát hành thẻ tín dụng theo mẫu biểu BM03 ban hành kèm theo Quy định này.',
      'Đối với người giới thiệu thuộc Ban điều hành trở lên hoặc tương đương: chấp nhận Email giới thiệu khách hàng từ các Lãnh đạo/Trợ lý của Lãnh đạo (có c/c cho cấp Lãnh đạo).',
    ],
  },
  {
    code: 'B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK',
    subject: 'KHCN nhận lương qua tài khoản mở tại Vietbank.',
    limitRule: 'Theo nhân hệ số lương bình quân 03 tháng gần nhất, khác nhau theo chức danh',
    minLimit: null,
    maxLimit: 200_000_000,
    brackets: [
      {
        label: 'Từ cấp Trưởng/Phó Phòng/Ban trở lên và các chức danh còn lại (không bao gồm các chức danh tại Khoản 6.2 Mục III)',
        limitRule: '04 × lương bình quân 03 tháng gần nhất',
        maxLimit: 200_000_000,
      },
      {
        label: 'Các chức danh thuộc đối tượng hạn chế cấp thẻ tín dụng theo Phụ lục 01 nhưng thoả điều kiện cấp thẻ',
        limitRule: '03 × lương bình quân 03 tháng gần nhất',
        maxLimit: 30_000_000,
      },
    ],
    conditions: [
      'Tổ chức đang sử dụng dịch vụ chi hộ lương của Vietbank.',
      'Tổ chức có thời gian hoạt động từ 02 năm (tính từ ngày Mã số thuế / Mã số doanh nghiệp được cấp).',
      'KH ký HĐLĐ chính thức.',
      'Thời hạn HĐLĐ tối thiểu 12 tháng, thời hạn hiệu lực còn lại của HĐLĐ tối thiểu 01 tháng.',
      'Hiện đang được chi trả lương qua tài khoản Vietbank tối thiểu 01 kỳ lương.',
      'Lương bình quân tối thiểu: Hồ Chí Minh và Hà Nội 08 triệu đồng; khu vực còn lại 06 triệu đồng.',
      'Không thuộc đối tượng hạn chế cấp thẻ tín dụng theo Phụ lục 01.',
      'DSC của cá nhân vay không TSBĐ theo Quyết định 1032.',
      'Trong 01 tháng gần nhất tính đến thời điểm TTKD tra CIC của KH: không quá 03 TCTD tra cứu CIC thẻ tín dụng KH (không bao gồm CIC của Vietbank tra để thẩm định hồ sơ).',
    ],
    reassessment: [
      'Thực hiện tái đánh giá HMTTD định kỳ 12 tháng kể từ ngày cấp HMTTD (theo hành vi và lịch sử sử dụng thẻ).',
    ],
    documents: [
      'Hợp đồng lao động / Xác nhận công tác và mức lương của tổ chức / Quyết định biên chế / Quyết định bổ nhiệm / Quyết định tăng lương / Quyết định nâng bậc hàm… (thể hiện đầy đủ thông tin chứng minh KH đủ điều kiện cấp thẻ).',
      'Sao kê tài khoản lương 03 tháng lương gần nhất.',
      'Trường hợp KH mới nhận lương 1 kỳ tại Vietbank: TTKD bổ sung thêm sao kê 02 kỳ lương liền kề trước đó được chi tại ngân hàng khác.',
      'Chứng từ chứng minh Tổ chức sử dụng dịch vụ chi hộ lương tại Vietbank: báo cáo chi hộ lương trên hệ thống báo cáo nội bộ MIS, hoặc bản sao hợp đồng chi hộ lương của Đơn vị của KH ký với Vietbank.',
      'Lưu ý: Đơn vị quản lý Công ty có hợp đồng chi lương với Vietbank là đơn vị phát hành thẻ.',
      'Lưu ý: KH nhận lương qua Vietbank nhưng Tổ chức của KH KHÔNG ký hợp đồng chi hộ lương với Vietbank thì áp dụng theo mã B7 (nhận lương qua ngân hàng khác).',
    ],
  },
  {
    code: 'B7_KHCN_KHONG TSBD_THUNHAP_ LUONG KHAC',
    subject: 'KH nhận lương qua tài khoản mở tại ngân hàng khác.',
    limitRule: 'Theo nhân hệ số lương bình quân 03 tháng gần nhất, khác nhau theo chức danh',
    minLimit: null,
    maxLimit: 200_000_000,
    brackets: [
      {
        label: 'HĐQT/HĐTV/Ban TGĐ/Ban kiểm soát hoặc tương đương',
        limitRule: '04 × lương bình quân 03 tháng gần nhất',
        maxLimit: 200_000_000,
      },
      {
        label: 'Các chức danh còn lại (không bao gồm các chức danh tại Khoản 7.3 Mục III)',
        limitRule: '03 × lương bình quân 03 tháng gần nhất',
        maxLimit: 100_000_000,
      },
      {
        label: 'Các chức danh thuộc đối tượng hạn chế cấp thẻ tín dụng theo Phụ lục 01 nhưng thoả điều kiện cấp thẻ',
        limitRule: '03 × lương bình quân 03 tháng gần nhất',
        maxLimit: 30_000_000,
      },
    ],
    conditions: [
      'Tổ chức có thời gian hoạt động từ 02 năm (tính từ ngày Mã số thuế / Mã số Doanh nghiệp được cấp).',
      'KH ký HĐLĐ chính thức.',
      'Thời hạn HĐLĐ tối thiểu 12 tháng, thời hạn hiệu lực còn lại của HĐLĐ tối thiểu 01 tháng.',
      'Thời gian công tác từ 03 tháng liên tục trở lên (bao gồm thời gian thử việc).',
      'Đối tượng KH tại Khoản 7.2 và 7.3: thời gian tham gia BHXH tối thiểu 6 tháng trong 12 tháng gần nhất, trong đó tối thiểu 1 tháng tại công ty hiện tại.',
      'Lương bình quân tối thiểu: Hồ Chí Minh và Hà Nội 08 triệu đồng; khu vực còn lại 06 triệu đồng.',
      'Không thuộc đối tượng hạn chế cấp thẻ tín dụng theo Phụ lục 01.',
      'DSC của cá nhân vay không TSBĐ theo Quyết định 1032.',
      'Trong 01 tháng gần nhất tính đến thời điểm TTKD tra CIC của KH: không quá 03 TCTD tra cứu CIC thẻ tín dụng KH (không bao gồm CIC của Vietbank tra để thẩm định hồ sơ).',
    ],
    reassessment: [
      'Thực hiện tái đánh giá HMTTD định kỳ 12 tháng kể từ ngày cấp HMTTD (theo hành vi và lịch sử sử dụng thẻ).',
    ],
    documents: [
      'Hợp đồng lao động / Xác nhận công tác của tổ chức / Quyết định biên chế / Quyết định bổ nhiệm / Quyết định tăng lương… (thể hiện đầy đủ thông tin chứng minh KH đủ điều kiện cấp thẻ).',
      'KHÔNG thu thập chứng từ chứng minh công tác đối với KH là HĐQT/HĐTV/Ban TGĐ của các công ty thuộc Top 500 Doanh nghiệp lớn tại VN theo www.vnr500.com.vn — thay bằng chụp màn hình tra cứu thông tin niêm yết trên website ngân hàng hoặc các phương tiện thông tin đại chúng.',
      'Sao kê tài khoản lương 03 tháng lương gần nhất.',
      'Đối tượng KH tại Khoản 7.2 và 7.3: bổ sung quá trình tham gia BHXH của KH.',
    ],
  },
  {
    code: 'B8_KHCN_KHONG TSBD_THUNHAP_CBNV NGAN HANG',
    subject: 'KHCN làm việc tại các ngân hàng khác.',
    limitRule:
      'Hai cơ sở song song: theo chức danh, hoặc theo lương (04 × lương bình quân 03 tháng gần nhất). Trần khác nhau theo từng nhánh chức danh.',
    minLimit: null,
    maxLimit: 500_000_000,
    brackets: [
      {
        label: 'HĐQT / Ban Tổng Giám đốc / Ban kiểm soát',
        limitRule: 'Theo chức danh',
        maxLimit: 500_000_000,
      },
      {
        label: 'Giám đốc/Phó Giám đốc Khối/Vùng/Khu vực; Giám đốc/Phó Giám đốc CN, Trưởng/Phó Phòng/Ban/Trung tâm HO, Trưởng Văn phòng đại diện hoặc tương đương',
        limitRule: '04 × lương bình quân 03 tháng gần nhất',
        maxLimit: 500_000_000,
        byTitleMaxLimit: 150_000_000,
      },
      {
        label: 'Trưởng/Phó phòng CN, Trưởng bộ phận/Tổ trưởng HO hoặc tương đương; Giám đốc/Phó Giám đốc PGD hoặc tương đương',
        limitRule: '04 × lương bình quân 03 tháng gần nhất',
        maxLimit: 200_000_000,
        byTitleMaxLimit: 80_000_000,
      },
      {
        label: 'Các chức danh còn lại, hoặc các chức danh thuộc đối tượng hạn chế cấp thẻ tín dụng theo Phụ lục 01',
        limitRule: '04 × lương bình quân 03 tháng gần nhất',
        maxLimit: 50_000_000,
        byTitleMaxLimit: 25_000_000,
      },
    ],
    conditions: [
      'KH ký HĐLĐ chính thức.',
      'Thời hạn HĐLĐ tối thiểu 12 tháng, thời hạn hiệu lực còn lại của HĐLĐ tối thiểu 01 tháng.',
      'Thời gian KH công tác tại Ngân hàng hiện tại liên tục tối thiểu 03 tháng (bao gồm thời gian thử việc).',
      'Không thuộc đối tượng hạn chế cấp thẻ tín dụng theo Phụ lục 01.',
      'Đối tượng KH tại Khoản 8.4: thời gian tham gia BHXH tối thiểu 6 tháng trong 12 tháng gần nhất, trong đó tối thiểu 1 tháng tại Ngân hàng hiện tại.',
      'DSC của cá nhân vay không TSBĐ theo Quyết định 1032.',
      'Trong 01 tháng gần nhất tính đến thời điểm TTKD tra CIC của KH: không quá 03 TCTD tra cứu CIC thẻ tín dụng KH (không bao gồm CIC của Vietbank tra để thẩm định hồ sơ).',
    ],
    reassessment: [
      'Thực hiện tái đánh giá HMTTD định kỳ 12 tháng kể từ ngày cấp HMTTD (theo hành vi và lịch sử sử dụng thẻ).',
    ],
    documents: [
      'Hợp đồng lao động / Xác nhận công tác của tổ chức / Quyết định biên chế / Quyết định bổ nhiệm / Quyết định tăng lương… (thể hiện đầy đủ thông tin chứng minh KH đủ điều kiện cấp thẻ).',
      'KHÔNG thu thập chứng từ chứng minh công tác đối với KH là HĐQT/Ban TGĐ/Ban Kiểm soát — thay bằng chụp màn hình tra cứu thông tin niêm yết trên website ngân hàng hoặc các phương tiện thông tin đại chúng.',
      'KH cấp hạn mức theo lương: sao kê tài khoản lương / xác nhận lương của ngân hàng thể hiện 03 tháng lương gần nhất, hoặc màn hình tài khoản lương trên MB/IB.',
      'Đối tượng KH tại Khoản 8.4: bổ sung quá trình tham gia BHXH của KH.',
      'Lưu ý: CBNV Ngân hàng TMCP Hàng Hải — chấp nhận chứng từ HĐLĐ của CBNV với công ty CP Quản trị Nguồn nhân lực TN-Talent.',
    ],
  },
  {
    code: 'B9_KHCN_KHONG TSBD_NGOAITHUNHAP_THE TD NGAN HANG KHAC',
    subject:
      'KH đang sở hữu thẻ tín dụng quốc tế KHÔNG có TSBĐ của các Ngân hàng khác được phát hành tại Việt Nam (đã được thẩm định thẻ bởi các Ngân hàng uy tín).',
    limitRule: '100% × hạn mức thẻ tín dụng KH đang sở hữu dùng làm căn cứ cấp thẻ Vietbank',
    minLimit: 10_000_000,
    maxLimit: 100_000_000,
    conditions: [
      'Thẻ đang sở hữu phải đạt hạn mức tối thiểu theo nhóm ngân hàng phát hành: HSBC, Citibank (UOB), Standard Chartered Bank, Shinhanbank/ANZ, Vietcombank, BIDV, ACB, MB, Vietinbank — tối thiểu 30 triệu đồng.',
      'Sacombank, TPBank, Eximbank, HDBank, VIB — tối thiểu 50 triệu đồng.',
      'Thẻ các ngân hàng còn lại — tối thiểu 100 triệu đồng.',
      'Thời gian sở hữu và/hoặc sử dụng thẻ (bao gồm thời gian gia hạn / thay thế / cấp lại thẻ) tối thiểu 6 tháng (tính theo tháng) tính đến thời điểm KH đề nghị mở thẻ Vietbank.',
      'Tại thời điểm KH đề nghị mở thẻ, tổng dư nợ thẻ không vượt quá 70% tổng hạn mức thẻ hiện tại (theo thông tin tra cứu CIC).',
      'KH không sở hữu thẻ tín dụng của quá 03 TCTD khác (không bao gồm thẻ của Vietbank chuẩn bị phát hành).',
      'Không quá 03 TCTD tra cứu CIC thẻ tín dụng KH trong 01 tháng gần nhất, và không quá 05 TCTD tra cứu CIC thẻ tín dụng KH trong 03 tháng gần nhất (không bao gồm CIC của Vietbank tra để thẩm định hồ sơ).',
    ],
    reassessment: [
      'Thực hiện tái đánh giá HMTTD định kỳ 12 tháng kể từ ngày cấp HMTTD (theo hành vi và lịch sử sử dụng thẻ).',
    ],
    documents: [
      'Bản sao (kèm bản chụp) hai mặt của thẻ thể hiện họ tên chủ thẻ, số thẻ (che 8 số giữa, để lộ 06 số đầu và 04 số cuối) và thời hạn hiệu lực thẻ.',
      'Hoặc ảnh chụp màn hình Mobile banking / Internet banking / Digital Bank, hoặc bản sao Sao kê thẻ (chấp nhận sao kê điện tử) của 01 trong 06 kỳ gần nhất, hoặc bản gốc xác nhận của ngân hàng phát hành thẻ thể hiện thông tin thẻ tín dụng của KH, hoặc bản sao Hoá đơn thanh toán hàng hoá từ máy POS có số thẻ KH (tối thiểu 4 số cuối) trong vòng 01 tháng gần nhất.',
      'CIC thông tin thẻ tín dụng của KH.',
      'Trường hợp KH gia hạn / thay thế / cấp lại thẻ / khác loại thẻ: KH bổ sung số thẻ, số tài khoản thẻ của thẻ cũ — kèm sao kê thẻ tín dụng kỳ trước và sau khi gia hạn, hoặc xác nhận của Ngân hàng phát hành về việc thông tin thẻ cũ được đổi thành thông tin thẻ mới.',
      'Lưu ý: ảnh chụp thẻ được phát hành bởi ngân hàng uy tín và màn hình Mobile banking / Internet banking / Digital Bank phải được chụp kèm với thẻ CBNV Vietbank hoặc CCCD/HC của NVKD Vietbank.',
      'Lưu ý: trường hợp thẻ tín dụng không có tháng phát hành thì tháng phát hành được xác định bằng tháng hết hạn của thẻ.',
    ],
  },
  {
    code: 'B10_KHCN_KHONG TSBD_VITRIXAHOI_CBNV CQNN',
    subject: 'KHCN là CBNV thuộc các Đơn vị nhà nước.',
    limitRule: 'Theo chức danh, phân theo bốn nhóm đơn vị. TTKD có thể trình theo chức danh hoặc theo lương nếu thoả điều kiện.',
    minLimit: null,
    maxLimit: 200_000_000,
    brackets: [
      {
        label: '10.1 Bệnh viện công lập / Trung tâm y tế dự phòng / Trung tâm y tế cấp Trung ương, Tỉnh, Quận, Huyện — Giám đốc/Phó Giám đốc',
        limitRule: 'Theo chức danh',
        maxLimit: 200_000_000,
      },
      {
        label: '10.1 — Trưởng/Phó Khoa/Phòng hoặc tương đương',
        limitRule: 'Theo chức danh',
        maxLimit: 100_000_000,
      },
      {
        label: '10.1 — Bác sĩ / Dược sĩ ĐH / Kỹ thuật viên trưởng / Trưởng điều dưỡng / Chuyên viên chính / Tổ trưởng / Trưởng nhóm',
        limitRule: 'Theo chức danh',
        maxLimit: 50_000_000,
      },
      {
        label: '10.2 Trường công lập / Trung tâm GDTX — Hiệu trưởng/Hiệu phó các trường, Giám đốc/Phó giám đốc các TT GDTX tại Thành phố trực thuộc Trung ương',
        limitRule: 'Theo chức danh',
        maxLimit: 200_000_000,
      },
      {
        label: '10.2 — Hiệu trưởng/Hiệu phó/Giám đốc/Phó GĐ các trường còn lại; Trưởng/Phó khoa/Viện/Trung tâm/Bộ môn quản lý đào tạo; Trưởng/Phó phòng/Ban/Trung tâm chức năng; Trưởng/Phó các tổ chức nghiên cứu và phát triển; Giảng viên là Giáo sư/Phó Giáo sư; các chức danh tương đương',
        limitRule: 'Theo chức danh',
        maxLimit: 100_000_000,
      },
      {
        label: '10.2 — Giảng viên',
        limitRule: 'Theo chức danh',
        maxLimit: 50_000_000,
      },
      {
        label: '10.2 — Giáo viên Mầm non',
        limitRule: 'Theo chức danh',
        maxLimit: 20_000_000,
      },
      {
        label: '10.2 — Giáo viên Cấp 1',
        limitRule: 'Theo chức danh',
        maxLimit: 30_000_000,
      },
      {
        label: '10.2 — Giáo viên Cấp 2',
        limitRule: 'Theo chức danh',
        maxLimit: 40_000_000,
      },
      {
        label: '10.2 — Giáo viên Cấp 3',
        limitRule: 'Theo chức danh',
        maxLimit: 50_000_000,
      },
      {
        label: '10.3 Lực lượng Vũ trang nhân dân Việt Nam — cấp Đại úy trở lên',
        limitRule: 'Theo chức danh',
        maxLimit: 50_000_000,
      },
      {
        label: '10.3 — cấp Thiếu úy trở lên',
        limitRule: 'Theo chức danh',
        maxLimit: 30_000_000,
      },
      {
        label: '10.4 Cơ quan hành chính/sự nghiệp nhà nước, Quốc hội, Chính phủ, Toà án, Viện kiểm sát, Đảng cộng sản, Mặt trận tổ quốc, Tổ chức chính trị - xã hội — Trưởng/Phó đơn vị hoặc tương đương',
        limitRule: 'Theo chức danh',
        maxLimit: 100_000_000,
      },
      {
        label: '10.4 — Trưởng/Phó phòng/ban hoặc tương đương tại đơn vị',
        limitRule: 'Theo chức danh',
        maxLimit: 50_000_000,
      },
      {
        label: '10.4 — CBNV còn lại (ngoại trừ tài xế, tạp vụ, nhân viên giao hàng)',
        limitRule: 'Theo chức danh',
        maxLimit: 30_000_000,
      },
    ],
    conditions: [
      'KH có HĐLĐ chính thức (thời hạn HĐLĐ tối thiểu 12 tháng, thời hạn hiệu lực còn lại tối thiểu 01 tháng) / Quyết định biên chế / các Quyết định chứng minh công tác tại đơn vị.',
      'Có thời gian công tác tại đơn vị hiện tại tối thiểu 03 tháng. Trường hợp chuyển công tác giữa các đơn vị nhà nước, KH cung cấp chứng từ thể hiện việc điều chuyển công tác; thời gian làm việc chính thức được xét tại Đơn vị hiện tại và/hoặc Đơn vị cũ trước khi điều chuyển.',
      'KH không sở hữu thẻ tín dụng của quá 03 TCTD khác (không bao gồm thẻ của Vietbank chuẩn bị phát hành).',
      'Trong 01 tháng gần nhất tính đến thời điểm TTKD tra CIC của KH: không quá 03 TCTD tra cứu CIC thẻ tín dụng KH (không bao gồm CIC của Vietbank tra để thẩm định hồ sơ).',
      'KH cấp theo chức danh: tổng hạn mức tín dụng không TSBĐ tại các TCTD theo CIC của KH không vượt quá 20 lần thu nhập (theo kê khai của KH hoặc kết quả thẩm định).',
      'DSC của cá nhân vay không TSBĐ theo Quyết định 1032.',
      'TTKD có thể trình hồ sơ cấp hạn mức theo chức danh hoặc theo lương nếu thoả điều kiện.',
    ],
    reassessment: [
      'Thực hiện tái đánh giá HMTTD định kỳ 12 tháng kể từ ngày cấp HMTTD (theo hành vi và lịch sử sử dụng thẻ).',
    ],
    documents: [
      'Hợp đồng lao động / Xác nhận công tác và mức lương của tổ chức / Quyết định bổ nhiệm / Quyết định tăng lương / Quyết định biên chế / Quyết định nâng bậc hàm… (thể hiện đầy đủ thông tin chứng minh KH đủ điều kiện cấp thẻ).',
      'KH cấp hạn mức theo lương: sao kê tài khoản lương / Giấy xác nhận lương 03 tháng lương gần nhất.',
      'Chứng từ / Văn bản thể hiện chức danh, hệ số lương, ngạch bậc, hoặc thông tin chức danh trên Website của cơ quan Nhà nước — đối với KH có chức danh Trưởng/Phó phòng hoặc tương đương trở lên.',
      'Các chức danh còn lại: hồ sơ bổ sung tương tự quy định của đối tượng khách hàng mục 10.1, 10.2 và 10.3.',
    ],
  },
  {
    code: 'B11_KHCN_KHONG TSBD_THUNHAP_HOKINHDOANH',
    subject: 'KHCN là chủ Hộ kinh doanh cá thể, hộ kinh doanh thành lập từ 01 năm trở lên.',
    limitRule: 'Doanh thu khoán một tháng',
    minLimit: null,
    maxLimit: 50_000_000,
    conditions: [
      'Có đăng ký hộ kinh doanh.',
      'Hộ kinh doanh do MỘT cá nhân thành lập (không áp dụng với Hộ kinh doanh do hộ gia đình thành lập).',
      'Hộ kinh doanh được thành lập từ 01 năm trở lên.',
      'Doanh thu khoán bình quân từ 15 triệu đồng/tháng trở lên.',
      'Tại thời điểm KH đề nghị mở thẻ, tổng dư nợ thẻ không vượt quá 70% tổng hạn mức thẻ hiện tại (theo thông tin tra cứu CIC).',
      'KH không sở hữu thẻ tín dụng của quá 03 TCTD khác (không bao gồm thẻ của Vietbank chuẩn bị phát hành).',
      'Không quá 03 TCTD tra cứu CIC thẻ tín dụng KH trong 01 tháng gần nhất và không quá 05 TCTD trong 03 tháng gần nhất (không bao gồm CIC của Vietbank tra để thẩm định hồ sơ).',
    ],
    reassessment: [
      'Thực hiện tái đánh giá HMTTD định kỳ 12 tháng kể từ ngày cấp HMTTD (theo hành vi và lịch sử sử dụng thẻ).',
    ],
    documents: [
      'Giấy chứng nhận đăng ký hộ kinh doanh.',
      'Các chứng từ thể hiện quá trình đóng thuế theo quy định pháp luật liên quan 03 tháng hoặc quý gần nhất.',
    ],
  },
  {
    code: 'B12_KHCN_KHONG TSBD_DNBAOLANH',
    subject: 'KHCN được bảo lãnh bởi Doanh nghiệp có quan hệ tín dụng với Vietbank.',
    limitRule:
      'Tối đa 500 triệu đồng/khách hàng. Tổng hạn mức thẻ được một Doanh nghiệp bảo lãnh tối đa 10% hạn mức tín dụng mà Vietbank đã cấp và không vượt quá 5 tỉ đồng/Doanh nghiệp — bao gồm cả hạn mức thẻ của KH đã phát hành theo mã B3 (thành viên góp vốn/Ban lãnh đạo/Chủ DN có xếp hạng KHDN tốt), tính cả vay ngắn hạn và trung dài hạn.',
    minLimit: null,
    maxLimit: 500_000_000,
    conditions: [
      'Cá nhân được bảo lãnh là CBNV làm việc tại Doanh nghiệp.',
      'Doanh nghiệp đang có quan hệ tín dụng có TSĐB tại TTKD (không áp dụng đối với TSĐB là số dư tiền gửi của Doanh nghiệp) thuộc top 500 Doanh nghiệp lớn tại Việt Nam theo www.VNR500.com.vn.',
      'Tại thời điểm KH đề nghị mở thẻ, tổng dư nợ thẻ không vượt quá 70% tổng hạn mức thẻ hiện tại (theo thông tin tra cứu CIC).',
      'KH không sở hữu thẻ tín dụng của quá 03 TCTD khác (không bao gồm thẻ của Vietbank chuẩn bị phát hành).',
      'Không quá 03 TCTD tra cứu CIC thẻ tín dụng KH trong 01 tháng gần nhất và không quá 05 TCTD trong 03 tháng gần nhất (không bao gồm CIC của Vietbank tra để thẩm định hồ sơ).',
    ],
    reassessment: [
      'Thực hiện tái đánh giá HMTTD định kỳ 12 tháng kể từ ngày cấp HMTTD (theo hành vi và lịch sử sử dụng thẻ).',
    ],
    documents: [
      'Thư bảo lãnh bởi Doanh nghiệp có quan hệ tín dụng.',
      'Biên bản họp HĐTV/HĐQT hoặc Quyết định của Chủ sở hữu Doanh nghiệp về việc cấp hạn mức tín dụng cho CBNV bằng thẻ tín dụng.',
    ],
  },
  {
    code: 'B13_KHCN_KHONG TSBD_BXH_SANCK',
    subject: 'KHCN nằm trong bảng xếp hạng top 200 người giàu trên sàn chứng khoán HOSE/HNX.',
    limitRule: 'Theo xếp hạng người giàu trên sàn chứng khoán',
    minLimit: null,
    maxLimit: 500_000_000,
    conditions: [
      'Cổ phiếu của công ty niêm yết trên sàn chứng khoán HOSE/HNX không thuộc diện cảnh báo, không bị lỗ trong năm gần nhất.',
      'Công ty có liên quan không có thông tin xấu về khả năng tài chính trong 01 năm gần nhất.',
    ],
    reassessment: [
      'Thực hiện tái đánh giá HMTTD định kỳ 12 tháng kể từ ngày cấp HMTTD (theo hành vi và lịch sử sử dụng thẻ).',
    ],
    documents: [
      'Chụp màn hình tra cứu từ Website Cafef.vn (https://cafef.vn/du-lieu/top/ceo.chn).',
    ],
  },
];

export const CARD_POLICY_GENERAL_NOTES = [
  'KHÔNG yêu cầu thời gian hoạt động đối với các Tổ chức/Doanh nghiệp/Đơn vị có vốn nhà nước, hoặc các Đơn vị hành chính sự nghiệp / Đơn vị Lực lượng Vũ trang nhân dân Việt Nam.',
  'KHÔNG yêu cầu thời gian hoạt động đối với các Công ty thuộc Top 500 Doanh nghiệp lớn tại Việt Nam theo www.VNR500.com.vn.',
  'KHÔNG yêu cầu thời gian hoạt động đối với các Công ty/Tổ chức/Doanh nghiệp được niêm yết trên sàn chứng khoán Sở giao dịch / Trung tâm giao dịch chứng khoán tại TPHCM và Hà Nội.',
  'KHÔNG yêu cầu thời gian hoạt động đối với các Công ty có xếp hạng KHDN tốt tại Vietbank từng thời kỳ.',
  'KHÔNG yêu cầu thời gian hoạt động đối với Tổ chức tài chính/tín dụng nước ngoài và công ty con.',
  'KHÔNG yêu cầu thời gian hoạt động đối với các công ty đa quốc gia.',
  'KHÔNG yêu cầu thời gian hoạt động đối với các công ty vốn điều lệ từ 10 tỷ đồng trở lên.',
  'Quá trình tham gia BHXH của khách hàng có thể thu thập từ bản chụp VssID của BHXH/BHTN/BHTNLĐ-BNN/BHYT và/hoặc các chứng từ liên quan thể hiện được quá trình tham gia BHXH của khách hàng.',
];

export function cardPolicyRuleOf(ref?: string | null): CardPolicyRule | null {
  const policy = cardPolicyOf(ref);
  if (!policy) return null;
  return CARD_POLICY_RULES.find(
    r => normalizePolicyRef(r.code) === normalizePolicyRef(policy.code)
  ) ?? null;
}

export interface CardLimitBoundCheck {
  ok: boolean;
  message?: string;
}

export function checkCardLimitAgainstPolicy(
  policyCode: string | null | undefined,
  grantedLimit: number
): CardLimitBoundCheck {
  const rule = cardPolicyRuleOf(policyCode);
  if (!rule || grantedLimit <= 0) return { ok: true };

  if (rule.minLimit !== null && grantedLimit < rule.minLimit) {
    return {
      ok: false,
      message:
        `Mã ${rule.code} quy định hạn mức tối thiểu ${rule.minLimit.toLocaleString('vi-VN')}đ, ` +
        `đang khai ${grantedLimit.toLocaleString('vi-VN')}đ.`,
    };
  }

  if (rule.maxLimit !== null && grantedLimit > rule.maxLimit) {
    return {
      ok: false,
      message:
        `Mã ${rule.code} quy định hạn mức tối đa ${rule.maxLimit.toLocaleString('vi-VN')}đ, ` +
        `đang khai ${grantedLimit.toLocaleString('vi-VN')}đ.`,
    };
  }

  return { ok: true };
}

export function cardPolicyRulesForCollateralKind(
  kind: CardCollateralKind,
  codesOfKind: string[]
): CardPolicyRule[] {
  const set = new Set(codesOfKind.map(c => c.toLowerCase()));
  void kind;
  return CARD_POLICY_RULES.filter(r => set.has(r.code.toLowerCase()));
}
