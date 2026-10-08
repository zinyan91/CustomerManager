import React, { Suspense, useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ROUTE_OF } from '../lib/routes';
import { useOfficeI18n } from './i18n';
import { calcPath } from './paths';

const CalcScreen = React.lazy(() => import('./calc/components/CalcScreen').then((module) => ({ default: module.CalcScreen })));

/**
 * Màn Bảng tính: mỗi tài liệu mở ra là một màn mới (đổi key). Lưu nháp lần đầu chỉ thay địa chỉ sang
 * /office/calc/<id> mà không dựng lại màn, nên cần nhớ id đang giữ; Back/Forward sang nháp khác thì dựng lại.
 */
export const OfficeCalcRoute: React.FC = () => {
  const { m } = useOfficeI18n();
  const { draftId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { fullName, user } = useAuth();
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
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500" role="status">{m.app.loading}</div>}>
      <CalcScreen
        key={`calc-${screenKey}`}
        docId={draftId ?? null}
        file={file}
        onHome={() => navigate(ROUTE_OF.office)}
        onNew={() => start(calcPath())}
        onOpenDraft={(id) => navigate(calcPath(id))}
        author={fullName ?? user?.email ?? ''}
        onOpenFile={(opened) => start(calcPath(), { file: opened })}
        onDraftId={(id, isNew) => {
          if (currentKey.current !== mountedKey) return;
          held.current = id;
          if (isNew) navigate(calcPath(id), { replace: true });
        }}
      />
    </Suspense>
  );
};
