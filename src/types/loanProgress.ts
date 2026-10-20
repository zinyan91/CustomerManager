export const CASE_TYPES = ['Mới', 'Tái cấp', 'Tái cấp tăng thêm', 'Tái cấp giảm', 'Ngắn hạn chuyển Trung dài hạn'] as const;
export const LOAN_TERMS = ['Ngắn hạn', 'Dài hạn'] as const;
export const PROGRESS_STAGES = ['Mới nhận hồ sơ', 'Thu thập hồ sơ', 'Đã gửi định giá', 'Đang lập tờ trình', 'Đã trình ký', 'Đã trình HO', 'Chờ phê duyệt', 'Đã có phê duyệt', 'Đang công chứng', 'Chờ giải ngân', 'Đã giải ngân'] as const;

export interface LoanProgressInput {
  TeamId?: string | null;
  AssigneeId?: string | null;
  Month: string;
  CustomerKind: 'new' | 'existing';
  CustomerId: number | null;
  CustomerName: string;
  Amount: number | null;
  Cards: number | null;
  Fees: number | null;
  Insurance: number | null;
  CaseType: typeof CASE_TYPES[number];
  LoanTerm: typeof LOAN_TERMS[number];
  Stage: typeof PROGRESS_STAGES[number];
}
export interface LoanProgressEntry extends LoanProgressInput {
  AssigneeName?: string | null;
  Id: string;
  OwnerId: string;
  Version: number;
  CreatedAt: string;
  UpdatedAt: string;
}
export interface ProgressCustomer { Id: number; FullName: string; CifKh: string }
