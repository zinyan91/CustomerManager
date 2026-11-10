import type { Customer, PledgeBundle, SavingsBook } from '../types';
import { filterActiveCustomers } from './customerStatus';
import { openLoans } from './pledgePortfolio';
import { savingsMaturityDate, savingsPrincipalVnd } from './savingsBook';
import { PLEDGE_DEPOSIT_TYPE_LABELS, INTEREST_PAYMENT_METHOD_LABELS, TENOR_UNIT_LABELS } from './stkPledge';

/** Một dòng sheet Huy động: một sổ tiết kiệm đang mở của khách chưa lưu trữ. */
export interface DepositRowData {
  customer: Customer;
  book: SavingsBook;
  depositTypeLabel: string;
  amountVnd: number;
  tenorLabel: string;
  maturityDate: string | null;
  interestPaymentLabel: string;
  /** Số hợp đồng cầm cố đang dùng sổ này, rỗng nếu sổ không cầm cố. */
  pledgedContracts: string[];
}

function tenorLabel(b: SavingsBook): string {
  if (b.Tenor === null || b.Tenor === undefined || !b.TenorUnit) return '—';
  return `${b.Tenor} ${TENOR_UNIT_LABELS[b.TenorUnit].toLowerCase()}`;
}

/** Sổ id → số các hợp đồng cầm cố còn dư nợ đang giữ sổ (liên kết chưa giải chấp). */
function pledgedContractsByBook(bundle: PledgeBundle): Map<number, string[]> {
  const open = new Map(openLoans(bundle).map(l => [l.Id, l.ContractNumber]));
  const result = new Map<number, string[]>();
  for (const link of bundle.links) {
    if (link.ReleasedDate) continue;
    const contract = open.get(link.PledgeLoanId);
    if (!contract) continue;
    const list = result.get(link.SavingsBookId) ?? [];
    if (!list.includes(contract)) list.push(contract);
    result.set(link.SavingsBookId, list);
  }
  return result;
}

export function buildDepositPortfolioData(bundle: PledgeBundle, customers: Customer[]): DepositRowData[] {
  const byId = new Map(filterActiveCustomers(customers).map(c => [c.Id, c]));
  const pledged = pledgedContractsByBook(bundle);
  const rows: DepositRowData[] = [];
  for (const book of bundle.books) {
    if (book.IsClosed) continue;
    const customer = byId.get(book.CustomerId);
    if (!customer) continue;
    rows.push({
      customer,
      book,
      depositTypeLabel: PLEDGE_DEPOSIT_TYPE_LABELS[book.DepositType] ?? book.DepositType,
      amountVnd: savingsPrincipalVnd(book),
      tenorLabel: tenorLabel(book),
      maturityDate: savingsMaturityDate(book),
      interestPaymentLabel: INTEREST_PAYMENT_METHOD_LABELS[book.InterestPaymentMethod] ?? '—',
      pledgedContracts: pledged.get(book.Id) ?? [],
    });
  }
  rows.sort((a, b) => {
    const byName = a.customer.FullName.localeCompare(b.customer.FullName, 'vi');
    return byName !== 0 ? byName : a.book.BookNumber.localeCompare(b.book.BookNumber, 'vi');
  });
  return rows;
}
