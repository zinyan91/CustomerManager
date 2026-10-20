// @vitest-environment jsdom
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole } from '../../lib/permissions';
import type { TeamMember } from '../../types/team';

const h = vi.hoisted(() => ({
  auth: { user: { id: 'me' }, role: 'user' as AppRole, fullName: 'Tôi', roleLoading: false },
  fetchTeams: vi.fn(), fetchOwn: vi.fn(), fetchMembers: vi.fn(),
  listUsers: vi.fn(), create: vi.fn(), assign: vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => h.auth }));
vi.mock('../../lib/api/teamApi', () => ({
  fetchTeams: h.fetchTeams, fetchOwnTeamMembership: h.fetchOwn, fetchTeamMembers: h.fetchMembers,
  createTeam: h.create, assignTeamMember: h.assign,
}));
vi.mock('../../lib/api/userAdminApi', () => ({ listAdminUsers: h.listUsers }));
import { useTeamWorkspace } from '../useTeamWorkspace';

const member: TeamMember = {
  MembershipId: 'membership', TeamId: 'team', UserId: 'me', FullName: 'Tôi',
  TeamRole: 'member', EffectiveFrom: '2026-10-01T00:00:00Z', EffectiveTo: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  h.auth = { user: { id: 'me' }, role: 'user', fullName: 'Tôi', roleLoading: false };
  h.fetchTeams.mockResolvedValue([{ Id: 'team', Name: 'Team', IsActive: true }]);
  h.fetchOwn.mockResolvedValue([member]);
  h.fetchMembers.mockResolvedValue([{ ...member, TeamRole: 'leader' }]);
  h.listUsers.mockResolvedValue([]);
});
afterEach(cleanup);

describe('Team workspace data flow', () => {
  it('does not request restricted directory or admin accounts for a member', async () => {
    const { result } = renderHook(useTeamWorkspace);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([member]);
    expect(h.fetchMembers).not.toHaveBeenCalled();
    expect(h.listUsers).not.toHaveBeenCalled();
  });
  it('loads directory for Leader without granting structure administration', async () => {
    h.fetchOwn.mockResolvedValue([{ ...member, TeamRole: 'leader' }]);
    const { result } = renderHook(useTeamWorkspace);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(h.fetchMembers).toHaveBeenCalledWith('team');
    expect(result.current.permissions).toMatchObject({ manage: false, viewMembers: true });
  });
  it('surfaces the server error instead of treating failure as an empty team', async () => {
    h.fetchTeams.mockRejectedValue(new Error('permission denied for table Teams'));
    const { result } = renderHook(useTeamWorkspace);
    await waitFor(() => expect(result.current.error).toBe('permission denied for table Teams'));
    expect(result.current.loading).toBe(false);
  });
  it('discards an older response after changing account', async () => {
    let resolveOld!: (value: unknown[]) => void;
    h.fetchTeams.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const { result, rerender } = renderHook(useTeamWorkspace);
    h.auth = { ...h.auth, user: { id: 'next-user' } };
    h.fetchTeams.mockResolvedValue([]);
    h.fetchOwn.mockResolvedValue([]);
    rerender();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => resolveOld([{ Id: 'old-team', Name: 'Old', IsActive: true }]));
    expect(result.current.teams).toEqual([]);
    expect(result.current.members).toEqual([]);
  });
});
