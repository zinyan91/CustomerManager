import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useOfficeI18n } from '../i18n';
import { listInvitableUsers, listOps, type SharedKind, type SharedOp } from './collabApi';
import { parseSummary, type PatchSummary, type SummaryChange } from './summary';

export interface ActivityPanelProps {
  docId: string;
  /** Số thứ tự hiện hành; đổi thì nạp lại phần đuôi nhật ký. */
  seq: number;
  /** Mã và tên của chính người đang mở (danh sách tài khoản có thể mời không gồm họ). */
  me: { id: string; name: string };
  /** Loại tài liệu, để ghi đúng chữ cho thao tác khôi phục; mặc định bảng tính. */
  kind?: SharedKind;
  onClose: () => void;
}

/** Số thao tác gần nhất hiện trong ngăn. */
const TAIL = 200;

const isReset = (op: SharedOp): boolean => (op.summary as { kind?: unknown }).kind === 'reset' || op.patch.some((p) => (p as { t: string }).t === 'reset');

/** Ngăn Nhật ký: các thay đổi gần nhất của bảng tính chung, mới nhất trước, lọc theo người. */
export const ActivityPanel: React.FC<ActivityPanelProps> = ({ docId, seq, me, kind = 'calc', onClose }) => {
  const { m, lang } = useOfficeI18n();
  const t = m.ribbon.activity;
  const [ops, setOps] = useState<SharedOp[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [who, setWho] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listInvitableUsers()
      .then((users) => !cancelled && setNames(new Map(users.map((user) => [user.id, user.fullName]))))
      .catch((caught) => !cancelled && setProblem(caught instanceof Error ? caught.message : String(caught)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listOps(docId, Math.max(0, seq - TAIL))
      .then((list) => {
        if (cancelled) return;
        setOps(list);
        setProblem(null);
      })
      .catch((caught) => !cancelled && setProblem(caught instanceof Error ? caught.message : String(caught)));
    return () => {
      cancelled = true;
    };
  }, [docId, seq]);

  const nameOf = (userId: string) => (userId === me.id ? me.name || t.you : names.get(userId) || t.someone);
  const people = useMemo(() => [...new Set((ops ?? []).map((op) => op.userId).filter(Boolean))], [ops]);
  const shown = useMemo(() => [...(ops ?? [])].filter((op) => !who || op.userId === who).reverse(), [ops, who]);
  const when = (iso: string) => (Date.parse(iso) ? new Date(iso).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US') : '');

  const change = (item: SummaryChange): string => {
    const label = t.changes[item.kind];
    return item.kind === 'renameSheet' ? `${label}: ${item.name} → ${item.to ?? ''}` : item.name ? `${label}: ${item.name}` : label;
  };
  const describe = (op: SharedOp, summary: PatchSummary | null): string[] => {
    if ((op.summary as { kind?: unknown }).kind === 'save') return [t.save];
    if (isReset(op)) return [kind === 'writer' ? t.resetWriter : t.reset];
    if (!summary) return [t.unknown];
    const lines = summary.cells.map((cell) => {
      const now = cell.value === '' ? t.cleared : cell.value;
      return cell.old ? `${cell.sheet}!${cell.ref}: ${cell.old} → ${now}` : `${cell.sheet}!${cell.ref}: ${now}`;
    });
    if (summary.cellCount > summary.cells.length) lines.push(t.moreCells(summary.cellCount - summary.cells.length));
    return [...lines, ...summary.changes.map(change)];
  };

  return (
    <aside className="activity-panel" aria-label={t.title}>
      <div className="activity-head">
        <strong>{t.title}</strong>
        <button type="button" className="office-icon-btn" onClick={onClose} aria-label={t.close}>
          <X size={16} />
        </button>
      </div>
      {people.length > 1 && (
        <select aria-label={t.filter} value={who} onChange={(event) => setWho(event.target.value)}>
          <option value="">{t.everyone}</option>
          {people.map((id) => (
            <option key={id} value={id}>
              {nameOf(id)}
            </option>
          ))}
        </select>
      )}
      {problem && (
        <p className="calc-dialog-problem" role="alert">
          {problem}
        </p>
      )}
      {ops !== null && shown.length === 0 && !problem && <p className="share-note">{t.empty}</p>}
      <ul className="activity-list">
        {shown.map((op) => (
          <li key={op.seq}>
            <div className="activity-who">
              <span>{nameOf(op.userId)}</span>
              <small>{when(op.createdAt)}</small>
            </div>
            {describe(op, parseSummary(op.summary)).map((line, index) => (
              <div key={index} className="activity-line">
                {line}
              </div>
            ))}
          </li>
        ))}
      </ul>
    </aside>
  );
};
