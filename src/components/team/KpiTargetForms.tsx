import { useState, type FormEvent } from 'react';
import type { KpiTargetInput, KpiTargetsData } from '../../types/kpi';
import type { TeamMember } from '../../types/team';

const field = 'rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink w-full';
const button = 'rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer';

export function KpiPeriodForm({ onCreate }: { onCreate: (month: string) => Promise<void> }) {
  const [month, setMonth] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try { await onCreate(month); setMonth(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  return <form className="flex flex-wrap items-end gap-3" onSubmit={event => void submit(event)}>
    <label className="text-sm">Tháng KPI<input className={`${field} mt-1.5`} type="month" required value={month} onChange={event => setMonth(event.target.value)} /></label>
    <button className={button} disabled={busy}>Tạo kỳ KPI</button>
    {error && <p role="alert" className="w-full text-sm text-red-700 dark:text-red-300">{error}</p>}
  </form>;
}

export function KpiTargetForm({ data, members, manageBudget, onSave }: {
  data: KpiTargetsData;
  members: TeamMember[];
  manageBudget: boolean;
  onSave: (input: KpiTargetInput) => Promise<void>;
}) {
  const [metric, setMetric] = useState(data.definitions[0]?.Code ?? '');
  const [scope, setScope] = useState(manageBudget ? 'team' : members[0]?.UserId ?? '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const definition = data.definitions.find(item => item.Code === metric);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100))) {
      setError('Chỉ tiêu phải là số không âm trong phạm vi tính toán an toàn.');
      return;
    }
    const target = scope === 'team'
      ? data.teamTargets.find(item => item.MetricCode === metric)
      : data.memberTargets.find(item => item.MetricCode === metric && item.UserId === scope);
    setBusy(true);
    try {
      await onSave({ periodId: data.periodId, metricCode: metric, userId: scope === 'team' ? null : scope,
        amount: value, version: target?.Version ?? 0, reason });
      setAmount('');
      setReason('');
      setNotice('Đã lưu chỉ tiêu.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(false); }
  };
  return <form className="border-t border-line p-5 space-y-4" onSubmit={event => void submit(event)}>
    <h3 className="font-semibold">{manageBudget ? 'Giao và phân bổ chỉ tiêu' : 'Phân bổ chỉ tiêu'}</h3>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm">Chỉ tiêu<select className={`${field} mt-1.5`} value={metric} onChange={event => setMetric(event.target.value)}>
        {data.definitions.map(item => <option key={item.Code} value={item.Code}>{item.Name}</option>)}
      </select></label>
      <label className="text-sm">Giao cho<select className={`${field} mt-1.5`} value={scope} onChange={event => setScope(event.target.value)} required>
        {manageBudget && <option value="team">Ngân sách team</option>}
        {members.map(member => <option key={member.UserId} value={member.UserId}>{member.FullName}</option>)}
      </select></label>
      <label className="text-sm">Chỉ tiêu ({definition?.Unit === 'VND' ? 'VND' : 'số lượng'})
        <input className={`${field} mt-1.5`} type="number" min="0" step={definition?.Unit === 'count' ? '1' : '0.01'}
          required value={amount} onChange={event => setAmount(event.target.value)} />
      </label>
      <label className="text-sm">Lý do thay đổi<input className={`${field} mt-1.5`} required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
    </div>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <button className={button} disabled={busy || !scope || !metric}>Lưu chỉ tiêu</button>
  </form>;
}
