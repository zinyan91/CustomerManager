import { useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ROUTE_OF } from '../lib/routes';
import type { DriveLink } from './shared/archive/officeArchive';

/**
 * Logic chung của màn tài liệu (Bảng tính, Văn bản): mỗi tài liệu mở ra là một màn mới (đổi key). Lưu nháp lần đầu
 * chỉ thay địa chỉ sang .../<id> mà không dựng lại màn, nên cần nhớ id đang giữ; Back/Forward sang nháp khác thì dựng lại.
 */
export function useDocumentRoute(pathOf: (draftId?: string) => string) {
  const { draftId, sharedId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { file?: File; link?: DriveLink } | null;
  const file = state?.file ?? null;
  const link = state?.link ?? null;

  const [screenKey, setScreenKey] = useState(0);
  const held = useRef<string | null>(draftId ?? sharedId ?? null);
  const currentKey = useRef(0);
  currentKey.current = screenKey;

  const opened = draftId ?? sharedId ?? null;
  if (opened && opened !== held.current) {
    held.current = opened;
    setScreenKey((key) => key + 1);
  }

  const start = useCallback(
    (to: string, state?: { file: File; link?: DriveLink }) => {
      held.current = null;
      setScreenKey((key) => key + 1);
      navigate(to, { state });
    },
    [navigate],
  );

  const mountedKey = screenKey;
  return {
    docId: draftId ?? null,
    sharedId: sharedId ?? null,
    file,
    link,
    screenKey,
    onHome: () => navigate(ROUTE_OF.office),
    onNew: () => start(pathOf()),
    onOpenFile: (opened: File, opening?: DriveLink) => start(pathOf(), { file: opened, link: opening }),
    onOpenDraft: (id: string) => navigate(pathOf(id)),
    /** Dựng lại màn đang mở (tải bản mới nhất của bảng tính chung). */
    onReload: () => setScreenKey((key) => key + 1),
    onDraftId: (id: string, isNew: boolean) => {
      if (currentKey.current !== mountedKey) return;
      held.current = id;
      if (isNew) navigate(pathOf(id), { replace: true });
    },
  };
}
