export type TeamRole = 'leader' | 'member';

export interface Team {
  Id: string;
  Name: string;
  IsActive: boolean;
  CreatedAt: string;
}

export interface TeamMember {
  MembershipId: string;
  TeamId: string;
  UserId: string;
  TeamRole: TeamRole;
  FullName: string;
  EffectiveFrom: string;
  EffectiveTo: string | null;
}

export interface TeamAssignment {
  teamId: string;
  userId: string;
  teamRole: TeamRole;
  reason: string;
}
