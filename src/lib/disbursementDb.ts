import { supabase } from './supabase';

const DISBURSEMENT_STORAGE_KEY = 'customer_manager_disbursement_payees_db';

function safeLocalStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
  return null;
}

export interface PayeeBankAccount {
  id?: string;
  accountNumber: string;
  bankName: string;
  bankBranch?: string;
}

export interface DisbursementPayee {
  Id: string;
  FullName: string;
  NationalId: string;
  IdCardIssueDate?: string;
  IdCardIssuePlace?: string;
  AccountNumber?: string;
  BankName?: string;
  BankBranch?: string;
  BankAccounts?: PayeeBankAccount[];
  CreatedAt?: string;
  UpdatedAt?: string;
}

function getLocalPayees(): DisbursementPayee[] {
  const store = safeLocalStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(DISBURSEMENT_STORAGE_KEY);
    const parsed: DisbursementPayee[] = raw ? JSON.parse(raw) : [];
    return parsed.map((p) => {
      let bankAccounts: PayeeBankAccount[] = [];
      if (Array.isArray(p.BankAccounts) && p.BankAccounts.length > 0) {
        bankAccounts = p.BankAccounts;
      } else if (p.AccountNumber) {
        bankAccounts = [{
          accountNumber: p.AccountNumber,
          bankName: p.BankName || '',
          bankBranch: p.BankBranch || '',
        }];
      }
      return {
        ...p,
        AccountNumber: bankAccounts[0]?.accountNumber || p.AccountNumber || '',
        BankName: bankAccounts[0]?.bankName || p.BankName || '',
        BankBranch: bankAccounts[0]?.bankBranch || p.BankBranch || '',
        BankAccounts: bankAccounts,
      };
    });
  } catch {
    return [];
  }
}

function saveLocalPayees(list: DisbursementPayee[]): void {
  const store = safeLocalStorage();
  if (!store) return;
  try {
    store.setItem(DISBURSEMENT_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export async function fetchDisbursementPayeesDb(): Promise<DisbursementPayee[]> {
  try {
    const { data, error } = await supabase
      .from('DisbursementPayees')
      .select('*')
      .order('FullName', { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) {
      const payees: DisbursementPayee[] = data.map((d: any) => {
        let bankAccounts: PayeeBankAccount[] = [];
        if (Array.isArray(d.BankAccounts) && d.BankAccounts.length > 0) {
          bankAccounts = d.BankAccounts;
        } else if (d.AccountNumber) {
          bankAccounts = [{
            accountNumber: d.AccountNumber,
            bankName: d.BankName || '',
            bankBranch: d.BankBranch || '',
          }];
        }
        return {
          Id: d.Id,
          FullName: d.FullName || '',
          NationalId: d.NationalId || '',
          IdCardIssueDate: d.IdCardIssueDate || '',
          IdCardIssuePlace: d.IdCardIssuePlace || '',
          AccountNumber: bankAccounts[0]?.accountNumber || d.AccountNumber || '',
          BankName: bankAccounts[0]?.bankName || d.BankName || '',
          BankBranch: bankAccounts[0]?.bankBranch || d.BankBranch || '',
          BankAccounts: bankAccounts,
          CreatedAt: d.CreatedAt,
          UpdatedAt: d.UpdatedAt,
        };
      });
      payees.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      saveLocalPayees(payees);
      return payees;
    }
  } catch (err) {
    // Supabase fallback sang local storage
  }

  const locals = getLocalPayees();
  locals.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
  return locals;
}

export async function upsertDisbursementPayeeDb(payee: DisbursementPayee): Promise<DisbursementPayee> {
  const accounts: PayeeBankAccount[] = Array.isArray(payee.BankAccounts)
    ? payee.BankAccounts
    : payee.AccountNumber
    ? [{
        accountNumber: payee.AccountNumber,
        bankName: payee.BankName || '',
        bankBranch: payee.BankBranch || '',
      }]
    : [];

  const primary = accounts[0];
  const itemToSave: DisbursementPayee = {
    ...payee,
    Id: payee.Id || `payee_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    AccountNumber: primary?.accountNumber || payee.AccountNumber || '',
    BankName: primary?.bankName || payee.BankName || '',
    BankBranch: primary?.bankBranch || payee.BankBranch || '',
    BankAccounts: accounts,
    UpdatedAt: new Date().toISOString(),
    CreatedAt: payee.CreatedAt || new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from('DisbursementPayees')
      .upsert({
        Id: itemToSave.Id,
        FullName: itemToSave.FullName,
        NationalId: itemToSave.NationalId,
        IdCardIssueDate: itemToSave.IdCardIssueDate || null,
        IdCardIssuePlace: itemToSave.IdCardIssuePlace || null,
        AccountNumber: itemToSave.AccountNumber || '',
        BankName: itemToSave.BankName || '',
        BankBranch: itemToSave.BankBranch || null,
        BankAccounts: itemToSave.BankAccounts || [],
        CreatedAt: itemToSave.CreatedAt,
        UpdatedAt: itemToSave.UpdatedAt,
      });

    if (error) throw error;
  } catch (err) {
    // Supabase fallback
  }

  // Luôn lưu local
  const current = getLocalPayees();
  const existingIndex = current.findIndex(p => p.Id === itemToSave.Id);
  let updatedList: DisbursementPayee[];
  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = itemToSave;
  } else {
    updatedList = [itemToSave, ...current];
  }
  saveLocalPayees(updatedList);

  return itemToSave;
}

export async function deleteDisbursementPayeeDb(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('DisbursementPayees')
      .delete()
      .eq('Id', id);

    if (error) throw error;
  } catch (err) {
    // Supabase fallback
  }

  const current = getLocalPayees();
  const updatedList = current.filter(p => p.Id !== id);
  saveLocalPayees(updatedList);
}
