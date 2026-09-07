import { ClipboardList } from 'lucide-react';
import { buildPurchaseStatementDocHtml } from '../../../../lib/inventoryExport';
import type { StatementItem, StatementSellerInfo } from '../../../../lib/statement';
import type { DocTemplate, DossierCommon } from '../types';

export type BangKeSpecific = Record<string, never>;

export function bangKeToStatement(common: DossierCommon): { items: StatementItem[]; info: StatementSellerInfo } {
  const items: StatementItem[] = common.items.map(it => ({
    id: it.id,
    dateStr: common.contractDate,
    itemName: it.name,
    unit: it.unit,
    qty: it.quantity,
    unitPrice: it.price,
    note: it.note ?? '',
  }));
  const info: StatementSellerInfo = {
    sellerName: common.partyB.name,
    sellerAddress: common.partyB.address,
    sellerBankAcc: '',
    sellerIdCard: common.partyB.cccd,
    buyerName: common.partyA.name,
    buyerIdCard: common.partyA.cccd,
    statementDateStr: common.contractDate,
    paymentMethod: 'transfer',
    bankAccNo: common.bank.accNo,
    bankName: common.bank.name,
    bankOwner: common.bank.owner,
    bankBranch: common.bank.branch,
  };
  return { items, info };
}

export const bangKeTemplate: DocTemplate<BangKeSpecific> = {
  id: 'bang_ke',
  label: 'Bảng Kê Mua Hàng',
  icon: ClipboardList,
  specificDefaults: {},
  standalone: true,
  buildHtml: (common) => {
    const { items, info } = bangKeToStatement(common);
    return buildPurchaseStatementDocHtml(items, info);
  },
};
