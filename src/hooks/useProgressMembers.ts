import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchTeamMembers } from '../lib/api/teamApi';
import type { TeamMember } from '../types/team';

export function useProgressMembers(teamId:string) {
  const {user,role} = useAuth();
  const key = `${user?.id}:${role}:${teamId}`;
  const [state,setState] = useState<{key:string;members:TeamMember[];error:string|null}|null>(null);
  useEffect(()=>{
    if (!teamId) return;
    let cancelled=false;
    void fetchTeamMembers(teamId).then(members=>{
      if (!cancelled) setState({key,members,error:null});
    }).catch(cause=>{
      if (!cancelled) setState({key,members:[],error:cause instanceof Error ? cause.message : String(cause)});
    });
    return ()=>{cancelled=true;};
  },[key,teamId]);
  const current = state?.key===key ? state : null;
  return {members:current?.members ?? [],error:current?.error ?? null,loading:!!teamId && !current};
}
