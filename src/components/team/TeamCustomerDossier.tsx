import type { fetchTeamCustomerDossier } from '../../lib/api/teamCustomerApi';

export function TeamCustomerDossier({ dossier }: { dossier: Awaited<ReturnType<typeof fetchTeamCustomerDossier>> }) {
  const { customer, loans, collaterals, cards } = dossier;
  const facts = [
    ['CIF', customer.CifKh], ['Số giấy tờ', customer.NationalId], ['Điện thoại', customer.Phone],
    ['Email', customer.Email], ['Địa chỉ', customer.Address], ['Tài khoản', customer.AccountNumber],
  ];
  return <div className="border-t border-line pt-4 space-y-5">
    <h3 className="font-semibold">{customer.FullName}</h3>
    <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2 text-sm">{facts.map(([label, value]) => <div key={label}>
      <dt className="text-ink-muted">{label}</dt><dd className="mt-1">{value || '—'}</dd>
    </div>)}</dl>
    <div className="space-y-2 text-sm">
      <h4 className="font-semibold">Khoản vay ({loans.length})</h4>
      {loans.map(loan => <div key={loan.Id} className="flex flex-wrap justify-between gap-2 border-b border-line py-2">
        <span>{loan.ContractNumber}</span><span>{loan.IsSettled ? 'Đã tất toán' : 'Chưa tất toán'}</span>
      </div>)}
      <h4 className="font-semibold pt-3">Tài sản bảo đảm ({collaterals.length})</h4>
      {collaterals.map(collateral => <p key={collateral.Id} className="border-b border-line py-2">{collateral.AssetCode ?? collateral.AssetType ?? `#${collateral.Id}`} · {collateral.Address ?? '—'}</p>)}
      <h4 className="font-semibold pt-3">Hợp đồng thẻ ({cards.length})</h4>
      {cards.map(card => <p key={card.Id} className="border-b border-line py-2">{card.CardContractNumber}</p>)}
    </div>
  </div>;
}
