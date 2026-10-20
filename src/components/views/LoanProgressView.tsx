import { useState } from 'react';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLoanProgress } from '../../hooks/useLoanProgress';
import { useTeamWorkspace } from '../../hooks/useTeamWorkspace';
import { todayIso } from '../../lib/utils';
import { PROGRESS_STAGES, type LoanProgressEntry } from '../../types/loanProgress';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { ErrorState, LoadingState } from '../ui/FeedbackStates';
import { ProgressTable } from '../loanProgress/ProgressTable';
import { ProgressEditor } from '../loanProgress/ProgressEditor';

export function LoanProgressView() {
  const {user,isAdmin} = useAuth();
  const workspace = useTeamWorkspace();
  const canEnter = !!isAdmin || workspace.permissions.ownMembership?.TeamRole==='leader';
  const entryTeams = workspace.teams.filter(team=>team.IsActive && (isAdmin || team.Id===workspace.permissions.ownMembership?.TeamId));
  const [month,setMonth] = useState(todayIso().slice(0,7));
  const [stage,setStage] = useState('');
  const [search,setSearch] = useState('');
  const [editor,setEditor] = useState<LoanProgressEntry|'new'|null>(null);
  const report = useLoanProgress(month,[],false,workspace.teamId || undefined);
  const own = useLoanProgress(month,canEnter && user ? [user.id] : []);
  const allRows = [...report.rows,...own.rows.filter(row=>!row.TeamId && !report.rows.some(item=>item.Id===row.Id))];
  const rows = allRows.filter(row=>(!stage || row.Stage===stage) && row.CustomerName.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const reload = ()=>{report.reload();own.reload();workspace.reload();};
  return <div className="space-y-4 pb-8">
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-line/60">
      <h1 className="text-base sm:text-lg font-bold tracking-tight text-ink flex items-center gap-2.5">
        <span className="p-2 rounded-[var(--r-control)] bg-accent-soft text-accent"><ClipboardList className="w-4 h-4" /></span>Báo cáo tiến độ
      </h1>
      <div className="flex gap-2"><Button variant="secondary" disabled={report.loading} onClick={reload} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>Làm mới</Button>
        {canEnter && <Button onClick={()=>setEditor('new')} disabled={!user || !entryTeams.length} leftIcon={<Plus className="w-4 h-4" />}>Thêm hồ sơ</Button>}</div>
    </div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-[220px_160px_1fr_240px] gap-3 px-3">
      <Select aria-label="Team báo cáo" value={workspace.teamId} onChange={e=>workspace.selectTeam(e.target.value)} disabled={workspace.loading}>
        {!workspace.teams.length && <option value="">Chưa có team</option>}
        {workspace.teams.map(team=><option key={team.Id} value={team.Id}>{team.Name}</option>)}
      </Select>
      <Input aria-label="Tháng báo cáo" type="month" value={month} onChange={e=>{if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) setMonth(e.target.value);}} />
      <Input aria-label="Tìm khách hàng" placeholder="Tìm khách hàng" value={search} onChange={e=>setSearch(e.target.value)} />
      <Select aria-label="Tiến độ hồ sơ" value={stage} onChange={e=>setStage(e.target.value)}>
        <option value="">Tất cả tiến độ</option>{PROGRESS_STAGES.map(value=><option key={value}>{value}</option>)}
      </Select>
    </div>
    {workspace.error || report.error || own.error ? <ErrorState message={workspace.error ?? report.error ?? own.error ?? ''} onRetry={reload} /> : workspace.loading || report.loading || own.loading ? <LoadingState text="Đang tải báo cáo tiến độ…" />
      : <ProgressTable rows={rows} onEdit={canEnter ? setEditor : undefined} />}
    {editor && user && canEnter && <ProgressEditor key={editor==='new' ? month : editor.Id} ownerId={user.id} month={month}
      teams={entryTeams} teamId={workspace.teamId} existing={editor==='new' ? undefined : editor} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);report.reload();own.reload();}} />}
  </div>;
}
