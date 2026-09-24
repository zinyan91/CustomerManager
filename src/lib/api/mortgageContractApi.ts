import { supabase } from '../supabase';
import type { MortgageContract } from '../../types';
import { linkDiff, type MortgageContractDraft } from '../mortgageContract';

const SELECT = '*, MortgageContractCollaterals(CollateralId), MortgageContractCreditContracts(CreditContractId)';

type MortgageRow = Omit<MortgageContract, 'CollateralIds' | 'CreditContractIds' | 'MaxSecuredAmount'> & {
  MaxSecuredAmount?: number | string | null;
  MortgageContractCollaterals?: { CollateralId: number | string }[] | null;
  MortgageContractCreditContracts?: { CreditContractId: number | string }[] | null;
};

export class MortgageLinkSaveError extends Error {
  mortgageId: number;
  constructor(message: string, mortgageId: number) {
    super(message);
    this.name = 'MortgageLinkSaveError';
    this.mortgageId = mortgageId;
  }
}

function fromRow(row: MortgageRow): MortgageContract {
  const { MortgageContractCollaterals, MortgageContractCreditContracts, MaxSecuredAmount, ...rest } = row;
  return {
    ...rest,
    MaxSecuredAmount: MaxSecuredAmount === null || MaxSecuredAmount === undefined ? null : Number(MaxSecuredAmount),
    CollateralIds: (MortgageContractCollaterals ?? []).map(l => Number(l.CollateralId)),
    CreditContractIds: (MortgageContractCreditContracts ?? []).map(l => Number(l.CreditContractId)),
  };
}

export async function fetchMortgageContractsAPI(customerId?: number): Promise<MortgageContract[]> {
  let query = supabase.from('MortgageContracts').select(SELECT).order('Id', { ascending: false });
  if (customerId !== undefined) query = query.eq('CustomerId', customerId);
  const { data, error } = await query;
  if (error) throw new Error(`Không nạp được danh sách HĐTC: ${error.message}`);
  return ((data ?? []) as MortgageRow[]).map(fromRow);
}

async function syncLinks(
  table: 'MortgageContractCollaterals' | 'MortgageContractCreditContracts',
  column: 'CollateralId' | 'CreditContractId',
  mortgageId: number,
  before: number[],
  after: number[]
): Promise<void> {
  const { add, remove } = linkDiff(before, after);
  if (remove.length > 0) {
    const { error } = await supabase.from(table).delete().eq('MortgageContractId', mortgageId).in(column, remove);
    if (error) throw new Error(error.message);
  }
  if (add.length > 0) {
    const { error } = await supabase.from(table).insert(add.map(id => ({ MortgageContractId: mortgageId, [column]: id })));
    if (error) throw new Error(error.message);
  }
}

export async function saveMortgageContractAPI(
  draft: MortgageContractDraft,
  before?: MortgageContract | null
): Promise<number> {
  const number = draft.MortgageNumber.trim();
  if (!draft.CustomerId) throw new Error('Khách hàng là bắt buộc!');
  if (!number) throw new Error('Số HĐTC là bắt buộc!');

  const { CollateralIds, CreditContractIds, Id, ...fields } = draft;
  const clean = {
    ...fields,
    MortgageNumber: number,
    ReleasedDate: fields.IsReleased ? fields.ReleasedDate ?? null : null,
  };

  const { data, error } = Id
    ? await supabase.from('MortgageContracts').update(clean).eq('Id', Id).select('Id').single()
    : await supabase.from('MortgageContracts').insert([clean]).select('Id').single();

  if (error) {
    if (error.code === '23505') throw new Error(`Số HĐTC "${number}" đã có ở khách hàng này!`);
    throw new Error(error.message);
  }

  const mortgageId = Number((data as { Id: number }).Id);
  try {
    await syncLinks('MortgageContractCollaterals', 'CollateralId', mortgageId, before?.CollateralIds ?? [], CollateralIds);
    await syncLinks('MortgageContractCreditContracts', 'CreditContractId', mortgageId, before?.CreditContractIds ?? [], CreditContractIds);
  } catch (err) {
    throw new MortgageLinkSaveError(
      `Đã lưu HĐTC "${number}" nhưng chưa lưu được danh sách tài sản/HĐTD: ${(err as Error).message}`,
      mortgageId
    );
  }
  return mortgageId;
}

export async function deleteMortgageContractAPI(id: number): Promise<void> {
  const { data, error } = await supabase.from('MortgageContracts').delete().eq('Id', id).select('Id');
  if (error) throw new Error(error.message);
  if (!data || (data as unknown[]).length === 0) {
    throw new Error('Không xoá được HĐTC: không có quyền hoặc hợp đồng đã bị xoá.');
  }
}
