import { useState, type FormEvent } from 'react';
import type { KpiPeriod } from '../../types/kpi';

export function KpiPeriodStatusForm({ period, onChange }: {
  period: KpiPeriod;
  onChange: (periodId: string, status: 'open' | 'closed', reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const label = period.Status === 'open' ? 'Chốt kỳ KPI' : 'Mở lại kỳ KPI';
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try { await onChange(period.Id, period.Status === 'open' ? 'closed' : 'open', reason); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  return <form className="border-t border-line p-5 space-y-3" onSubmit={event => void submit(event)}>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm flex-1 min-w-56">Lý do {period.Status === 'open' ? 'chốt kỳ' : 'mở lại'}
        <input className="block mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2"
          required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} />
      </label>
      <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50 cursor-pointer" disabled={busy}>{label}</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </form>;
}
