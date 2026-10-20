import { useAuth } from '../../context/AuthContext';
import { useTeamWorkspace } from '../../hooks/useTeamWorkspace';
import { KpiTargetsWorkspace } from '../team/KpiTargetsWorkspace';
import { Select } from '../ui/Field';
import { ErrorState, EmptyState, LoadingState } from '../ui/FeedbackStates';
import { AdminPageHeader } from '../admin/AdminPageHeader';

function AdminKpiDataContent() {
  const workspace = useTeamWorkspace();
  return <div className="space-y-4 text-ink">
    <AdminPageHeader title="Dữ liệu KPI">
      {workspace.teams.length>0 && <div className="w-full sm:w-64">
        <label className="sr-only" htmlFor="admin-kpi-team">Team</label>
        <Select id="admin-kpi-team" value={workspace.teamId} onChange={event => workspace.selectTeam(event.target.value)}>
          {workspace.teams.map(team => <option key={team.Id} value={team.Id}>{team.Name}</option>)}
        </Select>
      </div>}
    </AdminPageHeader>
    {workspace.error ? <div role="alert"><ErrorState message={workspace.error} onRetry={workspace.reload} /></div>
      : workspace.loading ? <LoadingState />
        : workspace.teamId ? <KpiTargetsWorkspace key={workspace.teamId} teamId={workspace.teamId} members={workspace.members} manage viewTeam />
          : <EmptyState title="Chưa có team." />}
  </div>;
}

export function AdminKpiDataView() {
  const { can } = useAuth();
  return can('team.manage') ? <AdminKpiDataContent />
    : <p role="alert" className="p-6 text-sm">Chỉ Master Admin được quản lý dữ liệu KPI.</p>;
}
