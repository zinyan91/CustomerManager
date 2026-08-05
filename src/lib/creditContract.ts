import type { CreditContract, LoanContract } from '../types';
import { isRevolvingCredit } from './loanProductRules';
import { getMasterHdtdNumber } from './utils';

export const GNN_SEPARATOR = '/GNN-';

/**
 * Sinh số KUNN tiếp theo của một HĐTD.
 *
 * Lấy MAX số thứ tự đang có rồi cộng 1, không đếm số dòng: đếm dòng sẽ sinh
 * trùng ngay khi có KUNN bị xoá giữa dãy. Số đã dùng không bao giờ tái sử
 * dụng, kể cả khi KUNN cũ đã tất toán — tất toán GNN-01 thì khoản mới là
 * GNN-02.
 */
export function nextKunnNumber(hdtdNumber: string, existingKunnNumbers: string[]): string {
  const hdtd = (hdtdNumber || '').trim();
  if (!hdtd) return '';

  const prefix = (hdtd + GNN_SEPARATOR).toLowerCase();
  let maxIndex = 0;

  for (const raw of existingKunnNumbers) {
    const no = (raw || '').trim();
    if (!no) continue;

    const lower = no.toLowerCase();
    if (lower.startsWith(prefix)) {
      const tail = no.slice(hdtd.length + GNN_SEPARATOR.length);
      const n = parseInt(tail, 10);
      if (!isNaN(n) && n > maxIndex) maxIndex = n;
      continue;
    }

    // Dữ liệu cũ: số KUNN để trùng số HĐTD, chưa có hậu tố GNN.
    if (lower === hdtd.toLowerCase() && maxIndex < 1) maxIndex = 1;
  }

  return `${hdtd}${GNN_SEPARATOR}${String(maxIndex + 1).padStart(2, '0')}`;
}

/**
 * Số hiệu KUNN so theo dạng chuẩn hoá: 'HD01/GNN-01' và 'hd01/gnn-01 ' là cùng
 * một số chứng từ, khác nhau chỉ vì cách gõ. Unique index dưới database cũng
 * đặt trên lower(btrim(...)) để hai lớp kiểm tra nói cùng một chuyện.
 */
export function normalizeKunnNumber(kunnNumber?: string | null): string {
  return (kunnNumber || '').trim().toLowerCase();
}

/**
 * Số hiệu này đã có KUNN khác dùng chưa.
 *
 * nextKunnNumber được gọi lúc MỞ FORM, nên số sinh ra đã cũ vào lúc bấm lưu:
 * tạo hai KUNN liên tiếp trong cùng phiên, hoặc hai người cùng nhập một HĐTD,
 * đều ra cùng một số. Dữ liệu thật có 8 dòng trùng số vì thiếu bước này.
 *
 * Trả về Id của dòng đang giữ số đó, hoặc null nếu số còn trống.
 */
export function findKunnNumberClash(
  candidate: string,
  existing: Array<Pick<LoanContract, 'Id' | 'ContractNumber'>>,
  selfId?: number | null
): number | null {
  const want = normalizeKunnNumber(candidate);
  if (!want) return null;

  for (const row of existing) {
    if (selfId !== null && selfId !== undefined && row.Id === selfId) continue;
    if (normalizeKunnNumber(row.ContractNumber) === want) return row.Id;
  }
  return null;
}

export function kunnSequenceOf(kunnNumber?: string | null): number {
  if (!kunnNumber) return 0;
  const idx = kunnNumber.lastIndexOf(GNN_SEPARATOR);
  if (idx < 0) return 0;
  const n = parseInt(kunnNumber.slice(idx + GNN_SEPARATOR.length), 10);
  return isNaN(n) ? 0 : n;
}

export type KunnIssueLevel = 'block' | 'warn';

export interface KunnIssue {
  level: KunnIssueLevel;
  field: 'KunnDueDate' | 'DisbursementDate' | 'LoanAmount';
  message: string;
}

function toIso(d?: string | null): string {
  return (d || '').trim();
}

function fmt(d: string): string {
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}

/**
 * Đối chiếu một KUNN với HĐTD cha.
 *
 * KUNN đáo hạn sau ngày hết hiệu lực HĐTD KHÔNG phải lỗi — xem
 * kunnRevolvingStatus. Điều bị ràng buộc là NGÀY GIẢI NGÂN phải nằm trong thời
 * gian hiệu lực của hợp đồng.
 *
 * Trả về cảnh báo chứ không chặn cứng: nghiệp vụ ngân hàng luôn có ngoại lệ
 * được phê duyệt, và còn phải nhập được KUNN lịch sử của hợp đồng đã hết hiệu lực.
 */
export function checkKunnAgainstContract(
  kunn: Pick<LoanContract, 'DisbursementDate' | 'KunnDueDate' | 'LoanAmount'>,
  contract?: Pick<CreditContract, 'HdtdNumber' | 'ContractStartDate' | 'ContractEndDate' | 'IsClosed'> | null
): KunnIssue[] {
  if (!contract) return [];

  const issues: KunnIssue[] = [];
  const start = toIso(contract.ContractStartDate);
  const end = toIso(contract.ContractEndDate);
  const disb = toIso(kunn.DisbursementDate);

  if (start && disb && disb < start) {
    issues.push({
      level: 'warn',
      field: 'DisbursementDate',
      message: `Giải ngân ${fmt(disb)} TRƯỚC ngày HĐTD có hiệu lực ${fmt(start)}`,
    });
  }

  if (end && disb && disb > end) {
    issues.push({
      level: 'warn',
      field: 'DisbursementDate',
      message: `Giải ngân ${fmt(disb)} SAU ngày hết hiệu lực HĐTD ${fmt(end)}`,
    });
  }

  if (contract.IsClosed) {
    issues.push({
      level: 'warn',
      field: 'DisbursementDate',
      message: `HĐTD ${contract.HdtdNumber} đã đóng`,
    });
  }

  return issues;
}

export type KunnRevolvingState = 'redeployable' | 'locked' | 'unknown';

export interface KunnRevolvingStatus {
  state: KunnRevolvingState;
  daysOfHeadroom: number;
  message: string;
}

/**
 * KUNN này còn cho phép giải ngân lại hay không.
 *
 *  - Đáo hạn TRƯỚC ngày hết hiệu lực HĐTD: trả xong vẫn còn thời gian rút lại,
 *    hạn mức còn quay vòng được thêm ít nhất một lượt.
 *  - Đáo hạn SAU ngày hết hiệu lực HĐTD: khi khoản này được trả thì hạn mức đã
 *    hết hiệu lực, không rút lại được nữa. Khách buộc phải tất toán; không tất
 *    toán được là nguy cơ chuyển nhóm nợ vì không còn đường quay vòng.
 */
export function kunnRevolvingStatus(
  kunn: Pick<LoanContract, 'KunnDueDate'>,
  contract?: Pick<CreditContract, 'ContractEndDate'> | null
): KunnRevolvingStatus {
  const end = toIso(contract?.ContractEndDate);
  const due = toIso(kunn.KunnDueDate);

  if (!end || !due) {
    return { state: 'unknown', daysOfHeadroom: 0, message: '' };
  }

  const days = Math.round(
    (Date.parse(end + 'T00:00:00Z') - Date.parse(due + 'T00:00:00Z')) / 86400000
  );

  if (days >= 0) {
    return {
      state: 'redeployable',
      daysOfHeadroom: days,
      message: `KUNN đáo hạn ${fmt(due)}, HĐTD còn hiệu lực tới ${fmt(end)} — sau khi tất toán còn ${days} ngày để giải ngân lại`,
    };
  }

  return {
    state: 'locked',
    daysOfHeadroom: days,
    message: `KUNN đáo hạn ${fmt(due)}, SAU ngày hết hiệu lực HĐTD ${fmt(end)} — không giải ngân lại được. Khoản này phải tất toán, không tất toán đúng hạn là nguy cơ chuyển nhóm nợ`,
  };
}

/**
 * KUNN gắn liền với HĐTD: đóng HĐTD là toàn bộ KUNN của nó đã hoàn thành nghĩa
 * vụ, khỏi phải đánh dấu tất toán từng cái.
 *
 * Suy ra khi đọc, KHÔNG ghi cờ `IsSettled` xuống từng KUNN: nhân bản cờ ra nhiều
 * chỗ thì mở lại hợp đồng phải đi gỡ từng dòng, và chỉ cần bỏ sót một dòng là hai
 * nơi nói hai chuyện khác nhau.
 */
export function isKunnSettled(
  kunn: Pick<LoanContract, 'IsSettled'>,
  contract?: Pick<CreditContract, 'IsClosed'> | null
): boolean {
  if (kunn.IsSettled === true) return true;
  return contract?.IsClosed === true;
}

export interface CreditContractSummary {
  contract: CreditContract;
  kunnCount: number;
  activeKunnCount: number;
  settledKunnCount: number;
  outstanding: number;
  /** Tổng đã nhận nợ, tính cả KUNN đã tất toán. */
  disbursedCumulative: number;
  revolving: boolean;
  /** Hạn mức còn trống theo sản phẩm, CHƯA xét hiệu lực. */
  headroom: number;
  /** Số tiền thực sự còn giải ngân được. */
  available: number;
  canDisburse: boolean;
  blockReason: string;
  expired: boolean;
  isEmpty: boolean;
  /**
   * Dư nợ còn treo theo lịch trả nợ của các KUNN dù HĐTD đã đóng. Bình thường
   * bằng 0; khác 0 là dấu hiệu đóng hợp đồng khi khách chưa trả hết.
   */
  closedWithBalance: number;
}

/**
 * Gom KUNN về từng HĐTD. Trả về CẢ hợp đồng chưa có KUNN nào — hợp đồng đã ký
 * chưa giải ngân, và hạn mức còn hiệu lực nhưng đã tất toán hết KUNN, đều là
 * trạng thái bình thường phải nhìn thấy được.
 */
export function summarizeCreditContracts(
  contracts: CreditContract[],
  kunns: LoanContract[],
  options?: { getOutstanding?: (c: LoanContract) => number; today?: string | null }
): CreditContractSummary[] {
  const outstandingOf = options?.getOutstanding
    ?? ((c: LoanContract) => c.CurrentBalance ?? c.LoanAmount ?? 0);
  const today = options?.today ?? null;

  return contracts.map(cc => {
    const own = kunns.filter(k => k.CreditContractId === cc.Id);
    const active = own.filter(k => !isKunnSettled(k, cc));
    const end = toIso(cc.ContractEndDate);

    const outstanding = active.reduce((s, k) => s + Math.max(0, outstandingOf(k)), 0);
    const disbursedCumulative = own.reduce(
      (s, k) => s + Math.max(0, k.LoanAmount ?? k.CurrentBalance ?? 0), 0
    );

    const granted = cc.ContractAmount || 0;
    const revolving = isRevolvingCredit(cc.LoanMethod);
    const headroom = Math.max(0, granted - (revolving ? outstanding : disbursedCumulative));
    const expired = !!(today && end && end < today);
    const available = (expired || cc.IsClosed) ? 0 : headroom;

    let blockReason = '';
    if (cc.IsClosed) blockReason = 'HĐTD đã đóng';
    else if (expired) blockReason = `HĐTD hết hiệu lực ${fmt(end)}`;
    else if (headroom <= 0) {
      blockReason = revolving
        ? 'Đã dùng hết hạn mức'
        : 'Vay từng lần đã giải ngân, không giải ngân thêm';
    }

    return {
      contract: cc,
      kunnCount: own.length,
      activeKunnCount: active.length,
      settledKunnCount: own.length - active.length,
      outstanding,
      disbursedCumulative,
      revolving,
      headroom,
      available,
      canDisburse: available > 0,
      blockReason,
      expired,
      closedWithBalance: cc.IsClosed
        ? own.reduce((s, k) => s + Math.max(0, outstandingOf(k)), 0)
        : 0,
      isEmpty: active.length === 0,
    };
  });
}

export function resolveMasterHdtdNumber(
  kunn: LoanContract | null | undefined,
  creditContracts: CreditContract[]
): string {
  if (!kunn) return '';

  if (kunn.CreditContractId !== null && kunn.CreditContractId !== undefined) {
    const linked = creditContracts.find(cc => cc.Id === kunn.CreditContractId);
    const no = (linked?.HdtdNumber || '').trim();
    if (no) return no;
  }

  return getMasterHdtdNumber(kunn);
}
