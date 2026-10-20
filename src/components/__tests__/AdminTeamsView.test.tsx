// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { can, type AppRole, type Capability } from '../../lib/permissions';

const h = vi.hoisted(() => ({
  role: 'master_admin' as AppRole,
  workspace: vi.fn(), create: vi.fn(), assign: vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ can: (capability: Capability) => can(h.role, capability) }),
}));
vi.mock('../../hooks/useTeamWorkspace', () => ({ useTeamWorkspace: h.workspace }));
import { AdminTeamsView } from '../views/AdminTeamsView';

beforeEach(() => {
  vi.clearAllMocks();
  h.role = 'master_admin';
  h.create.mockResolvedValue(undefined);
  h.workspace.mockReturnValue({
    teams: [], members: [], users: [], teamId:'', loading:false, error:null,
    reload:vi.fn(), selectTeam:vi.fn(), addTeam:h.create, assign:h.assign,
  });
});
afterEach(cleanup);

describe('Master Admin team management', () => {
  it.each(['user_admin', 'user'] as AppRole[])('does not load administrative data for %s', role => {
    h.role = role;
    render(<AdminTeamsView />);
    expect(screen.getByRole('alert').textContent).toContain('Chỉ Master Admin');
    expect(h.workspace).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name:'Tạo team' })).toBeNull();
  });
  it('lets Master Admin create a team through the administration screen', async () => {
    render(<AdminTeamsView />);
    fireEvent.change(screen.getByLabelText('Tên team'), { target:{ value:'Team mới' } });
    fireEvent.click(screen.getByRole('button', { name:'Tạo team' }));
    await waitFor(() => expect(h.create).toHaveBeenCalledWith('Team mới'));
    expect(h.workspace).toHaveBeenCalledWith(true);
  });
});
