import { useTeamWorkspace } from '../../hooks/useTeamWorkspace';
import { TeamKpiDashboard } from '../team/TeamKpiDashboard';
import { EmptyState, ErrorState, LoadingState } from '../ui/FeedbackStates';
import { Select } from '../ui/Field';

export function TeamKpiView() {
  const workspace = useTeamWorkspace();
  const team = workspace.teams.find(item => item.Id === workspace.teamId);
  return (
    <div className="space-y-4 text-ink">
      {workspace.teams.length>1 && <div className="max-w-xs"><label className="sr-only" htmlFor="kpi-report-team">Team báo cáo</label>
        <Select id="kpi-report-team" value={workspace.teamId} onChange={event => workspace.selectTeam(event.target.value)} disabled={workspace.loading}>
          {workspace.teams.map(item => <option key={item.Id} value={item.Id}>{item.Name}</option>)}
        </Select>
      </div>}
      {workspace.error ? <div role="alert"><ErrorState message={workspace.error} onRetry={workspace.reload} /></div>
        : workspace.loading ? <div role="status"><LoadingState text="Đang tải báo cáo KPI…" /></div>
          : team ? <TeamKpiDashboard key={team.Id} teamId={team.Id} members={workspace.members} viewTeam={workspace.permissions.viewMembers} />
            : <EmptyState title={workspace.permissions.manage ? 'Chưa có team.' : 'Bạn chưa được gán vào team.'} />}
    </div>
  );
}
