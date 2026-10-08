import React, { Suspense } from 'react';
import { useOfficeI18n } from './i18n';
import { writerPath } from './paths';
import { useDocumentRoute } from './useDocumentRoute';

const WriterScreen = React.lazy(() => import('./writer/components/WriterScreen').then((module) => ({ default: module.WriterScreen })));

/** Màn Văn bản tại /office/writer[/:draftId]. */
export const OfficeWriterRoute: React.FC = () => {
  const { m } = useOfficeI18n();
  const route = useDocumentRoute(writerPath);
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500" role="status">{m.app.loading}</div>}>
      <WriterScreen key={`writer-${route.screenKey}`} {...route} />
    </Suspense>
  );
};
