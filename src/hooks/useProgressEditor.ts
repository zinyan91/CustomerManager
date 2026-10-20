import { useEffect, useState } from 'react';
import { fetchProgressCustomers, saveProgress } from '../lib/api/loanProgressApi';
import { formatProgressInput, parseProgressNumber } from '../lib/loanProgress';
import type { LoanProgressEntry, LoanProgressInput, ProgressCustomer } from '../types/loanProgress';

export function useProgressEditor(ownerId:string,month:string,existing:LoanProgressEntry|undefined,onSaved:()=>void,teamId?:string) {
  const [input,setInput] = useState<LoanProgressInput>(() => existing ?? {
    TeamId:teamId ?? '',AssigneeId:null,Month:month,CustomerKind:'new',CustomerId:null,CustomerName:'',Amount:null,Cards:null,Fees:null,Insurance:null,
    CaseType:'Mới',LoanTerm:'Ngắn hạn',Stage:'Mới nhận hồ sơ',
  });
  const [customers,setCustomers] = useState<ProgressCustomer[]>([]);
  const [customerError,setCustomerError] = useState<string|null>(null);
  const [loadingCustomers,setLoadingCustomers] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [saving,setSaving] = useState(false);
  const [numberValues,setNumberValues] = useState(() => ({
    Amount:formatProgressInput(existing?.Amount?.toString() ?? ''),Cards:formatProgressInput(existing?.Cards?.toString() ?? ''),
    Fees:formatProgressInput(existing?.Fees?.toString() ?? ''),Insurance:formatProgressInput(existing?.Insurance?.toString() ?? ''),
  }));
  useEffect(() => {
    let cancelled=false;
    void fetchProgressCustomers(ownerId).then(rows => { if (!cancelled) setCustomers(rows); })
      .catch(cause => { if (!cancelled) setCustomerError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (!cancelled) setLoadingCustomers(false); });
    return () => { cancelled=true; };
  },[ownerId]);
  function change<K extends keyof LoanProgressInput>(key:K,value:LoanProgressInput[K]) {
    setInput(previous=>({...previous,[key]:value,...(key==='TeamId' && previous.TeamId!==value ? {AssigneeId:null} : {})}));
  }
  function changeCustomerKind(value:'new'|'existing') {
    setInput(previous=>({...previous,CustomerKind:value,CustomerId:null,CustomerName:''}));
  }
  function changeNumber(key:'Amount'|'Cards'|'Fees'|'Insurance',value:string) {
    setNumberValues(previous=>({...previous,[key]:formatProgressInput(value)}));
  }
  async function save() {
    if (saving) return;
    setSaving(true);setError(null);
    try {
      const values = {
        Amount:parseProgressNumber(numberValues.Amount),Cards:parseProgressNumber(numberValues.Cards),
        Fees:parseProgressNumber(numberValues.Fees),Insurance:parseProgressNumber(numberValues.Insurance),
      };
      await saveProgress({...input,...values},existing);onSaved();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSaving(false); }
  }
  return {input,numberValues,customers,customerError,loadingCustomers,error,saving,change,changeCustomerKind,changeNumber,save};
}
