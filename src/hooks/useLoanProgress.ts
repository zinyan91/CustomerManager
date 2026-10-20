import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchProgress } from '../lib/api/loanProgressApi';
import type { LoanProgressEntry } from '../types/loanProgress';

export function useLoanProgress(month: string, owners: string[], ytd=false, teamId?:string) {
  const {user,role} = useAuth();
  const ownerKey = [...new Set(owners)].sort().join(',');
  const [revision,setRevision] = useState(0);
  const key = `${user?.id}:${role}:${month}:${ownerKey}:${ytd}:${teamId}:${revision}`;
  const [state,setState] = useState<{key:string;rows:LoanProgressEntry[];error:string|null}|null>(null);
  const reload = useCallback(() => setRevision(value=>value+1),[]);
  useEffect(() => {
    let cancelled = false;
    void fetchProgress(month,ownerKey ? ownerKey.split(',') : [],ytd,teamId).then(rows => {
      if (!cancelled) setState({key,rows,error:null});
    }).catch(cause => {
      if (!cancelled) setState({key,rows:[],error:cause instanceof Error ? cause.message : String(cause)});
    });
    return () => { cancelled=true; };
  },[key,month,ownerKey,ytd,teamId]);
  useEffect(() => {
    window.addEventListener('focus',reload);
    return () => window.removeEventListener('focus',reload);
  },[reload]);
  const current = state?.key===key ? state : null;
  return {rows:current?.rows ?? [],error:current?.error ?? null,loading:current===null,reload};
}
