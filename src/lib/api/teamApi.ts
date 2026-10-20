import { supabase } from '../supabase';
import type { Team, TeamAssignment, TeamMember } from '../../types/team';

const PAGE_SIZE = 500;

export async function fetchTeams(): Promise<Team[]> {
  const result: Team[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.from('Teams')
      .select('Id, Name, IsActive, CreatedAt').order('Id').range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    result.push(...data as Team[]);
    if (data.length < PAGE_SIZE) return result;
  }
}

export async function fetchOwnTeamMembership(userId: string, fullName: string): Promise<TeamMember[]> {
  const at = new Date().toISOString();
  const { data, error } = await supabase.from('TeamMemberships')
    .select('Id, TeamId, UserId, TeamRole, EffectiveFrom, EffectiveTo')
    .eq('UserId', userId).lte('EffectiveFrom', at)
    .or(`EffectiveTo.is.null,EffectiveTo.gt.${at}`);
  if (error) throw new Error(error.message);
  return data.map(({ Id, ...member }) => ({ ...member, MembershipId: Id, FullName: fullName })) as TeamMember[];
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const result: TeamMember[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.rpc('team_member_directory', { p_team: teamId })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    result.push(...data as TeamMember[]);
    if (data.length < PAGE_SIZE) return result;
  }
}

export async function createTeam(name: string): Promise<Team> {
  const { data, error } = await supabase.from('Teams').insert({ Name: name.trim() })
    .select('Id, Name, IsActive, CreatedAt').single();
  if (error) throw new Error(error.message);
  return data as Team;
}

export async function assignTeamMember(input: TeamAssignment): Promise<void> {
  const { error } = await supabase.rpc('assign_team_member', {
    p_team: input.teamId, p_user: input.userId, p_role: input.teamRole, p_reason: input.reason.trim(),
  });
  if (error) throw new Error(error.message);
}
