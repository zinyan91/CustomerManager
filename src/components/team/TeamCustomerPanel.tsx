import { useState } from 'react';
import { useTeamCustomers } from '../../hooks/useTeamCustomers';
import type { TeamMember } from '../../types/team';
import { TeamCustomerDossier } from './TeamCustomerDossier';

export function TeamCustomerPanel({ members }: { members: TeamMember[] }) {
  const [userId, setUserId] = useState('');
  const controller = useTeamCustomers(userId);
  return <section className="rounded-lg border border-line bg-panel p-5 space-y-4">
    <h2 className="font-semibold">Hồ sơ team · Chỉ đọc</h2>
    <div className="flex flex-wrap gap-4">
      <label className="text-sm flex-1 min-w-48">Thành viên
        <select className="block mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2" value={userId} onChange={event => setUserId(event.target.value)}>
          <option value="">Chọn thành viên</option>
          {members.map(member => <option key={member.UserId} value={member.UserId}>{member.FullName}</option>)}
        </select>
      </label>
      {userId && <label className="text-sm flex-1 min-w-48">Khách hàng
        <select className="block mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2" value={controller.customerId ?? ''}
          onChange={event => controller.selectCustomer(event.target.value ? Number(event.target.value) : null)}>
          <option value="">Chọn khách hàng</option>
          {controller.customers.map(customer => <option key={customer.Id} value={customer.Id}>{customer.FullName} · {customer.CifKh}</option>)}
        </select>
      </label>}
    </div>
    {controller.error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{controller.error}</p>
      : controller.loading ? <p role="status" className="text-sm text-ink-muted">Đang tải hồ sơ…</p>
        : controller.dossier ? <TeamCustomerDossier dossier={controller.dossier} />
          : userId && !controller.customers.length && <p className="text-sm text-ink-muted">Thành viên chưa có khách hàng phụ trách.</p>}
  </section>;
}
