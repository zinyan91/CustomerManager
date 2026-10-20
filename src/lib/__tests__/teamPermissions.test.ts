import { describe, expect, it } from 'vitest';
import { teamPermissions } from '../teamPermissions';
import type { TeamMember } from '../../types/team';

const member: TeamMember = {
  MembershipId: 'membership', TeamId: 'team', UserId: 'me', TeamRole: 'member',
  FullName: 'Thành viên', EffectiveFrom: '2026-10-01T00:00:00Z', EffectiveTo: null,
};

describe('team presentation permissions', () => {
  it('does not grant team administration when a user becomes Leader', () => {
    expect(teamPermissions('user', 'me', [{ ...member, TeamRole: 'leader' }]))
      .toMatchObject({ manage: false, viewMembers: true });
  });
  it('does not infer own role from another member', () => {
    expect(teamPermissions('user', 'other', [{ ...member, TeamRole: 'leader' }]))
      .toMatchObject({ manage: false, viewMembers: false, ownMembership: undefined });
  });
  it('only lets Master Admin manage structure and keeps existing User Admin visibility', () => {
    expect(teamPermissions('user_admin', 'admin', [])).toMatchObject({ manage: false, viewMembers: true });
    expect(teamPermissions('master_admin', 'admin', [])).toMatchObject({ manage: true, viewMembers: true });
    expect(teamPermissions('user', 'me', [member])).toMatchObject({ manage: false, viewMembers: false });
  });
});
