import type { TeamMember } from '../../types/team';

export function TeamMembersTable({ members }: { members: TeamMember[] }) {
  return (
    <section className="border border-line bg-panel overflow-hidden">
      <h2 className="border-b border-line px-3 py-3 font-semibold">Nhân sự team</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-panel-muted text-ink-muted"><tr>
            <th className="px-3 py-3 font-medium">Thành viên</th>
            <th className="px-3 py-3 font-medium">Vai trò</th>
            <th className="px-3 py-3 font-medium">Ngày bắt đầu</th>
          </tr></thead>
          <tbody className="divide-y divide-line">
            {members.map(member => <tr key={member.MembershipId}>
              <td className="px-3 py-3 font-medium">{member.FullName}</td>
              <td className="px-3 py-3">{member.TeamRole === 'leader' ? 'Leader' : 'Thành viên'}</td>
              <td className="px-3 py-3">{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(member.EffectiveFrom))}</td>
            </tr>)}
            {!members.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-ink-muted">Chưa có thành viên.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
