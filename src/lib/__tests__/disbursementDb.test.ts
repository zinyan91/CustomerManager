import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchDisbursementPayeesDb,
  upsertDisbursementPayeeDb,
  deleteDisbursementPayeeDb,
  type DisbursementPayee,
} from '../disbursementDb';

vi.mock('../supabase', () => {
  const dbError = { message: 'CSDL khong kha dung trong moi truong test' };
  const failResult = { data: null, error: dbError };
  const chain: any = {
    select: () => chain,
    order: () => Promise.resolve(failResult),
    delete: () => chain,
    eq: () => Promise.resolve(failResult),
    upsert: () => Promise.resolve(failResult),
    then: (onFulfilled: any, onRejected?: any) =>
      Promise.resolve(failResult).then(onFulfilled, onRejected),
  };
  return {
    supabase: {
      from: () => chain,
    },
  };
});

describe('disbursementDb store and offline fallback', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k in store) delete store[k];
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
      length: 0,
      key: () => null,
    };
  });

  it('saves and retrieves payees through fallback storage when DB is offline', async () => {
    const newPayee: DisbursementPayee = {
      Id: '',
      FullName: 'NGUYỄN VĂN AN',
      NationalId: '079090123456',
      IdCardIssueDate: '2023-05-15',
      IdCardIssuePlace: 'CCS QLHC về TTXH',
      AccountNumber: '19033481284',
      BankName: 'Techcombank',
      BankBranch: 'Chi nhánh Sài Gòn',
    };

    const saved = await upsertDisbursementPayeeDb(newPayee);
    expect(saved.Id).toBeTruthy();
    expect(saved.FullName).toBe('NGUYỄN VĂN AN');

    const list = await fetchDisbursementPayeesDb();
    expect(list.length).toBe(1);
    expect(list[0].FullName).toBe('NGUYỄN VĂN AN');
    expect(list[0].AccountNumber).toBe('19033481284');
    expect(list[0].BankName).toBe('Techcombank');
  });

  it('updates existing payee', async () => {
    const initial: DisbursementPayee = {
      Id: 'payee_1',
      FullName: 'TRẦN THỊ MAI',
      NationalId: '080123456789',
      AccountNumber: '0123456789',
      BankName: 'Vietcombank',
    };

    await upsertDisbursementPayeeDb(initial);

    const updated = await upsertDisbursementPayeeDb({
      ...initial,
      BankBranch: 'Chi nhánh Bến Thành',
    });

    expect(updated.BankBranch).toBe('Chi nhánh Bến Thành');

    const list = await fetchDisbursementPayeesDb();
    expect(list.length).toBe(1);
    expect(list[0].BankBranch).toBe('Chi nhánh Bến Thành');
  });

  it('deletes payee by id', async () => {
    const p1: DisbursementPayee = {
      Id: 'payee_del_1',
      FullName: 'LÊ VĂN TÁM',
      NationalId: '079111222333',
      AccountNumber: '99887766',
      BankName: 'ACB',
    };

    await upsertDisbursementPayeeDb(p1);
    let list = await fetchDisbursementPayeesDb();
    expect(list.length).toBe(1);

    await deleteDisbursementPayeeDb('payee_del_1');
    list = await fetchDisbursementPayeesDb();
    expect(list.length).toBe(0);
  });

  it('returns payees sorted alphabetically A-Z by FullName in Vietnamese', async () => {
    await upsertDisbursementPayeeDb({ Id: '1', FullName: 'VŨ THỊ YẾN', NationalId: '1', AccountNumber: '1', BankName: 'A' });
    await upsertDisbursementPayeeDb({ Id: '2', FullName: 'AN VĂN HÙNG', NationalId: '2', AccountNumber: '2', BankName: 'B' });
    await upsertDisbursementPayeeDb({ Id: '3', FullName: 'ĐẶNG VĂN LÂM', NationalId: '3', AccountNumber: '3', BankName: 'C' });

    const list = await fetchDisbursementPayeesDb();
    expect(list.map(p => p.FullName)).toEqual(['AN VĂN HÙNG', 'ĐẶNG VĂN LÂM', 'VŨ THỊ YẾN']);
  });

  it('handles multiple bank accounts and backward compatibility with single AccountNumber', async () => {
    const multiAccountPayee: DisbursementPayee = {
      Id: 'payee_multi',
      FullName: 'LÊ VĂN LONG',
      NationalId: '079999888777',
      BankAccounts: [
        { accountNumber: '111111', bankName: 'Vietcombank', bankBranch: 'CN 1' },
        { accountNumber: '222222', bankName: 'BIDV', bankBranch: 'CN 2' },
      ],
    };

    const saved = await upsertDisbursementPayeeDb(multiAccountPayee);
    expect(saved.AccountNumber).toBe('111111');
    expect(saved.BankName).toBe('Vietcombank');
    expect(saved.BankAccounts?.length).toBe(2);

    const list = await fetchDisbursementPayeesDb();
    const found = list.find((p) => p.Id === 'payee_multi');
    expect(found).toBeDefined();
    expect(found?.BankAccounts?.length).toBe(2);
    expect(found?.BankAccounts?.[1].accountNumber).toBe('222222');
  });
});
