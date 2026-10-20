import { useAuth } from '../../context/AuthContext';
import { useTeamWorkspace } from '../../hooks/useTeamWorkspace';
import { TeamManagementForms } from '../team/TeamManagementForms';
import { TeamMembersTable } from '../team/TeamMembersTable';

function AdminTeamsContent() {
  const workspace = useTeamWorkspace(true);
  return <div className="space-y-5 text-ink">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">Team</h1>
      <button className="rounded-md border border-line bg-panel px-3 py-2 text-sm cursor-pointer" onClick={workspace.reload} disabled={workspace.loading}>Tải lại</button>
    </div>
    {workspace.error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{workspace.error}</p>
      : workspace.loading ? <p role="status" className="py-12 text-center text-sm text-ink-muted">Đang tải team…</p>
        : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5 min-w-0">
            {workspace.teams.length > 0 ? <>
              <label className="block text-sm">Team
                <select className="block mt-1.5 w-full rounded-md border border-line bg-panel px-3 py-2" value={workspace.teamId}
                  onChange={event => workspace.selectTeam(event.target.value)}>
                  {workspace.teams.map(team => <option key={team.Id} value={team.Id}>{team.Name}{team.IsActive ? '' : ' · Ngừng hoạt động'}</option>)}
                </select>
              </label>
              <TeamMembersTable members={workspace.members} />
            </> : <p className="rounded-lg border border-line bg-panel p-10 text-center text-sm text-ink-muted">Chưa có team.</p>}
          </div>
          <TeamManagementForms teamId={workspace.teamId} users={workspace.users} onCreate={workspace.addTeam} onAssign={workspace.assign} />
        </div>}
  </div>;
}

export function AdminTeamsView() {
  const { can } = useAuth();
  return can('team.manage') ? <AdminTeamsContent />
    : <p role="alert" className="p-6 text-sm">Chỉ Master Admin được quản lý team.</p>;
}
