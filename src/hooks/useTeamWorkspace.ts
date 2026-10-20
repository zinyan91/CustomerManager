import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { assignTeamMember, createTeam, fetchOwnTeamMembership, fetchTeamMembers, fetchTeams } from '../lib/api/teamApi';
import { listAdminUsers } from '../lib/api/userAdminApi';
import { teamPermissions } from '../lib/teamPermissions';
import type { AdminUser } from '../lib/userAdmin';
import type { Team, TeamAssignment, TeamMember } from '../types/team';

interface TeamData {
  identity: string;
  teams: Team[];
  members: TeamMember[];
  ownMemberships: TeamMember[];
  users: AdminUser[];
  teamId: string;
}

export function useTeamWorkspace(loadAdminUsers = false) {
  const { user, role, fullName, roleLoading } = useAuth();
  const userId = user?.id ?? '';
  const identity = `${userId}:${role ?? ''}`;
  const [data, setData] = useState<TeamData | null>(null);
  const [teamId, selectTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh(value => value + 1), []);

  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    if (!userId || roleLoading || !role) {
      setData(null);
      setLoading(roleLoading);
      return;
    }
    const load = async () => {
      const [teams, ownMemberships, users] = await Promise.all([
        fetchTeams(),
        fetchOwnTeamMembership(userId, fullName ?? 'Tôi'),
        role === 'master_admin' && loadAdminUsers ? listAdminUsers() : Promise.resolve([]),
      ]);
      const chosenId = teams.find(team => team.Id === teamId)?.Id
        ?? teams.find(team => team.Id === ownMemberships[0]?.TeamId)?.Id
        ?? teams.find(team => team.IsActive)?.Id ?? teams[0]?.Id ?? '';
      const own = ownMemberships.filter(member => member.TeamId === chosenId);
      const permissions = teamPermissions(role, userId, own);
      const members = chosenId && permissions.viewMembers ? await fetchTeamMembers(chosenId) : own;
      if (cancelled) return;
      setData({ identity, teams, members, ownMemberships, users, teamId: chosenId });
      setLoading(false);
    };
    void load().catch(reason => {
      if (cancelled) return;
      setData(null);
      setError(reason instanceof Error ? reason.message : String(reason));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId, role, roleLoading, fullName, identity, teamId, refresh, loadAdminUsers]);

  const current = data?.identity === identity ? data : null;
  const addTeam = useCallback(async (name: string) => {
    const team = await createTeam(name);
    selectTeam(team.Id);
    reload();
  }, [reload]);
  const assign = useCallback(async (input: TeamAssignment) => {
    await assignTeamMember(input);
    reload();
  }, [reload]);
  return {
    teams: current?.teams ?? [], members: current?.members ?? [], users: current?.users ?? [],
    teamId: current?.teamId ?? '', loading, error, reload, selectTeam, addTeam, assign,
    permissions: teamPermissions(role, user?.id ?? '', current?.members ?? []),
  };
}
