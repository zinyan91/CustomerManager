import React, { Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOfficeI18n } from './i18n';
import { calcPath } from './paths';
import { useDocumentRoute } from './useDocumentRoute';

const CalcScreen = React.lazy(() => import('./calc/components/CalcScreen').then((module) => ({ default: module.CalcScreen })));

/** Màn Bảng tính tại /office/calc[/:draftId]. */
export const OfficeCalcRoute: React.FC = () => {
  const { m } = useOfficeI18n();
  const { fullName, user } = useAuth();
  const route = useDocumentRoute(calcPath);
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500" role="status">{m.app.loading}</div>}>
      <CalcScreen key={`calc-${route.screenKey}`} {...route} author={fullName ?? user?.email ?? ''} />
    </Suspense>
  );
};
