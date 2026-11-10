import { useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import type { BusinessResultController } from '../../hooks/useBusinessResultSheet';
import { Button } from '../ui/Button';
import { Select } from '../ui/Field';

interface Props {
  editors: BusinessResultController['editors'];
}

const nameOf = (u: { fullName: string | null; username?: string | null; email: string | null }) =>
  u.fullName || u.username || u.email || 'Không tên';

/** Admin cấp và gỡ quyền sửa bảng KQKD. Người không có tên ở đây chỉ xem. */
export function BusinessResultEditorsPanel({ editors }: Props) {
  const [pick, setPick] = useState('');
  const { load } = editors;
  useEffect(() => { void load(); }, [load]);

  const granted = editors.ids
    .map(id => editors.users.find(u => u.id === id) ?? { id, fullName: null, email: id, role: null })
    .map(u => ({ id: u.id, name: nameOf(u) }));
  const candidates = editors.users.filter(u => !editors.ids.includes(u.id) && u.role === 'user' && !u.disabled);

  return (
    <div className="px-4 py-3 bg-surface space-y-2.5">
      <div className="text-xs text-ink-muted">
        Master Admin và User Admin luôn sửa được. Tài khoản User chỉ xem, trừ người có tên dưới đây.
      </div>
      {editors.error && <div role="alert" className="text-neg text-xs">{editors.error}</div>}
      <div className="flex flex-wrap items-center gap-1.5">
        {granted.length === 0 && !editors.loading && <span className="text-xs text-ink-faint">Chưa cấp quyền sửa cho tài khoản User nào.</span>}
        {granted.map(u => (
          <span key={u.id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-accent-soft text-accent text-[11px] font-semibold">
            {u.name}
            <button type="button" onClick={() => void editors.remove(u.id)} aria-label={`Gỡ quyền sửa của ${u.name}`} className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent hover:text-accent-ink cursor-pointer">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 max-w-md">
        <Select aria-label="Chọn tài khoản để cấp quyền sửa" value={pick} onChange={e => setPick(e.target.value)} disabled={editors.loading}>
          <option value="">{editors.loading ? 'Đang tải danh sách tài khoản' : 'Chọn tài khoản User'}</option>
          {candidates.map(u => <option key={u.id} value={u.id}>{nameOf(u)}</option>)}
        </Select>
        <Button
          size="sm"
          variant="secondary"
          disabled={!pick}
          onClick={() => { void editors.add(pick); setPick(''); }}
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
        >
          Cấp quyền sửa
        </Button>
      </div>
    </div>
  );
}
