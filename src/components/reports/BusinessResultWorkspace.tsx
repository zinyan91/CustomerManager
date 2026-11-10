import { useState } from 'react';
import { Columns3, Eye, FileSpreadsheet, Pencil, Plus, RefreshCw, Save, Undo2, Users } from 'lucide-react';
import type { BusinessResultController } from '../../hooks/useBusinessResultSheet';
import { addDiffColumn, addRow, addValueColumn, periodColumns } from '../../lib/businessResult/sheet';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { BusinessResultTable } from './BusinessResultTable';
import { BusinessResultEditorsPanel } from './BusinessResultEditorsPanel';

interface Props {
  ctrl: BusinessResultController;
}

type Adding = null | 'value' | 'diff';

const savedAtText = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  });

export function BusinessResultWorkspace({ ctrl }: Props) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<Adding>(null);
  const [showEditors, setShowEditors] = useState(false);
  const [label, setLabel] = useState('');
  const [minuend, setMinuend] = useState('');
  const [subtrahend, setSubtrahend] = useState('');

  if (ctrl.loading && !ctrl.sheet) return <div className="p-4 text-ink-muted">Đang tải bảng kết quả kinh doanh…</div>;
  if (ctrl.error || !ctrl.sheet) {
    return (
      <div className="p-4 space-y-2">
        <div role="alert" className="text-neg">{ctrl.error ?? 'Chưa tải được bảng.'}</div>
        <Button variant="secondary" onClick={() => void ctrl.reload()} leftIcon={<RefreshCw className="w-4 h-4" />}>Tải lại</Button>
      </div>
    );
  }

  const sheet = ctrl.sheet;
  const periods = periodColumns(sheet);
  const isEditing = editing && ctrl.canEdit;

  const openAdd = (kind: Adding) => {
    setAdding(kind);
    setLabel('');
    const last = periods[periods.length - 1]?.id ?? '';
    setMinuend(last);
    setSubtrahend(periods[periods.length - 2]?.id ?? last);
  };
  const confirmAdd = () => {
    const name = label.trim();
    if (!name) return;
    if (adding === 'value') ctrl.edit(s => addValueColumn(s, name));
    if (adding === 'diff' && minuend && subtrahend) ctrl.edit(s => addDiffColumn(s, name, minuend, subtrahend));
    setAdding(null);
  };

  return (
    <section aria-label="Báo cáo nhanh kết quả kinh doanh" className="divide-y divide-line">
      <div data-workspace-panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-panel">
        <div className="min-w-0 space-y-0.5">
          {isEditing ? (
            <div className="grid gap-1.5 sm:grid-cols-3 w-full max-w-3xl">
              <Input aria-label="Tiêu đề bảng" value={sheet.title} onChange={e => ctrl.edit(s => ({ ...s, title: e.target.value }))} />
              <Input aria-label="Dòng mô tả" value={sheet.subtitle} onChange={e => ctrl.edit(s => ({ ...s, subtitle: e.target.value }))} />
              <Input aria-label="Đơn vị tính" value={sheet.unitNote} onChange={e => ctrl.edit(s => ({ ...s, unitNote: e.target.value }))} />
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-ink">{sheet.title}</h2>
              <div className="text-[11px] text-ink-muted">
                {sheet.subtitle} · <span className="italic">{sheet.unitNote}</span>
                {' · '}
                {ctrl.neverSaved ? 'Bảng mẫu, chưa lưu lên hệ thống' : ctrl.savedAt ? `Lưu lúc ${savedAtText(ctrl.savedAt)}` : ''}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!ctrl.canEdit && (
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted"><Eye className="w-3.5 h-3.5" /> Chỉ xem</span>
          )}
          {ctrl.isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setShowEditors(v => !v)} leftIcon={<Users className="w-3.5 h-3.5" />} aria-expanded={showEditors}>
              Quyền sửa
            </Button>
          )}
          {ctrl.canEdit && (
            <Button variant={isEditing ? 'outline' : 'secondary'} onClick={() => { setEditing(v => !v); setAdding(null); }} leftIcon={<Pencil className="w-4 h-4" />}>
              {isEditing ? 'Xong sửa' : 'Sửa bảng'}
            </Button>
          )}
          {ctrl.canEdit && ctrl.dirty && (
            <Button variant="ghost" onClick={ctrl.discard} leftIcon={<Undo2 className="w-4 h-4" />}>Hủy thay đổi</Button>
          )}
          {ctrl.canEdit && (
            <Button loading={ctrl.saving} disabled={!ctrl.dirty && !ctrl.neverSaved} onClick={() => void ctrl.save()} leftIcon={<Save className="w-4 h-4" />}>
              Lưu
            </Button>
          )}
          <Button variant="secondary" onClick={ctrl.exportExcel} leftIcon={<FileSpreadsheet className="w-4 h-4" />}>Xuất Excel</Button>
        </div>
      </div>

      {showEditors && ctrl.isAdmin && <BusinessResultEditorsPanel editors={ctrl.editors} />}

      {ctrl.actionError && (
        <div role="alert" className="px-4 py-3 text-neg flex flex-wrap items-center gap-3">
          <span>{ctrl.actionError}</span>
          {ctrl.conflict && (
            <Button size="sm" variant="secondary" onClick={() => void ctrl.reload()} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>Tải bản mới nhất</Button>
          )}
        </div>
      )}

      {isEditing && (
        <div className="workspace-toolbar flex flex-wrap items-end gap-2 px-4 py-2.5">
          <Button size="sm" variant="secondary" onClick={() => openAdd('value')} leftIcon={<Plus className="w-3.5 h-3.5" />}>Thêm cột số liệu</Button>
          <Button size="sm" variant="secondary" onClick={() => openAdd('diff')} leftIcon={<Columns3 className="w-3.5 h-3.5" />}>Thêm cột chênh lệch</Button>
          <Button size="sm" variant="secondary" onClick={() => ctrl.edit(s => addRow(s, null))} leftIcon={<Plus className="w-3.5 h-3.5" />}>Thêm dòng</Button>
          {adding && (
            <form
              className="flex flex-wrap items-end gap-2 ml-2"
              onSubmit={e => { e.preventDefault(); confirmAdd(); }}
            >
              <label className="space-y-1 w-40">
                <span className="block text-[11px] text-ink-muted">{adding === 'value' ? 'Tên cột (mốc ngày)' : 'Tên cột chênh lệch'}</span>
                <Input autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder={adding === 'value' ? '26/10/2026' : '+/- tuần'} />
              </label>
              {adding === 'diff' && (
                <>
                  <label className="space-y-1 w-36">
                    <span className="block text-[11px] text-ink-muted">Lấy cột</span>
                    <Select value={minuend} onChange={e => setMinuend(e.target.value)}>
                      {periods.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </Select>
                  </label>
                  <label className="space-y-1 w-36">
                    <span className="block text-[11px] text-ink-muted">Trừ cột</span>
                    <Select value={subtrahend} onChange={e => setSubtrahend(e.target.value)}>
                      {periods.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </Select>
                  </label>
                </>
              )}
              <Button size="sm" type="submit" disabled={!label.trim()}>Thêm</Button>
              <Button size="sm" type="button" variant="ghost" onClick={() => setAdding(null)}>Bỏ</Button>
            </form>
          )}
        </div>
      )}

      <BusinessResultTable sheet={sheet} editing={isEditing} onEdit={ctrl.edit} />
    </section>
  );
}
