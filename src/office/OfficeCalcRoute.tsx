import React, { Suspense } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useOfficeI18n } from './i18n';
import { calcPath, calcSharedPath } from './paths';
import { useDocumentRoute } from './useDocumentRoute';

const CalcScreen = React.lazy(() => import('./calc/components/CalcScreen').then((module) => ({ default: module.CalcScreen })));

/** Màn Bảng tính tại /office/calc[/:draftId] (nháp trong trình duyệt) và /office/calc/shared/:sharedId (bảng tính chung). */
export const OfficeCalcRoute: React.FC = () => {
  const { m } = useOfficeI18n();
  const { fullName, user } = useAuth();
  const navigate = useNavigate();
  const { onReload, ...route } = useDocumentRoute(calcPath);
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500" role="status">{m.app.loading}</div>}>
      <CalcScreen
        key={`calc-${route.screenKey}`}
        {...route}
        author={fullName ?? user?.email ?? ''}
        userId={user?.id ?? ''}
        onOpenShared={(id) => navigate(calcSharedPath(id), { replace: true })}
        onReloadShared={onReload}
      />
    </Suspense>
  );
};
