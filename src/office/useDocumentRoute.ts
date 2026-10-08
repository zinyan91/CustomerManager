import { useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ROUTE_OF } from '../lib/routes';

/**
 * Logic chung của màn tài liệu (Bảng tính, Văn bản): mỗi tài liệu mở ra là một màn mới (đổi key). Lưu nháp lần đầu
 * chỉ thay địa chỉ sang .../<id> mà không dựng lại màn, nên cần nhớ id đang giữ; Back/Forward sang nháp khác thì dựng lại.
 */
export function useDocumentRoute(pathOf: (draftId?: string) => string) {
  const { draftId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const file = (location.state as { file?: File } | null)?.file ?? null;

  const [screenKey, setScreenKey] = useState(0);
  const held = useRef<string | null>(draftId ?? null);
  const currentKey = useRef(0);
  currentKey.current = screenKey;

  if (draftId && draftId !== held.current) {
    held.current = draftId;
    setScreenKey((key) => key + 1);
  }

  const start = useCallback(
    (to: string, state?: { file: File }) => {
      held.current = null;
      setScreenKey((key) => key + 1);
      navigate(to, { state });
    },
    [navigate],
  );

  const mountedKey = screenKey;
  return {
    docId: draftId ?? null,
    file,
    screenKey,
    onHome: () => navigate(ROUTE_OF.office),
    onNew: () => start(pathOf()),
    onOpenFile: (opened: File) => start(pathOf(), { file: opened }),
    onOpenDraft: (id: string) => navigate(pathOf(id)),
    onDraftId: (id: string, isNew: boolean) => {
      if (currentKey.current !== mountedKey) return;
      held.current = id;
      if (isNew) navigate(pathOf(id), { replace: true });
    },
  };
}
