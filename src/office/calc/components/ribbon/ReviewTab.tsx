import React, { useState } from 'react';
import { BarChart2, LockKeyhole, LockKeyholeOpen, MessageSquarePlus, MessageSquareText, MessagesSquare, Trash2 } from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { CalcController } from '../../controller';
import { Group } from '../../../shared/ribbon/controls';
import { CommentsDialog } from '../CommentsDialog';
import { StatsDialog } from '../StatsDialog';
import { act } from './actions';
import { TextBtn } from './helpers';

export interface ReviewTabProps {
  controller: CalcController;
  author: string;
}

export const ReviewTab: React.FC<ReviewTabProps> = ({ controller, author }) => {
  const { m } = useOfficeI18n();
  const t = m.ribbon.review;
  const [stats, setStats] = useState(false);
  const [list, setList] = useState(false);
  const { row, col } = { row: controller.selection.r1, col: controller.selection.c1 };
  const existing = controller.commentAt(row, col);

  const edit = () => {
    const text = window.prompt(t.commentPrompt, existing?.text ?? '');
    if (text !== null) controller.setComment(row, col, text, author);
  };

  return (
    <div className="wr-tab-body">
      <Group label={t.workbook}>
        <TextBtn label={t.statistics} icon={<BarChart2 size={18} />} onClick={() => setStats(true)} />
      </Group>
      <Group label={t.comments}>
        <TextBtn label={existing ? t.editComment : t.newComment} icon={existing ? <MessageSquareText size={18} /> : <MessageSquarePlus size={18} />} onClick={act(edit)} />
        <TextBtn label={t.deleteComment} icon={<Trash2 size={18} />} disabled={!existing} onClick={act(() => controller.setComment(row, col, '', author))} />
        <TextBtn label={t.allComments} icon={<MessagesSquare size={18} />} onClick={() => setList(true)} />
      </Group>
      <Group label={t.protect}>
        <TextBtn
          label={controller.sheetProtected ? t.unprotectSheet : t.protectSheet}
          icon={controller.sheetProtected ? <LockKeyholeOpen size={18} /> : <LockKeyhole size={18} />}
          active={controller.sheetProtected}
          onClick={act(() => controller.toggleProtection())}
        />
      </Group>
      {stats && <StatsDialog controller={controller} onClose={() => setStats(false)} />}
      {list && <CommentsDialog controller={controller} onClose={() => setList(false)} />}
    </div>
  );
};
