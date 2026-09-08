import { ClipboardList } from 'lucide-react';
import { buildPurchaseStatementDocHtml } from '../../../../lib/inventoryExport';
import type { StatementItem, StatementSellerInfo } from '../../../../lib/statement';
import type { DocTemplate, DossierCommon } from '../types';

export interface BangKeSpecific {
  paymentMethod: 'cash' | 'transfer';
}

export function bangKeToStatement(common: DossierCommon, specific?: BangKeSpecific): { items: StatementItem[]; info: StatementSellerInfo } {
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
    buyerAddress: common.partyA.address,
    statementDateStr: common.contractDate,
    paymentMethod: specific?.paymentMethod ?? 'transfer',
    bankAccNo: common.bank.accNo,
    bankName: common.bank.name,
    bankOwner: common.bank.owner,
    bankBranch: common.bank.branch,
  };
  return { items, info };
}

export const bangKeTemplate: DocTemplate<BangKeSpecific> = {
  id: 'bang_ke',
  label: 'Bảng Kê Bán Hàng',
  icon: ClipboardList,
  specificDefaults: { paymentMethod: 'transfer' },
  standalone: true,
  buildHtml: (common, specific) => {
    const { items, info } = bangKeToStatement(common, specific);
    return buildPurchaseStatementDocHtml(items, info);
  },
};
