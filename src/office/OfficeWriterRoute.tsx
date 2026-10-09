import React, { Suspense } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useOfficeI18n } from './i18n';
import { writerPath, writerSharedPath } from './paths';
import { useDocumentRoute } from './useDocumentRoute';

const WriterScreen = React.lazy(() => import('./writer/components/WriterScreen').then((module) => ({ default: module.WriterScreen })));

/** Màn Văn bản tại /office/writer[/:draftId] (nháp trong trình duyệt) và /office/writer/shared/:sharedId (văn bản chung). */
export const OfficeWriterRoute: React.FC = () => {
  const { m } = useOfficeI18n();
  const { fullName, user } = useAuth();
  const navigate = useNavigate();
  const { onReload, ...route } = useDocumentRoute(writerPath);
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500" role="status">{m.app.loading}</div>}>
      <WriterScreen
        key={`writer-${route.screenKey}`}
        {...route}
        author={fullName ?? user?.email ?? ''}
        userId={user?.id ?? ''}
        onOpenShared={(id) => navigate(writerSharedPath(id), { replace: true })}
        onReloadShared={onReload}
      />
    </Suspense>
  );
};
