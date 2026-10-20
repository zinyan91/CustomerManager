import type { AppRole } from './permissions';
import type { TeamMember } from '../types/team';

export function teamPermissions(role: AppRole | null, userId: string, members: readonly TeamMember[]) {
  const admin = role === 'master_admin' || role === 'user_admin';
  const ownMembership = members.find(member => member.UserId === userId);
  return {
    manage: role === 'master_admin',
    viewMembers: admin || ownMembership?.TeamRole === 'leader',
    ownMembership,
  };
}
